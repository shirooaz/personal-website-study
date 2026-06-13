# Cloudflare + GitHub Pages 博客升级指南

> 利用 Cloudflare R2、D1、KV + GitHub Pages + 域名，打造更强大的博客系统

---

## 📋 目录

1. [你拥有的资源](#一你拥有的资源)
2. [可以做些什么](#二可以做些什么)
3. [方案一：免费图床 + CDN 加速](#三方案一免费图床--cdn-加速)
4. [方案二：全栈博客系统](#四方案二全栈博客系统)
5. [方案三：评论系统](#五方案三评论系统)
6. [方案四：网站统计](#六方案四网站统计)
7. [方案五：独立博客系统](#七方案五独立博客系统)
8. [快速上手路线图](#八快速上手路线图)
9. [成本估算](#九成本估算)

---

## 一、你拥有的资源

| 资源 | 说明 | 免费额度 |
|------|------|----------|
| **Cloudflare R2** | 对象存储，类 S3 | 10GB/月 |
| **Cloudflare D1** | SQLite 数据库 | 100万行/月 |
| **Cloudflare KV** | 键值存储 | 10万次读写/月 |
| **GitHub Pages** | 静态网站托管 | 免费 |
| **自定义域名** | 绑定到 GitHub Pages | 你已有 |

---

## 二、可以做些什么

```
┌─────────────────────────────────────────────────────────────┐
│                        可构建的系统                          │
├─────────────────────────────────────────────────────────────┤
│  🖼️ 图床/文件存储      │  用 R2 存图片/视频，免费 CDN        │
│  💬 评论系统           │  用 D1 存储评论，无需后端服务器       │
│  📊 网站分析           │  用 KV/D1 记录访客数据               │
│  📝 全栈博客           │  前端 GitHub + 后端 Workers + D1     │
│  🔄 自动部署           │  GitHub Actions 触发 R2/CDN 更新      │
│  📱 独立 APP 后端       │  为小程序/APP 提供 API               │
│  🎮 小游戏后端          │  排行榜、存档、存档同步               │
│  📧 邮件发送           │  Cloudflare Email Routing            │
└─────────────────────────────────────────────────────────────┘
```

---

## 三、方案一：免费图床 + CDN 加速

### 3.1 原理

```
你上传图片 → R2 存储 → 你的域名分发 → 全球 CDN 加速
```

### 3.2 优势

| 对比项 | 传统图床（如微博/imgur） | 自建 R2 图床 |
|--------|------------------------|--------------|
| **域名** | 第三方域名，可能被墙 | 你的域名，更专业 |
| **稳定性** | 可能倒闭/删图 | 完全可控 |
| **速度** | 一般 | Cloudflare 全球 CDN |
| **费用** | 免费但有限制 | R2 免费额度内 0 成本 |
| **隐私** | 公开可访问 | 可设置访问权限 |

### 3.3 配置步骤

#### Step 1: 创建 R2 存储桶

1. 登录 [Cloudflare Dashboard](https://dash.cloudflare.com/)
2. 进入 **R2 对象存储**
3. 点击 **创建存储桶**
4. 名称填 `images`（可自定义）
5. 点击创建

#### Step 2: 添加自定义域名

1. 点击存储桶 → **设置** → **自定义域名**
2. 输入子域名，如 `cdn.yourdomain.com`
3. Cloudflare 会自动验证并配置 SSL

#### Step 3: 安装 Wrangler CLI

```bash
# 安装 Node.js 后执行
npm install -g wrangler

# 登录 Cloudflare
npx wrangler login
```

#### Step 4: 上传图片

```bash
# 使用命令行上传
npx wrangler r2 object put cdn/image.jpg \
  --bucket=images \
  --file=./image.jpg

# 或使用 Python 脚本
pip install cloudflare
```

### 3.4 给博客添加图床功能

修改博客的 `script.js`，添加一个简单的图片上传接口：

```javascript
// 在 index.html 添加上传区域
/*
<div id="image-upload">
  <input type="file" id="file-input" accept="image/*">
  <button onclick="uploadImage()">上传到图床</button>
  <div id="result"></div>
</div>
*/

// 在 script.js 添加上传函数
async function uploadImage() {
  const fileInput = document.getElementById('file-input');
  const file = fileInput.files[0];
  
  if (!file) {
    alert('请选择图片');
    return;
  }
  
  // 获取预签名 URL（需要配合 Cloudflare Worker）
  const response = await fetch('https://your-worker.yourdomain.workers.dev/upload-url');
  const { uploadUrl, publicUrl } = await response.json();
  
  // 上传到 R2
  await fetch(uploadUrl, {
    method: 'PUT',
    body: file,
    headers: {
      'Content-Type': file.type
    }
  });
  
  document.getElementById('result').innerHTML = 
    `图片地址：<input value="${publicUrl}" readonly>`;
}
```

### 3.5 进阶：使用 PicGo + R2 插件

PicGo 是一个图片上传工具，支持 R2：

1. 下载 [PicGo](https://github.com/Molunerfinn/PicGo)
2. 安装 `picgo-plugin-r2` 插件
3. 配置：
   ```json
   {
     "bucket": "images",
     "accountId": "你的 Cloudflare Account ID",
     "accessKeyId": "你的 R2 Access Key",
     "accessKeySecret": "你的 R2 Secret Key",
     "customUrl": "https://cdn.yourdomain.com"
   }
   ```

---

## 四、方案二：全栈博客系统

### 4.1 架构图

```
┌────────────────────────────────────────────────────────────────┐
│                          整体架构                               │
├────────────────────────────────────────────────────────────────┤
│                                                                │
│  ┌──────────────┐    ┌──────────────┐    ┌──────────────┐     │
│  │  GitHub Pages │ ← │  Cloudflare   │ ← │   用户浏览器   │     │
│  │  (静态前端)   │    │   Workers    │    │              │     │
│  │              │    │   (API)      │    │              │     │
│  └──────────────┘    └──────────────┘    └──────────────┘     │
│         ↑                   ↑                                  │
│         │                   │                                  │
│         ↓                   ↓                                  │
│  ┌──────────────┐    ┌──────────────┐                         │
│  │   你的域名    │    │  Cloudflare  │                         │
│  │              │    │  D1 (数据)   │                         │
│  │ blog.com    │    │  R2 (文件)   │                         │
│  │              │    │  KV (缓存)   │                         │
│  └──────────────┘    └──────────────┘                         │
│                                                                │
└────────────────────────────────────────────────────────────────┘
```

### 4.2 核心技术栈

| 层级 | 技术 | 作用 |
|------|------|------|
| **前端** | HTML/CSS/JS 或 Vue/React | 用户界面 |
| **后端** | Cloudflare Workers | API 服务 |
| **数据库** | Cloudflare D1 | 文章、用户数据 |
| **文件存储** | Cloudflare R2 | 图片、视频 |
| **缓存** | Cloudflare KV | 热点数据加速 |
| **部署** | GitHub Pages + Actions | 自动部署 |

### 4.3 创建 Cloudflare Worker API

#### Step 1: 创建 Worker 项目

```bash
# 创建新项目
npx wrangler init blog-api

cd blog-api
```

#### Step 2: 配置 wrangler.toml

```toml
name = "blog-api"
main = "src/index.js"
compatibility_date = "2024-01-01"

# 绑定 D1 数据库
[[d1_databases]]
binding = "DB"
database_name = "my-blog"
database_id = "xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"

# 绑定 R2 存储
[[r2_buckets]]
binding = "BUCKET"
bucket_name = "images"

# 绑定 KV
[[kv_namespaces]]
binding = "CACHE"
id = "xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
```

#### Step 3: 编写 API 代码

```javascript
// src/index.js

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const path = url.pathname;

    // CORS 头
    const corsHeaders = {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    };

    if (request.method === 'OPTIONS') {
      return new Response(null, { headers: corsHeaders });
    }

    // 文章列表
    if (path === '/api/posts' && request.method === 'GET') {
      const posts = await env.DB
        .prepare('SELECT * FROM posts ORDER BY created_at DESC')
        .all();
      
      return new Response(JSON.stringify(posts.results), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // 获取单篇文章
    if (path.startsWith('/api/posts/') && request.method === 'GET') {
      const id = path.split('/')[3];
      const post = await env.DB
        .prepare('SELECT * FROM posts WHERE id = ?')
        .bind(id)
        .first();
      
      return new Response(JSON.stringify(post), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // 创建文章
    if (path === '/api/posts' && request.method === 'POST') {
      const { title, content, author } = await request.json();
      
      const result = await env.DB
        .prepare('INSERT INTO posts (title, content, author) VALUES (?, ?, ?)')
        .bind(title, content, author)
        .run();
      
      return new Response(JSON.stringify({ success: true, id: result.meta.last_row_id }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // 上传图片
    if (path === '/api/upload' && request.method === 'POST') {
      const formData = await request.formData();
      const file = formData.get('file');
      const filename = `${Date.now()}-${file.name}`;

      await env.BUCKET.put(filename, file);
      const imageUrl = `https://cdn.yourdomain.com/${filename}`;

      return new Response(JSON.stringify({ url: imageUrl }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    return new Response('Not Found', { status: 404 });
  }
};
```

#### Step 4: 创建数据库表

```bash
# 创建 D1 数据库
npx wrangler d1 create my-blog

# 会返回 database_id，填入 wrangler.toml

# 创建表结构
npx wrangler d1 execute my-blog --local --file=./schema.sql
```

```sql
-- schema.sql

-- 文章表
CREATE TABLE IF NOT EXISTS posts (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  author TEXT DEFAULT '匿名',
  tags TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- 分类表
CREATE TABLE IF NOT EXISTS categories (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL UNIQUE
);

-- 标签表
CREATE TABLE IF NOT EXISTS tags (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL UNIQUE
);

-- 文章-标签关联表
CREATE TABLE IF NOT EXISTS post_tags (
  post_id INTEGER,
  tag_id INTEGER,
  PRIMARY KEY(post_id, tag_id)
);

-- 初始化分类
INSERT INTO categories (name) VALUES ('技术'), ('生活'), ('随笔');
```

#### Step 5: 部署 Worker

```bash
# 部署到生产环境
npx wrangler deploy
```

### 4.4 修改博客前端对接 API

```javascript
// 加载文章列表
async function loadPosts() {
  const response = await fetch('https://blog-api.yourdomain.workers.dev/api/posts');
  const posts = await response.json();
  
  const container = document.getElementById('posts');
  container.innerHTML = posts.map(post => `
    <article class="post-card">
      <h3>${post.title}</h3>
      <p>${post.content.substring(0, 100)}...</p>
      <small>${post.author} · ${new Date(post.created_at).toLocaleDateString()}</small>
    </article>
  `).join('');
}

// 发布文章
async function publishPost(title, content) {
  const response = await fetch('https://blog-api.yourdomain.workers.dev/api/posts', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ title, content, author: '博主' })
  });
  const result = await response.json();
  console.log('发布成功，ID:', result.id);
}

// 上传图片
async function uploadImage(file) {
  const formData = new FormData();
  formData.append('file', file);
  
  const response = await fetch('https://blog-api.yourdomain.workers.dev/api/upload', {
    method: 'POST',
    body: formData
  });
  const { url } = await response.json();
  return url;
}
```

---

## 五、方案三：评论系统

### 5.1 为什么需要独立评论系统

| 对比项 | 第三方评论（Disqus/来必力） | 自建评论系统 |
|--------|----------------------------|--------------|
| **加载速度** | 慢，需要加载第三方脚本 | 快，本地数据 |
| **隐私** | 数据在第三方 | 完全可控 |
| **广告** | 可能有广告 | 无广告 |
| **合规** | 可能不符合中国法规 | 完全合规 |
| **费用** | 免费有限制 | 免费额度够用 |

### 5.2 评论系统设计

#### 数据库表结构

```sql
-- 评论表
CREATE TABLE IF NOT EXISTS comments (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  post_slug TEXT NOT NULL,        -- 文章标识
  parent_id INTEGER DEFAULT NULL,  -- 父评论 ID（回复功能）
  author TEXT NOT NULL,           -- 评论者名称
  email TEXT,                      -- 邮箱（可选）
  content TEXT NOT NULL,          -- 评论内容
  avatar TEXT,                     -- 头像 URL
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  approved INTEGER DEFAULT 1      -- 审核状态
);

-- 创建索引加速查询
CREATE INDEX idx_post_slug ON comments(post_slug);
CREATE INDEX idx_parent ON comments(parent_id);
```

#### 评论 API

```javascript
// src/comments.js

// 获取评论列表
async function getComments(postSlug) {
  const comments = await env.DB
    .prepare(`
      SELECT c.*, u.avatar 
      FROM comments c
      LEFT JOIN users u ON c.email = u.email
      WHERE c.post_slug = ? AND c.approved = 1
      ORDER BY c.created_at DESC
    `)
    .bind(postSlug)
    .all();
  
  return nestComments(comments.results); // 嵌套评论
}

// 发表评论
async function addComment(postSlug, author, email, content, parentId = null) {
  // 防垃圾评论：简单验证
  if (content.length < 5 || content.length > 2000) {
    return { error: '评论长度需在 5-2000 字之间' };
  }
  
  await env.DB
    .prepare(`
      INSERT INTO comments (post_slug, parent_id, author, email, content)
      VALUES (?, ?, ?, ?, ?)
    `)
    .bind(postSlug, parentId, author, email, content)
    .run();
  
  return { success: true };
}

// 嵌套评论处理
function nestComments(comments) {
  const map = {};
  const roots = [];
  
  comments.forEach(c => {
    c.children = [];
    map[c.id] = c;
  });
  
  comments.forEach(c => {
    if (c.parent_id && map[c.parent_id]) {
      map[c.parent_id].children.push(c);
    } else {
      roots.push(c);
    }
  });
  
  return roots;
}
```

#### 前端评论组件

```html
<!-- 评论区域 -->
<div id="comments-section">
  <h3>💬 留言 <span id="comment-count">(0)</span></h3>
  
  <!-- 评论表单 -->
  <form id="comment-form">
    <input type="text" name="author" placeholder="昵称" required>
    <input type="email" name="email" placeholder="邮箱（选填）">
    <textarea name="content" placeholder="写下你的想法..." required></textarea>
    <button type="submit">发表评论</button>
  </form>
  
  <!-- 评论列表 -->
  <div id="comment-list"></div>
</div>

<style>
#comments-section {
  background: var(--card-bg);
  padding: 20px;
  border-radius: 12px;
  margin-top: 40px;
}

.comment-item {
  padding: 15px;
  border-bottom: 1px solid var(--border);
}

.comment-item .avatar {
  width: 40px;
  height: 40px;
  border-radius: 50%;
}

.comment-item .children {
  margin-left: 30px;
  border-left: 2px solid var(--border);
  padding-left: 15px;
}
</style>

<script>
async function loadComments() {
  const slug = window.location.pathname;
  const res = await fetch(`/api/comments?post=${slug}`);
  const comments = await res.json();
  
  document.getElementById('comment-count').textContent = `(${comments.length})`;
  document.getElementById('comment-list').innerHTML = renderComments(comments);
}

function renderComments(comments) {
  return comments.map(c => `
    <div class="comment-item">
      <img src="${c.avatar || '/default-avatar.png'}" class="avatar">
      <div class="comment-body">
        <strong>${c.author}</strong>
        <span>${new Date(c.created_at).toLocaleDateString()}</span>
        <p>${c.content}</p>
        <button onclick="replyTo(${c.id})">回复</button>
      </div>
      ${c.children ? `<div class="children">${renderComments(c.children)}</div>` : ''}
    </div>
  `).join('');
}

document.getElementById('comment-form').addEventListener('submit', async (e) => {
  e.preventDefault();
  const form = e.target;
  const data = {
    author: form.author.value,
    email: form.email.value,
    content: form.content.value
  };
  
  await fetch('/api/comments', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data)
  });
  
  form.reset();
  loadComments();
});

loadComments();
</script>
```

---

## 六、方案四：网站统计

### 6.1 自建统计 vs 百度/Google 统计

| 对比项 | 百度/Google 统计 | 自建统计 |
|--------|-----------------|----------|
| **数据主权** | 第三方拥有 | 完全拥有 |
| **隐私合规** | 可能涉及数据出境 | 完全合规 |
| **加载速度** | 需要加载第三方脚本 | 无额外请求 |
| **自定义程度** | 有限 | 完全自定义 |
| **数据量限制** | 有免费限制 | 取决于 D1/KV |

### 6.2 统计系统设计

#### 数据表结构

```sql
-- 访问记录表（用 KV 存储更高效）
-- 但 D1 可以做汇总分析

CREATE TABLE IF NOT EXISTS pageviews (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  path TEXT NOT NULL,
  referrer TEXT,
  user_agent TEXT,
  screen_width INTEGER,
  screen_height INTEGER,
  language TEXT,
  country TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- 每日统计表
CREATE TABLE IF NOT EXISTS daily_stats (
  date DATE PRIMARY KEY,
  pv INTEGER DEFAULT 0,
  uv INTEGER DEFAULT 0
);
```

#### 统计埋点代码

```javascript
// stats.js - 添加到每个页面底部

async function sendStats() {
  const data = {
    path: window.location.pathname,
    referrer: document.referrer,
    screen: `${window.screen.width}x${window.screen.height}`,
    language: navigator.language,
    t: Date.now()
  };
  
  // 使用 beacon API，页面关闭也能发送
  navigator.sendBeacon('/api/stats', JSON.stringify(data));
}

sendStats();

// 统计 API
async function handleStats(request, env) {
  const data = JSON.parse(await request.text());
  
  // 写入 KV（高读写速度）
  const today = new Date().toISOString().split('T')[0];
  const key = `stats:${today}`;
  
  const existing = await env.STATS.get(key);
  const stats = existing ? JSON.parse(existing) : { pv: 0, paths: {} };
  
  stats.pv++;
  stats.paths[data.path] = (stats.paths[data.path] || 0) + 1;
  
  await env.STATS.put(key, JSON.stringify(stats));
  
  return new Response(JSON.stringify({ success: true }));
}
```

#### 统计后台

```html
<!-- admin/stats.html -->
<div class="stats-dashboard">
  <h2>📊 网站统计</h2>
  
  <div class="stats-cards">
    <div class="card">
      <h3>今日 PV</h3>
      <p id="today-pv">0</p>
    </div>
    <div class="card">
      <h3>今日 UV</h3>
      <p id="today-uv">0</p>
    </div>
    <div class="card">
      <h3>总访问量</h3>
      <p id="total-pv">0</p>
    </div>
  </div>
  
  <div class="chart">
    <h3>访问趋势</h3>
    <canvas id="trend-chart"></canvas>
  </div>
  
  <div class="top-pages">
    <h3>热门页面 TOP 10</h3>
    <ul id="top-pages-list"></ul>
  </div>
</div>

<script>
async function loadStats() {
  const res = await fetch('/api/stats/admin');
  const data = await res.json();
  
  document.getElementById('today-pv').textContent = data.today.pv;
  document.getElementById('total-pv').textContent = data.total.pv;
  
  // 绘制趋势图
  new Chart(document.getElementById('trend-chart'), {
    type: 'line',
    data: {
      labels: data.trend.map(d => d.date),
      datasets: [{
        label: '日 PV',
        data: data.trend.map(d => d.pv)
      }]
    }
  });
}

loadStats();
</script>
```

---

## 七、方案五：独立博客系统

### 7.1 完整架构

```
┌─────────────────────────────────────────────────────────────────┐
│                        完整博客架构                              │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │                    Cloudflare CDN                        │   │
│  │  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐     │   │
│  │  │  Pages      │  │  Workers    │  │  Images     │     │   │
│  │  │  (前端)      │  │  (API)      │  │  (R2)       │     │   │
│  │  └─────────────┘  └─────────────┘  └─────────────┘     │   │
│  └─────────────────────────────────────────────────────────┘   │
│                              │                                  │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │                     Cloudflare Data                      │   │
│  │  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐     │   │
│  │  │  D1         │  │  KV         │  │  R2         │     │   │
│  │  │  (数据库)   │  │  (缓存)      │  │  (文件存储) │     │   │
│  │  └─────────────┘  └─────────────┘  └─────────────┘     │   │
│  └─────────────────────────────────────────────────────────┘   │
│                              │                                  │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │                      你的域名                              │   │
│  │              blog.yourdomain.com                         │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### 7.2 功能清单

| 功能模块 | 技术方案 | 免费额度够用？ |
|---------|---------|--------------|
| **文章发布** | D1 + Markdown | ✅ |
| **图片上传** | R2 + CDN | ✅ 10GB |
| **评论系统** | D1 | ✅ |
| **访问统计** | KV | ✅ |
| **全文搜索** | D1 LIKE 查询 | ✅ |
| **标签/分类** | D1 | ✅ |
| **RSS 订阅** | Worker 生成 | ✅ |
| **SEO 优化** | Cloudflare 缓存 | ✅ |
| **邮件通知** | Email Routing | ✅ |
| **Markdown 编辑器** | 前端库 | ✅ |

### 7.3 快速部署脚本

```bash
#!/bin/bash
# deploy.sh - 一键部署博客

set -e

echo "🚀 开始部署博客..."

# 1. 部署前端
echo "📦 部署前端到 GitHub Pages..."
git add .
git commit -m "Update blog"
git push origin main

# 2. 部署 Worker API
echo "🔧 部署 API..."
cd api && wrangler deploy && cd ..

# 3. 同步数据库
echo "🗄️ 同步数据库..."
wrangler d1 execute my-blog --remote --file=./schema.sql

echo "✅ 部署完成！"
echo "访问: https://blog.yourdomain.com"
```

---

## 八、快速上手路线图

### 阶段一：静态博客优化（1天）

```
目标：用现有资源提升博客体验
```

1. ✅ 已有：GitHub Pages 托管的博客
2. ➕ 添加：R2 图床（参考第三章）
3. ➕ 添加：自定义域名 SSL
4. ➕ 添加：Cloudflare CDN 加速

**成果：加载速度提升，免费图床**

### 阶段二：添加动态功能（3天）

```
目标：让博客可以互动
```

1. ➕ 创建 Cloudflare Worker（第四章）
2. ➕ 配置 D1 数据库
3. ➕ 添加评论系统（第五章）
4. ➕ 添加文章分类/标签

**成果：全栈博客，可以写文章、收评论**

### 阶段三：数据分析（2天）

```
目标：了解你的读者
```

1. ➕ 接入统计系统（第六章）
2. ➕ 创建统计后台
3. ➕ 分析热门内容

**成果：数据驱动运营**

### 阶段四：持续迭代（长期）

```
目标：打造个人品牌
```

1. ➕ 接入邮件订阅
2. ➕ 添加暗黑模式
3. ➕ 开发小程序/APP
4. ➕ 接入 AI 问答（Workers AI）

---

## 九、成本估算

### 免费方案（推荐）

| 服务 | 免费额度 | 月费用 |
|------|---------|--------|
| GitHub Pages | 无限 | $0 |
| Cloudflare Workers | 10万次/天 | $0 |
| Cloudflare D1 | 100万行/月 | $0 |
| Cloudflare R2 | 10GB/月 | $0 |
| Cloudflare KV | 10万次/月 | $0 |
| Cloudflare CDN | 无限带宽 | $0 |
| **总计** | - | **$0** |

### 付费升级（可选）

| 服务 | 免费限制 | 付费 | 用途 |
|------|---------|------|------|
| Workers | 10万次/天 | $5/月起 | 高流量站点 |
| D1 | 100万行 | $5/月起 | 超大数据库 |
| R2 | 10GB | $0.015/GB | 超大文件存储 |

---

## 十、避坑指南

### ⚠️ 常见问题

| 问题 | 解决方案 |
|------|---------|
| Worker 响应慢 | 开启 KV 缓存热点数据 |
| D1 查询超时 | 优化 SQL，加索引 |
| R2 访问失败 | 检查 CORS 配置 |
| 跨域问题 | Workers 设置正确的 CORS 头 |
| GitHub Actions 失败 | 检查 Secrets 配置 |

### 💡 最佳实践

1. **先免费，后付费**：充分利用 Cloudflare 免费额度
2. **善用缓存**：减少 D1/KV 调用，节省配额
3. **定期清理**：删除过期数据，保持数据库轻盈
4. **监控使用量**：Cloudflare Dashboard 查看配额
5. **做好备份**：D1 数据定期导出

---

## 十一、相关资源

| 资源 | 链接 |
|------|------|
| Cloudflare Dashboard | https://dash.cloudflare.com/ |
| Cloudflare 文档 | https://developers.cloudflare.com/ |
| Wrangler CLI | https://developers.cloudflare.com/workers/wrangler/ |
| GitHub Actions | https://github.com/features/actions |
| Cloudflare Workers 示例 | https://github.com/cloudflare/workers-sdk |
| PicGo 图床工具 | https://github.com/Molunerfinn/PicGo |

---

*文档版本：v1.0*
*最后更新：2026年6月9日*