// js/components/club-card.js — Club card components

function renderClubCard(club) {
  const memberCount = club.member_count || 0;
  return `
    <div class="club-card" onclick="window.location.href='clubs.html?id=${club.id}'">
      <div class="club-card-header">
        <span class="club-card-icon">${club.icon || '🌿'}</span>
        ${club.category ? `<span class="club-card-cat">${escapeHtml(club.category)}</span>` : ''}
      </div>
      <h4 class="club-card-name">${escapeHtml(club.name)}</h4>
      ${club.description ? `<p class="club-card-desc">${escapeHtml(club.description.slice(0, 120))}${club.description.length > 120 ? '...' : ''}</p>` : ''}
      <div class="club-card-footer">
        <span class="club-card-members"><i class="bi bi-people"></i> ${formatNumber(memberCount)} member${memberCount !== 1 ? 's' : ''}</span>
        ${club.creator_name ? `<span class="club-card-creator">by ${escapeHtml(club.creator_name)}</span>` : ''}
      </div>
    </div>
  `;
}

function renderClubSkeleton() {
  return Array(6).fill(0).map(() => `
    <div class="club-card skeleton">
      <div class="club-card-header">
        <span class="skeleton-box" style="width:40px;height:40px;border-radius:50%;display:inline-block;"></span>
      </div>
      <div class="skeleton-text" style="height:1.1rem;width:70%;margin-bottom:0.5rem;"></div>
      <div class="skeleton-text" style="height:0.85rem;width:100%;margin-bottom:0.25rem;"></div>
      <div class="skeleton-text" style="height:0.85rem;width:60%;"></div>
    </div>
  `).join('');
}
