// components/event-card.js — Card renderer, featured banner, categories, calendar

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

function renderEventCard(event, view) {
  if (view === 'list') return renderEventListItem(event);
  return renderEventGridCard(event);
}

function renderEventGridCard(event) {
  const spotsLeft = event.max_participants ? event.max_participants - (event.registrations || 0) : null;
  const isFull = spotsLeft !== null && spotsLeft <= 0;
  const isLimited = spotsLeft !== null && spotsLeft < 10 && spotsLeft > 0;

  return `
    <div class="evt-card" onclick="openRegisterModal('${event.id}')">
      <div class="evt-card-img">
        <img loading="lazy" src="${escapeHtml(event.image_url || 'https://images.unsplash.com/photo-1490750967868-88df5691a78b?q=80&w=600&auto=format&fit=crop')}" alt="${escapeHtml(event.title)}">
        <div class="evt-card-date-badge"><span class="day">${getEventDay(event.event_date)}</span><span class="month">${getEventMonth(event.event_date)}</span></div>
        <div class="evt-card-badges">
          ${event.is_featured ? '<span class="evt-badge featured">Featured</span>' : ''}
          ${event.price == 0 ? '<span class="evt-badge free">Free</span>' : ''}
          ${(!event.location || event.location.toLowerCase() === 'online') ? '<span class="evt-badge online">Online</span>' : ''}
          ${isLimited ? '<span class="evt-badge limited">Limited Seats</span>' : ''}
          ${isFull ? '<span class="evt-badge sold-out">Sold Out</span>' : ''}
        </div>
      </div>
      <div class="evt-card-body">
        <span class="evt-card-category">${escapeHtml(event.event_category || event.event_type || '')}</span>
        <h3>${escapeHtml(event.title)}</h3>
        <div class="evt-card-meta">
          <span><i class="bi bi-geo-alt"></i> ${escapeHtml(event.location || 'Online')}</span>
          <span><i class="bi bi-clock"></i> ${formatTime(event.event_date)}</span>
          ${spotsLeft !== null ? `<span><i class="bi bi-people"></i> ${spotsLeft} spots</span>` : ''}
        </div>
        <div class="evt-card-desc">${escapeHtml((event.description || '').slice(0, 100))}</div>
        <div class="evt-card-footer">
          <span class="evt-card-price${event.price == 0 ? ' free' : ''}">${event.price == 0 ? 'FREE' : '$' + parseFloat(event.price).toFixed(2)}</span>
          <button class="btn btn-primary btn-sm" onclick="event.stopPropagation(); openRegisterModal('${event.id}')">Register</button>
        </div>
      </div>
    </div>`;
}

function renderEventListItem(event) {
  const spotsLeft = event.max_participants ? event.max_participants - (event.registrations || 0) : null;
  return `
    <div class="evt-list-item" onclick="openRegisterModal('${event.id}')">
      <div class="evt-list-date"><span class="day">${getEventDay(event.event_date)}</span><span class="month">${getEventMonth(event.event_date)}</span></div>
      <div>
        <div style="display:flex;gap:0.3rem;margin-bottom:0.3rem;">
          ${event.is_featured ? '<span class="evt-badge featured">Featured</span>' : ''}
          ${event.price == 0 ? '<span class="evt-badge free">Free</span>' : ''}
          ${(!event.location || event.location.toLowerCase() === 'online') ? '<span class="evt-badge online">Online</span>' : ''}
        </div>
        <h3>${escapeHtml(event.title)}</h3>
        <div class="evt-list-meta">
          <span><i class="bi bi-geo-alt"></i> ${escapeHtml(event.location || 'Online')}</span>
          <span><i class="bi bi-clock"></i> ${formatTime(event.event_date)}</span>
          ${spotsLeft !== null ? `<span><i class="bi bi-people"></i> ${spotsLeft} spots left</span>` : ''}
        </div>
      </div>
      <div style="text-align:right;">
        <div class="evt-card-price${event.price == 0 ? ' free' : ''}">${event.price == 0 ? 'FREE' : '$' + parseFloat(event.price).toFixed(2)}</div>
        <button class="btn btn-primary btn-sm" style="margin-top:0.5rem;" onclick="event.stopPropagation(); openRegisterModal('${event.id}')">Register</button>
      </div>
    </div>`;
}

function renderCategoryCards(categories, activeSlug, onSelect) {
  return categories.map(c => `
    <div class="evt-cat-card${activeSlug === c.slug ? ' active' : ''}" data-slug="${c.slug}" onclick="${onSelect ? onSelect + "('" + c.slug + "')" : ''}">
      <div class="evt-cat-card-icon">${c.icon}</div>
      <div class="evt-cat-card-name">${c.name}</div>
    </div>
  `).join('');
}

function renderMobileCategoryChips(categories, activeSlug) {
  return categories.map(c => `
    <span class="evt-chip${activeSlug === c.slug ? ' active' : ''}" data-slug="${c.slug}" onclick="selectCategory('${c.slug}');closeMobileFilter();">
      ${c.icon} ${c.name}
    </span>
  `).join('');
}

function renderFeaturedBanner(event) {
  if (!event) return '';
  return `
    <div class="evt-featured-slide" style="cursor:pointer;">
      <img src="${escapeHtml(event.image_url || 'https://images.unsplash.com/photo-1490750967868-88df5691a78b?q=80&w=1200&auto=format&fit=crop')}" alt="${escapeHtml(event.title)}">
      <div class="evt-featured-overlay">
        <div class="evt-featured-badge"><i class="bi bi-star-fill"></i> Featured Event</div>
        <h2>${escapeHtml(event.title)}</h2>
        <div class="evt-featured-meta">
          <span><i class="bi bi-calendar"></i> ${formatDate(event.event_date)}</span>
          <span><i class="bi bi-clock"></i> ${formatTime(event.event_date)}</span>
          <span><i class="bi bi-geo-alt"></i> ${escapeHtml(event.location || 'Online')}</span>
          <span><i class="bi bi-people"></i> ${event.registrations || 0} Registered</span>
        </div>
      </div>
    </div>`;
}

function renderPagination(currentPage, totalPages, goToPageFn) {
  if (totalPages <= 1) return '';
  let html = '';
  if (currentPage > 1) html += `<button class="page-btn" onclick="${goToPageFn}(${currentPage - 1})"><i class="bi bi-chevron-left"></i></button>`;
  for (let i = 1; i <= totalPages; i++) {
    if (totalPages > 7 && i > 3 && i < totalPages - 2 && Math.abs(i - currentPage) > 1) {
      if (i === 4 || i === totalPages - 3) html += `<span style="padding:0.4rem 0.3rem;color:var(--text-muted)">...</span>`;
      continue;
    }
    html += `<button class="page-btn${i === currentPage ? ' active' : ''}" onclick="${goToPageFn}(${i})">${i}</button>`;
  }
  if (currentPage < totalPages) html += `<button class="page-btn" onclick="${goToPageFn}(${currentPage + 1})"><i class="bi bi-chevron-right"></i></button>`;
  return html;
}

function renderCalendarMonth(month, year, events) {
  const monthNames = ['January','February','March','April','May','June','July','August','September','October','November','December'];
  const firstDay = new Date(year, month - 1, 1).getDay();
  const daysInMonth = new Date(year, month, 0).getDate();
  const daysInPrev = new Date(year, month - 1, 0).getDate();

  let html = `
    <div class="evt-cal-nav">
      <button onclick="calNav(-1)"><i class="bi bi-chevron-left"></i> Prev</button>
      <h3>${monthNames[month - 1]} ${year}</h3>
      <button onclick="calNav(1)">Next <i class="bi bi-chevron-right"></i></button>
    </div>
    <div class="evt-cal-grid">
      <div class="evt-cal-header">Sun</div>
      <div class="evt-cal-header">Mon</div>
      <div class="evt-cal-header">Tue</div>
      <div class="evt-cal-header">Wed</div>
      <div class="evt-cal-header">Thu</div>
      <div class="evt-cal-header">Fri</div>
      <div class="evt-cal-header">Sat</div>
  `;

  for (let i = firstDay - 1; i >= 0; i--) {
    html += `<div class="evt-cal-day other-month"><span class="day-num">${daysInPrev - i}</span></div>`;
  }

  const today = new Date();
  for (let d = 1; d <= daysInMonth; d++) {
    const isToday = d === today.getDate() && month === today.getMonth() + 1 && year === today.getFullYear();
    const dayEvents = events.filter(e => new Date(e.event_date).getDate() === d);
    html += `<div class="evt-cal-day${isToday ? ' today' : ''}">
      <span class="day-num" style="${isToday ? 'color:var(--primary-color);font-weight:700;' : ''}">${d}</span>
      ${dayEvents.map(e => `<div class="evt-cal-event ${getEventTypeClass(e.event_type)}" onclick="openRegisterModal('${e.id}')" title="${escapeHtml(e.title)}">${escapeHtml(e.title)}</div>`).join('')}
    </div>`;
  }

  const totalCells = firstDay + daysInMonth;
  const remaining = 7 - (totalCells % 7);
  if (remaining < 7) {
    for (let i = 1; i <= remaining; i++) {
      html += `<div class="evt-cal-day other-month"><span class="day-num">${i}</span></div>`;
    }
  }

  html += '</div>';
  return html;
}

function renderMiniCalendar(month, year) {
  const monthNames = ['January','February','March','April','May','June','July','August','September','October','November','December'];
  const dayNames = ['S','M','T','W','T','F','S'];
  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const daysInPrev = new Date(year, month, 0).getDate();
  const today = new Date();

  let html = dayNames.map(d => `<div class="mini-cal-day">${d}</div>`).join('');

  for (let i = firstDay - 1; i >= 0; i--) {
    html += `<div class="mini-cal-date other">${daysInPrev - i}</div>`;
  }

  for (let d = 1; d <= daysInMonth; d++) {
    const isToday = d === today.getDate() && month === today.getMonth() && year === today.getFullYear();
    html += `<div class="mini-cal-date${isToday ? ' today' : ''}">${d}</div>`;
  }

  const totalCells = firstDay + daysInMonth;
  const remaining = 7 - (totalCells % 7);
  if (remaining < 7) {
    for (let i = 1; i <= remaining; i++) {
      html += `<div class="mini-cal-date other">${i}</div>`;
    }
  }

  return { html, title: `${monthNames[month]} ${year}` };
}

function renderEmptyState(viewType) {
  return `
    <div class="empty-state">
      <i class="bi bi-calendar-x"></i>
      <h3>No events found</h3>
      <p>Try selecting a different category or adjusting your filters.</p>
      <button class="btn btn-primary" style="margin-top:1rem;" onclick="resetFilters()">
        <i class="bi bi-brush"></i> Browse All Events
      </button>
    </div>`;
}
