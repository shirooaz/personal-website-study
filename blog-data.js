// ============================================
// 博客文章数据 — 在此文件中增删改文章
// ============================================

const blogPosts = [
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
];
