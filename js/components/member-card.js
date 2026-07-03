// js/components/member-card.js — Member card components

const ROLE_STYLES = {
  CUSTOMER: 'background:#e2e8f0;color:#475569;',
  SELLER: 'background:#ede9fe;color:#7c3aed;',
  FLORIST: 'background:#fce7f3;color:#be185d;',
  GROWER: 'background:#d1fae5;color:#059669;',
  ADMIN: 'background:#fee2e2;color:#dc2626;',
  SUPERADMIN: 'background:#fee2e2;color:#dc2626;',
  MODERATOR: 'background:#fef3c7;color:#d97706;',
  INSTRUCTOR: 'background:#dbeafe;color:#2563eb;'
};
const ROLE_LABELS = {
  CUSTOMER: 'Customer', SELLER: 'Seller', FLORIST: 'Florist',
  GROWER: 'Grower', ADMIN: 'Admin', SUPERADMIN: 'Super Admin',
  MODERATOR: 'Moderator', INSTRUCTOR: 'Instructor'
};

function memberInitial(name) {
  return (name || '?')[0].toUpperCase();
}

function renderMemberCard(m, opts = {}) {
  const name = [m.first_name, m.last_name].filter(Boolean).join(' ') || 'Member';
  const roleStyle = ROLE_STYLES[m.role] || ROLE_STYLES.CUSTOMER;
  const roleLabel = ROLE_LABELS[m.role] || m.role || 'Member';
  const location = m.country || m.location || '';
  const followerCount = m.followers || 0;
  const score = m.score || m.points || 0;
  const showFollow = opts.showFollow !== false;

  return `
    <div class="mb-card">
      <div class="mb-card-avatar" onclick="window.location.href='profile.html?id=${m.id}'">
        ${m.profile_image ? `<img src="${escapeHtml(m.profile_image)}" alt="">` : `<span class="mb-card-initial">${memberInitial(name)}</span>`}
        ${m.role === 'FLORIST' || m.role === 'INSTRUCTOR' || m.role === 'ADMIN' || m.role === 'SUPERADMIN' ? '<span class="mb-card-verified"><i class="bi bi-patch-check-fill"></i></span>' : ''}
      </div>
      <div class="mb-card-name" onclick="window.location.href='profile.html?id=${m.id}'">${escapeHtml(name)}</div>
      <span class="mb-card-role" style="${roleStyle}">${escapeHtml(roleLabel)}</span>
      ${location ? `<div class="mb-card-location"><i class="bi bi-geo-alt"></i> ${escapeHtml(location)}</div>` : ''}
      <div class="mb-card-stats">
        ${followerCount ? `<span><i class="bi bi-people"></i> ${formatNumber(followerCount)}</span>` : ''}
        ${score ? `<span><i class="bi bi-trophy"></i> ${formatNumber(score)}</span>` : ''}
      </div>
      ${m.description ? `<div class="mb-card-bio">${escapeHtml(m.description.slice(0, 100))}${m.description.length > 100 ? '...' : ''}</div>` : ''}
      <div class="mb-card-actions">
        <button class="btn btn-primary btn-sm" onclick="event.stopPropagation();window.location.href='profile.html?id=${m.id}'">View Profile</button>
        ${showFollow ? `<button class="btn btn-outline btn-sm mb-follow-btn" data-id="${m.id}" onclick="event.stopPropagation();mbFollow(this)"><i class="bi bi-person-plus"></i></button>` : ''}
      </div>
    </div>
  `;
}

function renderFeaturedMember(m) {
  const name = [m.first_name, m.last_name].filter(Boolean).join(' ') || 'Member';
  const stars = m.points ? Math.min(5, Math.max(1, Math.ceil(m.points / 200))) : 3;
  const roleLabel = ROLE_LABELS[m.role] || m.role || 'Member';
  return `
    <div class="mb-featured-card">
      <div class="mb-featured-bg"></div>
      <div class="mb-featured-body">
        <div class="mb-featured-avatar" onclick="window.location.href='profile.html?id=${m.id}'">
          ${m.profile_image ? `<img src="${escapeHtml(m.profile_image)}" alt="">` : `<span class="mb-card-initial">${memberInitial(name)}</span>`}
          <span class="mb-card-verified"><i class="bi bi-patch-check-fill"></i></span>
        </div>
        <h3>${escapeHtml(name)}</h3>
        <span class="mb-card-role" style="${ROLE_STYLES[m.role] || ''}">${escapeHtml(roleLabel)}</span>
        <div class="mb-featured-stars">${'★'.repeat(stars)}${'☆'.repeat(5 - stars)}</div>
        <div class="mb-featured-meta">
          <span><i class="bi bi-geo-alt"></i> ${m.country || 'Worldwide'}</span>
          <span><i class="bi bi-people"></i> ${formatNumber(m.followers || 0)}</span>
        </div>
        ${m.description ? `<p>${escapeHtml(m.description.slice(0, 120))}</p>` : ''}
        <div class="mb-featured-actions">
          <button class="btn btn-primary btn-sm" onclick="window.location.href='profile.html?id=${m.id}'">View Profile</button>
          <button class="btn btn-outline btn-sm mb-follow-btn" data-id="${m.id}" onclick="event.stopPropagation();mbFollow(this)">Follow</button>
        </div>
      </div>
    </div>
  `;
}

function renderTopContributor(m, rank) {
  const name = [m.first_name, m.last_name].filter(Boolean).join(' ') || 'Member';
  const medals = ['gold', 'silver', 'bronze'];
  return `
    <div class="mb-top-item" onclick="window.location.href='profile.html?id=${m.id}'">
      <span class="mb-top-rank ${medals[rank] || ''}">${rank + 1}</span>
      <div class="mb-top-avatar">
        ${m.profile_image ? `<img src="${escapeHtml(m.profile_image)}" alt="">` : memberInitial(name)}
      </div>
      <div>
        <div class="mb-top-name">${escapeHtml(name)}</div>
        <div class="mb-top-score">${formatNumber(m.score || 0)} pts</div>
      </div>
    </div>
  `;
}

function renderNewMember(m) {
  const name = [m.first_name, m.last_name].filter(Boolean).join(' ') || 'Member';
  const days = Math.floor((Date.now() - new Date(m.created_at).getTime()) / 86400000);
  return `
    <div class="mb-new-item" onclick="window.location.href='profile.html?id=${m.id}'">
      <div class="mb-new-avatar">
        ${m.profile_image ? `<img src="${escapeHtml(m.profile_image)}" alt="">` : `<span>${memberInitial(name)}</span>`}
      </div>
      <div>
        <div class="mb-new-name">${escapeHtml(name)}</div>
        <div class="mb-new-time">${days === 0 ? 'Today' : days === 1 ? 'Yesterday' : days + ' days ago'}</div>
      </div>
    </div>
  `;
}

function renderSuggestedMember(m) {
  const name = [m.first_name, m.last_name].filter(Boolean).join(' ') || 'Member';
  return `
    <div class="mb-suggested-item">
      <div class="mb-suggested-avatar" onclick="window.location.href='profile.html?id=${m.id}'">
        ${m.profile_image ? `<img src="${escapeHtml(m.profile_image)}" alt="">` : `<span>${memberInitial(name)}</span>`}
      </div>
      <div class="mb-suggested-info" onclick="window.location.href='profile.html?id=${m.id}'">
        <div class="mb-suggested-name">${escapeHtml(name)}</div>
        <div class="mb-suggested-meta"><i class="bi bi-people"></i> ${formatNumber(m.followers || 0)}</div>
      </div>
      <button class="btn btn-outline btn-sm mb-follow-btn" data-id="${m.id}" onclick="event.stopPropagation();mbFollow(this)">+</button>
    </div>
  `;
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
