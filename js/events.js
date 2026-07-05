// js/events.js — Events page (enhanced 3-column layout)

let currentCategory = '';
let currentSort = 'date';
let currentView = 'grid';
let currentFilter = 'all';
let currentPage = 1;
let totalPages = 1;
let calendarMonth, calendarYear;
let miniCalMonth, miniCalYear;
let carouselIndex = 0;
let carouselInterval;

const EVENT_CATEGORIES = [
    { slug: 'workshop', name: 'Workshops', icon: 'bi-scissors' },
    { slug: 'webinar', name: 'Webinars', icon: 'bi-camera-video' },
    { slug: 'floral-design', name: 'Floral Design', icon: 'bi-flower1' },
    { slug: 'farming', name: 'Farming', icon: 'bi-seedling' },
    { slug: 'competition', name: 'Competitions', icon: 'bi-trophy' },
    { slug: 'festival', name: 'Festivals', icon: 'bi-ticket' },
    { slug: 'networking', name: 'Networking', icon: 'bi-people' },
    { slug: 'learning', name: 'Learning', icon: 'bi-mortarboard' }
];

// ─── Utilities ─────────────────────────────────────────────────────────

function showToast(msg) {
    const el = document.getElementById('evtToast');
    if (!el) { alert(msg); return; }
    el.textContent = msg;
    el.classList.add('show');
    clearTimeout(el._timeout);
    el._timeout = setTimeout(() => el.classList.remove('show'), 3000);
}

function userLoggedIn() {
    try { return typeof window.isLoggedIn === 'function' ? window.isLoggedIn() : !!localStorage.getItem('flower-token'); } catch { return false; }
}

function formatNumber(n) {
    if (n >= 1000) return (n / 1000).toFixed(1) + 'K';
    return String(n);
}

function formatTime(dateStr) {
    if (!dateStr) return '';
    const d = new Date(dateStr);
    return d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
}

function getEventDay(dateStr) {
    return new Date(dateStr).getDate();
}

function getEventMonth(dateStr) {
    return new Date(dateStr).toLocaleDateString('en-US', { month: 'short' });
}

function getEventTypeClass(type) {
    const t = (type || '').toLowerCase();
    if (t.includes('workshop')) return 'workshop';
    if (t.includes('webinar')) return 'webinar';
    if (t.includes('competition')) return 'competition';
    if (t.includes('exhibition') || t.includes('show')) return 'exhibition';
    return 'workshop';
}

// ─── Init ──────────────────────────────────────────────────────────────

async function initEventsPage() {
    const now = new Date();
    calendarMonth = now.getMonth() + 1;
    calendarYear = now.getFullYear();
    miniCalMonth = now.getMonth();
    miniCalYear = now.getFullYear();

    renderCategoryCards();
    renderMiniCalendar();
    setupLeftSidebar();
    setupSortTabs();
    setupFilterChips();
    await Promise.all([
        loadFeaturedCarousel(),
        loadEvents(),
        loadSidebarData()
    ]);
}

// ─── Category Cards ────────────────────────────────────────────────────

function buildCategoryCards(categories, active, callback) {
    return categories.map(c => {
        const isActive = active === c.slug;
        return `<div class="evt-cat-card${isActive ? ' active' : ''}" onclick="${callback}('${c.slug}')">
            <div class="evt-cat-card-icon"><i class="bi ${c.icon}"></i></div>
            <div class="evt-cat-card-name">${c.name}</div>
        </div>`;
    }).join('');
}

function buildMobileCategoryChips(categories, active) {
    return categories.map(c => {
        const isActive = active === c.slug;
        return `<button class="evt-chip${isActive ? ' active' : ''}" data-category="${c.slug}"><i class="bi ${c.icon}"></i> ${c.name}</button>`;
    }).join('');
}

function renderCategoryCards() {
    const el = document.getElementById('catCards');
    if (!el) return;
    el.innerHTML = buildCategoryCards(EVENT_CATEGORIES, currentCategory, 'selectCategory');

    const mobileEl = document.getElementById('mobileCategories');
    if (mobileEl) {
        mobileEl.innerHTML = buildMobileCategoryChips(EVENT_CATEGORIES, currentCategory);
    }
}

function selectCategory(slug) {
    currentCategory = currentCategory === slug ? '' : slug;
    currentPage = 1;
    renderCategoryCards();
    loadEvents();
}

// ─── Left Sidebar Navigation ───────────────────────────────────────────

function setupLeftSidebar() {
    document.querySelectorAll('.evt-nav-item[data-filter]').forEach(item => {
        item.addEventListener('click', e => {
            e.preventDefault();
            const filter = item.dataset.filter;
            document.querySelectorAll('.evt-nav-item').forEach(i => i.classList.remove('active'));
            item.classList.add('active');
            currentFilter = filter;
            currentCategory = '';
            currentPage = 1;
            renderCategoryCards();
            loadEvents();
        });
    });
}

// ─── Sort & Filter ─────────────────────────────────────────────────────

function setupSortTabs() {
    document.getElementById('sortTabs')?.addEventListener('click', e => {
        const tab = e.target.closest('.evt-sort-tab');
        if (!tab) return;
        document.querySelectorAll('.evt-sort-tab').forEach(t => t.classList.remove('active'));
        tab.classList.add('active');
        currentSort = tab.dataset.sort;
        currentPage = 1;
        loadEvents();
    });
}

function setupFilterChips() {
    document.getElementById('filterChips')?.addEventListener('click', e => {
        const chip = e.target.closest('.evt-chip');
        if (!chip) return;
        document.querySelectorAll('.evt-chip').forEach(c => c.classList.remove('active'));
        chip.classList.add('active');
        currentFilter = chip.dataset.filter;
        currentPage = 1;
        loadEvents();
    });
}

function setView(view) {
    currentView = view;
    document.querySelectorAll('.evt-view-btn').forEach(b => b.classList.toggle('active', b.dataset.view === view));
    if (view === 'calendar') {
        loadCalendar();
    } else {
        loadEvents();
    }
}

// ─── Search ────────────────────────────────────────────────────────────

function searchFromHero() {
    currentPage = 1;
    loadEvents();
    if (window.innerWidth <= 900) {
        setTimeout(() => {
            document.getElementById('eventsContainer')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }, 100);
    }
}

// ─── Featured Carousel ─────────────────────────────────────────────────

async function loadFeaturedCarousel() {
    try {
        const data = await api.fetchJSON('/api/events?limit=3&sort=popular&status=upcoming');
        const events = data.events || [];
        if (!events.length) return;

        const carousel = document.getElementById('featuredCarousel');
        const track = document.getElementById('featuredTrack');
        const dots = document.getElementById('carouselDots');

        track.innerHTML = events.map(e => renderFeaturedBanner(e)).join('');

        dots.innerHTML = events.map((_, i) => `<div class="evt-carousel-dot${i === 0 ? ' active' : ''}" onclick="goToSlide(${i})"></div>`).join('');

        carousel.style.display = 'block';
        startCarousel(events.length);
    } catch {}
}

function startCarousel(count) {
    if (count <= 1) return;
    clearInterval(carouselInterval);
    carouselInterval = setInterval(() => carouselNav(1), 5000);
}

function carouselNav(dir) {
    const track = document.getElementById('featuredTrack');
    const dots = document.querySelectorAll('.evt-carousel-dot');
    const total = dots.length;
    if (!total) return;

    carouselIndex = (carouselIndex + dir + total) % total;
    track.style.transform = `translateX(-${carouselIndex * 100}%)`;
    dots.forEach((d, i) => d.classList.toggle('active', i === carouselIndex));

    clearInterval(carouselInterval);
    carouselInterval = setInterval(() => carouselNav(1), 5000);
}

function goToSlide(i) {
    carouselIndex = i;
    const track = document.getElementById('featuredTrack');
    const dots = document.querySelectorAll('.evt-carousel-dot');
    track.style.transform = `translateX(-${i * 100}%)`;
    dots.forEach((d, idx) => d.classList.toggle('active', idx === i));
    clearInterval(carouselInterval);
    carouselInterval = setInterval(() => carouselNav(1), 5000);
}

// ─── Load Events ───────────────────────────────────────────────────────

async function loadEvents() {
    if (currentView === 'calendar') return loadCalendar();

    const searchEl = document.getElementById('heroSearch');
    const search = searchEl ? searchEl.value.trim() : '';
    const params = new URLSearchParams({ sort: currentSort, page: currentPage, limit: 20 });

    if (currentCategory) params.set('category', currentCategory);
    if (search) params.set('search', search);

    // Map filters
    if (currentFilter === 'free') params.set('type', 'free');
    if (currentFilter === 'online') params.set('type', 'online');
    if (currentFilter === 'in-person') params.set('type', 'in-person');
    if (currentFilter === 'upcoming') params.set('status', 'upcoming');
    if (currentFilter === 'past') params.set('status', 'past');
    if (currentFilter === 'this-week' || currentFilter === 'this-month') params.set('status', 'upcoming');

    let data;
    try {
        const res = await fetch(`/api/events?${params}`);
        data = await res.json();
    } catch {
        data = { events: [], total: 0, pages: 1 };
    }

    const container = document.getElementById('eventsContainer');
    if (!container) return;

    totalPages = data.pages || 1;

    if (!data.events || !data.events.length) {
        container.innerHTML = '';
        container.className = '';
        container.innerHTML = renderEmptyState(currentView);
        document.getElementById('pagination').innerHTML = '';
        return;
    }

    if (currentView === 'list') {
        container.className = 'evt-list';
        container.innerHTML = data.events.map(e => renderEventCard(e, 'list')).join('');
    } else {
        container.className = 'evt-grid';
        container.innerHTML = data.events.map(e => renderEventCard(e, 'grid')).join('');
    }

    document.getElementById('pagination').innerHTML = renderPagination(currentPage, totalPages, 'goToPage');
}

function renderPagination() {
    const el = document.getElementById('pagination');
    if (totalPages <= 1) { el.innerHTML = ''; return; }
    let html = '';
    if (currentPage > 1) html += `<button class="page-btn" onclick="goToPage(${currentPage - 1})"><i class="bi bi-chevron-left"></i></button>`;
    for (let i = 1; i <= totalPages; i++) {
        if (totalPages > 7 && i > 3 && i < totalPages - 2 && Math.abs(i - currentPage) > 1) {
            if (i === 4 || i === totalPages - 3) html += `<span style="padding:0.4rem 0.3rem;color:var(--text-muted)">...</span>`;
            continue;
        }
        html += `<button class="page-btn${i === currentPage ? ' active' : ''}" onclick="goToPage(${i})">${i}</button>`;
    }
    if (currentPage < totalPages) html += `<button class="page-btn" onclick="goToPage(${currentPage + 1})"><i class="bi bi-chevron-right"></i></button>`;
    el.innerHTML = html;
}

function goToPage(page) {
    currentPage = page;
    loadEvents();
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

// ─── Calendar View ─────────────────────────────────────────────────────

async function loadCalendar() {
    const container = document.getElementById('eventsContainer');

    let events = [];
    try {
        const res = await fetch(`/api/events/calendar?month=${calendarMonth}&year=${calendarYear}`);
        events = await res.json();
    } catch {}

    container.className = '';
    container.innerHTML = renderCalendarMonth(calendarMonth, calendarYear, events);
}

function calNav(delta) {
    calendarMonth += delta;
    if (calendarMonth > 12) { calendarMonth = 1; calendarYear++; }
    if (calendarMonth < 1) { calendarMonth = 12; calendarYear--; }
    loadCalendar();
}

// ─── Mini Calendar ─────────────────────────────────────────────────────

function renderMiniCalendar() {
    const result = renderMiniCalendar(miniCalMonth, miniCalYear);
    document.getElementById('miniCalTitle').textContent = result.title;
    document.getElementById('miniCalGrid').innerHTML = result.html;
}

function miniCalNav(delta) {
    miniCalMonth += delta;
    if (miniCalMonth > 11) { miniCalMonth = 0; miniCalYear++; }
    if (miniCalMonth < 0) { miniCalMonth = 11; miniCalYear--; }
    renderMiniCalendar();
}

// ─── Sidebar Data ──────────────────────────────────────────────────────

async function loadSidebarData() {
    loadMyUpcoming();
    loadSuggestedEvents();
    loadUpcomingWeek('upcomingWeekEvents');
    loadPopularOrganizers('popularOrganizers');
    loadRecentlyAdded('recentlyAddedEvents');
    loadEventStats('eventStatsGrid');
    loadTrendingLocations('trendingLocations');
}

function resetFilters() {
    currentCategory = '';
    currentFilter = 'all';
    currentSort = 'date';
    currentPage = 1;
    document.querySelectorAll('.evt-nav-item').forEach(i => i.classList.remove('active'));
    document.querySelector('.evt-nav-item[data-filter="all"]')?.classList.add('active');
    document.querySelectorAll('.evt-chip').forEach(c => c.classList.toggle('active', c.dataset.filter === 'all'));
    document.querySelectorAll('.evt-sort-tab').forEach(t => t.classList.toggle('active', t.dataset.sort === 'date'));
    renderCategoryCards();
    document.getElementById('heroSearch').value = '';
    loadEvents();
}

async function loadMyUpcoming() {
    if (!userLoggedIn()) {
        document.getElementById('myUpcomingEvents').innerHTML = '<p style="font-size:0.82rem;color:var(--text-muted);">Sign in to see your events</p>';
        return;
    }
    try {
        const data = await api.fetchJSON('/api/events/my');
        const events = Array.isArray(data) ? data : [];
        if (!events.length) {
            document.getElementById('myUpcomingEvents').innerHTML = '<p style="font-size:0.82rem;color:var(--text-muted);">No upcoming events</p>';
            return;
        }
        document.getElementById('myUpcomingEvents').innerHTML = events.slice(0, 3).map(e => `
            <div class="my-event-item" onclick="window.location.href='event-detail.html?id=${e.id}'" style="cursor:pointer;">
                <div class="my-event-date"><span class="day">${getEventDay(e.event_date)}</span><span class="month">${getEventMonth(e.event_date)}</span></div>
                <div class="my-event-info">
                    <h4>${escapeHtml(e.title)}</h4>
                    <p>${formatTime(e.event_date)} · ${escapeHtml(e.location || 'Online')}</p>
                </div>
            </div>
        `).join('');
    } catch {}
}

async function loadSuggestedEvents() {
    try {
        const data = await api.fetchJSON('/api/events?limit=3&sort=popular&status=upcoming');
        const events = data.events || [];
        if (!events.length) {
            document.getElementById('suggestedEvents').innerHTML = '<p style="font-size:0.82rem;color:var(--text-muted);">No suggestions yet</p>';
            return;
        }
        document.getElementById('suggestedEvents').innerHTML = events.map(e => `
            <div class="suggest-event">
                <h4 onclick="window.location.href='event-detail.html?id=${e.id}'">${escapeHtml(e.title)}</h4>
                <p>${formatDate(e.event_date)} · ${escapeHtml(e.location || 'Online')} · ${e.price == 0 ? 'Free' : '$' + parseFloat(e.price).toFixed(2)}</p>
            </div>
        `).join('');
    } catch {}
}

// ─── Mobile Filter Drawer ──────────────────────────────────────────────

function openMobileFilter() {
    const drawer = document.getElementById('mobileFilterDrawer');
    if (drawer) {
        drawer.classList.add('open');
        document.body.style.overflow = 'hidden';
    }
}

function closeMobileFilter() {
    const drawer = document.getElementById('mobileFilterDrawer');
    if (drawer) {
        drawer.classList.remove('open');
        document.body.style.overflow = '';
    }
}

function applyMobileFilters() {
    const activeSort = document.querySelector('#mobileSortTabs .evt-sort-tab.active');
    if (activeSort) currentSort = activeSort.dataset.sort;

    const activeFilter = document.querySelector('#mobileFilterChips .evt-chip.active');
    if (activeFilter) currentFilter = activeFilter.dataset.filter;

    document.querySelectorAll('.evt-sort-tab').forEach(t => t.classList.toggle('active', t.dataset.sort === currentSort));
    document.querySelectorAll('.evt-chip').forEach(c => c.classList.toggle('active', c.dataset.filter === currentFilter));

    currentPage = 1;
    closeMobileFilter();
    loadEvents();
}

// ─── Event Detail Page ─────────────────────────────────────────────────

async function initEventDetail() {
    const params = new URLSearchParams(window.location.search);
    const id = params.get('id');
    if (!id) {
        document.getElementById('eventContent').innerHTML = '<div class="empty-state"><h3>Event not found</h3></div>';
        return;
    }

    let event;
    try {
        const res = await fetch(`/api/events/${id}`, { headers: authHeaders() });
        if (!res.ok) throw new Error('Not found');
        event = await res.json();
    } catch {
        document.getElementById('eventContent').innerHTML = '<div class="empty-state"><i class="bi bi-calendar-x"></i><h3>Event not found</h3><p>This event may have been removed.</p></div>';
        return;
    }

    document.title = `${event.title} | Flower Ecosystem`;

    let speakers = [];
    try { speakers = event.speakers ? (typeof event.speakers === 'string' ? JSON.parse(event.speakers) : event.speakers) : []; } catch { speakers = []; }
    let resources = event.resources || [];
    let agenda = [];
    try { agenda = event.agenda ? (typeof event.agenda === 'string' ? JSON.parse(event.agenda) : event.agenda) : []; } catch { agenda = []; }

    const spotsLeft = event.spots_left != null ? event.spots_left : (event.max_participants ? event.max_participants - (event.registrations || 0) : null);
    const isFull = spotsLeft !== null && spotsLeft <= 0;

    document.getElementById('eventContent').innerHTML = `
        <div class="event-hero">
            <img src="${escapeHtml(event.image_url || 'https://images.unsplash.com/photo-1490750967868-88df5691a78b?q=80&w=1200&auto=format&fit=crop')}" alt="${escapeHtml(event.title)}">
            <div class="event-hero-overlay">
                ${event.is_featured ? '<div class="event-hero-badge"><i class="bi bi-star-fill"></i> Featured</div>' : ''}
                <h1>${escapeHtml(event.title)}</h1>
                <div class="event-hero-meta">
                    <span><i class="bi bi-calendar"></i> ${formatDate(event.event_date)}</span>
                    <span><i class="bi bi-clock"></i> ${formatTime(event.event_date)}${event.end_date ? ' – ' + formatTime(event.end_date) : ''}</span>
                    <span><i class="bi bi-geo-alt"></i> ${escapeHtml(event.location || 'Online')}</span>
                    <span><i class="bi bi-tag"></i> ${escapeHtml(event.event_type || 'Event')}</span>
                </div>
            </div>
        </div>

        <div class="detail-layout">
            <div class="detail-main">
                <div class="info-card">
                    <h2><i class="bi bi-info-circle" style="color:var(--primary-color)"></i> Event Information</h2>
                    <div class="info-grid">
                        <div class="info-item"><span class="label">Date</span><span class="value">${formatDate(event.event_date)}</span></div>
                        <div class="info-item"><span class="label">Time</span><span class="value">${formatTime(event.event_date)}${event.end_date ? ' – ' + formatTime(event.end_date) : ''}</span></div>
                        <div class="info-item"><span class="label">Duration</span><span class="value">${event.end_date ? Math.round((new Date(event.end_date) - new Date(event.event_date)) / 3600000) + ' Hours' : 'TBA'}</span></div>
                        <div class="info-item"><span class="label">Type</span><span class="value">${escapeHtml(event.event_type || 'Event')}</span></div>
                        <div class="info-item"><span class="label">Location</span><span class="value">${escapeHtml(event.location || 'Online')}</span></div>
                        <div class="info-item"><span class="label">Difficulty</span><span class="value">${escapeHtml(event.difficulty || 'All Levels')}</span></div>
                        ${event.max_participants ? `<div class="info-item"><span class="label">Capacity</span><span class="value">${event.max_participants} seats</span></div>` : ''}
                        <div class="info-item"><span class="label">Category</span><span class="value">${escapeHtml(event.event_category || event.event_type || '')}</span></div>
                    </div>
                </div>

                <div class="info-card">
                    <h2><i class="bi bi-card-text" style="color:var(--primary-color)"></i> About This Event</h2>
                    <div class="description-content">${escapeHtml(event.description || 'No description available.')}</div>
                </div>

                ${agenda.length ? `
                <div class="info-card">
                    <h2><i class="bi bi-list-check" style="color:var(--primary-color)"></i> Agenda</h2>
                    <ol class="agenda-list">
                        ${agenda.map((item, i) => `<li><span class="agenda-num">${i + 1}</span> ${escapeHtml(typeof item === 'string' ? item : item.title || item)}</li>`).join('')}
                    </ol>
                </div>` : ''}

                ${event.prerequisites ? `
                <div class="info-card">
                    <h2><i class="bi bi-exclamation-circle" style="color:var(--accent-gold)"></i> Prerequisites</h2>
                    <ul class="prereq-list">
                        ${event.prerequisites.split('\n').map(p => `<li>${escapeHtml(p)}</li>`).join('')}
                    </ul>
                </div>` : ''}

                ${speakers.length ? `
                <div class="info-card">
                    <h2><i class="bi bi-person-video3" style="color:var(--primary-color)"></i> Speakers</h2>
                    ${speakers.map(s => `
                        <div class="speaker-card">
                            <div class="speaker-avatar">${s.photo_url ? `<img src="${escapeHtml(s.photo_url)}" alt="${escapeHtml(s.name)}">` : (s.name || '?')[0].toUpperCase()}</div>
                            <div class="speaker-info">
                                <h4>${escapeHtml(s.name)}</h4>
                                ${s.title ? `<div class="title">${escapeHtml(s.title)}</div>` : ''}
                                ${s.bio ? `<div class="bio">${escapeHtml(s.bio)}</div>` : ''}
                                <div class="speaker-stats">
                                    ${s.experience_years ? `<span><i class="bi bi-briefcase"></i> ${s.experience_years} years experience</span>` : ''}
                                    ${s.students_count ? `<span><i class="bi bi-people"></i> ${formatNumber(s.students_count)} students</span>` : ''}
                                </div>
                            </div>
                        </div>
                    `).join('')}
                </div>` : ''}

                ${resources.length ? `
                <div class="info-card">
                    <h2><i class="bi bi-folder2-open" style="color:var(--primary-color)"></i> Workshop Resources</h2>
                    <div class="resource-list">
                        ${resources.map(r => `
                            <div class="resource-item" ${r.resource_url ? `onclick="window.open('${escapeHtml(r.resource_url)}', '_blank')"` : ''}>
                                <div class="resource-icon ${r.resource_type === 'pdf' ? 'pdf' : r.resource_type === 'video' ? 'video' : r.resource_type === 'slides' ? 'slide' : 'doc'}">
                                    <i class="bi bi-${r.resource_type === 'pdf' ? 'file-earmark-pdf' : r.resource_type === 'video' ? 'play-circle' : r.resource_type === 'slides' ? 'easel' : 'file-earmark'}"></i>
                                </div>
                                <div style="flex:1;">
                                    <div class="resource-name">${escapeHtml(r.resource_name)}</div>
                                    ${r.file_size ? `<div class="resource-size">${escapeHtml(r.file_size)}</div>` : ''}
                                </div>
                                <i class="bi bi-download" style="color:var(--text-muted);"></i>
                            </div>
                        `).join('')}
                    </div>
                </div>` : ''}
            </div>

            <div class="detail-sidebar">
                <div class="reg-card">
                    <h3>Registration</h3>
                    <div class="reg-price${event.price == 0 ? ' free' : ''}">${event.price == 0 ? 'FREE' : '$' + parseFloat(event.price).toFixed(2)}</div>
                    ${spotsLeft !== null ? `
                        <div class="reg-spots">
                            <span class="${spotsLeft < 10 ? 'low' : 'available'}">${spotsLeft}</span> spots remaining
                            ${event.max_participants ? ` of ${event.max_participants}` : ''}
                        </div>
                    ` : '<div class="reg-spots">Unlimited spots</div>'}

                    <div class="reg-info">
                        <div class="reg-info-row"><span class="label">Date</span><span class="value">${formatDate(event.event_date)}</span></div>
                        <div class="reg-info-row"><span class="label">Time</span><span class="value">${formatTime(event.event_date)}</span></div>
                        <div class="reg-info-row"><span class="label">Location</span><span class="value">${escapeHtml(event.location || 'Online')}</span></div>
                        <div class="reg-info-row"><span class="label">Difficulty</span><span class="value">${escapeHtml(event.difficulty || 'All Levels')}</span></div>
                    </div>

                    ${event.is_registered ? `
                        <button class="btn btn-outline" style="width:100%;margin-bottom:0.5rem;" disabled>
                            <i class="bi bi-check-circle-fill"></i> Registered
                        </button>
                        <button class="btn btn-primary" style="width:100%;" onclick="cancelRegistration('${event.id}')">
                            <i class="bi bi-x-circle"></i> Cancel Registration
                        </button>
                        ${event.has_certificate ? `
                            <div class="cert-card" style="margin-top:1rem;">
                                <h3><i class="bi bi-award"></i> Certificate</h3>
                                <p>Congratulations! You completed this event.</p>
                                <button class="btn" style="background:white;color:var(--accent-gold);font-weight:600;" onclick="downloadCertificate('${event.id}')">
                                    <i class="bi bi-download"></i> Download Certificate
                                </button>
                            </div>
                        ` : ''}
                    ` : isFull ? `
                        <button class="btn btn-outline" style="width:100%;" disabled>Event Full</button>
                    ` : `
                        <button class="btn btn-primary" style="width:100%;" onclick="registerForEvent('${event.id}')">
                            <i class="bi bi-ticket"></i> ${event.price == 0 ? 'Join Event' : 'Register Now'}
                        </button>
                    `}

                    <div style="margin-top:1rem;text-align:center;font-size:0.8rem;color:var(--text-muted);">
                        <i class="bi bi-eye"></i> ${formatNumber(event.views || 0)} views · ${event.registrations || 0} registered
                    </div>
                </div>
            </div>
        </div>
    `;
}

async function registerForEvent(id) {
    if (!userLoggedIn()) { openAuthModal('login'); return; }
    try {
        const res = await fetch(`/api/events/${id}/register`, {
            method: 'POST',
            headers: authHeaders()
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Registration failed');
        window.location.reload();
    } catch (err) {
        alert(err.message || 'Registration failed');
    }
}

async function cancelRegistration(id) {
    if (!confirm('Are you sure you want to cancel your registration?')) return;
    try {
        await fetch(`/api/events/${id}/register`, {
            method: 'DELETE',
            headers: authHeaders()
        });
        window.location.reload();
    } catch {}
}

async function downloadCertificate(id) {
    try {
        const res = await fetch(`/api/events/${id}/certificate`, { headers: authHeaders() });
        if (res.ok) {
            const cert = await res.json();
            if (cert.certificate_url) {
                window.open(cert.certificate_url, '_blank');
            } else {
                alert('Certificate is being generated. Please check back later.');
            }
        } else {
            alert('Certificate not available yet.');
        }
    } catch {}
}
