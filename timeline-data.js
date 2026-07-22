const timelineEvents = [
    {
        id: 'timeline-launch',
        date: '2026-07-22',
        category: 'milestone',
        title: '开始记录小站之外的日常',
        summary: '时间轴加入小站。往后的版本变化、写作片段和生活小事，都可以在这里留下日期。',
        details: ['新增独立的站点纪事页面', '首页展示最近三条足迹'],
        featured: true,
    },
    {
        id: 'site-v3-release',
        date: '2026-07-21',
        category: 'site',
        version: 'v3.0',
        title: '秋枫清澄小站 3.0 上线',
        summary: '主页、独立文章页、搜索标签、主题系统与留言板完成一次完整重构。',
        link: {
            label: '阅读重构记录',
            href: 'article.html?id=site-second-growth',
        },
        featured: true,
    },
    {
        id: 'site-v2-release',
        date: '2026-06-13',
        category: 'site',
        version: 'v2.0',
        title: '小站 2.0 完成页面重构',
        summary: '重新整理首页结构、视觉语言和响应式体验，让内容真正成为页面的中心。',
        link: {
            label: '阅读当时的记录',
            href: 'article.html?id=site-v2-refactor',
        },
    },
    {
        id: 'guestbook-launch',
        date: '2026-05-29',
        category: 'site',
        title: '留言板正式上线',
        summary: '使用 Cloudflare Worker 与 KV，为静态小站接上第一项可以与访客交流的动态功能。',
        link: {
            label: '查看开发日志',
            href: 'article.html?id=blog-guestbook-launch',
        },
    },
    {
        id: 'first-note',
        date: '2026-05-20',
        category: 'milestone',
        title: '第一篇记录，也是小站的起点',
        summary: '从一页简单的自我介绍开始，把学习、折腾与偶尔浮现的想法慢慢留在自己的角落。',
        link: {
            label: '回到第一篇',
            href: 'article.html?id=hello-world',
        },
        featured: true,
    },
];

window.timelineEvents = timelineEvents;
