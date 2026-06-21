// js/articles.js
// Articles & Guides pages — listing, detail

let currentCategory = '';
let currentSort = 'newest';
let currentPage = 1;
let totalPages = 1;

function escapeHtml(str) {
    if (typeof str !== 'string') return String(str || '');
    const div = document.createElement('div');
    div.appendChild(document.createTextNode(str));
    return div.innerHTML;
}

function formatNumber(n) {
    if (n >= 1000) return (n / 1000).toFixed(1) + 'K';
    return String(n);
}

function formatDate(dateStr) {
    if (!dateStr) return '';
    return new Date(dateStr).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

// ─── Articles Listing Page ────────────────────────────────────────────────

async function initArticlesPage() {
    loadCategories();
    loadFeaturedArticles();
    loadArticles();

    document.getElementById('articleSearchBtn').addEventListener('click', () => { currentPage = 1; loadArticles(); });
    document.getElementById('articleSearch').addEventListener('keydown', (e) => {
        if (e.key === 'Enter') { currentPage = 1; loadArticles(); }
    });

    document.getElementById('categoryCards').addEventListener('click', (e) => {
        const card = e.target.closest('.cat-card');
        if (!card) return;
        document.querySelectorAll('.cat-card').forEach(c => c.classList.remove('active'));
        card.classList.add('active');
        currentCategory = card.dataset.slug || '';
        currentPage = 1;
        loadArticles();
    });

    document.getElementById('sortTabs').addEventListener('click', (e) => {
        const tab = e.target.closest('.sort-tab');
        if (!tab) return;
        document.querySelectorAll('.sort-tab').forEach(t => t.classList.remove('active'));
        tab.classList.add('active');
        currentSort = tab.dataset.sort;
        currentPage = 1;
        loadArticles();
    });
}

async function loadCategories() {
    let categories;
    try {
        const res = await fetch('/api/articles/categories');
        categories = await res.json();
    } catch {
        categories = [];
    }
    const el = document.getElementById('categoryCards');
    el.innerHTML = `<div class="cat-card active" data-slug=""><span class="cat-icon">📚</span><span class="cat-name">All Articles</span></div>` +
        categories.map(c => `<div class="cat-card" data-slug="${escapeHtml(c.slug || '')}"><span class="cat-icon">${c.icon || '📄'}</span><span class="cat-name">${escapeHtml(c.name)}</span></div>`).join('');
}

async function loadFeaturedArticles() {
    try {
        const res = await fetch('/api/articles/featured');
        const articles = await res.json();
        if (!articles.length) return;

        document.getElementById('featuredSection').innerHTML = `
            <div class="featured-grid reveal-up">
                ${articles.slice(0, 4).map(a => `
                    <div class="featured-card" onclick="window.location.href='article-detail.html?id=${escapeHtml(String(a.id || a.slug))}'">
                        <img loading="lazy" src="${escapeHtml(a.thumbnail_url || a.image || 'https://images.unsplash.com/photo-1490750967868-88df5691a78b?q=800&auto=format&fit=crop')}" alt="${escapeHtml(a.title)}">
                        <div class="featured-overlay">
                            <span class="featured-cat">${escapeHtml(a.category_name || a.tag || a.category || '')}</span>
                            <h3>${escapeHtml(a.title)}</h3>
                            <div class="meta">${escapeHtml(a.author_name || a.author || 'Flower Ecosystem Team')} · ${a.reading_time || a.readTime || '5 min read'}</div>
                        </div>
                    </div>
                `).join('')}
            </div>
        `;
    } catch {}
}

async function loadArticles() {
    const search = document.getElementById('articleSearch').value.trim();
    const params = new URLSearchParams({ sort: currentSort, page: currentPage, limit: 20 });
    if (currentCategory) params.set('category', currentCategory);
    if (search) params.set('search', search);

    let data;
    try {
        const res = await fetch(`/api/articles?${params}`);
        data = await res.json();
    } catch {
        data = { articles: [], total: 0, pages: 1 };
    }

    const grid = document.getElementById('articlesGrid');
    if (!data.articles || !data.articles.length) {
        grid.innerHTML = '<div class="empty-state"><i class="bi bi-journal-text"></i><h3>No articles found</h3><p>Try a different search or category.</p></div>';
        document.getElementById('pagination').innerHTML = '';
        return;
    }

    totalPages = data.pages || 1;

    grid.innerHTML = data.articles.map(a => `
        <div class="article-card" onclick="window.location.href='article-detail.html?id=${escapeHtml(String(a.id || a.slug))}'">
            <div class="article-img">
                <img loading="lazy" src="${escapeHtml(a.thumbnail_url || a.image || 'https://images.unsplash.com/photo-1490750967868-88df5691a78b?q=600&auto=format&fit=crop')}" alt="${escapeHtml(a.title)}">
            </div>
            <div class="article-body">
                <span class="article-cat">${escapeHtml(a.category_name || a.tag || a.category || '')}</span>
                <h3>${escapeHtml(a.title)}</h3>
                <div class="article-excerpt">${escapeHtml(a.excerpt || a.description || '').slice(0, 120)}${(a.excerpt || a.description || '').length > 120 ? '...' : ''}</div>
                <div class="article-meta">
                    <span><i class="bi bi-person"></i> ${escapeHtml(a.author_name || a.author || 'Team')}</span>
                    <span><i class="bi bi-clock"></i> ${a.reading_time || a.readTime || '5'} min read</span>
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
    loadArticles();
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

// ─── Article Detail Page ──────────────────────────────────────────────────

async function initArticleDetail() {
    const params = new URLSearchParams(window.location.search);
    const id = params.get('id');
    if (!id) {
        document.getElementById('articleContent').innerHTML = '<div class="empty-state"><h3>Article not found</h3></div>';
        return;
    }

    let article;
    try {
        const res = await fetch(`/api/articles/${id}`);
        if (!res.ok) throw new Error('Not found');
        article = await res.json();
    } catch {
        document.getElementById('articleContent').innerHTML = '<div class="empty-state"><i class="bi bi-journal-text"></i><h3>Article not found</h3><p>This article may have been removed.</p></div>';
        return;
    }

    document.title = `${article.title} | Flower Ecosystem`;

    let toc = [];
    try { toc = article.table_of_contents ? (typeof article.table_of_contents === 'string' ? JSON.parse(article.table_of_contents) : article.table_of_contents) : []; } catch { toc = []; }

    const contentHtml = renderMarkdown(article.content || article.description || '');

    document.getElementById('articleContent').innerHTML = `
        <div class="article-hero">
            <img src="${escapeHtml(article.thumbnail_url || article.image || 'https://images.unsplash.com/photo-1490750967868-88df5691a78b?q=1200&auto=format&fit=crop')}" alt="${escapeHtml(article.title)}">
            <div class="article-hero-overlay">
                ${article.category_name ? `<span class="cat-badge">${escapeHtml(article.category_icon || '')} ${escapeHtml(article.category_name)}</span>` : ''}
                <h1>${escapeHtml(article.title)}</h1>
                <div class="article-hero-meta">
                    <span><i class="bi bi-person"></i> ${escapeHtml(article.author_name || 'Flower Ecosystem Team')}</span>
                    <span><i class="bi bi-clock"></i> ${article.reading_time || '5'} min read</span>
                    <span><i class="bi bi-calendar"></i> ${formatDate(article.published_at)}</span>
                    <span><i class="bi bi-eye"></i> ${formatNumber(article.views || 0)} views</span>
                </div>
            </div>
        </div>

        <div class="detail-layout">
            <div class="detail-main">
                ${article.excerpt ? `<div class="content-card"><p style="font-size:1.05rem;font-family:var(--font-serif);font-style:italic;color:var(--text-main);line-height:1.7;">${escapeHtml(article.excerpt)}</p></div>` : ''}

                <div class="content-card">
                    <div class="content-text">${contentHtml}</div>
                </div>

                <div class="share-bar">
                    <span style="font-weight:500;font-size:0.9rem;">Share:</span>
                    <a href="https://twitter.com/intent/tweet?text=${encodeURIComponent(article.title)}&url=${encodeURIComponent(window.location.href)}" target="_blank" class="btn btn-outline btn-sm"><i class="bi bi-twitter-x"></i> Twitter</a>
                    <a href="https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(window.location.href)}" target="_blank" class="btn btn-outline btn-sm"><i class="bi bi-facebook"></i> Facebook</a>
                    <button class="btn btn-outline btn-sm" onclick="navigator.clipboard.writeText(window.location.href);alert('Link copied!')"><i class="bi bi-link-45deg"></i> Copy Link</button>
                </div>

                <div id="relatedSection" style="margin-top:2rem;"></div>
            </div>

            <div class="detail-sidebar">
                ${toc.length ? `
                    <div class="toc-card">
                        <h3><i class="bi bi-list-nested" style="color:var(--primary-color)"></i> Table of Contents</h3>
                        <ol class="toc-list">
                            ${toc.map(item => `<li><a href="#${escapeHtml(item.id || '')}">${escapeHtml(item.title)}</a></li>`).join('')}
                        </ol>
                    </div>
                ` : ''}

                <div class="author-card">
                    <h3><i class="bi bi-person-badge" style="color:var(--primary-color)"></i> Written By</h3>
                    <div class="author-block">
                        <div class="author-avatar">${article.author_avatar ? `<img src="${escapeHtml(article.author_avatar)}" alt="${escapeHtml(article.author_name)}">` : (article.author_name || 'T')[0].toUpperCase()}</div>
                        <div>
                            <div class="author-name">${escapeHtml(article.author_name || 'Flower Ecosystem Team')}</div>
                            <div class="author-title">${escapeHtml(article.author_title || 'Content Team')}</div>
                        </div>
                    </div>
                </div>

                <div id="downloadsSection"></div>
            </div>
        </div>
    `;

    loadRelatedArticles(article.id);
    loadDownloads(article);
}

function renderMarkdown(text) {
    if (!text) return '';
    let html = escapeHtml(text);

    // Headers
    html = html.replace(/^### (.+)$/gm, '<h3 id="s$1">$1</h3>');
    html = html.replace(/^## (.+)$/gm, '<h2>$1</h2>');

    // Bold
    html = html.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');

    // Lists
    html = html.replace(/^- (.+)$/gm, '<li>$1</li>');
    html = html.replace(/(<li>.*<\/li>\n?)+/g, '<ul>$&</ul>');

    // Tables
    html = html.replace(/\|(.+)\|\n\|[-| ]+\|\n((\|.+\|\n?)+)/g, (_, header, rows) => {
        const ths = header.split('|').filter(s => s.trim()).map(s => `<th>${s.trim()}</th>`).join('');
        const trs = rows.trim().split('\n').map(row => {
            const tds = row.split('|').filter(s => s.trim()).map(s => `<td>${s.trim()}</td>`).join('');
            return `<tr>${tds}</tr>`;
        }).join('');
        return `<table><thead><tr>${ths}</tr></thead><tbody>${trs}</tbody></table>`;
    });

    // Paragraphs
    html = html.replace(/\n\n/g, '</p><p>');
    html = '<p>' + html + '</p>';

    // Clean up
    html = html.replace(/<p><(h[23]|ul|ol|table|blockquote)/g, '<$1');
    html = html.replace(/<\/(h[23]|ul|ol|table|blockquote)><\/p>/g, '</$1>');
    html = html.replace(/<p>\s*<\/p>/g, '');

    return html;
}

async function loadRelatedArticles(id) {
    try {
        const res = await fetch(`/api/articles/${id}/related`);
        const articles = await res.json();
        if (!articles.length) return;

        document.getElementById('relatedSection').innerHTML = `
            <div class="content-card">
                <h2 style="font-size:1.1rem;margin-bottom:1rem;"><i class="bi bi-journal-richtext" style="color:var(--primary-color)"></i> Related Articles</h2>
                <div class="related-grid">
                    ${articles.map(a => `
                        <a href="article-detail.html?id=${escapeHtml(String(a.id || a.slug))}" class="related-card">
                            <div class="related-img"><img src="${escapeHtml(a.thumbnail_url || 'https://images.unsplash.com/photo-1490750967868-88df5691a78b?q=200&auto=format&fit=crop')}" alt="${escapeHtml(a.title)}" loading="lazy"></div>
                            <div class="related-info">
                                <h4>${escapeHtml(a.title)}</h4>
                                <div class="meta">${escapeHtml(a.category_name || '')} · ${a.reading_time || '5'} min read</div>
                            </div>
                        </a>
                    `).join('')}
                </div>
            </div>
        `;
    } catch {}
}

function loadDownloads(article) {
    const downloads = article.downloads || [];
    if (!downloads.length) return;

    document.getElementById('downloadsSection').innerHTML = `
        <div class="toc-card">
            <h3><i class="bi bi-download" style="color:var(--primary-color)"></i> Downloads</h3>
            <div style="display:flex;flex-direction:column;gap:0.5rem;">
                ${downloads.map(d => `
                    <div class="download-card" onclick="window.open('${escapeHtml(d.file_url)}', '_blank')">
                        <div class="download-icon"><i class="bi bi-file-earmark-${d.file_type === 'pdf' ? 'pdf' : 'text'}"></i></div>
                        <div>
                            <div style="font-size:0.85rem;font-weight:500;">${escapeHtml(d.file_name)}</div>
                            <div style="font-size:0.75rem;color:var(--text-muted);">${d.file_size || ''}</div>
                        </div>
                    </div>
                `).join('')}
            </div>
        </div>
    `;
}
