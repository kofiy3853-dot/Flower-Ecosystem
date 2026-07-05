// components/discussion-sidebar.js — Right sidebar widgets

// ─── Trending Topics ──────────────────────────────────────────

async function loadTrendingTopics() {
  const el = document.getElementById('trendingTopics');
  if (!el) return;
  try {
    const data = await api.fetchJSON('/api/feed/trending');
    if (data && data.length) {
      el.innerHTML = data.map(t =>
        `<div class="topic-tag">#${escapeHtml(t.tag || t)} <span class="count">${formatNumber(t.count || 0)}</span></div>`
      ).join('');
      return;
    }
  } catch {}
  el.innerHTML = `
    <div class="topic-tag">#RoseCare <span class="count">1.2K</span></div>
    <div class="topic-tag">#WeddingFlowers <span class="count">890</span></div>
    <div class="topic-tag">#IndoorPlants <span class="count">756</span></div>
    <div class="topic-tag">#FlowerBusiness <span class="count">620</span></div>
    <div class="topic-tag">#Orchids <span class="count">445</span></div>`;
}

// ─── Top Contributors ─────────────────────────────────────────

async function loadTopContributors() {
  const el = document.getElementById('topContributors');
  if (!el) return;
  try {
    const data = await api.fetchJSON('/api/discussions/top/contributors');
    const members = Array.isArray(data) ? data : [];
    if (!members.length) { el.innerHTML = '<p style="font-size:0.82rem;color:var(--text-muted);">No contributors yet</p>'; return; }
    el.innerHTML = members.slice(0, 5).map((m, i) => {
      const name = m.name || [m.first_name, m.last_name].filter(Boolean).join(' ') || 'Member';
      const score = (m.discussions || 0) * 10 + (m.replies || 0) * 5;
      const role = m.role || 'Contributor';
      const rep = getContributorRep(score);
      return `<div class="contributor-item">
        <div class="contributor-rank">${i + 1}</div>
        <div class="contributor-avatar">${m.profile_image ? `<img src="${escapeHtml(m.profile_image)}" alt="">` : name.charAt(0)}</div>
        <div class="contributor-info">
          <div class="contributor-name">${escapeHtml(name)} <i class="bi ${rep.icon}" style="font-size:0.7rem;"></i></div>
          <div class="contributor-role">${escapeHtml(role)}</div>
        </div>
        <div class="contributor-score">${formatNumber(score)}</div>
      </div>`;
    }).join('');
  } catch {
    el.innerHTML = '<p style="font-size:0.82rem;color:var(--text-muted);">Unable to load</p>';
  }
}

function getContributorRep(points) {
  if (points >= 5000) return { icon: 'bi-trophy', label: 'Community Leader' };
  if (points >= 1500) return { icon: 'bi-flower2', label: 'Mentor' };
  if (points >= 500) return { icon: 'bi-flower1', label: 'Expert' };
  if (points >= 100) return { icon: 'bi-tree', label: 'Contributor' };
  return { icon: 'bi-seedling', label: 'New Member' };
}

// ─── Community Stats ──────────────────────────────────────────

async function loadCommunityStats() {
  try {
    const res = await fetch('/api/discussions/stats/overview');
    const data = await res.json();
    const set = (id, val) => {
      const el = document.getElementById(id);
      if (el) el.textContent = formatNumber(val || 0);
    };
    set('statMembers', data.members);
    set('statDiscussions', data.discussions);
    set('statReplies', data.replies);
  } catch {}
}

// ─── Related Discussions ──────────────────────────────────────

async function loadRelatedDiscussions(category) {
  const el = document.getElementById('relatedDiscussions');
  if (!el) return;
  try {
    const params = new URLSearchParams({ limit: 4, sort: 'popular' });
    if (category) params.set('category', category);
    const res = await fetch('/api/discussions?' + params.toString());
    const data = await res.json();
    const list = data.discussions || [];
    if (!list.length) { el.innerHTML = '<p style="font-size:0.82rem;color:var(--text-muted);">No related discussions</p>'; return; }
    el.innerHTML = list.slice(0, 4).map(d =>
      `<div class="related-disc" onclick="window.location.href='discussion-detail.html?id=${d.id}'">
        <div class="related-disc-title">${escapeHtml(d.title || '')}</div>
        <div class="related-disc-meta">${formatNumber(d.reply_count || 0)} replies</div>
      </div>`
    ).join('');
  } catch {
    el.style.display = 'none';
  }
}

// ─── Reputation Levels Widget ─────────────────────────────────

function renderReputationLevels() {
  return `<div class="sidebar-card">
    <h3><i class="bi bi-award" style="color:var(--accent-gold)"></i> Reputation Levels</h3>
    <div style="font-size:0.82rem;color:var(--text-light);display:flex;flex-direction:column;gap:0.4rem;">
      <div>🌱 <strong>New Member</strong> — 0 pts</div>
      <div>🌿 <strong>Contributor</strong> — 100 pts</div>
      <div>🌸 <strong>Expert</strong> — 500 pts</div>
      <div>💐 <strong>Mentor</strong> — 1,500 pts</div>
      <div>🏆 <strong>Community Leader</strong> — 5,000 pts</div>
    </div>
  </div>`;
}


