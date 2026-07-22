# 秋枫清澄个人主页

这是一个无需构建工具即可部署到 Cloudflare Pages 的静态个人站点。主页提供个人介绍、文章搜索、标签筛选、时间轴预览、显示篇数控制和留言板；`article.html` 负责独立文章阅读，`timeline.html` 用于记录网站节点与生活片段。

## 核心原则

- `blog-data.js` 是唯一的文章数据源，首页和阅读页不重复维护文章。
- 页面结构、基础样式和阅读页逻辑分开，避免把大量 CSS、数据和脚本内嵌到 HTML。
- 主题、动效和布局偏好保存在浏览器中，同时尊重系统的“减少动态效果”设置。
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
- `date` 使用 `YYYY-MM-DD`；文章列表、“最近更新”和相邻文章会自动按日期排序。
- `tags` 是字符串数组。系统会自动汇总、去重并生成首页标签，不需要单独维护标签表。
- `excerpt` 同时用于首页摘要、搜索和分享元数据。
- `content` 支持常见 HTML，包括标题、段落、列表、引用、代码、图片和表格。

文章地址为：

```text
https://153904.xyz/article.html?id=stable-article-id
```

新增文章不需要修改 `index.html`、`article.html`、`script.js` 或 `article.js`。

## 文件结构

```text
index.html       主页结构
article.html     独立文章阅读模板
blog-data.js     唯一的文章数据源
theme-data.js    主题色与下落动效注册表
theme-controls.js 共享主题面板与偏好控制
script.js        主页渲染与交互
article.js       阅读页渲染与交互
style.css        全站基础样式与主题变量
article.css      阅读页专用样式
timeline.html    站点与生活时间轴页面
timeline-data.js 时间轴的唯一数据源
timeline.js      时间轴筛选、分组与交互
timeline.css     时间轴页面专用样式
assets/          本地头像与图标脚本
```

文件协作关系：

```text
blog-data.js ──> script.js  ──> index.html 的文章列表、搜索和标签
             └─> article.js ──> article.html 的正文、元数据和相邻文章

theme-data.js ──> theme-controls.js ──> 两个页面的主题面板、配色与下落动效

timeline-data.js ──> script.js   ──> index.html 的最近足迹
                 └─> timeline.js ──> timeline.html 的年份分组和分类筛选

style.css ────────────────> 三个页面的公共视觉与交互样式
article.css ──────────────> 阅读页排版
timeline.css ─────────────> 时间轴页排版
```

## 主要功能

- 文章搜索：匹配标题、摘要、正文和标签。
- 标签筛选：根据全部文章的 `tags` 自动生成。
- 显示篇数：滑动条上限随当前筛选结果自动变化。
- 独立文章页：固定链接、分享元数据、结构化数据和相邻文章导航。
- 站点纪事：通过左侧连续纵轴按年份展示小站、生活、写作与里程碑事件；滚动时轴线与当前节点会依次点亮，并支持分类筛选。
- 主题设置：明暗模式和多种强调色，选择会保存在浏览器中。
- 指针圆点：可在主题面板中选择预设色或自定义颜色；空白区域显示所选颜色，经过文字、交互元素或图像时产生逐像素反色。
- 下落动效：花瓣、枫叶和竹叶，可关闭，并适配减少动态效果偏好。
- 主题指针：精确鼠标设备显示主题色跟随圆环，进入文字、图片和交互元素时增强主题色边缘；触屏、文本输入和减少动态效果模式保持原生指针。
- 留言板：读取、提交、刷新、失败提示和待发送留言暂存。
- 响应式布局：桌面与移动端导航、文章排版和留言板布局。

## 常用定制入口

### 字体与颜色

在 `style.css` 顶部维护设计变量：

- `--font-display`：主页主视觉标题字体。
- `--font-main`：正文与常规标题字体。
- `--font-mono`：数字、标签和辅助信息字体。
- `:root` 与 `:root[data-theme='light']`：暗色和亮色的中性色与状态色。
- `--accent` 与 `--accent-strong`：当前主题的语义强调色，由共享脚本应用。

主题预设统一放在 `theme-data.js`。每个预设包含名称、分组、亮暗强调色以及三种下落动效配色。新增主题时只需向 `presets` 数组加入一个对象，首页和文章页会自动生成选项，不需要修改 HTML、CSS、`script.js` 或 `article.js`。

当前主题分为暖色、静色和自然三组。默认中性色保持稳定，主题只改变链接、按钮、焦点和动效色；成功、警告和错误等状态色不跟随主题变化。

指针中心圆点的预设色统一维护在 `theme-data.js` 的 `cursorDots` 数组中；用户选择和自定义色分别保存在 `qiufeng-cursor-dot` 与 `qiufeng-cursor-dot-custom`。外圈始终跟随主题色。圆点持续使用与 `blog2` 相同的 `difference` 逐像素混合，并由 `theme-controls.js` 根据当前页面底色换算混合源色：空白区域尽量还原所选颜色，跨越深色文字或图像像素时对应部分变亮。

### 下落动效

下落元素由 `theme-controls.js` 统一生成，目前支持 `petal`、`maple` 和 `bamboo`。每套主题可在 `theme-data.js` 中分别配置三种动效的颜色。新增动效类型时，需要在注册表和公共样式中增加形状，并检查移动端密度与 `prefers-reduced-motion` 行为。

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
页面加载 ──GET──> 远程 API ──成功──> 显示远程留言
                         └─失败──> 显示网络状态和本机待发送留言

提交留言 ──POST─> 远程 API ──成功──> 刷新留言列表
                         └─失败──> 暂存到 localStorage，避免内容丢失
```

本仓库当前只包含调用留言 API 的前端代码。若需要重新部署或修改后端，应将 Cloudflare Worker 源码、`wrangler.toml` 和存储结构作为独立的 `workers/guestbook/` 模块纳入版本控制，不要把后端逻辑复制进前端脚本。

## 部署

Cloudflare Pages 可直接部署仓库目录：

- 构建命令：留空。
- 构建输出目录：站点文件所在目录；若本目录就是仓库根目录，使用 `/`。
- 自定义域名、留言 API 的 CORS 来源和 Worker 路由应保持一致。
- 发布前检查首页、至少一篇文章、移动端导航、留言提交和 404 文章状态。

## 后续路线

按内容规模和实际需求推进，不为了增加技术栈而升级：

1. **维护完整性**：补回并整理 `workers/guestbook/`，记录 Worker、KV 与域名配置。
2. **内容增长**：文章达到数十篇后增加按年份归档和分页或“加载更多”。
3. **阅读体验**：长文出现后再增加文章目录；含大量图片时再统一懒加载和尺寸占位。
4. **订阅与发现**：稳定更新后增加 RSS、站点地图和归档页。
5. **工程升级**：只有重复模板、数据校验或发布自动化成为明确负担时，再评估 Markdown 构建流程或静态站点生成器。

暂不优先：独立评论系统会与留言板功能重叠；阅读量统计会增加后端、隐私和数据准确性成本；PWA、TypeScript 或框架迁移目前不能直接改善写作流程。
