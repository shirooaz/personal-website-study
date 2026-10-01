/*!
 * 图标子集 —— 由 lucide v0.468.0 数据生成，仅包含本站用到的 18 个图标。
 * 替代原 358 KB 的 lucide 全量包（约占其 3.3 KB）。
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
        'arrow-down-right': '<path d="m7 7 10 10"></path><path d="M17 7v10H7"></path>',
        'arrow-left': '<path d="m12 19-7-7 7-7"></path><path d="M19 12H5"></path>',
        'arrow-right': '<path d="M5 12h14"></path><path d="m12 5 7 7-7 7"></path>',
        'arrow-up': '<path d="m5 12 7-7 7 7"></path><path d="M12 19V5"></path>',
        'arrow-up-right': '<path d="M7 7h10v10"></path><path d="M7 17 17 7"></path>',
        'flower-2': '<path d="M12 5a3 3 0 1 1 3 3m-3-3a3 3 0 1 0-3 3m3-3v1M9 8a3 3 0 1 0 3 3M9 8h1m5 0a3 3 0 1 1-3 3m3-3h-1m-2 3v-1"></path><circle cx="12" cy="8" r="2"></circle><path d="M12 10v12"></path><path d="M12 22c4.2 0 7-1.667 7-5-4.2 0-7 1.667-7 5Z"></path><path d="M12 22c-4.2 0-7-1.667-7-5 4.2 0 7 1.667 7 5Z"></path>',
        'grip-vertical': '<circle cx="9" cy="12" r="1"></circle><circle cx="9" cy="5" r="1"></circle><circle cx="9" cy="19" r="1"></circle><circle cx="15" cy="12" r="1"></circle><circle cx="15" cy="5" r="1"></circle><circle cx="15" cy="19" r="1"></circle>',
        'leaf': '<path d="M11 20A7 7 0 0 1 9.8 6.1C15.5 5 17 4.48 19 2c1 2 2 4.18 2 8 0 5.5-4.78 10-10 10Z"></path><path d="M2 21c0-3 1.85-5.36 5.08-6C9.5 14.52 12 13 13 12"></path>',
        'menu': '<line x1="4" x2="20" y1="12" y2="12"></line><line x1="4" x2="20" y1="6" y2="6"></line><line x1="4" x2="20" y1="18" y2="18"></line>',
        'moon': '<path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z"></path>',
        'mouse-pointer-2': '<path d="M4.037 4.688a.495.495 0 0 1 .651-.651l16 6.5a.5.5 0 0 1-.063.947l-6.124 1.58a2 2 0 0 0-1.438 1.435l-1.579 6.126a.5.5 0 0 1-.947.063z"></path>',
        'palette': '<circle cx="13.5" cy="6.5" r=".5" fill="currentColor"></circle><circle cx="17.5" cy="10.5" r=".5" fill="currentColor"></circle><circle cx="8.5" cy="7.5" r=".5" fill="currentColor"></circle><circle cx="6.5" cy="12.5" r=".5" fill="currentColor"></circle><path d="M12 2C6.5 2 2 6.5 2 12s4.5 10 10 10c.926 0 1.648-.746 1.648-1.688 0-.437-.18-.835-.437-1.125-.29-.289-.438-.652-.438-1.125a1.64 1.64 0 0 1 1.668-1.668h1.996c3.051 0 5.555-2.503 5.555-5.554C21.965 6.012 17.461 2 12 2z"></path>',
        'refresh-cw': '<path d="M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8"></path><path d="M21 3v5h-5"></path><path d="M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16"></path><path d="M8 16H3v5"></path>',
        'search': '<circle cx="11" cy="11" r="8"></circle><path d="m21 21-4.3-4.3"></path>',
        'send': '<path d="M14.536 21.686a.5.5 0 0 0 .937-.024l6.5-19a.496.496 0 0 0-.635-.635l-19 6.5a.5.5 0 0 0-.024.937l7.93 3.18a2 2 0 0 1 1.112 1.11z"></path><path d="m21.854 2.147-10.94 10.939"></path>',
        'sprout': '<path d="M7 20h10"></path><path d="M10 20c5.5-2.5.8-6.4 3-10"></path><path d="M9.5 9.4c1.1.8 1.8 2.2 2.3 3.7-2 .4-3.5.4-4.8-.3-1.2-.6-2.3-1.9-3-4.2 2.8-.5 4.4 0 5.5.8z"></path><path d="M14.1 6a7 7 0 0 0-1.1 4c1.9-.1 3.3-.6 4.3-1.4 1-1 1.6-2.3 1.7-4.6-2.7.1-4 1-4.9 2z"></path>',
        'sun': '<circle cx="12" cy="12" r="4"></circle><path d="M12 2v2"></path><path d="M12 20v2"></path><path d="m4.93 4.93 1.41 1.41"></path><path d="m17.66 17.66 1.41 1.41"></path><path d="M2 12h2"></path><path d="M20 12h2"></path><path d="m6.34 17.66-1.41 1.41"></path><path d="m19.07 4.93-1.41 1.41"></path>',
        'x': '<path d="M18 6 6 18"></path><path d="m6 6 12 12"></path>',
    };

    const NS = 'http://www.w3.org/2000/svg';

    function toKebab(value) {
        return String(value)
            .replace(/([a-z0-9])([A-Z])/g, '$1-$2')
            .replace(/[\s_]+/g, '-')
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
            svg.setAttribute('class', ['lucide', `lucide-${name}`, extraClass].filter(Boolean).join(' '));
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
