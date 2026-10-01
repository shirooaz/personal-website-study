// 从 lucide 全量包提取站点实际用到的图标子集，生成 assets/icons.js
// 用法: node gen-icons.js <站点目录>
const fs = require('fs');
const path = require('path');

const siteDir = process.argv[2];
if (!siteDir) {
  console.error('缺少站点目录参数');
  process.exit(1);
}

const lucide = require(path.join(siteDir, 'assets', 'lucide.min.js'));
const allIcons = lucide.icons;
if (!allIcons) {
  console.error('未能从 lucide 包中读取 icons 映射');
  process.exit(1);
}

const scanFiles = [
  'index.html', 'article.html', 'timeline.html',
  'script.js', 'article.js', 'timeline.js',
  'theme-controls.js', 'theme-data.js',
];

const names = new Set();
for (const file of scanFiles) {
  const full = path.join(siteDir, file);
  if (!fs.existsSync(full)) continue;
  const text = fs.readFileSync(full, 'utf8');
  for (const m of text.matchAll(/data-lucide(?:=|":)\s*"([a-z0-9-]+)"/g)) names.add(m[1]);
  for (const m of text.matchAll(/dataset\.lucide\s*=\s*'([a-z0-9-]+)'/g)) names.add(m[1]);
  // theme-data.js 里的动效注册表（icon 字段在运行时被拼进 data-lucide）
  for (const m of text.matchAll(/\bicon:\s*'([a-z0-9-]+)'/g)) names.add(m[1]);
}
// 由 JS 模板拼接（运行时才知道取哪个）的图标，手工登记
for (const extra of ['menu', 'x', 'sun', 'moon']) names.add(extra);

const pascal = (kebab) =>
  kebab.split('-').map((part) => part.charAt(0).toUpperCase() + part.slice(1)).join('');

const serializeAttrs = (attrs) =>
  Object.entries(attrs || {})
    .map(([key, value]) => {
      if (value === true) return ` ${key}=""`;
      if (value === false || value == null) return '';
      return ` ${key}="${String(value).replace(/"/g, '&quot;')}"`;
    })
    .join('');

const serializeNode = (node) => {
  const [tag, attrs, children] = node;
  const inner = Array.isArray(children) ? children.map(serializeNode).join('') : '';
  return `<${tag}${serializeAttrs(attrs)}>${inner}</${tag}>`;
};

const entries = [];
const missing = [];
for (const kebab of [...names].sort()) {
  const key = pascal(kebab);
  const icon = allIcons[key] || Object.entries(allIcons).find(([k]) => k.toLowerCase() === key.toLowerCase())?.[1];
  if (!icon) {
    missing.push(kebab);
    continue;
  }
  const children = icon[2];
  if (!Array.isArray(children) || children.length === 0) {
    missing.push(kebab);
    continue;
  }
  entries.push([kebab, children.map(serializeNode).join('')]);
}

if (missing.length) {
  console.error('以下图标在 lucide 包中找不到:', missing.join(', '));
  process.exit(2);
}

const body = entries.map(([name, markup]) => `        '${name}': '${markup.replace(/'/g, "\\'")}',`).join('\n');

const out = `/*!
 * 图标子集 —— 由 lucide v${(require(path.join(siteDir, 'assets', 'lucide.min.js')).version) || '0.468.0'} 数据生成，仅包含本站用到的 ${entries.length} 个图标。
 * 替代原 358 KB 的 lucide 全量包（约占其 ${(JSON.stringify(entries).length / 1024).toFixed(1)} KB）。
 * 生成方式见 README「本次改进」一节；新增图标时在 ICONS 中补一条即可。
 */
(function () {
    'use strict';

    const ICON_ATTRS = {
        xmlns: 'http://www.w3.org/2000/svg',
        width: '24',
        height: '24',
        viewBox: '0 0 24 24',
        fill: 'none',
        stroke: 'currentColor',
        'stroke-width': '2',
        'stroke-linecap': 'round',
        'stroke-linejoin': 'round',
    };

    const ICONS = {
${body}
    };

    const NS = 'http://www.w3.org/2000/svg';

    function toKebab(value) {
        return String(value)
            .replace(/([a-z0-9])([A-Z])/g, '$1-$2')
            .replace(/[\\s_]+/g, '-')
            .toLowerCase();
    }

    /**
     * 把 root 内所有 [data-lucide] 占位元素替换为内联 SVG。
     * 只处理本站登记的图标；未知名称保持原样并给出一次提示。
     */
    function render(root) {
        const scope = root && root.querySelectorAll ? root : document;
        const targets = [];
        // 允许直接把占位元素本身作为 root 传入
        if (scope !== document && scope.nodeType === 1 && scope.matches('[data-lucide]')) targets.push(scope);
        scope.querySelectorAll('[data-lucide]').forEach((element) => targets.push(element));
        if (targets.length === 0) return 0;

        const unknown = new Set();

        targets.forEach((element) => {
            const name = toKebab(element.getAttribute('data-lucide'));
            const markup = ICONS[name];
            if (!markup) {
                unknown.add(name);
                return;
            }

            const svg = document.createElementNS(NS, 'svg');
            for (const [key, value] of Object.entries(ICON_ATTRS)) svg.setAttribute(key, value);

            // 保留占位元素上除 data-lucide 外的属性（aria-hidden、title 等）
            for (const attr of Array.from(element.attributes)) {
                if (attr.name === 'data-lucide') continue;
                if (attr.name === 'class') continue;
                svg.setAttribute(attr.name, attr.value);
            }

            const extraClass = element.getAttribute('class');
            svg.setAttribute('class', ['lucide', \`lucide-\${name}\`, extraClass].filter(Boolean).join(' '));
            svg.setAttribute('aria-hidden', element.getAttribute('aria-hidden') ?? 'true');
            svg.innerHTML = markup;

            element.replaceWith(svg);
        });

        if (unknown.size) {
            console.warn('[icons] 未登记的图标:', [...unknown].join(', '));
        }
        return targets.length;
    }

    window.QiufengIcons = Object.freeze({
        render,
        names: Object.freeze(Object.keys(ICONS)),
    });
}());
`;

const target = path.join(siteDir, 'assets', 'icons.js');
fs.writeFileSync(target, out, 'utf8');
console.log(`写入 ${target}`);
console.log(`图标数量: ${entries.length} -> ${entries.map(([n]) => n).join(', ')}`);
console.log(`文件大小: ${fs.statSync(target).size} 字节`);
