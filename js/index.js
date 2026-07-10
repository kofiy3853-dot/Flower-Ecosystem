document.addEventListener('DOMContentLoaded', () => {
    // Show loading states immediately
    ['statProducts', 'statSellers', 'statUsers', 'statCategories'].forEach(id => {
        const el = document.getElementById(id);
        if (el) el.classList.add('loading');
    });

    // Inject skeleton loaders
    const skeletons = {
        'categoryGrid': Array(8).fill('<div class="skeleton-box" style="height:200px;border-radius:12px;"></div>').join(''),
        'featuredProducts': Array(8).fill('<div class="skeleton-box" style="height:350px;border-radius:12px;"></div>').join(''),
        'articleGrid': Array(3).fill('<div class="skeleton-box" style="height:320px;border-radius:12px;"></div>').join(''),
        'videoGrid': Array(3).fill('<div class="skeleton-box" style="height:320px;border-radius:12px;"></div>').join(''),
        'courseGrid': Array(4).fill('<div class="skeleton-box" style="height:280px;border-radius:12px;"></div>').join(''),
        'floristGrid': Array(4).fill('<div class="skeleton-box" style="height:120px;border-radius:12px;"></div>').join(''),
        'eventsGrid': Array(3).fill('<div class="skeleton-box" style="height:140px;border-radius:12px;"></div>').join('')
    };
    Object.entries(skeletons).forEach(([id, html]) => {
        const el = document.getElementById(id);
        if (el) el.innerHTML = html;
    });

    // Fire all data fetches in parallel — each wrapped so one failure doesn't break all others
    const safe = p => p.catch(() => null);
    Promise.all([
        safe(fetchJSON('/api/stats',                       30)),   // 30s cache
        safe(fetchJSON('/api/products/list/categories',    60)),   // 1 min cache
        safe(fetchJSON('/api/products?limit=8',            30)),   // 30s cache
        safe(fetchJSON('/api/articles?limit=3',            300)),  // Fetch from API
        safe(fetchJSON('/api/videos?limit=3',              300)),
        safe(fetchJSON('/api/courses?limit=4',             300)),
        safe(fetchJSON('/api/products/list/florists',      60)),
        safe(fetchJSON('/api/events?limit=3',              0)),   // no cache for events
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

    initNewsletter();
    initRevealAnimations();
});

// ─── HERO STATS (fast load) ────────────────────────────────────────
function animateCounter(elementId, target) {
    const el = document.getElementById(elementId);
    if (!el) return;
    el.classList.remove('loading');
    
    if (target <= 0) {
        el.textContent = '0';
        return;
    }
    
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
    if (!stats) {
        ['statProducts', 'statSellers', 'statUsers', 'statCategories'].forEach(id => {
            const el = document.getElementById(id);
            if (el) { el.classList.remove('loading'); el.textContent = '—'; }
        });
        return;
    }

    // Update hero stats with animation if they are still in loading state
    const ids = ['statProducts', 'statSellers', 'statUsers', 'statCategories'];
    const values = [stats.products || 0, stats.sellers || 0, stats.users || 0, stats.categories || 0];
    
    ids.forEach((id, index) => {
        const el = document.getElementById(id);
        if (el && el.classList.contains('loading')) {
            animateCounter(id, values[index]);
        }
    });

    // Update trust count
    const trustEl = document.getElementById('trustCount');
    if (trustEl && stats.users) {
        trustEl.textContent = stats.users.toLocaleString() + '+';
    }

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
    
    if (data === null) {
        grid.innerHTML = '<p style="text-align:center;color:var(--text-muted);grid-column:1/-1;">Could not load categories <button class="btn btn-sm" onclick="location.reload()">Retry</button></p>';
        return;
    }
    
    let cats = normalizeArray(data, 'categories');
    if (!cats.length) {
        grid.innerHTML = '<p style="text-align:center;color:var(--text-muted);grid-column:1/-1;">No categories available</p>';
        return;
    }
    
    grid.innerHTML = cats.map(c => {
        const nameLower = (c.name || '').toLowerCase();
        const slug = CATEGORY_SLUGS[nameLower] || nameLower.replace(/\s+/g, '-');
        const img = CATEGORY_IMAGES[nameLower] || c.image_url || `https://source.unsplash.com/400x300/?flower,${encodeURIComponent(nameLower)}`;
        const tagline = c.description || CATEGORY_TAGLINES[nameLower] || '';
        return `
            <a href="category-listing.html?cat=${slug}" class="category-card">
                <div class="category-img"><img loading="lazy" src="${escapeHtml(img)}" alt="${escapeHtml(c.name)}" onerror="this.src='data:image/svg+xml,<svg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 400 300%22><rect fill=%22%23fce7f0%22 width=%22400%22 height=%22300%22/><text x=%22200%22 y=%22160%22 text-anchor=%22middle%22 fill=%22%23d8447c%22 font-size=%2224%22>🌸</text></svg>'"></div>
                <div class="category-overlay"><h3>${escapeHtml(c.name)}</h3><p>${escapeHtml(tagline)}</p></div>
            </a>`;
    }).join('');
}

// ─── PRODUCTS ───────────────────────────────────────────────────────
function renderFeaturedProducts(data) {
    const grid = document.getElementById('featuredProducts');
    if (!grid) return;
    
    if (data === null) {
        grid.innerHTML = '<p style="text-align:center;color:var(--text-muted);padding:2rem;grid-column:1/-1;">Could not load products <button class="btn btn-sm" onclick="location.reload()">Retry</button></p>';
        return;
    }
    
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
    
    if (data === null) {
        grid.innerHTML = '<p style="text-align:center;color:var(--text-muted);padding:2rem;grid-column:1/-1;">Could not load articles <button class="btn btn-sm" onclick="location.reload()">Retry</button></p>';
        return;
    }
    
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
    
    if (data === null) {
        grid.innerHTML = '<p style="text-align:center;color:var(--text-muted);padding:2rem;grid-column:1/-1;">Could not load videos <button class="btn btn-sm" onclick="location.reload()">Retry</button></p>';
        return;
    }
    
    const items = normalizeArray(data, 'videos').slice(0, 3);
    if (!items.length) {
        grid.innerHTML = '<p style="text-align:center;color:var(--text-muted);padding:2rem;grid-column:1/-1;">No videos available.</p>';
        return;
    }
    grid.innerHTML = items.map(v => `
        <a href="video-detail.html?id=${encodeURIComponent(v.id)}" class="article-card" style="text-decoration:none;color:inherit;">
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
        </a>
    `).join('');
}

// ─── COURSES ────────────────────────────────────────────────────────
function renderCourses(data) {
    const grid = document.getElementById('courseGrid');
    if (!grid) return;
    
    if (data === null) {
        grid.innerHTML = '<p style="text-align:center;color:var(--text-muted);padding:2rem;grid-column:1/-1;">Could not load courses <button class="btn btn-sm" onclick="location.reload()">Retry</button></p>';
        return;
    }
    
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
                    ${window.renderStars ? window.renderStars(c.rating || 0) : ''}
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
    
    if (data === null) {
        grid.innerHTML = '<p style="text-align:center;color:var(--text-muted);padding:2rem;grid-column:1/-1;">Could not load sellers <button class="btn btn-sm" onclick="location.reload()">Retry</button></p>';
        return;
    }
    
    let items = normalizeArray(data, 'florists');
    if (!items.length) {
        grid.innerHTML = '<p style="text-align:center;color:var(--text-muted);padding:2rem;">No sellers yet.</p>';
        return;
    }
    grid.innerHTML = items.slice(0, 4).map(f => `
        <a href="florist-profile.html?id=${f.id}" class="florist-card" style="text-decoration:none;color:inherit;">
            ${avatarHTML(f.name, f.image, 80)}
            <div class="florist-info" style="width:100%;">
                <h4>${escapeHtml(f.name)}</h4>
                <p style="margin-bottom:0.25rem;">${escapeHtml(f.role || f.specialty || 'Seller')}</p>
                <div style="color:var(--accent-gold);font-size:0.75rem;margin-bottom:0.5rem;">
                    ${window.renderStars ? window.renderStars(f.rating || 0) : ''}
                    <span style="color:var(--text-muted);"> (${f.reviews || 0} reviews)</span>
                </div>
                <span style="font-size:0.82rem;color:var(--primary-color);font-weight:500;">View Profile →</span>
            </div>
        </a>
    `).join('');
}

// ─── EVENTS ─────────────────────────────────────────────────────────
function renderEvents(data) {
    const grid = document.getElementById('eventsGrid');
    if (!grid) return;
    
    if (data === null) {
        grid.innerHTML = '<p style="text-align:center;color:var(--text-muted);padding:2rem;grid-column:1/-1;">Could not load events <button class="btn btn-sm" onclick="location.reload()">Retry</button></p>';
        return;
    }
    
    // Filter out past events
    const now = new Date();
    const items = normalizeArray(data, 'events').filter(e => {
        if (!e.date) return true;
        const eventDate = new Date(e.date);
        return isNaN(eventDate) || eventDate >= now;
    }).slice(0, 3);
    
    if (!items.length) {
        grid.innerHTML = '<p style="text-align:center;color:var(--text-muted);padding:2rem;grid-column:1/-1;">No upcoming events.</p>';
        return;
    }
    
    grid.innerHTML = items.map(e => `
        <a href="event-detail.html?id=${encodeURIComponent(e.id)}" class="event-card" style="text-decoration:none;color:inherit;">
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
                <p style="margin-bottom:0.25rem;"><i class="bi bi-geo-alt"></i> ${escapeHtml(e.location || 'Online')}</p>
                <div style="display:flex;justify-content:space-between;align-items:center;margin-top:0.5rem;font-size:0.85rem;">
                    <strong style="color:var(--primary-color);">${escapeHtml(e.price === 0 || e.price === '0' ? 'Free' : (e.price || ''))}</strong>
                    <span style="color:var(--text-muted);">${e.spots ? e.spots + ' spots left' : ''}</span>
                </div>
            </div>
        </a>
    `).join('');
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
