/*!
 * 首页脚本：文章列表（搜索 / 标签 / 篇数）、最近足迹、留言板交互
 * 公共部分（存储兜底、数据校验、页眉与滚动、逐个显示动画）见 site-ui.js
 */
(function () {
    'use strict';

    const UI = window.QiufengUI;
    if (!UI) {
        document.querySelectorAll('.reveal').forEach((element) => element.classList.add('is-visible'));
        console.error('[script.js] 未找到 site-ui.js，页面内容未渲染。');
        return;
    }

    const {
        storage, getJSON, escapeHtml, formatDate, getArticleUrl, refreshIcons,
        normalizePosts, normalizeEvents, initReveal, revealAll, initSiteChrome,
    } = UI;

    const heroLatest = document.getElementById('heroLatest');
    const heroLatestTitle = document.getElementById('heroLatestTitle');
    const heroLatestDate = document.getElementById('heroLatestDate');
    const journalYear = document.getElementById('journalYear');
    const postList = document.getElementById('postList');
    const tagFilters = document.getElementById('tagFilters');
    const articleSearch = document.getElementById('articleSearch');
    const searchClear = document.getElementById('searchClear');
    const postCountRange = document.getElementById('postCountRange');
    const postCountOutput = document.getElementById('postCountOutput');
    const postTotal = document.getElementById('postTotal');
    const postListStatus = document.getElementById('postListStatus');
    const timelinePreviewList = document.getElementById('timelinePreviewList');
    const timelinePreviewTotal = document.getElementById('timelinePreviewTotal');
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

    const MESSAGE_API = 'https://api.153904.xyz/api/messages';
    const MESSAGE_TIMEOUT_MS = 8000;
    const PENDING_MESSAGES_KEY = 'qiufeng-pending-messages';
    const LEGACY_MESSAGES_KEY = 'blogMessages';
    const GUESTBOOK_SPLIT_KEY = 'qiufeng-guestbook-split';
    const POST_COUNT_KEY = 'qiufeng-post-count';
    const ACTIVE_TAG_KEY = 'qiufeng-active-tag';
    const SEARCH_DEBOUNCE_MS = 140;
    const ALL_TAG = '全部';

    const savedPostCount = Number(storage.get(POST_COUNT_KEY));
    let visiblePostCount = Number.isInteger(savedPostCount) && savedPostCount > 0 ? savedPostCount : 3;
    let activeTag = storage.get(ACTIVE_TAG_KEY) || ALL_TAG;
    let searchQuery = '';
    let sortedPosts = [];
    const searchIndex = new Map();
    let hasRenderedPosts = false;
    let searchTimer = 0;
    let flushingPending = false;

    const savedGuestbookSplit = Number(storage.get(GUESTBOOK_SPLIT_KEY));
    let guestbookSplit = Number.isFinite(savedGuestbookSplit) ? savedGuestbookSplit : 58;
    let activeResizePointer = null;

    const chrome = initSiteChrome({
        onResize() {
            applyGuestbookSplit(guestbookSplit);
        },
    });

    /* ---------------- 打字机 ---------------- */

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

        if (UI.reducedMotion.matches) {
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

    /* ---------------- 文章搜索索引 ---------------- */

    function htmlToText(html) {
        if (!html) return '';
        const parsed = new DOMParser().parseFromString(html, 'text/html');
        return parsed.body.textContent || '';
    }

    // 搜索文本只在启动时算一次；旧实现是每敲一个键就把每篇正文重新交给 DOMParser
    function buildSearchIndex(posts) {
        searchIndex.clear();
        posts.forEach((post) => {
            const text = [post.title, post.excerpt, ...post.tags, htmlToText(post.content)]
                .filter(Boolean)
                .join(' ')
                .toLocaleLowerCase('zh-CN');
            searchIndex.set(post.id, text);
        });
    }

    function getPostSearchText(post) {
        return searchIndex.get(post.id) || String(post.title || '').toLocaleLowerCase('zh-CN');
    }

    /* ---------------- 最近足迹 ---------------- */

    function renderTimelinePreview() {
        if (!timelinePreviewList) return;
        const events = normalizeEvents(window.timelineEvents);

        timelinePreviewList.replaceChildren();
        if (events.length === 0) {
            const empty = document.createElement('p');
            empty.className = 'timeline-preview-empty';
            empty.textContent = '新的记录会从这里开始。';
            timelinePreviewList.appendChild(empty);
            return;
        }

        const categoryLabels = { site: '小站', daily: '日常', writing: '写作', milestone: '里程碑' };

        events.slice(0, 3).forEach((event, index) => {
            const row = document.createElement('a');
            row.className = 'timeline-preview-row reveal';
            row.href = `timeline.html#${encodeURIComponent(event.id)}`;

            const date = document.createElement('time');
            date.dateTime = event.date;
            date.textContent = formatDate(event.date);

            const copy = document.createElement('span');
            copy.className = 'timeline-preview-copy';
            const meta = document.createElement('span');
            meta.className = 'timeline-preview-meta';
            meta.textContent = [categoryLabels[event.category] || '记录', event.version].filter(Boolean).join(' / ');
            const title = document.createElement('strong');
            title.textContent = event.title;
            copy.append(meta, title);

            const number = document.createElement('span');
            number.className = 'timeline-preview-number';
            number.textContent = String(index + 1).padStart(2, '0');
            number.setAttribute('aria-hidden', 'true');

            row.append(date, copy, number);
            timelinePreviewList.appendChild(row);
        });

        if (timelinePreviewTotal) timelinePreviewTotal.textContent = `共 ${events.length} 条公开足迹`;
        refreshIcons(timelinePreviewList);
        initReveal();
    }

    /* ---------------- 文章列表 ---------------- */

    function renderHeroLatest(posts) {
        if (!heroLatest) return;
        const latestPost = posts[0];
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

    function renderTagFilters(tags) {
        tagFilters.innerHTML = [ALL_TAG, ...tags].map((tag) => `
            <button class="tag-filter" type="button" data-tag="${escapeHtml(tag)}" aria-pressed="${String(tag === activeTag)}">${escapeHtml(tag)}</button>
        `).join('');

        tagFilters.querySelectorAll('.tag-filter').forEach((button) => {
            button.addEventListener('click', () => setActiveTag(button.dataset.tag));
        });
    }

    function renderPosts() {
        const availableTags = [...new Set(sortedPosts.flatMap((post) => post.tags))];
        if (activeTag !== ALL_TAG && !availableTags.includes(activeTag)) activeTag = ALL_TAG;
        renderTagFilters(availableTags);

        const taggedPosts = activeTag === ALL_TAG
            ? sortedPosts
            : sortedPosts.filter((post) => post.tags.includes(activeTag));
        const normalizedQuery = searchQuery.trim().toLocaleLowerCase('zh-CN');
        const posts = normalizedQuery
            ? taggedPosts.filter((post) => getPostSearchText(post).includes(normalizedQuery))
            : taggedPosts;

        const totalPosts = posts.length;
        const displayCount = totalPosts > 0 ? Math.min(Math.max(1, visiblePostCount), totalPosts) : 0;

        postList.innerHTML = totalPosts > 0 ? posts.slice(0, displayCount).map((post, index) => `
            <a class="post-row reveal" href="${escapeHtml(getArticleUrl(post.id))}" aria-label="阅读《${escapeHtml(post.title)}》">
                <span class="post-meta">
                    <span class="post-index">${String(index + 1).padStart(2, '0')}</span>
                    <time datetime="${escapeHtml(post.date)}">${escapeHtml(formatDate(post.date))}</time>
                </span>
                <span class="post-copy">
                    <h3>${escapeHtml(post.title)}</h3>
                    <p>${escapeHtml(post.excerpt)}</p>
                    <span class="post-tags">${post.tags.map((tag) => `<span>${escapeHtml(tag)}</span>`).join('')}</span>
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

        const isFiltered = activeTag !== ALL_TAG || Boolean(normalizedQuery);
        postTotal.textContent = isFiltered
            ? `找到 ${totalPosts} 篇（全部 ${sortedPosts.length} 篇）`
            : `共 ${sortedPosts.length} 篇公开记录`;
        searchClear.hidden = !normalizedQuery;

        // 列表本身不再挂 aria-live：每次搜索都整块重建会读屏刷屏，
        // 改为由这个独立状态行播报结果数量
        if (postListStatus) {
            postListStatus.textContent = isFiltered
                ? `筛选后共 ${totalPosts} 篇文章。`
                : `共 ${sortedPosts.length} 篇文章。`;
        }

        // 首次渲染交给 IntersectionObserver 做入场动画；搜索/筛选导致的重新渲染直接显示，
        // 否则每敲一个字整张列表都会重新淡入一次
        if (hasRenderedPosts) revealAll(postList);
        else hasRenderedPosts = true;

        refreshIcons(postList);
        initReveal();
        chrome.measure();
        chrome.requestScrollState();
    }

    function flushSearchTimer() {
        if (!searchTimer) return;
        window.clearTimeout(searchTimer);
        searchTimer = 0;
    }

    function setActiveTag(tag) {
        if (tag === activeTag) return;
        activeTag = tag;
        storage.set(ACTIVE_TAG_KEY, tag);
        flushSearchTimer();
        renderPosts();
        // 标签按钮在重绘时被整体替换，把焦点交还给同名按钮，键盘操作不会掉回 body
        const nextButton = tagFilters.querySelector(`.tag-filter[data-tag="${CSS.escape(tag)}"]`);
        nextButton?.focus({ preventScroll: true });
    }

    function resetArticleFilters() {
        activeTag = ALL_TAG;
        searchQuery = '';
        articleSearch.value = '';
        storage.set(ACTIVE_TAG_KEY, activeTag);
        flushSearchTimer();
        renderPosts();
        articleSearch.focus();
    }

    function clearSearch() {
        searchQuery = '';
        articleSearch.value = '';
        flushSearchTimer();
        renderPosts();
        articleSearch.focus();
    }

    // 输入时只更新状态，渲染合并到防抖窗口之后
    function updateSearch() {
        searchQuery = articleSearch.value;
        searchClear.hidden = !searchQuery.trim();
        window.clearTimeout(searchTimer);
        searchTimer = window.setTimeout(() => {
            searchTimer = 0;
            renderPosts();
        }, SEARCH_DEBOUNCE_MS);
    }

    function setPostCount(count) {
        if (!Number.isInteger(count) || count === visiblePostCount) return;
        visiblePostCount = count;
        storage.set(POST_COUNT_KEY, String(count));
        flushSearchTimer();
        renderPosts();
    }

    function redirectLegacyArticleUrl() {
        const postId = new URL(window.location.href).searchParams.get('article');
        if (!postId) return;
        if (sortedPosts.some((post) => post.id === postId)) {
            window.location.replace(getArticleUrl(postId));
        }
    }

    /* ---------------- 留言板 ---------------- */

    function readStoredMessages(key) {
        const messages = getJSON(key, []);
        return Array.isArray(messages) ? messages : [];
    }

    function writePendingMessages(messages) {
        storage.set(PENDING_MESSAGES_KEY, JSON.stringify(messages.slice(-50)));
    }

    function savePendingMessage(message) {
        const pendingMessages = readStoredMessages(PENDING_MESSAGES_KEY);
        pendingMessages.push(message);
        writePendingMessages(pendingMessages);
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

        return new Intl.DateTimeFormat('zh-CN', { year: 'numeric', month: '2-digit', day: '2-digit' }).format(date);
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

    // 本机暂存的留言在恢复网络后自动补发，成功一条就从暂存里移除一条
    async function flushPendingMessages() {
        if (flushingPending || !navigator.onLine) return;
        const pending = readStoredMessages(PENDING_MESSAGES_KEY);
        if (pending.length === 0) return;

        flushingPending = true;
        const remaining = [...pending];

        try {
            for (const message of pending) {
                let response;
                try {
                    response = await fetchWithTimeout(MESSAGE_API, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            name: String(message.name || '匿名用户'),
                            body: getMessageBody(message),
                        }),
                    });
                } catch {
                    break; // 网络仍然不通，留到下次
                }

                // 任何失败都停止本轮补发：4xx 重试无意义，5xx 服务端可能已经写入
                if (!response.ok) break;

                remaining.shift();
                writePendingMessages(remaining);
            }
        } finally {
            flushingPending = false;
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
            const notice = pendingMessages.length > 0 ? '部分留言仅保存在本机，联网后会自动重发。' : '';
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
                // 4xx：内容/频率问题，直接反馈；5xx：服务端故障，内容留在输入框里
                requestError.isRequestError = response.status < 500;
                requestError.status = response.status;
                throw requestError;
            }

            messageContent.value = '';
            updateMessageCount();
            setMessageFormStatus('留言已发送。', 'success');
            await loadMessages();
        } catch (error) {
            if (error.isRequestError) {
                setMessageFormStatus(error.message, 'error');
            } else if (error.status >= 500) {
                // 不写入本机暂存：服务端可能已经保存成功，避免用户重发造成重复
                setMessageFormStatus('服务器暂时出错，内容已保留，请稍后重试。', 'error');
            } else if (error.name === 'AbortError') {
                // 超时同样无法确定服务端是否已写入，保留内容让用户自己决定是否重发
                setMessageFormStatus('请求超时，内容已保留，请稍后重试。', 'error');
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
                setMessageFormStatus('网络暂不可用，留言已保存在本机，联网后会自动重发。', 'offline');
                await loadMessages();
            }
        } finally {
            submitMessageButton.disabled = false;
            submitMessageButton.classList.remove('is-loading');
            submitMessageButton.removeAttribute('aria-busy');
            submitMessageLabel.textContent = '发送留言';
            refreshIcons(submitMessageButton);
        }
    }

    /* ---------------- 留言板宽度调整 ---------------- */

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

        if (persist) storage.set(GUESTBOOK_SPLIT_KEY, String(guestbookSplit));
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
        storage.set(GUESTBOOK_SPLIT_KEY, String(guestbookSplit));
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

    /* ---------------- 初始化 ---------------- */

    journalYear.textContent = String(new Date().getFullYear());

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
    window.addEventListener('online', () => {
        if (readStoredMessages(PENDING_MESSAGES_KEY).length === 0) return;
        flushPendingMessages().then(loadMessages);
    });

    initTypingEffect();
    renderTimelinePreview();

    const rawPosts = typeof blogPosts !== 'undefined' ? blogPosts : window.blogPosts;
    if (Array.isArray(rawPosts)) {
        sortedPosts = normalizePosts(rawPosts);
        buildSearchIndex(sortedPosts);
        renderHeroLatest(sortedPosts);
        renderPosts();
    } else {
        postList.innerHTML = '<p>文章数据暂时无法读取。</p>';
        postTotal.textContent = '文章数据缺失';
        console.error('[script.js] 未能读取 blog-data.js 的 blogPosts。');
    }

    redirectLegacyArticleUrl();
    updateMessageCount();
    applyGuestbookSplit(guestbookSplit);
    refreshIcons();
    chrome.measure();
    chrome.requestScrollState();

    flushPendingMessages()
        .then(loadMessages)
        .catch(() => loadMessages());
}());
