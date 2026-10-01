// ============================================
// 留言板 + 文章 API — Cloudflare Worker + KV + D1
// ============================================

const RATE_WINDOW_MS = 60_000;
const MAX_REQUESTS = 10;
const ANONYMOUS_NAME = '匿名用户';

function buildCors(origin) {
  return {
    'Access-Control-Allow-Origin': origin || '*',
    'Access-Control-Allow-Methods': 'GET, POST, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Max-Age': '86400',
  };
}

function json(data, status, corsHeaders, extraHeaders = {}) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json; charset=utf-8', ...corsHeaders, ...extraHeaders },
  });
}

function sanitize(s, maxLen) {
  return String(s ?? '').replace(/[<>]/g, '').trim().slice(0, maxLen);
}

// ========== 认证 ==========
function checkAuth(request, env) {
  const auth = request.headers.get('Authorization');
  const token = env.ADMIN_TOKEN;
  // 未配置 ADMIN_TOKEN 时一律拒绝，避免部署遗漏变成"人人可写"
  if (!token) return false;
  return auth === 'Bearer ' + token;
}

// ========== 限流 ==========
// 注意：这是 Worker isolate 内存中的近似限流，多个 isolate 或冷启动后计数会重置。
// 需要严格限流时应改用 Durable Object 或 Cloudflare Rate Limiting 规则。
const ipHits = new Map();

function rateLimited(ip) {
  const now = Date.now();
  lazyCleanup(now);
  const hits = ipHits.get(ip) || [];
  const recent = hits.filter((t) => now - t < RATE_WINDOW_MS);
  if (recent.length >= MAX_REQUESTS) return true;
  recent.push(now);
  ipHits.set(ip, recent);
  return false;
}

let lastCleanup = 0;
function lazyCleanup(now) {
  if (now - lastCleanup < 120_000) return;
  lastCleanup = now;
  const cutoff = now - RATE_WINDOW_MS;
  for (const [ip, hits] of ipHits) {
    const fresh = hits.filter((t) => t > cutoff);
    if (fresh.length === 0) ipHits.delete(ip);
    else ipHits.set(ip, fresh);
  }
}

function readMessages(env) {
  return env.GUESTBOOK_KV.get('messages').then((raw) => {
    if (!raw) return [];
    try {
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  });
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const origin = env.ALLOWED_ORIGIN || '*';
    const cors = buildCors(origin);

    // 统一兜底：任何未捕获异常都返回带 CORS 头的 JSON，
    // 否则浏览器只能看到不透明的网络错误，前端无法区分"服务端出错"和"断网"
    try {
      return await handle(request, env, url, cors);
    } catch (error) {
      console.error('unhandled', error && error.stack ? error.stack : error);
      return json({ error: '服务器内部错误' }, 500, cors);
    }
  },
};

async function handle(request, env, url, cors) {
  if (request.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: cors });
  }

  // ==================== Auth 验证 ====================
  if (url.pathname === '/api/auth' && request.method === 'GET') {
    if (checkAuth(request, env)) {
      return json({ ok: true }, 200, cors);
    }
    return json({ error: 'Unauthorized' }, 401, cors);
  }

  // ==================== 文章搜索 ====================
  if (url.pathname === '/api/articles/search' && request.method === 'GET') {
    const q = url.searchParams.get('q') || '';
    if (!q.trim()) return json([], 200, cors);

    const ip = request.headers.get('CF-Connecting-IP') || 'unknown';
    if (rateLimited(ip)) {
      return json({ error: '请求太快，请稍后再试' }, 429, cors, { 'Retry-After': '60' });
    }

    const safe = q.replace(/[^\w一-鿿\s]/g, '').trim().slice(0, 100);
    try {
      // FTS5 全文搜索（schema.sql 使用 trigram 分词器，中文才能按子串命中）
      const { results } = await env.ARTICLES_DB.prepare(`
        SELECT a.* FROM articles a
        JOIN article_fts f ON a.rowid = f.rowid
        WHERE article_fts MATCH ?1
        ORDER BY rank
        LIMIT 20
      `).bind(safe).all();
      return json(results || [], 200, cors);
    } catch (ftsError) {
      console.warn('fts fallback', ftsError && ftsError.message);
      try {
        // FTS 不可用时回退到 LIKE
        const like = '%' + q.replace(/[%_]/g, '').slice(0, 50) + '%';
        const { results } = await env.ARTICLES_DB.prepare(
          'SELECT * FROM articles WHERE title LIKE ?1 OR content LIKE ?1 ORDER BY date DESC LIMIT 20'
        ).bind(like).all();
        return json(results || [], 200, cors);
      } catch (likeError) {
        console.error('search failed', likeError && likeError.message);
        return json({ error: '搜索服务暂时不可用' }, 503, cors);
      }
    }
  }

  // ==================== 文章列表 ====================
  if (url.pathname === '/api/articles' && request.method === 'GET') {
    const type = url.searchParams.get('type');
    let query = 'SELECT * FROM articles ORDER BY date DESC';
    let params = [];
    if (type) {
      query = 'SELECT * FROM articles WHERE type = ?1 ORDER BY date DESC';
      params = [type];
    }
    const { results } = await env.ARTICLES_DB.prepare(query).bind(...params).all();
    return json(results || [], 200, cors);
  }

  // ==================== 文章详情 ====================
  if (url.pathname.startsWith('/api/articles/') && request.method === 'GET') {
    const id = decodeURIComponent(url.pathname.slice('/api/articles/'.length));
    const article = await env.ARTICLES_DB.prepare(
      'SELECT * FROM articles WHERE id = ?1'
    ).bind(id).first();
    if (!article) return json({ error: 'Not Found' }, 404, cors);
    return json(article, 200, cors);
  }

  // ==================== 新建/更新文章 (auth) ====================
  if (url.pathname === '/api/articles' && request.method === 'POST') {
    if (!checkAuth(request, env)) {
      return json({ error: 'Unauthorized' }, 401, cors);
    }

    let body;
    try { body = await request.json(); } catch {
      return json({ error: '请求格式错误' }, 400, cors);
    }

    const id = sanitize(body.id, 100);
    const title = sanitize(body.title, 200);
    const date = typeof body.date === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(body.date)
      ? body.date
      : new Date().toISOString().slice(0, 10);
    const type = (body.type === 'blog' ? 'blog' : 'column');
    const excerpt = sanitize(body.excerpt, 500);
    const content = String(body.content ?? '').trim();

    if (!id || !title || !content) {
      return json({ error: 'id、title 和 content 不能为空' }, 400, cors);
    }
    if (content.length > 200_000) {
      return json({ error: '内容过长' }, 413, cors);
    }

    const now = new Date().toISOString();

    // UPSERT
    const existing = await env.ARTICLES_DB.prepare(
      'SELECT id FROM articles WHERE id = ?1'
    ).bind(id).first();

    if (existing) {
      await env.ARTICLES_DB.prepare(`
        UPDATE articles SET title=?1, date=?2, type=?3, excerpt=?4, content=?5, updated_at=?6
        WHERE id=?7
      `).bind(title, date, type, excerpt, content, now, id).run();
    } else {
      await env.ARTICLES_DB.prepare(`
        INSERT INTO articles (id, title, date, type, excerpt, content, created_at, updated_at)
        VALUES (?1,?2,?3,?4,?5,?6,?7,?8)
      `).bind(id, title, date, type, excerpt, content, now, now).run();
    }

    const article = await env.ARTICLES_DB.prepare(
      'SELECT * FROM articles WHERE id = ?1'
    ).bind(id).first();

    return json(article, existing ? 200 : 201, cors);
  }

  // ==================== 删除文章 (auth) ====================
  if (url.pathname.startsWith('/api/articles/') && request.method === 'DELETE') {
    if (!checkAuth(request, env)) {
      return json({ error: 'Unauthorized' }, 401, cors);
    }

    const id = decodeURIComponent(url.pathname.slice('/api/articles/'.length));
    const existing = await env.ARTICLES_DB.prepare(
      'SELECT id FROM articles WHERE id = ?1'
    ).bind(id).first();

    if (!existing) {
      return json({ error: '文章不存在' }, 404, cors);
    }

    await env.ARTICLES_DB.prepare('DELETE FROM articles WHERE id = ?1').bind(id).run();
    return json({ success: true }, 200, cors);
  }

  // ==================== 留言板 ====================
  if (url.pathname === '/api/messages' && request.method === 'GET') {
    const messages = await readMessages(env);
    return json(messages, 200, cors, { 'Cache-Control': 'no-store' });
  }

  if (url.pathname === '/api/messages' && request.method === 'POST') {
    const ip = request.headers.get('CF-Connecting-IP') || 'unknown';
    if (rateLimited(ip)) {
      return json({ error: '发送太快，请稍后再试' }, 429, cors, { 'Retry-After': '60' });
    }

    let body;
    try { body = await request.json(); } catch {
      return json({ error: '请求格式错误' }, 400, cors);
    }

    // 昵称与前端一致：留空则按匿名处理，不再直接报错
    const name = sanitize(body.name, 20) || ANONYMOUS_NAME;
    const msg = sanitize(body.body ?? body.message, 500);

    if (!msg) {
      return json({ error: '留言内容不能为空' }, 400, cors);
    }

    const newMsg = {
      id: Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
      name,
      body: msg,
      time: new Date().toISOString(),
    };

    // 已知限制：KV 单键"读-改-写"没有事务，两个并发提交可能丢掉一条。
    // 若留言量变大，建议改成一留言一键（KV list）或迁移到 D1。
    const messages = await readMessages(env);
    messages.push(newMsg);
    const trimmed = messages.length > 100 ? messages.slice(-100) : messages;
    await env.GUESTBOOK_KV.put('messages', JSON.stringify(trimmed));

    return json({ success: true, messages: trimmed }, 201, cors);
  }

  if (url.pathname.startsWith('/api/messages/') && request.method === 'DELETE') {
    // 这里原先没有任何鉴权，而 GET 会把每条留言的 id 返回给所有访客，
    // 等于任何人都能清空留言板；现在与文章接口保持一致，需要 ADMIN_TOKEN
    if (!checkAuth(request, env)) {
      return json({ error: 'Unauthorized' }, 401, cors);
    }

    const msgId = decodeURIComponent(url.pathname.split('/').pop());
    const messages = await readMessages(env);
    const filtered = messages.filter((m) => m.id !== msgId);
    if (filtered.length === messages.length) {
      return json({ error: '留言不存在' }, 404, cors);
    }
    await env.GUESTBOOK_KV.put('messages', JSON.stringify(filtered));
    return json({ success: true, messages: filtered }, 200, cors);
  }

  return json({ error: 'Not Found' }, 404, cors);
}
