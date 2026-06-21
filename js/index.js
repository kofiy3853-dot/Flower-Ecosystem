// js/index.js — Homepage dynamic content loader

document.addEventListener('DOMContentLoaded', () => {
    loadFeaturedProducts();
    loadArticles();
    loadVideos();
    loadCourses();
    loadFlorists();
    loadEvents();
    initTabs();
    initNewsletter();
});

// ── Fetch helper ──────────────────────────────────────────────────────────────
async function fetchJSON(path) {
    try {
        const res = await fetch(path);
        if (!res.ok) throw new Error(`Failed: ${path}`);
        return await res.json();
    } catch (e) {
        console.warn(e);
        return null;
    }
}

// ── Stars helper ──────────────────────────────────────────────────────────────
function stars(rating) {
    const full = Math.floor(rating);
    const half = rating % 1 >= 0.5 ? 1 : 0;
    return `${'<i class="bi bi-star-fill"></i>'.repeat(full)}${half ? '<i class="bi bi-star-half"></i>' : ''}`;
}

// ── Featured Products ─────────────────────────────────────────────────────────
async function loadFeaturedProducts() {
    const grid = document.getElementById('featuredProducts');
    if (!grid) return;
    const data = await fetchJSON('data/products.json');
    if (!data) return;
    const items = (Array.isArray(data) ? data : data.products || [])
        .filter(p => p.featured || p.bestSeller)
        .slice(0, 8);
    if (!items.length) return;
    grid.innerHTML = items.map(p => `
        <div class="product-card">
            <div class="product-img-wrap">
                <img src="${p.image}" alt="${p.name}" loading="lazy">
                ${p.badge ? `<span class="product-badge">${p.badge}</span>` : ''}
                <button class="wishlist-btn" aria-label="Add to wishlist">
                    <i class="bi bi-heart"></i>
                </button>
            </div>
            <div class="product-info">
                <h3 class="product-name">${p.name}</h3>
                <p class="product-seller">by ${p.seller || 'Flower Ecosystem'}</p>
                <div style="color:var(--accent-gold);font-size:0.8rem;margin-bottom:0.5rem;">
                    ${stars(p.rating || 0)}
                    <span style="color:var(--text-muted);font-size:0.75rem;"> (${p.reviews || 0})</span>
                </div>
                <div class="product-footer">
                    <span class="product-price">$${Number(p.price).toFixed(2)}</span>
                    <button class="btn btn-primary btn-sm add-to-cart-btn">
                        <i class="bi bi-cart-plus"></i> Add
                    </button>
                </div>
            </div>
        </div>
    `).join('');
}

// ── Articles ──────────────────────────────────────────────────────────────────
async function loadArticles() {
    const grid = document.getElementById('articleGrid');
    if (!grid) return;
    const data = await fetchJSON('data/articles.json');
    if (!data) return;
    const items = (Array.isArray(data) ? data : data.articles || []).slice(0, 3);
    if (!items.length) return;
    grid.innerHTML = items.map(a => `
        <a href="article-detail.html?id=${a.id}" class="article-card">
            <img src="${a.image}" alt="${a.title}" loading="lazy">
            <div class="article-content">
                <span class="article-tag">${a.category || a.tag || 'Guide'}</span>
                <h3>${a.title}</h3>
                <p>${a.description || ''}</p>
                <div style="display:flex;align-items:center;justify-content:space-between;margin-top:auto;padding-top:0.75rem;">
                    <small style="color:var(--text-muted);">
                        <i class="bi bi-clock"></i> ${a.readTime || '5 min read'}
                    </small>
                    <span class="link-arrow">Read more →</span>
                </div>
            </div>
        </a>
    `).join('');
}

// ── Videos ────────────────────────────────────────────────────────────────────
async function loadVideos() {
    const grid = document.getElementById('videoGrid');
    if (!grid) return;
    const data = await fetchJSON('data/videos.json');
    if (!data) return;
    const items = (Array.isArray(data) ? data : data.videos || []).slice(0, 3);
    if (!items.length) return;
    grid.innerHTML = items.map(v => `
        <div class="article-card">
            <div style="position:relative;overflow:hidden;">
                <img src="${v.image}" alt="${v.title}" loading="lazy"
                     style="height:175px;width:100%;object-fit:cover;display:block;">
                <div style="position:absolute;inset:0;display:flex;align-items:center;justify-content:center;
                            background:rgba(0,0,0,0.15);">
                    <div style="width:48px;height:48px;background:rgba(255,255,255,0.92);border-radius:50%;
                                display:flex;align-items:center;justify-content:center;
                                box-shadow:0 4px 12px rgba(0,0,0,0.2);">
                        <i class="bi bi-play-fill" style="color:var(--primary-color);font-size:1.25rem;margin-left:3px;"></i>
                    </div>
                </div>
                <span style="position:absolute;bottom:0.6rem;right:0.6rem;background:rgba(0,0,0,0.7);
                             color:white;font-size:0.72rem;padding:0.2rem 0.5rem;border-radius:4px;">
                    ${v.duration || ''}
                </span>
            </div>
            <div class="article-content">
                <span class="article-tag">${v.category || v.tag || 'Tutorial'}</span>
                <h3>${v.title}</h3>
                <p>${v.description || ''}</p>
                <div style="display:flex;align-items:center;justify-content:space-between;margin-top:auto;padding-top:0.75rem;">
                    <small style="color:var(--text-muted);">
                        <i class="bi bi-eye"></i> ${(v.views || 0).toLocaleString()} views
                    </small>
                    <span class="link-arrow">Watch now →</span>
                </div>
            </div>
        </div>
    `).join('');
}

// ── Courses ───────────────────────────────────────────────────────────────────
async function loadCourses() {
    const grid = document.getElementById('courseGrid');
    if (!grid) return;
    const data = await fetchJSON('data/courses.json');
    if (!data) return;
    const items = (Array.isArray(data) ? data : data.courses || []).slice(0, 3);
    if (!items.length) return;
    grid.innerHTML = items.map(c => `
        <a href="course-detail.html?id=${c.id}" class="article-card">
            <img src="${c.thumbnail || c.image}" alt="${c.title}" loading="lazy">
            <div class="article-content">
                <span class="article-tag">${c.level || 'Beginner'}</span>
                <h3>${c.title}</h3>
                <p>${c.description || ''}</p>
                <div style="display:flex;align-items:center;justify-content:space-between;
                            margin-top:auto;padding-top:0.75rem;">
                    <span style="font-weight:700;color:var(--primary-color);">
                        ${c.price === 0 ? 'Free' : c.price ? `$${Number(c.price).toFixed(2)}` : 'Free'}
                    </span>
                    <small style="color:var(--text-muted);">
                        <i class="bi bi-people"></i> ${(c.students || 0).toLocaleString()} students
                    </small>
                </div>
            </div>
        </a>
    `).join('');
}

// ── Florists ──────────────────────────────────────────────────────────────────
async function loadFlorists() {
    const grid = document.getElementById('floristGrid');
    if (!grid) return;
    const data = await fetchJSON('data/florists.json');
    if (!data) return;
    const items = (Array.isArray(data) ? data : data.florists || []).slice(0, 4);
    if (!items.length) return;
    grid.innerHTML = items.map(f => `
        <a href="florists.html" class="florist-card">
            <img class="florist-img" src="${f.image}" alt="${f.name}" loading="lazy">
            <div class="florist-info">
                <h3>${f.name}</h3>
                <p class="florist-location"><i class="bi bi-geo-alt"></i> ${f.location}</p>
                <p class="florist-specialty">${f.specialty}</p>
                <div class="florist-stats">
                    <span style="color:var(--accent-gold);">
                        <i class="bi bi-star-fill"></i> ${f.rating}
                        <span style="color:var(--text-muted);">(${f.reviews})</span>
                    </span>
                    <span><i class="bi bi-bag"></i> ${f.products} listings</span>
                </div>
            </div>
        </a>
    `).join('');
}

// ── Events ────────────────────────────────────────────────────────────────────
async function loadEvents() {
    const grid = document.getElementById('eventsGrid');
    if (!grid) return;
    const data = await fetchJSON('data/events.json');
    if (!data) return;
    const items = (Array.isArray(data) ? data : data.events || []).slice(0, 3);
    if (!items.length) return;
    grid.innerHTML = items.map(e => `
        <a href="events.html" class="event-card">
            <div class="event-date">
                <span class="event-day">${e.day}</span>
                <span class="event-month">${e.month}</span>
            </div>
            <div class="event-info">
                <span class="article-tag" style="margin-bottom:0.4rem;">${e.category || 'Event'}</span>
                <h3>${e.title}</h3>
                <p><i class="bi bi-geo-alt"></i> ${e.location}</p>
                <p><i class="bi bi-tag"></i> ${e.price}</p>
            </div>
            <span class="btn btn-outline btn-sm" style="white-space:nowrap;align-self:center;">
                Register →
            </span>
        </a>
    `).join('');
}

// ── Tabs ──────────────────────────────────────────────────────────────────────
function initTabs() {
    document.querySelectorAll('.learning-tabs .tab-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            document.querySelectorAll('.learning-tabs .tab-btn').forEach(b => b.classList.remove('active'));
            document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
            btn.classList.add('active');
            const target = document.getElementById(`tab-${btn.dataset.tab}`);
            if (target) target.classList.add('active');
        });
    });
}

// ── Newsletter ────────────────────────────────────────────────────────────────
function initNewsletter() {
    const form = document.getElementById('newsletterForm');
    const msg  = document.getElementById('newsletterMsg');
    if (!form) return;
    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        const email = form.querySelector('input[type="email"]').value;
        try {
            await fetch('/api/newsletter/subscribe', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email })
            });
        } catch (_) {}
        form.classList.add('hidden');
        if (msg) msg.classList.remove('hidden');
    });
}
