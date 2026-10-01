/*!
 * 主题面板与偏好控制（三个页面共用）
 * - 存储读写统一走 site-ui 的兜底实现，localStorage 不可用时不再中断脚本
 * - window.QiufengTheme 始终存在，页面脚本不会因为取不到它而整体失效
 * - 图标渲染改为按需作用域，不再每次全文档扫描
 */
(function () {
    'use strict';

    const UI = window.QiufengUI;
    const data = window.QiufengThemeData;

    // 兜底实现：site-ui.js 缺失时仍保证主题可用、页面脚本不崩
    const storage = UI ? UI.storage : (function () {
        const memory = new Map();
        const read = (key) => {
            try {
                return window.localStorage.getItem(key);
            } catch {
                return memory.has(key) ? memory.get(key) : null;
            }
        };
        return {
            available: false,
            get: read,
            set(key, value) {
                try {
                    window.localStorage.setItem(key, value);
                } catch {
                    memory.set(key, String(value));
                }
            },
            remove(key) {
                try {
                    window.localStorage.removeItem(key);
                } catch {
                    memory.delete(key);
                }
            },
        };
    }());

    const reducedMotionPreference = UI ? UI.reducedMotion : window.matchMedia('(prefers-reduced-motion: reduce)');

    function refreshIcons(root) {
        if (window.QiufengIcons) return window.QiufengIcons.render(root);
        if (window.lucide) return window.lucide.createIcons();
        return 0;
    }

    if (!data) {
        console.warn('[theme-controls] 缺少 theme-data.js，主题设置不可用。');
        window.QiufengTheme = Object.freeze({ reducedMotionPreference, refreshIcons });
        return;
    }

    const root = document.documentElement;
    const themeColorMeta = document.getElementById('themeColorMeta');
    const themeToggle = document.getElementById('themeToggle');
    const accentToggle = document.getElementById('accentToggle');
    const accentMenu = document.getElementById('accentMenu');
    const accentOptionsRoot = document.getElementById('accentOptions');
    const effectOptionsRoot = document.getElementById('effectOptions');
    const fallingEffectToggle = document.getElementById('fallingEffect');
    const fallingLayer = document.getElementById('petalLayer');
    const finePointerPreference = window.matchMedia('(hover: hover) and (pointer: fine)');
    const presetMap = new Map(data.presets.map((preset) => [preset.id, preset]));
    const effectMap = new Map(data.effects.map((effect) => [effect.id, effect]));
    const cursorDotMap = new Map(data.cursorDots.map((dot) => [dot.id, dot]));

    const savedAccent = storage.get('qiufeng-accent');
    const savedEffect = storage.get('qiufeng-falling-effect');
    const savedCursorDot = storage.get('qiufeng-cursor-dot');
    const savedCustomCursorDot = storage.get('qiufeng-cursor-dot-custom');
    const defaultCustomCursorDot = '#f2eee7';
    const isHexColor = (value) => /^#[0-9a-f]{6}$/i.test(value || '');

    const state = {
        accent: presetMap.has(savedAccent) ? savedAccent : data.defaultAccent,
        effect: effectMap.has(savedEffect) ? savedEffect : data.defaultEffect,
        effectEnabled: storage.get('qiufeng-petal-effect') !== 'off',
        cursorDot: savedCursorDot === 'custom' || cursorDotMap.has(savedCursorDot) ? savedCursorDot : data.defaultCursorDot,
        customCursorDot: isHexColor(savedCustomCursorDot) ? savedCustomCursorDot : defaultCustomCursorDot,
    };

    let resizeTimer;
    let cursorDotOptions = null;

    /* ---------------- 主题色面板结构（指针圆点设置由脚本插入） ---------------- */

    if (accentMenu) {
        const cursorDotDivider = document.createElement('div');
        cursorDotDivider.className = 'accent-menu-divider';
        const cursorDotSetting = document.createElement('div');
        cursorDotSetting.className = 'cursor-dot-setting';
        const cursorDotLabel = document.createElement('span');
        cursorDotLabel.className = 'cursor-dot-setting-label';
        cursorDotLabel.innerHTML = '<i data-lucide="mouse-pointer-2" aria-hidden="true"></i><span>指针圆点</span>';
        const cursorDotOptionsRoot = document.createElement('div');
        cursorDotOptionsRoot.className = 'cursor-dot-options';
        cursorDotOptionsRoot.setAttribute('role', 'group');
        cursorDotOptionsRoot.setAttribute('aria-label', '指针中心圆点颜色');
        cursorDotSetting.append(cursorDotLabel, cursorDotOptionsRoot);
        accentMenu.append(cursorDotDivider, cursorDotSetting);

        cursorDotOptions = cursorDotOptionsRoot;
    }

    /* ---------------- 指针圆点与圆环 ---------------- */

    function initPointerEffect() {
        const interactiveSelector = [
            'a',
            'button:not(:disabled)',
            'input[type="range"]:not(:disabled)',
            'input[type="checkbox"]:not(:disabled)',
            'input[type="radio"]:not(:disabled)',
            'select:not(:disabled)',
            '.effect-switch:not(:has(input:disabled))',
            '[role="button"]',
            '[role="slider"]',
        ].join(',');
        const nativeCursorSelector = [
            'input:not([type="button"]):not([type="submit"]):not([type="reset"]):not([type="range"]):not([type="checkbox"]):not([type="radio"])',
            'textarea',
            '[contenteditable="true"]',
            '.guestbook-resizer',
            'button:disabled',
            'input:disabled',
        ].join(',');
        let teardown = null;

        function activate() {
            const dot = document.createElement('span');
            const ring = document.createElement('span');
            dot.className = 'custom-cursor custom-cursor-dot';
            ring.className = 'custom-cursor custom-cursor-ring';
            dot.setAttribute('aria-hidden', 'true');
            ring.setAttribute('aria-hidden', 'true');
            document.body.append(dot, ring);
            root.classList.add('has-custom-cursor');

            let targetX = 0;
            let targetY = 0;
            let ringX = 0;
            let ringY = 0;
            let frameId = 0;
            let hasPosition = false;
            let suppressed = false;
            let glowRow = null;
            let glowRect = null;

            function place(element, x, y) {
                element.style.transform = `translate3d(${x}px, ${y}px, 0) translate(-50%, -50%) scale(var(--cursor-scale, 1))`;
            }

            function animateRing() {
                ringX += (targetX - ringX) * 0.16;
                ringY += (targetY - ringY) * 0.16;
                place(ring, ringX, ringY);
                frameId = window.requestAnimationFrame(animateRing);
            }

            function startRing() {
                if (!frameId && !document.hidden) frameId = window.requestAnimationFrame(animateRing);
            }

            function stopRing() {
                if (frameId) window.cancelAnimationFrame(frameId);
                frameId = 0;
            }

            function setVisible(visible) {
                dot.classList.toggle('is-visible', visible);
                ring.classList.toggle('is-visible', visible);
                if (visible) startRing();
                else stopRing();
            }

            function updateTarget(target) {
                suppressed = Boolean(target.closest(nativeCursorSelector));
                const isInteractive = !suppressed && Boolean(target.closest(interactiveSelector));
                ring.classList.toggle('is-hovering', isInteractive);
                setVisible(hasPosition && !suppressed);
            }

            // 悬停行的矩形只在换行时测量一次；滚动/尺寸变化时失效重测
            function invalidateGlow() {
                glowRow = null;
                glowRect = null;
            }

            function updatePostGlow(event) {
                const postRow = event.target.closest('.post-row');
                if (!postRow) {
                    invalidateGlow();
                    return;
                }

                if (postRow !== glowRow || !glowRect) {
                    glowRow = postRow;
                    glowRect = postRow.getBoundingClientRect();
                }

                postRow.style.setProperty('--pointer-x', `${event.clientX - glowRect.left}px`);
                postRow.style.setProperty('--pointer-y', `${event.clientY - glowRect.top}px`);
            }

            function handlePointerMove(event) {
                if (event.pointerType && event.pointerType !== 'mouse') return;
                targetX = event.clientX;
                targetY = event.clientY;
                place(dot, targetX, targetY);
                updateTarget(event.target);
                updatePostGlow(event);

                if (!hasPosition) {
                    hasPosition = true;
                    ringX = targetX;
                    ringY = targetY;
                    place(ring, ringX, ringY);
                }

                if (!suppressed) setVisible(true);
            }

            function handlePointerOver(event) {
                updateTarget(event.target);
            }

            function handlePointerDown() {
                if (!suppressed) ring.classList.add('is-pressed');
            }

            function handlePointerUp(event) {
                ring.classList.remove('is-pressed');
                updateTarget(event.target);
            }

            function handleWindowExit(event) {
                if (event.relatedTarget || event.toElement) return;
                ring.classList.remove('is-hovering', 'is-pressed');
                setVisible(false);
            }

            function handleWindowBlur() {
                ring.classList.remove('is-hovering', 'is-pressed');
                setVisible(false);
            }

            // 页面不可见时停掉逐帧循环，回来后恢复
            function handleVisibility() {
                if (document.hidden) stopRing();
                else if (dot.classList.contains('is-visible')) startRing();
            }

            document.addEventListener('pointermove', handlePointerMove, { passive: true });
            document.addEventListener('pointerover', handlePointerOver, { passive: true });
            document.addEventListener('pointerdown', handlePointerDown, { passive: true });
            window.addEventListener('pointerup', handlePointerUp, { passive: true });
            window.addEventListener('mouseout', handleWindowExit);
            window.addEventListener('blur', handleWindowBlur);
            window.addEventListener('scroll', invalidateGlow, { passive: true });
            window.addEventListener('resize', invalidateGlow);
            document.addEventListener('visibilitychange', handleVisibility);

            return () => {
                document.removeEventListener('pointermove', handlePointerMove);
                document.removeEventListener('pointerover', handlePointerOver);
                document.removeEventListener('pointerdown', handlePointerDown);
                window.removeEventListener('pointerup', handlePointerUp);
                window.removeEventListener('mouseout', handleWindowExit);
                window.removeEventListener('blur', handleWindowBlur);
                window.removeEventListener('scroll', invalidateGlow);
                window.removeEventListener('resize', invalidateGlow);
                document.removeEventListener('visibilitychange', handleVisibility);
                stopRing();
                root.classList.remove('has-custom-cursor');
                dot.remove();
                ring.remove();
            };
        }

        function syncPointerEffect() {
            const shouldEnable = finePointerPreference.matches && !reducedMotionPreference.matches;
            if (shouldEnable && !teardown) teardown = activate();
            else if (!shouldEnable && teardown) {
                teardown();
                teardown = null;
            }
        }

        finePointerPreference.addEventListener('change', syncPointerEffect);
        reducedMotionPreference.addEventListener('change', syncPointerEffect);
        syncPointerEffect();
    }

    /* ---------------- 配色 ---------------- */

    function getScheme(preset) {
        return preset[root.dataset.theme === 'light' ? 'light' : 'dark'];
    }

    function renderAccentOptions() {
        if (!accentOptionsRoot) return;
        const fragment = document.createDocumentFragment();
        const scheme = root.dataset.theme === 'light' ? 'light' : 'dark';

        data.groups.forEach((group) => {
            const presets = data.presets.filter((preset) => preset.group === group.id);
            if (!presets.length) return;

            const section = document.createElement('div');
            section.className = 'accent-group';

            const label = document.createElement('p');
            label.className = 'accent-group-label';
            label.textContent = group.name;

            const options = document.createElement('div');
            options.className = 'accent-group-options';
            presets.forEach((preset) => {
                const button = document.createElement('button');
                button.className = 'accent-option';
                button.type = 'button';
                button.dataset.accent = preset.id;
                button.setAttribute('role', 'radio');
                button.setAttribute('aria-checked', 'false');
                button.tabIndex = -1;

                const swatch = document.createElement('span');
                swatch.className = 'accent-swatch';
                swatch.setAttribute('aria-hidden', 'true');
                // 色块跟随当前明暗模式，避免亮色主题里显示暗色配色
                swatch.style.setProperty('--swatch', preset[scheme].accent);

                const name = document.createElement('span');
                name.textContent = preset.name;
                button.append(swatch, name);
                options.appendChild(button);
            });

            section.append(label, options);
            fragment.appendChild(section);
        });

        accentOptionsRoot.replaceChildren(fragment);
    }

    function renderEffectOptions() {
        if (!effectOptionsRoot) return;
        const fragment = document.createDocumentFragment();
        data.effects.forEach((effect) => {
            const button = document.createElement('button');
            button.className = 'effect-option';
            button.type = 'button';
            button.dataset.effect = effect.id;
            button.setAttribute('role', 'radio');
            button.setAttribute('aria-checked', 'false');
            button.tabIndex = -1;
            button.innerHTML = `<i data-lucide="${effect.icon}" aria-hidden="true"></i><span>${effect.name}</span>`;
            fragment.appendChild(button);
        });
        effectOptionsRoot.replaceChildren(fragment);
    }

    function renderCursorDotOptions() {
        if (!cursorDotOptions) return;
        const fragment = document.createDocumentFragment();
        data.cursorDots.forEach((dot) => {
            const button = document.createElement('button');
            button.className = 'cursor-dot-option';
            button.type = 'button';
            button.dataset.cursorDot = dot.id;
            button.setAttribute('aria-label', dot.name);
            button.setAttribute('aria-pressed', 'false');
            button.title = dot.name;

            const swatch = document.createElement('span');
            swatch.className = 'cursor-dot-swatch';
            swatch.setAttribute('aria-hidden', 'true');
            swatch.style.setProperty('--cursor-dot-swatch', dot.color || 'var(--accent-strong)');
            button.appendChild(swatch);
            fragment.appendChild(button);
        });

        const customLabel = document.createElement('label');
        customLabel.className = 'cursor-dot-custom';
        customLabel.title = '自定义颜色';
        const customInput = document.createElement('input');
        customInput.type = 'color';
        customInput.value = state.customCursorDot;
        customInput.setAttribute('aria-label', '自定义指针圆点颜色');
        customLabel.appendChild(customInput);
        fragment.appendChild(customLabel);
        cursorDotOptions.replaceChildren(fragment);
    }

    function updateRadioOptions(container, dataKey, value) {
        if (!container) return;
        container.querySelectorAll(`[data-${dataKey}]`).forEach((option) => {
            const selected = option.dataset[dataKey] === value;
            option.setAttribute('aria-checked', String(selected));
            option.tabIndex = selected ? 0 : -1;
        });
    }

    /* ---------------- 下落动效 ---------------- */

    function createFallingElements() {
        if (!fallingLayer) return;
        fallingLayer.replaceChildren();
        if (!state.effectEnabled || reducedMotionPreference.matches) return;

        const preset = presetMap.get(state.accent);
        const palette = getScheme(preset).falling[state.effect];
        if (!palette || palette.length === 0) return;

        const isMobile = window.matchMedia('(max-width: 760px)').matches;
        const count = isMobile ? 6 : 12;
        const edgeWidth = isMobile ? 12 : 18;

        for (let index = 0; index < count; index += 1) {
            const item = document.createElement('span');
            const useLeftEdge = Math.random() < 0.5;
            const left = useLeftEdge ? Math.random() * edgeWidth : 100 - edgeWidth + Math.random() * edgeWidth;
            const size = 9 + Math.random() * 7;
            const duration = 11 + Math.random() * 8;
            const drift = -58 + Math.random() * 116;

            item.className = `petal falling-${state.effect}`;
            item.style.setProperty('--fall-color', palette[index % palette.length]);
            item.style.setProperty('--petal-left', `${left}%`);
            item.style.setProperty('--petal-size', `${size}px`);
            item.style.setProperty('--petal-height', `${size * 0.68}px`);
            item.style.setProperty('--petal-duration', `${duration}s`);
            item.style.setProperty('--petal-delay', `${-Math.random() * duration}s`);
            item.style.setProperty('--petal-drift', `${drift}px`);
            item.style.setProperty('--petal-drift-mid', `${drift * 0.42}px`);
            item.style.setProperty('--petal-opacity', String(0.26 + Math.random() * 0.28));
            fallingLayer.appendChild(item);
        }
    }

    /* ---------------- 圆点混色 ---------------- */

    function parseRgb(color) {
        const channels = color.match(/[\d.]+/g)?.slice(0, 3).map(Number);
        return channels?.length === 3 && channels.every(Number.isFinite) ? channels : null;
    }

    let blendProbe = null;
    let lastBlendKey = '';

    function syncCursorBlendColor() {
        if (!blendProbe) {
            blendProbe = document.createElement('span');
            blendProbe.setAttribute('aria-hidden', 'true');
            blendProbe.style.cssText = 'position:fixed;top:0;left:0;width:0;height:0;visibility:hidden;pointer-events:none;color:var(--cursor-dot-color);background-color:var(--bg);';
            document.body.appendChild(blendProbe);
        }

        const computed = getComputedStyle(blendProbe);
        const cursorColor = parseRgb(computed.color);
        const backgroundColor = parseRgb(computed.backgroundColor);
        if (!cursorColor || !backgroundColor) return;

        const key = `${cursorColor.join()}|${backgroundColor.join()}`;
        if (key === lastBlendKey) return;
        lastBlendKey = key;

        const blendChannels = cursorColor.map((channel, index) => {
            const background = backgroundColor[index];
            if (background + channel <= 255) return Math.round(background + channel);
            if (background - channel >= 0) return Math.round(background - channel);
            return background < 128 ? 255 : 0;
        });
        root.style.setProperty('--cursor-dot-blend-color', `rgb(${blendChannels.join(' ')})`);
    }

    /* ---------------- 状态设置 ---------------- */

    function setAccent(accent, persist = true) {
        state.accent = presetMap.has(accent) ? accent : data.defaultAccent;
        const scheme = getScheme(presetMap.get(state.accent));
        root.dataset.accent = state.accent;
        root.style.setProperty('--accent', scheme.accent);
        root.style.setProperty('--accent-strong', scheme.accentStrong);
        updateRadioOptions(accentOptionsRoot, 'accent', state.accent);
        if (persist) storage.set('qiufeng-accent', state.accent);
        syncCursorBlendColor();
        createFallingElements();
    }

    function setCursorDot(cursorDot, persist = true) {
        state.cursorDot = cursorDot === 'custom' || cursorDotMap.has(cursorDot) ? cursorDot : data.defaultCursorDot;
        const preset = cursorDotMap.get(state.cursorDot);
        const color = state.cursorDot === 'custom' ? state.customCursorDot : preset?.color || 'var(--accent-strong)';
        root.dataset.cursorDot = state.cursorDot;
        root.style.setProperty('--cursor-dot-color', color);
        syncCursorBlendColor();

        if (cursorDotOptions) {
            cursorDotOptions.querySelectorAll('[data-cursor-dot]').forEach((option) => {
                option.setAttribute('aria-pressed', String(option.dataset.cursorDot === state.cursorDot));
            });
            cursorDotOptions.querySelector('.cursor-dot-custom')?.classList.toggle('is-selected', state.cursorDot === 'custom');
        }
        if (persist) storage.set('qiufeng-cursor-dot', state.cursorDot);
    }

    function setCustomCursorDot(color) {
        if (!isHexColor(color)) return;
        state.customCursorDot = color;
        storage.set('qiufeng-cursor-dot-custom', color);
        setCursorDot('custom');
    }

    function setTheme(theme, persist = true) {
        const nextTheme = theme === 'light' ? 'light' : 'dark';
        root.dataset.theme = nextTheme;
        if (themeColorMeta) themeColorMeta.content = data.pageColors[nextTheme];
        if (themeToggle) themeToggle.innerHTML = `<i data-lucide="${nextTheme === 'dark' ? 'sun' : 'moon'}" aria-hidden="true"></i>`;
        if (persist) storage.set('qiufeng-theme', nextTheme);
        setAccent(state.accent, false);
        if (themeToggle) refreshIcons(themeToggle);
    }

    function setEffect(effect, persist = true) {
        state.effect = effectMap.has(effect) ? effect : data.defaultEffect;
        updateRadioOptions(effectOptionsRoot, 'effect', state.effect);
        if (persist) storage.set('qiufeng-falling-effect', state.effect);
        createFallingElements();
    }

    function setEffectEnabled(enabled, persist = true) {
        state.effectEnabled = Boolean(enabled);
        if (fallingEffectToggle) {
            fallingEffectToggle.checked = state.effectEnabled && !reducedMotionPreference.matches;
            fallingEffectToggle.disabled = reducedMotionPreference.matches;
        }
        if (persist) storage.set('qiufeng-petal-effect', state.effectEnabled ? 'on' : 'off');
        createFallingElements();
    }

    function setAccentMenu(open) {
        if (!accentMenu || !accentToggle) return;
        if (!open && accentMenu.contains(document.activeElement)) accentToggle.focus();
        accentMenu.hidden = !open;
        accentToggle.setAttribute('aria-expanded', String(open));
    }

    function handleRadioKeydown(event, container, dataKey, selectOption) {
        const handledKeys = ['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'Home', 'End'];
        const currentOption = event.target.closest(`[data-${dataKey}]`);
        if (!currentOption || !handledKeys.includes(event.key)) return;

        const options = Array.from(container.querySelectorAll(`[data-${dataKey}]`));
        const currentIndex = options.indexOf(currentOption);
        event.preventDefault();
        let nextIndex = currentIndex;
        if (event.key === 'Home') nextIndex = 0;
        else if (event.key === 'End') nextIndex = options.length - 1;
        else if (event.key === 'ArrowLeft' || event.key === 'ArrowUp') nextIndex = (currentIndex - 1 + options.length) % options.length;
        else nextIndex = (currentIndex + 1) % options.length;

        const nextOption = options[nextIndex];
        selectOption(nextOption.dataset[dataKey]);
        nextOption.focus();
    }

    /* ---------------- 初始化 ---------------- */

    initPointerEffect();
    renderAccentOptions();
    renderEffectOptions();
    renderCursorDotOptions();

    accentToggle?.addEventListener('click', () => setAccentMenu(accentMenu.hidden));
    themeToggle?.addEventListener('click', () => setTheme(root.dataset.theme === 'dark' ? 'light' : 'dark'));
    accentOptionsRoot?.addEventListener('click', (event) => {
        const option = event.target.closest('[data-accent]');
        if (!option) return;
        setAccent(option.dataset.accent);
        setAccentMenu(false);
    });
    accentOptionsRoot?.addEventListener('keydown', (event) => handleRadioKeydown(event, accentOptionsRoot, 'accent', setAccent));
    effectOptionsRoot?.addEventListener('click', (event) => {
        const option = event.target.closest('[data-effect]');
        if (option) setEffect(option.dataset.effect);
    });
    effectOptionsRoot?.addEventListener('keydown', (event) => handleRadioKeydown(event, effectOptionsRoot, 'effect', setEffect));
    cursorDotOptions?.addEventListener('click', (event) => {
        const option = event.target.closest('[data-cursor-dot]');
        if (option) setCursorDot(option.dataset.cursorDot);
    });
    cursorDotOptions?.querySelector('input[type="color"]')?.addEventListener('input', (event) => {
        setCustomCursorDot(event.target.value);
    });
    fallingEffectToggle?.addEventListener('change', () => setEffectEnabled(fallingEffectToggle.checked));
    reducedMotionPreference.addEventListener('change', () => setEffectEnabled(state.effectEnabled, false));
    window.addEventListener('resize', () => {
        window.clearTimeout(resizeTimer);
        resizeTimer = window.setTimeout(createFallingElements, 180);
    });
    document.addEventListener('click', (event) => {
        if (!event.target.closest('.accent-picker')) setAccentMenu(false);
    });
    document.addEventListener('keydown', (event) => {
        if (event.key === 'Escape' && accentMenu && !accentMenu.hidden) setAccentMenu(false);
    });

    const savedTheme = storage.get('qiufeng-theme');
    const systemPrefersLight = window.matchMedia('(prefers-color-scheme: light)').matches;
    setTheme(savedTheme || (systemPrefersLight ? 'light' : 'dark'), false);
    setAccent(state.accent, false);
    setEffect(state.effect, false);
    setEffectEnabled(state.effectEnabled, false);
    setCursorDot(state.cursorDot, false);
    syncCursorBlendColor();

    window.QiufengTheme = Object.freeze({
        reducedMotionPreference,
        refreshIcons,
        setTheme,
        setAccent,
        setEffect,
        setEffectEnabled,
        setCursorDot,
        refreshFallingEffect: createFallingElements,
    });
}());
