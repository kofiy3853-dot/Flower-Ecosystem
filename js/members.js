// js/members.js — Members directory orchestrator

let mbPage = 1;
let mbRole = '';
let mbSort = 'discussions';

// ─── Init ──────────────────────────────────────────────────────────────

function initMembersPage() {
  loadStats();
  loadFeatured();
  loadMembers();
  loadTopContributors();
  loadNewMembers();
  loadSuggested();

  document.getElementById('mbSearchBtn')?.addEventListener('click', () => { mbPage = 1; loadMembers(); });
  document.getElementById('mbSearch')?.addEventListener('keydown', e => { if (e.key === 'Enter') { mbPage = 1; loadMembers(); } });
  document.getElementById('mbRoleFilter')?.addEventListener('change', () => { mbRole = document.getElementById('mbRoleFilter').value; mbPage = 1; loadMembers(); });
  document.getElementById('mbSortTabs')?.addEventListener('click', e => {
    const tab = e.target.closest('.mb-sort-tab');
    if (!tab) return;
    document.querySelectorAll('.mb-sort-tab').forEach(t => t.classList.remove('active'));
    tab.classList.add('active');
    mbSort = tab.dataset.sort;
    mbPage = 1;
    loadMembers();
  });
}

// ─── Animated Counter ─────────────────────────────────────────────────

function animateCounter(el, target, suffix = '') {
  const duration = 1200;
  const start = performance.now();
  const initVal = parseInt(el.textContent.replace(/[^0-9]/g, '')) || 0;

  function tick(now) {
    const pct = Math.min(1, (now - start) / duration);
    const eased = 1 - Math.pow(1 - pct, 3);
    const current = Math.round(initVal + (target - initVal) * eased);
    el.textContent = formatNumber(current) + suffix;
    if (pct < 1) requestAnimationFrame(tick);
  }
  requestAnimationFrame(tick);
}

// ─── Stats ────────────────────────────────────────────────────────────

async function loadStats() {
  const el = document.getElementById('mbStats');
  try {
    const res = await fetch('/api/members/stats');
    const s = await res.json();
    el.innerHTML = `
      <div class="mb-stat-card"><div class="num" id="statMembers">0</div><div class="label">👥 Members</div></div>
      <div class="mb-stat-card"><div class="num" id="statCountries">0</div><div class="label">🌍 Countries</div></div>
      <div class="mb-stat-card"><div class="num" id="statActive">0</div><div class="label">💬 Active Today</div></div>
      <div class="mb-stat-card"><div class="num" id="statBusinesses">0</div><div class="label">🏪 Businesses</div></div>
      <div class="mb-stat-card"><div class="num" id="statExperts">0</div><div class="label">🎓 Experts</div></div>
      <div class="mb-stat-card"><div class="num" id="statClubs">0</div><div class="label">🌸 Clubs</div></div>
    `;
    requestAnimationFrame(() => {
      animateCounter(document.getElementById('statMembers'), s.members || 0);
      animateCounter(document.getElementById('statCountries'), s.countries || 0);
      animateCounter(document.getElementById('statActive'), s.active_today || 0);
      animateCounter(document.getElementById('statBusinesses'), s.businesses || 0);
      animateCounter(document.getElementById('statExperts'), s.experts || 0);
      animateCounter(document.getElementById('statClubs'), s.clubs || 0);
    });
  } catch { el.innerHTML = ''; }
}

// ─── Featured Members ─────────────────────────────────────────────────

async function loadFeatured() {
  const grid = document.getElementById('mbFeaturedGrid');
  const section = document.getElementById('mbFeaturedSection');
  try {
    const res = await fetch('/api/members/featured');
    const members = await res.json();
    if (!members.length) { section.style.display = 'none'; return; }
    section.style.display = 'block';
    grid.innerHTML = members.map(m => renderFeaturedMember(m)).join('');
  } catch { section.style.display = 'none'; }
}

// ─── Member Directory ─────────────────────────────────────────────────

async function loadMembers() {
  const grid = document.getElementById('mbGrid');
  if (!grid) return;
  grid.innerHTML = '<div class="section-skeleton" style="grid-column:1/-1;"><div class="spinner"></div></div>';

  const search = document.getElementById('mbSearch')?.value.trim() || '';
  const params = new URLSearchParams({ sort: mbSort, page: mbPage, limit: 24 });
  if (mbRole) params.set('role', mbRole);
  if (search) params.set('search', search);

  try {
    const res = await fetch(`/api/users/list/members?${params}`);
    const data = await res.json();
    const members = data.members || [];

    const countEl = document.getElementById('mbCount');
    if (countEl) countEl.textContent = data.total ? `${data.total} member${data.total !== 1 ? 's' : ''} found` : '';
    renderPagination(data);

    if (!members.length) {
      grid.innerHTML = `
        <div class="mb-empty">
          <i class="bi bi-people"></i>
          <h3>No members found</h3>
          <p>Try changing your search filters.</p>
          <button class="btn btn-outline btn-sm" onclick="resetFilters()">Browse Everyone</button>
        </div>`;
      return;
    }
    grid.innerHTML = members.map(m => renderMemberCard(m, { showFollow: false })).join('');
  } catch {
    grid.innerHTML = '<div class="mb-empty"><i class="bi bi-cloud-off"></i><h3>Could not load members</h3><p>Please try again later.</p></div>';
  }
}

function resetFilters() {
  document.getElementById('mbSearch').value = '';
  document.getElementById('mbRoleFilter').value = '';
  mbRole = '';
  mbPage = 1;
  document.querySelectorAll('.mb-sort-tab').forEach(t => t.classList.remove('active'));
  document.querySelector('.mb-sort-tab[data-sort="discussions"]')?.classList.add('active');
  mbSort = 'discussions';
  loadMembers();
}

function renderPagination(data) {
  const el = document.getElementById('mbPagination');
  const { page = 1, pages = 1 } = data;
  if (pages <= 1) { el.innerHTML = ''; return; }
  let html = '';
  if (page > 1) html += `<button class="page-btn" onclick="mbGoTo(${page - 1})"><i class="bi bi-chevron-left"></i></button>`;
  for (let i = 1; i <= pages; i++) {
    if (pages > 7 && i > 3 && i < pages - 2 && Math.abs(i - page) > 1) {
      if (i === 4 || i === pages - 3) html += '<span style="padding:0.4rem 0.3rem;color:var(--text-muted)">...</span>';
      continue;
    }
    html += `<button class="page-btn${i === page ? ' active' : ''}" onclick="mbGoTo(${i})">${i}</button>`;
  }
  if (page < pages) html += `<button class="page-btn" onclick="mbGoTo(${page + 1})"><i class="bi bi-chevron-right"></i></button>`;
  el.innerHTML = html;
}

function mbGoTo(p) { mbPage = p; loadMembers(); window.scrollTo({ top: 0, behavior: 'smooth' }); }

// ─── Top Contributors ─────────────────────────────────────────────────

async function loadTopContributors() {
  const el = document.getElementById('mbTopList');
  try {
    const res = await fetch('/api/members/top');
    const members = await res.json();
    if (!members.length) { el.innerHTML = '<p style="font-size:0.82rem;color:var(--text-muted);">No contributors yet.</p>'; return; }
    el.innerHTML = members.slice(0, 5).map((m, i) => renderTopContributor(m, i)).join('');
  } catch { el.innerHTML = '<p style="font-size:0.82rem;color:var(--text-muted);">Could not load.</p>'; }
}

// ─── New Members ──────────────────────────────────────────────────────

async function loadNewMembers() {
  const el = document.getElementById('mbNewList');
  try {
    const res = await fetch('/api/members/new');
    const members = await res.json();
    if (!members.length) { el.innerHTML = '<p style="font-size:0.82rem;color:var(--text-muted);">No new members.</p>'; return; }
    el.innerHTML = members.slice(0, 5).map(m => renderNewMember(m)).join('');
  } catch { el.innerHTML = '<p style="font-size:0.82rem;color:var(--text-muted);">Could not load.</p>'; }
}

// ─── Suggested Connections ────────────────────────────────────────────

async function loadSuggested() {
  const section = document.getElementById('mbSuggestedSection');
  const list = document.getElementById('mbSuggestedList');
  if (!userLoggedIn()) { section.style.display = 'none'; return; }
  try {
    const res = await fetchWithAuth('/api/members/suggested', { headers: authHeaders() });
    const members = await res.json();
    if (!members.length) { section.style.display = 'none'; return; }
    section.style.display = 'block';
    list.innerHTML = members.slice(0, 5).map(m => renderSuggestedMember(m)).join('');
  } catch { section.style.display = 'none'; }
}

// ─── Follow action ────────────────────────────────────────────────────

async function mbFollow(btn) {
  if (!userLoggedIn()) { openAuthModal('login'); return; }
  const id = btn.dataset.id;
  try {
    await fetch(`/api/users/${id}/follow`, { method: 'POST', headers: { 'Content-Type': 'application/json', 'X-Requested-With': 'XMLHttpRequest' }, credentials: 'include' });
    btn.textContent = '✓';
    btn.classList.add('saved');
    btn.disabled = true;
  } catch {}
}

function authHeaders() {
  return { 'Content-Type': 'application/json', 'X-Requested-With': 'XMLHttpRequest' };
}

function userLoggedIn() {
  return !!localStorage.getItem('flower-user');
}
