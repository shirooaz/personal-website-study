/* ============================================
   构成主义 × 二次元 — JavaScript
   ============================================ */

// ========== 配置 ==========
const CONFIG = {
  // 部署 Worker 后替换为实际地址，例如:
  // https://guestbook-api.你的用户名.workers.dev/api/messages
  guestbookApi: 'https://api.153904.xyz/api/messages',
};

// ========== 工具函数 ==========
function escHtml(s) {
  const d = document.createElement('div');
  d.textContent = s;
  return d.innerHTML;
}

function formatTime(iso) {
  const d = new Date(iso);
  const pad = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}/${pad(d.getMonth() + 1)}/${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

// ========== 时钟 ==========
(function clock() {
  const el = document.getElementById('clock');
  const label = document.getElementById('clockLabel');
  if (!el) return;

  let showSeconds = true;
  let timeOffset = 0;

  function tick() {
    const d = new Date(Date.now() + timeOffset);
    const h = String(d.getHours()).padStart(2, '0');
    const m = String(d.getMinutes()).padStart(2, '0');
    if (showSeconds) {
      const s = String(d.getSeconds()).padStart(2, '0');
      el.textContent = `${h}:${m}:${s}`;
    } else {
      el.textContent = `${h}:${m}`;
    }
  }

  tick();
  setInterval(tick, 250);

  if (label) {
    label.addEventListener('click', () => {
      showSeconds = !showSeconds;
      label.classList.toggle('no-seconds', !showSeconds);
      label.title = showSeconds ? '点击关闭秒数 | 双击同步时间' : '点击开启秒数 | 双击同步时间';
      tick();
    });

    label.addEventListener('dblclick', async () => {
      const orig = label.textContent;
      label.textContent = '同步中…';
      try {
        const t0 = Date.now();
        const resp = await fetch(window.location.href, { method: 'HEAD', cache: 'no-cache' });
        const t1 = Date.now();
        const serverTime = new Date(resp.headers.get('Date')).getTime();
        const rtt = t1 - t0;
        timeOffset = serverTime - t1 + Math.round(rtt / 2);
        label.title = `已同步 (偏移 ${timeOffset > 0 ? '+' : ''}${(timeOffset / 1000).toFixed(1)}s)`;
      } catch {
        label.title = '同步失败，双击重试';
      }
      label.textContent = orig;
      setTimeout(() => {
        label.title = showSeconds ? '点击关闭秒数 | 双击同步时间' : '点击开启秒数 | 双击同步时间';
      }, 2000);
      tick();
    });
  }
})();

// ========== 博客渲染 ==========
(function blog() {
  const list = document.getElementById('blogList');
  if (!list || typeof blogPosts === 'undefined') return;

  list.innerHTML = blogPosts.map((p) => `
    <a href="blog.html#${p.id}" class="blog-card" data-id="${p.id}">
      <div class="blog-date">${p.date}</div>
      <div class="blog-title">${p.title}</div>
      <div class="blog-excerpt">${p.excerpt}</div>
    </a>
  `).join('');

  // 点击跳转博客页
  list.addEventListener('click', function (e) {
    const card = e.target.closest('.blog-card');
    if (!card) return;
    // <a> 标签自带跳转，无需额外处理
  });
})();

// ========== 博客页面渲染 ==========
(function blogPage() {
  const postList = document.getElementById('blogPostList');
  if (!postList || typeof blogPosts === 'undefined') return;

  const hash = window.location.hash.slice(1);

  postList.innerHTML = blogPosts.map((p) => `
    <article class="blog-post ${hash === p.id ? 'blog-post--open' : ''}" id="${p.id}">
      <div class="blog-post-header">
        <time class="blog-post-date">${p.date}</time>
        <h2 class="blog-post-title">${p.title}</h2>
      </div>
      <div class="blog-post-body">${p.content}</div>
    </article>
  `).join('');

  // 点击标题展开/收起
  postList.addEventListener('click', function (e) {
    const header = e.target.closest('.blog-post-header');
    if (!header) return;
    const post = header.closest('.blog-post');
    post.classList.toggle('blog-post--open');
    // 更新 URL hash
    if (post.classList.contains('blog-post--open')) {
      history.replaceState(null, '', '#' + post.id);
    } else {
      history.replaceState(null, '', window.location.pathname);
    }
  });

  // 如果 URL 带 hash，滚动到对应文章
  if (hash) {
    const target = document.getElementById(hash);
    if (target) {
      setTimeout(() => target.scrollIntoView({ behavior: 'smooth', block: 'start' }), 100);
    }
  }
})();

// ========== 留言板 (Cloudflare KV API) ==========
(function guestbook() {
  const form = document.getElementById('gbForm');
  const msgContainer = document.getElementById('gbMessages');
  const hintEl = document.querySelector('.gb-hint');
  if (!form || !msgContainer) return;

  const apiUrl = CONFIG.guestbookApi;

  function render(msgs) {
    if (!msgs || msgs.length === 0) {
      msgContainer.innerHTML = '<div class="gb-empty">暂无留言，来写第一条吧 ~</div>';
      return;
    }
    msgContainer.innerHTML = msgs.slice(-30).reverse().map((m) => `
      <div class="gb-msg">
        <span class="gb-msg-time">${formatTime(m.time)}</span>
        <span class="gb-msg-name">${escHtml(m.name)}</span>
        <span class="gb-msg-body">${escHtml(m.body)}</span>
      </div>
    `).join('');
    msgContainer.scrollTop = 0;
  }

  async function loadMessages() {
    try {
      const resp = await fetch(apiUrl);
      if (!resp.ok) throw new Error('API error');
      const data = await resp.json();
      render(Array.isArray(data) ? data : data.messages || []);
      if (hintEl) hintEl.textContent = '※ 留言存储在 Cloudflare KV，全站实时同步';
    } catch (err) {
      console.warn('留言加载失败:', err);
      if (hintEl) hintEl.textContent = '※ 留言加载失败，请检查 API 配置';
    }
  }

  form.addEventListener('submit', async function (e) {
    e.preventDefault();
    const nameInput = document.getElementById('gbName');
    const msgInput = document.getElementById('gbMessage');
    const submitBtn = form.querySelector('.gb-submit');

    const name = nameInput.value.trim();
    const body = msgInput.value.trim();
    if (!name || !body) return;

    submitBtn.disabled = true;
    submitBtn.textContent = '发送中…';

    try {
      const resp = await fetch(apiUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, body }),
      });

      const data = await resp.json();

      if (!resp.ok) {
        alert(data.error || '发送失败');
        return;
      }

      // 使用 API 返回的最新消息列表渲染
      render(data.messages || []);
      nameInput.value = '';
      msgInput.value = '';
      document.getElementById('gbEmail').value = '';
    } catch (err) {
      alert('网络错误，请稍后重试');
      console.warn('留言发送失败:', err);
    } finally {
      submitBtn.disabled = false;
      submitBtn.textContent = '发 送';
    }
  });

  // 初始加载
  loadMessages();
})();

// ========== 插图切换 ==========
(function artSwitch() {
  const btns = document.querySelectorAll('.art-btn');
  if (!btns.length) return;

  const variants = {
    red: {
      circleStroke: '#e63946',
      accentFill: '#e63946',
      accentOpacity: '0.7',
      glowColor: '#e63946',
    },
    cyan: {
      circleStroke: '#00d4ff',
      accentFill: '#00d4ff',
      accentOpacity: '0.5',
      glowColor: '#00d4ff',
    },
    gold: {
      circleStroke: '#ffd700',
      accentFill: '#ffd700',
      accentOpacity: '0.45',
      glowColor: '#ffd700',
    },
  };
  const keys = Object.keys(variants);

  btns.forEach((btn) => {
    btn.addEventListener('click', function () {
      const idx = parseInt(this.dataset.variant);
      const variant = variants[keys[idx]];
      if (!variant) return;

      btns.forEach((b) => b.classList.remove('active'));
      this.classList.add('active');

      const svg = document.getElementById('mainArt');
      if (!svg) return;

      const circles = svg.querySelectorAll('circle[stroke="#e63946"], circle[stroke="#00d4ff"], circle[stroke="#ffd700"]');
      circles.forEach((c) => {
        if (c.getAttribute('fill') === 'none' || c.getAttribute('fill')?.startsWith('url')) {
          c.setAttribute('stroke', variant.circleStroke);
        }
      });

      const glow = svg.querySelector('#redGlow');
      if (glow) {
        glow.querySelectorAll('stop').forEach((stop) => {
          stop.setAttribute('stop-color', variant.glowColor);
        });
      }

      const fillRects = svg.querySelectorAll('rect[fill="#e63946"], rect[fill="#00d4ff"], rect[fill="#ffd700"]');
      fillRects.forEach((r) => {
        r.setAttribute('fill', variant.accentFill);
        r.setAttribute('opacity', variant.accentOpacity);
      });

      const strokeRects = svg.querySelectorAll('rect[stroke="#e63946"], rect[stroke="#00d4ff"], rect[stroke="#ffd700"]');
      strokeRects.forEach((r) => r.setAttribute('stroke', variant.accentFill));

      const fillCircles = svg.querySelectorAll('circle[fill="#e63946"], circle[fill="#00d4ff"], circle[fill="#ffd700"]');
      fillCircles.forEach((c) => c.setAttribute('fill', variant.accentFill));

      svg.style.filter = `drop-shadow(0 0 60px ${variant.glowColor}22)`;
    });
  });
})();
