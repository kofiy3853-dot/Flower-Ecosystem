// components/reactions.js — Like, Comment, Share, Save, View

const REACTION_EMOJIS = {
  love: '❤️', beautiful: '🌸', 'great-work': '👏',
  helpful: '💡', congrats: '🎉'
};

const REACTION_TYPES = ['love', 'beautiful', 'great-work', 'helpful', 'congrats'];

function reactionEmoji(type) { return REACTION_EMOJIS[type] || '❤️'; }

function capitalizeFirst(s) { return s ? s.charAt(0).toUpperCase() + s.slice(1) : ''; }

function formatNumber(n) {
  if (n >= 1000000) return (n / 1000000).toFixed(1) + 'M';
  if (n >= 1000) return (n / 1000).toFixed(1) + 'K';
  return n || 0;
}

function renderStatsBar(likes, comments, shares, saves, views, postId) {
  return `<div class="feed-card-stats">
    <div class="feed-reactions-summary" onclick="toggleComments('${postId}')">
      <span>${formatNumber(likes)} reaction${likes !== 1 ? 's' : ''}</span>
    </div>
    <div style="display:flex;gap:0.6rem;">
      <span style="cursor:pointer;" onclick="toggleComments('${postId}')">${formatNumber(comments)} comment${comments !== 1 ? 's' : ''}</span>
      <span>${formatNumber(saves)} save${saves !== 1 ? 's' : ''}</span>
      <span>${formatNumber(views)} view${views !== 1 ? 's' : ''}</span>
    </div>
  </div>`;
}

function renderActionBar(postId, userReaction) {
  return `<div class="feed-card-actions">
    <button class="feed-action-btn${userReaction ? ' liked' : ''}" onclick="toggleReaction('${postId}', this)">
      <div class="reaction-picker">
        ${REACTION_TYPES.map(r => `<button class="reaction-pick" onclick="event.stopPropagation();reactToPost('${postId}','${r}',this.closest('.feed-action-btn'))" title="${capitalizeFirst(r)}">${REACTION_EMOJIS[r]}</button>`).join('')}
      </div>
      <i class="bi bi-heart${userReaction ? '-fill' : ''}"></i>
      <span>${userReaction ? capitalizeFirst(userReaction) : 'Like'}</span>
    </button>
    <button class="feed-action-btn" onclick="toggleComments('${postId}')"><i class="bi bi-chat"></i> Comment</button>
    <button class="feed-action-btn" onclick="sharePost('${postId}')"><i class="bi bi-share"></i> Share</button>
    <button class="feed-action-btn" onclick="savePost('${postId}', this)"><i class="bi bi-bookmark"></i> Save</button>
  </div>`;
}

async function reactToPost(postId, reactionType, btn) {
  if (!getCurrentUserId()) { openAuthModal('login'); return; }
  try {
    await fetch(`/api/feed/${postId}/react`, {
      method: 'POST', headers: authHeaders(), body: JSON.stringify({ reaction: reactionType })
    });
    btn.classList.add('liked');
    btn.querySelector('i').className = 'bi bi-heart-fill';
    btn.querySelector('span').textContent = capitalizeFirst(reactionType);
  } catch {}
}

function toggleReaction(postId, btn) {
  if (!getCurrentUserId()) { openAuthModal('login'); return; }
  if (btn.classList.contains('liked')) {
    btn.classList.remove('liked');
    btn.querySelector('i').className = 'bi bi-heart';
    btn.querySelector('span').textContent = 'Like';
    fetchWithAuth(`/api/feed/${postId}/react`, { method: 'DELETE', headers: authHeaders() }).catch(() => {});
  } else {
    reactToPost(postId, 'love', btn);
  }
}

function sharePost(postId) {
  const url = `${window.location.origin}/feed.html#post-${postId}`;
  if (navigator.share) { navigator.share({ title: 'Flower Ecosystem Post', url }).catch(() => {}); }
  else {
    navigator.clipboard.writeText(url).then(() => {
      showToast('Link copied!');
      fetchWithAuth(`/api/feed/${postId}/share`, { method: 'POST', headers: authHeaders() }).catch(() => {});
    });
  }
}

function savePost(postId, btn) {
  if (!getCurrentUserId()) { openAuthModal('login'); return; }
  btn.classList.toggle('liked');
  btn.querySelector('i').className = btn.classList.contains('liked') ? 'bi bi-bookmark-fill' : 'bi bi-bookmark';
  fetchWithAuth(`/api/feed/${postId}/save`, { method: 'POST', headers: authHeaders() }).catch(() => {});
}

function renderStars(rating) {
  const r = Math.round(rating || 0);
  return '★'.repeat(r) + '☆'.repeat(5 - r);
}
