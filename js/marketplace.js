// js/marketplace.js
// Marketplace page — filters, sorting, search, pagination, product grid

const PER_PAGE = 6;

function productCardHTML(p) {
    return `
    <div class="product-card">
        <div class="product-img-wrap">
            <a href="/product-detail.html?id=${escapeHtml(p.id)}">
                <img loading="lazy" src="${escapeHtml(p.image || '/images/placeholder.svg')}" alt="${escapeHtml(p.name)}" class="product-img">
            </a>
            ${p.badge ? `<span class="product-badge">${escapeHtml(p.badge)}</span>` : ''}
            <button class="wishlist-btn" data-id="${escapeHtml(p.id)}" aria-label="Add to wishlist"
                style="position:absolute;top:0.75rem;right:0.75rem;background:rgba(255,255,255,0.9);border:none;border-radius:50%;width:32px;height:32px;cursor:pointer;font-size:1rem;display:flex;align-items:center;justify-content:center;">
                <i class="bi bi-heart" style="color:var(--primary-color);"></i>
            </button>
        </div>
        <div class="product-info">
            <a href="/product-detail.html?id=${escapeHtml(p.id)}" style="text-decoration:none;color:inherit;">
                <h3 class="product-name">${escapeHtml(p.name)}</h3>
            </a>
            <p class="product-seller">by ${escapeHtml(p.seller)}</p>
            <div class="product-rating" style="margin:0.25rem 0;">${renderStars(p.rating)}
                <span style="font-size:0.8rem;color:var(--text-light);">(${escapeHtml(String(p.reviews))})</span>
            </div>
            <div class="product-footer">
                <span class="product-price">${Number(p.price).toFixed(2)}</span>
                <button class="btn btn-primary btn-sm add-to-cart-btn"
                    data-id="${escapeHtml(p.id)}" data-name="${escapeHtml(p.name)}" data-price="${p.price}" data-image="${escapeHtml(p.image || '/images/placeholder.svg')}">
                    Add to Cart
                </button>
            </div>
        </div>
    </div>`;
}

function renderToGrid(id, items, limit) {
    const el = document.getElementById(id);
    if (!el) return;
    const list = limit ? items.slice(0, limit) : items;
    el.innerHTML = list.length
        ? list.map(productCardHTML).join('')
        : '<p style="text-align:center;color:var(--text-light);padding:2rem 0;grid-column:1/-1">No products to show.</p>';
}

function skeletonCards(count) {
    let html = '';
    for (let i = 0; i < count; i++) {
        html += `<div class="product-card skeleton-card">
            <div class="skeleton-img skeleton-pulse"></div>
            <div class="product-info">
                <div class="skeleton-line skeleton-line-lg skeleton-pulse"></div>
                <div class="skeleton-line skeleton-line-sm skeleton-pulse"></div>
                <div class="skeleton-line skeleton-line-xs skeleton-pulse"></div>
                <div class="product-footer" style="margin-top:auto;">
                    <div class="skeleton-line skeleton-line-md skeleton-pulse"></div>
                    <div class="skeleton-btn skeleton-pulse"></div>
                </div>
            </div>
        </div>`;
    }
    return html;
}

function showGridSpinner(targetGrid) {
    const el = targetGrid || document.getElementById('productGrid');
    if (el) el.innerHTML = skeletonCards(6);
}

(async () => {
    ['featuredGrid', 'bestsellerGrid', 'newArrivalGrid', 'productGrid'].forEach(id => {
        const el = document.getElementById(id);
        if (el) el.innerHTML = skeletonCards(id === 'productGrid' ? 6 : 4);
    });

    let products, categories;
    try {
        [products, categories] = await Promise.allSettled([api.fetchProducts(), api.fetchCategories()]);
        products = products.status === 'fulfilled' ? products.value : null;
        categories = categories.status === 'fulfilled' ? categories.value : null;
        if (products && !Array.isArray(products) && Array.isArray(products.products)) {
            products = products.products;
        }
        if (!Array.isArray(products) || !products.length) {
            products = [];
        }
    } catch (err) {
        products = [];
    }

    if (!products.length) {
        const emptyHTML = `<div style="grid-column:1/-1;text-align:center;padding:3rem 1rem;">
            <i class="bi bi-flower1" style="font-size:2rem;color:var(--text-light);"></i>
            <p style="margin:0.75rem 0 0;color:var(--text-light);">No products available right now. Check back soon!</p>
        </div>`;
        ['featuredGrid', 'bestsellerGrid', 'newArrivalGrid', 'productGrid'].forEach(id => {
            const el = document.getElementById(id);
            if (el) el.innerHTML = emptyHTML;
        });
        return;
    }

    // Category grid (only present on pages that have #categoryGrid)
    const catGrid = document.getElementById('categoryGrid');
    if (catGrid && categories) {
        catGrid.innerHTML = categories.map(c => `
            <a href="/marketplace?cat=${escapeHtml(String(c.id).replace('cat-', ''))}" class="category-card">
                <div class="category-img"><img loading="lazy" src="${escapeHtml(c.image)}" alt="${escapeHtml(c.name)}"></div>
                <div class="category-overlay"><h3>${escapeHtml(c.name)}</h3><p>${escapeHtml(c.tagline)}</p></div>
            </a>`
        ).join('');
    }

    // Seller filter
    const sellerFilter = document.getElementById('sellerFilter');
    if (sellerFilter) {
        const sellers = [...new Set(products.map(p => p.seller))];
        sellerFilter.innerHTML = '<option value="all">All Sellers</option>' +
            sellers.map(s => `<option value="${escapeHtml(s)}">${escapeHtml(s)}</option>`).join('');
    }

    // Featured / Best Sellers / New Arrivals
    renderToGrid('featuredGrid', products.filter(p => p.featured), 4);
    renderToGrid('bestsellerGrid', products.filter(p => p.bestSeller), 4);
    renderToGrid('newArrivalGrid', products.filter(p => p.newArrival), 4);

    // ─── Filters & Search ───────────────────────────────────────────────
    const grid = document.getElementById('productGrid');
    const catFilter = document.getElementById('categoryFilter');
    const occasionFilter = document.getElementById('occasionFilter');
    const colorFilter = document.getElementById('colorFilter');
    const typeFilter = document.getElementById('typeFilter');
    const priceFil = document.getElementById('priceFilter');
    const sellerFil = document.getElementById('sellerFilter');
    const sortFil = document.getElementById('sortFilter');
    const paginationEl = document.getElementById('pagination');
    const productCount = document.getElementById('productCount');
    const heroSearch = document.getElementById('heroSearch');
    const nameFilter = document.getElementById('nameFilter');
    const activeFiltersEl = document.getElementById('activeFilters');

    let filtered = [...products];
    let currentPage = 1;
    let searchQuery = '';

    function getNameQuery() {
        if (nameFilter && nameFilter.value.trim()) return nameFilter.value.trim();
        return searchQuery;
    }

    const filterLabels = {
        name: { el: nameFilter, label: 'Product' },
        category: { el: catFilter, label: 'Category' },
        occasion: { el: occasionFilter, label: 'Occasion' },
        color: { el: colorFilter, label: 'Color' },
        type: { el: typeFilter, label: 'Type' },
        price: { el: priceFil, label: 'Price' },
        seller: { el: sellerFil, label: 'Seller' }
    };

    function getActiveFilterChips() {
        const chips = [];
        if (searchQuery) chips.push({ key: 'search', label: `"${searchQuery}"`, clear: () => { searchQuery = ''; if (heroSearch) heroSearch.value = ''; } });
        for (const [key, { el, label }] of Object.entries(filterLabels)) {
            if (el && el.value !== 'all') {
                const optText = el.options[el.selectedIndex]?.text || el.value;
                chips.push({ key, label: `${label}: ${optText}`, clear: () => { el.value = 'all'; applyFilters(); } });
            }
        }
        return chips;
    }

    function renderActiveFilters() {
        if (!activeFiltersEl) return;
        const chips = getActiveFilterChips();
        activeFiltersEl.innerHTML = chips.map(c =>
            `<span class="filter-chip" data-key="${c.key}" style="display:inline-flex;align-items:center;gap:0.35rem;background:var(--primary-color);color:white;padding:0.3rem 0.7rem;border-radius:50px;font-size:0.875rem;font-weight:500;cursor:pointer;">
                ${escapeHtml(c.label)} <i class="bi bi-x" style="font-size:0.9rem;"></i>
            </span>`
        ).join('');
        activeFiltersEl.querySelectorAll('.filter-chip').forEach(chip => {
            chip.addEventListener('click', () => {
                const key = chip.dataset.key;
                const chipData = chips.find(c => c.key === key);
                if (chipData) { chipData.clear(); if (key !== 'search') applyFilters(); else applyFilters(); }
            });
        });
    }

    function applyFilters() {
        const q = getNameQuery().toLowerCase();
        filtered = products.filter(p => {
            if (q) {
                const haystack = `${p.name} ${p.description || ''} ${p.seller} ${p.category || ''}`.toLowerCase();
                if (!haystack.includes(q)) return false;
            }
            if (catFilter?.value !== 'all' && p.category !== catFilter.value) return false;
            if (occasionFilter?.value !== 'all' && p.occasion !== occasionFilter.value) return false;
            if (colorFilter?.value !== 'all' && p.color !== colorFilter.value) return false;
            if (typeFilter?.value !== 'all') {
                if (typeFilter.value === 'fresh' && !p.fresh) return false;
                if (typeFilter.value === 'artificial' && p.fresh) return false;
            }
            if (priceFil?.value !== 'all') {
                const v = priceFil.value;
                if (v.endsWith('+')) { if (p.price < Number(v.slice(0, -1))) return false; }
                else { const [min, max] = v.split('-').map(Number); if (p.price < min || p.price > max) return false; }
            }
            if (sellerFil?.value !== 'all' && p.seller !== sellerFil.value) return false;
            return true;
        });

        const sort = sortFil?.value;
        if (sort === 'price-asc') filtered.sort((a, b) => a.price - b.price);
        else if (sort === 'price-desc') filtered.sort((a, b) => b.price - a.price);
        else if (sort === 'rating') filtered.sort((a, b) => b.rating - a.rating);
        else if (sort === 'newest') filtered.sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0));

        currentPage = 1;
        showGridSpinner();
        requestAnimationFrame(() => {
            renderGrid();
            renderActiveFilters();
            renderPagination();
            if (productCount) productCount.textContent = `${filtered.length} product${filtered.length !== 1 ? 's' : ''} found`;
        });
    }

    function renderGrid() {
        if (!grid) return;
        const start = (currentPage - 1) * PER_PAGE;
        const items = filtered.slice(start, start + PER_PAGE);
        
        if (items.length) {
            grid.innerHTML = items.map(productCardHTML).join('');
        } else if (typeof EmptyState !== 'undefined') {
            const emptyState = EmptyState.products();
            grid.innerHTML = '';
            grid.appendChild(emptyState);
        } else {
            grid.innerHTML = '<p style="text-align:center;color:var(--text-light);padding:3rem 0;grid-column:1/-1">No products match your filters. Try adjusting them.</p>';
        }
    }

    function renderPagination() {
        if (!paginationEl) return;
        const totalPages = Math.ceil(filtered.length / PER_PAGE);
        if (totalPages <= 1) { paginationEl.innerHTML = ''; return; }

        const start = (currentPage - 1) * PER_PAGE + 1;
        const end = Math.min(currentPage * PER_PAGE, filtered.length);

        let pages = '';
        const maxVisible = 5;
        let startPage = Math.max(1, currentPage - Math.floor(maxVisible / 2));
        let endPage = Math.min(totalPages, startPage + maxVisible - 1);
        if (endPage - startPage < maxVisible - 1) startPage = Math.max(1, endPage - maxVisible + 1);

        if (currentPage > 1) pages += `<button class="mkt-page-btn" data-page="${currentPage - 1}"><i class="bi bi-chevron-left"></i></button>`;
        if (startPage > 1) { pages += `<button class="mkt-page-btn" data-page="1">1</button>`; if (startPage > 2) pages += `<span class="mkt-page-dots">...</span>`; }
        for (let i = startPage; i <= endPage; i++) {
            pages += `<button class="mkt-page-btn${i === currentPage ? ' active' : ''}" data-page="${i}">${i}</button>`;
        }
        if (endPage < totalPages) { if (endPage < totalPages - 1) pages += `<span class="mkt-page-dots">...</span>`; pages += `<button class="mkt-page-btn" data-page="${totalPages}">${totalPages}</button>`; }
        if (currentPage < totalPages) pages += `<button class="mkt-page-btn" data-page="${currentPage + 1}"><i class="bi bi-chevron-right"></i></button>`;

        paginationEl.innerHTML = `
            <div class="mkt-pagination-inner">
                <span class="mkt-page-info">Showing ${start}–${end} of ${filtered.length}</span>
                <div class="mkt-page-btns">${pages}</div>
            </div>`;
    }

    paginationEl?.addEventListener('click', (e) => {
        const btn = e.target.closest('.mkt-page-btn');
        if (!btn) return;
        const page = parseInt(btn.dataset.page, 10);
        if (isNaN(page) || page < 1 || page > Math.ceil(filtered.length / PER_PAGE)) return;
        currentPage = page;
        showGridSpinner();
        requestAnimationFrame(() => {
            renderGrid();
            renderPagination();
            grid.scrollIntoView({ behavior: 'smooth', block: 'start' });
        });
    });

    // Clear all filters
    document.getElementById('clearFiltersBtn')?.addEventListener('click', () => {
        searchQuery = '';
        if (heroSearch) heroSearch.value = '';
        if (nameFilter) nameFilter.value = '';
        [catFilter, occasionFilter, colorFilter, typeFilter, priceFil, sellerFil, sortFil]
            .filter(Boolean).forEach(el => { el.value = el.options[0].value; });
        syncCategoryPills('all');
        updateURL();
        applyFilters();
    });

    // Name filter input
    let nameTimeout;
    if (nameFilter) {
        nameFilter.addEventListener('input', () => {
            clearTimeout(nameTimeout);
            nameTimeout = setTimeout(() => {
                if (heroSearch && !heroSearch.value.trim()) {
                    heroSearch.value = nameFilter.value;
                    searchQuery = nameFilter.value.trim();
                }
                updateURL();
                applyFilters();
            }, 200);
        });
        nameFilter.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
                e.preventDefault();
                clearTimeout(nameTimeout);
                if (heroSearch && !heroSearch.value.trim()) {
                    heroSearch.value = nameFilter.value;
                    searchQuery = nameFilter.value.trim();
                }
                updateURL();
                applyFilters();
            }
        });
    }

    // Category pills
    const catPills = document.getElementById('catPills');
    function syncCategoryPills(catValue) {
        if (!catPills) return;
        catPills.querySelectorAll('.mkt-cat-pill').forEach(pill => {
            pill.classList.toggle('active', pill.dataset.cat === catValue);
        });
    }
    function updateURL() {
        const params = new URLSearchParams(window.location.search);
        const cat = catFilter?.value;
        const q = getNameQuery();
        if (cat && cat !== 'all') params.set('cat', cat); else params.delete('cat');
        if (q) params.set('q', q); else params.delete('q');
        const newSearch = params.toString();
        const newURL = newSearch ? `${window.location.pathname}?${newSearch}` : window.location.pathname;
        history.replaceState(null, '', newURL);
    }
    if (catPills) {
        catPills.addEventListener('click', (e) => {
            const pill = e.target.closest('.mkt-cat-pill');
            if (!pill) return;
            const cat = pill.dataset.cat;
            if (catFilter) catFilter.value = cat;
            syncCategoryPills(cat);
            updateURL();
            applyFilters();
            const allSection = document.getElementById('all-products') || document.getElementById('productGrid');
            if (allSection && cat !== 'all') allSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
        });
    }

    // Filter change listeners
    [catFilter, occasionFilter, colorFilter, typeFilter, priceFil, sellerFil, sortFil]
        .filter(Boolean).forEach(el => el.addEventListener('change', () => {
            if (el === catFilter) syncCategoryPills(catFilter.value);
            updateURL();
            applyFilters();
        }));

    // Hero search
    let searchTimeout;
    const suggestionsEl = document.getElementById('searchSuggestions');
    let activeSuggestion = -1;
    let currentSuggestions = [];

    function highlightMatch(text, query) {
        if (!query || !text) return escapeHtml(text || '');
        const escaped = escapeHtml(text);
        const re = new RegExp(`(${query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi');
        return escaped.replace(re, '<mark class="search-highlight">$1</mark>');
    }

    function buildSuggestions(query) {
        if (!suggestionsEl || !query || query.length < 2) {
            hideSuggestions();
            return;
        }
        const q = query.toLowerCase();
        currentSuggestions = products.filter(p => {
            const haystack = `${p.name} ${p.description || ''} ${p.seller} ${p.category || ''}`.toLowerCase();
            return haystack.includes(q);
        }).slice(0, 6);

        if (!currentSuggestions.length) {
            suggestionsEl.innerHTML = '<li class="suggestion-header">No results found</li>';
            suggestionsEl.classList.add('active');
            if (heroSearch) heroSearch.setAttribute('aria-expanded', 'true');
            return;
        }

        const categoryLabels = { roses: 'Roses', bouquets: 'Bouquets', orchids: 'Orchids', wildflowers: 'Wildflowers', succulents: 'Succulents', plants: 'Indoor Plants' };

        suggestionsEl.innerHTML =
            '<li class="suggestion-header">Products</li>' +
            currentSuggestions.map((p, i) => {
                const nameHtml = highlightMatch(p.name, query);
                let descSnippet = '';
                if (p.description) {
                    const descLower = p.description.toLowerCase();
                    const idx = descLower.indexOf(q);
                    if (idx !== -1) {
                        const start = Math.max(0, idx - 20);
                        const end = Math.min(p.description.length, idx + q.length + 40);
                        let snippet = (start > 0 ? '...' : '') + p.description.slice(start, end) + (end < p.description.length ? '...' : '');
                        descSnippet = `<div class="suggestion-desc">${highlightMatch(snippet, query)}</div>`;
                    }
                }
                const metaHtml = highlightMatch(p.seller, query) + ' · ' + escapeHtml(categoryLabels[p.category] || p.category || '');
                return `
                <li role="option" data-index="${i}" data-id="${escapeHtml(p.id)}" aria-selected="false">
                    <img class="suggestion-img" src="${escapeHtml(p.image)}" alt="" loading="lazy">
                    <div class="suggestion-info">
                        <div class="suggestion-name">${nameHtml}</div>
                        <div class="suggestion-meta">${metaHtml}</div>
                        ${descSnippet}
                    </div>
                    <span class="suggestion-price">$${p.price.toFixed(2)}</span>
                </li>`;
            }).join('') +
            `<li class="suggestion-footer" role="option" data-action="view-all">View all ${currentSuggestions.length} results for "${escapeHtml(query)}"</li>`;

        suggestionsEl.classList.add('active');
        if (heroSearch) heroSearch.setAttribute('aria-expanded', 'true');
        activeSuggestion = -1;
    }

    function hideSuggestions() {
        if (suggestionsEl) {
            suggestionsEl.classList.remove('active');
            suggestionsEl.innerHTML = '';
        }
        activeSuggestion = -1;
        currentSuggestions = [];
        if (heroSearch) heroSearch.setAttribute('aria-expanded', 'false');
    }

    function navigateSuggestion(dir) {
        const items = suggestionsEl.querySelectorAll('li[data-index]');
        if (!items.length) return;
        items.forEach(li => li.setAttribute('aria-selected', 'false'));
        activeSuggestion += dir;
        if (activeSuggestion < 0) activeSuggestion = items.length - 1;
        if (activeSuggestion >= items.length) activeSuggestion = 0;
        items[activeSuggestion].setAttribute('aria-selected', 'true');
        items[activeSuggestion].scrollIntoView({ block: 'nearest' });
    }

    function selectSuggestion(el) {
        const id = el.dataset.id;
        if (id) {
            window.location.href = '/product-detail.html?id=' + encodeURIComponent(id);
        } else if (el.dataset.action === 'view-all') {
            hideSuggestions();
            applyFilters();
            const allSection = document.getElementById('all-products') || document.getElementById('productGrid');
            if (allSection) allSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
    }

    if (heroSearch) {
        heroSearch.addEventListener('input', () => {
            clearTimeout(searchTimeout);
            searchTimeout = setTimeout(() => {
                searchQuery = heroSearch.value.trim();
                if (nameFilter && !nameFilter.value.trim()) nameFilter.value = heroSearch.value;
                applyFilters();
                buildSuggestions(searchQuery);
                if (!searchQuery) {
                    const allSection = document.getElementById('all-products') || document.getElementById('productGrid');
                    if (allSection) allSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
                }
            }, 200);
        });
        heroSearch.addEventListener('keydown', (e) => {
            if (e.key === 'ArrowDown') {
                e.preventDefault();
                if (!suggestionsEl.classList.contains('active')) {
                    buildSuggestions(heroSearch.value.trim());
                } else {
                    navigateSuggestion(1);
                }
            } else if (e.key === 'ArrowUp') {
                e.preventDefault();
                navigateSuggestion(-1);
            } else if (e.key === 'Enter') {
                e.preventDefault();
                if (activeSuggestion >= 0 && suggestionsEl.classList.contains('active')) {
                    const items = suggestionsEl.querySelectorAll('li[data-index]');
                    if (items[activeSuggestion]) selectSuggestion(items[activeSuggestion]);
                } else {
                    clearTimeout(searchTimeout);
                    searchQuery = heroSearch.value.trim();
                    applyFilters();
                    hideSuggestions();
                    const allSection = document.getElementById('all-products') || document.getElementById('productGrid');
                    if (allSection) allSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
                }
            } else if (e.key === 'Escape') {
                hideSuggestions();
            }
        });
        heroSearch.addEventListener('blur', () => {
            setTimeout(hideSuggestions, 150);
        });
        heroSearch.addEventListener('focus', () => {
            if (heroSearch.value.trim().length >= 2) {
                buildSuggestions(heroSearch.value.trim());
            }
        });
    }

    if (suggestionsEl) {
        suggestionsEl.addEventListener('mousedown', (e) => {
            const li = e.target.closest('li[data-index], li[data-action]');
            if (li) {
                e.preventDefault();
                selectSuggestion(li);
            }
        });
    }

    // Search button
    const searchBtn = document.querySelector('.mkt-search-btn');
    if (searchBtn && heroSearch) {
        searchBtn.addEventListener('click', () => {
            searchQuery = heroSearch.value.trim();
            applyFilters();
            hideSuggestions();
            const allSection = document.getElementById('all-products') || document.getElementById('productGrid');
            if (allSection) allSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
        });
    }

    // Initial render
    applyFilters();

    // URL param pre-filter
    const urlParams = new URLSearchParams(window.location.search);
    const catParam = urlParams.get('cat');
    const qParam = urlParams.get('q');
    if (catParam && catFilter) {
        catFilter.value = catParam;
        syncCategoryPills(catParam);
        applyFilters();
    }
    if (qParam) {
        if (heroSearch) heroSearch.value = qParam;
        if (nameFilter) nameFilter.value = qParam;
        searchQuery = qParam;
        applyFilters();
    }
})();

// Wishlist toggle
document.addEventListener('click', (e) => {
    const btn = e.target.closest('.wishlist-btn');
    if (!btn) return;
    const icon = btn.querySelector('i');
    if (icon) {
        icon.classList.toggle('bi-heart');
        icon.classList.toggle('bi-heart-fill');
    }
    const id = btn.dataset.id;
    if (id) {
        let saved; try { saved = JSON.parse(localStorage.getItem('gallerySaved') || '[]'); } catch { saved = []; }
        const idx = saved.indexOf(id);
        if (idx >= 0) saved.splice(idx, 1);
        else saved.push(id);
        localStorage.setItem('gallerySaved', JSON.stringify(saved));
    }
});
