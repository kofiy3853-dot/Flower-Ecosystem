// js/events.js
// Events & Workshops pages — listing, detail, calendar

let currentCategory = '';
let currentSort = 'date';
let currentView = 'grid';
let currentPage = 1;
let totalPages = 1;
let calendarMonth, calendarYear;

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
    if (t.includes('exhibition') || t.includes('show')) return 'exhibition';
    return 'workshop';
}

// ─── Events Listing Page ──────────────────────────────────────────────────

async function initEventsPage() {
    const now = new Date();
    calendarMonth = now.getMonth() + 1;
    calendarYear = now.getFullYear();

    await loadEventCategories();
    loadFeaturedEvent();
    loadEvents();

    document.getElementById('eventSearchBtn')?.addEventListener('click', () => { currentPage = 1; loadEvents(); });
    document.getElementById('eventSearch')?.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') { currentPage = 1; loadEvents(); }
    });

    document.getElementById('categoryTabs')?.addEventListener('click', (e) => {
        const tab = e.target.closest('.category-tab');
        if (!tab) return;
        document.querySelectorAll('.category-tab').forEach(t => t.classList.remove('active'));
        tab.classList.add('active');
        currentCategory = tab.dataset.category || '';
        currentPage = 1;
        loadEvents();
    });

    document.getElementById('sortTabs')?.addEventListener('click', (e) => {
        const tab = e.target.closest('.sort-tab');
        if (!tab) return;
        document.querySelectorAll('.sort-tab').forEach(t => t.classList.remove('active'));
        tab.classList.add('active');
        currentSort = tab.dataset.sort;
        currentPage = 1;
        loadEvents();
    });

    document.querySelectorAll('.view-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            document.querySelectorAll('.view-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            currentView = btn.dataset.view;
            if (currentView === 'calendar') {
                loadCalendar();
            } else {
                loadEvents();
            }
        });
    });
}

async function loadEventCategories() {
    let categories;
    try {
        const res = await fetch('/api/events/categories');
        categories = await res.json();
    } catch {
        categories = [];
    }
    const tabs = document.getElementById('categoryTabs');
    if (!tabs) return;
    tabs.innerHTML = `<button class="category-tab active" data-category="">All Events</button>` +
        categories.map(c => `<button class="category-tab" data-category="${escapeHtml(c.name)}">${c.icon || ''} ${escapeHtml(c.name)}</button>`).join('');
}

async function loadFeaturedEvent() {
    try {
        const res = await fetch('/api/events/featured');
        const event = await res.json();
        if (!event || !event.id) return;

        document.getElementById('featuredBanner').innerHTML = `
            <div class="featured-banner reveal-up" onclick="window.location.href='event-detail.html?id=${escapeHtml(String(event.id))}'" style="cursor:pointer;">
                <img class="featured-img" src="${escapeHtml(event.image_url || 'https://images.unsplash.com/photo-1490750967868-88df5691a78b?q=80&w=800&auto=format&fit=crop')}" alt="${escapeHtml(event.title)}">
                <div class="featured-info">
                    <div class="featured-badge"><i class="bi bi-star-fill"></i> Featured Event</div>
                    <h2>${escapeHtml(event.title)}</h2>
                    <div class="featured-meta">
                        <span><i class="bi bi-calendar"></i> ${formatDate(event.event_date)}</span>
                        <span><i class="bi bi-clock"></i> ${formatTime(event.event_date)}</span>
                        <span><i class="bi bi-geo-alt"></i> ${escapeHtml(event.location || 'Online')}</span>
                        ${event.speakers ? `<span><i class="bi bi-person"></i> ${(JSON.parse(typeof event.speakers === 'string' ? event.speakers : JSON.stringify(event.speakers))[0] || {}).name || 'TBA'}</span>` : ''}
                        ${event.max_participants ? `<span><i class="bi bi-people"></i> ${event.registrations || 0}/${event.max_participants} Seats</span>` : ''}
                    </div>
                    <div class="featured-desc">${escapeHtml((event.description || '').slice(0, 150))}${(event.description || '').length > 150 ? '...' : ''}</div>
                    <div class="featured-footer">
                        <a href="event-detail.html?id=${escapeHtml(String(event.id))}" class="btn btn-primary" onclick="event.stopPropagation();">Register Now →</a>
                        <span class="event-price${event.price == 0 ? ' free' : ''}" style="font-size:1.1rem;">${event.price == 0 ? 'FREE' : '$' + parseFloat(event.price).toFixed(2)}</span>
                    </div>
                </div>
            </div>
        `;
    } catch {}
}

async function loadEvents() {
    const searchEl = document.getElementById('eventSearch');
    const search = searchEl ? searchEl.value.trim() : '';
    const params = new URLSearchParams({ sort: currentSort, page: currentPage, limit: 20 });
    if (currentCategory) params.set('category', currentCategory);
    if (search) params.set('search', search);

    let data;
    try {
        const res = await fetch(`/api/events?${params}`);
        data = await res.json();
    } catch {
        data = { events: [], total: 0, pages: 1 };
    }

    const container = document.getElementById('eventsContainer');
    if (!container) return;
    if (!data.events || !data.events.length) {
        container.innerHTML = '';
        container.className = '';
        container.innerHTML = '<div class="empty-state"><i class="bi bi-calendar-x"></i><h3>No events found</h3><p>Try selecting a different category or check back later.</p></div>';
        document.getElementById('pagination').innerHTML = '';
        return;
    }

    totalPages = data.pages || 1;

    if (currentView === 'list') {
        container.className = 'events-list';
        container.innerHTML = data.events.map(ev => `
            <div class="event-list-item" onclick="window.location.href='event-detail.html?id=${escapeHtml(String(ev.id))}'">
                <div class="event-list-date"><span class="day">${getEventDay(ev.event_date)}</span><span class="month">${getEventMonth(ev.event_date)}</span></div>
                <div>
                    <div class="event-category">${escapeHtml(ev.event_category || ev.event_type || '')}</div>
                    <h3 style="font-size:1rem;margin-bottom:0.25rem;">${escapeHtml(ev.title)}</h3>
                    <div class="event-meta">
                        <span><i class="bi bi-geo-alt"></i> ${escapeHtml(ev.location || 'Online')}</span>
                        <span><i class="bi bi-clock"></i> ${formatTime(ev.event_date)}</span>
                        ${ev.max_participants ? `<span><i class="bi bi-people"></i> ${(ev.max_participants - (ev.registrations || 0))} spots left</span>` : ''}
                    </div>
                </div>
                <div style="text-align:right;">
                    <div class="event-price${ev.price == 0 ? ' free' : ''}">${ev.price == 0 ? 'FREE' : '$' + parseFloat(ev.price).toFixed(2)}</div>
                    <button class="btn btn-primary btn-sm" style="margin-top:0.5rem;">Details →</button>
                </div>
            </div>
        `).join('');
    } else {
        container.className = 'events-grid';
        container.innerHTML = data.events.map(ev => `
            <div class="event-card" onclick="window.location.href='event-detail.html?id=${escapeHtml(String(ev.id))}'">
                <div class="event-img-wrap">
                    <img loading="lazy" src="${escapeHtml(ev.image_url || 'https://images.unsplash.com/photo-1490750967868-88df5691a78b?q=80&w=600&auto=format&fit=crop')}" alt="${escapeHtml(ev.title)}">
                    <div class="event-date-badge"><span class="day">${getEventDay(ev.event_date)}</span><span class="month">${getEventMonth(ev.event_date)}</span></div>
                    <div class="event-type-badge">${escapeHtml(ev.event_type || 'Event')}</div>
                </div>
                <div class="event-body">
                    <span class="event-category">${escapeHtml(ev.event_category || '')}</span>
                    <h3>${escapeHtml(ev.title)}</h3>
                    <div class="event-meta">
                        <span><i class="bi bi-geo-alt"></i> ${escapeHtml(ev.location || 'Online')}</span>
                        <span><i class="bi bi-clock"></i> ${formatTime(ev.event_date)}</span>
                        ${ev.max_participants ? `<span><i class="bi bi-people"></i> ${ev.max_participants - (ev.registrations || 0)} spots</span>` : ''}
                    </div>
                    <div class="event-desc">${escapeHtml((ev.description || '').slice(0, 100))}${(ev.description || '').length > 100 ? '...' : ''}</div>
                    <div class="event-footer">
                        <span class="event-price${ev.price == 0 ? ' free' : ''}">${ev.price == 0 ? 'FREE' : '$' + parseFloat(ev.price).toFixed(2)}</span>
                        <button class="btn btn-primary btn-sm" onclick="event.stopPropagation(); window.location.href='event-detail.html?id=${escapeHtml(String(ev.id))}'">View Details →</button>
                    </div>
                </div>
            </div>
        `).join('');
    }

    renderPagination();
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

// ─── Calendar View ────────────────────────────────────────────────────────

async function loadCalendar() {
    const container = document.getElementById('eventsContainer');
    const monthNames = ['January','February','March','April','May','June','July','August','September','October','November','December'];

    let events = [];
    try {
        const res = await fetch(`/api/events/calendar?month=${calendarMonth}&year=${calendarYear}`);
        events = await res.json();
    } catch {}

    const firstDay = new Date(calendarYear, calendarMonth - 1, 1).getDay();
    const daysInMonth = new Date(calendarYear, calendarMonth, 0).getDate();
    const daysInPrev = new Date(calendarYear, calendarMonth - 1, 0).getDate();

    let html = `
        <div class="calendar-nav">
            <button onclick="calNav(-1)"><i class="bi bi-chevron-left"></i> Prev</button>
            <h3>${monthNames[calendarMonth - 1]} ${calendarYear}</h3>
            <button onclick="calNav(1)">Next <i class="bi bi-chevron-right"></i></button>
        </div>
        <div class="calendar-grid">
            <div class="calendar-header">Sun</div>
            <div class="calendar-header">Mon</div>
            <div class="calendar-header">Tue</div>
            <div class="calendar-header">Wed</div>
            <div class="calendar-header">Thu</div>
            <div class="calendar-header">Fri</div>
            <div class="calendar-header">Sat</div>
    `;

    for (let i = firstDay - 1; i >= 0; i--) {
        html += `<div class="calendar-day other-month"><span class="day-num">${daysInPrev - i}</span></div>`;
    }

    const today = new Date();
    for (let d = 1; d <= daysInMonth; d++) {
        const isToday = d === today.getDate() && calendarMonth === today.getMonth() + 1 && calendarYear === today.getFullYear();
        const dayEvents = events.filter(e => new Date(e.event_date).getDate() === d);
        html += `<div class="calendar-day${isToday ? ' today' : ''}" style="${isToday ? 'background:var(--primary-light);' : ''}">
            <span class="day-num" style="${isToday ? 'color:var(--primary-color);font-weight:700;' : ''}">${d}</span>
            ${dayEvents.map(e => `<div class="calendar-event ${getEventTypeClass(e.event_type)}" onclick="window.location.href='event-detail.html?id=${escapeHtml(String(e.id))}'" title="${escapeHtml(e.title)}">${escapeHtml(e.title)}</div>`).join('')}
        </div>`;
    }

    const totalCells = firstDay + daysInMonth;
    const remaining = 7 - (totalCells % 7);
    if (remaining < 7) {
        for (let i = 1; i <= remaining; i++) {
            html += `<div class="calendar-day other-month"><span class="day-num">${i}</span></div>`;
        }
    }

    html += '</div>';
    container.className = '';
    container.innerHTML = html;
}

function calNav(delta) {
    calendarMonth += delta;
    if (calendarMonth > 12) { calendarMonth = 1; calendarYear++; }
    if (calendarMonth < 1) { calendarMonth = 12; calendarYear--; }
    loadCalendar();
}

// ─── Event Detail Page ────────────────────────────────────────────────────

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
                    <h2><i class="bi bi-person-video3" style="color:var(--primary-color)"></i> Instructors</h2>
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
