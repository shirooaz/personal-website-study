// ============================================
// 博客文章数据 — 在此文件中增删改文章
// ============================================

const blogPosts = [
  {
    id: 'site-second-growth',
    tags: ['建站', '前端', '设计', '开发日志'],
    date: '2026-07-21',
    title: '从一张主页到一座小站：秋枫清澄的第二次生长（小站v3.0上线）',
    excerpt: '对照前代网站，记录这次重构如何把零散的视觉实验、文章功能与留言板，整理成一个更清晰、更耐用的个人小站。',
    content: `
<p>准备再次 push 之前，我重新打开了前一代网站。熟悉的墨绿色、樱花和萤火虫还在那里，文章、留言板与打字机效果也已经有了一个个人主页该有的轮廓。它并不粗糙，只是更像一张不断加东西的实验桌：每个想法都很鲜活，却还没有被整理成一套可以长期生活其中的秩序。</p>

<p>这一代网站所做的，正是把这些想法重新安放。没有换掉纯 HTML、CSS 和 JavaScript，也没有为了“现代化”引入新的框架；变化发生在内容如何组织、功能如何协作，以及以后能不能轻松继续写下去。</p>

<blockquote>
  <p>这次重构真正改变的，不是页面多了多少按钮，而是每个功能终于知道自己该住在哪里。</p>
</blockquote>

<h3>先说没有改变的部分</h3>

<p>前代为现在留下了很好的地基：Cloudflare Pages 的无构建部署、Worker 留言接口、集中保存文章的 <code>blog-data.js</code>，以及那个带着二次元气息、愿意认真记录生活与技术的小站方向。这些都被保留了。</p>

<p>重构不是把旧网站判定为错误，而是把当时有效的尝试继续向前推一步。头像、打字机文字和落叶仍然在，只是它们不再抢着说话；技术栈依旧轻量，只是文件之间的职责更清楚了。</p>

<h3>两代网站，变化在哪里</h3>

<table>
  <thead>
    <tr>
      <th>部分</th>
      <th>前一代</th>
      <th>现在</th>
    </tr>
  </thead>
  <tbody>
    <tr>
      <td>主页</td>
      <td>多个功能区逐步叠加，信息丰富但视觉重心分散</td>
      <td>以主视觉和最近文章为入口，内容按阅读顺序重新编排</td>
    </tr>
    <tr>
      <td>文章</td>
      <td>文章列表、阅读页与局部内嵌数据并存</td>
      <td><code>blog-data.js</code> 成为唯一数据源，阅读页使用统一模板</td>
    </tr>
    <tr>
      <td>查找内容</td>
      <td>依靠文章列表逐篇浏览，标签主要承担展示作用</td>
      <td>支持全文搜索、自动标签筛选和显示篇数滑动条</td>
    </tr>
    <tr>
      <td>主题</td>
      <td>围绕墨绿与珊瑚橙切换明暗模式</td>
      <td>多组相近气质的主题色集中管理，并在两种模式间保持一致</td>
    </tr>
    <tr>
      <td>动效</td>
      <td>樱花、萤火虫和滚动淡入营造氛围</td>
      <td>花瓣、枫叶、竹叶可以选择或关闭，并尊重减少动态效果设置</td>
    </tr>
    <tr>
      <td>留言板</td>
      <td>完成了 API 与本地存储的基本闭环</td>
      <td>补齐加载、失败、刷新和待发送状态，桌面端还能调整两栏宽度</td>
    </tr>
  </tbody>
</table>

<h3>内容终于成为网站的中心</h3>

<p>前代已经提出了“添加文章分类标签”和“实现文章搜索”的计划。这一代把它们真正接进了同一条数据流：写文章时填写 <code>tags</code>，首页会自动汇总并生成标签；搜索同时匹配标题、摘要、正文和标签；显示篇数滑动条则会随着筛选结果自动改变上限。</p>

<p>每篇文章现在都有稳定的 <code>article.html?id=...</code> 地址。标题、摘要、发布日期、上一篇与下一篇、浏览器分享信息和结构化数据都由文章对象自动生成。新增文章不再需要同步修改首页、文章列表和阅读页，只要在一个文件里加入一个对象即可。</p>

<p>阅读页也从“能打开正文”变成了完整的阅读环境：更合适的行宽、阅读进度、清晰的标题层级、移动端排版，以及不会把读者送回错误位置的相邻文章导航。这里没有很显眼的新功能，但它决定了长文章是否真的愿意被读完。</p>

<h3>主题不再是一组散落的颜色</h3>

<p>旧版的墨绿与珊瑚橙很有记忆点，不过颜色、明暗模式和动效配置分散在样式与脚本中，继续增加主题时会越来越难维护。现在，主题预设统一登记在 <code>theme-data.js</code>，共享控制逻辑放在 <code>theme-controls.js</code>。主页和文章页读取同一份设置，切换结果也会保存在浏览器中。</p>

<p>这带来一个很实际的好处：新增主题时，不必再同时修改两张页面和多段交互逻辑。主题色只负责链接、按钮、焦点和动效这些真正需要强调的位置；成功、警告与错误仍保持自己的语义，不会因为换了一种喜欢的颜色而失去辨识度。</p>

<h3>那些不抢镜的小变化</h3>

<ul>
  <li>“秋枫清澄”使用更适合主视觉的展示字体，正文继续保留文楷的阅读气质。</li>
  <li>头像左侧通过渐隐与页面衔接，不需要裁掉图片，也不会形成生硬边界。</li>
  <li>打字机效果预留了完整行高，换行时不再推动下方内容。</li>
  <li>页眉和页脚的回到顶部按钮使用同一套平滑滚动逻辑，不再依赖链接中的 <code>#top</code>。</li>
  <li>鼠标圆环保留当前主题色，圆点根据底层像素产生反差；文章行还有一层很淡的跟随光晕。</li>
  <li>触屏设备、文本输入、留言板分隔条和减少动态效果模式会自动回到合适的原生指针与交互。</li>
</ul>

<p>这些细节单独看都很小，却共同减少了页面中彼此争夺注意力的地方。现在最明显的动画仍然是主视觉中的打字，而其他反馈只在需要的时候出现。</p>

<h3>从旧计划里划掉的几项</h3>

<ul>
  <li><s>添加文章分类标签</s> — 标签从文章数据中自动生成。</li>
  <li><s>实现文章搜索功能</s> — 标题、摘要、正文与标签都可以搜索。</li>
  <li><s>添加深色模式手动切换</s> — 明暗模式与主题色都可以主动选择并记忆。</li>
  <li><s>模块化拆分 CSS / JS（第一步）</s> — 文章页、主题数据和共享控制已经按职责拆开，主样式仍会继续整理。</li>
  <li><s>优化移动端体验</s> — 导航、文章排版、留言板和动效密度都有独立适配。</li>
</ul>

<p>当然，这并不是终点。文章仍以 HTML 字符串保存在 JavaScript 中，数量再多一些后，独立 Markdown 文件或构建阶段会更方便；留言板的 Worker、KV 配置与前端仓库也需要继续保持清晰的部署边界。现在不急着引入框架，是因为当前规模还不需要用复杂度交换复杂度。</p>

<hr>

<p><em>前一代让我拥有了一个网站，这一代开始让我拥有一个可以继续写下去的地方。</em></p>
    `.trim(),
  },
  {
    id: 'site-v2-refactor',
    tags: ['建站', '前端'],
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
  <li>新增独立文章阅读页，点击卡片进入可分享的固定地址</li>
  <li>保留首页搜索与标签筛选，让浏览和阅读各自保持简洁</li>
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
  <li><strong>独立阅读页：</strong>每篇文章拥有稳定链接、相邻文章导航与完整浏览器历史</li>
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
    tags: ['Cloudflare', '开发日志'],
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
    tags: ['Cloudflare', '图床'],
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
    tags: ['设计'],
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
    tags: ['建站', 'Cloudflare'],
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
