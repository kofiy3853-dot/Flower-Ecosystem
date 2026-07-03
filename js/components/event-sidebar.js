// components/event-sidebar.js — Upcoming week, popular organizers, recently added

async function loadUpcomingWeek(containerId) {
  const container = document.getElementById(containerId);
  if (!container) return;
  try {
    const now = new Date();
    const weekEnd = new Date(now);
    weekEnd.setDate(weekEnd.getDate() + 7);
    const res = await fetch('/api/events?limit=5&sort=date&status=upcoming');
    const data = await res.json();
    const events = (data.events || []).filter(e => {
      const d = new Date(e.event_date);
      return d >= now && d <= weekEnd;
    });
    if (!events.length) {
      container.innerHTML = '<p style="font-size:0.82rem;color:var(--text-muted);">No events this week</p>';
      return;
    }
    container.innerHTML = events.map(e => `
      <div class="suggest-event" onclick="openRegisterModal('${e.id}')" style="cursor:pointer;">
        <h4>${escapeHtml(e.title)}</h4>
        <p>${formatDate(e.event_date)} · ${escapeHtml(e.location || 'Online')} · ${e.price == 0 ? 'Free' : '$' + parseFloat(e.price).toFixed(2)}</p>
      </div>
    `).join('');
  } catch {
    container.innerHTML = '<p style="font-size:0.82rem;color:var(--text-muted);">Could not load events</p>';
  }
}

async function loadPopularOrganizers(containerId) {
  const container = document.getElementById(containerId);
  if (!container) return;
  try {
    const res = await fetch('/api/events?limit=50&sort=popular');
    const data = await res.json();
    const events = data.events || [];
    const organizerMap = {};
    events.forEach(e => {
      if (!e.organizer_id) return;
      if (!organizerMap[e.organizer_id]) {
        organizerMap[e.organizer_id] = { id: e.organizer_id, name: e.organizer_name || 'Organizer', count: 0, events: [] };
      }
      organizerMap[e.organizer_id].count++;
      organizerMap[e.organizer_id].events.push(e.title);
    });
    const organizers = Object.values(organizerMap).sort((a, b) => b.count - a.count).slice(0, 5);
    if (!organizers.length) {
      container.innerHTML = '<p style="font-size:0.82rem;color:var(--text-muted);">No organizers yet</p>';
      return;
    }
    container.innerHTML = organizers.map(o => `
      <div class="trending-city" style="cursor:default;">
        <i class="bi bi-person-circle" style="color:var(--primary-color);font-size:0.85rem;"></i>
        ${escapeHtml(o.name)}
        <span class="count">${o.count} event${o.count > 1 ? 's' : ''}</span>
      </div>
    `).join('');
  } catch {
    container.innerHTML = '<p style="font-size:0.82rem;color:var(--text-muted);">Could not load organizers</p>';
  }
}

async function loadRecentlyAdded(containerId) {
  const container = document.getElementById(containerId);
  if (!container) return;
  try {
    const res = await fetch('/api/events?limit=3&sort=newest&status=upcoming');
    const data = await res.json();
    const events = data.events || [];
    if (!events.length) {
      container.innerHTML = '<p style="font-size:0.82rem;color:var(--text-muted);">No events yet</p>';
      return;
    }
    container.innerHTML = events.map(e => `
      <div class="suggest-event" onclick="openRegisterModal('${e.id}')" style="cursor:pointer;">
        <h4>${escapeHtml(e.title)}</h4>
        <p>${formatDate(e.event_date)} · ${escapeHtml(e.location || 'Online')}</p>
      </div>
    `).join('');
  } catch {
    container.innerHTML = '<p style="font-size:0.82rem;color:var(--text-muted);">Could not load events</p>';
  }
}

async function loadEventStats(containerId) {
  const container = document.getElementById(containerId);
  if (!container) return;
  try {
    const res = await fetch('/api/events?limit=1');
    const data = await res.json();
    const total = data.total || 0;

    const attendeesRes = await fetch('/api/events?limit=100&sort=popular');
    const attendeesData = await attendeesRes.json();
    const attendees = (attendeesData.events || []).reduce((sum, e) => sum + (e.registrations || 0), 0);

    const orgRes = await fetch('/api/events?limit=200');
    const orgData = await orgRes.json();
    const orgs = new Set((orgData.events || []).filter(e => e.organizer_id).map(e => e.organizer_id));

    container.innerHTML = `
      <div class="stat-item"><div class="stat-num">${formatNumber(total)}</div><div class="stat-label">Events</div></div>
      <div class="stat-item"><div class="stat-num">${formatNumber(attendees)}</div><div class="stat-label">Attendees</div></div>
      <div class="stat-item"><div class="stat-num">${formatNumber(orgs.size)}</div><div class="stat-label">Organizers</div></div>
    `;
  } catch {
    container.innerHTML = `
      <div class="stat-item"><div class="stat-num">-</div><div class="stat-label">Events</div></div>
      <div class="stat-item"><div class="stat-num">-</div><div class="stat-label">Attendees</div></div>
      <div class="stat-item"><div class="stat-num">-</div><div class="stat-label">Organizers</div></div>
    `;
  }
}

async function loadTrendingLocations(containerId) {
  const container = document.getElementById(containerId);
  if (!container) return;
  try {
    const res = await fetch('/api/events?limit=200&sort=popular');
    const data = await res.json();
    const events = data.events || [];
    const locationMap = {};
    events.forEach(e => {
      const loc = (e.location || 'Online').trim();
      locationMap[loc] = (locationMap[loc] || 0) + 1;
    });
    const locations = Object.entries(locationMap)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5);

    if (!locations.length) {
      container.innerHTML = '<p style="font-size:0.82rem;color:var(--text-muted);">No location data</p>';
      return;
    }
    container.innerHTML = locations.map(([loc, count]) => `
      <div class="trending-city">
        <i class="bi bi-${loc === 'Online' ? 'globe' : 'geo-alt-fill'}" style="color:${loc === 'Online' ? 'var(--accent-blue)' : 'var(--primary-color)'};font-size:0.8rem;"></i>
        ${escapeHtml(loc)}
        <span class="count">${count} event${count > 1 ? 's' : ''}</span>
      </div>
    `).join('');
  } catch {
    container.innerHTML = '<p style="font-size:0.82rem;color:var(--text-muted);">Could not load locations</p>';
  }
}
