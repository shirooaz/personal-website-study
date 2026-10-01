// ============================================
// 留言板 API — Cloudflare Worker + KV
// 文章数据由前端 blog-data.js 单一维护，这里不再提供 /api/articles*
// （原 D1 版本从未部署成功，属死代码，已整体移除）
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
