// js/clubs.js — Clubs listing + detail orchestrator

const CLUB_CATEGORIES = [
  { slug: '', name: 'All Clubs' },
  { slug: 'Rose Growing', name: 'Rose Growing' },
  { slug: 'Wedding Floristry', name: 'Wedding Floristry' },
  { slug: 'Indoor Plants', name: 'Indoor Plants' },
  { slug: 'Garden Design', name: 'Garden Design' },
  { slug: 'Sustainable Gardening', name: 'Sustainable Gardening' },
  { slug: 'Flower Photography', name: 'Flower Photography' },
  { slug: 'Plant Trading', name: 'Plant Trading' },
  { slug: 'Native Flowers', name: 'Native Flowers' },
  { slug: 'Community Gardening', name: 'Community Gardening' }
];

let clubCurrentPage = 1;

// ─── Clubs Listing Page ─────────────────────────────────────────────────

function initClubsPage() {
  renderClubCategories();
  loadClubs();
  loadClubStats();

  document.getElementById('clubSearch')?.addEventListener('input', debounce(() => {
    clubCurrentPage = 1;
    loadClubs();
  }, 300));

  document.getElementById('clubCategoryTabs')?.addEventListener('click', e => {
    const tab = e.target.closest('.club-cat-tab');
    if (!tab) return;
    document.querySelectorAll('.club-cat-tab').forEach(t => t.classList.remove('active'));
    tab.classList.add('active');
    clubCurrentPage = 1;
    loadClubs();
  });

  document.getElementById('clubSortTabs')?.addEventListener('click', e => {
    const tab = e.target.closest('.club-sort-tab');
    if (!tab) return;
    document.querySelectorAll('.club-sort-tab').forEach(t => t.classList.remove('active'));
    tab.classList.add('active');
    clubCurrentPage = 1;
    loadClubs();
  });
}

function renderClubCategories() {
  const el = document.getElementById('clubCategoryTabs');
  if (!el) return;
  el.innerHTML = CLUB_CATEGORIES.map(c => `
    <button class="club-cat-tab${c.slug === '' ? ' active' : ''}" data-slug="${c.slug}">${c.name}</button>
  `).join('');
}

async function loadClubs() {
  const grid = document.getElementById('clubsGrid');
  if (!grid) return;
  grid.innerHTML = renderClubSkeleton();

  const cat = document.querySelector('.club-cat-tab.active')?.dataset.slug || '';
  const sort = document.querySelector('.club-sort-tab.active')?.dataset.sort || 'popular';
  const search = document.getElementById('clubSearch')?.value.trim() || '';
  const params = new URLSearchParams({ sort, page: clubCurrentPage, limit: 30 });
  if (cat) params.set('category', cat);
  if (search) params.set('search', search);

  try {
    const res = await fetch(`/api/clubs?${params}`);
    const data = await res.json();
    const clubs = data.clubs || [];
    if (!clubs.length) {
      grid.innerHTML = `
        <div class="club-empty">
          <i class="bi bi-people"></i>
          <h3>No clubs found</h3>
          <p>${search ? 'Try a different search term.' : 'Be the first to create one!'}</p>
          ${!search ? '<button class="btn btn-primary" onclick="openCreateClub()"><i class="bi bi-plus-lg"></i> Create Club</button>' : ''}
        </div>`;
      return;
    }
    grid.innerHTML = clubs.map(c => renderClubCard(c)).join('');
    const totalEl = document.getElementById('clubTotal');
    if (totalEl) totalEl.textContent = data.total || clubs.length;
  } catch {
    grid.innerHTML = '<div class="club-empty"><i class="bi bi-cloud-off"></i><h3>Could not load clubs</h3><p>Please try again later.</p></div>';
  }
}

async function loadClubStats() {
  try {
    const res = await fetch('/api/clubs/stats');
    const stats = await res.json();
    const el = document.getElementById('clubStats');
    if (el) el.innerHTML = `
      <div class="stat-card"><div class="num">${formatNumber(stats.clubs || 0)}</div><div class="label">Clubs</div></div>
      <div class="stat-card"><div class="num">${formatNumber(stats.members || 0)}</div><div class="label">Total Members</div></div>
    `;
  } catch {}
}

// ─── Create Club Modal ─────────────────────────────────────────────────

function openCreateClub() {
  if (!userLoggedIn()) { openAuthModal('login'); return; }
  // Use a simple prompt-based approach for now
  const name = prompt('Club name:');
  if (!name) return;
  const desc = prompt('Short description (optional):') || '';
  const cat = prompt('Category (e.g. "Rose Growing", "Wedding Floristry") or leave blank:') || '';
  submitCreateClub(name, desc, cat);
}

async function submitCreateClub(name, description, category) {
  try {
    const res = await fetch('/api/clubs', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...authHeaders() },
      body: JSON.stringify({ name, description, category })
    });
    if (!res.ok) { const err = await res.json(); throw new Error(err.error || 'Failed'); }
    const club = await res.json();
    window.location.href = `clubs.html?id=${club.id}`;
  } catch (err) {
    alert(err.message);
  }
}

// ─── Club Detail Page ──────────────────────────────────────────────────

async function initClubDetail() {
  const params = new URLSearchParams(window.location.search);
  const id = params.get('id');
  if (!id) { showClubError('Club not found'); return; }

  let club;
  try {
    const res = await fetch(`/api/clubs/${id}`, { headers: authHeaders() });
    if (!res.ok) throw new Error('Not found');
    club = await res.json();
  } catch {
    showClubError('Club not found');
    return;
  }

  document.title = `${club.name} | Flower Ecosystem Clubs`;
  document.getElementById('clubDetailContent').innerHTML = renderClubDetail(club);
}

function showClubError(msg) {
  const el = document.getElementById('clubDetailContent');
  if (el) el.innerHTML = `<div class="empty-state"><i class="bi bi-people"></i><h3>${msg}</h3><a href="clubs.html" class="btn btn-outline">Browse Clubs</a></div>`;
}

function renderClubDetail(club) {
  const members = club.members || [];
  const posts = club.posts || [];

  return `
    <div class="club-detail-layout">
      <div class="club-detail-main">
        <div class="club-detail-hero">
          ${club.cover_image ? `<img src="${escapeHtml(club.cover_image)}" alt="" class="club-cover">` : ''}
          <div class="club-detail-info">
            <span class="club-detail-icon">${club.icon || '🌿'}</span>
            <h1>${escapeHtml(club.name)}</h1>
            ${club.category ? `<span class="club-detail-cat">${escapeHtml(club.category)}</span>` : ''}
            <p>${escapeHtml(club.description || '')}</p>
            <div class="club-detail-meta">
              <span><i class="bi bi-people"></i> ${formatNumber(club.member_count || 0)} members</span>
              <span><i class="bi bi-chat-dots"></i> ${formatNumber(club.post_count || 0)} posts</span>
              ${club.creator_name ? `<span><i class="bi bi-person"></i> Created by ${escapeHtml(club.creator_name)}</span>` : ''}
            </div>
            ${userLoggedIn()
              ? (club.isMember
                ? `<button class="btn btn-outline btn-sm" onclick="leaveClub('${club.id}')"><i class="bi bi-person-dash"></i> Leave Club</button>
                   <div class="club-post-box">
                     <textarea id="clubPostInput" placeholder="Share something with the club..."></textarea>
                     <button class="btn btn-primary btn-sm" onclick="postToClub('${club.id}')"><i class="bi bi-send"></i> Post</button>
                   </div>`
                : `<button class="btn btn-primary btn-sm" onclick="joinClub('${club.id}')"><i class="bi bi-person-plus"></i> Join Club</button>`)
              : `<p style="font-size:0.85rem;color:var(--text-muted);"><a href="#" onclick="openAuthModal('login');return false;">Sign in</a> to join this club.</p>`}
          </div>
        </div>

        <h3 style="font-size:1.05rem;margin:1.25rem 0 0.75rem;">Posts (${posts.length})</h3>
        <div class="club-posts">
          ${posts.length ? posts.map(p => `
            <div class="club-post-card">
              <div class="club-post-author">
                <div class="club-post-avatar">
                  ${p.profile_image ? `<img src="${escapeHtml(p.profile_image)}" alt="">` : (p.first_name?.[0] || '?').toUpperCase()}
                </div>
                <div>
                  <div class="club-post-name">${escapeHtml([p.first_name, p.last_name].filter(Boolean).join(' ') || 'Anonymous')}</div>
                  <div class="club-post-time">${timeAgo(p.created_at)}</div>
                </div>
              </div>
              <div class="club-post-content">${escapeHtml(p.content)}</div>
              ${p.image_url ? `<img src="${escapeHtml(p.image_url)}" alt="" class="club-post-image">` : ''}
            </div>
          `).join('') : '<p style="color:var(--text-muted);font-size:0.88rem;">No posts yet. Be the first to share!</p>'}
        </div>
      </div>

      <div class="club-detail-sidebar">
        <div class="sidebar-card">
          <h3><i class="bi bi-people-fill"></i> Members (${members.length})</h3>
          ${members.length ? members.map(m => `
            <div class="club-member-item" onclick="window.location.href='profile.html?id=${m.id}'">
              <div class="club-member-avatar">
                ${m.profile_image ? `<img src="${escapeHtml(m.profile_image)}" alt="">` : (m.first_name?.[0] || '?').toUpperCase()}
              </div>
              <div>
                <div class="club-member-name">${escapeHtml([m.first_name, m.last_name].filter(Boolean).join(' ') || 'Anonymous')}</div>
                <div class="club-member-role">${m.role === 'admin' ? 'Admin' : m.role === 'moderator' ? 'Moderator' : 'Member'}</div>
              </div>
            </div>
          `).join('') : ''}
        </div>
      </div>
    </div>
  `;
}

async function joinClub(clubId) {
  if (!userLoggedIn()) { openAuthModal('login'); return; }
  try {
    await fetch(`/api/clubs/${clubId}/members`, { method: 'POST', headers: authHeaders() });
    window.location.reload();
  } catch { alert('Failed to join club'); }
}

async function leaveClub(clubId) {
  if (!confirm('Leave this club?')) return;
  try {
    await fetch(`/api/clubs/${clubId}/members`, { method: 'DELETE', headers: authHeaders() });
    window.location.reload();
  } catch { alert('Failed to leave club'); }
}

async function postToClub(clubId) {
  const content = document.getElementById('clubPostInput')?.value.trim();
  if (!content) return;
  try {
    const res = await fetch(`/api/clubs/${clubId}/posts`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...authHeaders() },
      body: JSON.stringify({ content })
    });
    if (!res.ok) throw new Error('Failed');
    window.location.reload();
  } catch { alert('Failed to post'); }
}

// ─── Utilities ─────────────────────────────────────────────────────────

function debounce(fn, ms) {
  let timer;
  return function (...args) { clearTimeout(timer); timer = setTimeout(() => fn.apply(this, args), ms); };
}

function formatNumber(n) {
  n = parseInt(n) || 0;
  return n >= 1000 ? (n / 1000).toFixed(1) + 'K' : String(n);
}

function escapeHtml(s) {
  if (!s) return '';
  const d = document.createElement('div');
  d.textContent = s;
  return d.innerHTML;
}

function timeAgo(dateStr) {
  const now = Date.now();
  const then = new Date(dateStr).getTime();
  const sec = Math.floor((now - then) / 1000);
  if (sec < 60) return 'just now';
  const min = Math.floor(sec / 60);
  if (min < 60) return min + 'm ago';
  const hrs = Math.floor(min / 60);
  if (hrs < 24) return hrs + 'h ago';
  const days = Math.floor(hrs / 24);
  if (days < 30) return days + 'd ago';
  return new Date(dateStr).toLocaleDateString();
}

function authHeaders() {
  const token = localStorage.getItem('flower-token');
  return token ? { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' } : { 'Content-Type': 'application/json' };
}

function userLoggedIn() {
  return !!localStorage.getItem('flower-token');
}
