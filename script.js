/* ============================================
   构成主义 × 二次元 — JavaScript
   ============================================ */

// ----- 时钟 -----
(function clock() {
  const el = document.getElementById('clock');
  const label = document.getElementById('clockLabel');
  if (!el) return;

  let showSeconds = true;
  let timeOffset = 0;

  function formatTime(date) {
    const h = String(date.getHours()).padStart(2, '0');
    const m = String(date.getMinutes()).padStart(2, '0');
    if (showSeconds) {
      const s = String(date.getSeconds()).padStart(2, '0');
      return `${h}:${m}:${s}`;
    }
    return `${h}:${m}`;
  }

  function tick() {
    el.textContent = formatTime(new Date(Date.now() + timeOffset));
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

// ----- 博客数据 -----
(function blog() {
  const list = document.getElementById('blogList');
  if (!list) return;

  const posts = [];

  list.innerHTML = posts.map(p => `
    <div class="blog-card" data-id="${p.id}">
      <div class="blog-date">${p.date}</div>
      <div class="blog-title">${p.title}</div>
      <div class="blog-excerpt">${p.excerpt}</div>
    </div>
  `).join('');

  // 点击博客卡片展开/收起摘要
  list.addEventListener('click', function(e) {
    const card = e.target.closest('.blog-card');
    if (!card) return;
    card.classList.toggle('expanded');
  });
})();

// ----- 留言板 (localStorage) -----
(function guestbook() {
  const form = document.getElementById('gbForm');
  const msgContainer = document.getElementById('gbMessages');
  if (!form || !msgContainer) return;

  const STORAGE_KEY = 'gb_messages_153904';
  localStorage.removeItem(STORAGE_KEY); // 清空留言

  function loadMessages() {
    try {
      return JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
    } catch { return []; }
  }

  function saveMessages(msgs) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(msgs));
  }

  function render() {
    const msgs = loadMessages();
    if (msgs.length === 0) {
      msgContainer.innerHTML = '';
      return;
    }
    msgContainer.innerHTML = msgs.slice(-20).map(m => `
      <div class="gb-msg">
        <span class="gb-msg-time">${m.time}</span>
        <span class="gb-msg-name">${esc(m.name)}</span>
        <span class="gb-msg-body">${esc(m.body)}</span>
      </div>
    `).join('');
  }

  function esc(s) {
    const d = document.createElement('div');
    d.textContent = s;
    return d.innerHTML;
  }

  form.addEventListener('submit', function(e) {
    e.preventDefault();
    const name = document.getElementById('gbName').value.trim();
    const body = document.getElementById('gbMessage').value.trim();
    if (!name || !body) return;

    const msgs = loadMessages();
    const now = new Date();
    const time = `${now.getFullYear()}/${String(now.getMonth()+1).padStart(2,'0')}/${String(now.getDate()).padStart(2,'0')} ${String(now.getHours()).padStart(2,'0')}:${String(now.getMinutes()).padStart(2,'0')}`;

    msgs.push({ name, body, time });
    // 最多保留 50 条
    if (msgs.length > 50) msgs.splice(0, msgs.length - 50);
    saveMessages(msgs);
    render();

    document.getElementById('gbName').value = '';
    document.getElementById('gbMessage').value = '';
    document.getElementById('gbEmail').value = '';
  });

  render();
})();

// ----- 插图切换 -----
(function artSwitch() {
  const btns = document.querySelectorAll('.art-btn');
  if (!btns.length) return;

  // 三套不同配色的构成主义插画
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

  btns.forEach(btn => {
    btn.addEventListener('click', function() {
      const idx = parseInt(this.dataset.variant);
      const variant = variants[keys[idx]];
      if (!variant) return;

      // 切换按钮状态
      btns.forEach(b => b.classList.remove('active'));
      this.classList.add('active');

      // 修改 SVG 中对应元素的颜色
          const svg = document.getElementById('mainArt');
      if (!svg) return;

      // 红色圆
      const circles = svg.querySelectorAll('circle[stroke="#e63946"], circle[stroke="#00d4ff"], circle[stroke="#ffd700"]');
      circles.forEach(c => {
        if (c.getAttribute('fill') === 'none' || c.getAttribute('fill')?.startsWith('url')) {
          c.setAttribute('stroke', variant.circleStroke);
        }
      });

      // 发光渐变
      const glow = svg.querySelector('#redGlow');
      if (glow) {
        glow.querySelectorAll('stop').forEach(stop => {
          stop.setAttribute('stop-color', variant.glowColor);
        });
      }

      // 红色填充矩形
      const fillRects = svg.querySelectorAll('rect[fill="#e63946"], rect[fill="#00d4ff"], rect[fill="#ffd700"]');
      fillRects.forEach(r => {
        r.setAttribute('fill', variant.accentFill);
        r.setAttribute('opacity', variant.accentOpacity);
      });

      // 红色描边矩形
      const strokeRects = svg.querySelectorAll('rect[stroke="#e63946"], rect[stroke="#00d4ff"], rect[stroke="#ffd700"]');
      strokeRects.forEach(r => r.setAttribute('stroke', variant.accentFill));

      // 红色填充的形状
      const fillPolys = svg.querySelectorAll('circle[fill="#e63946"], circle[fill="#00d4ff"], circle[fill="#ffd700"]');
      fillPolys.forEach(c => c.setAttribute('fill', variant.accentFill));

      // 红色 pulse 圆点
      const redDots = svg.querySelectorAll('circle[fill="#e63946"].art-pulse, circle[fill="#00d4ff"].art-pulse, circle[fill="#ffd700"].art-pulse');
      redDots.forEach(c => c.setAttribute('fill', variant.accentFill));

      // 更新 drop-shadow
      svg.style.filter = `drop-shadow(0 0 60px ${variant.glowColor}22)`;
    });
  });
})();
