/**
 * 秋枫清澄个人博客 - 主脚本
 * 二次元·生机·静谧
 */

// ========== 配置区 ==========
const CONFIG = {
    sakuraCount: 15,
    fireflyCount: 20,
    typingSpeed: 100,
    scrollThreshold: 100
};

// Logo Emoji 列表
const LOGO_EMOJIS = ['🌿', '🍃', '🌸', '🌺', '🦋', '🐦', '📚', '🎋', '✨', '🌱', '🪴', '🌾', '🍀', '🌴', '🎍'];

// ========== 主题切换（根据时间段自动切换） ==========
function setAutoTheme() {
    const hour = new Date().getHours();
    const isNightTime = hour >= 18 || hour < 6;
    return isNightTime ? 'dark' : 'light';
}

const currentTheme = localStorage.getItem('theme') || setAutoTheme();
document.documentElement.setAttribute('data-theme', currentTheme);

function toggleTheme() {
    const html = document.documentElement;
    const current = html.getAttribute('data-theme');
    const newTheme = current === 'dark' ? 'light' : 'dark';
    html.setAttribute('data-theme', newTheme);
    localStorage.setItem('theme', newTheme);
    updateThemeIcon(newTheme);
}

function updateThemeIcon(theme) {
    const icon = document.querySelector('.theme-icon');
    if (icon) {
        icon.textContent = theme === 'dark' ? '🌙' : '☀️';
    }
}

// 监听系统主题变化
window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', (e) => {
    if (!localStorage.getItem('theme')) {
        const newTheme = e.matches ? 'dark' : 'light';
        document.documentElement.setAttribute('data-theme', newTheme);
        updateThemeIcon(newTheme);
    }
});

// 每分钟检查时间，自动切换主题
setInterval(() => {
    if (!localStorage.getItem('theme')) {
        const autoTheme = setAutoTheme();
        const currentTheme = document.documentElement.getAttribute('data-theme');
        if (autoTheme !== currentTheme) {
            document.documentElement.setAttribute('data-theme', autoTheme);
            updateThemeIcon(autoTheme);
        }
    }
}, 60000);

// ========== Logo Emoji 随机化 ==========
function initLogoEmoji() {
    const logoEmoji = document.getElementById('logoEmoji');
    if (logoEmoji) {
        const randomEmoji = LOGO_EMOJIS[Math.floor(Math.random() * LOGO_EMOJIS.length)];
        logoEmoji.textContent = randomEmoji;
    }
}

// ========== 平滑滚动到锚点 ==========
function initSmoothScroll() {
    document.querySelectorAll('a[href^="#"]').forEach(anchor => {
        anchor.addEventListener('click', function(e) {
            e.preventDefault();
            const targetId = this.getAttribute('href');
            if (targetId === '#') return;
            
            const target = document.querySelector(targetId);
            if (target) {
                const navHeight = document.querySelector('.nav')?.offsetHeight || 70;
                const targetPosition = target.getBoundingClientRect().top + window.pageYOffset - navHeight;
                
                window.scrollTo({
                    top: targetPosition,
                    behavior: 'smooth'
                });
            }
        });
    });
}

// ========== 滚动进度条 ==========
function initScrollProgress() {
    const progressBar = document.getElementById('progressBar');
    if (!progressBar) return;

    window.addEventListener('scroll', () => {
        const scrollTop = window.pageYOffset;
        const docHeight = document.documentElement.scrollHeight - window.innerHeight;
        const progress = (scrollTop / docHeight) * 100;
        progressBar.style.width = `${progress}%`;
    });
}

// ========== 滚动显示动画 ==========
function initScrollReveal() {
    const reveals = document.querySelectorAll('.reveal');
    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('active');
            }
        });
    }, { threshold: 0.1 });

    reveals.forEach(el => observer.observe(el));
}

// ========== 樱花效果 ==========
function createSakuraPetal(container) {
    const petal = document.createElement('div');
    petal.className = 'sakura-petal';
    
    const size = Math.random() * 15 + 10;
    const startX = Math.random() * 100;
    const duration = Math.random() * 5 + 8;
    const delay = Math.random() * 5;
    
    petal.style.cssText = `
        position: absolute;
        width: ${size}px;
        height: ${size}px;
        background: linear-gradient(135deg, rgba(255,182,193,0.9), rgba(255,192,203,0.7));
        border-radius: 50% 0 50% 50%;
        left: ${startX}%;
        top: -20px;
        opacity: 0.8;
        animation: sakuraFall ${duration}s linear ${delay}s infinite;
        box-shadow: 0 2px 4px rgba(255,182,193,0.3);
    `;
    
    container.appendChild(petal);
    
    setTimeout(() => petal.remove(), (duration + delay) * 1000);
}

function createSakura() {
    const container = document.querySelector('.sakura-container');
    if (!container) return;
    
    for (let i = 0; i < CONFIG.sakuraCount; i++) {
        setTimeout(() => createSakuraPetal(container), i * 800);
    }
    
    setInterval(() => {
        if (container.children.length < CONFIG.sakuraCount) {
            createSakuraPetal(container);
        }
    }, 2000);
}

// ========== 萤火虫效果 ==========
function createFirefly() {
    const container = document.querySelector('.fireflies-container');
    if (!container) return;
    
    const firefly = document.createElement('div');
    firefly.className = 'firefly';
    
    const size = Math.random() * 4 + 2;
    const startX = Math.random() * 100;
    const startY = Math.random() * 100;
    const duration = Math.random() * 10 + 8;
    
    firefly.style.cssText = `
        position: absolute;
        width: ${size}px;
        height: ${size}px;
        background: radial-gradient(circle, rgba(144,238,144,0.9), rgba(144,238,144,0.3));
        border-radius: 50%;
        left: ${startX}%;
        top: ${startY}%;
        box-shadow: 0 0 8px rgba(144,238,144,0.6), 0 0 15px rgba(144,238,144,0.3);
        animation: fireflyGlow ${duration}s ease-in-out infinite;
    `;
    
    container.appendChild(firefly);
    
    setTimeout(() => firefly.remove(), duration * 1000);
}

function initFireflies() {
    const container = document.querySelector('.fireflies-container');
    if (!container) return;
    
    for (let i = 0; i < CONFIG.fireflyCount; i++) {
        setTimeout(() => createFirefly(), i * 500);
    }
    
    setInterval(createFirefly, 3000);
}

// ========== 打字机效果 ==========
function initTypingEffect() {
    const texts = [
        '记录成长的每一步 ✨',
        '分享技术与生活的点滴 🌟',
        '二次元爱好者的精神角落 🎮',
        '欢迎来到我的小世界 🏠'
    ];
    
    const typingElement = document.getElementById('typingText');
    if (!typingElement) return;
    
    let textIndex = 0;
    let charIndex = 0;
    let isDeleting = false;
    
    function type() {
        const currentText = texts[textIndex];
        
        if (isDeleting) {
            typingElement.textContent = currentText.substring(0, charIndex - 1);
            charIndex--;
        } else {
            typingElement.textContent = currentText.substring(0, charIndex + 1);
            charIndex++;
        }
        
        let typeSpeed = isDeleting ? 50 : 100;
        
        if (!isDeleting && charIndex === currentText.length) {
            typeSpeed = 2000;
            isDeleting = true;
        } else if (isDeleting && charIndex === 0) {
            isDeleting = false;
            textIndex = (textIndex + 1) % texts.length;
            typeSpeed = 500;
        }
        
        setTimeout(type, typeSpeed);
    }
    
    type();
}

// ========== 建站故事 ==========
const storyArticle = {
    title: '建站故事：从0到1的博客诞生记',
    excerpt: '分享我的建站历程，从初代的简单页面到如今现代化的博客系统，包括技术选型、设计理念和成长感悟。俄国构成主义风格与ACG元素的融合。',
    date: '2024-01-01',
    tag: '随笔',
    url: '#',
    isStory: true
};

function showStory() {
    const modal = document.createElement('div');
    modal.className = 'story-modal';
    modal.innerHTML = `
        <div class="story-modal-content">
            <button class="story-close" onclick="this.closest('.story-modal').remove()">×</button>
            <h2 class="story-title">🏗️ 建站故事</h2>
            <div class="story-content">
                <h3>🌱 初识网页</h3>
                <p>记得第一次接触网页制作是在高中时期，那时候只会用Dreamweaver拖拽几个表格，页面丑得不堪入目。但就是那种"我居然能做出一个网页"的成就感，让我爱上了前端开发。</p>
                
                <h3>☁️ Cloudflare全家桶</h3>
                <p>大学后接触到了Cloudflare，被它强大的免费功能所吸引。从最初的CDN加速，到后来的Workers、Pages、R2存储，再到现在的AI Gateway，Cloudflare几乎满足了我所有的建站需求。</p>
                
                <h3>🎨 设计理念</h3>
                <p>博客的设计融合了俄国构成主义与现代ACG风格。几何图形、大胆配色、功能至上——这是构成主义的精髓。而淡粉色渐变、樱花飘落、萤火虫飞舞，则是ACG世界的浪漫。</p>
                
                <h3>✨ 未来展望</h3>
                <p>博客还会继续迭代优化。下一步计划加入评论区功能、优化移动端体验、添加更多动效。愿每一个来访者都能感受到这份用心~</p>
                
                <p class="story-footer">—— 秋枫清澄，写于某个深夜</p>
            </div>
        </div>
    `;
    document.body.appendChild(modal);
    modal.addEventListener('click', (e) => {
        if (e.target === modal) modal.remove();
    });
}

// ========== 博客列表 ==========
// ========== 博客渲染 ==========
function renderBlogSection() {
    const blogList = document.getElementById('blogList');
    if (!blogList) return;
    
    if (blogPosts.length === 0) {
        blogList.innerHTML = `
            <div class="empty-state">
                <div class="empty-state-icon">📝</div>
                <p>暂无博客，随缘更新...</p>
            </div>
        `;
        return;
    }
    
    blogList.innerHTML = blogPosts.map((post, index) => `
        <article class="blog-card reveal" data-index="${index}">
            <div class="blog-card-header">
                <span class="blog-date">📅 ${post.date}</span>
            </div>
            <h2 class="blog-card-title">${post.title}</h2>
            <p class="blog-card-excerpt">${post.excerpt}</p>
        </article>
    `).join('');
    
    // 添加点击事件
    document.querySelectorAll('.blog-card').forEach(card => {
        card.addEventListener('click', () => {
            const index = parseInt(card.dataset.index);
            openBlogModal(blogPosts[index]);
        });
    });
    
    setTimeout(initScrollReveal, 100);
}

// 打开博客模态框
function openBlogModal(post) {
    const modal = document.getElementById('blogModal');
    if (!modal) return;
    
    modal.innerHTML = `
        <div class="modal-content blog-modal-content">
            <button class="modal-close" onclick="closeBlogModal()">×</button>
            <div class="blog-modal-header">
                <span class="blog-date">📅 ${post.date}</span>
                <h1 class="blog-modal-title">${post.title}</h1>
            </div>
            <div class="blog-modal-body">
                ${post.content}
            </div>
        </div>
    `;
    modal.classList.add('active');
    document.body.style.overflow = 'hidden';
}

function closeBlogModal() {
    const modal = document.getElementById('blogModal');
    if (modal) {
        modal.classList.remove('active');
        document.body.style.overflow = '';
    }
}

// 点击模态框背景关闭
document.addEventListener('click', (e) => {
    const modal = document.getElementById('blogModal');
    if (e.target === modal) {
        closeBlogModal();
    }
});

// ESC 键关闭模态框
document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
        closeBlogModal();
    }
});

// ========== 文章列表 ==========
function renderArticles() {
    const articlesList = document.getElementById('articlesList');
    if (!articlesList) return;
    
    // 文章数据（未来从后端加载）
    const articles = [];
    
    if (articles.length === 0) {
        articlesList.innerHTML = `
            <div class="empty-state">
                <div class="empty-state-icon">📝</div>
                <p>暂无文章，敬请期待...</p>
            </div>
        `;
        return;
    }
    
    articlesList.innerHTML = articles.map(article => `
        <a href="${article.url}" class="post-card reveal">
            <span class="post-tag">${article.tag}</span>
            <h3 class="post-title">${article.title}</h3>
            <p class="post-excerpt">${article.excerpt}</p>
            <div class="post-meta">
                <span class="post-date">📅 ${article.date}</span>
            </div>
        </a>
    `).join('');
    
    setTimeout(initScrollReveal, 100);
}

// ========== 移动端菜单 ==========
function initMobileMenu() {
    const menuToggle = document.querySelector('.menu-toggle');
    const navLinks = document.querySelector('.nav-links');
    
    if (menuToggle && navLinks) {
        menuToggle.addEventListener('click', () => {
            navLinks.classList.toggle('active');
        });
        
        // 点击导航链接后关闭菜单
        navLinks.querySelectorAll('a').forEach(link => {
            link.addEventListener('click', () => {
                navLinks.classList.remove('active');
            });
        });
    }
}

// ========== 回到顶部 ==========
function initBackToTop() {
    const backToTop = document.getElementById('backToTop');
    if (!backToTop) return;
    
    // 监听滚动显示/隐藏按钮
    window.addEventListener('scroll', () => {
        if (window.pageYOffset > 300) {
            backToTop.classList.add('visible');
        } else {
            backToTop.classList.remove('visible');
        }
    });
    
    // 点击回到顶部
    backToTop.addEventListener('click', () => {
        window.scrollTo({
            top: 0,
            behavior: 'smooth'
        });
    });
}

// ========== 留言板功能 ==========
// API: https://api.153904.xyz/api/messages
// 参考: https://153904.xyz/blog-guestbook-launch

const MESSAGE_API = 'https://api.153904.xyz/api/messages';

async function fetchMessages() {
    const messageList = document.getElementById('messageList');
    if (!messageList) return;
    
    try {
        const response = await fetch(MESSAGE_API);
        if (response.ok) {
            const data = await response.json();
            displayMessages(Array.isArray(data) ? data : data.messages || []);
        } else {
            // API不可用时加载本地存储
            loadLocalMessages();
        }
    } catch (error) {
        // 网络错误时加载本地存储
        loadLocalMessages();
    }
}

function displayMessages(messages) {
    const messageList = document.getElementById('messageList');
    if (!messageList) return;
    
    if (!messages || messages.length === 0) {
        messageList.innerHTML = '<p class="empty-hint">暂无留言，来做第一个留言的人吧~</p>';
        return;
    }
    
    const sortedMessages = [...messages].reverse().slice(0, 20);
    
    messageList.innerHTML = sortedMessages.map(msg => `
        <div class="message-item">
            <div class="message-header">
                <span class="message-author">${escapeHtml(msg.name || '匿名')}</span>
                <span class="message-time">${formatTime(msg.created_at || msg.time)}</span>
            </div>
            <div class="message-body">${escapeHtml(msg.body || msg.message || '')}</div>
        </div>
    `).join('');
}

function loadLocalMessages() {
    const messageList = document.getElementById('messageList');
    if (!messageList) return;
    
    const localMessages = JSON.parse(localStorage.getItem('blogMessages') || '[]');
    
    if (localMessages.length === 0) {
        messageList.innerHTML = '<p class="empty-hint">暂无留言，来做第一个留言的人吧~</p>';
        return;
    }
    
    const sortedMessages = [...localMessages].reverse().slice(0, 20);
    
    messageList.innerHTML = sortedMessages.map(msg => `
        <div class="message-item">
            <div class="message-header">
                <span class="message-author">${escapeHtml(msg.name || '匿名')}</span>
                <span class="message-time">${formatTime(msg.time)}</span>
            </div>
            <div class="message-body">${escapeHtml(msg.message || msg.body || '')}</div>
        </div>
    `).join('');
}

async function submitMessage() {
    const nameInput = document.getElementById('messageName');
    const contentInput = document.getElementById('messageContent');
    
    if (!nameInput || !contentInput) return;
    
    const name = nameInput.value.trim() || '匿名用户';
    const content = contentInput.value.trim();
    
    if (!content) {
        alert('请输入留言内容');
        return;
    }
    
    const submitBtn = document.getElementById('submitMessage');
    if (submitBtn) {
        submitBtn.disabled = true;
        submitBtn.textContent = '发送中...';
    }
    
    const messageData = {
        name: name,
        message: content,
        time: new Date().toISOString()
    };
    
    // 先保存到本地
    const localMessages = JSON.parse(localStorage.getItem('blogMessages') || '[]');
    localMessages.push(messageData);
    if (localMessages.length > 50) localMessages.shift();
    localStorage.setItem('blogMessages', JSON.stringify(localMessages));
    
    // 尝试发送到远程API
    try {
        const response = await fetch(MESSAGE_API, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ name, content })
        });
        
        if (!response.ok) {
            console.log('远程API不可用，留言仅保存在本地');
        }
    } catch (error) {
        console.log('网络错误，留言仅保存在本地');
    }
    
    // 刷新留言列表
    fetchMessages();
    
    // 清空输入框
    nameInput.value = '';
    contentInput.value = '';
    
    if (submitBtn) {
        submitBtn.disabled = false;
        submitBtn.textContent = '📤 发送留言';
    }
}

function initMessageBoard() {
    const submitBtn = document.getElementById('submitMessage');
    if (submitBtn) {
        submitBtn.addEventListener('click', submitMessage);
    }
    
    // 加载留言
    fetchMessages();
}

function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

function formatTime(isoString) {
    const date = new Date(isoString);
    const now = new Date();
    const diff = now - date;
    
    if (diff < 60000) return '刚刚';
    if (diff < 3600000) return `${Math.floor(diff / 60000)}分钟前`;
    if (diff < 86400000) return `${Math.floor(diff / 3600000)}小时前`;
    if (diff < 604800000) return `${Math.floor(diff / 86400000)}天前`;
    
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

// ========== 初始化 ==========
document.addEventListener('DOMContentLoaded', () => {
    // 初始化主题图标
    updateThemeIcon(currentTheme);
    
    // 绑定主题切换按钮
    const themeToggle = document.getElementById('themeToggle');
    if (themeToggle) {
        themeToggle.addEventListener('click', toggleTheme);
    }
    
    // 初始化各功能
    initLogoEmoji();
    initSmoothScroll();
    initScrollProgress();
    createSakura();
    initFireflies();
    initTypingEffect();
    renderArticles();
    renderBlogSection();
    initMobileMenu();
    initBackToTop();
    initMessageBoard();
});