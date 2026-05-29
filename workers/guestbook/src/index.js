// ============================================
// 留言板 API — Cloudflare Worker + KV
// ============================================

const RATE_WINDOW_MS = 60_000;
const MAX_REQUESTS = 10;

function buildCors(origin) {
  return {
    'Access-Control-Allow-Origin': origin || '*',
    'Access-Control-Allow-Methods': 'GET, POST, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
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

// 简单内存限流（每个 Worker 实例独立计数，个人站够用）
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

// 每次请求时惰性清理过期 IP 记录
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

    // GET /api/messages
    if (url.pathname === '/api/messages' && request.method === 'GET') {
      const raw = await env.GUESTBOOK_KV.get('messages');
      const messages = raw ? JSON.parse(raw) : [];
      return json(messages, 200, cors);
    }

    // POST /api/messages
    if (url.pathname === '/api/messages' && request.method === 'POST') {
      const ip = request.headers.get('CF-Connecting-IP') || 'unknown';
      if (rateLimited(ip)) {
        return json({ error: '发送太快，请稍后再试' }, 429, cors);
      }

      let body;
      try {
        body = await request.json();
      } catch {
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

      // 读 → 追加 → 写回
      const raw = await env.GUESTBOOK_KV.get('messages');
      const messages = raw ? JSON.parse(raw) : [];
      messages.push(newMsg);

      // 最多保留 100 条
      const trimmed = messages.length > 100 ? messages.slice(-100) : messages;
      await env.GUESTBOOK_KV.put('messages', JSON.stringify(trimmed));

      return json({ success: true, messages: trimmed }, 201, cors);
    }

    // DELETE /api/messages/:id (简易管理)
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
