// components/event-registration.js — Register modal, host event modal, attendee display

let currentRegisterEventId = null;
let hostImageFile = null;

function openRegisterModal(eventId) {
  if (!isLoggedIn()) { openAuthModal('login'); return; }
  currentRegisterEventId = eventId;
  const modal = document.getElementById('registerEventModal');
  if (!modal) return;
  modal.classList.add('open');
  document.body.style.overflow = 'hidden';
  loadRegisterModalDetails(eventId);
}

function closeRegisterModal() {
  const modal = document.getElementById('registerEventModal');
  if (modal) modal.classList.remove('open');
  document.body.style.overflow = '';
  currentRegisterEventId = null;
}

async function loadRegisterModalDetails(eventId) {
  const detailsEl = document.getElementById('registerEventDetails');
  const btnEl = document.getElementById('registerEventBtn');
  if (!detailsEl) return;
  detailsEl.innerHTML = '<p style="text-align:center;color:var(--text-muted);">Loading...</p>';
  if (btnEl) btnEl.disabled = true;

  try {
    const res = await fetchWithAuth(`/api/events/${eventId}`, { headers: authHeaders() });
    if (!res.ok) throw new Error('Not found');
    const event = await res.json();

    const spotsLeft = event.max_participants ? event.max_participants - (event.registrations || 0) : null;
    const isFull = spotsLeft !== null && spotsLeft <= 0;

    document.getElementById('registerModalTitle').textContent = escapeHtml(event.title);

    detailsEl.innerHTML = `
      <div style="display:flex;gap:1rem;margin-bottom:1rem;">
        <img src="${escapeHtml(event.image_url || 'https://images.unsplash.com/photo-1490750967868-88df5691a78b?q=80&w=200&auto=format&fit=crop')}" alt="" style="width:100px;height:70px;border-radius:8px;object-fit:cover;flex-shrink:0;">
        <div style="flex:1;">
          <div style="font-size:0.85rem;color:var(--text-light);margin-bottom:0.25rem;">${formatDate(event.event_date)} · ${formatTime(event.event_date)}</div>
          <div style="font-size:0.85rem;color:var(--text-light);margin-bottom:0.25rem;"><i class="bi bi-geo-alt"></i> ${escapeHtml(event.location || 'Online')}</div>
          <div style="font-size:0.85rem;font-weight:600;color:${event.price == 0 ? 'var(--accent-green)' : 'var(--primary-color)'};">${event.price == 0 ? 'FREE' : '$' + parseFloat(event.price).toFixed(2)}</div>
        </div>
      </div>
      ${spotsLeft !== null ? `<div style="font-size:0.85rem;color:var(--text-muted);margin-bottom:0.5rem;"><i class="bi bi-people"></i> ${spotsLeft} of ${event.max_participants} spots remaining</div>` : ''}
      ${isFull ? '<div style="color:var(--error-color);font-weight:600;margin-bottom:0.5rem;">This event is full</div>' : ''}
    `;

    if (btnEl) {
      if (event.is_registered) {
        btnEl.textContent = 'Already Registered';
        btnEl.disabled = true;
      } else if (isFull) {
        btnEl.textContent = 'Event Full';
        btnEl.disabled = true;
      } else {
        btnEl.textContent = 'Confirm Registration';
        btnEl.disabled = false;
      }
    }
  } catch {
    detailsEl.innerHTML = '<p style="text-align:center;color:var(--error-color);">Could not load event details</p>';
    if (btnEl) btnEl.disabled = true;
  }
}

async function confirmRegistration() {
  if (!currentRegisterEventId) return;
  const btnEl = document.getElementById('registerEventBtn');
  if (btnEl) { btnEl.disabled = true; btnEl.textContent = 'Registering...'; }

  try {
    const res = await fetch(`/api/events/${currentRegisterEventId}/register`, {
      method: 'POST',
      headers: authHeaders()
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Registration failed');

    if (btnEl) { btnEl.textContent = '✓ Registered'; }
    showToast('Successfully registered for the event!');

    setTimeout(() => {
      closeRegisterModal();
      if (typeof loadEvents === 'function') loadEvents();
      if (typeof loadSidebarData === 'function') loadSidebarData();
    }, 1000);
  } catch (err) {
    if (btnEl) { btnEl.disabled = false; btnEl.textContent = 'Confirm Registration'; }
    showToast(err.message || 'Registration failed');
  }
}

function openHostEventModal() {
  if (!isLoggedIn()) { openAuthModal('login'); return; }
  const modal = document.getElementById('hostEventModal');
  if (!modal) return;
  modal.classList.add('open');
  document.body.style.overflow = 'hidden';
  document.getElementById('hostEventForm').reset();
  document.getElementById('hostEventPreview').innerHTML = '';
  hostImageFile = null;
  document.getElementById('hostEventBtn').disabled = false;
  document.getElementById('hostEventBtn').textContent = 'Create Event';
}

function closeHostEventModal() {
  const modal = document.getElementById('hostEventModal');
  if (modal) modal.classList.remove('open');
  document.body.style.overflow = '';
  hostImageFile = null;
}

function handleHostImage(input) {
  const file = input.files[0];
  if (!file) return;
  if (!file.type.startsWith('image/') || file.size > 5 * 1024 * 1024) {
    showToast('Please select an image under 5MB');
    input.value = '';
    return;
  }
  hostImageFile = file;
  const reader = new FileReader();
  reader.onload = e => {
    document.getElementById('hostEventPreview').innerHTML = `<img src="${e.target.result}" style="width:100%;height:120px;object-fit:cover;border-radius:8px;">`;
  };
  reader.readAsDataURL(file);
}

async function submitHostEvent() {
  const title = document.getElementById('hostTitle').value.trim();
  const description = document.getElementById('hostDescription').value.trim();
  const eventDate = document.getElementById('hostDate').value;
  const eventTime = document.getElementById('hostTime').value;
  const location = document.getElementById('hostLocation').value.trim();
  const eventType = document.getElementById('hostType').value;
  const price = parseFloat(document.getElementById('hostPrice').value) || 0;
  const capacity = parseInt(document.getElementById('hostCapacity').value, 10) || null;
  const meetingLink = document.getElementById('hostMeetingLink').value.trim();

  if (!title || !eventDate) {
    showToast('Title and date are required');
    return;
  }

  const btnEl = document.getElementById('hostEventBtn');
  btnEl.disabled = true;
  btnEl.textContent = 'Creating...';

  try {
    const tzOffset = -new Date().getTimezoneOffset();
    const tzSign = tzOffset >= 0 ? '+' : '-';
    const tzHours = String(Math.floor(Math.abs(tzOffset) / 60)).padStart(2, '0');
    const tzMins = String(Math.abs(tzOffset) % 60).padStart(2, '0');
    const tzStr = `${tzSign}${tzHours}:${tzMins}`;

    const formData = new FormData();
    formData.append('title', title);
    formData.append('description', description || '');
    formData.append('event_date', `${eventDate}T${eventTime || '09:00'}:00${tzStr}`);
    formData.append('location', location || 'Online');
    formData.append('event_type', eventType || 'WORKSHOP');
    formData.append('price', String(price));
    formData.append('max_participants', capacity || '');
    if (meetingLink) formData.append('meeting_link', meetingLink);
    if (hostImageFile) formData.append('image', hostImageFile);

    const res = await fetchWithAuth('/api/events', {
      method: 'POST',
      body: formData
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Failed to create event');

    btnEl.textContent = '✓ Created!';
    showToast('Event created successfully!');

    setTimeout(() => {
      closeHostEventModal();
      if (typeof loadEvents === 'function') loadEvents();
      if (typeof loadSidebarData === 'function') loadSidebarData();
    }, 1000);
  } catch (err) {
    btnEl.disabled = false;
    btnEl.textContent = 'Create Event';
    showToast(err.message || 'Failed to create event');
  }
}

function closeAnyModal(event) {
  if (event.target === event.currentTarget) {
    if (document.getElementById('registerEventModal')?.classList.contains('open')) closeRegisterModal();
    if (document.getElementById('hostEventModal')?.classList.contains('open')) closeHostEventModal();
  }
}
