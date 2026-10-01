/*!
 * 时间轴页脚本：年份分组、分类筛选、轴线进度
 * 公共部分见 site-ui.js；轴线相关的布局测量统一缓存，滚动帧内不再读取布局
 */
(function () {
    'use strict';

    const UI = window.QiufengUI;
    if (!UI) {
        document.querySelectorAll('.reveal').forEach((element) => element.classList.add('is-visible'));
        console.error('[timeline.js] 未找到 site-ui.js，时间轴未渲染。');
        return;
    }

    const { normalizeEvents, refreshIcons, initReveal, initSiteChrome, headerOffset, reducedMotion } = UI;

    const timelineList = document.getElementById('timelineList');
    const timelineFilters = document.getElementById('timelineFilters');
    const timelineYears = document.getElementById('timelineYears');
    const timelineCount = document.getElementById('timelineCount');
    const timelineSince = document.getElementById('timelineSince');
    const timelineYearRange = document.getElementById('timelineYearRange');
    const timelineTrack = document.getElementById('timelineTrack');
    const timelineAxis = document.getElementById('timelineAxis');
    const timelineAxisProgress = document.getElementById('timelineAxisProgress');

    const categoryLabels = Object.freeze({
        all: '全部',
        site: '小站',
        daily: '日常',
        writing: '写作',
        milestone: '里程碑',
    });

    const sortedEvents = normalizeEvents(window.timelineEvents);
    let activeCategory = 'all';
    let frameId = 0;

    // 缓存起来的文档坐标，避免每帧对每个节点调用 getBoundingClientRect()
    let axisTop = 0;
    let axisHeight = 1;
    let eventAnchors = [];
    let yearAnchors = [];
    let currentEvent = null;
    let needsMeasure = true;

    function getEventYear(event) {
        return String(event.date || '').slice(0, 4) || '未定';
    }

    function formatFullDate(dateString) {
        const [year, month, day] = String(dateString).split('-');
        if (!month) return year;
        if (!day) return `${year}年${Number(month)}月`;
        return `${year}年${Number(month)}月${Number(day)}日`;
    }

    function createEventMeta(event) {
        const meta = document.createElement('div');
        meta.className = 'timeline-event-meta';

        const category = document.createElement('span');
        category.textContent = categoryLabels[event.category] || '记录';
        meta.appendChild(category);

        if (event.version) {
            const version = document.createElement('span');
            version.textContent = event.version;
            meta.appendChild(version);
        }

        return meta;
    }

    function createTimelineEvent(event, index) {
        const item = document.createElement('article');
        item.className = 'timeline-event reveal';
        item.id = event.id;
        item.style.setProperty('--event-order', String(Math.min(index, 6)));

        const marker = document.createElement('span');
        marker.className = 'timeline-event-marker';
        marker.setAttribute('aria-hidden', 'true');

        const body = document.createElement('div');
        body.className = 'timeline-event-body';

        const headingMeta = document.createElement('div');
        headingMeta.className = 'timeline-event-heading-meta';
        const date = document.createElement('time');
        date.className = 'timeline-event-date';
        date.dateTime = event.date;
        date.textContent = formatFullDate(event.date);
        headingMeta.append(date, createEventMeta(event));
        body.appendChild(headingMeta);

        const title = document.createElement('h3');
        title.textContent = event.title;
        body.appendChild(title);

        if (event.summary) {
            const summary = document.createElement('p');
            summary.textContent = event.summary;
            body.appendChild(summary);
        }

        if (event.details.length > 0) {
            const details = document.createElement('ul');
            details.className = 'timeline-event-details';
            event.details.forEach((detail) => {
                const entry = document.createElement('li');
                entry.textContent = detail;
                details.appendChild(entry);
            });
            body.appendChild(details);
        }

        if (event.link && event.link.href && event.link.label) {
            const link = document.createElement('a');
            link.className = 'timeline-event-link';
            link.href = event.link.href;
            link.append(document.createTextNode(event.link.label));
            const icon = document.createElement('i');
            icon.dataset.lucide = 'arrow-up-right';
            icon.setAttribute('aria-hidden', 'true');
            link.appendChild(icon);
            body.appendChild(link);
        }

        item.append(marker, body);
        return item;
    }

    function createYearGroup(year, events) {
        const group = document.createElement('section');
        group.className = 'timeline-year-group';
        group.id = `year-${year}`;
        group.dataset.year = year;

        const heading = document.createElement('header');
        heading.className = 'timeline-year-heading reveal';

        const yearTitle = document.createElement('h2');
        yearTitle.textContent = year;
        const count = document.createElement('span');
        count.textContent = `${events.length} 条记录`;
        heading.append(yearTitle, count);
        const yearMarker = document.createElement('span');
        yearMarker.className = 'timeline-year-marker';
        yearMarker.setAttribute('aria-hidden', 'true');
        heading.appendChild(yearMarker);

        const entries = document.createElement('div');
        entries.className = 'timeline-year-events';
        events.forEach((event, index) => entries.appendChild(createTimelineEvent(event, index)));

        group.append(heading, entries);
        return group;
    }

    /* ---------------- 轴线 ---------------- */

    function markNeedsMeasure() {
        needsMeasure = true;
    }

    function measureTimeline() {
        needsMeasure = false;
        currentEvent = null;

        if (!timelineTrack || timelineTrack.classList.contains('is-empty')) {
            eventAnchors = [];
            yearAnchors = [];
            return;
        }

        const scrollTop = window.scrollY;
        const axisRect = timelineAxis.getBoundingClientRect();
        axisTop = axisRect.top + scrollTop;
        axisHeight = Math.max(axisRect.height, 1);

        eventAnchors = Array.from(timelineList.querySelectorAll('.timeline-event')).map((element) => {
            const marker = element.querySelector('.timeline-event-marker');
            const rect = marker.getBoundingClientRect();
            return { element, center: rect.top + scrollTop + rect.height / 2 };
        });

        yearAnchors = Array.from(timelineList.querySelectorAll('.timeline-year-heading')).map((element) => {
            const marker = element.querySelector('.timeline-year-marker');
            const rect = marker.getBoundingClientRect();
            return { element, top: rect.top + scrollTop };
        });
    }

    function updateTimelineAxis(scrollTop) {
        if (needsMeasure) measureTimeline();
        if (!timelineTrack || timelineTrack.classList.contains('is-empty') || eventAnchors.length === 0) return;

        const viewportHeight = window.innerHeight;
        const viewportFocus = scrollTop + viewportHeight * 0.64;
        const progress = Math.max(0, Math.min(1, (viewportFocus - axisTop) / axisHeight));
        timelineAxisProgress.style.height = `${progress * 100}%`;

        let closestElement = null;
        let closestDistance = Number.POSITIVE_INFINITY;

        eventAnchors.forEach((anchor) => {
            anchor.element.classList.toggle('is-passed', anchor.center <= viewportFocus);

            const distance = Math.abs(anchor.center - viewportFocus);
            const inViewport = anchor.center > scrollTop && anchor.center < scrollTop + viewportHeight;
            if (inViewport && distance < closestDistance) {
                closestDistance = distance;
                closestElement = anchor.element;
            }
        });

        const nextCurrent = closestElement && closestDistance < viewportHeight * 0.34 ? closestElement : null;
        if (nextCurrent !== currentEvent) {
            currentEvent?.classList.remove('is-current');
            nextCurrent?.classList.add('is-current');
            currentEvent = nextCurrent;
        }

        yearAnchors.forEach((anchor) => {
            anchor.element.classList.toggle('is-passed', anchor.top <= viewportFocus);
        });
    }

    function requestAxisUpdate() {
        if (frameId) return;
        frameId = window.requestAnimationFrame(() => {
            frameId = 0;
            updateTimelineAxis(window.scrollY);
        });
    }

    /* ---------------- 渲染 ---------------- */

    function jumpToElement(target) {
        if (!target) return;
        const top = target.getBoundingClientRect().top + window.scrollY - headerOffset(32);
        window.scrollTo({ top, behavior: reducedMotion.matches ? 'auto' : 'smooth' });
    }

    function renderYearNavigation(years) {
        timelineYears.replaceChildren();
        years.forEach((year) => {
            const button = document.createElement('button');
            button.type = 'button';
            button.textContent = year;
            button.setAttribute('aria-label', `跳到 ${year} 年`);
            button.addEventListener('click', () => jumpToElement(document.getElementById(`year-${year}`)));
            timelineYears.appendChild(button);
        });
    }

    function renderTimeline() {
        const events = activeCategory === 'all'
            ? sortedEvents
            : sortedEvents.filter((event) => event.category === activeCategory);

        timelineList.replaceChildren();
        if (events.length === 0) {
            timelineTrack.classList.add('is-empty');
            const empty = document.createElement('p');
            empty.className = 'timeline-empty';
            empty.textContent = '这一页还在等新的故事。';
            timelineList.appendChild(empty);
            renderYearNavigation([]);
            markNeedsMeasure();
            return;
        }
        timelineTrack.classList.remove('is-empty');

        const groups = new Map();
        events.forEach((event) => {
            const year = getEventYear(event);
            if (!groups.has(year)) groups.set(year, []);
            groups.get(year).push(event);
        });

        groups.forEach((yearEvents, year) => {
            timelineList.appendChild(createYearGroup(year, yearEvents));
        });

        renderYearNavigation([...groups.keys()]);
        refreshIcons(timelineList);
        initReveal();
        markNeedsMeasure();
        requestAxisUpdate();
    }

    function renderFilters() {
        timelineFilters.replaceChildren();

        Object.keys(categoryLabels).forEach((category) => {
            const button = document.createElement('button');
            button.type = 'button';
            button.className = 'timeline-filter-button';
            button.textContent = categoryLabels[category];
            button.setAttribute('aria-pressed', String(category === activeCategory));
            button.addEventListener('click', () => {
                if (activeCategory === category) return;
                activeCategory = category;
                timelineFilters.querySelectorAll('button').forEach((filterButton) => {
                    filterButton.setAttribute('aria-pressed', String(filterButton === button));
                });
                renderTimeline();
            });
            timelineFilters.appendChild(button);
        });
    }

    function jumpToCurrentHash() {
        const hashId = decodeURIComponent(window.location.hash.slice(1));
        if (!hashId) return;
        const target = document.getElementById(hashId);
        if (!target) return;
        const top = target.getBoundingClientRect().top + window.scrollY - headerOffset(32);
        window.scrollTo({ top, behavior: 'auto' });
    }

    function renderSummary() {
        timelineCount.textContent = String(sortedEvents.length).padStart(2, '0');
        if (sortedEvents.length === 0) {
            timelineSince.textContent = '—';
            timelineYearRange.textContent = String(new Date().getFullYear());
            return;
        }

        const years = sortedEvents.map((event) => getEventYear(event));
        const firstYear = years[years.length - 1];
        const latestYear = years[0];
        timelineSince.textContent = firstYear;
        timelineYearRange.textContent = firstYear === latestYear ? latestYear : `${firstYear}—${latestYear}`;
    }

    /* ---------------- 初始化 ---------------- */

    initSiteChrome({
        onScroll() {
            requestAxisUpdate();
        },
        onResize() {
            markNeedsMeasure();
            requestAxisUpdate();
        },
    });

    renderSummary();
    renderFilters();
    renderTimeline();
    jumpToCurrentHash();
    refreshIcons();

    // 字体换入、图片解码都会改变节点高度，重新测量一次
    document.fonts?.ready.then(() => {
        markNeedsMeasure();
        requestAxisUpdate();
    });
    window.addEventListener('load', () => {
        markNeedsMeasure();
        requestAxisUpdate();
    });
    if ('ResizeObserver' in window) {
        new ResizeObserver(() => {
            markNeedsMeasure();
            requestAxisUpdate();
        }).observe(timelineTrack);
    }
}());
