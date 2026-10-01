/*!
 * 站点公共层（script.js / article.js / timeline.js 共用）
 * - 存储兜底：localStorage 不可用时自动退化为内存存储，避免整页脚本中断
 * - 数据校验：文章与时间轴数据统一在这里过滤、补默认值、排序
 * - 页眉交互：移动导航、滚动进度、返回顶部、页脚年份、rAF 节流滚动
 * - 工具函数：HTML 转义、日期格式化、文章链接、页眉高度
 * 全部挂在 window.QiufengUI 上，三个页面脚本不再各自复制一份。
 */
(function () {
    'use strict';

    /* ---------------- 存储 ---------------- */

    const storage = (function createStorage() {
        const memory = new Map();
        let usable = false;

        try {
            const probe = '__qiufeng_probe__';
            window.localStorage.setItem(probe, '1');
            window.localStorage.removeItem(probe);
            usable = true;
        } catch {
            usable = false;
        }

        if (usable) {
            return {
                available: true,
                get(key) {
                    try {
                        return window.localStorage.getItem(key);
                    } catch {
                        return memory.has(key) ? memory.get(key) : null;
                    }
                },
                set(key, value) {
                    try {
                        window.localStorage.setItem(key, value);
                    } catch {
                        memory.set(key, value);
                    }
                },
                remove(key) {
                    try {
                        window.localStorage.removeItem(key);
                    } catch {
                        memory.delete(key);
                    }
                },
            };
        }

        console.info('[site-ui] localStorage 不可用，偏好设置将只在本页生效。');
        return {
            available: false,
            get: (key) => (memory.has(key) ? memory.get(key) : null),
            set: (key, value) => memory.set(key, String(value)),
            remove: (key) => memory.delete(key),
        };
    }());

    function getJSON(key, fallback) {
        const raw = storage.get(key);
        if (!raw) return fallback;
        try {
            const parsed = JSON.parse(raw);
            return parsed ?? fallback;
        } catch {
            return fallback;
        }
    }

    /* ---------------- 工具 ---------------- */

    const ESCAPE_MAP = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };

    function escapeHtml(value) {
        return String(value ?? '').replace(/[&<>"']/g, (character) => ESCAPE_MAP[character]);
    }

    function formatDate(dateString) {
        return String(dateString || '').replaceAll('-', '.');
    }

    function getArticleUrl(postId) {
        return `article.html?id=${encodeURIComponent(String(postId ?? ''))}`;
    }

    function headerOffset(extra = 16) {
        const raw = getComputedStyle(document.documentElement).getPropertyValue('--header-height');
        const height = Number.parseFloat(raw);
        return (Number.isFinite(height) ? height : 72) + extra;
    }

    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');

    function refreshIcons(root) {
        if (window.QiufengIcons) return window.QiufengIcons.render(root);
        if (window.lucide && !root) return window.lucide.createIcons();
        return 0;
    }

    function scrollToTop() {
        window.scrollTo({ top: 0, behavior: reducedMotion.matches ? 'auto' : 'smooth' });
    }

    /* ---------------- 数据校验 ---------------- */

    const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;
    let warnedPosts = false;

    function normalizePosts(source) {
        if (!Array.isArray(source)) return [];

        const valid = [];
        const dropped = [];

        source.forEach((post) => {
            if (!post || typeof post !== 'object' || typeof post.id !== 'string' || !post.id.trim() || typeof post.title !== 'string') {
                dropped.push(post);
                return;
            }

            const date = typeof post.date === 'string' && DATE_PATTERN.test(post.date) ? post.date : '';
            if (!date) dropped.push(post);

            valid.push({
                ...post,
                id: post.id.trim(),
                title: post.title.trim(),
                date,
                excerpt: typeof post.excerpt === 'string' ? post.excerpt : '',
                content: typeof post.content === 'string' ? post.content : '',
                tags: Array.isArray(post.tags) ? post.tags.filter((tag) => typeof tag === 'string' && tag.trim()).map((tag) => tag.trim()) : [],
            });
        });

        if (dropped.length && !warnedPosts) {
            warnedPosts = true;
            console.warn('[site-ui] 有 %d 篇文章缺少 id/title 或日期格式不是 YYYY-MM-DD，已按容错方式处理。', dropped.length);
        }

        return valid.sort((left, right) => right.date.localeCompare(left.date));
    }

    function normalizeEvents(source) {
        if (!Array.isArray(source)) return [];
        return source
            .filter((event) => event && typeof event === 'object' && typeof event.id === 'string' && event.id.trim() && typeof event.title === 'string')
            .map((event) => ({
                ...event,
                id: event.id.trim(),
                title: event.title.trim(),
                date: typeof event.date === 'string' ? event.date : '',
                summary: typeof event.summary === 'string' ? event.summary : '',
                details: Array.isArray(event.details) ? event.details.filter((item) => typeof item === 'string') : [],
            }))
            .sort((left, right) => right.date.localeCompare(left.date));
    }

    /* ---------------- 逐个显示的动画 ---------------- */

    let revealObserver = null;

    function revealAll(root) {
        const scope = root && root.querySelectorAll ? root : document;
        scope.querySelectorAll('.reveal:not(.is-visible)').forEach((item) => item.classList.add('is-visible'));
    }

    /**
     * 单一 IntersectionObserver 复用：重复调用只观察新出现的元素，
     * 不再每次渲染都新建观察者（旧实现会随输入/筛选累积大量失效观察者）。
     */
    function initReveal(options = {}) {
        const selector = options.selector || '.reveal:not(.is-visible)';
        const items = document.querySelectorAll(selector);
        if (items.length === 0) return;

        if (reducedMotion.matches || !('IntersectionObserver' in window)) {
            items.forEach((item) => item.classList.add('is-visible'));
            return;
        }

        if (!revealObserver) {
            revealObserver = new IntersectionObserver((entries, observer) => {
                entries.forEach((entry) => {
                    if (!entry.isIntersecting) return;
                    entry.target.classList.add('is-visible');
                    observer.unobserve(entry.target);
                });
            }, { threshold: options.threshold ?? 0.12 });
        }

        items.forEach((item) => revealObserver.observe(item));
    }

    /* ---------------- 页眉 / 滚动 / 导航 ---------------- */

    function initSiteChrome(hooks = {}) {
        const header = document.querySelector('.site-header');
        const progress = document.getElementById('scrollProgress');
        const backToTopButton = document.getElementById('backToTop');
        const footerBackToTopButton = document.getElementById('footerBackToTop');
        const menuToggle = document.getElementById('menuToggle');
        const navLinks = document.getElementById('navLinks');
        const footerYear = document.getElementById('footerYear');

        let frameId = 0;
        let scrollable = 0;

        function measure() {
            scrollable = document.documentElement.scrollHeight - window.innerHeight;
        }

        function applyScrollState() {
            frameId = 0;
            const scrollTop = window.scrollY;
            const ratio = scrollable > 0 ? Math.min(1, Math.max(0, scrollTop / scrollable)) : 0;

            if (progress) progress.style.transform = `scaleX(${ratio})`;
            if (header) header.classList.toggle('is-scrolled', scrollTop > 16);
            if (backToTopButton) backToTopButton.disabled = scrollTop < 200;

            if (hooks.onScroll) hooks.onScroll(scrollTop, ratio);
        }

        // 滚动事件只登记一帧，读写集中在 rAF 回调里，避免每次滚动都强制回流
        function requestScrollState() {
            if (frameId) return;
            frameId = window.requestAnimationFrame(applyScrollState);
        }

        function setMenuIcon(isOpen) {
            if (!menuToggle) return;
            menuToggle.innerHTML = `<i data-lucide="${isOpen ? 'x' : 'menu'}" aria-hidden="true"></i>`;
            refreshIcons(menuToggle);
        }

        function closeMenu() {
            if (!navLinks || !navLinks.classList.contains('is-open')) return;
            navLinks.classList.remove('is-open');
            if (menuToggle) {
                menuToggle.setAttribute('aria-expanded', 'false');
                menuToggle.setAttribute('aria-label', '打开导航');
            }
            setMenuIcon(false);
        }

        function toggleMenu() {
            if (!navLinks || !menuToggle) return;
            const isOpen = navLinks.classList.toggle('is-open');
            menuToggle.setAttribute('aria-expanded', String(isOpen));
            menuToggle.setAttribute('aria-label', isOpen ? '关闭导航' : '打开导航');
            setMenuIcon(isOpen);
            if (isOpen) navLinks.querySelector('a')?.focus({ preventScroll: true });
        }

        if (footerYear) footerYear.textContent = String(new Date().getFullYear());

        backToTopButton?.addEventListener('click', scrollToTop);
        footerBackToTopButton?.addEventListener('click', scrollToTop);
        menuToggle?.addEventListener('click', toggleMenu);
        navLinks?.querySelectorAll('a').forEach((link) => link.addEventListener('click', closeMenu));

        document.addEventListener('keydown', (event) => {
            if (event.key !== 'Escape') return;
            if (navLinks?.classList.contains('is-open')) {
                closeMenu();
                menuToggle?.focus();
            }
        });

        let resizeTimer = 0;
        window.addEventListener('resize', () => {
            if (window.innerWidth > 760) closeMenu();
            measure();
            requestScrollState();
            if (hooks.onResize) {
                window.clearTimeout(resizeTimer);
                resizeTimer = window.setTimeout(hooks.onResize, 150);
            }
        });

        // 页面高度会随文章渲染、筛选、图片加载变化
        window.addEventListener('load', () => {
            measure();
            requestScrollState();
        });
        document.addEventListener('visibilitychange', () => {
            if (!document.hidden) {
                measure();
                requestScrollState();
            }
        });
        window.addEventListener('scroll', requestScrollState, { passive: true });

        measure();
        applyScrollState();

        return {
            closeMenu,
            toggleMenu,
            measure,
            requestScrollState,
            storage,
        };
    }

    window.QiufengUI = Object.freeze({
        storage,
        getJSON,
        escapeHtml,
        formatDate,
        getArticleUrl,
        headerOffset,
        reducedMotion,
        refreshIcons,
        scrollToTop,
        normalizePosts,
        normalizeEvents,
        initReveal,
        revealAll,
        initSiteChrome,
    });
}());
