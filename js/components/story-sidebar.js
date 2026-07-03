// components/story-sidebar.js — Featured creators, impact stats, related stories

async function loadFeaturedCreators(containerId) {
  const container = document.getElementById(containerId);
  if (!container) return;
  try {
    const res = await fetch('/api/stories?limit=100&sort=popular');
    const data = await res.json();
    const stories = data.stories || [];
    const creatorMap = {};
    stories.forEach(s => {
      const key = s.author_name || 'Anonymous';
      if (!creatorMap[key]) {
        creatorMap[key] = { name: key, role: s.author_role || 'Community Member', avatar: s.author_avatar, count: 0, stories: [] };
      }
      creatorMap[key].count++;
      creatorMap[key].stories.push(s);
    });
    const creators = Object.values(creatorMap).sort((a, b) => b.count - a.count).slice(0, 6);
    if (!creators.length) {
      container.innerHTML = '<p style="font-size:0.85rem;color:var(--text-muted);text-align:center;">No featured creators yet</p>';
      return;
    }
    container.innerHTML = creators.map(c => `
      <div class="creator-card">
        <div class="creator-avatar">${getAvatarHtml(c.avatar, c.name)}</div>
        <div class="creator-info">
          <div class="creator-name">${escapeHtml(c.name)}</div>
          <div class="creator-role">${escapeHtml(c.role)}</div>
          <div class="creator-count">${c.count} ${c.count === 1 ? 'Story' : 'Stories'}</div>
        </div>
      </div>
    `).join('');
  } catch {
    container.innerHTML = '<p style="font-size:0.85rem;color:var(--text-muted);text-align:center;">Could not load creators</p>';
  }
}

async function loadImpactStats(containerId) {
  const container = document.getElementById(containerId);
  if (!container) return;
  try {
    const res = await fetch('/api/stories?limit=1');
    const data = await res.json();
    const totalStories = data.total || 0;

    const allRes = await fetch('/api/stories?limit=200');
    const allData = await allRes.json();
    const allStories = allData.stories || [];

    const totalLikes = allStories.reduce((sum, s) => sum + (s.like_count || s.likes || 0), 0);
    const totalComments = allStories.reduce((sum, s) => sum + (s.comment_count || s.comments || 0), 0);
    const uniqueAuthors = new Set(allStories.map(s => s.author_name || s.user_id)).size;

    container.innerHTML = `
      <div class="stat-item"><div class="stat-num stat-counter" data-target="${totalStories}">0</div><div class="stat-label">Success Stories</div></div>
      <div class="stat-item"><div class="stat-num stat-counter" data-target="${uniqueAuthors}">0</div><div class="stat-label">Storytellers</div></div>
      <div class="stat-item"><div class="stat-num stat-counter" data-target="${totalLikes}">0</div><div class="stat-label">Total Likes</div></div>
      <div class="stat-item"><div class="stat-num stat-counter" data-target="${totalComments}">0</div><div class="stat-label">Comments</div></div>
    `;
    setTimeout(animateCounters, 300);
  } catch {
    container.innerHTML = `
      <div class="stat-item"><div class="stat-num">-</div><div class="stat-label">Success Stories</div></div>
      <div class="stat-item"><div class="stat-num">-</div><div class="stat-label">Storytellers</div></div>
      <div class="stat-item"><div class="stat-num">-</div><div class="stat-label">Total Likes</div></div>
      <div class="stat-item"><div class="stat-num">-</div><div class="stat-label">Comments</div></div>
    `;
  }
}

async function loadRelatedStories(containerId, currentId, category) {
  const container = document.getElementById(containerId);
  if (!container) return;
  try {
    const params = new URLSearchParams({ sort: 'popular', limit: 4 });
    if (category) params.set('category', category);
    const res = await fetch(`/api/stories?${params}`);
    const data = await res.json();
    const stories = (data.stories || []).filter(s => String(s.id) !== String(currentId)).slice(0, 3);
    if (!stories.length) {
      container.parentElement.style.display = 'none';
      return;
    }
    container.innerHTML = stories.map(s => `
      <li><a href="success-story-detail.html?id=${escapeHtml(String(s.id))}">
        ${escapeHtml(s.title)}
        <span style="font-size:0.78rem;color:var(--text-muted);display:block;">${escapeHtml(s.author_name || 'Anonymous')} · ${formatNumber(s.like_count || s.likes || 0)} likes</span>
      </a></li>
    `).join('');
  } catch {
    container.parentElement.style.display = 'none';
  }
}

async function loadAuthorStories(containerId, authorName, currentId) {
  const container = document.getElementById(containerId);
  if (!container) return;
  try {
    const res = await fetch('/api/stories?limit=10&sort=newest');
    const data = await res.json();
    const stories = (data.stories || []).filter(s =>
      String(s.id) !== String(currentId) &&
      (s.author_name || '').toLowerCase() === (authorName || '').toLowerCase()
    ).slice(0, 3);
    if (!stories.length) {
      container.parentElement.style.display = 'none';
      return;
    }
    container.innerHTML = stories.map(s => `
      <li><a href="success-story-detail.html?id=${escapeHtml(String(s.id))}">${escapeHtml(s.title)}</a></li>
    `).join('');
  } catch {
    container.parentElement.style.display = 'none';
  }
}

function animateCounters() {
  document.querySelectorAll('.stat-counter').forEach(el => {
    const target = parseInt(el.dataset.target, 10);
    if (isNaN(target) || target <= 0) { el.textContent = '0'; return; }
    const duration = 1500;
    const start = performance.now();
    function update(now) {
      const elapsed = now - start;
      const progress = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      el.textContent = Math.round(eased * target);
      if (progress < 1) requestAnimationFrame(update);
      else el.textContent = formatNumber(target);
    }
    requestAnimationFrame(update);
  });
}
