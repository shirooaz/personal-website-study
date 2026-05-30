// ============================================
// 留言板 + 文章 API — Cloudflare Worker + KV + D1
// ============================================

const RATE_WINDOW_MS = 60_000;
const MAX_REQUESTS = 10;

function buildCors(origin) {
  return {
    'Access-Control-Allow-Origin': origin || '*',
    'Access-Control-Allow-Methods': 'GET, POST, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Max-Age': '86400',
  };
}

function json(data, status, corsHeaders) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json; charset=utf-8', ...corsHeaders },
  });
}

function sanitize(s, maxLen) {
  return s.replace(/[<>]/g, '').trim().slice(0, maxLen);
}

// ========== 认证 ==========
function checkAuth(request, env) {
  const auth = request.headers.get('Authorization');
  const token = env.ADMIN_TOKEN;
  if (!token) return false;
  return auth === 'Bearer ' + token;
}

// ========== 留言板限流 ==========
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

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const origin = env.ALLOWED_ORIGIN || '*';
    const cors = buildCors(origin);

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

      try {
        // FTS5 全文搜索
        const safe = q.replace(/[^\w一-鿿\s]/g, '').trim().slice(0, 100);
        const { results } = await env.ARTICLES_DB.prepare(`
          SELECT a.* FROM articles a
          JOIN article_fts f ON a.rowid = f.rowid
          WHERE article_fts MATCH ?1
          ORDER BY rank
          LIMIT 20
        `).bind(safe).all();
        return json(results || [], 200, cors);
      } catch (e) {
        // FTS 不可用时回退到 LIKE
        const like = '%' + q.replace(/[%_]/g, '').slice(0, 50) + '%';
        const { results } = await env.ARTICLES_DB.prepare(
          'SELECT * FROM articles WHERE title LIKE ?1 OR content LIKE ?1 ORDER BY date DESC LIMIT 20'
        ).bind(like).all();
        return json(results || [], 200, cors);
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
      const id = url.pathname.slice('/api/articles/'.length);
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

      const id = (body.id || '').trim().slice(0, 100);
      const title = (body.title || '').trim().slice(0, 200);
      const date = body.date || new Date().toISOString().slice(0, 10);
      const type = (body.type === 'blog' ? 'blog' : 'column');
      const excerpt = (body.excerpt || '').trim().slice(0, 500);
      const content = (body.content || '').trim();

      if (!id || !title || !content) {
        return json({ error: 'id、title 和 content 不能为空' }, 400, cors);
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

      // 返回最新数据
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

      const id = url.pathname.slice('/api/articles/'.length);
      const existing = await env.ARTICLES_DB.prepare(
        'SELECT id FROM articles WHERE id = ?1'
      ).bind(id).first();

      if (!existing) {
        return json({ error: '文章不存在' }, 404, cors);
      }

      await env.ARTICLES_DB.prepare('DELETE FROM articles WHERE id = ?1').bind(id).run();
      return json({ success: true }, 200, cors);
    }

    // ==================== 留言板 (已有，不变) ====================
    if (url.pathname === '/api/messages' && request.method === 'GET') {
      const raw = await env.GUESTBOOK_KV.get('messages');
      const messages = raw ? JSON.parse(raw) : [];
      return json(messages, 200, cors);
    }

    if (url.pathname === '/api/messages' && request.method === 'POST') {
      const ip = request.headers.get('CF-Connecting-IP') || 'unknown';
      if (rateLimited(ip)) {
        return json({ error: '发送太快，请稍后再试' }, 429, cors);
      }

      let body;
      try { body = await request.json(); } catch {
        return json({ error: '请求格式错误' }, 400, cors);
      }

      const name = sanitize(body.name || '', 20);
      const msg = sanitize(body.body || body.message || '', 500);

      if (!name || !msg) {
        return json({ error: '昵称和留言内容不能为空' }, 400, cors);
      }

      const newMsg = {
        id: Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
        name,
        body: msg,
        time: new Date().toISOString(),
      };

      const raw = await env.GUESTBOOK_KV.get('messages');
      const messages = raw ? JSON.parse(raw) : [];
      messages.push(newMsg);
      const trimmed = messages.length > 100 ? messages.slice(-100) : messages;
      await env.GUESTBOOK_KV.put('messages', JSON.stringify(trimmed));

      return json({ success: true, messages: trimmed }, 201, cors);
    }

    if (url.pathname.startsWith('/api/messages/') && request.method === 'DELETE') {
      const msgId = url.pathname.split('/').pop();
      const raw = await env.GUESTBOOK_KV.get('messages');
      const messages = raw ? JSON.parse(raw) : [];
      const filtered = messages.filter((m) => m.id !== msgId);
      if (filtered.length === messages.length) {
        return json({ error: '留言不存在' }, 404, cors);
      }
      await env.GUESTBOOK_KV.put('messages', JSON.stringify(filtered));
      return json({ success: true, messages: filtered }, 200, cors);
    }

    return json({ error: 'Not Found' }, 404, cors);
  },
};
