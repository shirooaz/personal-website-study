/*!
 * 阅读页脚本：按 ?id= 渲染文章、元数据、相邻文章
 * 公共部分见 site-ui.js
 */
(function () {
    'use strict';

    const UI = window.QiufengUI;
    if (!UI) {
        console.error('[article.js] 未找到 site-ui.js，文章未渲染。');
        return;
    }

    const { formatDate, getArticleUrl, normalizePosts, refreshIcons, initSiteChrome } = UI;

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

    initSiteChrome();

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

        const canonicalLink = document.getElementById('canonicalUrl');
        if (canonicalLink) canonicalLink.href = canonical;

        setMetaContent('metaDescription', post.excerpt);
        setMetaContent('ogTitle', pageTitle);
        setMetaContent('ogDescription', post.excerpt);
        setMetaContent('ogUrl', canonical);
        setMetaContent('articlePublishedTime', post.date);
        setMetaContent('twitterTitle', pageTitle);
        setMetaContent('twitterDescription', post.excerpt);

        const structuredData = document.getElementById('articleStructuredData');
        if (structuredData) {
            // 用 textContent 写入，不会被当作 HTML 解析
            structuredData.textContent = JSON.stringify({
                '@context': 'https://schema.org',
                '@type': 'BlogPosting',
                headline: post.title,
                description: post.excerpt,
                datePublished: post.date,
                inLanguage: 'zh-CN',
                author: { '@type': 'Person', name: '秋枫清澄' },
                mainEntityOfPage: canonical,
                image: 'https://153904.xyz/assets/avatar.jpg',
            });
        }
    }

    function renderNotFound() {
        articleLoading.hidden = true;
        articleNotFound.hidden = false;
        document.title = '文章未找到 · 秋枫清澄';
        const robotsMeta = document.getElementById('robotsMeta');
        if (robotsMeta) robotsMeta.content = 'noindex, follow';
    }

    function renderArticle() {
        const params = new URL(window.location.href).searchParams;
        const postId = params.get('id') || params.get('article');
        const posts = normalizePosts(typeof blogPosts !== 'undefined' ? blogPosts : window.blogPosts);
        const currentIndex = posts.findIndex((post) => post.id === postId);

        if (currentIndex < 0) {
            renderNotFound();
            return;
        }

        const post = posts[currentIndex];
        articleIndex.textContent = String(currentIndex + 1).padStart(2, '0');
        articleDate.dateTime = post.date;
        articleDate.textContent = formatDate(post.date);
        articleTags.replaceChildren(...post.tags.map((tag) => {
            const tagElement = document.createElement('span');
            tagElement.textContent = tag;
            return tagElement;
        }));
        articleTitle.textContent = post.title;
        articleExcerpt.textContent = post.excerpt;
        // 正文来自本地 blog-data.js，属于站点自有内容
        articleContent.innerHTML = post.content;
        renderNeighbor(articleNewer, articleNewerTitle, posts[currentIndex - 1]);
        renderNeighbor(articleOlder, articleOlderTitle, posts[currentIndex + 1]);
        updateArticleMetadata(post);

        articleLoading.hidden = true;
        articlePage.hidden = false;
    }

    renderArticle();
    refreshIcons();
}());
