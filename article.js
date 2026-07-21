const header = document.querySelector('.site-header');
const progress = document.getElementById('scrollProgress');
const backToTopButton = document.getElementById('backToTop');
const footerBackToTopButton = document.getElementById('footerBackToTop');
const menuToggle = document.getElementById('menuToggle');
const navLinks = document.getElementById('navLinks');
const footerYear = document.getElementById('footerYear');
const articleLoading = document.getElementById('articleLoading');
const articlePage = document.getElementById('articlePage');
const articleNotFound = document.getElementById('articleNotFound');
const articleIndex = document.getElementById('articleIndex');
const articleDate = document.getElementById('articleDate');
const articleTags = document.getElementById('articleTags');
const articleTitle = document.getElementById('articleTitle');
const articleExcerpt = document.getElementById('articleExcerpt');
const articleContent = document.getElementById('articleContent');
const articleNewer = document.getElementById('articleNewer');
const articleNewerTitle = document.getElementById('articleNewerTitle');
const articleOlder = document.getElementById('articleOlder');
const articleOlderTitle = document.getElementById('articleOlderTitle');
const { reducedMotionPreference, refreshIcons } = window.QiufengTheme;

function getArticleUrl(postId) {
    return `article.html?id=${encodeURIComponent(postId)}`;
}

function formatDate(dateString) {
    return dateString.replaceAll('-', '.');
}

function setMetaContent(id, value) {
    const element = document.getElementById(id);
    if (element) element.content = value;
}

function renderNeighbor(element, titleElement, post) {
    if (!post) {
        element.hidden = true;
        return;
    }

    element.hidden = false;
    element.href = getArticleUrl(post.id);
    titleElement.textContent = post.title;
}

function updateArticleMetadata(post) {
    const pageTitle = `${post.title} · 秋枫清澄`;
    const canonical = `https://153904.xyz/article.html?id=${encodeURIComponent(post.id)}`;
    document.title = pageTitle;
    document.getElementById('canonicalUrl').href = canonical;
    setMetaContent('metaDescription', post.excerpt);
    setMetaContent('ogTitle', pageTitle);
    setMetaContent('ogDescription', post.excerpt);
    setMetaContent('ogUrl', canonical);
    setMetaContent('articlePublishedTime', post.date);
    setMetaContent('twitterTitle', pageTitle);
    setMetaContent('twitterDescription', post.excerpt);
    document.getElementById('articleStructuredData').textContent = JSON.stringify({
        '@context': 'https://schema.org',
        '@type': 'BlogPosting',
        headline: post.title,
        description: post.excerpt,
        datePublished: post.date,
        author: { '@type': 'Person', name: '秋枫清澄' },
        mainEntityOfPage: canonical,
        image: 'https://153904.xyz/assets/avatar.jpg',
    });
}

function renderArticle() {
    const posts = typeof blogPosts !== 'undefined' ? [...blogPosts] : [];
    const postId = new URL(window.location.href).searchParams.get('id')
        || new URL(window.location.href).searchParams.get('article');
    const sortedPosts = posts.sort((left, right) => right.date.localeCompare(left.date));
    const currentIndex = sortedPosts.findIndex((post) => post.id === postId);

    articleLoading.hidden = true;
    if (currentIndex < 0) {
        articleNotFound.hidden = false;
        document.title = '文章未找到 · 秋枫清澄';
        document.getElementById('robotsMeta').content = 'noindex, follow';
        return;
    }

    const post = sortedPosts[currentIndex];
    articleIndex.textContent = String(currentIndex + 1).padStart(2, '0');
    articleDate.dateTime = post.date;
    articleDate.textContent = formatDate(post.date);
    articleTags.replaceChildren(...(post.tags || []).map((tag) => {
        const tagElement = document.createElement('span');
        tagElement.textContent = tag;
        return tagElement;
    }));
    articleTitle.textContent = post.title;
    articleExcerpt.textContent = post.excerpt;
    articleContent.innerHTML = post.content;
    renderNeighbor(articleNewer, articleNewerTitle, sortedPosts[currentIndex - 1]);
    renderNeighbor(articleOlder, articleOlderTitle, sortedPosts[currentIndex + 1]);
    updateArticleMetadata(post);
    articlePage.hidden = false;
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
    progress.style.width = `${scrollable > 0 ? (scrollTop / scrollable) * 100 : 0}%`;
    header.classList.toggle('is-scrolled', scrollTop > 16);
    backToTopButton.disabled = scrollTop < 200;
}

function scrollToTop() {
    window.scrollTo({ top: 0, behavior: reducedMotionPreference.matches ? 'auto' : 'smooth' });
}

backToTopButton.addEventListener('click', scrollToTop);
footerBackToTopButton.addEventListener('click', scrollToTop);
menuToggle.addEventListener('click', toggleMenu);
navLinks.querySelectorAll('a').forEach((link) => link.addEventListener('click', closeMenu));
window.addEventListener('scroll', updateScrollState, { passive: true });
window.addEventListener('resize', () => {
    if (window.innerWidth > 760) closeMenu();
});

footerYear.textContent = String(new Date().getFullYear());
renderArticle();
updateScrollState();
refreshIcons();
