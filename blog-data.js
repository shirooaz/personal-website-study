// ============================================
// 博客文章数据 — 在此文件中增删改文章
// ============================================

const blogPosts = [
  {
    id: 'site-v2-refactor',
    date: '2026-06-13',
    title: '完成页面重构，秋枫清澄小站2.0上线',
    excerpt: '历时数日的页面重构圆满完成，全站架构全面升级，博客系统正式整合到首页。',
    content: `
<p>经过数天的努力，秋枫清澄小站完成了从初代到 2.0 的全面重构。这次升级不仅是页面的美化，更是架构层面的重新设计。</p>

<h3>本次重构主要内容</h3>

<h4>1. 博客系统整合</h4>
<ul>
  <li>将独立博客页面 <code>blog.html</code> 的内容整合到首页 <code>index.html</code></li>
  <li>复用初代 <code>blog-data.js</code> 数据文件，统一管理博客文章</li>
  <li>新增模态框展示完整文章内容，点击卡片即可阅读</li>
  <li>支持 ESC 键和点击背景关闭模态框</li>
</ul>

<h4>2. 文章系统搭建</h4>
<ul>
  <li>创建独立的文章详情页 <code>article.html</code></li>
  <li>设计完整文章页面架构，支持代码高亮、引用、列表等格式</li>
  <li>添加上一篇/下一篇导航功能</li>
</ul>

<h4>3. 样式与交互优化</h4>
<ul>
  <li>修复多处 CSS 布局问题（posts-section padding 调整）</li>
  <li>优化响应式设计，确保各设备显示一致</li>
  <li>统一全站配色与视觉风格</li>
</ul>

<h3>技术亮点</h3>
<ul>
  <li><strong>数据集中管理：</strong>博客文章统一在 <code>blog-data.js</code> 管理，增删改只需编辑一个文件</li>
  <li><strong>模态框交互：</strong>点击卡片弹出模态框，无需跳转页面</li>
  <li><strong>样式继承：</strong>复用现有 CSS 变量和设计语言，保持风格统一</li>
</ul>

<h3>下一步计划</h3>
<p>目前已清空示例文章，等待落笔（。后续将逐步完善文章系统，添加更多实用功能。</p>

<hr>

<p><em>特别感谢这几天一直打磨代码的我，每一处细节的调整都是为了眼睛更舒服（雾  </em></p>
    `.trim(),
  },
  {
    id: 'blog-guestbook-launch',
    date: '2026-05-29',
    title: '博客 & 留言板上线 — Worker + KV 实战开发日志',
    excerpt: '一天之内完成了博客系统、留言板后端和多项 UI 改进。从零到全功能个人站点。',
    content: `
<p>用 Cloudflare Worker + KV 实现了留言板后端，替代了原来的浏览器本地存储。同时创建了独立博客页面和共享数据文件，主页右侧博客面板和 /blog 页面读取同一份数据。</p>

<h3>新增文件（4个）</h3>
<ul>
  <li><strong>workers/guestbook/src/index.js</strong> — 留言板 API（GET 读取、POST 写入、DELETE 删除，含限流和 XSS 防护）</li>
  <li><strong>workers/guestbook/wrangler.toml</strong> — Worker 配置（绑定 KV、自定义域名路由）</li>
  <li><strong>blog.html</strong> — 独立博客页面（点击标题展开/收起，文章间分享链接）</li>
  <li><strong>blog-data.js</strong> — 博客文章数据（增删改文章只需编辑这个文件）</li>
</ul>

<h3>修改文件（4个）</h3>
<ul>
  <li><strong>script.js</strong> — 留言板从 localStorage 改为调用 KV API；博客面板和数据共用 blog-data.js</li>
  <li><strong>index.html</strong> — 导航链接指向 blog.html；引入 blog-data.js；留言板提示更新</li>
  <li><strong>style.css</strong> — 新增博客页布局、文章展开收起、留言空态样式</li>
  <li><strong>.gitignore</strong> — 排除 .wrangler 缓存、截图、测试目录</li>
</ul>

<h3>部署流程</h3>
<ol>
  <li><code>wrangler login</code> 登录</li>
  <li><code>wrangler kv namespace create "GUESTBOOK_KV"</code> 创建 KV，把 id 填入 wrangler.toml</li>
  <li><code>wrangler deploy</code> 部署 Worker，路由 api.153904.xyz/* 自动绑定</li>
  <li>更新 script.js 的 API 地址为 <code>https://api.153904.xyz/api/messages</code></li>
  <li><code>git add</code> + <code>commit</code> + <code>push</code>，Cloudflare Pages 自动部署前端</li>
</ol>
    `.trim(),
  },
  {
    id: 'image-hosting-setup',
    date: '2026-05-28',
    title: 'CloudFlare-ImgBed 图床搭建',
    excerpt: '用 R2 + KV + Worker 搭建私有图床的完整过程，踩坑记录。',
    content: `
<p><a href="https://github.com/MarSeventh/CloudFlare-ImgBed" target="_blank" rel="noopener">CloudFlare-ImgBed</a> 是一款基于 Cloudflare 的开源图床工具。</p>

<h3>搭建步骤</h3>
<ol>
  <li>Fork 项目到自己的 GitHub</li>
  <li>在 Cloudflare 控制台创建 R2 存储桶和 KV 命名空间</li>
  <li>修改 <code>wrangler.toml</code> 绑定自己的 R2 和 KV</li>
  <li><code>wrangler deploy</code> 部署 Worker</li>
  <li>配置自定义域名指向 Worker</li>
</ol>

<h3>踩坑记录</h3>
<p><strong>坑 1：</strong>CORS 配置。图床 Worker 默认可能不允许跨域请求，需要在前端页面和图床不在同一域名时手动添加 CORS 头。</p>
<p><strong>坑 2：</strong>R2 的公共访问。R2 默认不公开，如果要直链访问，需要绑定自定义域名到 R2 桶。</p>
<p><strong>坑 3：</strong>上传大小限制。Worker 免费版有 100MB 请求体限制，大图需要用分片上传或降低分辨率后再传。</p>
    `.trim(),
  }, 
  {
    id: 'constructivism-design',
    date: '2026-05-25',
    title: '构成主义设计笔记',
    excerpt: '关于网站视觉风格的思考——为什么选择构成主义，以及配色与布局的取舍。',
    content: `
<p>构成主义（Constructivism）是 20 世纪初发源于俄国的艺术与建筑运动，强调几何形态、工业材料和功能性。</p>

<h3>核心元素</h3>
<ul>
  <li><strong>几何图形：</strong>圆形、三角形、矩形是基本语言</li>
  <li><strong>斜线构图：</strong>打破水平和垂直的单调，制造动感</li>
  <li><strong>有限配色：</strong>红、黑、白 + 少量金色点缀</li>
  <li><strong>网格系统：</strong>隐性的秩序感，让"乱"中有序</li>
</ul>

<h3>为什么和二次元结合</h3>
<p>苏联构成主义的海报设计中常有人物形象——那些几何化的人脸、剪影、以及大胆的排版，和现代 ACG 平面设计有某种气质上的相通。红黑配色也恰好呼应了很多动漫 OP/ED 的色调。</p>

<h3>实现细节</h3>
<p>网站核心是一张内嵌 SVG——不是图片，是实时渲染的矢量图形。这样做的好处是可以做 CSS 动画（旋转、脉冲、浮动），也可以一键切换配色。三个配色版本分别对应红色、青色和金色主题。</p>
    `.trim(),
  },
  {
    id: 'hello-world',
    date: '2026-05-20',
    title: 'Hello World — 站点上线',
    excerpt: '153904.xyz 正式上线。聊聊这个站的技术选型和设计思路。',
    content: `
<p>经过几天的折腾，<strong>153904.xyz</strong> 终于上线了。</p>

<h3>技术栈</h3>
<ul>
  <li><strong>托管：</strong>Cloudflare Pages — 免费、全球 CDN、自动部署</li>
  <li><strong>图床：</strong>Cloudflare R2 + KV — 对象存储，配合 CloudFlare-ImgBed 使用</li>
  <li><strong>域名：</strong>153904.xyz — 便宜好记</li>
  <li><strong>风格：</strong>构成主义 + 二次元 — 几何线条 + 红黑配色</li>
</ul>

<h3>为什么选这个技术栈</h3>
<p>作为 Web 开发初学者，Cloudflare 的免费额度非常友好。Pages 直接连 GitHub 仓库，push 即部署。R2 有 10GB 免费存储，配合 Worker 做图床 API，比直接用 GitHub 存图片灵活很多。</p>

<h3>后续计划</h3>
<p>博客和留言板功能正在开发中，会用 Worker + KV 实现。目标是做成一个轻量但有完整功能的个人站点。</p>
    `.trim(),
  },  
];