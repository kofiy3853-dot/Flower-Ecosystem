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

function stars(rating) {
    const full = Math.floor(rating);
    const half = rating % 1 >= 0.5 ? 1 : 0;
    return `${'<i class="bi bi-star-fill"></i>'.repeat(full)}${half ? '<i class="bi bi-star-half"></i>' : ''}`;
}

async function loadFeaturedProducts() {
    const grid = document.getElementById('featuredProducts');
    if (!grid) return;
    const data = await fetchJSON('/api/products?limit=8');
    if (!data) return;
    const items = (Array.isArray(data) ? data : data.products || []).slice(0, 8);
    if (!items.length) return;
    grid.innerHTML = items.map(p => `
        <div class="product-card">
            <div class="product-img-wrap">
                <a href="/product-detail.html?id=${encodeURIComponent(p.id)}">
                    <img loading="lazy" src="${escapeHtml(p.image || '/images/placeholder.svg')}" alt="${escapeHtml(p.name)}" class="product-img">
                </a>
                ${p.badge ? `<span class="product-badge">${escapeHtml(p.badge)}</span>` : ''}
                <button class="wishlist-btn" aria-label="Add to wishlist">
                    <i class="bi bi-heart"></i>
                </button>
            </div>
            <div class="product-info">
                <a href="/product-detail.html?id=${encodeURIComponent(p.id)}" style="text-decoration:none;color:inherit;">
                    <h3 class="product-name">${escapeHtml(p.name)}</h3>
                </a>
                <p class="product-seller">by ${escapeHtml(p.seller || 'Flower Ecosystem')}</p>
                <div style="color:var(--accent-gold);font-size:0.8rem;margin-bottom:0.5rem;">
                    ${stars(p.rating || 0)}
                    <span style="color:var(--text-muted);font-size:0.75rem;"> (${p.reviews || 0})</span>
                </div>
                <div class="product-footer">
                    <span class="product-price">$${Number(p.price).toFixed(2)}</span>
                    <button class="btn btn-primary btn-sm add-to-cart-btn"
                        data-id="${p.id}" data-name="${escapeHtml(p.name)}" data-price="${p.price}" data-image="${p.image || '/images/placeholder.svg'}">
                        <i class="bi bi-cart-plus"></i> Add
                    </button>
                </div>
            </div>
        </div>
    `).join('');
}

async function loadArticles() {
    const grid = document.getElementById('articleGrid');
    if (!grid) return;
    const data = await fetchJSON('data/articles.json');
    if (!data) return;
    const items = (Array.isArray(data) ? data : data.articles || []).slice(0, 3);
    if (!items.length) return;
    grid.innerHTML = items.map(a => `
        <a href="article-detail.html?id=${encodeURIComponent(a.id)}" class="article-card">
            <img src="${a.image}" alt="${escapeHtml(a.title)}" loading="lazy">
            <div class="article-content">
                <span class="article-tag">${escapeHtml(a.category || a.tag || 'Guide')}</span>
                <h3>${escapeHtml(a.title)}</h3>
                <p>${escapeHtml(a.description || '')}</p>
                <div style="display:flex;align-items:center;justify-content:space-between;margin-top:auto;padding-top:0.75rem;">
                    <small style="color:var(--text-muted);">
                        <i class="bi bi-clock"></i> ${escapeHtml(a.readTime || '5 min read')}
                    </small>
                    <span class="link-arrow">Read more →</span>
                </div>
            </div>
        </a>
    `).join('');
}

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
                <img src="${v.image}" alt="${escapeHtml(v.title)}" loading="lazy"
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
                    ${escapeHtml(v.duration || '')}
                </span>
            </div>
            <div class="article-content">
                <span class="article-tag">${escapeHtml(v.category || v.tag || 'Tutorial')}</span>
                <h3>${escapeHtml(v.title)}</h3>
                <p>${escapeHtml(v.description || '')}</p>
                <div style="display:flex;align-items:center;justify-content:space-between;margin-top:auto;padding-top:0.75rem;">
                    <small style="color:var(--text-muted);">
                        <i class="bi bi-eye"></i> ${(v.views || 0).toLocaleString()} views
                    </small>
                </div>
            </div>
        </div>
    `).join('');
}

async function loadCourses() {
    const grid = document.getElementById('courseGrid');
    if (!grid) return;
    const data = await fetchJSON('data/courses.json');
    if (!data) return;
    const items = (Array.isArray(data) ? data : data.courses || []).slice(0, 4);
    if (!items.length) return;
    grid.innerHTML = items.map(c => `
        <a href="course-detail.html?id=${encodeURIComponent(c.id)}" class="course-card">
            <img src="${c.thumbnail}" alt="${escapeHtml(c.title)}" loading="lazy">
            <div class="course-badge">${escapeHtml(c.level || 'Beginner')}</div>
            <div class="course-info">
                <h4>${escapeHtml(c.title)}</h4>
                <p>${escapeHtml(c.instructor || '')}</p>
                <div style="color:var(--accent-gold);font-size:0.75rem;margin:0.5rem 0;">
                    ${stars(c.rating || 0)}
                    <span style="color:var(--text-muted);"> (${c.students || 0})</span>
                </div>
                <div style="display:flex;justify-content:space-between;align-items:center;">
                    <span style="font-weight:600;">${c.price > 0 ? '$' + c.price : 'Free'}</span>
                    <span style="font-size:0.8rem;color:var(--text-muted);">${escapeHtml(c.duration || '')}</span>
                </div>
            </div>
        </a>
    `).join('');
}

async function loadFlorists() {
    const grid = document.getElementById('floristGrid');
    if (!grid) return;
    const data = await fetchJSON('data/florists.json');
    if (!data) return;
    const items = (Array.isArray(data) ? data : data.florists || []).slice(0, 4);
    if (!items.length) return;
    grid.innerHTML = items.map(f => `
        <div class="florist-card">
            <img src="${f.image}" alt="${escapeHtml(f.name)}" loading="lazy">
            <div class="florist-info">
                <h4>${escapeHtml(f.name)}</h4>
                <p>${escapeHtml(f.location || '')}</p>
                <div style="color:var(--accent-gold);font-size:0.75rem;">${stars(f.rating || 0)}</div>
                <span><i class="bi bi-bag"></i> ${f.products || 0} listings</span>
            </div>
        </div>
    `).join('');
}

async function loadEvents() {
    const grid = document.getElementById('eventGrid');
    if (!grid) return;
    const data = await fetchJSON('data/events.json');
    if (!data) return;
    const items = (Array.isArray(data) ? data : data.events || []).slice(0, 3);
    if (!items.length) return;
    grid.innerHTML = items.map(e => `
        <div class="event-card">
            <img src="${e.image}" alt="${escapeHtml(e.title)}" loading="lazy">
            <div class="event-date-badge">
                <strong>${escapeHtml(e.day || '')}</strong>
                <span>${escapeHtml(e.month || '')}</span>
            </div>
            <div class="event-info">
                <span class="article-tag">${escapeHtml(e.category || 'Event')}</span>
                <h4>${escapeHtml(e.title)}</h4>
                <p><i class="bi bi-geo-alt"></i> ${escapeHtml(e.location || 'Online')}</p>
            </div>
        </div>
    `).join('');
}

function initTabs() {
    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
            document.querySelectorAll('.tab-content').forEach(t => t.classList.remove('active'));
            btn.classList.add('active');
            const tab = document.getElementById('tab-' + btn.dataset.tab);
            if (tab) tab.classList.add('active');
        });
    });
}

function initNewsletter() {
    const form = document.getElementById('newsletterForm');
    if (!form) return;
    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        const input = form.querySelector('[type="email"]');
        if (!input || !input.value.trim()) return;
        try {
            const res = await fetch('/api/newsletter/subscribe', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'X-Requested-With': 'XMLHttpRequest' },
                body: JSON.stringify({ email: input.value.trim() })
            });
            if (res.ok) {
                form.innerHTML = '<p style="color:var(--accent-green);font-weight:500;">Thanks for subscribing! 🌸</p>';
            }
        } catch {}
    });
}
