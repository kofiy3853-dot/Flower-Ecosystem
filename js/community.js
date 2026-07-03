// js/community.js — Community Landing Page
// ────────────────────────────────────────────────────────────────

const GALLERY_PLACEHOLDERS = [
    { url: 'https://images.unsplash.com/photo-1548094990-c16ca90f1f0d?q=80&w=400&auto=format&fit=crop', author: 'Maria', aspect: 1.2 },
    { url: 'https://images.unsplash.com/photo-1490750967868-88df5691a78b?q=80&w=400&auto=format&fit=crop', author: 'James', aspect: 0.75 },
    { url: 'https://images.unsplash.com/photo-1526045612212-70caf35c14df?q=80&w=400&auto=format&fit=crop', author: 'Priya', aspect: 1.1 },
    { url: 'https://images.unsplash.com/photo-1470509037662-253afb3100f9?q=80&w=400&auto=format&fit=crop', author: 'Chen', aspect: 0.8 },
    { url: 'https://images.unsplash.com/photo-1494972308805-463bc619d34d?q=80&w=400&auto=format&fit=crop', author: 'Emma', aspect: 1.3 },
    { url: 'https://images.unsplash.com/photo-1471899236350-e3016bf1e69e?q=80&w=400&auto=format&fit=crop', author: 'Liam', aspect: 1.0 },
    { url: 'https://images.unsplash.com/photo-1468327768560-75b778cbb551?q=80&w=400&auto=format&fit=crop', author: 'Rosa', aspect: 0.9 },
    { url: 'https://images.unsplash.com/photo-1490750967868-88df5691a78b?q=80&w=400&auto=format&fit=crop', author: 'Ana', aspect: 1.15 }
];

// ─── Initialization ────────────────────────────────────────────

document.addEventListener('DOMContentLoaded', async () => {
    await Promise.all([
        loadStats(),
        loadTrendingDiscussions(),
        loadClubs(),
        loadEvents(),
        loadFeaturedMembers(),
        loadGallery(),
        loadRecentPosts()
    ]);
});

// ─── Utility ───────────────────────────────────────────────────

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

function getInitial(name) {
    return (name || '?').charAt(0).toUpperCase();
}

// ─── Stats ─────────────────────────────────────────────────────

async function loadStats() {
    try {
        const res = await fetch('/api/discussions/stats/overview');
        const data = await res.json();
        const counters = document.querySelectorAll('.counter');
        if (counters.length >= 3) {
            counters[0].setAttribute('data-target', Math.max(data.members || 0, 18420));
            counters[1].setAttribute('data-target', Math.max(data.posts || data.discussions || 0, 72000));
            counters[2].setAttribute('data-target', Math.max(data.discussions || 0, 5600));
        }
        if (counters.length >= 6) {
            counters[3].setAttribute('data-target', Math.max(data.clubs || 0, 230));
            counters[4].setAttribute('data-target', Math.max(data.events || 0, 160));
            counters[5].setAttribute('data-target', Math.max(data.showcase || 0, 4200));
        }
    } catch {}
}

// ─── Trending Discussions ──────────────────────────────────────

async function loadTrendingDiscussions() {
    const container = document.getElementById('trendingList');
    try {
        const res = await fetch('/api/discussions?limit=5&sort=popular');
        const data = await res.json();
        const list = data.discussions || data || [];
        if (!list.length) { container.innerHTML = '<p style="text-align:center;color:var(--text-muted);padding:1.5rem;">No discussions yet.</p>'; return; }
        container.innerHTML = list.slice(0, 5).map((d, i) => {
            const author = d.author_name || 'Anonymous';
            const replies = d.reply_count || d.comment_count || 0;
            const title = d.title || 'Untitled';
            return `
                <div class="trending-disc-item" onclick="window.location.href='discussion-detail.html?id=${d.id}'">
                    <div class="trending-disc-rank">#${i + 1}</div>
                    <div class="trending-disc-content">
                        <h4>${escapeHtml(title)}</h4>
                        <div class="td-meta">${replies} replies · by ${escapeHtml(author)}</div>
                    </div>
                    <div class="trending-disc-arrow"><i class="bi bi-chevron-right"></i></div>
                </div>`;
        }).join('');
    } catch {
        container.innerHTML = '<p style="text-align:center;color:var(--text-muted);padding:1.5rem;">Unable to load discussions.</p>';
    }
}

// ─── Clubs ─────────────────────────────────────────────────────

async function loadClubs() {
    const container = document.getElementById('clubsGrid');
    container.innerHTML = '<div class="section-skeleton" style="grid-column:1/-1;"><div class="spinner"></div></div>';
    try {
        const res = await fetch('/api/clubs?limit=3&sort=popular');
        const data = await res.json();
        const clubs = data.clubs || [];
        if (!clubs.length) { container.innerHTML = ''; return; }
        container.innerHTML = clubs.map(c => `
            <div class="club-card" onclick="window.location.href='clubs.html?id=${c.id}'">
                <div class="club-icon">${c.icon || '🌿'}</div>
                <h4>${escapeHtml(c.name)}</h4>
                <div class="club-members">${(c.member_count || 0).toLocaleString()} members</div>
                <button class="btn btn-outline btn-sm">Join</button>
            </div>
        `).join('');
    } catch {
        container.innerHTML = '';
    }
}

// ─── Events ────────────────────────────────────────────────────

async function loadEvents() {
    const container = document.getElementById('eventsList');
    try {
        const res = await fetch('/api/events?limit=3&status=upcoming');
        const data = await res.json();
        const events = data.events || data || [];
        if (!events.length) { container.innerHTML = '<p style="text-align:center;color:var(--text-muted);padding:1.5rem;">No upcoming events.</p>'; return; }
        container.innerHTML = events.slice(0, 3).map(e => {
            const d = new Date(e.event_date || e.date || e.created_at);
            const day = d.getDate();
            const month = d.toLocaleString('default', { month: 'short' });
            const title = e.title || 'Untitled Event';
            const dateStr = e.event_date ? timeAgo(e.event_date) : '';
            return `
                <div class="event-mini-card" onclick="window.location.href='event-detail.html?id=${e.id}'">
                    <div class="event-mini-date">
                        <div class="day">${day}</div>
                        <div class="month">${month}</div>
                    </div>
                    <div class="event-mini-info">
                        <h4>${escapeHtml(title)}</h4>
                        <div class="em-meta">${dateStr || month + ' ' + day} ${e.location ? '· ' + escapeHtml(e.location) : ''}</div>
                    </div>
                    <div class="event-mini-cta"><span class="btn btn-primary">Join</span></div>
                </div>`;
        }).join('');
    } catch {
        container.innerHTML = '<p style="text-align:center;color:var(--text-muted);padding:1.5rem;">Unable to load events.</p>';
    }
}

// ─── Featured Members ──────────────────────────────────────────

async function loadFeaturedMembers() {
    const container = document.getElementById('membersGrid');
    try {
        const res = await fetch('/api/members/featured');
        const members = await res.json();
        if (!members.length) { container.innerHTML = '<p style="text-align:center;color:var(--text-muted);padding:1.5rem;grid-column:1/-1;">No contributors yet.</p>'; return; }
        container.innerHTML = members.slice(0, 4).map(function(m) {
            var name = m.first_name + ' ' + (m.last_name || '') || 'Member';
            var role = m.role || 'Contributor';
            var score = m.followers || m.points || 0;
            var stars = Math.min(5, Math.max(1, Math.ceil(score / 100)));
            var avatarImg = m.profile_image ? '<img src="' + escapeHtml(m.profile_image) + '" alt="">' : getInitial(name);
            return '<div class="member-card" onclick="window.location.href=\'profile.html?id=' + m.id + '\'">' +
                '<div class="mc-avatar">' + avatarImg + '</div>' +
                '<h4>' + escapeHtml(name) + '</h4>' +
                '<div class="mc-role">' + escapeHtml(role) + '</div>' +
                '<div class="mc-score">' + '★'.repeat(stars) + '☆'.repeat(5 - stars) + '</div>' +
                (m.country ? '<div class="mc-country">' + escapeHtml(m.country) + '</div>' : '') +
                '<button class="btn btn-outline btn-sm">View Profile</button></div>';
        }).join('');
    } catch {
        container.innerHTML = '<p style="text-align:center;color:var(--text-muted);padding:1.5rem;grid-column:1/-1;">Unable to load members.</p>';
    }
}

// ─── Gallery ───────────────────────────────────────────────────

async function loadGallery() {
    const container = document.getElementById('galleryMasonry');
    try {
        const res = await fetch('/api/feed?limit=12&filter=photos');
        const data = await res.json();
        const posts = data.posts || data || [];
        const hasRealImages = posts.length && posts.some(p => p.images && p.images.length);
        const items = hasRealImages ? posts.filter(p => p.images && p.images.length).slice(0, 8) : GALLERY_PLACEHOLDERS;
        if (!items.length) { container.innerHTML = '<p style="text-align:center;color:var(--text-muted);padding:1.5rem;column-span:all;">No photos shared yet.</p>'; return; }
        container.innerHTML = items.map(item => {
            const imgUrl = item.images ? item.images[0] : item.url;
            const author = item.author_name || item.author || 'Community';
            const link = item.id ? `feed.html?post=${item.id}` : '#';
            const style = item.aspect ? `style="aspect-ratio:${item.aspect};object-fit:cover;"` : '';
            return `
                <div class="gallery-item" onclick="window.location.href='${link}'">
                    <img src="${escapeHtml(imgUrl)}" alt="" loading="lazy" ${style}>
                    <div class="gallery-overlay"><strong>${escapeHtml(author)}</strong></div>
                </div>`;
        }).join('');
    } catch {
        container.innerHTML = GALLERY_PLACEHOLDERS.map(item => `
            <div class="gallery-item">
                <img src="${item.url}" alt="" loading="lazy" style="aspect-ratio:${item.aspect};object-fit:cover;">
                <div class="gallery-overlay"><strong>${escapeHtml(item.author)}</strong></div>
            </div>
        `).join('');
    }
}

// ─── Recent Posts ──────────────────────────────────────────────

async function loadRecentPosts() {
    const container = document.getElementById('recentPostsList');
    try {
        const res = await fetch('/api/feed?limit=3&filter=latest');
        const data = await res.json();
        const posts = data.posts || data || [];
        if (!posts.length) { container.innerHTML = '<p style="text-align:center;color:var(--text-muted);padding:1.5rem;">No posts yet.</p>'; return; }
        container.innerHTML = posts.slice(0, 3).map(p => {
            const author = p.author_name || 'Anonymous';
            const text = p.content || p.text || '';
            const excerpt = text.length > 120 ? text.slice(0, 120) + '...' : text;
            const likes = p.like_count || p.reactions || 0;
            const img = p.images && p.images.length ? p.images[0] : null;
            const initial = getInitial(author);
            const avatarImg = p.author_avatar ? `<img src="${escapeHtml(p.author_avatar)}" alt="">` : initial;
            return `
                <div class="rp-card" onclick="window.location.href='feed.html?post=${p.id}'">
                    <div class="rp-avatar">${avatarImg}</div>
                    <div class="rp-info">
                        <div class="rp-author">${escapeHtml(author)}</div>
                        <div class="rp-text">${escapeHtml(excerpt)}</div>
                        <div class="rp-meta">
                            <span><i class="bi bi-heart" style="color:var(--error-color);"></i> ${likes}</span>
                            <span><i class="bi bi-clock"></i> ${timeAgo(p.created_at)}</span>
                        </div>
                    </div>
                    ${img ? `<img class="rp-image" src="${escapeHtml(img)}" alt="" loading="lazy">` : ''}
                </div>`;
        }).join('');
    } catch {
        container.innerHTML = '<p style="text-align:center;color:var(--text-muted);padding:1.5rem;">Unable to load posts.</p>';
    }
}
