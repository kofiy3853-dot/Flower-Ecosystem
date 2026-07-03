// js/showcase.js — Showcase gallery + detail page orchestrator

const SHOWCASE_CATEGORIES = [
  { slug: '', name: 'All Projects' },
  { slug: 'Bouquets', name: 'Bouquets', icon: '🌹' },
  { slug: 'Wedding Designs', name: 'Wedding Designs', icon: '💐' },
  { slug: 'Floral Arrangements', name: 'Floral Arrangements', icon: '🌼' },
  { slug: 'Gardens', name: 'Gardens', icon: '🌿' },
  { slug: 'Landscaping', name: 'Landscaping', icon: '🏡' },
  { slug: 'Indoor Plants', name: 'Indoor Plants', icon: '🪴' },
  { slug: 'Floral Photography', name: 'Floral Photography', icon: '📸' },
  { slug: 'Floral Art', name: 'Floral Art', icon: '🎨' },
  { slug: 'Competition Entries', name: 'Competition Entries', icon: '🏆' },
  { slug: 'Shop Displays', name: 'Shop Displays', icon: '🏪' }
];

let showcaseSavedIds = new Set(JSON.parse(localStorage.getItem('showcaseSaved') || '[]'));
let scFiles = [];

// ─── Gallery Page ───────────────────────────────────────────────────────

function initShowcase() {
  loadShowcaseFeatured();
  loadShowcaseProjects();
  loadShowcaseCreators();
  loadShowcaseCompetitions();
  loadShowcaseCollections();
  renderShowcaseCategories();
  updateShowcaseStats();

  document.getElementById('scSearchBtn')?.addEventListener('click', () => loadShowcaseProjects());
  document.getElementById('scSearch')?.addEventListener('keydown', e => {
    if (e.key === 'Enter') loadShowcaseProjects();
  });
  document.getElementById('scSortTabs')?.addEventListener('click', e => {
    const tab = e.target.closest('.sc-sort-tab');
    if (!tab) return;
    document.querySelectorAll('.sc-sort-tab').forEach(t => t.classList.remove('active'));
    tab.classList.add('active');
    loadShowcaseProjects();
  });
}

function renderShowcaseCategories() {
  const el = document.getElementById('showcaseCategories');
  if (!el) return;
  el.innerHTML = SHOWCASE_CATEGORIES.map(c => `
    <button class="sc-cat-tab" data-cat="${c.slug}">${c.icon ? c.icon + ' ' : ''}${c.name}</button>
  `).join('');
  el.querySelector('.sc-cat-tab')?.classList.add('active');
  el.addEventListener('click', e => {
    const tab = e.target.closest('.sc-cat-tab');
    if (!tab) return;
    el.querySelectorAll('.sc-cat-tab').forEach(t => t.classList.remove('active'));
    tab.classList.add('active');
    loadShowcaseProjects();
  });
}

async function loadShowcaseFeatured() {
  const el = document.getElementById('scFeatured');
  if (!el) return;
  try {
    const res = await fetch('/api/showcase/featured');
    const project = await res.json();
    if (project && project.id) { el.innerHTML = renderFeaturedProject(project); el.style.display = 'block'; }
    else el.style.display = 'none';
  } catch { el.style.display = 'none'; }
}

async function loadShowcaseProjects() {
  const grid = document.getElementById('showcaseGrid');
  const totalEl = document.getElementById('showcaseTotal');
  if (!grid) return;
  grid.innerHTML = renderShowcaseSkeleton();

  const activeCat = document.querySelector('.sc-cat-tab.active')?.dataset.cat || '';
  const activeSort = document.querySelector('.sc-sort-tab.active')?.dataset.sort || 'newest';
  const search = document.getElementById('scSearch')?.value.trim() || '';
  const params = new URLSearchParams({ sort: activeSort, limit: 50 });
  if (activeCat) params.set('category', activeCat);
  if (search) params.set('search', search);

  try {
    const res = await fetch(`/api/showcase?${params}`);
    const data = await res.json();
    const projects = data.projects || [];

    if (!projects.length) {
      grid.innerHTML = `
        <div class="showcase-empty">
          <i class="bi bi-flower1"></i>
          <h3>No projects yet</h3>
          <p>Share your first floral creation and inspire the community.</p>
          <button class="btn btn-primary" onclick="openShowcaseUpload()"><i class="bi bi-plus-lg"></i> Upload Project</button>
        </div>`;
      if (totalEl) totalEl.textContent = '0';
      return;
    }
    grid.innerHTML = projects.map(p => renderShowcaseCard(p, { saved: showcaseSavedIds.has(p.id) })).join('');
    if (totalEl) totalEl.textContent = data.total || projects.length;
  } catch {
    grid.innerHTML = '<div class="showcase-empty"><i class="bi bi-cloud-off"></i><h3>Could not load projects</h3><p>Please try again later.</p></div>';
  }
}

async function loadShowcaseCreators() {
  const el = document.getElementById('scCreators');
  if (!el) return;
  try {
    const res = await fetch('/api/showcase/creators');
    const creators = await res.json();
    if (!creators.length) { el.parentElement.style.display = 'none'; return; }
    el.innerHTML = creators.slice(0, 4).map(c => renderCreatorCard(c)).join('');
  } catch { el.parentElement.style.display = 'none'; }
}

async function loadShowcaseCompetitions() {
  const el = document.getElementById('scCompetitions');
  if (!el) return;
  try {
    const res = await fetch('/api/competitions');
    const comps = await res.json();
    const active = comps.filter(c => c.status === 'open' || c.status === 'voting').slice(0, 3);
    if (!active.length) { el.parentElement.style.display = 'none'; return; }
    el.innerHTML = active.map(c => renderCompetitionCard(c)).join('');
  } catch { el.parentElement.style.display = 'none'; }
}

async function loadShowcaseCollections() {
  const el = document.getElementById('scCollections');
  if (!el) return;
  try {
    const res = await fetch('/api/collections');
    const cols = await res.json();
    if (!cols.length) { el.parentElement.style.display = 'none'; return; }
    el.innerHTML = cols.slice(0, 4).map(c => renderCollectionCard(c)).join('');
  } catch { el.parentElement.style.display = 'none'; }
}

// ─── Upload ─────────────────────────────────────────────────────────────

function openShowcaseUpload() {
  if (!userLoggedIn()) { openAuthModal('login'); return; }
  const existing = document.getElementById('showcaseUploadModal');
  if (existing) { existing.classList.add('open'); document.body.style.overflow = 'hidden'; return; }
  const div = document.createElement('div');
  div.innerHTML = renderShowcaseUploadModal();
  document.body.appendChild(div);
  setTimeout(() => {
    document.getElementById('showcaseUploadModal').classList.add('open');
    document.body.style.overflow = 'hidden';
  }, 10);
}

function closeShowcaseUpload() {
  const modal = document.getElementById('showcaseUploadModal');
  if (modal) { modal.classList.remove('open'); document.body.style.overflow = ''; }
}

function previewSCImages(input) {
  const preview = document.getElementById('scPreview');
  scFiles = Array.from(input.files).slice(0, 10);
  preview.innerHTML = scFiles.map((f, i) => {
    const url = URL.createObjectURL(f);
    return `<div style="position:relative;width:70px;height:70px;border-radius:6px;overflow:hidden;border:1px solid var(--border-color);">
      <img src="${url}" style="width:100%;height:100%;object-fit:cover;">
      <button type="button" onclick="removeSCImg(${i})" style="position:absolute;top:2px;right:2px;width:18px;height:18px;border-radius:50%;background:rgba(0,0,0,0.5);color:white;border:none;cursor:pointer;font-size:0.6rem;">×</button>
    </div>`;
  }).join('');
  document.getElementById('scUploadBtn').disabled = !scFiles.length && !document.getElementById('scTitle').value.trim();
}

function removeSCImg(idx) {
  scFiles.splice(idx, 1);
  previewSCImages({ files: scFiles });
}

function previewBA(input, previewId) {
  const preview = document.getElementById(previewId);
  if (!preview || !input.files?.length) return;
  const url = URL.createObjectURL(input.files[0]);
  preview.innerHTML = `<img src="${url}" style="width:100%;height:100%;object-fit:cover;">`;
}

async function submitShowcaseProject() {
  const title = document.getElementById('scTitle').value.trim();
  const files = scFiles;
  if (!title && !files.length) { showToast ? showToast('Title or image required') : alert('Title or image required'); return; }

  const btn = document.getElementById('scUploadBtn');
  btn.disabled = true; btn.textContent = 'Publishing...';

  try {
    const formData = new FormData();
    files.forEach(f => formData.append('images', f));
    // Add before/after images if provided
    const beforeFile = document.getElementById('scBeforeImg')?.files?.[0];
    const afterFile = document.getElementById('scAfterImg')?.files?.[0];
    if (beforeFile) { formData.append('images', beforeFile); formData.append('before_image_index', String(files.length)); }
    if (afterFile) { formData.append('images', afterFile); formData.append('after_image_index', String(files.length + (beforeFile ? 1 : 0))); }
    formData.append('title', title || 'Untitled');
    formData.append('content', document.getElementById('scDescription').value.trim() || '');
    formData.append('category', document.getElementById('scCategory').value || '');
    formData.append('tags', document.getElementById('scTags').value || '');
    formData.append('flowers_used', document.getElementById('scFlowers').value || '');
    formData.append('techniques', document.getElementById('scTechniques').value || '');
    formData.append('materials', document.getElementById('scMaterials').value || '');
    formData.append('style', document.getElementById('scStyle').value || '');
    formData.append('location', document.getElementById('scLocation').value || '');
    formData.append('product_ids', document.getElementById('scProductIds')?.value || '');

    const token = getToken ? getToken() : localStorage.getItem('flower-token');
    const res = await fetch('/api/showcase', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${token}` },
      body: formData
    });
    if (!res.ok) { const err = await res.json().catch(() => ({})); throw new Error(err.error || 'Upload failed'); }
    btn.textContent = '✓ Published!';
    setTimeout(() => { closeShowcaseUpload(); loadShowcaseProjects(); }, 800);
  } catch (err) {
    btn.disabled = false; btn.textContent = 'Publish Project';
    showToast ? showToast(err.message) : alert(err.message);
  }
}

// ─── Actions ────────────────────────────────────────────────────────────

async function toggleShowcaseLike(postId, btn) {
  if (!userLoggedIn()) { openAuthModal('login'); return; }
  try {
    const res = await fetch(`/api/showcase/${postId}/like`, { method: 'POST', headers: authHeaders() });
    const data = await res.json();
    const icon = btn.querySelector('i');
    icon.className = data.liked ? 'bi bi-heart-fill' : 'bi bi-heart';
    btn.classList.toggle('liked', data.liked);
    const parent = btn.closest('.showcase-item');
    if (parent) {
      const countEl = parent.querySelector('.showcase-meta span:first-child');
      if (countEl) {
        const curr = parseInt(countEl.textContent.replace(/[^0-9]/g, '')) || 0;
        countEl.innerHTML = `<i class="bi bi-heart"></i> ${formatNumber(data.liked ? curr + 1 : Math.max(0, curr - 1))}`;
      }
    }
  } catch {}
}

function toggleShowcaseSave(postId, btn) {
  if (!userLoggedIn()) { openAuthModal('login'); return; }
  if (showcaseSavedIds.has(postId)) {
    showcaseSavedIds.delete(postId);
    btn.classList.remove('saved');
    btn.querySelector('i').className = 'bi bi-bookmark';
  } else {
    showcaseSavedIds.add(postId);
    btn.classList.add('saved');
    btn.querySelector('i').className = 'bi bi-bookmark-fill';
  }
  localStorage.setItem('showcaseSaved', JSON.stringify([...showcaseSavedIds]));
  updateShowcaseStats();
}

function showcaseShare(postId) {
  const url = `${window.location.origin}/showcase-detail.html?id=${postId}`;
  if (navigator.share) { navigator.share({ title: 'Flower Showcase', url }).catch(() => {}); }
  else {
    navigator.clipboard.writeText(url);
    showToast ? showToast('Link copied!') : alert('Link copied!');
  }
}

function updateShowcaseStats() {
  const el = document.getElementById('scSaved');
  if (el) el.textContent = showcaseSavedIds.size;
}

// ─── Detail Page ────────────────────────────────────────────────────────

async function initShowcaseDetail() {
  const params = new URLSearchParams(window.location.search);
  const id = params.get('id');
  if (!id) {
    document.getElementById('projectContent').innerHTML = '<div class="empty-state"><h3>Project not found</h3></div>';
    return;
  }

  let project;
  try {
    const res = await fetch(`/api/showcase/${id}`, { headers: authHeaders() });
    if (!res.ok) throw new Error('Not found');
    project = await res.json();
  } catch {
    document.getElementById('projectContent').innerHTML = '<div class="empty-state"><i class="bi bi-image"></i><h3>Project not found</h3></div>';
    return;
  }

  document.title = `${project.title || 'Project'} | Flower Ecosystem`;

  const images = project.images || project.media_urls || [];
  const comments = project.comments || [];
  const meta = project.showcase_meta || {};
  const flowersUsed = meta.flowers_used || [];
  const techniques = meta.techniques || [];
  const materials = meta.materials || [];
  const userName = [project.first_name, project.last_name].filter(Boolean).join(' ') || 'Anonymous';
  const userInitial = userName[0]?.toUpperCase() || '?';
  const related = project.related || [];

  const hasBa = meta.before_image && meta.after_image;

  document.getElementById('projectContent').innerHTML = `
    ${hasBa ? `
      <div style="margin-bottom:1.5rem;">
        ${renderBeforeAfter(meta.before_image, meta.after_image)}
        <div class="ba-before-cta"><button onclick="document.querySelector('.ba-range').focus();document.querySelector('.ba-range').click();"><i class="bi bi-arrows-expand"></i> Drag to compare</button></div>
      </div>
    ` : images.length ? `
      <div class="scd-hero" id="scdHero">
        <img id="scdMainImg" src="${escapeHtml(images[0])}" alt="">
      </div>
      ${images.length > 1 ? `
        <div class="scd-gallery-thumbs">
          ${images.map((url, i) => `
            <div class="scd-thumb${i === 0 ? ' active' : ''}" onclick="switchSCImage('${escapeHtml(url)}', this)">
              <img src="${escapeHtml(url)}" alt="">
            </div>
          `).join('')}
        </div>` : ''}` : ''}

    <div class="scd-layout">
      <div class="scd-main">
        <div class="scd-card">
          <h1 class="scd-title">${escapeHtml(project.title || 'Untitled')}</h1>
          <div class="scd-meta">
            ${project.category ? `<span><i class="bi bi-tag"></i> ${escapeHtml(project.category)}</span>` : ''}
            <span><i class="bi bi-calendar"></i> ${formatDate(project.created_at)}</span>
            ${meta.location ? `<span><i class="bi bi-geo-alt"></i> ${escapeHtml(meta.location)}</span>` : ''}
            ${meta.style ? `<span><i class="bi bi-palette"></i> ${escapeHtml(meta.style)}</span>` : ''}
          </div>

          <div class="scd-creator" onclick="window.location.href='profile.html?id=${project.user_id}'">
            <div class="scd-creator-avatar">
              ${project.profile_image ? `<img src="${escapeHtml(project.profile_image)}" alt="">` : userInitial}
            </div>
            <div>
              <div class="scd-creator-name">${escapeHtml(userName)}</div>
              <div class="scd-creator-role">${escapeHtml(project.user_role || 'Florist')}</div>
            </div>
          </div>

          <div class="scd-actions">
            <button class="scd-action-btn${project.user_liked ? ' liked' : ''}" id="scdLikeBtn" onclick="scdToggleLike('${project.id}')">
              <i class="bi ${project.user_liked ? 'bi-heart-fill' : 'bi-heart'}"></i>
              <span id="scdLikeCount">${project.like_count || 0}</span>
            </button>
            <button class="scd-action-btn" onclick="scdSave('${project.id}')">
              <i class="bi bi-bookmark"></i> Save
            </button>
            <button class="scd-action-btn" onclick="showcaseShare('${project.id}')">
              <i class="bi bi-share"></i> Share
            </button>
            <button class="scd-action-btn" onclick="document.getElementById('scdCommentInput')?.focus()">
              <i class="bi bi-chat-dots"></i> Comment
            </button>
          </div>

          ${project.content ? `<div class="scd-description">${escapeHtml(project.content)}</div>` : ''}

          ${flowersUsed.length ? `
            <h3 style="font-size:1.1rem;margin-bottom:0.75rem;"><i class="bi bi-flower1" style="color:var(--primary-color)"></i> Flowers Used</h3>
            <div class="scd-flowers">
              ${flowersUsed.map(f => `<span class="scd-flower-tag">🌷 ${escapeHtml(f)}</span>`).join('')}
            </div>` : ''}

          ${techniques.length ? `
            <h3 style="font-size:1.1rem;margin-bottom:0.75rem;"><i class="bi bi-tools" style="color:var(--primary-color)"></i> Techniques</h3>
            <div style="display:flex;flex-wrap:wrap;gap:0.5rem;margin-bottom:1.5rem;">
              ${techniques.map(t => `<span class="scd-tag">${escapeHtml(t)}</span>`).join('')}
            </div>` : ''}

          ${materials.length ? `
            <h3 style="font-size:1.1rem;margin-bottom:0.75rem;"><i class="bi bi-box" style="color:var(--primary-color)"></i> Materials</h3>
            <div style="display:flex;flex-wrap:wrap;gap:0.5rem;margin-bottom:1.5rem;">
              ${materials.map(m => `<span class="scd-tag">${escapeHtml(m)}</span>`).join('')}
            </div>` : ''}

          ${project.tags && project.tags.length ? `
            <div style="display:flex;flex-wrap:wrap;gap:0.4rem;margin-top:1rem;">
              ${(typeof project.tags === 'string' ? JSON.parse(project.tags) : project.tags).map(t => `<span class="scd-tag">#${escapeHtml(t)}</span>`).join('')}
            </div>` : ''}

          ${meta.product_ids && meta.product_ids.length ? `
            <div id="scdProducts" style="margin-top:1rem;padding-top:1rem;border-top:1px solid var(--border-light);">
              <h3 style="font-size:1rem;margin-bottom:0.75rem;"><i class="bi bi-cart3" style="color:var(--primary-color)"></i> Products Used</h3>
              <div id="scdProductList" style="display:flex;flex-direction:column;gap:0.5rem;"><span style="font-size:0.85rem;color:var(--text-muted);">Loading...</span></div>
            </div>` : ''}
        </div>

        <div class="scd-card" style="margin-top:1.25rem;">
          <h3 style="font-size:1.05rem;margin-bottom:1rem;">Comments (${comments.length})</h3>
          ${comments.length ? comments.map(c => `
            <div class="scd-comment">
              <div class="scd-comment-avatar">
                ${c.profile_image ? `<img src="${escapeHtml(c.profile_image)}" alt="">` : ((c.first_name?.[0] || '?').toUpperCase())}
              </div>
              <div>
                <div class="scd-comment-name">${escapeHtml([c.first_name, c.last_name].filter(Boolean).join(' ') || 'Anonymous')}</div>
                <div class="scd-comment-text">${escapeHtml(c.content)}</div>
              </div>
            </div>
          `).join('') : '<p style="color:var(--text-muted);font-size:0.88rem;">No comments yet.</p>'}

          ${userLoggedIn() ? `
            <div class="scd-reply-box">
              <textarea id="scdCommentInput" placeholder="Share your thoughts..."></textarea>
              <button class="btn btn-primary btn-sm" onclick="scdPostComment('${project.id}')"><i class="bi bi-send"></i></button>
            </div>` : `
            <div class="scd-login-prompt"><a href="#" onclick="openAuthModal('login');return false;">Sign in</a> to leave a comment</div>`}
        </div>

        ${related.length ? `
          <div class="scd-card" style="margin-top:1.25rem;">
            <h3 style="font-size:1.05rem;margin-bottom:1rem;"><i class="bi bi-link-45deg" style="color:var(--primary-color)"></i> Related Projects</h3>
            <div class="scd-related-grid">
              ${related.map(r => {
                const rImg = r.media_urls?.[0] || '';
                const rName = [r.first_name, r.last_name].filter(Boolean).join(' ') || 'Anonymous';
                return `
                  <div class="scd-related-item" onclick="window.location.href='showcase-detail.html?id=${r.id}'">
                    ${rImg ? `<img src="${escapeHtml(rImg)}" alt="">` : ''}
                    <div class="scd-related-body">
                      <h4>${escapeHtml(r.title || '')}</h4>
                      <span style="font-size:0.75rem;color:var(--text-muted);">${escapeHtml(rName)}</span>
                    </div>
                  </div>`;
              }).join('')}
            </div>
          </div>` : ''}
      </div>

      <div class="scd-sidebar">
        <div class="scd-card">
          <h3 style="font-size:0.95rem;margin-bottom:0.75rem;"><i class="bi bi-bar-chart" style="color:var(--primary-color)"></i> Statistics</h3>
          <div class="scd-detail-row"><span class="scd-detail-label"><i class="bi bi-heart"></i> Likes</span><span class="scd-detail-value">${formatNumber(project.like_count || 0)}</span></div>
          <div class="scd-detail-row"><span class="scd-detail-label"><i class="bi bi-eye"></i> Views</span><span class="scd-detail-value">${formatNumber(project.view_count || 0)}</span></div>
          <div class="scd-detail-row"><span class="scd-detail-label"><i class="bi bi-chat-dots"></i> Comments</span><span class="scd-detail-value">${comments.length}</span></div>
          <div class="scd-detail-row"><span class="scd-detail-label"><i class="bi bi-bookmark"></i> Saves</span><span class="scd-detail-value">${formatNumber(project.save_count || 0)}</span></div>
        </div>
        ${meta.country || meta.style ? `
          <div class="scd-card">
            <h3 style="font-size:0.95rem;margin-bottom:0.75rem;"><i class="bi bi-info-circle" style="color:var(--primary-color)"></i> Details</h3>
            ${meta.country ? `<div class="scd-detail-row"><span class="scd-detail-label">Country</span><span class="scd-detail-value">${escapeHtml(meta.country)}</span></div>` : ''}
            ${meta.style ? `<div class="scd-detail-row"><span class="scd-detail-label">Style</span><span class="scd-detail-value">${escapeHtml(meta.style)}</span></div>` : ''}
            ${project.category ? `<div class="scd-detail-row"><span class="scd-detail-label">Category</span><span class="scd-detail-value">${escapeHtml(project.category)}</span></div>` : ''}
          </div>` : ''}
      </div>
    </div>`;

  // Load product links if any
  if (meta.product_ids && meta.product_ids.length) {
    loadShowcaseProducts(meta.product_ids);
  }
}

async function loadShowcaseProducts(productIds) {
  try {
    const res = await fetch('/api/showcase/products', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ids: productIds })
    });
    const products = await res.json();
    if (!products.length) { document.getElementById('scdProductList')?.remove(); return; }
    document.getElementById('scdProductList').innerHTML = products.map(p => `
      <a href="product-detail.html?id=${p.id}" class="scd-product-link" style="display:flex;align-items:center;gap:0.75rem;padding:0.5rem;border:1px solid var(--border-light);border-radius:var(--radius-sm);text-decoration:none;color:inherit;transition:all 0.2s;">
        ${p.image_url ? `<img src="${escapeHtml(p.image_url)}" alt="" style="width:45px;height:45px;object-fit:cover;border-radius:4px;">` : '<div style="width:45px;height:45px;background:var(--bg-light);border-radius:4px;display:flex;align-items:center;justify-content:center;"><i class="bi bi-flower1" style="color:var(--text-muted);"></i></div>'}
        <div style="flex:1;">
          <div style="font-size:0.85rem;font-weight:500;">${escapeHtml(p.name)}</div>
          ${p.price ? `<div style="font-size:0.8rem;color:var(--primary-color);font-weight:600;">$${parseFloat(p.price).toFixed(2)}</div>` : ''}
        </div>
        <i class="bi bi-box-arrow-up-right" style="color:var(--text-muted);font-size:0.75rem;"></i>
      </a>
    `).join('');
  } catch { document.getElementById('scdProductList')?.remove(); }
}

function switchSCImage(url, el) {
  document.getElementById('scdMainImg').src = url;
  document.querySelectorAll('.scd-thumb').forEach(t => t.classList.remove('active'));
  el.classList.add('active');
}

async function scdToggleLike(projectId) {
  if (!userLoggedIn()) { openAuthModal('login'); return; }
  try {
    const res = await fetch(`/api/showcase/${projectId}/like`, { method: 'POST', headers: authHeaders() });
    const data = await res.json();
    const btn = document.getElementById('scdLikeBtn');
    const count = document.getElementById('scdLikeCount');
    btn.classList.toggle('liked', data.liked);
    btn.querySelector('i').className = data.liked ? 'bi bi-heart-fill' : 'bi bi-heart';
    count.textContent = data.liked ? (parseInt(count.textContent) + 1) : Math.max(0, parseInt(count.textContent) - 1);
  } catch {}
}

function scdSave(projectId) {
  if (!userLoggedIn()) { openAuthModal('login'); return; }
  showcaseSavedIds.add(projectId);
  localStorage.setItem('showcaseSaved', JSON.stringify([...showcaseSavedIds]));
  document.querySelector('.scd-action-btn:nth-child(2) i').className = 'bi bi-bookmark-fill';
  showToast ? showToast('Saved!') : alert('Saved!');
}

async function scdPostComment(projectId) {
  const input = document.getElementById('scdCommentInput');
  const content = input?.value.trim();
  if (!content) return;
  try {
    const res = await fetch(`/api/posts/${projectId}/comments`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...authHeaders() },
      body: JSON.stringify({ content })
    });
    if (!res.ok) throw new Error('Failed');
    window.location.reload();
  } catch { showToast ? showToast('Failed to post comment') : alert('Failed'); }
}
