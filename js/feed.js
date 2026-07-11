// js/feed.js — Main feed orchestrator

let feedPage = 1;
let feedTotalPages = 1;
let feedLoading = false;
let currentTab = 'for-you';
let currentFilter = 'latest';

document.addEventListener('DOMContentLoaded', () => { initFeed(); });

async function initFeed() {
  setupUserAvatar();
  setupTabs();
  setupFilters();
  setupInfiniteScroll();
  setupPostModalListeners();
  await loadFeed();
  loadSidebarData();
}

// ─── User ──────────────────────────────────────────────────────

function setupUserAvatar() {
  const updateAvatar = (id) => {
    const el = document.getElementById(id);
    if (!el) return;
    if (getCurrentUserId()) {
      const name = getUserName();
      const avatar = getUserAvatar();
      el.innerHTML = avatar ? `<img src="${escapeHtml(avatar)}" alt="">` : (name || '?')[0].toUpperCase();
    } else {
      el.textContent = '?';
    }
  };
  updateAvatar('feedUserAvatar');
  updateAvatar('modalUserAvatar');
}

function getUserName() {
  try {
    const p = JSON.parse(atob((localStorage.getItem('flower-user') || '').split('.')[1]));
    return p.name || p.email || 'User';
  } catch { return 'User'; }
}

function getUserAvatar() {
  try {
    const p = JSON.parse(atob((localStorage.getItem('flower-user') || '').split('.')[1]));
    return p.avatar || p.profile_image || null;
  } catch { return null; }
}

function getCurrentUserId() {
  try {
    const p = JSON.parse(atob((localStorage.getItem('flower-user') || '').split('.')[1]));
    return p.id || p.sub || null;
  } catch { return null; }
}

function authHeaders() {
  return { 'Content-Type': 'application/json', 'X-Requested-With': 'XMLHttpRequest' };
}

// ─── Tabs ──────────────────────────────────────────────────────

function setupTabs() {
  const el = document.getElementById('feedTabs');
  if (!el) return;
  el.addEventListener('click', e => {
    const tab = e.target.closest('.feed-tab');
    if (!tab) return;
    document.querySelectorAll('.feed-tab').forEach(t => t.classList.remove('active'));
    tab.classList.add('active');
    currentTab = tab.dataset.tab;
    resetFeed();
  });
}

// ─── Filters ───────────────────────────────────────────────────

function setupFilters() {
  const el = document.getElementById('feedFilters');
  if (!el) return;
  el.addEventListener('click', e => {
    const f = e.target.closest('.category-tab');
    if (!f) return;
    document.querySelectorAll('#feedFilters .category-tab').forEach(t => t.classList.remove('active'));
    f.classList.add('active');
    currentFilter = f.dataset.filter;
    resetFeed();
  });
}

// ─── Feed Loading ──────────────────────────────────────────────

function resetFeed() {
  feedPage = 1;
  feedTotalPages = 1;
  document.getElementById('feedContainer').innerHTML = '';
  document.getElementById('feedEnd').style.display = 'none';
  loadFeed();
}

function setupInfiniteScroll() {
  window.addEventListener('scroll', () => {
    if (feedLoading || feedPage >= feedTotalPages) return;
    if (window.innerHeight + window.scrollY >= document.body.offsetHeight - 600) loadFeed();
  });
}

async function loadFeed() {
  if (feedLoading) return;
  feedLoading = true;
  document.getElementById('feedLoading').style.display = 'block';
  try {
    const params = new URLSearchParams({ tab: currentTab, filter: currentFilter, page: feedPage, limit: 10 });
    const data = await api.fetchJSON(`/api/feed?${params}`);
    if (data.posts && data.posts.length) {
      feedTotalPages = data.pages || 1;
      const container = document.getElementById('feedContainer');
      data.posts.forEach(p => container.insertAdjacentHTML('beforeend', renderFeedCard(p)));
      feedPage++;
    } else if (feedPage === 1) {
      renderEmptyFeed();
    }
    if (feedPage >= feedTotalPages) document.getElementById('feedEnd').style.display = 'block';
  } catch {
    if (feedPage === 1) {
      document.getElementById('feedContainer').innerHTML = `<div style="text-align:center;padding:3rem;color:var(--text-muted);">
        <i class="bi bi-exclamation-circle" style="font-size:3rem;display:block;margin-bottom:1rem;opacity:0.5;"></i>
        <h3>Could not load feed</h3><p>Please try again later.</p>
      </div>`;
    }
  } finally {
    feedLoading = false;
    document.getElementById('feedLoading').style.display = 'none';
  }
}

function renderEmptyFeed() {
  document.getElementById('feedContainer').innerHTML = `<div class="empty-feed">
    <i class="bi bi-flower1"></i>
    <h3>Welcome!</h3>
    <p>Follow florists, clubs and flower businesses to personalize your feed.</p>
    <div class="empty-feed-actions">
      <a href="members.html" class="btn btn-primary">Explore Members</a>
      <a href="clubs.html" class="btn btn-outline">Explore Clubs</a>
    </div>
  </div>`;
}

// ─── Sidebar ───────────────────────────────────────────────────

async function loadSidebarData() {
  loadTrendingTopics();
  loadSuggestedMembers();
  loadUpcomingEvents();
}

async function loadTrendingTopics() {
  try {
    const data = await api.fetchJSON('/api/feed/trending');
    if (data && data.length) {
      document.getElementById('trendingTopics').innerHTML = data.map(t =>
        `<span class="trending-tag">#${escapeHtml(t.tag || t)}<span class="tag-count">${formatNumber(t.count || 0)} posts</span></span>`
      ).join('');
    }
  } catch {}
}

async function loadSuggestedMembers() {
  try {
    const data = await api.fetchJSON('/api/feed/suggested?limit=3');
    const members = Array.isArray(data) ? data : (data.members || []);
    if (!members.length) { document.getElementById('suggestedMembers').innerHTML = '<p style="font-size:0.82rem;color:var(--text-muted);">No suggestions yet</p>'; return; }
    document.getElementById('suggestedMembers').innerHTML = members.map(m => {
      const name = [m.first_name, m.last_name].filter(Boolean).join(' ') || m.name || 'Member';
      return `<div class="suggested-member">
        <div class="suggested-avatar">${m.profile_image ? `<img src="${escapeHtml(m.profile_image)}" alt="">` : name.charAt(0)}</div>
        <div class="suggested-info">
          <div class="suggested-name">${escapeHtml(name)}</div>
          <div class="suggested-role">${escapeHtml(m.role || 'Member')}</div>
        </div>
        <button class="suggested-follow-btn" onclick="followUser('${m.id}',this)">Follow</button>
      </div>`;
    }).join('');
  } catch {}
}

async function loadUpcomingEvents() {
  try {
    const data = await api.fetchJSON('/api/events?limit=3&status=upcoming&sort=date');
    const events = data.events || [];
    if (!events.length) { document.getElementById('upcomingEvents').innerHTML = '<p style="font-size:0.82rem;color:var(--text-muted);">No upcoming events</p>'; return; }
    document.getElementById('upcomingEvents').innerHTML = events.slice(0, 3).map(e =>
      `<div class="upcoming-event">
        <div class="upcoming-event-title" onclick="window.location.href='event-detail.html?id=${e.id}'">${escapeHtml(e.title)}</div>
        <div class="upcoming-event-meta"><i class="bi bi-calendar"></i> ${formatDate(e.event_date)}${e.location ? ' · ' + escapeHtml(e.location) : ''}</div>
      </div>`
    ).join('');
  } catch {}
}

async function followUser(userId, btn) {
  if (!getCurrentUserId()) { openAuthModal('login'); return; }
  try {
    await fetch(`/api/users/${userId}/follow`, { method: 'POST', headers: authHeaders() });
    btn.textContent = 'Following';
    btn.style.background = 'var(--primary-color)';
    btn.style.color = 'white';
    btn.style.borderColor = 'var(--primary-color)';
    btn.onclick = null;
  } catch {}
}

// ─── Poll ──────────────────────────────────────────────────────

async function votePoll(pollId, optionIndex) {
  if (!getCurrentUserId()) { openAuthModal('login'); return; }
  try {
    const data = await api.fetchJSON(`/api/feed/${pollId}/vote`, {
      method: 'POST', headers: authHeaders(), body: JSON.stringify({ option: optionIndex })
    });
    const card = document.querySelector(`[data-id="${pollId}"]`);
    if (card) card.outerHTML = renderPollCard(data);
  } catch {}
}

// ─── Post Modal ────────────────────────────────────────────────

function setupPostModalListeners() {
  const textarea = document.getElementById('postContent');
  const submitBtn = document.getElementById('submitPostBtn');
  if (!textarea || !submitBtn) return;
  textarea.addEventListener('input', () => {
    submitBtn.disabled = !textarea.value.trim() && !postImageFiles.length && !postVideoFile;
  });
  const modal = document.getElementById('createPostModal');
  if (modal) modal.addEventListener('click', e => { if (e.target === e.currentTarget) closeCreateModal(); });
}

// ─── Helpers ───────────────────────────────────────────────────

function escapeHtml(s) {
  if (!s) return '';
  const d = document.createElement('div');
  d.textContent = s;
  return d.innerHTML;
}

function showToast(msg) {
  let t = document.getElementById('feedToast');
  if (!t) {
    t = document.createElement('div');
    t.id = 'feedToast';
    t.style.cssText = 'position:fixed;bottom:2rem;right:2rem;background:var(--text-main);color:var(--bg-white);padding:0.75rem 1.5rem;border-radius:8px;font-size:0.9rem;z-index:9999;opacity:0;transform:translateY(20px);transition:all 0.3s;pointer-events:none;';
    document.body.appendChild(t);
  }
  t.textContent = msg;
  t.style.opacity = '1';
  t.style.transform = 'translateY(0)';
  clearTimeout(t._t);
  t._t = setTimeout(() => { t.style.opacity = '0'; t.style.transform = 'translateY(20px)'; }, 2500);
}

function capitalizeFirst(s) { return s ? s.charAt(0).toUpperCase() + s.slice(1) : ''; }

function formatNumber(n) {
  if (n >= 1000000) return (n / 1000000).toFixed(1) + 'M';
  if (n >= 1000) return (n / 1000).toFixed(1) + 'K';
  return n || 0;
}

function formatDate(dateStr) {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

function openAuthModal(mode) {
  if (typeof openLoginModal === 'function') openLoginModal();
  else alert('Please sign in first');
}
