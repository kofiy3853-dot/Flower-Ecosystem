// js/success-stories.js
// Success Stories pages — listing, detail

let currentCategory = '';
let currentSort = 'newest';
let currentPage = 1;
let totalPages = 1;

function userLoggedIn() {
    return typeof window.isLoggedIn === 'function' ? window.isLoggedIn() : !!localStorage.getItem('flower-token');
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

// ─── Stories Listing Page ─────────────────────────────────────────────────

async function initStoriesPage() {
    if (!userLoggedIn()) {
        const shareBtn = document.querySelector('a[href="create-story.html"]');
        if (shareBtn) shareBtn.style.display = 'none';
    }

    loadFeaturedStories();
    loadStories();

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

async function loadFeaturedStories() {
    try {
        const res = await fetch('/api/stories/featured');
        const stories = await res.json();
        if (!stories.length) return;

        const featuredEl = document.getElementById('featuredSection');
        if (!featuredEl) return;
        featuredEl.innerHTML = `
            <div class="featured-stories reveal-up">
                ${stories.slice(0, 3).map(s => `
                    <div class="featured-card" onclick="window.location.href='success-story-detail.html?id=${escapeHtml(String(s.id))}'">
                        <img loading="lazy" src="${escapeHtml(s.cover_image || s.image || 'https://images.unsplash.com/photo-1490750967868-88df5691a78b?q=80&w=800&auto=format&fit=crop')}" alt="${escapeHtml(s.title)}">
                        <div class="featured-overlay">
                            <h3>${escapeHtml(s.title)}</h3>
                            <div class="author">${escapeHtml(s.author_name || 'Anonymous')} · ${escapeHtml(s.author_role || 'Community Member')}</div>
                        </div>
                    </div>
                `).join('')}
            </div>
        `;
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
    if (!grid) return;
    if (!data.stories || !data.stories.length) {
        grid.innerHTML = '<div class="empty-state"><i class="bi bi-heart"></i><h3>No stories found</h3><p>Be the first to share your success story!</p></div>';
        document.getElementById('pagination').innerHTML = '';
        return;
    }

    totalPages = data.pages || 1;

    grid.innerHTML = data.stories.map(s => `
        <div class="story-card" onclick="window.location.href='success-story-detail.html?id=${escapeHtml(String(s.id))}'">
            <div class="story-img">
                <img loading="lazy" src="${escapeHtml(s.cover_image || s.image || s.thumbnail || 'https://images.unsplash.com/photo-1490750967868-88df5691a78b?q=80&w=600&auto=format&fit=crop')}" alt="${escapeHtml(s.title)}">
            </div>
            <div class="story-body">
                ${s.category ? `<span class="story-category">${escapeHtml(s.category)}</span>` : ''}
                <h3>${escapeHtml(s.title)}</h3>
                <div class="story-author">
                    <div class="story-avatar">${getAvatarHtml(s.author_avatar, s.author_name)}</div>
                    <div class="story-author-info">
                        <div class="story-author-name">${escapeHtml(s.author_name || 'Anonymous')}</div>
                        <div class="story-author-role">${escapeHtml(s.author_role || 'Community Member')}</div>
                    </div>
                </div>
                <div class="story-excerpt">${escapeHtml((s.content || s.story || '').slice(0, 150))}${(s.content || s.story || '').length > 150 ? '...' : ''}</div>
                <div class="story-footer">
                    <span><i class="bi bi-heart"></i> ${formatNumber(s.like_count || s.likes || 0)}</span>
                    <span><i class="bi bi-chat-dots"></i> ${s.comment_count || s.comments || 0}</span>
                    <span><i class="bi bi-eye"></i> ${formatNumber(s.views || 0)}</span>
                </div>
            </div>
        </div>
    `).join('');

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
    loadStories();
    window.scrollTo({ top: 0, behavior: 'smooth' });
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
        const res = await fetch(`/api/stories/${id}`, { headers: authHeaders() });
        if (!res.ok) throw new Error('Not found');
        story = await res.json();
    } catch {
        document.getElementById('storyContent').innerHTML = '<div class="empty-state"><i class="bi bi-heart"></i><h3>Story not found</h3><p>This story may have been removed.</p></div>';
        return;
    }

    document.title = `${story.title} | Flower Ecosystem`;

    const images = story.images || [];
    const comments = story.comments || [];

    document.getElementById('storyContent').innerHTML = `
        ${story.cover_image || story.image ? `
            <div class="story-hero">
                <img src="${escapeHtml(story.cover_image || story.image)}" alt="${escapeHtml(story.title)}">
                <div class="story-hero-overlay">
                    <h1>${escapeHtml(story.title)}</h1>
                </div>
            </div>
        ` : `
            <h1 style="font-size:1.8rem;margin-bottom:1.5rem;">${escapeHtml(story.title)}</h1>
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
                    ${story.category ? `<span class="story-category" style="font-size:0.75rem;">${escapeHtml(story.category)}</span>` : ''}
                    <span style="font-size:0.8rem;color:var(--text-muted);margin-left:0.5rem;">${timeAgo(story.created_at)}</span>

                    <div class="story-actions">
                        <button class="action-btn${story.user_liked ? ' liked' : ''}" id="likeBtn" onclick="toggleLike('${story.id}')">
                            <i class="bi bi-heart${story.user_liked ? '-fill' : ''}"></i>
                            <span id="likeCount">${story.like_count || story.likes || 0}</span> Likes
                        </button>
                        <button class="action-btn${story.user_bookmarked ? ' active' : ''}" id="bookmarkBtn" onclick="toggleBookmark('${story.id}')">
                            <i class="bi bi-bookmark${story.user_bookmarked ? '-fill' : ''}"></i> Save
                        </button>
                        <button class="action-btn" onclick="shareStory('${story.id}', '${escapeHtml(story.title)}')">
                            <i class="bi bi-share"></i> Share
                        </button>
                    </div>
                </div>

                <div class="story-content">
                    <div class="story-text">${escapeHtml(story.content || story.story || '')}</div>
                    ${images.length ? `
                        <div class="story-images">
                            ${images.map(img => `<img src="${escapeHtml(img.image_url)}" alt="${escapeHtml(img.caption || '')}" loading="lazy">`).join('')}
                        </div>
                    ` : ''}
                </div>

                <div class="comments-section">
                    <div class="comments-header">
                        <h2 style="font-size:1.1rem;">${comments.length} ${comments.length === 1 ? 'Comment' : 'Comments'}</h2>
                    </div>

                    ${comments.map(c => `
                        <div class="comment-card">
                            <div class="comment-avatar">${getAvatarHtml(c.author_avatar, c.author_name)}</div>
                            <div>
                                <div class="comment-meta">
                                    <span class="name">${escapeHtml(c.author_name || 'Anonymous')}</span>
                                    · ${timeAgo(c.created_at)}
                                </div>
                                <div class="comment-text">${escapeHtml(c.content)}</div>
                            </div>
                            ${c.user_id === getCurrentUserId() || ['ADMIN', 'SUPERADMIN', 'MODERATOR'].includes((getCurrentUserRole() || '').toUpperCase()) ? `
                                <button class="comment-delete" onclick="deleteStoryComment('${c.id}', '${story.id}')" title="Delete"><i class="bi bi-trash"></i></button>
                            ` : ''}
                        </div>
                    `).join('')}

                    ${userLoggedIn() ? `
                        <div class="reply-box">
                            <textarea id="commentContent" placeholder="Write a comment..."></textarea>
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
                        <div><i class="bi bi-calendar" style="margin-right:0.3rem;"></i> ${timeAgo(story.created_at)}</div>
                    </div>
                </div>
            </div>
        </div>
    `;
}

async function toggleLike(storyId) {
    if (!userLoggedIn()) { openAuthModal('login'); return; }
    try {
        const res = await fetch(`/api/stories/${storyId}/like`, { method: 'POST', headers: authHeaders() });
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
        const res = await fetch(`/api/stories/${storyId}/bookmark`, { method: 'POST', headers: authHeaders() });
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
        alert('Link copied to clipboard!');
    }
}

async function submitStoryComment(storyId) {
    const content = document.getElementById('commentContent').value.trim();
    if (!content) return;
    try {
        const res = await fetch(`/api/stories/${storyId}/comments`, {
            method: 'POST',
            headers: authHeaders(),
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
        await fetch(`/api/stories/comments/${commentId}`, { method: 'DELETE', headers: authHeaders() });
        window.location.reload();
    } catch {}
}
