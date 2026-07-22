const header = document.querySelector('.site-header');
const progress = document.getElementById('scrollProgress');
const backToTopButton = document.getElementById('backToTop');
const footerBackToTopButton = document.getElementById('footerBackToTop');
const menuToggle = document.getElementById('menuToggle');
const navLinks = document.getElementById('navLinks');
const footerYear = document.getElementById('footerYear');
const timelineList = document.getElementById('timelineList');
const timelineFilters = document.getElementById('timelineFilters');
const timelineYears = document.getElementById('timelineYears');
const timelineCount = document.getElementById('timelineCount');
const timelineSince = document.getElementById('timelineSince');
const timelineYearRange = document.getElementById('timelineYearRange');
const timelineTrack = document.getElementById('timelineTrack');
const timelineAxis = document.getElementById('timelineAxis');
const timelineAxisProgress = document.getElementById('timelineAxisProgress');
const { reducedMotionPreference, refreshIcons } = window.QiufengTheme;

const categoryLabels = Object.freeze({
    all: '全部',
    site: '小站',
    daily: '日常',
    writing: '写作',
    milestone: '里程碑',
});

const sourceEvents = Array.isArray(window.timelineEvents) ? window.timelineEvents : [];
const sortedEvents = [...sourceEvents].sort((left, right) => right.date.localeCompare(left.date));
let activeCategory = 'all';

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

    if (Array.isArray(event.details) && event.details.length > 0) {
        const details = document.createElement('ul');
        details.className = 'timeline-event-details';
        event.details.forEach((detail) => {
            const entry = document.createElement('li');
            entry.textContent = detail;
            details.appendChild(entry);
        });
        body.appendChild(details);
    }

    if (event.link?.href && event.link?.label) {
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

function initReveal() {
    const items = document.querySelectorAll('.reveal:not(.is-visible)');
    if (reducedMotionPreference.matches || !('IntersectionObserver' in window)) {
        items.forEach((item) => item.classList.add('is-visible'));
        return;
    }

    const observer = new IntersectionObserver((entries) => {
        entries.forEach((entry) => {
            if (!entry.isIntersecting) return;
            entry.target.classList.add('is-visible');
            observer.unobserve(entry.target);
        });
    }, { threshold: 0.08 });

    items.forEach((item) => observer.observe(item));
}

function jumpToYear(year) {
    const target = document.getElementById(`year-${year}`);
    if (!target) return;
    const top = target.getBoundingClientRect().top + window.scrollY - 104;
    window.scrollTo({ top, behavior: reducedMotionPreference.matches ? 'auto' : 'smooth' });
}

function renderYearNavigation(years) {
    timelineYears.replaceChildren();
    years.forEach((year) => {
        const button = document.createElement('button');
        button.type = 'button';
        button.textContent = year;
        button.addEventListener('click', () => jumpToYear(year));
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
    refreshIcons();
    initReveal();
    updateTimelineAxis();
}

function renderFilters() {
    const categories = Object.keys(categoryLabels);
    timelineFilters.replaceChildren();

    categories.forEach((category) => {
        const button = document.createElement('button');
        button.type = 'button';
        button.className = 'timeline-filter-button';
        button.textContent = categoryLabels[category];
        button.setAttribute('aria-pressed', String(category === activeCategory));
        button.addEventListener('click', () => {
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
    const top = target.getBoundingClientRect().top + window.scrollY - 104;
    window.scrollTo({ top, behavior: 'auto' });
}

function renderSummary() {
    timelineCount.textContent = String(sortedEvents.length).padStart(2, '0');
    if (sortedEvents.length === 0) {
        timelineSince.textContent = '—';
        timelineYearRange.textContent = String(new Date().getFullYear());
        return;
    }

    const years = sortedEvents.map(getEventYear);
    const firstYear = years.at(-1);
    const latestYear = years[0];
    timelineSince.textContent = firstYear;
    timelineYearRange.textContent = firstYear === latestYear ? latestYear : `${firstYear}—${latestYear}`;
}

function toggleMenu() {
    const isOpen = navLinks.classList.toggle('is-open');
    menuToggle.setAttribute('aria-expanded', String(isOpen));
    menuToggle.setAttribute('aria-label', isOpen ? '关闭导航' : '打开导航');
    menuToggle.innerHTML = `<i data-lucide="${isOpen ? 'x' : 'menu'}" aria-hidden="true"></i>`;
    refreshIcons();
}

function closeMenu() {
    navLinks.classList.remove('is-open');
    menuToggle.setAttribute('aria-expanded', 'false');
    menuToggle.setAttribute('aria-label', '打开导航');
    menuToggle.innerHTML = '<i data-lucide="menu" aria-hidden="true"></i>';
    refreshIcons();
}

function updateScrollState() {
    const scrollTop = window.scrollY;
    const scrollable = document.documentElement.scrollHeight - window.innerHeight;
    progress.style.width = `${scrollable > 0 ? (scrollTop / scrollable) * 100 : 0}%`;
    header.classList.toggle('is-scrolled', scrollTop > 16);
    backToTopButton.disabled = scrollTop < 200;
    requestTimelineAxisUpdate();
}

let timelineAnimationFrame = 0;

function requestTimelineAxisUpdate() {
    if (timelineAnimationFrame) return;
    timelineAnimationFrame = window.requestAnimationFrame(() => {
        timelineAnimationFrame = 0;
        updateTimelineAxis();
    });
}

function updateTimelineAxis() {
    if (!timelineTrack || timelineTrack.classList.contains('is-empty')) return;
    const axisRect = timelineAxis.getBoundingClientRect();
    const viewportFocus = window.innerHeight * 0.64;
    const progress = Math.max(0, Math.min(1, (viewportFocus - axisRect.top) / Math.max(axisRect.height, 1)));
    timelineAxisProgress.style.height = `${progress * 100}%`;

    const events = [...timelineList.querySelectorAll('.timeline-event')];
    let closestEvent = null;
    let closestDistance = Number.POSITIVE_INFINITY;

    events.forEach((event) => {
        const marker = event.querySelector('.timeline-event-marker');
        const markerRect = marker.getBoundingClientRect();
        const markerCenter = markerRect.top + markerRect.height / 2;
        const distance = Math.abs(markerCenter - viewportFocus);
        const isPassed = markerCenter <= viewportFocus;
        event.classList.toggle('is-passed', isPassed);
        event.classList.remove('is-current');
        if (distance < closestDistance && markerCenter > 0 && markerCenter < window.innerHeight) {
            closestDistance = distance;
            closestEvent = event;
        }
    });

    if (closestEvent && closestDistance < window.innerHeight * 0.34) {
        closestEvent.classList.add('is-current');
    }

    const years = timelineList.querySelectorAll('.timeline-year-heading');
    years.forEach((year) => {
        const marker = year.querySelector('.timeline-year-marker');
        const markerRect = marker.getBoundingClientRect();
        year.classList.toggle('is-passed', markerRect.top <= viewportFocus);
    });
}

function scrollToTop() {
    window.scrollTo({ top: 0, behavior: reducedMotionPreference.matches ? 'auto' : 'smooth' });
}

backToTopButton.addEventListener('click', scrollToTop);
footerBackToTopButton.addEventListener('click', scrollToTop);
menuToggle.addEventListener('click', toggleMenu);
navLinks.querySelectorAll('a').forEach((link) => link.addEventListener('click', closeMenu));
window.addEventListener('scroll', updateScrollState, { passive: true });
window.addEventListener('resize', () => {
    if (window.innerWidth > 760) closeMenu();
    requestTimelineAxisUpdate();
});

footerYear.textContent = String(new Date().getFullYear());
renderSummary();
renderFilters();
renderTimeline();
jumpToCurrentHash();
updateScrollState();
refreshIcons();
