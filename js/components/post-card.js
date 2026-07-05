// components/post-card.js — All post type renderers

function renderFeedCard(post) {
  const type = post.post_type || post.type || 'standard';
  switch (type) {
    case 'marketplace': return renderMarketplaceCard(post);
    case 'learning':
    case 'achievement': return renderLearningCard(post);
    case 'event': return renderEventCard(post);
    case 'workshop': return renderWorkshopCard(post);
    case 'question': return renderQuestionCard(post);
    case 'poll': return renderPollCard(post);
    default: return renderStandardCard(post);
  }
}

function renderCardHeader(post) {
  const author = post.author_name || 'Anonymous';
  const initial = author.charAt(0).toUpperCase();
  const avatar = post.author_avatar || post.profile_image;
  const isExpert = ['FLORIST', 'INSTRUCTOR', 'ADMIN', 'SUPERADMIN'].includes((post.author_role || '').toUpperCase());
  return `<div class="feed-card-header">
    <div class="feed-avatar">${avatar ? `<img src="${escapeHtml(avatar)}" alt="">` : initial}</div>
    <div class="feed-user-info">
      <div class="feed-user-name">
        ${escapeHtml(author)}
        ${isExpert ? '<i class="bi bi-patch-check-fill verified"></i>' : ''}
        ${isExpert ? '<span class="expert-badge">Expert</span>' : ''}
      </div>
      <div class="feed-user-meta">
        <span>${timeAgo(post.created_at)}</span>
        ${post.category ? ` <span>· ${escapeHtml(post.category)}</span>` : ''}
      </div>
    </div>
    <button class="feed-card-menu" title="More"><i class="bi bi-three-dots"></i></button>
  </div>`;
}

function renderImageGrid(images) {
  if (!images || !images.length) return '';
  const count = Math.min(images.length, 4);
  const cls = ['single', 'double', 'triple', 'quad'][count - 1] || 'single';
  return `<div class="feed-card-images ${cls}">${images.slice(0, 4).map(u => `<img class="feed-img" src="${escapeHtml(u)}" alt="" loading="lazy" onclick="openLightbox('${escapeHtml(u)}')">`).join('')}</div>`;
}

function renderVideoThumbnail(url) {
  if (!url) return '';
  return `<div class="feed-video-wrap" onclick="openLightbox('${escapeHtml(url)}')">
    <img src="${escapeHtml(url)}" alt="Video" class="feed-img" loading="lazy">
    <div class="feed-video-play"><i class="bi bi-play-circle-fill"></i></div>
  </div>`;
}

// ─── Standard Card ─────────────────────────────────────────────

function renderStandardCard(post) {
  const text = post.content || post.text || '';
  const images = post.images || post.media_urls || [];
  const tags = post.tags || [];
  const videoUrl = post.video_url || (post.media_urls && post.media_type && post.media_type.includes('video') ? post.media_urls[0] : null);
  const likeCount = post.like_count || 0;
  const commentCount = post.comment_count || 0;
  const shareCount = post.share_count || 0;
  const saveCount = post.save_count || 0;
  const viewCount = post.view_count || 0;
  const userReaction = post.user_reaction || null;

  return `<article class="feed-card" data-id="${post.id}">
    ${renderCardHeader(post)}
    <div class="feed-card-body">
      ${text ? `<div class="feed-card-text">${escapeHtml(text)}</div>` : ''}
      ${tags.length ? `<div class="feed-card-tags">${tags.map(t => `<span class="feed-tag">#${escapeHtml(t)}</span>`).join(' ')}</div>` : ''}
      ${videoUrl ? renderVideoThumbnail(videoUrl) : ''}
      ${renderImageGrid(images)}
    </div>
    ${renderStatsBar(likeCount, commentCount, shareCount, saveCount, viewCount, post.id)}
    ${renderActionBar(post.id, userReaction)}
    ${renderCommentsSection(post.id, post.recent_comments)}
  </article>`;
}

// ─── Marketplace Card ──────────────────────────────────────────

function renderMarketplaceCard(post) {
  const author = post.author_name || 'Seller';
  const avatar = post.author_avatar;
  const product = post.product || {};
  const images = post.images || post.media_urls || [];
  const productImg = product.image_url || (images.length ? images[0] : '');

  return `<article class="feed-card marketplace-card" data-id="${post.id}">
    ${renderCardHeader(post)}
    <div class="feed-card-body">
      <span class="marketplace-badge"><i class="bi bi-bag"></i> New Product</span>
      <div class="marketplace-product">
        ${productImg ? `<img class="marketplace-product-img" src="${escapeHtml(productImg)}" alt="" loading="lazy">` : ''}
        <div class="marketplace-product-info">
          <div class="marketplace-product-name">${escapeHtml(product.name || post.title || '')}</div>
          <div class="marketplace-product-price">GHS ${parseFloat(product.price || 0).toFixed(2)}</div>
          ${product.rating ? `<div class="marketplace-product-rating">${renderStars(product.rating)}</div>` : ''}
          <div style="font-size:0.78rem;color:var(--text-muted);margin-top:0.2rem;">${escapeHtml(post.content || '')}</div>
        </div>
      </div>
      <div class="marketplace-cta">
        <a href="product-detail.html?id=${product.id || post.product_id}" class="btn btn-primary btn-sm">View Product <i class="bi bi-arrow-right"></i></a>
      </div>
    </div>
    ${renderStatsBar(post.like_count || 0, post.comment_count || 0, post.share_count || 0, post.save_count || 0, post.view_count || 0, post.id)}
    ${renderActionBar(post.id, post.user_reaction)}
    ${renderCommentsSection(post.id, post.recent_comments)}
  </article>`;
}

// ─── Learning / Achievement Card ───────────────────────────────

function renderLearningCard(post) {
  const author = post.author_name || 'Member';
  const course = post.course || {};
  const courseName = course.title || post.title || post.course_name || '';
  const courseId = course.id || post.course_id;

  return `<article class="feed-card learning-card" data-id="${post.id}">
    ${renderCardHeader(post)}
    <div class="feed-card-body">
      <span class="learning-badge"><i class="bi bi-mortarboard"></i> Achievement</span>
      <div class="learning-achievement">
        <div class="learning-achievement-icon">🎓</div>
        <div class="learning-achievement-info">
          <h4>${escapeHtml(author)} completed</h4>
          <p>${escapeHtml(courseName)}</p>
        </div>
      </div>
      ${post.content ? `<div style="font-size:0.85rem;color:var(--text-light);margin-top:0.5rem;">${escapeHtml(post.content)}</div>` : ''}
      ${courseId ? `<div style="margin-top:0.75rem;"><a href="course-detail.html?id=${courseId}" class="btn btn-outline btn-sm">View Course <i class="bi bi-arrow-right"></i></a></div>` : ''}
    </div>
    ${renderStatsBar(post.like_count || 0, post.comment_count || 0, post.share_count || 0, post.save_count || 0, post.view_count || 0, post.id)}
    ${renderActionBar(post.id, post.user_reaction)}
    ${renderCommentsSection(post.id, post.recent_comments)}
  </article>`;
}

// ─── Event Card ────────────────────────────────────────────────

function renderEventCard(post) {
  const author = post.author_name || 'Organizer';
  const title = post.event_title || post.title || '';
  const date = post.event_date || '';
  const location = post.event_location || post.location || '';
  const time = post.event_time || '';
  const eventId = post.event_id || post.id;

  return `<article class="feed-card event-card-feed" data-id="${post.id}">
    ${renderCardHeader(post)}
    <div class="feed-card-body">
      <span class="event-badge"><i class="bi bi-calendar-event"></i> Event</span>
      <div style="font-weight:600;font-size:1rem;margin:0.5rem 0;">${escapeHtml(title)}</div>
      ${post.content ? `<div style="font-size:0.85rem;color:var(--text-light);margin-bottom:0.5rem;">${escapeHtml(post.content)}</div>` : ''}
      <div class="event-details">
        ${date ? `<div class="event-detail-item"><i class="bi bi-calendar"></i> ${formatDate(date)}</div>` : ''}
        ${time ? `<div class="event-detail-item"><i class="bi bi-clock"></i> ${escapeHtml(time)}</div>` : ''}
        ${location ? `<div class="event-detail-item"><i class="bi bi-geo-alt"></i> ${escapeHtml(location)}</div>` : ''}
      </div>
      <div class="event-rsvp"><a href="event-detail.html?id=${eventId}" class="btn btn-primary btn-sm">View Event</a></div>
    </div>
    ${renderStatsBar(post.like_count || 0, post.comment_count || 0, post.share_count || 0, post.save_count || 0, post.view_count || 0, post.id)}
    ${renderActionBar(post.id, post.user_reaction)}
    ${renderCommentsSection(post.id, post.recent_comments)}
  </article>`;
}

// ─── Workshop Card ─────────────────────────────────────────────

function renderWorkshopCard(post) {
  const author = post.author_name || 'Instructor';
  const ws = post.workshop || {};
  const title = ws.title || post.event_title || post.title || '';
  const date = ws.event_date || post.event_date || '';
  const time = ws.event_time || post.event_time || '';
  const location = ws.location || post.event_location || '';
  const eventId = ws.id || post.event_id || post.id;

  return `<article class="feed-card event-card-feed" style="border-left-color:var(--accent-blue);" data-id="${post.id}">
    ${renderCardHeader(post)}
    <div class="feed-card-body">
      <span class="learning-badge" style="background:rgba(14,165,233,0.1);color:var(--accent-blue);"><i class="bi bi-tools"></i> Workshop</span>
      <div style="font-weight:600;font-size:1rem;margin:0.5rem 0;">${escapeHtml(title)}</div>
      <div class="event-details">
        ${date ? `<div class="event-detail-item"><i class="bi bi-calendar"></i> ${formatDate(date)}</div>` : ''}
        ${time ? `<div class="event-detail-item"><i class="bi bi-clock"></i> ${escapeHtml(time)}</div>` : ''}
        ${location ? `<div class="event-detail-item"><i class="bi bi-geo-alt"></i> ${escapeHtml(location)}</div>` : ''}
      </div>
      <div class="event-rsvp"><a href="event-detail.html?id=${eventId}" class="btn btn-primary btn-sm">Register <i class="bi bi-arrow-right"></i></a></div>
    </div>
    ${renderStatsBar(post.like_count || 0, post.comment_count || 0, post.share_count || 0, post.save_count || 0, post.view_count || 0, post.id)}
    ${renderActionBar(post.id, post.user_reaction)}
    ${renderCommentsSection(post.id, post.recent_comments)}
  </article>`;
}

// ─── Question Card ─────────────────────────────────────────────

function renderQuestionCard(post) {
  const author = post.author_name || 'Member';
  const question = post.question || post.title || post.content || '';
  const answerCount = post.answer_count || 0;
  const isSolved = post.is_solved;
  const qId = post.question_id || post.id;

  return `<article class="feed-card question-card-feed" data-id="${post.id}">
    ${renderCardHeader(post)}
    <div class="feed-card-body">
      <span class="question-badge"><i class="bi bi-question-circle"></i> Question</span>
      <div style="font-weight:500;font-size:0.95rem;margin-top:0.5rem;margin-bottom:0.25rem;">${escapeHtml(question)}</div>
      <div style="display:flex;gap:1rem;font-size:0.82rem;color:var(--text-muted);">
        <span><i class="bi bi-chat-dots"></i> ${answerCount} answer${answerCount !== 1 ? 's' : ''}</span>
        ${isSolved ? '<span style="color:var(--accent-green);"><i class="bi bi-check-circle"></i> Solved</span>' : ''}
      </div>
      <div style="margin-top:0.75rem;"><a href="question-detail.html?id=${qId}" class="btn btn-outline btn-sm">View Discussion</a></div>
    </div>
    ${renderStatsBar(post.like_count || 0, post.comment_count || 0, post.share_count || 0, post.save_count || 0, post.view_count || 0, post.id)}
    ${renderActionBar(post.id, post.user_reaction)}
    ${renderCommentsSection(post.id, post.recent_comments)}
  </article>`;
}

// ─── Poll Card ─────────────────────────────────────────────────

function renderPollCard(post) {
  const author = post.author_name || 'Member';
  const question = post.poll_question || post.question || post.title || '';
  const options = post.poll_options || post.options || [];
  const totalVotes = post.total_votes || options.reduce((s, o) => s + (o.votes || o.vote_count || 0), 0);
  const userVote = post.user_vote;
  const pollId = post.id;

  const optsHtml = options.map((opt, i) => {
    const pct = totalVotes > 0 ? Math.round(((opt.votes || opt.vote_count || 0) / totalVotes) * 100) : 0;
    return `<div class="poll-option${userVote === i ? ' voted' : ''}" onclick="votePoll('${pollId}', ${i})">
      <div class="poll-option-fill" style="width:${userVote != null ? pct : 0}%"></div>
      <div class="poll-option-content">
        <span class="poll-option-label">${escapeHtml(opt.text || opt.label || opt)}</span>
        ${userVote != null ? `<span class="poll-option-pct">${pct}%</span>` : ''}
      </div>
    </div>`;
  }).join('');

  return `<article class="feed-card poll-card" data-id="${post.id}">
    ${renderCardHeader(post)}
    <div class="feed-card-body">
      <span class="poll-badge"><i class="bi bi-bar-chart"></i> Poll</span>
      <div class="poll-question">${escapeHtml(question)}</div>
      <div class="poll-options">${optsHtml}</div>
      <div class="poll-meta">${totalVotes} vote${totalVotes !== 1 ? 's' : ''}</div>
    </div>
    ${renderStatsBar(post.like_count || 0, post.comment_count || 0, post.share_count || 0, post.save_count || 0, post.view_count || 0, post.id)}
    ${renderActionBar(post.id, post.user_reaction)}
    ${renderCommentsSection(post.id, post.recent_comments)}
  </article>`;
}

// ─── Helpers ───────────────────────────────────────────────────

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
  const hr = Math.floor(min / 60);
  if (hr < 24) return hr + 'h ago';
  const day = Math.floor(hr / 24);
  if (day < 7) return day + 'd ago';
  return new Date(dateStr).toLocaleDateString();
}

function formatDate(dateStr) {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

function openLightbox(url) {
  const o = document.createElement('div');
  o.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,0.9);z-index:2000;display:flex;align-items:center;justify-content:center;cursor:pointer;';
  o.innerHTML = `<img src="${url}" style="max-width:90vw;max-height:90vh;object-fit:contain;border-radius:8px;">`;
  o.addEventListener('click', () => o.remove());
  document.body.appendChild(o);
}
