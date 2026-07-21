(function () {
    const data = window.QiufengThemeData;
    if (!data) return;

    const root = document.documentElement;
    const themeColorMeta = document.getElementById('themeColorMeta');
    const themeToggle = document.getElementById('themeToggle');
    const accentToggle = document.getElementById('accentToggle');
    const accentMenu = document.getElementById('accentMenu');
    const accentOptionsRoot = document.getElementById('accentOptions');
    const effectOptionsRoot = document.getElementById('effectOptions');
    const fallingEffectToggle = document.getElementById('fallingEffect');
    const fallingLayer = document.getElementById('petalLayer');
    const reducedMotionPreference = window.matchMedia('(prefers-reduced-motion: reduce)');
    const finePointerPreference = window.matchMedia('(hover: hover) and (pointer: fine)');
    const presetMap = new Map(data.presets.map((preset) => [preset.id, preset]));
    const effectMap = new Map(data.effects.map((effect) => [effect.id, effect]));
    const savedAccent = localStorage.getItem('qiufeng-accent');
    const savedEffect = localStorage.getItem('qiufeng-falling-effect');
    const state = {
        accent: presetMap.has(savedAccent) ? savedAccent : data.defaultAccent,
        effect: effectMap.has(savedEffect) ? savedEffect : data.defaultEffect,
        effectEnabled: localStorage.getItem('qiufeng-petal-effect') !== 'off',
    };
    let resizeTimer;

    function refreshIcons() {
        if (window.lucide) window.lucide.createIcons();
    }

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
                if (!frameId) frameId = window.requestAnimationFrame(animateRing);
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

            function updatePostGlow(event) {
                const postRow = event.target.closest('.post-row');
                if (!postRow) return;

                const rect = postRow.getBoundingClientRect();
                postRow.style.setProperty('--pointer-x', `${event.clientX - rect.left}px`);
                postRow.style.setProperty('--pointer-y', `${event.clientY - rect.top}px`);
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

            document.addEventListener('pointermove', handlePointerMove, { passive: true });
            document.addEventListener('pointerover', handlePointerOver, { passive: true });
            document.addEventListener('pointerdown', handlePointerDown, { passive: true });
            window.addEventListener('pointerup', handlePointerUp, { passive: true });
            window.addEventListener('mouseout', handleWindowExit);
            window.addEventListener('blur', handleWindowBlur);

            return () => {
                document.removeEventListener('pointermove', handlePointerMove);
                document.removeEventListener('pointerover', handlePointerOver);
                document.removeEventListener('pointerdown', handlePointerDown);
                window.removeEventListener('pointerup', handlePointerUp);
                window.removeEventListener('mouseout', handleWindowExit);
                window.removeEventListener('blur', handleWindowBlur);
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

    function getScheme(preset) {
        return preset[root.dataset.theme === 'light' ? 'light' : 'dark'];
    }

    function renderAccentOptions() {
        const fragment = document.createDocumentFragment();

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
                swatch.style.setProperty('--swatch', preset.dark.accent);

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

    function updateRadioOptions(container, dataKey, value) {
        container.querySelectorAll(`[data-${dataKey}]`).forEach((option) => {
            const selected = option.dataset[dataKey] === value;
            option.setAttribute('aria-checked', String(selected));
            option.tabIndex = selected ? 0 : -1;
        });
    }

    function createFallingElements() {
        fallingLayer.replaceChildren();
        if (!state.effectEnabled || reducedMotionPreference.matches) return;

        const preset = presetMap.get(state.accent);
        const palette = getScheme(preset).falling[state.effect];
        const isMobile = window.matchMedia('(max-width: 760px)').matches;
        const count = isMobile ? 6 : 12;
        const edgeWidth = isMobile ? 12 : 18;

        for (let index = 0; index < count; index += 1) {
            const item = document.createElement('span');
            const useLeftEdge = Math.random() < 0.5;
            const left = useLeftEdge
                ? Math.random() * edgeWidth
                : 100 - edgeWidth + Math.random() * edgeWidth;
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

    function setAccent(accent, persist = true) {
        state.accent = presetMap.has(accent) ? accent : data.defaultAccent;
        const scheme = getScheme(presetMap.get(state.accent));
        root.dataset.accent = state.accent;
        root.style.setProperty('--accent', scheme.accent);
        root.style.setProperty('--accent-strong', scheme.accentStrong);
        updateRadioOptions(accentOptionsRoot, 'accent', state.accent);
        if (persist) localStorage.setItem('qiufeng-accent', state.accent);
        createFallingElements();
    }

    function setTheme(theme, persist = true) {
        const nextTheme = theme === 'light' ? 'light' : 'dark';
        root.dataset.theme = nextTheme;
        themeColorMeta.content = data.pageColors[nextTheme];
        themeToggle.innerHTML = `<i data-lucide="${nextTheme === 'dark' ? 'sun' : 'moon'}" aria-hidden="true"></i>`;
        if (persist) localStorage.setItem('qiufeng-theme', nextTheme);
        setAccent(state.accent, false);
        refreshIcons();
    }

    function setEffect(effect, persist = true) {
        state.effect = effectMap.has(effect) ? effect : data.defaultEffect;
        updateRadioOptions(effectOptionsRoot, 'effect', state.effect);
        if (persist) localStorage.setItem('qiufeng-falling-effect', state.effect);
        createFallingElements();
    }

    function setEffectEnabled(enabled, persist = true) {
        state.effectEnabled = Boolean(enabled);
        fallingEffectToggle.checked = state.effectEnabled && !reducedMotionPreference.matches;
        fallingEffectToggle.disabled = reducedMotionPreference.matches;
        if (persist) localStorage.setItem('qiufeng-petal-effect', state.effectEnabled ? 'on' : 'off');
        createFallingElements();
    }

    function setAccentMenu(open) {
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

    initPointerEffect();
    renderAccentOptions();
    renderEffectOptions();

    accentToggle.addEventListener('click', () => setAccentMenu(accentMenu.hidden));
    themeToggle.addEventListener('click', () => setTheme(root.dataset.theme === 'dark' ? 'light' : 'dark'));
    accentOptionsRoot.addEventListener('click', (event) => {
        const option = event.target.closest('[data-accent]');
        if (!option) return;
        setAccent(option.dataset.accent);
        setAccentMenu(false);
    });
    accentOptionsRoot.addEventListener('keydown', (event) => handleRadioKeydown(event, accentOptionsRoot, 'accent', setAccent));
    effectOptionsRoot.addEventListener('click', (event) => {
        const option = event.target.closest('[data-effect]');
        if (option) setEffect(option.dataset.effect);
    });
    effectOptionsRoot.addEventListener('keydown', (event) => handleRadioKeydown(event, effectOptionsRoot, 'effect', setEffect));
    fallingEffectToggle.addEventListener('change', () => setEffectEnabled(fallingEffectToggle.checked));
    reducedMotionPreference.addEventListener('change', () => setEffectEnabled(state.effectEnabled, false));
    window.addEventListener('resize', () => {
        window.clearTimeout(resizeTimer);
        resizeTimer = window.setTimeout(createFallingElements, 180);
    });
    document.addEventListener('click', (event) => {
        if (!event.target.closest('.accent-picker')) setAccentMenu(false);
    });
    document.addEventListener('keydown', (event) => {
        if (event.key === 'Escape') setAccentMenu(false);
    });

    const savedTheme = localStorage.getItem('qiufeng-theme');
    const systemPrefersLight = window.matchMedia('(prefers-color-scheme: light)').matches;
    setTheme(savedTheme || (systemPrefersLight ? 'light' : 'dark'), false);
    setAccent(state.accent, false);
    setEffect(state.effect, false);
    setEffectEnabled(state.effectEnabled, false);

    window.QiufengTheme = Object.freeze({
        reducedMotionPreference,
        refreshIcons,
        setTheme,
        setAccent,
        setEffect,
        setEffectEnabled,
        refreshFallingEffect: createFallingElements,
    });
}());
