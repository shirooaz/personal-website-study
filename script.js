const header = document.querySelector('.site-header');
const progress = document.getElementById('scrollProgress');
const backToTopButton = document.getElementById('backToTop');
const footerBackToTopButton = document.getElementById('footerBackToTop');
const menuToggle = document.getElementById('menuToggle');
const navLinks = document.getElementById('navLinks');
const heroLatest = document.getElementById('heroLatest');
const heroLatestTitle = document.getElementById('heroLatestTitle');
const heroLatestDate = document.getElementById('heroLatestDate');
const journalYear = document.getElementById('journalYear');
const footerYear = document.getElementById('footerYear');
const postList = document.getElementById('postList');
const tagFilters = document.getElementById('tagFilters');
const articleSearch = document.getElementById('articleSearch');
const searchClear = document.getElementById('searchClear');
const postCountRange = document.getElementById('postCountRange');
const postCountOutput = document.getElementById('postCountOutput');
const postTotal = document.getElementById('postTotal');
const messageForm = document.getElementById('messageForm');
const messageName = document.getElementById('messageName');
const messageContent = document.getElementById('messageContent');
const messageCount = document.getElementById('messageCount');
const submitMessageButton = document.getElementById('submitMessage');
const submitMessageLabel = document.getElementById('submitMessageLabel');
const messageFormStatus = document.getElementById('messageFormStatus');
const messageList = document.getElementById('messageList');
const refreshMessagesButton = document.getElementById('refreshMessages');
const guestbookLayout = document.querySelector('.guestbook-layout');
const guestbookResizer = document.getElementById('guestbookResizer');
const { reducedMotionPreference, refreshIcons } = window.QiufengTheme;
const savedPostCount = Number(localStorage.getItem('qiufeng-post-count'));
let visiblePostCount = Number.isInteger(savedPostCount) && savedPostCount > 0 ? savedPostCount : 3;
let activeTag = localStorage.getItem('qiufeng-active-tag') || '全部';
let searchQuery = '';
const MESSAGE_API = 'https://api.153904.xyz/api/messages';
const MESSAGE_TIMEOUT_MS = 8000;
const PENDING_MESSAGES_KEY = 'qiufeng-pending-messages';
const LEGACY_MESSAGES_KEY = 'blogMessages';
const GUESTBOOK_SPLIT_KEY = 'qiufeng-guestbook-split';
const savedGuestbookSplit = Number(localStorage.getItem(GUESTBOOK_SPLIT_KEY));
let guestbookSplit = Number.isFinite(savedGuestbookSplit) ? savedGuestbookSplit : 58;
let activeResizePointer = null;

function initTypingEffect() {
    const typingElement = document.querySelector('.hero-lead');
    if (!typingElement) return;

    const textParts = Array.from(typingElement.childNodes)
        .map((node) => node.textContent || '')
        .filter((part) => part.trim());
    const text = textParts.map((part) => part.replace(/\s+/g, ' ').trim()).join('\n');
    if (!text) return;

    const textElement = document.createElement('span');
    textElement.className = 'typing-text';
    const cursorElement = document.createElement('span');
    cursorElement.className = 'typing-cursor';
    cursorElement.setAttribute('aria-hidden', 'true');
    typingElement.replaceChildren(textElement, cursorElement);

    if (reducedMotionPreference.matches) {
        textElement.textContent = text;
        cursorElement.hidden = true;
        return;
    }

    let characterIndex = 0;
    const typeNextCharacter = () => {
        textElement.textContent = text.slice(0, characterIndex);
        if (characterIndex >= text.length) return;
        characterIndex += 1;
        window.setTimeout(typeNextCharacter, 100);
    };

    typeNextCharacter();
}

function formatDate(dateString) {
    return dateString.replaceAll('-', '.');
}

function getArticleUrl(postId) {
    return `article.html?id=${encodeURIComponent(postId)}`;
}

function setCurrentYear() {
    const year = String(new Date().getFullYear());
    journalYear.textContent = year;
    footerYear.textContent = year;
}

function renderHeroLatest(posts) {
    const latestPost = [...posts].sort((left, right) => right.date.localeCompare(left.date))[0];
    if (!latestPost) {
        heroLatest.hidden = true;
        return;
    }

    heroLatest.hidden = false;
    heroLatest.href = getArticleUrl(latestPost.id);
    heroLatestTitle.textContent = latestPost.title;
    heroLatestDate.dateTime = latestPost.date;
    heroLatestDate.textContent = formatDate(latestPost.date);
}

function getPostSearchText(post) {
    const documentFragment = new DOMParser().parseFromString(post.content || '', 'text/html');
    return [post.title, post.excerpt, ...(post.tags || []), documentFragment.body.textContent]
        .filter(Boolean)
        .join(' ')
        .toLocaleLowerCase('zh-CN');
}

function renderPosts() {
    if (!Array.isArray(window.blogPosts) && typeof blogPosts === 'undefined') {
        postList.innerHTML = '<p>文章数据暂时无法读取。</p>';
        return;
    }

    const sourcePosts = typeof blogPosts !== 'undefined' ? blogPosts : window.blogPosts;
    const allPosts = [...sourcePosts].sort((left, right) => right.date.localeCompare(left.date));
    renderHeroLatest(allPosts);
    const availableTags = [...new Set(allPosts.flatMap((post) => post.tags || []))];
    if (activeTag !== '全部' && !availableTags.includes(activeTag)) activeTag = '全部';
    renderTagFilters(availableTags);

    const taggedPosts = activeTag === '全部'
        ? allPosts
        : allPosts.filter((post) => (post.tags || []).includes(activeTag));
    const normalizedQuery = searchQuery.trim().toLocaleLowerCase('zh-CN');
    const posts = normalizedQuery
        ? taggedPosts.filter((post) => getPostSearchText(post).includes(normalizedQuery))
        : taggedPosts;
    const totalPosts = posts.length;
    const displayCount = totalPosts > 0 ? Math.min(Math.max(1, visiblePostCount), totalPosts) : 0;
    postList.innerHTML = totalPosts > 0 ? posts.slice(0, displayCount).map((post, index) => `
        <a class="post-row reveal" href="${getArticleUrl(post.id)}" aria-label="阅读《${post.title}》">
            <span class="post-meta">
                <span class="post-index">${String(index + 1).padStart(2, '0')}</span>
                <time datetime="${post.date}">${formatDate(post.date)}</time>
            </span>
            <span class="post-copy">
                <h3>${post.title}</h3>
                <p>${post.excerpt}</p>
                <span class="post-tags">${(post.tags || []).map((tag) => `<span>${tag}</span>`).join('')}</span>
            </span>
            <span class="post-arrow" aria-hidden="true"><i data-lucide="arrow-up-right"></i></span>
        </a>
    `).join('') : `
        <div class="search-empty">
            <div>
                <p>没有找到符合条件的文章。</p>
                <button id="resetArticleFilters" type="button">清除搜索与筛选</button>
            </div>
        </div>
    `;

    document.getElementById('resetArticleFilters')?.addEventListener('click', resetArticleFilters);
    const rangeProgress = totalPosts > 1 ? ((displayCount - 1) / (totalPosts - 1)) * 100 : 100;
    postCountRange.min = totalPosts > 0 ? '1' : '0';
    postCountRange.max = String(totalPosts);
    postCountRange.value = String(displayCount);
    postCountRange.disabled = totalPosts <= 1;
    postCountRange.style.setProperty('--range-progress', `${rangeProgress}%`);
    postCountOutput.value = `${displayCount} / ${totalPosts}`;
    const isFiltered = activeTag !== '全部' || normalizedQuery;
    postTotal.textContent = isFiltered
        ? `找到 ${totalPosts} 篇（全部 ${allPosts.length} 篇）`
        : `共 ${allPosts.length} 篇公开记录`;
    searchClear.hidden = !normalizedQuery;
    refreshIcons();
    initReveal();
}

function renderTagFilters(tags) {
    tagFilters.innerHTML = ['全部', ...tags].map((tag) => `
        <button class="tag-filter" type="button" data-tag="${tag}" aria-pressed="${String(tag === activeTag)}">${tag}</button>
    `).join('');

    tagFilters.querySelectorAll('.tag-filter').forEach((button) => {
        button.addEventListener('click', () => setActiveTag(button.dataset.tag));
    });
}

function setActiveTag(tag) {
    if (tag === activeTag) return;
    activeTag = tag;
    localStorage.setItem('qiufeng-active-tag', tag);
    renderPosts();
}

function resetArticleFilters() {
    activeTag = '全部';
    searchQuery = '';
    articleSearch.value = '';
    localStorage.setItem('qiufeng-active-tag', activeTag);
    renderPosts();
    articleSearch.focus();
}

function clearSearch() {
    searchQuery = '';
    articleSearch.value = '';
    renderPosts();
    articleSearch.focus();
}

function updateSearch() {
    searchQuery = articleSearch.value;
    renderPosts();
}

function setPostCount(count) {
    if (!Number.isInteger(count) || count === visiblePostCount) return;
    visiblePostCount = count;
    localStorage.setItem('qiufeng-post-count', String(count));
    renderPosts();
}

function redirectLegacyArticleUrl() {
    const postId = new URL(window.location.href).searchParams.get('article');
    if (!postId) return;

    const posts = typeof blogPosts !== 'undefined' ? blogPosts : window.blogPosts;
    if (Array.isArray(posts) && posts.some((post) => post.id === postId)) {
        window.location.replace(getArticleUrl(postId));
    }
}

function readStoredMessages(key) {
    try {
        const messages = JSON.parse(localStorage.getItem(key) || '[]');
        return Array.isArray(messages) ? messages : [];
    } catch {
        return [];
    }
}

function savePendingMessage(message) {
    const pendingMessages = readStoredMessages(PENDING_MESSAGES_KEY);
    pendingMessages.push(message);
    localStorage.setItem(PENDING_MESSAGES_KEY, JSON.stringify(pendingMessages.slice(-50)));
}

function getMessageBody(message) {
    return String(message.body || message.message || '').trim();
}

function getMessageTime(message) {
    return message.time || message.created_at || new Date().toISOString();
}

function formatMessageTime(value) {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return '时间未知';

    const difference = Date.now() - date.getTime();
    if (difference >= 0 && difference < 60000) return '刚刚';
    if (difference >= 0 && difference < 3600000) return `${Math.floor(difference / 60000)} 分钟前`;
    if (difference >= 0 && difference < 86400000) return `${Math.floor(difference / 3600000)} 小时前`;
    if (difference >= 0 && difference < 604800000) return `${Math.floor(difference / 86400000)} 天前`;

    return new Intl.DateTimeFormat('zh-CN', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
    }).format(date);
}

function createMessageState(title, detail = '', loading = false) {
    const state = document.createElement('div');
    state.className = 'message-state';

    if (loading) {
        const loader = document.createElement('span');
        loader.className = 'message-loader';
        loader.setAttribute('aria-hidden', 'true');
        state.appendChild(loader);
    }

    const copy = document.createElement('div');
    const message = document.createElement('p');
    message.textContent = title;
    copy.appendChild(message);

    if (detail) {
        const small = document.createElement('small');
        small.textContent = detail;
        copy.appendChild(small);
    }

    state.appendChild(copy);
    return state;
}

function createMessageItem(message) {
    const item = document.createElement('article');
    item.className = 'message-item';

    const name = String(message.name || '匿名用户').trim() || '匿名用户';
    const avatar = document.createElement('span');
    avatar.className = 'message-avatar';
    avatar.setAttribute('aria-hidden', 'true');
    avatar.textContent = Array.from(name)[0] || '匿';

    const content = document.createElement('div');
    const meta = document.createElement('div');
    meta.className = 'message-meta';

    const authorWrap = document.createElement('div');
    const author = document.createElement('span');
    author.className = 'message-author';
    author.textContent = name;
    authorWrap.appendChild(author);

    if (message.local) {
        const localBadge = document.createElement('span');
        localBadge.className = 'message-local-badge';
        localBadge.textContent = '本机保存';
        authorWrap.appendChild(localBadge);
    }

    const time = document.createElement('time');
    time.className = 'message-time';
    time.dateTime = getMessageTime(message);
    time.textContent = formatMessageTime(time.dateTime);

    const body = document.createElement('p');
    body.className = 'message-body';
    body.textContent = getMessageBody(message);

    meta.append(authorWrap, time);
    content.append(meta, body);
    item.append(avatar, content);
    return item;
}

function renderMessages(messages, notice = '') {
    const uniqueMessages = [];
    const seen = new Set();

    messages.forEach((message) => {
        const body = getMessageBody(message);
        if (!body) return;
        const key = message.id || `${message.name}|${body}|${getMessageTime(message)}`;
        if (seen.has(key)) return;
        seen.add(key);
        uniqueMessages.push(message);
    });

    uniqueMessages.sort((left, right) => new Date(getMessageTime(right)) - new Date(getMessageTime(left)));
    messageList.replaceChildren();

    if (notice) {
        const sourceNote = document.createElement('div');
        sourceNote.className = 'message-source-note';
        sourceNote.textContent = notice;
        messageList.appendChild(sourceNote);
    }

    if (uniqueMessages.length === 0) {
        messageList.appendChild(createMessageState('还没有留言', '来写下第一句话吧。'));
        return;
    }

    uniqueMessages.slice(0, 20).forEach((message) => {
        messageList.appendChild(createMessageItem(message));
    });
}

async function fetchWithTimeout(url, options = {}) {
    const controller = new AbortController();
    const timeoutId = window.setTimeout(() => controller.abort(), MESSAGE_TIMEOUT_MS);

    try {
        return await fetch(url, { ...options, signal: controller.signal });
    } finally {
        window.clearTimeout(timeoutId);
    }
}

async function loadMessages() {
    messageList.setAttribute('aria-busy', 'true');
    messageList.replaceChildren(createMessageState('正在读取留言', '', true));
    refreshMessagesButton.disabled = true;
    refreshMessagesButton.classList.add('is-loading');

    const pendingMessages = readStoredMessages(PENDING_MESSAGES_KEY).map((message) => ({ ...message, local: true }));

    try {
        const response = await fetchWithTimeout(MESSAGE_API, { headers: { Accept: 'application/json' } });
        if (!response.ok) throw new Error(`留言服务返回 ${response.status}`);
        const data = await response.json();
        const remoteMessages = Array.isArray(data) ? data : data.messages || [];
        const notice = pendingMessages.length > 0 ? '部分留言仅保存在本机。' : '';
        renderMessages([...remoteMessages, ...pendingMessages], notice);
    } catch {
        const legacyMessages = readStoredMessages(LEGACY_MESSAGES_KEY).map((message) => ({ ...message, local: true }));
        renderMessages([...pendingMessages, ...legacyMessages], '暂时无法连接在线留言，正在显示本机记录。');
    } finally {
        messageList.setAttribute('aria-busy', 'false');
        refreshMessagesButton.disabled = false;
        refreshMessagesButton.classList.remove('is-loading');
    }
}

function setMessageFormStatus(message, state = '') {
    messageFormStatus.textContent = message;
    if (state) {
        messageFormStatus.dataset.state = state;
    } else {
        delete messageFormStatus.dataset.state;
    }
}

function updateMessageCount() {
    messageCount.textContent = `${messageContent.value.length} / 500`;
    messageContent.removeAttribute('aria-invalid');
    if (messageFormStatus.dataset.state === 'error') setMessageFormStatus('');
}

async function submitMessage(event) {
    event.preventDefault();
    const name = messageName.value.trim() || '匿名用户';
    const body = messageContent.value.trim();

    if (!body) {
        messageContent.setAttribute('aria-invalid', 'true');
        setMessageFormStatus('请先写下留言内容。', 'error');
        messageContent.focus();
        return;
    }

    submitMessageButton.disabled = true;
    submitMessageButton.classList.add('is-loading');
    submitMessageButton.setAttribute('aria-busy', 'true');
    submitMessageLabel.textContent = '发送中';
    setMessageFormStatus('');

    try {
        const response = await fetchWithTimeout(MESSAGE_API, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name, body }),
        });
        const result = await response.json().catch(() => ({}));

        if (!response.ok) {
            const requestError = new Error(result.error || '留言发送失败，请稍后再试。');
            requestError.isRequestError = response.status < 500;
            throw requestError;
        }

        messageContent.value = '';
        updateMessageCount();
        setMessageFormStatus('留言已发送。', 'success');
        await loadMessages();
    } catch (error) {
        if (error.isRequestError) {
            setMessageFormStatus(error.message, 'error');
        } else {
            savePendingMessage({
                id: `local-${Date.now().toString(36)}`,
                name,
                body,
                time: new Date().toISOString(),
                local: true,
            });
            messageContent.value = '';
            updateMessageCount();
            setMessageFormStatus('网络暂不可用，留言已保存在本机。', 'offline');
            await loadMessages();
        }
    } finally {
        submitMessageButton.disabled = false;
        submitMessageButton.classList.remove('is-loading');
        submitMessageButton.removeAttribute('aria-busy');
        submitMessageLabel.textContent = '发送留言';
        refreshIcons();
    }
}

function getGuestbookSplitLimits() {
    const width = guestbookLayout.getBoundingClientRect().width;
    const dividerWidth = guestbookResizer.offsetWidth || 56;
    const minimum = width > 0 ? (280 / width) * 100 : 30;
    const maximum = width > 0 ? ((width - dividerWidth - 300) / width) * 100 : 70;

    return {
        minimum: Math.max(25, minimum),
        maximum: Math.min(75, Math.max(minimum, maximum)),
    };
}

function applyGuestbookSplit(value, persist = false) {
    if (window.innerWidth <= 760) return;

    const { minimum, maximum } = getGuestbookSplitLimits();
    guestbookSplit = Math.min(maximum, Math.max(minimum, value));
    guestbookLayout.style.setProperty('--guestbook-left', `${guestbookSplit}%`);
    guestbookResizer.setAttribute('aria-valuemin', String(Math.round(minimum)));
    guestbookResizer.setAttribute('aria-valuemax', String(Math.round(maximum)));
    guestbookResizer.setAttribute('aria-valuenow', String(Math.round(guestbookSplit)));

    if (persist) localStorage.setItem(GUESTBOOK_SPLIT_KEY, String(guestbookSplit));
}

function updateGuestbookSplitFromPointer(event) {
    if (event.pointerId !== activeResizePointer) return;
    const bounds = guestbookLayout.getBoundingClientRect();
    const dividerWidth = guestbookResizer.offsetWidth || 56;
    const leftWidth = event.clientX - bounds.left - dividerWidth / 2;
    applyGuestbookSplit((leftWidth / bounds.width) * 100);
}

function startGuestbookResize(event) {
    if (window.innerWidth <= 760 || event.button !== 0) return;
    activeResizePointer = event.pointerId;
    guestbookResizer.setPointerCapture(event.pointerId);
    document.body.classList.add('is-resizing');
    updateGuestbookSplitFromPointer(event);
}

function finishGuestbookResize(event) {
    if (event.pointerId !== activeResizePointer) return;
    activeResizePointer = null;
    document.body.classList.remove('is-resizing');
    localStorage.setItem(GUESTBOOK_SPLIT_KEY, String(guestbookSplit));
}

function adjustGuestbookSplitWithKeyboard(event) {
    const { minimum, maximum } = getGuestbookSplitLimits();
    const step = event.shiftKey ? 5 : 2;
    let nextValue = guestbookSplit;

    if (event.key === 'ArrowLeft') nextValue -= step;
    else if (event.key === 'ArrowRight') nextValue += step;
    else if (event.key === 'Home') nextValue = minimum;
    else if (event.key === 'End') nextValue = maximum;
    else return;

    event.preventDefault();
    applyGuestbookSplit(nextValue, true);
}

function toggleMenu() {
    const isOpen = navLinks.classList.toggle('is-open');
    menuToggle.setAttribute('aria-expanded', String(isOpen));
    menuToggle.setAttribute('aria-label', isOpen ? '关闭导航' : '打开导航');
    menuToggle.innerHTML = `<i data-lucide="${isOpen ? 'x' : 'menu'}" aria-hidden="true"></i>`;
    refreshIcons();
}

function closeMenu() {
    navLinks.classList.remove('is-open');
    menuToggle.setAttribute('aria-expanded', 'false');
    menuToggle.setAttribute('aria-label', '打开导航');
    menuToggle.innerHTML = '<i data-lucide="menu" aria-hidden="true"></i>';
    refreshIcons();
}

function updateScrollState() {
    const scrollTop = window.scrollY;
    const scrollable = document.documentElement.scrollHeight - window.innerHeight;
    const percentage = scrollable > 0 ? (scrollTop / scrollable) * 100 : 0;
    progress.style.width = `${percentage}%`;
    header.classList.toggle('is-scrolled', scrollTop > 16);
    backToTopButton.disabled = scrollTop < 200;
}

function scrollToTop() {
    window.scrollTo({
        top: 0,
        behavior: reducedMotionPreference.matches ? 'auto' : 'smooth',
    });
}

function initReveal() {
    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const items = document.querySelectorAll('.reveal');

    if (reducedMotion || !('IntersectionObserver' in window)) {
        items.forEach((item) => item.classList.add('is-visible'));
        return;
    }

    const observer = new IntersectionObserver((entries) => {
        entries.forEach((entry) => {
            if (entry.isIntersecting) {
                entry.target.classList.add('is-visible');
                observer.unobserve(entry.target);
            }
        });
    }, { threshold: 0.12 });

    items.forEach((item) => observer.observe(item));
}

backToTopButton.addEventListener('click', scrollToTop);
footerBackToTopButton.addEventListener('click', scrollToTop);
menuToggle.addEventListener('click', toggleMenu);
articleSearch.addEventListener('input', updateSearch);
searchClear.addEventListener('click', clearSearch);
postCountRange.addEventListener('input', () => setPostCount(Number(postCountRange.value)));
messageForm.addEventListener('submit', submitMessage);
messageContent.addEventListener('input', updateMessageCount);
refreshMessagesButton.addEventListener('click', loadMessages);
guestbookResizer.addEventListener('pointerdown', startGuestbookResize);
guestbookResizer.addEventListener('pointermove', updateGuestbookSplitFromPointer);
guestbookResizer.addEventListener('pointerup', finishGuestbookResize);
guestbookResizer.addEventListener('pointercancel', finishGuestbookResize);
guestbookResizer.addEventListener('keydown', adjustGuestbookSplitWithKeyboard);
guestbookResizer.addEventListener('dblclick', () => applyGuestbookSplit(58, true));
navLinks.querySelectorAll('a').forEach((link) => link.addEventListener('click', closeMenu));
window.addEventListener('scroll', updateScrollState, { passive: true });
window.addEventListener('resize', () => {
    if (window.innerWidth > 760) closeMenu();
    applyGuestbookSplit(guestbookSplit);
});

setCurrentYear();
initTypingEffect();
renderPosts();
redirectLegacyArticleUrl();
updateMessageCount();
loadMessages();
applyGuestbookSplit(guestbookSplit);
updateScrollState();
refreshIcons();
