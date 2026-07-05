// js/discussions.js — Discussions page (enhanced 3-column layout)

let currentCategory = '';
let currentSort = 'newest';
let currentFilter = 'all';
let currentPage = 1;
let totalPages = 1;

const CATEGORIES = [
    { slug: 'flower-care', name: 'Flower Care', icon: 'bi-flower1', desc: 'Watering, preservation, maintenance' },
    { slug: 'flower-farming', name: 'Flower Farming', icon: 'bi-seedling', desc: 'Soil, irrigation, harvesting' },
    { slug: 'floristry', name: 'Floral Design', icon: 'bi-flower2', desc: 'Bouquets, centerpieces, arrangements' },
    { slug: 'gardening', name: 'Gardening', icon: 'bi-house-door', desc: 'Landscaping, home gardens' },
    { slug: 'pests-diseases', name: 'Pests & Diseases', icon: 'bi-bug', desc: 'Plant health, treatments' },
    { slug: 'flower-business', name: 'Flower Business', icon: 'bi-briefcase', desc: 'Pricing, marketing, customer service' },
    { slug: 'delivery-logistics', name: 'Delivery & Logistics', icon: 'bi-truck', desc: 'Packaging, transportation' },
    { slug: 'learning-support', name: 'Learning Support', icon: 'bi-mortarboard', desc: 'Courses, assignments, workshops' },
    { slug: 'beginner-questions', name: 'Beginner Questions', icon: 'bi-question-circle', desc: 'First-time growers and florists' }
];

// ─── Utilities ─────────────────────────────────────────────────────────

function userLoggedIn() {
    try { return typeof window.isLoggedIn === 'function' ? window.isLoggedIn() : !!localStorage.getItem('flower-token'); } catch { return false; }
}

function formatNumber(n) {
    if (n >= 1000) return (n / 1000).toFixed(1) + 'K';
    return String(n);
}

function getAvatarHtml(avatar, name) {
    if (!avatar) return (name || '?')[0].toUpperCase();
    if (avatar.startsWith('/') || avatar.startsWith('http')) {
        return `<img src="${escapeHtml(avatar)}" alt="${escapeHtml(name || '')}">`;
    }
    return avatar;
}

function isExpertRole(role) {
    return ['FLORIST', 'INSTRUCTOR', 'ADMIN', 'SUPERADMIN'].includes((role || '').toUpperCase());
}

function getReputationLevel(points) {
    if (points >= 5000) return { icon: 'bi-trophy', label: 'Community Leader', color: '#f59e0b' };
    if (points >= 1500) return { icon: 'bi-flower2', label: 'Mentor', color: '#ec4899' };
    if (points >= 500) return { icon: 'bi-flower1', label: 'Expert', color: '#8b5cf6' };
    if (points >= 100) return { icon: 'bi-tree', label: 'Contributor', color: '#10b981' };
    return { icon: 'bi-seedling', label: 'New Member', color: '#6b7280' };
}

// ─── Init ──────────────────────────────────────────────────────────────

async function initDiscussionsPage() {
    if (!userLoggedIn()) {
        const myBtn = document.getElementById('myDiscBtn');
        if (myBtn) myBtn.style.display = 'none';
    }

    renderCategoryCards();
    renderSidebarCategories();
    setupLeftSidebar();
    setupSortTabs();
    setupFilterChips();

    // Start discussion card
    const startEl = document.getElementById('startDiscussionCard');
    if (startEl) startEl.innerHTML = renderStartDiscussionCard();

    // Load tags from API
    loadPopularTags();

    await Promise.all([
        loadFeaturedDiscussion(),
        loadDiscussions(),
        loadCommunityStats(),
        loadTopContributors(),
        loadTrendingTopics(),
        loadRelatedDiscussions()
    ]);
}

async function loadPopularTags() {
    try {
        const data = await api.fetchJSON('/api/feed/trending');
        const el = document.getElementById('popularTags');
        if (el && data && data.length) {
            el.innerHTML = data.slice(0, 8).map(t =>
                `<span class="pop-tag">#${escapeHtml(t.tag || t)} <span class="count">${formatNumber(t.count || 0)}</span></span>`
            ).join('');
        }
    } catch {}
}

// ─── Category Cards ────────────────────────────────────────────────────

function renderCategoryCards() {
    const el = document.getElementById('catCards');
    if (!el) return;
    el.innerHTML = CATEGORIES.map(c => `
        <div class="cat-card${currentCategory === c.slug ? ' active' : ''}" data-slug="${c.slug}" onclick="selectCategory('${c.slug}')">
            <div class="cat-card-icon"><i class="bi ${c.icon}"></i></div>
            <div class="cat-card-name">${c.name}</div>
        </div>
    `).join('');
}

function renderSidebarCategories() {
    const el = document.getElementById('sidebarCategories');
    if (!el) return;
    el.innerHTML = CATEGORIES.map(c => `
        <div class="disc-cat-item${currentCategory === c.slug ? ' active' : ''}" data-slug="${c.slug}" onclick="selectCategory('${c.slug}')">
            <span><i class="bi ${c.icon}"></i></span> ${c.name}
        </div>
    `).join('');

    // Mobile categories
    const mobileEl = document.getElementById('mobileCategories');
    if (mobileEl) {
        mobileEl.innerHTML = CATEGORIES.map(c => `
            <span class="filter-chip${currentCategory === c.slug ? ' active' : ''}" data-slug="${c.slug}" onclick="selectCategory('${c.slug}');closeMobileFilter();">
                <i class="bi ${c.icon}"></i> ${c.name}
            </span>
        `).join('');
    }
}

// ─── Mobile Filter Drawer ──────────────────────────────────────────────

function openMobileFilter() {
    const drawer = document.getElementById('mobileFilterDrawer');
    if (drawer) {
        drawer.classList.add('open');
        document.body.style.overflow = 'hidden';
        setupMobileFilterSync();
    }
}

function closeMobileFilter() {
    const drawer = document.getElementById('mobileFilterDrawer');
    if (drawer) {
        drawer.classList.remove('open');
        document.body.style.overflow = '';
    }
}

function setupMobileFilterSync() {
    // Sync mobile sort tabs with main sort
    document.querySelectorAll('#mobileSortTabs .sort-tab').forEach(tab => {
        tab.classList.toggle('active', tab.dataset.sort === currentSort);
        tab.onclick = () => {
            document.querySelectorAll('#mobileSortTabs .sort-tab').forEach(t => t.classList.remove('active'));
            tab.classList.add('active');
        };
    });
    // Sync mobile filter chips with main chips
    document.querySelectorAll('#mobileFilterChips .filter-chip').forEach(chip => {
        chip.classList.toggle('active', chip.dataset.filter === currentFilter);
        chip.onclick = () => {
            document.querySelectorAll('#mobileFilterChips .filter-chip').forEach(c => c.classList.remove('active'));
            chip.classList.add('active');
        };
    });
}

function applyMobileFilters() {
    // Read mobile sort
    const activeSort = document.querySelector('#mobileSortTabs .sort-tab.active');
    if (activeSort) currentSort = activeSort.dataset.sort;

    // Read mobile filter
    const activeFilter = document.querySelector('#mobileFilterChips .filter-chip.active');
    if (activeFilter) currentFilter = activeFilter.dataset.filter;

    // Sync main UI
    document.querySelectorAll('.sort-tab').forEach(t => t.classList.toggle('active', t.dataset.sort === currentSort));
    document.querySelectorAll('.filter-chip').forEach(c => c.classList.toggle('active', c.dataset.filter === currentFilter));

    currentPage = 1;
    closeMobileFilter();
    loadDiscussions();
}

function selectCategory(slug) {
    currentCategory = currentCategory === slug ? '' : slug;
    currentFilter = 'all';
    currentPage = 1;
    renderCategoryCards();
    renderSidebarCategories();
    resetLeftSidebarActive();
    resetFilterChips();
    loadDiscussions();
}

// ─── Left Sidebar Navigation ───────────────────────────────────────────

function setupLeftSidebar() {
    document.querySelectorAll('.disc-nav-item[data-filter]').forEach(item => {
        item.addEventListener('click', e => {
            e.preventDefault();
            const filter = item.dataset.filter;
            if (filter === 'my' || filter === 'saved') return; // handled separately

            document.querySelectorAll('.disc-nav-item').forEach(i => i.classList.remove('active'));
            item.classList.add('active');

            currentFilter = filter;
            currentCategory = '';
            currentPage = 1;
            renderCategoryCards();
            renderSidebarCategories();
            resetFilterChips();
            loadDiscussions();
        });
    });
}

function resetLeftSidebarActive() {
    document.querySelectorAll('.disc-nav-item').forEach(i => i.classList.remove('active'));
    document.querySelector('.disc-nav-item[data-filter="all"]')?.classList.add('active');
}

function filterMyDiscussions() {
    if (!userLoggedIn()) { openAuthModal('login'); return; }
    document.querySelectorAll('.disc-nav-item').forEach(i => i.classList.remove('active'));
    document.querySelector('.disc-nav-item[data-filter="my"]')?.classList.add('active');
    currentFilter = 'my';
    currentCategory = '';
    currentPage = 1;
    loadDiscussions();
}

function filterSaved() {
    if (!userLoggedIn()) { openAuthModal('login'); return; }
    document.querySelectorAll('.disc-nav-item').forEach(i => i.classList.remove('active'));
    document.querySelector('.disc-nav-item[data-filter="saved"]')?.classList.add('active');
    currentFilter = 'saved';
    currentCategory = '';
    currentPage = 1;
    loadDiscussions();
}

// ─── Sort Tabs ─────────────────────────────────────────────────────────

function setupSortTabs() {
    document.getElementById('sortTabs')?.addEventListener('click', e => {
        const tab = e.target.closest('.sort-tab');
        if (!tab) return;
        document.querySelectorAll('.sort-tab').forEach(t => t.classList.remove('active'));
        tab.classList.add('active');
        currentSort = tab.dataset.sort;
        currentPage = 1;
        loadDiscussions();
    });
}

// ─── Filter Chips ──────────────────────────────────────────────────────

function setupFilterChips() {
    document.getElementById('filterChips')?.addEventListener('click', e => {
        const chip = e.target.closest('.filter-chip');
        if (!chip) return;
        document.querySelectorAll('.filter-chip').forEach(c => c.classList.remove('active'));
        chip.classList.add('active');
        currentFilter = chip.dataset.filter;
        currentPage = 1;
        loadDiscussions();
    });
}

function resetFilterChips() {
    document.querySelectorAll('.filter-chip').forEach(c => c.classList.remove('active'));
    document.querySelector('.filter-chip[data-filter="all"]')?.classList.add('active');
}

// ─── Featured Discussion ───────────────────────────────────────────────

async function loadFeaturedDiscussion() {
    try {
        const res = await fetch('/api/discussions?sort=popular&limit=1');
        const data = await res.json();
        const disc = (data.discussions || [])[0];
        if (!disc) return;

        const author = disc.author_name || 'Anonymous';
        const category = disc.category_name || 'General';
        const replies = disc.reply_count || 0;
        const views = disc.views || 0;

        document.getElementById('featuredSection').innerHTML = `
            <div class="featured-disc" onclick="window.location.href='discussion-detail.html?id=${disc.id}'">
                <div class="featured-badge"><i class="bi bi-star-fill"></i> Featured Discussion</div>
                <h3>${escapeHtml(disc.title)}</h3>
                <div class="featured-disc-excerpt">${escapeHtml(disc.excerpt || '')}</div>
                <div class="featured-disc-meta">
                    <span><i class="bi bi-person"></i> ${escapeHtml(author)} ${isExpertRole(disc.author_role) ? '<span class="disc-badge expert">Expert</span>' : ''}</span>
                    <span><i class="bi bi-tag"></i> ${escapeHtml(category)}</span>
                    <span><i class="bi bi-chat-dots"></i> ${replies} Replies</span>
                    <span><i class="bi bi-eye"></i> ${formatNumber(views)} Views</span>
                    <span><i class="bi bi-clock"></i> ${timeAgo(disc.created_at)}</span>
                </div>
            </div>`;
    } catch {}
}

// ─── Load Discussions ──────────────────────────────────────────────────

async function loadDiscussions() {
    const searchEl = document.getElementById('heroSearch');
    const search = searchEl ? searchEl.value.trim() : '';
    const params = new URLSearchParams({ sort: currentSort, page: currentPage, limit: 20 });

    if (currentCategory) params.set('category', currentCategory);
    if (search) params.set('search', search);

    // Map filter chips to API params
    if (currentFilter === 'unsolved') params.set('sort', 'unsolved');
    if (currentFilter === 'solved') params.set('solved', 'true');
    if (currentFilter === 'my') params.set('my', 'true');
    if (currentFilter === 'saved') params.set('saved', 'true');
    if (currentFilter === 'featured') params.set('featured', 'true');
    if (currentFilter === 'trending') params.set('sort', 'popular');
    if (currentFilter === 'following') params.set('following', 'true');

    let data;
    try {
        const res = await fetch(`/api/discussions?${params}`, { headers: authHeaders() });
        data = await res.json();
    } catch {
        data = { discussions: [], total: 0, pages: 1 };
    }

    const list = document.getElementById('discussionList');
    if (!list) return;
    if (!data.discussions || !data.discussions.length) {
        list.innerHTML = `<div class="empty-state"><i class="bi bi-flower1"></i><h3>No discussions yet</h3><p>Be the first to ask a question or start a conversation.</p><a href="create-discussion.html" class="btn btn-primary">Start Discussion</a></div>`;
        document.getElementById('pagination').innerHTML = '';
        return;
    }

    totalPages = data.pages || 1;

    list.innerHTML = data.discussions.map(d => renderDiscussionCard(d)).join('');

    renderPagination();
}

function renderPagination() {
    const el = document.getElementById('pagination');
    if (totalPages <= 1) { el.innerHTML = ''; return; }
    let html = '';
    if (currentPage > 1) html += `<button class="page-btn" onclick="goToPage(${currentPage - 1})"><i class="bi bi-chevron-left"></i></button>`;
    for (let i = 1; i <= totalPages; i++) {
        if (totalPages > 7 && i > 3 && i < totalPages - 2 && Math.abs(i - currentPage) > 1) {
            if (i === 4 || i === totalPages - 3) html += `<span style="padding:0.4rem 0.3rem;color:var(--text-muted)">...</span>`;
            continue;
        }
        html += `<button class="page-btn${i === currentPage ? ' active' : ''}" onclick="goToPage(${i})">${i}</button>`;
    }
    if (currentPage < totalPages) html += `<button class="page-btn" onclick="goToPage(${currentPage + 1})"><i class="bi bi-chevron-right"></i></button>`;
    el.innerHTML = html;
}

function goToPage(page) {
    currentPage = page;
    loadDiscussions();
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

// ─── Search ────────────────────────────────────────────────────────────

function searchFromHero() {
    currentPage = 1;
    loadDiscussions();
    // Scroll to results on mobile
    if (window.innerWidth <= 900) {
        setTimeout(() => {
            document.getElementById('discussionList')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }, 100);
    }
}

// ─── Stats ─────────────────────────────────────────────────────────────



// ─── Smooth Scroll ─────────────────────────────────────────────────────

function scrollToCategories(e) {
    e.preventDefault();
    document.getElementById('categories')?.scrollIntoView({ behavior: 'smooth' });
}

// ─── Discussion Detail Page ────────────────────────────────────────────

async function initDiscussionDetail() {
    const params = new URLSearchParams(window.location.search);
    const id = params.get('id');
    if (!id) {
        document.getElementById('discussionContent').innerHTML = '<div class="empty-state"><h3>Discussion not found</h3></div>';
        return;
    }

    let discussion;
    try {
        const res = await fetch(`/api/discussions/${id}`, { headers: authHeaders() });
        if (!res.ok) throw new Error('Not found');
        discussion = await res.json();
    } catch {
        document.getElementById('discussionContent').innerHTML = '<div class="empty-state"><i class="bi bi-chat-dots"></i><h3>Discussion not found</h3><p>This discussion may have been removed.</p></div>';
        return;
    }

    document.title = `${discussion.title} | Flower Ecosystem`;

    const imagesHtml = (discussion.images || []).length
        ? `<div class="disc-detail-images">${discussion.images.map(url => `<img src="${escapeHtml(url)}" alt="Discussion image" loading="lazy">`).join('')}</div>`
        : '';

    const userVote = discussion.userVote;

    // Determine badges
    const badges = [];
    if (discussion.is_pinned) badges.push('<span class="disc-badge pinned"><i class="bi bi-pin-fill"></i> Pinned</span>');
    if (discussion.is_solved) badges.push('<span class="disc-badge solved"><i class="bi bi-check-lg"></i> Solved</span>');
    if (isExpertRole(discussion.author_role)) badges.push('<span class="disc-badge expert">Expert</span>');

    document.getElementById('discussionContent').innerHTML = `
        <div class="disc-detail-card">
            <div class="disc-detail-header">
                <div class="disc-detail-avatar">${getAvatarHtml(discussion.author_avatar, discussion.author_name)}</div>
                <div class="disc-detail-meta" style="flex:1;">
                    <div class="disc-badges" style="margin-bottom:0.5rem;">${badges.join('')}</div>
                    <h1>${escapeHtml(discussion.title)}</h1>
                    <div class="author-info">
                        by <span class="author-name">${escapeHtml(discussion.author_name || 'Anonymous')}</span>
                        ${isExpertRole(discussion.author_role) ? '<span class="expert-badge">Expert</span>' : ''}
                        · <span class="disc-tag" style="font-size:0.75rem;">${escapeHtml(discussion.category_name || 'General')}</span>
                        · ${timeAgo(discussion.created_at)}
                    </div>
                </div>
            </div>
            <div class="disc-detail-content">${escapeHtml(discussion.content)}</div>
            ${imagesHtml}
            <div class="disc-detail-footer">
                <div class="disc-detail-stats">
                    <span><i class="bi bi-eye"></i> ${formatNumber(discussion.views || 0)} views</span>
                    <span><i class="bi bi-chat-dots"></i> ${(discussion.comments || []).length} replies</span>
                    <span><i class="bi bi-clock"></i> ${timeAgo(discussion.created_at)}</span>
                </div>
                <div class="vote-controls">
                    <button class="vote-btn${userVote === 'up' ? ' active' : ''}" onclick="voteDiscussion('${discussion.id}', 'up')" title="Upvote"><i class="bi bi-arrow-up"></i></button>
                    <span class="vote-count" id="discVoteCount">${discussion.vote_count || 0}</span>
                    <button class="vote-btn${userVote === 'down' ? ' active' : ''}" onclick="voteDiscussion('${discussion.id}', 'down')" title="Downvote"><i class="bi bi-arrow-down"></i></button>
                </div>
            </div>
        </div>
    `;

    renderComments(discussion);
    renderReplyBox(discussion);
    loadRelatedDiscussions(discussion.category_slug, discussion.id);
    loadRelatedContent(discussion);
}

function renderComments(discussion) {
    const section = document.getElementById('commentsSection');
    const comments = discussion.comments || [];
    const bestAnswer = comments.find(c => c.is_best_answer);
    const regularComments = comments.filter(c => !c.is_best_answer);
    const sorted = bestAnswer ? [bestAnswer, ...regularComments] : regularComments;

    let html = `<div class="comments-header"><h2 style="font-size:1.1rem;">${comments.length} ${comments.length === 1 ? 'Reply' : 'Replies'}</h2></div>`;

    if (!comments.length) {
        html += '<p style="color:var(--text-light);font-size:0.9rem;margin-bottom:1rem;">No replies yet. Be the first to respond!</p>';
    }

    html += sorted.map(c => {
        const videoHtml = c.video_url ? `<div style="margin-top:0.5rem;"><video controls style="max-width:100%;max-height:300px;border-radius:8px;"><source src="${escapeHtml(c.video_url)}" type="video/mp4"></video></div>` : '';
        return `
        <div class="comment-card${c.is_best_answer ? ' best-answer' : ''}">
            <div class="comment-avatar">${getAvatarHtml(c.author_avatar, c.author_name)}</div>
            <div class="comment-body">
                <div class="comment-meta">
                    <span class="author-name">${escapeHtml(c.author_name || 'Anonymous')}</span>
                    ${isExpertRole(c.author_role) ? '<span class="expert-badge">Expert</span>' : ''}
                    ${c.is_best_answer ? '<span class="best-answer-badge"><i class="bi bi-check-circle-fill"></i> Best Answer</span>' : ''}
                    <span>${timeAgo(c.created_at)}</span>
                </div>
                <div class="comment-content">${escapeHtml(c.content)}</div>
                ${videoHtml}
                <div class="comment-actions">
                    <button onclick="voteComment('${c.id}', 'up')" title="Helpful"><i class="bi bi-hand-thumbs-up"></i> Helpful (${c.vote_count || 0})</button>
                    ${discussion.author_id === (getCurrentUserId()) || ['ADMIN', 'SUPERADMIN'].includes((getCurrentUserRole() || '').toUpperCase()) ? `<button onclick="markBestAnswer('${discussion.id}', '${c.id}')" title="Mark as best answer"><i class="bi bi-check-circle"></i> Best Answer</button>` : ''}
                    ${c.author_id === getCurrentUserId() || ['ADMIN', 'SUPERADMIN', 'MODERATOR'].includes((getCurrentUserRole() || '').toUpperCase()) ? `<button onclick="deleteComment('${c.id}', '${discussion.id}')" title="Delete"><i class="bi bi-trash"></i></button>` : ''}
                </div>
            </div>
        </div>`;
    }).join('');

    section.innerHTML = html;
}

let replyVideoFile = null;

function renderReplyBox(discussion) {
    const section = document.getElementById('commentsSection');
    if (userLoggedIn()) {
        section.innerHTML += `
            <div class="reply-box">
                <h3 style="font-size:0.95rem;margin-bottom:0.75rem;">Write a Reply</h3>
                <textarea id="replyContent" placeholder="Share your thoughts or advice..."></textarea>
                <div style="display:flex;gap:0.5rem;align-items:center;margin-top:0.5rem;">
                    <label style="display:flex;align-items:center;gap:0.3rem;padding:0.3rem 0.6rem;border:1px solid var(--border-color);border-radius:var(--radius-sm);font-size:0.8rem;color:var(--text-light);cursor:pointer;">
                        <i class="bi bi-camera-video"></i> Add Video
                        <input type="file" accept="video/*" style="display:none;" onchange="handleReplyVideo(this)">
                    </label>
                    <span id="replyVideoName" style="font-size:0.78rem;color:var(--text-muted);"></span>
                </div>
                <div class="reply-box-footer">
                    <span style="font-size:0.8rem;color:var(--text-muted);">Be respectful and helpful</span>
                    <button class="btn btn-primary btn-sm" onclick="submitReply('${discussion.id}')">
                        <i class="bi bi-send"></i> Submit Reply
                    </button>
                </div>
            </div>
        `;
    } else {
        section.innerHTML += `
            <div class="reply-box login-prompt">
                <p><a href="#" onclick="openAuthModal('login');return false;">Sign in</a> to join the discussion and reply to this thread.</p>
            </div>
        `;
    }
}

function handleReplyVideo(input) {
    const file = input.files[0];
    if (!file) return;
    if (file.size > 50 * 1024 * 1024) { alert('Video must be under 50MB'); input.value = ''; return; }
    replyVideoFile = file;
    document.getElementById('replyVideoName').textContent = '📹 ' + file.name;
}

async function submitReply(discussionId) {
    const content = document.getElementById('replyContent').value.trim();
    if (!content && !replyVideoFile) return;
    try {
        const formData = new FormData();
        formData.append('content', content || '');
        if (replyVideoFile) formData.append('video', replyVideoFile);
        const token = localStorage.getItem('flower-token');
        const res = await fetch(`/api/discussions/${discussionId}/comments`, {
            method: 'POST',
            headers: token ? { 'Authorization': 'Bearer ' + token } : {},
            body: formData
        });
        if (!res.ok) throw new Error('Failed');
        window.location.reload();
    } catch (err) {
        alert('Failed to post reply. Please try again.');
    }
}

// ─── Related Content ───────────────────────────────────────────────────

async function loadRelatedContent(discussion) {
    // Load related courses and products in the detail page sidebar
    const relatedEl = document.getElementById('relatedContent');
    if (!relatedEl) return;

    const categorySlug = discussion.category_slug || '';
    let html = '';

    // Related courses
    try {
        const coursesRes = await fetch('/api/learning/courses?limit=2');
        const coursesData = await coursesRes.json();
        const courses = coursesData.courses || coursesData || [];
        if (courses.length) {
            html += `<div class="sidebar-card"><h3><i class="bi bi-mortarboard" style="color:var(--accent-blue)"></i> Related Courses</h3>`;
            html += courses.slice(0, 2).map(c => `
                <div style="padding:0.4rem 0;border-bottom:1px solid var(--border-light);">
                    <a href="course-detail.html?id=${c.id}" style="font-size:0.85rem;font-weight:500;color:var(--text-main);text-decoration:none;">${escapeHtml(c.title)}</a>
                    <div style="font-size:0.75rem;color:var(--text-muted);">${c.students_count || 0} students</div>
                </div>
            `).join('');
            html += `</div>`;
        }
    } catch {}

    // Related products
    try {
        const prodRes = await fetch('/api/products?limit=3');
        const prodData = await prodRes.json();
        const products = prodData.products || prodData || [];
        if (products.length) {
            html += `<div class="sidebar-card"><h3><i class="bi bi-bag" style="color:var(--accent-green)"></i> Related Products</h3>`;
            html += products.slice(0, 3).map(p => `
                <div style="display:flex;gap:0.5rem;padding:0.4rem 0;border-bottom:1px solid var(--border-light);">
                    ${p.image_url ? `<img src="${escapeHtml(p.image_url)}" style="width:40px;height:40px;border-radius:4px;object-fit:cover;" alt="">` : ''}
                    <div>
                        <a href="product-detail.html?id=${p.id}" style="font-size:0.82rem;font-weight:500;color:var(--text-main);text-decoration:none;">${escapeHtml(p.name)}</a>
                        <div style="font-size:0.75rem;color:var(--primary-color);font-weight:600;">GHS ${parseFloat(p.price || 0).toFixed(2)}</div>
                    </div>
                </div>
            `).join('');
            html += `</div>`;
        }
    } catch {}

    // Related articles
    try {
        const artRes = await fetch('/api/knowledge/flowers?limit=2');
        const artData = await artRes.json();
        const articles = artData.flowers || artData || [];
        if (articles.length) {
            html += `<div class="sidebar-card"><h3><i class="bi bi-newspaper" style="color:var(--accent-blue)"></i> Related Articles</h3>`;
            html += articles.slice(0, 2).map(a => `
                <div style="padding:0.4rem 0;border-bottom:1px solid var(--border-light);">
                    <a href="flower-knowledge.html?slug=${escapeHtml(a.slug || a.id)}" style="font-size:0.85rem;font-weight:500;color:var(--text-main);text-decoration:none;">${escapeHtml(a.name || a.title || '')}</a>
                </div>
            `).join('');
            html += `</div>`;
        }
    } catch {}

    if (html) relatedEl.innerHTML = html;
}

async function submitReply(discussionId) {
    const content = document.getElementById('replyContent').value.trim();
    if (!content) return;
    try {
        const res = await fetch(`/api/discussions/${discussionId}/comments`, {
            method: 'POST',
            headers: authHeaders(),
            body: JSON.stringify({ content })
        });
        if (!res.ok) throw new Error('Failed');
        window.location.reload();
    } catch (err) {
        alert('Failed to post reply. Please try again.');
    }
}

async function voteDiscussion(id, voteType) {
    if (!userLoggedIn()) { openAuthModal('login'); return; }
    try {
        const res = await fetch(`/api/discussions/${id}/vote`, {
            method: 'POST',
            headers: authHeaders(),
            body: JSON.stringify({ vote_type: voteType })
        });
        const data = await res.json();
        document.getElementById('discVoteCount').textContent = data.vote_count;
        document.querySelectorAll('.vote-controls .vote-btn').forEach(btn => btn.classList.remove('active'));
    } catch (err) { handleError(err, 'Failed to vote'); }
}

async function voteComment(commentId, voteType) {
    if (!userLoggedIn()) { openAuthModal('login'); return; }
    try {
        await fetch(`/api/discussions/comments/${commentId}/vote`, {
            method: 'POST',
            headers: authHeaders(),
            body: JSON.stringify({ vote_type: voteType })
        });
    } catch (err) { handleError(err, 'Failed to vote on comment'); }
}

async function markBestAnswer(discussionId, commentId) {
    if (!confirm('Mark this as the best answer?')) return;
    try {
        await fetch(`/api/discussions/${discussionId}`, {
            method: 'PUT',
            headers: authHeaders(),
            body: JSON.stringify({ best_answer_id: commentId })
        });
        window.location.reload();
    } catch (err) { handleError(err, 'Failed to mark best answer'); }
}

async function deleteComment(commentId, discussionId) {
    if (!confirm('Delete this comment?')) return;
    try {
        await fetch(`/api/discussions/comments/${commentId}`, {
            method: 'DELETE',
            headers: authHeaders()
        });
        window.location.reload();
    } catch (err) { handleError(err, 'Failed to delete comment'); }
}

async function loadRelatedDiscussions(categorySlug, currentId) {
    if (!categorySlug) return;
    try {
        const res = await fetch(`/api/discussions?category=${categorySlug}&limit=5`);
        const data = await res.json();
        const related = (data.discussions || []).filter(d => d.id !== currentId).slice(0, 5);
        const el = document.getElementById('relatedList');
        if (!related.length) {
            document.getElementById('relatedDiscussions').style.display = 'none';
            return;
        }
        el.innerHTML = related.map(d => `
            <li><a href="discussion-detail.html?id=${escapeHtml(String(d.id))}">${escapeHtml(d.title)}</a></li>
        `).join('');
    } catch {}
}

// ─── Create Discussion Page ────────────────────────────────────────────

let uploadedFiles = [];

async function initCreateDiscussion() {
    if (!userLoggedIn()) {
        openAuthModal('login');
        return;
    }

    const categorySelect = document.getElementById('discCategory');
    try {
        const res = await fetch('/api/discussions/categories');
        const categories = await res.json();
        categories.forEach(c => {
            const opt = document.createElement('option');
            opt.value = c.id;
            opt.textContent = c.name;
            categorySelect.appendChild(opt);
        });
    } catch {}

    document.getElementById('discTitle').addEventListener('input', (e) => {
        document.getElementById('titleCount').textContent = e.target.value.length;
    });

    setupCategorySuggestion();

    const uploadArea = document.getElementById('uploadArea');
    const fileInput = document.getElementById('fileInput');

    uploadArea.addEventListener('click', () => fileInput.click());
    uploadArea.addEventListener('dragover', (e) => { e.preventDefault(); uploadArea.classList.add('dragover'); });
    uploadArea.addEventListener('dragleave', () => uploadArea.classList.remove('dragover'));
    uploadArea.addEventListener('drop', (e) => {
        e.preventDefault();
        uploadArea.classList.remove('dragover');
        handleFiles(e.dataTransfer.files);
    });

    fileInput.addEventListener('change', (e) => handleFiles(e.target.files));

    document.getElementById('createDiscussionForm').addEventListener('submit', async (e) => {
        e.preventDefault();
        const title = document.getElementById('discTitle').value.trim();
        const category_id = document.getElementById('discCategory').value;
        const content = document.getElementById('discContent').value.trim();
        const errorMsg = document.getElementById('errorMsg');
        const successMsg = document.getElementById('successMsg');
        const submitBtn = document.getElementById('submitBtn');

        errorMsg.style.display = 'none';
        successMsg.style.display = 'none';

        if (!title || !content) {
            errorMsg.textContent = 'Title and content are required';
            errorMsg.style.display = 'block';
            return;
        }

        submitBtn.disabled = true;
        submitBtn.innerHTML = '<span class="auth-spinner" style="margin-right:0.5rem;"></span> Posting...';

        const formData = new FormData();
        formData.append('title', title);
        formData.append('content', content);
        if (category_id) formData.append('category_id', category_id);
        uploadedFiles.forEach(f => formData.append('images', f));

        try {
            const token = localStorage.getItem('flower-token');
            const res = await fetch('/api/discussions', {
                method: 'POST',
                headers: token ? { 'Authorization': 'Bearer ' + token } : {},
                body: formData
            });
            if (!res.ok) {
                const err = await res.json();
                throw new Error(err.error || 'Failed');
            }
            const data = await res.json();
            window.location.href = `discussion-detail.html?id=${data.id}`;
        } catch (err) {
            errorMsg.textContent = err.message || 'Failed to create discussion';
            errorMsg.style.display = 'block';
            submitBtn.disabled = false;
            submitBtn.innerHTML = '<i class="bi bi-send"></i> Post Discussion';
        }
    });
}

function handleFiles(files) {
    const grid = document.getElementById('previewGrid');
    Array.from(files).forEach(file => {
        if (file.size > 5 * 1024 * 1024) return;
        if (!file.type.startsWith('image/')) return;
        if (uploadedFiles.length >= 5) return;
        uploadedFiles.push(file);
        const reader = new FileReader();
        reader.onload = (e) => {
            const idx = uploadedFiles.length - 1;
            const div = document.createElement('div');
            div.className = 'preview-item';
            div.innerHTML = `<img src="${e.target.result}" alt="Preview"><button class="preview-remove" onclick="removeFile(${idx}, this)"><i class="bi bi-x"></i></button>`;
            grid.appendChild(div);
        };
        reader.readAsDataURL(file);
    });
}

function removeFile(idx, btn) {
    uploadedFiles.splice(idx, 1);
    btn.parentElement.remove();
}

// ─── AI Category Suggestion ──────────────────────────────────────────

const CATEGORY_KEYWORDS = {
    'flower-care': ['watering', 'preservation', 'maintenance', 'wilt', 'droop', 'pruning', 'fertilizer', 'feed', 'nutrient', 'water', 'soil', 'pot', 'repot'],
    'flower-farming': ['farm', 'farming', 'harvest', 'irrigation', 'crop', 'field', 'greenhouse', 'commercial', 'yield', 'acre', 'planting', 'seed'],
    'floristry': ['arrangement', 'bouquet', 'centerpiece', 'design', 'floral', 'wreath', 'corsage', 'vase', 'wrapping', 'ribbon'],
    'gardening': ['garden', 'landscap', 'lawn', 'perennial', 'annual', 'shrub', 'compost', 'mulch', 'bed', 'border'],
    'pests-diseases': ['pest', 'disease', 'fungus', 'mold', 'mildew', 'aphid', 'bug', 'infest', 'rot', 'blight', 'spot', 'yellow', 'brown'],
    'flower-business': ['pricing', 'market', 'customer', 'sell', 'profit', 'cost', 'revenue', 'business', 'shop', 'store', 'client', 'invoice'],
    'delivery-logistics': ['delivery', 'ship', 'packaging', 'transport', 'logistic', 'courier', 'freight', 'shipping', 'box'],
    'learning-support': ['course', 'assignment', 'workshop', 'class', 'tutorial', 'lesson', 'quiz', 'certificate', 'learn', 'study', 'exam'],
    'beginner-questions': ['beginner', 'start', 'new', 'first time', 'help', 'basic', 'simple', 'easy', 'introduction', 'tips for']
};

let suggestionTimeout = null;

function setupCategorySuggestion() {
    const titleInput = document.getElementById('discTitle');
    if (!titleInput) return;
    titleInput.addEventListener('input', () => {
        clearTimeout(suggestionTimeout);
        suggestionTimeout = setTimeout(() => suggestCategory(titleInput.value), 400);
    });
}

function suggestCategory(title) {
    const lower = title.toLowerCase();
    if (!lower) return;
    let bestCat = null, bestScore = 0;
    for (const [slug, keywords] of Object.entries(CATEGORY_KEYWORDS)) {
        const score = keywords.reduce((s, kw) => s + (lower.includes(kw) ? 1 : 0), 0);
        const weight = score / keywords.length;
        if (weight > bestScore) { bestScore = weight; bestCat = slug; }
    }
    if (bestCat && bestScore > 0.02) {
        const select = document.getElementById('discCategory');
        if (!select) return;
        const cat = CATEGORIES.find(c => c.slug === bestCat);
        if (!cat) return;
        const existingHint = document.getElementById('categoryHint');
        if (existingHint) existingHint.remove();
        const hint = document.createElement('div');
        hint.id = 'categoryHint';
        hint.style.cssText = 'margin-top:0.3rem;font-size:0.8rem;color:var(--accent-green);display:flex;align-items:center;gap:0.3rem;animation:fadeIn 0.3s;';
        hint.innerHTML = `<i class="bi bi-lightbulb" style="color:#f59e0b;"></i> Suggested category: <strong><i class="bi ${cat.icon}"></i> ${cat.name}</strong> <button onclick="applySuggestedCategory('${bestCat}')" style="background:var(--accent-green);color:white;border:none;border-radius:4px;padding:0.15rem 0.5rem;font-size:0.7rem;cursor:pointer;margin-left:0.25rem;">Apply</button>`;
        select.parentElement.appendChild(hint);
    }
}

function applySuggestedCategory(slug) {
    const select = document.getElementById('discCategory');
    if (!select) return;
    const idx = CATEGORIES.findIndex(c => c.slug === slug);
    if (idx >= 0 && select.options[idx + 1]) {
        select.selectedIndex = idx + 1;
        const hint = document.getElementById('categoryHint');
        if (hint) hint.remove();
    }
}


