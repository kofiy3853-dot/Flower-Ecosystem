document.addEventListener('DOMContentLoaded', () => {
    // Load stats immediately for faster display
    loadHeroStats();

    // Clear product cache on page load to ensure fresh data
    localStorage.removeItem('fecache_/api/products?limit=8');

    // Fire all data fetches in parallel — then render
    Promise.all([
        fetchJSON('/api/stats',                       30),   // 30s cache
        fetchJSON('/api/products/list/categories',    60),   // 1 min cache
        fetchJSON('/api/products?limit=8',            30),   // 30s cache
        fetchJSON('data/articles.json',               300),  // 5 min cache
        fetchJSON('data/videos.json',                 300),
        fetchJSON('data/courses.json',                300),
        fetchJSON('/api/products/list/florists',      60),   // 1 min cache
        fetchJSON('data/events.json',                 300),
    ]).then(([stats, categories, products, articles, videos, courses, florists, events]) => {
        renderStats(stats);
        renderCategories(categories);
        renderFeaturedProducts(products);
        renderArticles(articles);
        renderVideos(videos);
        renderCourses(courses);
        renderFlorists(florists);
        renderEvents(events);
    });

    initTabs();
    initNewsletter();
    initRevealAnimations();
});

// ─── HERO STATS (fast load) ────────────────────────────────────────
async function loadHeroStats() {
    // Show loading state
    ['statProducts', 'statSellers', 'statUsers', 'statCategories'].forEach(id => {
        const el = document.getElementById(id);
        if (el) el.classList.add('loading');
    });

    try {
        const res = await fetch('/api/stats');
        if (res.ok) {
            const stats = await res.json();
            animateCounter('statProducts', stats.products || 0);
            animateCounter('statSellers', stats.sellers || 0);
            animateCounter('statUsers', stats.users || 0);
            animateCounter('statCategories', stats.categories || 0);

            // Update trust count
            const trustEl = document.getElementById('trustCount');
            if (trustEl && stats.users) {
                trustEl.textContent = stats.users.toLocaleString() + '+';
            }
        }
    } catch {}

    // Update explore stats too
    updateExploreStats();
}

function animateCounter(elementId, target) {
    const el = document.getElementById(elementId);
    if (!el) return;
    el.classList.remove('loading');
    const duration = 1000;
    const start = 0;
    const increment = target / (duration / 16);
    let current = start;

    const timer = setInterval(() => {
        current += increment;
        if (current >= target) {
            el.textContent = target.toLocaleString();
            clearInterval(timer);
        } else {
            el.textContent = Math.floor(current).toLocaleString();
        }
    }, 16);
}

async function updateExploreStats() {
    try {
        const res = await fetch('/api/stats');
        if (res.ok) {
            const stats = await res.json();
            const el = document.getElementById('exploreStats');
            if (el) {
                const map = { products: stats.products, sellers: stats.sellers, users: stats.users, categories: stats.categories };
                el.querySelectorAll('[data-stat]').forEach(elem => {
                    const key = elem.dataset.stat;
                    if (map[key] !== undefined) elem.textContent = map[key].toLocaleString();
                });
            }
        }
    } catch {}
}

// ─── CACHED FETCH ────────────────────────────────────────────────────
// ttlSeconds: how long to keep the response in localStorage before re-fetching
async function fetchJSON(path, ttlSeconds) {
    const cacheKey = 'fecache_' + path;
    const ttl = (ttlSeconds || 0) * 1000;
    if (ttl > 0) {
        try {
            const raw = localStorage.getItem(cacheKey);
            if (raw) {
                const { data, expires } = JSON.parse(raw);
                if (Date.now() < expires) return data;
            }
        } catch (_) { /* ignore parse errors */ }
    }
    try {
        const res = await fetch(path);
        if (!res.ok) throw new Error(`${res.status}`);
        const data = await res.json();
        if (ttl > 0) {
            try {
                localStorage.setItem(cacheKey, JSON.stringify({ data, expires: Date.now() + ttl }));
            } catch (_) { /* quota exceeded — skip caching */ }
        }
        return data;
    } catch (e) {
        console.warn(`Failed to load ${path}:`, e.message);
        return null;
    }
}

function normalizeArray(data, key) {
    if (Array.isArray(data)) return data;
    if (data && typeof data === 'object' && Array.isArray(data[key])) return data[key];
    return [];
}

function stars(rating) {
    const full = Math.floor(rating);
    const half = rating % 1 >= 0.5 ? 1 : 0;
    return '<i class="bi bi-star-fill"></i>'.repeat(full) +
           (half ? '<i class="bi bi-star-half"></i>' : '');
}

function avatarHTML(name, img, size) {
    const s = size || 80;
    const initials = (name || 'S').charAt(0).toUpperCase();
    if (img) {
        return `<div style="width:${s}px;height:${s}px;border-radius:50%;overflow:hidden;flex-shrink:0;">
            <img src="${escapeHtml(img)}" alt="${escapeHtml(name)}" loading="lazy"
                 style="width:100%;height:100%;object-fit:cover;"
                 onerror="this.style.display='none';this.parentElement.innerHTML='<div style=&quot;width:100%;height:100%;background:linear-gradient(135deg,var(--primary-color),#e84393);color:white;display:flex;align-items:center;justify-content:center;font-size:${s*0.4}px;font-weight:700;&quot;>${initials}</div>'">
        </div>`;
    }
    return `<div style="width:${s}px;height:${s}px;border-radius:50%;background:linear-gradient(135deg,var(--primary-color),#e84393);color:white;display:flex;align-items:center;justify-content:center;font-size:${s*0.4}px;font-weight:700;flex-shrink:0;">${initials}</div>`;
}

function placeholderImg(seed) {
    const colors = ['FF5FA2','e84393','6C5CE7','00B894','FDCB6E','E17055','0984E3'];
    const c = colors[(seed || 0) % colors.length];
    return `data:image/svg+xml,${encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" width="400" height="300"><rect fill="#${c}" width="400" height="300" rx="12"/><text x="200" y="170" text-anchor="middle" fill="white" font-size="60" font-family="Arial" font-weight="bold">F</text></svg>`)}`;
}

// ─── STATS ──────────────────────────────────────────────────────────
function renderStats(stats) {
    if (!stats) return;

    // Update hero stats (already loaded by loadHeroStats, but update if different)
    const statProducts = document.getElementById('statProducts');
    const statSellers = document.getElementById('statSellers');
    const statUsers = document.getElementById('statUsers');
    const statCategories = document.getElementById('statCategories');
    if (statProducts) statProducts.textContent = (stats.products || 0).toLocaleString();
    if (statSellers) statSellers.textContent = (stats.sellers || 0).toLocaleString();
    if (statUsers) statUsers.textContent = (stats.users || 0).toLocaleString();
    if (statCategories) statCategories.textContent = (stats.categories || 0).toLocaleString();

    const exploreEl = document.getElementById('exploreStats');
    if (exploreEl) {
        const map = { products: stats.products, sellers: stats.sellers, users: stats.users, categories: stats.categories };
        exploreEl.querySelectorAll('[data-stat]').forEach(el => {
            const key = el.dataset.stat;
            if (map[key] !== undefined) el.textContent = map[key].toLocaleString();
        });
    }
}

// ─── CATEGORIES ─────────────────────────────────────────────────────
const CATEGORY_SLUGS = {
    'bouquets': 'bouquets', 'roses': 'roses', 'orchids': 'orchids',
    'wildflowers': 'wildflowers', 'succulents': 'succulents',
    'indoor plants': 'indoor-plants', 'tulips': 'tulips', 'sunflowers': 'sunflowers'
};
const CATEGORY_IMAGES = {
    'bouquets': 'images/annie-spratt-WBpr_yH0Frg-unsplash.jpg',
    'roses': 'images/download (2).jpg',
    'orchids': 'images/kseniia-ilinykh-OrKgC0M8Lj8-unsplash.jpg',
    'wildflowers': 'images/irina-iriser-mNz9Pa3Tz34-unsplash.jpg',
    'succulents': 'images/yen-vu-2MNFnPdsGyg-unsplash.jpg',
    'indoor plants': 'images/huy-phan-dM317CbttyY-unsplash.jpg'
};
const CATEGORY_TAGLINES = {
    'bouquets': 'Curated arrangements for every moment',
    'roses': 'Timeless romance in every petal',
    'orchids': 'Exotic & sophisticated blooms',
    'wildflowers': 'Natural & free-spirited',
    'succulents': 'Low maintenance, high beauty',
    'indoor plants': 'Green your living space'
};

function renderCategories(data) {
    const grid = document.getElementById('categoryGrid');
    if (!grid) return;
    let cats = normalizeArray(data, 'categories');

    if (!cats.length) {
        grid.innerHTML = '<p style="text-align:center;color:var(--text-muted);grid-column:1/-1;">No categories available</p>';
        return;
    }
    grid.innerHTML = cats.map(c => {
        const nameLower = (c.name || '').toLowerCase();
        const slug = CATEGORY_SLUGS[nameLower] || nameLower.replace(/\s+/g, '-');
        const img = CATEGORY_IMAGES[nameLower] || c.image_url || '';
        const tagline = c.description || CATEGORY_TAGLINES[nameLower] || '';
        return `
            <a href="category-listing.html?cat=${slug}" class="category-card">
                <div class="category-img"><img loading="lazy" src="${escapeHtml(img)}" alt="${escapeHtml(c.name)}"></div>
                <div class="category-overlay"><h3>${escapeHtml(c.name)}</h3><p>${escapeHtml(tagline)}</p></div>
            </a>`;
    }).join('');
}

// ─── PRODUCTS ───────────────────────────────────────────────────────
function renderFeaturedProducts(data) {
    const grid = document.getElementById('featuredProducts');
    if (!grid) return;
    const items = normalizeArray(data, 'products').slice(0, 8);
    if (!items.length) {
        grid.innerHTML = '<p style="text-align:center;color:var(--text-muted);padding:2rem;grid-column:1/-1;">No products available yet. Check back soon!</p>';
        return;
    }
    grid.innerHTML = items.map(p => ProductCard(p)).join('');
}

// ─── ARTICLES ───────────────────────────────────────────────────────
function renderArticles(data) {
    const grid = document.getElementById('articleGrid');
    if (!grid) return;
    const items = normalizeArray(data, 'articles').slice(0, 3);
    if (!items.length) {
        grid.innerHTML = '<p style="text-align:center;color:var(--text-muted);padding:2rem;grid-column:1/-1;">No articles available.</p>';
        return;
    }
    grid.innerHTML = items.map(a => `
        <a href="article-detail.html?id=${encodeURIComponent(a.id)}" class="article-card">
            <img src="${a.image || placeholderImg(0)}" alt="${escapeHtml(a.title)}" loading="lazy">
            <div class="article-content">
                <span class="article-tag">${escapeHtml(a.category || a.tag || 'Guide')}</span>
                <h3>${escapeHtml(a.title)}</h3>
                <p>${escapeHtml((a.description || '').slice(0, 120))}</p>
                <div style="display:flex;align-items:center;justify-content:space-between;margin-top:auto;padding-top:0.75rem;">
                    <small style="color:var(--text-muted);"><i class="bi bi-clock"></i> ${escapeHtml(a.readTime || '5 min')}</small>
                    <span class="link-arrow">Read more →</span>
                </div>
            </div>
        </a>
    `).join('');
}

// ─── VIDEOS ─────────────────────────────────────────────────────────
function renderVideos(data) {
    const grid = document.getElementById('videoGrid');
    if (!grid) return;
    const items = normalizeArray(data, 'videos').slice(0, 3);
    if (!items.length) {
        grid.innerHTML = '<p style="text-align:center;color:var(--text-muted);padding:2rem;grid-column:1/-1;">No videos available.</p>';
        return;
    }
    grid.innerHTML = items.map(v => `
        <div class="article-card">
            <div style="position:relative;overflow:hidden;">
                <img src="${v.image || placeholderImg(1)}" alt="${escapeHtml(v.title)}" loading="lazy"
                     style="height:175px;width:100%;object-fit:cover;display:block;">
                <div style="position:absolute;inset:0;display:flex;align-items:center;justify-content:center;background:rgba(0,0,0,0.15);">
                    <div style="width:48px;height:48px;background:rgba(255,255,255,0.92);border-radius:50%;display:flex;align-items:center;justify-content:center;box-shadow:0 4px 12px rgba(0,0,0,0.2);">
                        <i class="bi bi-play-fill" style="color:var(--primary-color);font-size:1.25rem;margin-left:3px;"></i>
                    </div>
                </div>
                ${v.duration ? `<span style="position:absolute;bottom:0.6rem;right:0.6rem;background:rgba(0,0,0,0.7);color:white;font-size:0.72rem;padding:0.2rem 0.5rem;border-radius:4px;">${escapeHtml(v.duration)}</span>` : ''}
            </div>
            <div class="article-content">
                <span class="article-tag">${escapeHtml(v.category || v.tag || 'Tutorial')}</span>
                <h3>${escapeHtml(v.title)}</h3>
                <p>${escapeHtml((v.description || '').slice(0, 100))}</p>
                <div style="display:flex;align-items:center;margin-top:auto;padding-top:0.75rem;">
                    <small style="color:var(--text-muted);"><i class="bi bi-eye"></i> ${(v.views || 0).toLocaleString()} views</small>
                </div>
            </div>
        </div>
    `).join('');
}

// ─── COURSES ────────────────────────────────────────────────────────
function renderCourses(data) {
    const grid = document.getElementById('courseGrid');
    if (!grid) return;
    const items = normalizeArray(data, 'courses').slice(0, 4);
    if (!items.length) {
        grid.innerHTML = '<p style="text-align:center;color:var(--text-muted);padding:2rem;grid-column:1/-1;">No courses available.</p>';
        return;
    }
    grid.innerHTML = items.map(c => `
        <a href="course-detail.html?id=${encodeURIComponent(c.id)}" class="course-card">
            <img src="${c.thumbnail || c.thumbnail_url || placeholderImg(2)}" alt="${escapeHtml(c.title)}" loading="lazy">
            <div class="course-badge">${escapeHtml(c.level || 'Beginner')}</div>
            <div class="course-info">
                <h4>${escapeHtml(c.title)}</h4>
                <p>${escapeHtml(c.instructor || '')}</p>
                <div style="color:var(--accent-gold);font-size:0.75rem;margin:0.5rem 0;">
                    ${stars(c.rating || 0)}
                    <span style="color:var(--text-muted);"> (${c.students || 0})</span>
                </div>
                <div style="display:flex;justify-content:space-between;align-items:center;">
                    <span style="font-weight:600;">${c.price > 0 ? (c.currency || 'GHS') + ' ' + c.price : 'Free'}</span>
                    <span style="font-size:0.8rem;color:var(--text-muted);">${escapeHtml(c.duration || '')}</span>
                </div>
            </div>
        </a>
    `).join('');
}

// ─── FLORISTS ───────────────────────────────────────────────────────
function renderFlorists(data) {
    const grid = document.getElementById('floristGrid');
    if (!grid) return;
    let items = normalizeArray(data, 'florists');

    if (!items.length) {
        grid.innerHTML = '<p style="text-align:center;color:var(--text-muted);padding:2rem;">No sellers yet.</p>';
        return;
    }
    grid.innerHTML = items.slice(0, 4).map(f => `
        <a href="florist-profile.html?id=${f.id}" class="florist-card" style="text-decoration:none;color:inherit;">
            ${avatarHTML(f.name, f.image, 80)}
            <div class="florist-info">
                <h4>${escapeHtml(f.name)}</h4>
                <p>${escapeHtml(f.role || f.specialty || 'Seller')}</p>
                <span style="font-size:0.82rem;color:var(--primary-color);font-weight:500;">View Profile →</span>
            </div>
        </a>
    `).join('');
}

// ─── EVENTS ─────────────────────────────────────────────────────────
function renderEvents(data) {
    const grid = document.getElementById('eventsGrid');
    if (!grid) return;
    const items = normalizeArray(data, 'events').slice(0, 3);
    if (!items.length) {
        grid.innerHTML = '<p style="text-align:center;color:var(--text-muted);padding:2rem;grid-column:1/-1;">No upcoming events.</p>';
        return;
    }
    grid.innerHTML = items.map(e => `
        <div class="event-card">
            <div class="event-img-wrap">
                <img src="${e.image || placeholderImg(3)}" alt="${escapeHtml(e.title)}" loading="lazy">
                <div class="event-date-badge">
                    <span class="day">${escapeHtml(e.day || '')}</span>
                    <span class="month">${escapeHtml(e.month || '')}</span>
                </div>
            </div>
            <div class="event-info">
                <span class="article-tag">${escapeHtml(e.category || 'Event')}</span>
                <h4>${escapeHtml(e.title)}</h4>
                <p><i class="bi bi-geo-alt"></i> ${escapeHtml(e.location || 'Online')}</p>
            </div>
        </div>
    `).join('');
}

// ─── TABS ───────────────────────────────────────────────────────────
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

// ─── NEWSLETTER ─────────────────────────────────────────────────────
function initNewsletter() {
    const form = document.getElementById('newsletterForm');
    if (!form) return;
    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        const input = form.querySelector('[type="email"]');
        if (!input || !input.value.trim()) return;
        const btn = form.querySelector('button');
        if (btn) { btn.disabled = true; btn.textContent = 'Subscribing...'; }
        try {
            const res = await fetch('/api/newsletter/subscribe', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'X-Requested-With': 'XMLHttpRequest' },
                body: JSON.stringify({ email: input.value.trim() })
            });
            if (res.ok) {
                form.innerHTML = '<p style="color:var(--accent-green);font-weight:500;">Thanks for subscribing!</p>';
            } else {
                if (btn) { btn.disabled = false; btn.textContent = 'Subscribe'; }
            }
        } catch {
            if (btn) { btn.disabled = false; btn.textContent = 'Subscribe'; }
        }
    });
}

// ─── REVEAL ANIMATIONS ──────────────────────────────────────────────
// Note: animations.js already sets up an IntersectionObserver that adds
// the 'active' class. This function re-observes any elements added
// dynamically after the initial DOMContentLoaded pass.
function initRevealAnimations() {
    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('active'); // was 'revealed' — fixed
                observer.unobserve(entry.target);
            }
        });
    }, { threshold: 0.1 });
    // Only observe elements not yet activated
    document.querySelectorAll('.reveal-up:not(.active)').forEach(el => observer.observe(el));
}
