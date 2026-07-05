// components/story-card.js — Card renderer, featured banner, categories, timeline

const STORY_CATEGORIES = [
  { slug: 'floral-design', name: 'Floral Design', icon: 'bi-flower1' },
  { slug: 'gardening', name: 'Gardening', icon: 'bi-seedling' },
  { slug: 'business', name: 'Business Growth', icon: 'bi-shop' },
  { slug: 'learning', name: 'Learning Journey', icon: 'bi-mortarboard' },
  { slug: 'competition', name: 'Competition Winners', icon: 'bi-trophy' },
  { slug: 'wedding', name: 'Wedding Florists', icon: 'bi-flower2' },
  { slug: 'community', name: 'Community Impact', icon: 'bi-globe' },
  { slug: 'career', name: 'Career Growth', icon: 'bi-graph-up' }
];

function getAvatarHtml(avatar, name) {
  if (!avatar) return (name || '?')[0].toUpperCase();
  if (avatar.startsWith('/') || avatar.startsWith('http')) {
    return `<img src="${escapeHtml(avatar)}" alt="${escapeHtml(name || '')}">`;
  }
  return avatar;
}

function estimateReadingTime(text) {
  if (!text) return 1;
  const words = text.split(/\s+/).length;
  return Math.max(1, Math.ceil(words / 200));
}

function formatReadingTime(minutes) {
  if (minutes <= 1) return '1 min read';
  return `${minutes} min read`;
}

function renderStars(rating) {
  const full = Math.floor(rating || 0);
  const half = (rating || 0) - full >= 0.5 ? 1 : 0;
  const empty = 5 - full - half;
  return '★'.repeat(full) + (half ? '½' : '') + '☆'.repeat(empty);
}

function renderStoryCard(story) {
  const readingTime = story.reading_time_minutes || estimateReadingTime(story.content || story.story || '');
  const date = story.created_at ? formatDate(story.created_at) : '';
  return `
    <div class="story-card" onclick="window.location.href='success-story-detail.html?id=${escapeHtml(String(story.id))}'">
      <div class="story-img">
        <img loading="lazy" src="${escapeHtml(story.cover_image || story.image || story.thumbnail || 'https://images.unsplash.com/photo-1490750967868-88df5691a78b?q=80&w=600&auto=format&fit=crop')}" alt="${escapeHtml(story.title)}">
        ${story.is_featured ? '<span class="story-badge featured">Featured</span>' : ''}
      </div>
      <div class="story-body">
        <div class="story-meta-top">
          ${story.category ? `<span class="story-category">${escapeHtml(story.category)}</span>` : ''}
          <span class="story-reading-time">${formatReadingTime(readingTime)}</span>
        </div>
        <h3>${escapeHtml(story.title)}</h3>
        <div class="story-author">
          <div class="story-avatar">${getAvatarHtml(story.author_avatar, story.author_name)}</div>
          <div class="story-author-info">
            <div class="story-author-name">${escapeHtml(story.author_name || 'Anonymous')}</div>
            <div class="story-author-role">${escapeHtml(story.author_role || 'Community Member')}</div>
          </div>
        </div>
        <div class="story-excerpt">${escapeHtml((story.content || story.story || '').slice(0, 150))}${(story.content || story.story || '').length > 150 ? '...' : ''}</div>
        <div class="story-footer">
          <span>${date}</span>
          <span><i class="bi bi-heart"></i> ${formatNumber(story.like_count || story.likes || 0)}</span>
          <span><i class="bi bi-chat-dots"></i> ${story.comment_count || story.comments || 0}</span>
        </div>
      </div>
    </div>`;
}

function renderFeaturedStory(story) {
  if (!story) return '';
  const rating = story.rating || 5;
  const readingTime = story.reading_time_minutes || estimateReadingTime(story.content || story.story || '');
  return `
    <div class="featured-story">
      <div class="featured-story-img">
        <img src="${escapeHtml(story.cover_image || story.image || 'https://images.unsplash.com/photo-1490750967868-88df5691a78b?q=80&w=1200&auto=format&fit=crop')}" alt="${escapeHtml(story.title)}">
      </div>
      <div class="featured-story-content">
        <div class="featured-story-badge"><i class="bi bi-star-fill"></i> Featured Story</div>
        <h2>${escapeHtml(story.title)}</h2>
        <div class="featured-story-author">
          <div class="featured-story-avatar">${getAvatarHtml(story.author_avatar, story.author_name)}</div>
          <div>
            <div class="featured-story-name">${escapeHtml(story.author_name || 'Anonymous')}</div>
            <div class="featured-story-role">${escapeHtml(story.author_role || 'Community Member')}</div>
          </div>
        </div>
        <div class="featured-story-rating">${renderStars(rating)}</div>
        <p>${escapeHtml((story.content || story.story || '').slice(0, 300))}...</p>
        <div class="featured-story-meta">
          <span><i class="bi bi-book"></i> ${formatReadingTime(readingTime)}</span>
          <span><i class="bi bi-heart"></i> ${formatNumber(story.like_count || story.likes || 0)}</span>
          <span><i class="bi bi-chat-dots"></i> ${story.comment_count || story.comments || 0}</span>
        </div>
        <a href="success-story-detail.html?id=${escapeHtml(String(story.id))}" class="btn btn-primary" style="margin-top:1rem;">
          Read Full Story <i class="bi bi-arrow-right"></i>
        </a>
      </div>
    </div>`;
}

function renderCategoryTabs(categories, activeSlug) {
  return categories.map(c => `
    <button class="category-tab${activeSlug === c.slug ? ' active' : ''}" data-category="${c.slug}">
      <i class="bi ${c.icon}"></i> ${c.name}
    </button>
  `).join('');
}

function renderTimeline(events) {
  if (!events || !events.length) return '';
  return `
    <div class="story-timeline">
      ${events.map((ev, i) => `
        <div class="timeline-item${i === events.length - 1 ? ' last' : ''}">
          <div class="timeline-dot"></div>
          <div class="timeline-content">
            ${ev.year ? `<div class="timeline-year">${escapeHtml(String(ev.year))}</div>` : ''}
            <div class="timeline-desc">${escapeHtml(ev.description || ev.event || '')}</div>
          </div>
        </div>
      `).join('')}
    </div>`;
}

function renderStoryGallery(images) {
  if (!images || !images.length) return '';
  return `
    <div class="story-gallery">
      ${images.map(img => `
        <div class="gallery-item" onclick="window.open('${escapeHtml(img.image_url)}', '_blank')">
          <img src="${escapeHtml(img.image_url)}" alt="${escapeHtml(img.caption || '')}" loading="lazy">
          ${img.caption ? `<div class="gallery-caption">${escapeHtml(img.caption)}</div>` : ''}
        </div>
      `).join('')}
    </div>`;
}

function renderEmptyState(isLoggedIn) {
  return `
    <div class="empty-state">
      <i class="bi bi-heart"></i>
      <h3>No stories yet</h3>
      <p>Be the first to inspire the community with your success story.</p>
      ${isLoggedIn ? `<a href="create-story.html" class="btn btn-primary" style="margin-top:1rem;"><i class="bi bi-plus-lg"></i> Share Your Story</a>` : ''}
    </div>`;
}
