// js/care-guides.js
// Care Guides pages — listing, detail

let currentCategory = '';
let currentDifficulty = '';
let currentSort = 'newest';
let currentPage = 1;
let totalPages = 1;

function formatNumber(n) {
    if (n >= 1000) return (n / 1000).toFixed(1) + 'K';
    return String(n);
}

// ─── Care Guides Listing Page ─────────────────────────────────────────────

async function initCareGuidesPage() {
    loadCategories();
    loadGuides();

    document.getElementById('cgSearchBtn').addEventListener('click', () => { currentPage = 1; loadGuides(); });
    document.getElementById('cgSearch').addEventListener('keydown', (e) => {
        if (e.key === 'Enter') { currentPage = 1; loadGuides(); }
    });

    document.getElementById('categoryTabs').addEventListener('click', (e) => {
        const tab = e.target.closest('.category-tab');
        if (!tab) return;
        document.querySelectorAll('.category-tab').forEach(t => t.classList.remove('active'));
        tab.classList.add('active');
        currentCategory = tab.dataset.slug || '';
        currentPage = 1;
        loadGuides();
    });

    document.getElementById('difficultyFilters').addEventListener('click', (e) => {
        const btn = e.target.closest('.filter-btn');
        if (!btn) return;
        document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        currentDifficulty = btn.dataset.level || '';
        currentPage = 1;
        loadGuides();
    });
}

async function loadCategories() {
    let categories;
    try {
        const res = await fetch('/api/care-guides/categories');
        categories = await res.json();
    } catch {
        categories = [];
    }
    const tabs = document.getElementById('categoryTabs');
    tabs.innerHTML = `<button class="category-tab active" data-slug="">All Guides</button>` +
        categories.map(c => `<button class="category-tab" data-slug="${escapeHtml(c.slug || '')}">${c.icon || ''} ${escapeHtml(c.name)}</button>`).join('');
}

async function loadGuides() {
    const search = document.getElementById('cgSearch').value.trim();
    const params = new URLSearchParams({ sort: currentSort, page: currentPage, limit: 20 });
    if (currentCategory) params.set('category', currentCategory);
    if (currentDifficulty) params.set('difficulty', currentDifficulty);
    if (search) params.set('search', search);

    let data;
    try {
        const res = await fetch(`/api/care-guides?${params}`);
        data = await res.json();
    } catch {
        data = { guides: [], total: 0, pages: 1 };
    }

    const grid = document.getElementById('guidesGrid');
    if (!data.guides || !data.guides.length) {
        grid.innerHTML = '<div class="empty-state"><i class="bi bi-flower1"></i><h3>No care guides found</h3><p>Try a different search or category.</p></div>';
        document.getElementById('pagination').innerHTML = '';
        return;
    }

    totalPages = data.pages || 1;

    grid.innerHTML = data.guides.map(g => `
        <div class="guide-card" onclick="window.location.href='care-guide-detail.html?id=${escapeHtml(String(g.id || g.slug))}'">
            <div class="guide-img">
                <img loading="lazy" src="${escapeHtml(g.cover_image || 'https://images.unsplash.com/photo-1459411552884-841db9b3cc2a?q=600&auto=format&fit=crop')}" alt="${escapeHtml(g.title)}">
                ${g.difficulty ? `<span class="guide-badge">${escapeHtml(g.difficulty)}</span>` : ''}
            </div>
            <div class="guide-body">
                <span class="guide-cat">${escapeHtml(g.category_name || '')} ${escapeHtml(g.category_icon || '')}</span>
                <h3>${escapeHtml(g.title)}</h3>
                ${g.plant_name ? `<div class="guide-plant"><i class="bi bi-flower2"></i> ${escapeHtml(g.plant_name)}</div>` : ''}
                <div class="guide-excerpt">${escapeHtml((g.excerpt || '').slice(0, 120))}${(g.excerpt || '').length > 120 ? '...' : ''}</div>
                <div class="care-meta">
                    ${g.light ? `<span><i class="bi bi-sun"></i> ${escapeHtml(g.light.split('(')[0].trim())}</span>` : ''}
                    ${g.water ? `<span><i class="bi bi-droplet"></i> ${escapeHtml(g.water.split(',')[0].trim())}</span>` : ''}
                </div>
                <div class="guide-footer">
                    <span style="font-size:0.78rem;color:var(--text-muted);"><i class="bi bi-clock"></i> ${g.reading_time || '5'} min read</span>
                    <span class="difficulty">${escapeHtml(g.difficulty || 'Beginner')}</span>
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
    loadGuides();
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

// ─── Care Guide Detail Page ───────────────────────────────────────────────

async function initCareGuideDetail() {
    const params = new URLSearchParams(window.location.search);
    const id = params.get('id');
    if (!id) {
        document.getElementById('guideContent').innerHTML = '<div class="empty-state"><h3>Guide not found</h3></div>';
        return;
    }

    let guide;
    try {
        const res = await fetch(`/api/care-guides/${id}`);
        if (!res.ok) throw new Error('Not found');
        guide = await res.json();
    } catch {
        document.getElementById('guideContent').innerHTML = '<div class="empty-state"><i class="bi bi-flower1"></i><h3>Guide not found</h3><p>This guide may have been removed.</p></div>';
        return;
    }

    document.title = `${guide.title} | Flower Ecosystem`;

    const tips = guide.tips || [];
    const contentHtml = renderMarkdown(guide.content || '');

    document.getElementById('guideContent').innerHTML = `
        <a href="care-guides.html" class="back-link"><i class="bi bi-arrow-left"></i> Back to Care Guides</a>

        <div class="guide-hero">
            <img src="${escapeHtml(guide.cover_image || 'https://images.unsplash.com/photo-1459411552884-841db9b3cc2a?q=1200&auto=format&fit=crop')}" alt="${escapeHtml(guide.title)}">
            <div class="guide-hero-overlay">
                ${guide.category_name ? `<span class="cat-badge">${escapeHtml(guide.category_icon || '')} ${escapeHtml(guide.category_name)}</span>` : ''}
                <h1>${escapeHtml(guide.title)}</h1>
                <div class="guide-hero-meta">
                    <span><i class="bi bi-person"></i> ${escapeHtml(guide.author_name || 'Flower Ecosystem Team')}</span>
                    <span><i class="bi bi-clock"></i> ${guide.reading_time || '5'} min read</span>
                    <span><i class="bi bi-bar-chart"></i> ${escapeHtml(guide.difficulty || 'Beginner')}</span>
                    <span><i class="bi bi-eye"></i> ${formatNumber(guide.views || 0)} views</span>
                </div>
            </div>
        </div>

        <div class="detail-layout">
            <div class="detail-main">
                ${guide.excerpt ? `<div class="care-card"><p style="font-size:1.05rem;font-family:var(--font-serif);font-style:italic;color:var(--text-main);line-height:1.7;">${escapeHtml(guide.excerpt)}</p></div>` : ''}

                <div class="care-card">
                    <h2><i class="bi bi-card-text" style="color:var(--primary-color)"></i> Care Instructions</h2>
                    <div class="content-text">${contentHtml}</div>
                </div>

                ${tips.length ? `
                    <div class="care-card">
                        <h2><i class="bi bi-lightbulb" style="color:var(--accent-gold)"></i> Quick Tips</h2>
                        <ul class="tips-list">
                            ${tips.map(t => `
                                <li>
                                    <div class="tip-icon ${t.tip_type === 'warning' ? 'warning' : 'tip'}">
                                        <i class="bi bi-${t.tip_type === 'warning' ? 'exclamation-triangle' : 'check-circle'}"></i>
                                    </div>
                                    <span>${escapeHtml(t.tip_text || t.text || t)}</span>
                                </li>
                            `).join('')}
                        </ul>
                    </div>
                ` : ''}

                <div class="share-bar">
                    <span style="font-weight:500;font-size:0.9rem;">Share:</span>
                    <a href="https://twitter.com/intent/tweet?text=${encodeURIComponent(guide.title)}&url=${encodeURIComponent(window.location.href)}" target="_blank" class="btn btn-outline btn-sm"><i class="bi bi-twitter-x"></i> Twitter</a>
                    <a href="https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(window.location.href)}" target="_blank" class="btn btn-outline btn-sm"><i class="bi bi-facebook"></i> Facebook</a>
                    <button class="btn btn-outline btn-sm" onclick="navigator.clipboard.writeText(window.location.href);alert('Link copied!')"><i class="bi bi-link-45deg"></i> Copy Link</button>
                </div>

                <div id="relatedSection" style="margin-top:2rem;"></div>
            </div>

            <div class="detail-sidebar">
                <div class="care-card" style="position:sticky;top:100px;">
                    <h2><i class="bi bi-info-circle" style="color:var(--primary-color)"></i> Plant Info</h2>
                    <div class="care-params">
                        ${guide.light ? `<div class="care-param"><div class="icon light"><i class="bi bi-sun"></i></div><div><div class="label">Light</div><div class="value">${escapeHtml(guide.light)}</div></div></div>` : ''}
                        ${guide.water ? `<div class="care-param"><div class="icon water"><i class="bi bi-droplet"></i></div><div><div class="label">Water</div><div class="value">${escapeHtml(guide.water)}</div></div></div>` : ''}
                        ${guide.temperature ? `<div class="care-param"><div class="icon temp"><i class="bi bi-thermometer-half"></i></div><div><div class="label">Temperature</div><div class="value">${escapeHtml(guide.temperature)}</div></div></div>` : ''}
                        ${guide.humidity ? `<div class="care-param"><div class="icon humid"><i class="bi bi-moisture"></i></div><div><div class="label">Humidity</div><div class="value">${escapeHtml(guide.humidity)}</div></div></div>` : ''}
                        ${guide.soil ? `<div class="care-param" style="grid-column:1/-1;"><div class="icon soil"><i class="bi bi-globe2"></i></div><div><div class="label">Soil</div><div class="value">${escapeHtml(guide.soil)}</div></div></div>` : ''}
                    </div>
                </div>

                <div class="care-card">
                    <h2><i class="bi bi-person-badge" style="color:var(--primary-color)"></i> Written By</h2>
                    <div style="display:flex;gap:0.75rem;align-items:center;">
                        <div style="width:44px;height:44px;border-radius:50%;background:var(--bg-light);display:flex;align-items:center;justify-content:center;font-size:1.2rem;flex-shrink:0;">${(guide.author_name || 'T')[0].toUpperCase()}</div>
                        <div>
                            <div style="font-weight:600;font-size:0.95rem;">${escapeHtml(guide.author_name || 'Flower Ecosystem Team')}</div>
                            <div style="font-size:0.8rem;color:var(--primary-color);">${escapeHtml(guide.author_title || 'Plant Specialist')}</div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    `;

    loadRelatedGuides(guide.id);
}

function renderMarkdown(text) {
    if (!text) return '';
    let html = escapeHtml(text);
    html = html.replace(/^### (.+)$/gm, '<h3>$1</h3>');
    html = html.replace(/^## (.+)$/gm, '<h2>$1</h2>');
    html = html.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
    html = html.replace(/^- (.+)$/gm, '<li>$1</li>');
    html = html.replace(/\n\n/g, '</p><p>');
    html = '<p>' + html + '</p>';
    html = html.replace(/<p><(h[23]|ul|ol)/g, '<$1');
    html = html.replace(/<\/(h[23]|ul|ol)><\/p>/g, '</$1>');
    html = html.replace(/<p>\s*<\/p>/g, '');
    return html;
}

async function loadRelatedGuides(id) {
    try {
        const res = await fetch(`/api/care-guides/${id}/related`);
        const guides = await res.json();
        if (!guides.length) return;

        document.getElementById('relatedSection').innerHTML = `
            <div class="care-card">
                <h2 style="font-size:1.1rem;margin-bottom:1rem;"><i class="bi bi-flower1" style="color:var(--primary-color)"></i> Related Guides</h2>
                <div style="display:grid;grid-template-columns:1fr 1fr;gap:0.75rem;">
                    ${guides.map(g => `
                        <a href="care-guide-detail.html?id=${escapeHtml(String(g.id || g.slug))}" class="related-card">
                            <div class="related-img"><img src="${escapeHtml(g.cover_image || 'https://images.unsplash.com/photo-1459411552884-841db9b3cc2a?q=200&auto=format&fit=crop')}" alt="${escapeHtml(g.title)}" loading="lazy"></div>
                            <div class="related-info">
                                <h4>${escapeHtml(g.title)}</h4>
                                <div class="meta">${escapeHtml(g.category_name || '')} · ${g.reading_time || '5'} min</div>
                            </div>
                        </a>
                    `).join('')}
                </div>
            </div>
        `;
    } catch {}
}
