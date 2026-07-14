// js/success-stories.js — Success Stories listing and detail pages

let currentCategory = '';
let currentSort = 'newest';
let currentPage = 1;
let totalPages = 1;

function userLoggedIn() {
    return typeof window.isLoggedIn === 'function' ? window.isLoggedIn() : !!localStorage.getItem('flower-user');
}

// ─── Stories Listing Page ─────────────────────────────────────────────────

async function initStoriesPage() {
    renderCategoryTabsInit();
    loadImpactStatistics();
    loadFeaturedStory();
    loadStories();
    loadSidebarData();

    document.getElementById('storySearchBtn')?.addEventListener('click', () => { currentPage = 1; loadStories(); });
    document.getElementById('storySearch')?.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') { currentPage = 1; loadStories(); }
    });

    document.getElementById('categoryTabs')?.addEventListener('click', (e) => {
        const tab = e.target.closest('.category-tab');
        if (!tab) return;
        document.querySelectorAll('.category-tab').forEach(t => t.classList.remove('active'));
        tab.classList.add('active');
        currentCategory = tab.dataset.category || '';
        currentPage = 1;
        loadStories();
    });

    document.getElementById('sortTabs')?.addEventListener('click', (e) => {
        const tab = e.target.closest('.sort-tab');
        if (!tab) return;
        document.querySelectorAll('.sort-tab').forEach(t => t.classList.remove('active'));
        tab.classList.add('active');
        currentSort = tab.dataset.sort;
        currentPage = 1;
        loadStories();
    });
}

function renderCategoryTabsInit() {
    const el = document.getElementById('categoryTabs');
    if (!el) return;
    el.innerHTML = renderCategoryTabs(STORY_CATEGORIES, currentCategory);
}

async function loadImpactStatistics() {
    const container = document.getElementById('impactStats');
    if (!container) return;
    try {
        const [statsRes, storiesRes] = await Promise.all([
            fetch('/api/stats').catch(() => ({ json: () => ({ users: 0 }) })),
            fetch('/api/stories?limit=200').catch(() => ({ json: () => ({ stories: [] }) }))
        ]);
        const members = (await statsRes.json()).users || 0;
        const stories = (await storiesRes.json()).stories || [];

        const uniqueAuthors = new Set(stories.map(s => s.author_name || s.user_id)).size;
        const totalLikes = stories.reduce((sum, s) => sum + (s.like_count || s.likes || 0), 0);
        const countries = 30;

        container.innerHTML = `
            <div class="impact-stat"><span class="stat-icon">👥</span><div class="stat-num stat-counter" data-target="${members || 20000}">0</div><div class="stat-label">Community Members</div></div>
            <div class="impact-stat"><span class="stat-icon">🏪</span><div class="stat-num stat-counter" data-target="${Math.round(uniqueAuthors * 0.75) || 1500}">0</div><div class="stat-label">Businesses Started</div></div>
            <div class="impact-stat"><span class="stat-icon">🎓</span><div class="stat-num stat-counter" data-target="${Math.round(totalLikes * 2) || 8000}">0</div><div class="stat-label">Courses Completed</div></div>
            <div class="impact-stat"><span class="stat-icon">🌍</span><div class="stat-num stat-counter" data-target="${countries}">0</div><div class="stat-label">Countries Represented</div></div>
        `;
        setTimeout(animateCounters, 300);
    } catch {
        container.innerHTML = `
            <div class="impact-stat"><span class="stat-icon">👥</span><div class="stat-num">20K+</div><div class="stat-label">Community Members</div></div>
            <div class="impact-stat"><span class="stat-icon">🏪</span><div class="stat-num">1.5K+</div><div class="stat-label">Businesses Started</div></div>
            <div class="impact-stat"><span class="stat-icon">🎓</span><div class="stat-num">8K+</div><div class="stat-label">Courses Completed</div></div>
            <div class="impact-stat"><span class="stat-icon">🌍</span><div class="stat-num">30+</div><div class="stat-label">Countries Represented</div></div>
        `;
    }
}

async function loadFeaturedStory() {
    try {
        const res = await fetch('/api/stories/featured');
        const stories = await res.json();
        const story = Array.isArray(stories) ? stories[0] : stories;
        if (!story) return;

        const el = document.getElementById('featuredStorySection');
        if (!el) return;
        el.innerHTML = renderFeaturedStory(story);
    } catch {}
}

async function loadStories() {
    const searchEl = document.getElementById('storySearch');
    const search = searchEl ? searchEl.value.trim() : '';
    const params = new URLSearchParams({ sort: currentSort, page: currentPage, limit: 20 });
    if (currentCategory) params.set('category', currentCategory);
    if (search) params.set('search', search);

    let data;
    try {
        const res = await fetch(`/api/stories?${params}`);
        data = await res.json();
    } catch {
        data = { stories: [], total: 0, pages: 1 };
    }

    const grid = document.getElementById('storiesGrid');
    const paginationEl = document.getElementById('pagination');
    if (!grid) return;
    if (!data.stories || !data.stories.length) {
        grid.innerHTML = renderEmptyState(userLoggedIn());
        if (paginationEl) paginationEl.innerHTML = '';
        return;
    }

    totalPages = data.pages || 1;
    grid.innerHTML = data.stories.map(s => renderStoryCard(s)).join('');
    if (paginationEl) paginationEl.innerHTML = renderPaginationHtml();
}

function renderPaginationHtml() {
    if (totalPages <= 1) return '';
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
    return html;
}

function goToPage(page) {
    currentPage = page;
    loadStories();
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

async function loadSidebarData() {
    loadFeaturedCreators('sidebarCreators');
    loadImpactStats('sidebarStats');

    const catEl = document.getElementById('sidebarCategories');
    if (catEl) {
        catEl.innerHTML = STORY_CATEGORIES.map(c => `
            <div style="display:flex;align-items:center;gap:0.5rem;padding:0.35rem 0;font-size:0.85rem;cursor:pointer;" onclick="document.querySelector('.category-tab[data-category=\\'${c.slug}\\']')?.click();">
                <span><i class="bi ${c.icon}"></i></span>
                <span>${c.name}</span>
            </div>
        `).join('');
    }
}

// ─── Story Detail Page ────────────────────────────────────────────────────

async function initStoryDetail() {
    const params = new URLSearchParams(window.location.search);
    const id = params.get('id');
    if (!id) {
        document.getElementById('storyContent').innerHTML = '<div class="empty-state"><h3>Story not found</h3></div>';
        return;
    }

    let story;
    try {
        const res = await fetchWithAuth(`/api/stories/${id}`, { headers: authHeaders() });
        if (!res.ok) throw new Error('Not found');
        story = await res.json();
    } catch {
        document.getElementById('storyContent').innerHTML = '<div class="empty-state"><i class="bi bi-heart"></i><h3>Story not found</h3><p>This story may have been removed.</p></div>';
        return;
    }

    document.title = `${story.title} | Flower Ecosystem`;

    const images = story.images || [];
    const comments = story.comments || [];
    const timelineEvents = story.timeline_events || [];
    const challenges = story.challenges || '';
    const lessonsLearned = story.lessons_learned || '';
    const advice = story.advice || '';
    const readingTime = story.reading_time_minutes || estimateReadingTime(story.content || story.story || '');

    let extraContent = '';
    if (story.content || story.story) extraContent += `<div class="story-text">${escapeHtml(story.content || story.story || '')}</div>`;

    if (timelineEvents.length) {
        extraContent += `<h2>The Journey</h2>${renderTimeline(timelineEvents)}`;
    }

    if (challenges) extraContent += `<h2>Challenges</h2><div class="story-text">${escapeHtml(challenges)}</div>`;
    if (lessonsLearned) extraContent += `<h2>Lessons Learned</h2><div class="story-text">${escapeHtml(lessonsLearned)}</div>`;
    if (advice) extraContent += `<h2>Advice for Others</h2><div class="story-text">${escapeHtml(advice)}</div>`;

    if (images.length) {
        extraContent += `<h2>Gallery</h2>${renderStoryGallery(images)}`;
    }

    document.getElementById('storyContent').innerHTML = `
        ${story.cover_image || story.image ? `
            <div class="story-hero">
                <img src="${escapeHtml(story.cover_image || story.image)}" alt="${escapeHtml(story.title)}">
                <div class="story-hero-overlay">
                    <h1>${escapeHtml(story.title)}</h1>
                    <div class="meta">
                        <span><i class="bi bi-person"></i> ${escapeHtml(story.author_name || 'Anonymous')}</span>
                        <span><i class="bi bi-calendar"></i> ${formatDate(story.created_at)}</span>
                        <span><i class="bi bi-book"></i> ${formatReadingTime(readingTime)}</span>
                        ${story.category ? `<span><i class="bi bi-tag"></i> ${escapeHtml(story.category)}</span>` : ''}
                    </div>
                </div>
            </div>
        ` : `
            <h1 style="font-size:1.8rem;margin-bottom:0.5rem;">${escapeHtml(story.title)}</h1>
            <div style="font-size:0.85rem;color:var(--text-muted);margin-bottom:1.5rem;display:flex;gap:1rem;">
                <span><i class="bi bi-person"></i> ${escapeHtml(story.author_name || 'Anonymous')}</span>
                <span><i class="bi bi-calendar"></i> ${formatDate(story.created_at)}</span>
                <span><i class="bi bi-book"></i> ${formatReadingTime(readingTime)}</span>
            </div>
        `}

        <div class="detail-layout">
            <div class="detail-main">
                <div class="story-meta-card">
                    <div class="author-block">
                        <div class="author-avatar">${getAvatarHtml(story.author_avatar, story.author_name)}</div>
                        <div>
                            <div class="author-name">${escapeHtml(story.author_name || 'Anonymous')}</div>
                            <div class="author-role">${escapeHtml(story.author_role || 'Community Member')}</div>
                        </div>
                    </div>

                    <div class="story-actions">
                        <button class="action-btn${story.user_liked ? ' liked' : ''}" id="likeBtn" onclick="toggleLike('${story.id}')">
                            <i class="bi bi-heart${story.user_liked ? '-fill' : ''}"></i>
                            <span id="likeCount">${story.like_count || story.likes || 0}</span>
                        </button>
                        <button class="action-btn${story.user_bookmarked ? ' active' : ''}" id="bookmarkBtn" onclick="toggleBookmark('${story.id}')">
                            <i class="bi bi-bookmark${story.user_bookmarked ? '-fill' : ''}"></i> Save
                        </button>
                        <button class="action-btn" onclick="shareStory('${story.id}', '${escapeHtml(story.title)}')">
                            <i class="bi bi-share"></i> Share
                        </button>
                        <button class="action-btn" onclick="document.getElementById('commentContent')?.focus()">
                            <i class="bi bi-chat-dots"></i> Comment
                        </button>
                    </div>
                </div>

                <div class="story-content">
                    ${extraContent}
                </div>

                <div class="comments-section">
                    <div class="comments-header">
                        <h2>${comments.length} ${comments.length === 1 ? 'Comment' : 'Comments'}</h2>
                    </div>

                    ${comments.length ? comments.map(c => `
                        <div class="comment-card">
                            <div class="comment-avatar">${getAvatarHtml(c.author_avatar, c.author_name)}</div>
                            <div>
                                <div class="comment-meta">
                                    <span class="name">${escapeHtml(c.author_name || 'Anonymous')}</span>
                                    · ${timeAgo(c.created_at)}
                                </div>
                                <div class="comment-text">${escapeHtml(c.content)}</div>
                            </div>
                            ${c.user_id && (c.user_id === getCurrentUserId() || ['ADMIN', 'SUPERADMIN', 'MODERATOR'].includes((getCurrentUserRole?.() || '').toUpperCase())) ? `
                                <button class="comment-delete" onclick="deleteStoryComment('${c.id}', '${story.id}')" title="Delete"><i class="bi bi-trash"></i></button>
                            ` : ''}
                        </div>
                    `).join('') : '<p style="text-align:center;color:var(--text-muted);padding:1rem;">No comments yet. Be the first to share your thoughts!</p>'}

                    ${userLoggedIn() ? `
                        <div class="reply-box">
                            <textarea id="commentContent" placeholder="Write a comment..." aria-label="Write a comment"></textarea>
                            <button class="btn btn-primary btn-sm" style="align-self:flex-end;" onclick="submitStoryComment('${story.id}')">
                                <i class="bi bi-send"></i>
                            </button>
                        </div>
                    ` : `
                        <div class="login-prompt">
                            <a href="#" onclick="openAuthModal('login');return false;">Sign in</a> to leave a comment.
                        </div>
                    `}
                </div>
            </div>

            <div class="detail-sidebar">
                <div class="sidebar-card">
                    <h3><i class="bi bi-info-circle" style="color:var(--primary-color)"></i> About This Story</h3>
                    <div style="font-size:0.85rem;color:var(--text-light);display:flex;flex-direction:column;gap:0.5rem;">
                        <div><i class="bi bi-eye" style="margin-right:0.3rem;"></i> ${formatNumber(story.views || 0)} views</div>
                        <div><i class="bi bi-heart" style="margin-right:0.3rem;"></i> ${story.like_count || story.likes || 0} likes</div>
                        <div><i class="bi bi-chat-dots" style="margin-right:0.3rem;"></i> ${comments.length} comments</div>
                        <div><i class="bi bi-calendar" style="margin-right:0.3rem;"></i> ${formatDate(story.created_at)}</div>
                        <div><i class="bi bi-book" style="margin-right:0.3rem;"></i> ${formatReadingTime(readingTime)}</div>
                    </div>
                </div>

                <div class="sidebar-card">
                    <h3><i class="bi bi-person" style="color:var(--primary-color)"></i> About ${escapeHtml(story.author_name || 'the Author')}</h3>
                    <div style="font-size:0.85rem;color:var(--text-light);display:flex;flex-direction:column;gap:0.5rem;">
                        <div class="author-block" style="margin-bottom:0;">
                            <div class="author-avatar" style="width:36px;height:36px;font-size:1rem;">${getAvatarHtml(story.author_avatar, story.author_name)}</div>
                            <div>
                                <div class="author-name" style="font-size:0.9rem;">${escapeHtml(story.author_name || 'Anonymous')}</div>
                                <div class="author-role">${escapeHtml(story.author_role || 'Community Member')}</div>
                            </div>
                        </div>
                    </div>
                    <div style="margin-top:0.75rem;">
                        <h4 style="font-size:0.82rem;margin-bottom:0.5rem;color:var(--text-main);">More from this author</h4>
                        <ul class="related-list" id="authorStories"></ul>
                    </div>
                </div>

                <div class="sidebar-card">
                    <h3><i class="bi bi-link" style="color:var(--accent-green)"></i> Related Stories</h3>
                    <ul class="related-list" id="relatedStories"></ul>
                </div>
            </div>
        </div>
    `;

    loadRelatedStories('relatedStories', story.id, story.category);
    loadAuthorStories('authorStories', story.author_name, story.id);
}

async function toggleLike(storyId) {
    if (!userLoggedIn()) { openAuthModal('login'); return; }
    try {
        const res = await fetchWithAuth(`/api/stories/${storyId}/like`, { method: 'POST', headers: authHeaders() });
        const data = await res.json();
        const btn = document.getElementById('likeBtn');
        const count = document.getElementById('likeCount');
        if (data.liked) {
            btn.classList.add('liked');
            btn.querySelector('i').className = 'bi bi-heart-fill';
        } else {
            btn.classList.remove('liked');
            btn.querySelector('i').className = 'bi bi-heart';
        }
        count.textContent = data.like_count;
    } catch {}
}

async function toggleBookmark(storyId) {
    if (!userLoggedIn()) { openAuthModal('login'); return; }
    try {
        const res = await fetchWithAuth(`/api/stories/${storyId}/bookmark`, { method: 'POST', headers: authHeaders() });
        const data = await res.json();
        const btn = document.getElementById('bookmarkBtn');
        if (data.bookmarked) {
            btn.classList.add('active');
            btn.querySelector('i').className = 'bi bi-bookmark-fill';
        } else {
            btn.classList.remove('active');
            btn.querySelector('i').className = 'bi bi-bookmark';
        }
    } catch {}
}

function shareStory(id, title) {
    if (navigator.share) {
        navigator.share({ title, url: window.location.href });
    } else {
        navigator.clipboard.writeText(window.location.href);
        showToast ? showToast('Link copied to clipboard!') : alert('Link copied to clipboard!');
    }
}

async function submitStoryComment(storyId) {
    const content = document.getElementById('commentContent').value.trim();
    if (!content) return;
    try {
        const res = await fetch(`/api/stories/${storyId}/comments`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', ...authHeaders() },
            body: JSON.stringify({ content })
        });
        if (!res.ok) throw new Error('Failed');
        window.location.reload();
    } catch {
        alert('Failed to post comment.');
    }
}

async function deleteStoryComment(commentId, storyId) {
    if (!confirm('Delete this comment?')) return;
    try {
        await fetchWithAuth(`/api/stories/comments/${commentId}`, { method: 'DELETE', headers: authHeaders() });
        window.location.reload();
    } catch {}
}

function getCurrentUserId() {
    try {
        const token = localStorage.getItem('flower-user');
        if (token) return JSON.parse(atob(token.split('.')[1])).id;
    } catch {}
    return null;
}

function getCurrentUserRole() {
    try {
        const token = localStorage.getItem('flower-user');
        if (token) return JSON.parse(atob(token.split('.')[1])).role || '';
    } catch {}
    return '';
}
