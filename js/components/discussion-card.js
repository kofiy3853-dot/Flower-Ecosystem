// components/discussion-card.js — Discussion card renderer with status, tags, reputation

function renderDiscussionCard(d) {
  const author = d.author_name || [d.first_name, d.last_name].filter(Boolean).join(' ') || 'Anonymous';
  const initial = author.charAt(0).toUpperCase();
  const avatar = d.author_avatar || d.profile_image;
  const replies = d.reply_count != null ? d.reply_count : (d.comment_count || 0);
  const views = d.views != null ? d.views : (d.view_count || 0);
  const helpful = d.helpful_count || 0;
  const category = d.category_name || d.category || 'General';
  const excerpt = d.excerpt || (d.content || '').slice(0, 160);
  const tags = d.tags || [];
  const hasImage = d.image;

  const status = getDiscussionStatus(d);
  const repScore = replies * 10 + helpful * 2;
  const repLevel = getRepLevel(repScore);
  const isHot = d.views > 1000;
  const isNew = Date.now() - new Date(d.created_at).getTime() < 86400000;

  return `<div class="disc-card${d.is_pinned ? ' pinned' : ''}${d.is_solved ? ' solved' : ''}" onclick="window.location.href='discussion-detail.html?id=${d.id}'">
    <div class="disc-avatar">${avatar ? `<img src="${escapeHtml(avatar)}" alt="">` : initial}</div>
    <div class="disc-body">
      <div style="display:flex;align-items:center;gap:0.4rem;flex-wrap:wrap;margin-bottom:0.2rem;">
        <span class="disc-status ${status.class}"><i class="bi ${status.icon}"></i> ${status.label}</span>
        ${d.is_pinned ? '<span class="disc-badge pinned"><i class="bi bi-pin-fill"></i> Pinned</span>' : ''}
        ${d.is_solved ? '<span class="disc-badge solved"><i class="bi bi-check-lg"></i> Solved</span>' : ''}
        ${isExpertRole(d.author_role) ? '<span class="disc-badge expert">Expert</span>' : ''}
        ${isHot ? '<span class="disc-badge trending"><i class="bi bi-fire"></i> Trending</span>' : ''}
        ${isNew ? '<span class="disc-badge new"><i class="bi bi-star"></i> New</span>' : ''}
      </div>
      <div class="disc-title">${escapeHtml(d.title)}</div>
      <div class="disc-meta">
        <span class="author"><i class="bi bi-person-circle"></i> ${escapeHtml(author)} <span style="font-size:0.7rem;color:var(--text-muted);">${repLevel.icon}</span></span>
        <span><i class="bi bi-tag"></i> ${escapeHtml(category)}</span>
        <span><i class="bi bi-clock"></i> ${timeAgo(d.created_at)}</span>
      </div>
      <div class="disc-excerpt">${escapeHtml(excerpt)}</div>
      ${tags.length ? `<div class="disc-tags">${tags.map(t => `<span class="disc-tag">#${escapeHtml(t)}</span>`).join('')}</div>` : ''}
    </div>
    ${hasImage ? `<div class="disc-card-image"><img src="${escapeHtml(hasImage)}" alt="" loading="lazy"></div>` : ''}
    <div class="disc-stats">
      <div class="disc-stat" title="Replies"><i class="bi bi-chat-dots"></i> ${replies}</div>
      <div class="disc-stat" title="Views"><i class="bi bi-eye"></i> ${formatNumber(views)}</div>
      <div class="disc-stat" title="Helpful"><i class="bi bi-heart"></i> ${formatNumber(helpful)}</div>
    </div>
  </div>`;
}

function getDiscussionStatus(d) {
  if (d.is_closed) return { icon: '🔴', label: 'Closed', class: 'closed' };
  if (d.is_solved) return { icon: '🔵', label: 'Solved', class: 'solved' };
  if (d.best_answer_id || d.is_answered) return { icon: 'bi-check-circle-fill', label: 'Answered', class: 'answered' };
  return { icon: 'bi-circle', label: 'Open', class: 'open' };
}

function getRepLevel(points) {
  if (points >= 5000) return { icon: 'bi-trophy', label: 'Community Leader' };
  if (points >= 1500) return { icon: 'bi-flower2', label: 'Mentor' };
  if (points >= 500) return { icon: 'bi-flower1', label: 'Expert' };
  if (points >= 100) return { icon: 'bi-tree', label: 'Contributor' };
  return { icon: 'bi-seedling', label: 'New Member' };
}

// ─── Start Discussion Inline Card ─────────────────────────────

function renderStartDiscussionCard() {
  return `<div class="start-disc-card">
    <div class="start-disc-top">
      <div class="create-post-avatar" id="discUserAvatar">${getUserInitial()}</div>
      <div class="start-disc-input" onclick="openStartDiscussion()">
        <i class="bi bi-question-circle" style="color:var(--text-muted);"></i> What's your question today?
      </div>
    </div>
    <div class="start-disc-actions">
      <button class="start-disc-action" onclick="openStartDiscussion('question')"><i class="bi bi-chat-dots"></i> Ask Question</button>
      <button class="start-disc-action" onclick="openStartDiscussion('share')"><i class="bi bi-share"></i> Share Experience</button>
      <button class="start-disc-action" onclick="openStartDiscussion('tip')"><i class="bi bi-lightbulb"></i> Share Tip</button>
    </div>
  </div>`;
}

function getUserInitial() {
  try {
    const p = JSON.parse(atob((localStorage.getItem('flower-user') || '').split('.')[1]));
    const name = p.name || p.email || '?';
    const avatar = p.avatar || p.profile_image;
    if (avatar) return `<img src="${escapeHtml(avatar)}" style="width:100%;height:100%;object-fit:cover;border-radius:50%;">`;
    return name.charAt(0).toUpperCase();
  } catch { return '?'; }
}

function openStartDiscussion(mode) {
  if (!userLoggedIn()) { openAuthModal('login'); return; }
  window.location.href = 'create-discussion.html' + (mode ? '?mode=' + mode : '');
}

function userLoggedIn() {
  try { return typeof window.isLoggedIn === 'function' ? window.isLoggedIn() : !!localStorage.getItem('flower-user'); } catch { return false; }
}
