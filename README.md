# 秋枫清澄个人主页

> 本文件记录一次代码审查后的改动。对照版本为提交 `5abdaef`，下面「本次改动」逐条列出差异、原因与验证方式。

这是一个无需构建工具即可部署到 Cloudflare Pages 的静态个人站点。主页提供个人介绍、文章搜索、标签筛选、时间轴预览、显示篇数控制和留言板；`article.html` 负责独立文章阅读，`timeline.html` 用于记录网站节点与生活片段。

## 本次改进

### 1. 健壮性与渐进增强（对应审查中的严重项）

| 问题 | 处理方式 |
| --- | --- |
| `localStorage` 被禁用/抛错时，`theme-controls.js` 与 `script.js` 会在顶层中断，整页内容消失 | 新增 `site-ui.js` 的 `storage` 兜底：先探测可用性，失败则退化为内存存储，所有读写都包在 `try/catch` 里 |
| `script.js` 直接解构 `window.QiufengTheme`，模块缺失即整脚本失效 | `window.QiufengTheme` 现在**始终存在**（`theme-data.js` 缺失时也会导出降级对象）；三个页面脚本都先判断 `window.QiufengUI` 是否存在，缺失时至少把静态内容显示出来并打印明确错误 |
| `.reveal { opacity: 0 }` 写在静态 HTML 上，JS 不执行就永久空白 | 各页 `<head>` 的内联脚本同步给 `<html>` 加 `js` 类；CSS 增加 `html:not(.js) .reveal { opacity: 1; transform: none }`。三个页面同时补上 `<noscript>` 提示 |
| 文章/时间轴数据没有校验，一条脏数据会让整个列表抛错 | `site-ui.js` 的 `normalizePosts` / `normalizeEvents` 统一过滤、补默认值、按日期排序；缺字段的条目会被跳过（并在控制台给出一次汇总提示） |
| 留言 5xx 与"断网"被当成同一类错误 | 现在 4xx 直接提示服务端消息；5xx 提示"内容已保留"且**不清空输入框**（避免服务端其实已写入而用户重发造成重复）；真正的网络错误才写入本机暂存 |

### 2. 首屏与主题

- **消除主题闪烁（FOUC）**：三个页面在 `<head>` 中先加载 `theme-data.js`，再用一段同步内联脚本，在首次绘制前套用已保存的明暗模式与强调色（同时更新 `theme-color`）。期间给 `<html>` 加 `no-transition`，首帧不参与 280ms 的颜色过渡，之后自动移除。浅色主题用户不再看到"先暗后亮"的动画。
- **字体不再阻塞首屏**：Google Fonts 样式表改为 `rel="preload"` + `media="print" onload="this.media='all'"` 的异步加载模式，并保留 `<noscript>` 回退。

### 3. 性能

- **搜索**：搜索文本在启动时用一次 `DOMParser` 全量建索引（`Map<id, text>`），输入时只做字符串匹配；输入加 140ms 防抖。原实现是**每敲一个键**都把每篇正文重新解析一次。
- **列表重绘**：搜索/筛选导致的重绘不再让整张列表重新播放 700ms 淡入（首次渲染仍保留入场动画）。
- **IntersectionObserver**：三个页面共用一个观察者（`site-ui.js` 的 `initReveal`），不再每次渲染都 `new` 一个且从不 `disconnect`（原实现会随输入/筛选累积失效观察者）。
- **滚动**：滚动事件只登记一帧，读写集中在 `requestAnimationFrame` 里；可滚动高度只在初始化、`resize`、`load`、页面重新可见时测量，不再每个滚动事件都读 `document.documentElement.scrollHeight` 强制回流。进度条改用 `transform: scaleX()`。
- **时间轴**：轴线相关的 `getBoundingClientRect()` 结果在渲染后/尺寸变化后**一次性测量并缓存**（文档坐标），滚动帧只做数值比较；`is-current` 只在真正换节点时改 DOM。`timeline.css` 里与脚本逐帧写高度冲突的 `transition: height` 已移除。
- **鼠标光晕**：`.post-row` 的矩形只在换行时测量一次，滚动/尺寸变化时失效重测，不再每次 `pointermove` 都 `getBoundingClientRect()`。
- **圆点混色**：复用常驻探针元素，且计算值未变化时跳过；页面隐藏时停掉圆环的逐帧循环。

### 4. 无障碍与可读性

- **焦点可见**：删除了 `.search-field input` 与 `.message-field input/textarea` 上的 `outline: 0`，恢复全局 `:focus-visible` 焦点环（实测聚焦后为 `solid 2px` 强调色）。
- **移动端隐藏导航**：收起状态从 `opacity: 0; pointer-events: none` 改为同时 `visibility: hidden`，键盘 Tab 不会再进入一排看不见的链接；菜单打开后焦点会移到第一个链接，并支持 Esc 关闭（`site-ui.js` 统一处理）。
- **搜索框**：可见的"搜索"文字与输入框通过 `aria-label` 关联；`.post-list` 上的 `aria-live` 移除，改为新增的 `#postListStatus` 状态行播报结果数量，避免每次输入都朗读整张列表。
- **对比度**（按 WCAG 公式核算）：
  - 新增 `--on-accent` / `--on-accent-line` 令牌，`--on-accent` 在暗色主题为 `#1a1918`、浅色主题为 `#fdfaf6`，替换掉 `.contact-section`、`.button-primary`、`::selection`、悬停箭头等处的硬编码深色。原 `.contact-section` 用 `#24211f` 压在浅色主题的 `#a95042` 上只有约 3.0:1，`.contact-layout .eyebrow` 的 `#4f342e` 只有约 2.1:1，现在均在 5:1 以上。
  - 浅色主题的 `--text-muted` 由 `#7d7973`（约 3.8:1）改为 `#65615c`（在 `--bg-deep` 上约 4.8:1）；`--quiet-accent` 由 `#66777c` 改为 `#5a6a6f`。
- **层叠与覆盖修复**：`.post-row` 显式加 `isolation: isolate`，让 `::before` 的 `z-index: -1` 不再依赖 `.reveal` 的 `transform` 建立层叠上下文；`.timeline-preview-row:hover` 提高选择器权重，恢复被 `.reveal.is-visible` 按源序覆盖掉的悬停横移。
- **样式污染修复**：全局 `blockquote` / `blockquote p` 限定为 `.about-copy blockquote`，文章正文的引用块不再同时套上首页的上边框与 21px 字号。

### 5. 响应式

- **761–843px 视口下"关于"区溢出被静默裁切**：`.about-layout` 两列最小值合计 840px（320 + 420 + gap），而 `.section-shell` 在该区间只有 713–795px，`body` 的 `overflow-x: clip` 会把右列直接裁掉。新增 `@media (max-width: 880px)` 改为单列。实测 768px 视口：原版 `grid-template-columns` 被压成 `320px 420px`、文档横向溢出为 true；现在为单列且无溢出。
- `.hero`、`article.css`、`timeline.css` 的 `vh` 补上 `svh` 回退，移动端不被地址栏顶掉。
- 时间轴的锚点偏移由硬编码 `104px` 改为 `calc(var(--header-height) + 32px)`，与 `timeline.js` 中的 `headerOffset()` 使用同一个变量。

### 6. 后端（`workers/guestbook/`）

- **修复越权删除**：`DELETE /api/messages/:id` 原先**没有任何鉴权**，而 `GET /api/messages` 会把每条留言的 `id` 返回给所有访客——任何访客都能清空留言板。现在需要 `Authorization: Bearer $ADMIN_TOKEN`。
- `fetch` 外层补 `try/catch`：任何未捕获异常都返回带 CORS 头的 JSON 500，前端可以区分"服务端出错"和"断网"（原先返回 Cloudflare 错误页，不带 CORS 头）。
- 留言昵称留空按"匿名用户"处理（与前端 `可不填` 的文案一致），不再直接 400。
- **移除文章接口（`/api/articles*`）与 `schema.sql`**：这套 D1 接口前端从未调用，账号里也没有对应的数据库（`wrangler d1 list` 为空，线上一直是 404），占位符 `database_id` 还会让 `wrangler deploy` 直接失败（错误码 10021）。文章数据统一由 `blog-data.js` 维护，Worker 现在只服务留言板。
- 已知限制（未改，已在代码注释中说明）：留言用 KV 单键"读-改-写"，并发提交可能丢一条，量大时应改为一留言一键或迁 D1；内存限流是近似值。

### 7. 资源体积

- **图标**：`assets/lucide.min.js`（lucide v0.468.0 全量包，**358 KB**）替换为 `assets/icons.js`（**6.2 KB**，只含本站实际使用的 18 个图标，数据从全量包中提取生成）。三页脚本引用同步更新。
- **头像**：新增 `assets/avatar.webp`（**46 KB**，原 JPEG 280 KB），首页用 `<picture>` + `srcset` 优先加载 WebP，JPEG 作为回退；`<img>` 补 `width/height`、`decoding="async"`、`fetchpriority="high"`。
- **站点图标**：原先直接把 280 KB 的 `avatar.jpg` 当 favicon。改为 `assets/favicon.svg`（手写矢量）、`assets/favicon-32.png`（3 KB）、`assets/apple-touch-icon.png`（180×180）。

### 8. 代码结构

- 新增 **`site-ui.js`**：存储兜底、HTML 转义、日期与链接工具、数据校验、逐个显示动画、页眉/滚动/返回顶部/移动导航。三个页面脚本不再各自复制一份 `toggleMenu` / `closeMenu` / `updateScrollState` / `scrollToTop` / `formatDate` / `getArticleUrl`，也消除了"三个文件顶层声明同名 `const`、同页引入即报错"的隐患。
- `script.js` / `article.js` / `timeline.js` 改为 IIFE，页面私有逻辑保留，公共部分走 `window.QiufengUI`。
- 文章列表渲染中的标题、摘要、标签、日期、链接统一经 `escapeHtml()` 处理，数据里出现引号或尖括号也不会破坏标记结构。
- 留言在恢复网络后会自动补发（`online` 事件 + 启动时各尝试一次），发成功一条就从本机暂存里移除一条；在此之前暂存的留言只在本地可见。

### 未做 / 需要你决定的事

1. **文章正文与分享元数据仍然是运行时生成**：微信、Discord、Telegram 等不执行 JS 的抓取器拿不到文章标题与摘要，百度也很难收录 6 篇文章。彻底解决需要在发布前把文章预渲染成静态页面（一次性的发布脚本即可），这属于流程改动，本次未动。
2. **主题数据双份**：`style.css` 的 `:root` 里仍保留一份强调色默认值，而真正的来源是 `theme-data.js`（脚本会以内联样式写到 `<html>`，优先级更高）。改主题色请只改 `theme-data.js`。
3. **游戏页 `game-f8fq.html`**：已修渲染器创建失败的白屏、`resize` 打断对局、Alt-Tab 不暂停、`prefers-reduced-motion` 只读一次、以及没有返回站点入口这几项；引擎内每个子步的 `getSnapshot()` 深拷贝等性能项未动（改动面大、收益中等）。
4. **`tools/gen-icons.js`**：图标子集的生成脚本。重新生成需要把 lucide 全量包放回 `assets/lucide.min.js`（`npm i lucide@0.468.0` 或从原仓库取），再执行 `node tools/gen-icons.js .`；日常加图标也可以直接在 `assets/icons.js` 的 `ICONS` 里补一行。

## 核心原则

- `blog-data.js` 是唯一的文章数据源，首页和阅读页不重复维护文章。
- 页面结构、基础样式和阅读页逻辑分开，避免把大量 CSS、数据和脚本内嵌到 HTML。
- 主题、动效和布局偏好保存在浏览器中，同时尊重系统的"减少动态效果"设置。
- 保持无构建部署；只有实际内容规模和维护成本需要时，再引入构建工具或框架。

## 添加文章

在 `blog-data.js` 的 `blogPosts` 数组中加入一个对象：

```js
{
  id: 'stable-article-id',
  tags: ['建站', '前端'],
  date: '2026-07-20',
  title: '文章标题',
  excerpt: '显示在主页列表和分享摘要中的简短介绍。',
  content: `
    <p>正文第一段。</p>
    <h3>小标题</h3>
    <p>后续正文。</p>
  `.trim(),
},
```

- `id` 是文章固定链接的一部分，发布后不要修改；建议只使用小写英文字母、数字和连字符。
- `date` 使用 `YYYY-MM-DD`；格式不对的条目会被 `normalizePosts` 跳过（并在控制台提示），列表靠日期排序。
- `tags` 是字符串数组。系统会自动汇总、去重并生成首页标签，不需要单独维护标签表。
- `excerpt` 同时用于首页摘要、搜索和分享元数据。
- `content` 支持常见 HTML。小标题建议从 `<h2>` 或 `<h3>` 开始，与文章 `<h1>` 保持层级连续。

文章地址为：

```text
https://153904.xyz/article.html?id=stable-article-id
```

新增文章不需要修改 `index.html`、`article.html`、`script.js` 或 `article.js`。

## 文件结构

```text
index.html        主页结构（含首屏主题引导内联脚本）
article.html      独立文章阅读模板
timeline.html     站点与生活时间轴页面
blog-data.js      唯一的文章数据源
timeline-data.js  时间轴唯一数据源
theme-data.js     主题色与下落动效注册表（在 <head> 中同步加载）
site-ui.js        三个页面共用的工具与页眉交互
theme-controls.js 共享主题面板与偏好控制
script.js         主页渲染与交互
article.js        阅读页渲染与交互
timeline.js       时间轴筛选、分组与交互
style.css         全站基础样式与主题变量
article.css       阅读页专用样式
timeline.css      时间轴页面专用样式
assets/icons.js   图标子集（替代原 lucide 全量包）
assets/           本地头像（jpg/webp）、favicon 与图标
tools/gen-icons.js 图标子集生成脚本（可选）
```

文件协作关系：

```text
theme-data.js ──> (head 内联引导) 首次绘制前套用配色
              └─> theme-controls.js ──> 三个页面的主题面板与下落动效

site-ui.js （存储兜底 / 数据校验 / 页眉与滚动 / 逐个显示）
   ├─> script.js   ──> index.html    文章列表、搜索、标签、留言板
   ├─> article.js  ──> article.html  正文、元数据、相邻文章
   └─> timeline.js ──> timeline.html 年份分组、分类筛选、轴线

blog-data.js ──> script.js / article.js
timeline-data.js ──> script.js（首页最近足迹）/ timeline.js
assets/icons.js ──> 三页的 data-lucide 图标占位符
```

## 主要功能

- 文章搜索：匹配标题、摘要、正文和标签（启动时建索引，输入防抖）。
- 标签筛选：根据全部文章的 `tags` 自动生成。
- 显示篇数：滑动条上限随当前筛选结果自动变化。
- 独立文章页：固定链接、分享元数据、结构化数据和相邻文章导航。
- 站点纪事：按年份展示小站、生活、写作与里程碑事件，滚动时轴线与当前节点依次点亮，支持分类筛选。
- 主题设置：明暗模式和多种强调色，选择保存在浏览器中；首屏不再闪烁。
- 指针圆点与主题指针、下落动效：均尊重"减少动态效果"设置。
- 页眉游戏入口：左上角斜方块进入站内单文件 `game-f8fq.html` 小游戏。
- 留言板：读取、提交、刷新、失败提示、本机暂存与恢复网络后自动补发。

## 常用定制入口

### 字体与颜色

- `style.css` 顶部的 `--font-*` 定义字体栈；`:root` 与 `:root[data-theme='light']` 定义暗色/亮色的中性色与状态色。
- **强调色只改 `theme-data.js`**：`presets` 中每个预设的 `light` / `dark` 各自带 `accent`、`accentStrong` 与三种动效配色；脚本会写到 `<html>` 的内联样式，因此 `style.css` 里的同名默认值只作为无 JS 时的回退。
- `--on-accent` 是"强调色底上的前景色"，改动强调色时请确认它仍然可读（当前取值在全部预设下都 ≥5:1）。
- 指针圆点预设色在 `theme-data.js` 的 `cursorDots` 中维护。

### 下落动效

下落元素由 `theme-controls.js` 统一生成，支持 `petal`、`maple`、`bamboo`。新增动效类型时，需要在注册表、公共样式里增加形状，并检查移动端密度与 `prefers-reduced-motion` 行为。

### 首页文字与链接

- 首页结构、导航、介绍和社交链接位于 `index.html`。
- 打字机文字及节奏位于 `script.js` 的 `initTypingEffect()`。
- 阅读页公共导航和页脚位于 `article.html`。

### 添加时间记录

在 `timeline-data.js` 的 `timelineEvents` 数组中增加对象。必填字段为稳定的 `id`、`date`、`category`、`title` 和 `summary`；可选字段包括 `version`、`details`、`link` 与 `featured`。`category` 当前支持 `site`、`daily`、`writing` 和 `milestone`。首页自动显示最新三条，完整页面自动按年份倒序分组。

## 留言板数据流

留言板接口由 `script.js` 中的 `MESSAGE_API` 配置，当前地址为：

```text
https://api.153904.xyz/api/messages
```

```text
页面加载 ──GET──> 远程 API ──成功──> 显示远程留言 + 本机待发留言
                         └─失败──> 显示网络状态和本机待发送留言

提交留言 ──POST─> 远程 API ──成功────────> 清空输入框并刷新列表
                         ├─4xx───────> 显示服务端消息，保留输入内容
                         ├─5xx───────> 提示"内容已保留"，不清空输入框、不本地暂存
                         └─网络错误──> 暂存到 localStorage，联网后自动补发
```

Worker 侧：`GET` 返回留言数组；`POST` 需要 `name`（可空，默认匿名）与 `body`；`DELETE /api/messages/:id` 需要 `Authorization: Bearer $ADMIN_TOKEN`。

## 部署

Cloudflare Pages 可直接部署本目录：

- 构建命令：留空。
- 构建输出目录：站点文件所在目录；若本目录就是仓库根目录，使用 `/`。
- 自定义域名、留言 API 的 CORS 来源和 Worker 路由应保持一致。
- Worker 侧改动需要重新部署：`cd workers/guestbook && wrangler deploy`，并用 `wrangler secret put ADMIN_TOKEN` 配置管理口令（未配置时所有写接口都会返回 401）。可用 `GET /api/auth` 验证口令是否配置正确。
- 注意本目录直接作为发布根时，`workers/` 源码、`tools/`、`README.md` 也会被公开访问，如不希望如此请调整发布目录。
- 发布前检查首页、至少一篇文章、移动端导航、留言提交和 404 文章状态。

## 后续路线

1. **可被抓取**：为每篇文章生成静态 HTML（发布脚本或 Worker 边缘渲染），顺带补 RSS 与站点地图。
2. **内容增长**：文章达到数十篇后增加按年份归档和分页或"加载更多"。
3. **阅读体验**：长文出现后再增加文章目录；含大量图片时再统一懒加载和尺寸占位。
4. **工程升级**：只有重复模板、数据校验或发布自动化成为明确负担时，再评估 Markdown 构建流程或静态站点生成器。

## 本次改动的验证方式

- `node --check` 校验全部站点脚本语法。
- 无头 Chrome（`--headless=new --dump-dom`）分别加载首页、`article.html?id=hello-world`、`article.html?id=does-not-exist`、`timeline.html`，确认：无未捕获错误（`window.onerror`/`unhandledrejection` 收集器为空）、文章列表与时间轴正常渲染、24 个图标全部由 `assets/icons.js` 生成（无残留 `data-lucide`）、`noindex` 与相邻文章逻辑正确。
- 布局度量对比原版：768px 视口下 `.about-layout` 由溢出的两列变为单列且文档无横向溢出；浅色主题下 `--on-accent`、`--text-muted`、`.contact-section` 计算色符合预期；聚焦搜索框时焦点环为 `solid 2px` 强调色；移动端收起导航的 `visibility` 为 `hidden`。
- 视觉截图：浅色/暗色首页、768px 与 390px 视口、时间轴与阅读页。
