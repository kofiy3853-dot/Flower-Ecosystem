// components/showcase-card.js — Showcase project card with hover overlays

function renderShowcaseCard(project, opts = {}) {
  const isSaved = opts.saved || false;
  const isLiked = opts.liked || false;
  const mediaUrl = project.media_urls && project.media_urls.length
    ? project.media_urls[0] : project.image_url || 'https://images.unsplash.com/photo-1490750967868-88df5691a78b?q=80&w=600&auto=format&fit=crop';
  const userName = [project.first_name, project.last_name].filter(Boolean).join(' ') || 'Anonymous';
  const userInitial = (userName)[0]?.toUpperCase() || '?';
  const avatarHtml = project.profile_image
    ? `<img src="${escapeHtml(project.profile_image)}" alt="${escapeHtml(userName)}">` : userInitial;
  const imagesCount = project.media_urls ? project.media_urls.length : 1;
  const likes = project.like_count || 0;
  const views = project.view_count || 0;
  const comments = project.comment_count || 0;
  const title = project.title || 'Untitled';
  const cat = project.category || '';
  const meta = project.showcase_meta || {};

  return `
    <div class="showcase-item" data-id="${escapeHtml(String(project.id))}">
      <div class="showcase-img">
        <img loading="lazy" src="${escapeHtml(mediaUrl)}" alt="${escapeHtml(title)}" style="${project.media_urls && project.media_urls.length > 1 ? '' : ''}">
        ${imagesCount > 1 ? `<span class="showcase-multi"><i class="bi bi-images"></i> ${imagesCount}</span>` : ''}
        ${project.is_featured ? '<span class="showcase-featured-badge">Featured</span>' : ''}
        <div class="showcase-hover">
          <button class="sh-btn sh-like${isLiked ? ' liked' : ''}" onclick="event.stopPropagation();toggleShowcaseLike('${project.id}',this)" title="Like">
            <i class="bi ${isLiked ? 'bi-heart-fill' : 'bi-heart'}"></i>
          </button>
          <button class="sh-btn sh-save${isSaved ? ' saved' : ''}" onclick="event.stopPropagation();toggleShowcaseSave('${project.id}',this)" title="Save">
            <i class="bi ${isSaved ? 'bi-bookmark-fill' : 'bi-bookmark'}"></i>
          </button>
          <button class="sh-btn sh-share" onclick="event.stopPropagation();showcaseShare('${project.id}')" title="Share">
            <i class="bi bi-share"></i>
          </button>
          <a href="showcase-detail.html?id=${escapeHtml(String(project.id))}" class="sh-btn sh-view" title="View Project">
            <i class="bi bi-arrow-up-right"></i>
          </a>
        </div>
      </div>
      <div class="showcase-body">
        <div class="showcase-author">
          <div class="showcase-avatar">${avatarHtml}</div>
          <div class="showcase-author-info">
            <div class="showcase-author-name">${escapeHtml(userName)}</div>
            <div class="showcase-author-role">${escapeHtml(project.user_role || 'Member')}</div>
          </div>
        </div>
        <a href="showcase-detail.html?id=${escapeHtml(String(project.id))}" class="showcase-title">${escapeHtml(title)}</a>
        ${cat ? `<span class="showcase-category">${escapeHtml(cat)}</span>` : ''}
        <div class="showcase-meta">
          <span><i class="bi bi-heart"></i> ${formatNumber(likes)}</span>
          <span><i class="bi bi-eye"></i> ${formatNumber(views)}</span>
          <span><i class="bi bi-chat-dots"></i> ${formatNumber(comments)}</span>
        </div>
      </div>
    </div>`;
}

function renderShowcaseSkeleton() {
  return Array.from({ length: 6 }, () => `
    <div class="showcase-item skeleton">
      <div class="showcase-img" style="height:${200 + Math.floor(Math.random() * 150)}px;background:var(--bg-light);"></div>
      <div class="showcase-body">
        <div style="display:flex;gap:0.5rem;align-items:center;margin-bottom:0.5rem;">
          <div style="width:28px;height:28px;border-radius:50%;background:var(--bg-light);"></div>
          <div style="flex:1;"><div style="height:12px;width:60%;background:var(--bg-light);border-radius:4px;"></div></div>
        </div>
        <div style="height:14px;width:80%;background:var(--bg-light);border-radius:4px;margin-bottom:0.3rem;"></div>
        <div style="height:14px;width:40%;background:var(--bg-light);border-radius:4px;"></div>
      </div>
    </div>`).join('');
}

function renderFeaturedProject(project) {
  if (!project) return '';
  const mediaUrl = project.media_urls && project.media_urls.length
    ? project.media_urls[0] : project.image_url || '';
  const userName = [project.first_name, project.last_name].filter(Boolean).join(' ') || 'Anonymous';
  const likes = project.like_count || 0;
  const views = project.view_count || 0;
  const comments = project.comment_count || 0;

  return `
    <div class="showcase-featured">
      <div class="showcase-featured-img">
        <img src="${escapeHtml(mediaUrl)}" alt="${escapeHtml(project.title || '')}">
        <div class="showcase-featured-badge"><i class="bi bi-star-fill"></i> Editor's Pick</div>
      </div>
      <div class="showcase-featured-body">
        <span class="showcase-featured-category">${escapeHtml(project.category || 'Featured Project')}</span>
        <h2>${escapeHtml(project.title || '')}</h2>
        <div class="showcase-featured-creator">
          <div class="showcase-featured-avatar">
            ${project.profile_image ? `<img src="${escapeHtml(project.profile_image)}" alt="">` : (userName[0]?.toUpperCase() || '?')}
          </div>
          <div>
            <div class="showcase-featured-name">${escapeHtml(userName)}</div>
            <div class="showcase-featured-role">${escapeHtml(project.user_role || 'Florist')}</div>
          </div>
        </div>
        <p>${escapeHtml((project.content || '').slice(0, 200))}${(project.content || '').length > 200 ? '...' : ''}</p>
        <div class="showcase-featured-stats">
          <span><i class="bi bi-heart-fill" style="color:var(--error-color)"></i> ${formatNumber(likes)}</span>
          <span><i class="bi bi-eye"></i> ${formatNumber(views)}</span>
          <span><i class="bi bi-chat-dots"></i> ${formatNumber(comments)}</span>
        </div>
        <a href="showcase-detail.html?id=${escapeHtml(String(project.id))}" class="btn btn-primary" style="margin-top:1rem;">
          View Project <i class="bi bi-arrow-right"></i>
        </a>
      </div>
    </div>`;
}

function renderCreatorCard(creator) {
  const name = [creator.first_name, creator.last_name].filter(Boolean).join(' ') || 'Anonymous';
  const initial = name[0]?.toUpperCase() || '?';
  return `
    <div class="sc-creator-card" onclick="window.location.href='profile.html?id=${creator.id}'">
      <div class="sc-creator-avatar">
        ${creator.profile_image ? `<img src="${escapeHtml(creator.profile_image)}" alt="">` : initial}
      </div>
      <div class="sc-creator-info">
        <div class="sc-creator-name">${escapeHtml(name)}</div>
        <div class="sc-creator-role">${escapeHtml(creator.role || 'Florist')}</div>
        <div class="sc-creator-stats">${creator.project_count} projects · ${formatNumber(creator.total_likes || 0)} likes</div>
      </div>
    </div>`;
}

function renderCollectionCard(col) {
  return `
    <div class="sc-collection-card" onclick="window.location.href='showcase.html?collection=${col.id}'">
      <div class="sc-collection-cover">
        ${col.cover_image ? `<img src="${escapeHtml(col.cover_image)}" alt="">` : '<i class="bi bi-bookmark-heart"></i>'}
      </div>
      <div class="sc-collection-info">
        <div class="sc-collection-title">${escapeHtml(col.title)}</div>
        <div class="sc-collection-count">${col.item_count || 0} projects</div>
      </div>
    </div>`;
}

function renderCompetitionCard(comp) {
  const now = new Date();
  const end = new Date(comp.end_date);
  const daysLeft = Math.max(0, Math.ceil((end - now) / 86400000));
  const status = comp.status;
  const statusLabel = status === 'open' ? 'Open' : status === 'voting' ? 'Voting Now' : status === 'closed' ? 'Closed' : 'Upcoming';
  const statusClass = status === 'open' ? 'open' : status === 'voting' ? 'voting' : '';

  return `
    <div class="sc-competition-card">
      ${comp.cover_image ? `<div class="sc-comp-img"><img src="${escapeHtml(comp.cover_image)}" alt=""></div>` : ''}
      <div class="sc-comp-body">
        <div class="sc-comp-status ${statusClass}">${statusLabel}</div>
        <h3>${escapeHtml(comp.title)}</h3>
        ${status === 'open' ? `<div class="sc-comp-days">${daysLeft} ${daysLeft === 1 ? 'day' : 'days'} left</div>` : ''}
        ${comp.prize ? `<div class="sc-comp-prize"><i class="bi bi-trophy"></i> ${escapeHtml(comp.prize)}</div>` : ''}
        <div class="sc-comp-entries">${comp.entry_count || 0} entries</div>
        ${status === 'open' ? `<a href="showcase-upload.html?competition=${comp.id}" class="btn btn-primary btn-sm" style="margin-top:0.5rem;">Enter Competition</a>` : ''}
      </div>
    </div>`;
}

function renderShowcaseUploadModal() {
  return `
    <div class="modal-overlay" id="showcaseUploadModal" onclick="if(event.target===this)closeShowcaseUpload()">
      <div class="modal" style="max-width:560px;">
        <div class="modal-header">
          <h3>Upload Your Work</h3>
          <button class="modal-close" onclick="closeShowcaseUpload()">&times;</button>
        </div>
        <div class="modal-body">
          <div style="margin-bottom:1rem;">
            <label style="font-weight:500;font-size:0.88rem;display:block;margin-bottom:0.3rem;">Project Title *</label>
            <input type="text" id="scTitle" class="form-input" placeholder="e.g. Summer Wedding Bouquet Collection">
          </div>
          <div style="margin-bottom:1rem;">
            <label style="font-weight:500;font-size:0.88rem;display:block;margin-bottom:0.3rem;">Category</label>
            <select id="scCategory" class="form-input">
              <option value="">Select category...</option>
              <option value="Bouquets">Bouquets</option>
              <option value="Wedding Designs">Wedding Designs</option>
              <option value="Floral Arrangements">Floral Arrangements</option>
              <option value="Gardens">Gardens</option>
              <option value="Landscaping">Landscaping</option>
              <option value="Indoor Plants">Indoor Plants</option>
              <option value="Floral Photography">Floral Photography</option>
              <option value="Floral Art">Floral Art</option>
              <option value="Competition Entries">Competition Entries</option>
              <option value="Shop Displays">Shop Displays</option>
            </select>
          </div>
          <div style="margin-bottom:1rem;">
            <label style="font-weight:500;font-size:0.88rem;display:block;margin-bottom:0.3rem;">Description</label>
            <textarea id="scDescription" class="form-input" rows="3" placeholder="Describe your project..."></textarea>
          </div>
          <div style="margin-bottom:1rem;">
            <label style="font-weight:500;font-size:0.88rem;display:block;margin-bottom:0.3rem;">Upload Images * (up to 10)</label>
            <input type="file" id="scFiles" accept="image/*" multiple onchange="previewSCImages(this)">
            <div id="scPreview" style="display:flex;gap:0.5rem;margin-top:0.5rem;flex-wrap:wrap;"></div>
          </div>
          <details style="margin-bottom:1rem;font-size:0.85rem;">
            <summary style="cursor:pointer;color:var(--primary-color);font-weight:500;"><i class="bi bi-arrows-expand"></i> Add Before & After Transformation</summary>
            <div style="display:grid;grid-template-columns:1fr 1fr;gap:0.75rem;margin-top:0.75rem;">
              <div>
                <label style="font-weight:500;font-size:0.8rem;display:block;margin-bottom:0.25rem;">Before Image</label>
                <input type="file" id="scBeforeImg" accept="image/*" onchange="previewBA(this, 'beforePreview')">
                <div id="beforePreview" style="width:100%;height:80px;border-radius:6px;margin-top:0.3rem;background:var(--bg-light);display:flex;align-items:center;justify-content:center;font-size:0.72rem;color:var(--text-muted);overflow:hidden;"></div>
              </div>
              <div>
                <label style="font-weight:500;font-size:0.8rem;display:block;margin-bottom:0.25rem;">After Image</label>
                <input type="file" id="scAfterImg" accept="image/*" onchange="previewBA(this, 'afterPreview')">
                <div id="afterPreview" style="width:100%;height:80px;border-radius:6px;margin-top:0.3rem;background:var(--bg-light);display:flex;align-items:center;justify-content:center;font-size:0.72rem;color:var(--text-muted);overflow:hidden;"></div>
              </div>
            </div>
          </details>
          <div style="display:grid;grid-template-columns:1fr 1fr;gap:0.75rem;margin-bottom:1rem;">
            <div>
              <label style="font-weight:500;font-size:0.82rem;display:block;margin-bottom:0.3rem;">Flowers Used</label>
              <input type="text" id="scFlowers" class="form-input" placeholder="Rose, Tulip, Peony...">
            </div>
            <div>
              <label style="font-weight:500;font-size:0.82rem;display:block;margin-bottom:0.3rem;">Techniques</label>
              <input type="text" id="scTechniques" class="form-input" placeholder="Arranging, Pressing...">
            </div>
          </div>
          <div style="display:grid;grid-template-columns:1fr 1fr;gap:0.75rem;margin-bottom:1rem;">
            <div>
              <label style="font-weight:500;font-size:0.82rem;display:block;margin-bottom:0.3rem;">Materials</label>
              <input type="text" id="scMaterials" class="form-input" placeholder="Vase, Ribbon, Wire...">
            </div>
            <div>
              <label style="font-weight:500;font-size:0.82rem;display:block;margin-bottom:0.3rem;">Style</label>
              <input type="text" id="scStyle" class="form-input" placeholder="Modern, Rustic, Classic...">
            </div>
          </div>
          <div style="display:grid;grid-template-columns:1fr 1fr;gap:0.75rem;margin-bottom:1rem;">
            <div>
              <label style="font-weight:500;font-size:0.82rem;display:block;margin-bottom:0.3rem;">Location</label>
              <input type="text" id="scLocation" class="form-input" placeholder="City, Country">
            </div>
            <div>
              <label style="font-weight:500;font-size:0.82rem;display:block;margin-bottom:0.3rem;">Tags</label>
              <input type="text" id="scTags" class="form-input" placeholder="summer, wedding, pink">
            </div>
          </div>
          <div style="margin-bottom:1rem;">
            <label style="font-weight:500;font-size:0.82rem;display:block;margin-bottom:0.3rem;">Marketplace Products <span style="font-size:0.75rem;color:var(--text-muted);">(optional — paste product IDs)</span></label>
            <input type="text" id="scProductIds" class="form-input" placeholder="e.g. prod-123, prod-456">
          </div>
        </div>
        <div class="modal-footer">
          <button class="btn btn-outline" onclick="closeShowcaseUpload()">Cancel</button>
          <button class="btn btn-primary" id="scUploadBtn" onclick="submitShowcaseProject()" disabled>Publish Project</button>
        </div>
      </div>
    </div>`;
}
