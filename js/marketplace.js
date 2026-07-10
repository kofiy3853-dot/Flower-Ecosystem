// js/marketplace.js
// Unified Marketplace — filters, search, pagination, product grid, wishlist, recently viewed

const PER_PAGE = 12;
const RATES_TO_GHS = { GHS: 1, USD: 15, EUR: 16.5, GBP: 19, NGN: 0.01, KES: 0.12 };

function toGHS(price, currency) {
    const rate = RATES_TO_GHS[(currency || 'GHS').toUpperCase()] || 1;
    return Number(price) * rate;
}

function escapeHtml(str) {
    return String(str || '').replace(/&/g, '&').replace(/</g, '<').replace(/>/g, '>').replace(/"/g, '"').replace(/'/g, '&#039;');
}

function renderStars(rating) {
    const r = Number(rating) || 0;
    const f = Math.floor(r);
    const h = r - f >= 0.5;
    let s = '';
    for (let i = 0; i < f; i++) s += '<i class="bi bi-star-fill"></i>';
    if (h) s += '<i class="bi bi-star-half"></i>';
    for (let i = f + (h ? 1 : 0); i < 5; i++) s += '<i class="bi bi-star"></i>';
    return s;
}

function formatCurrency(price, currency = 'GHS') {
    return `${escapeHtml(currency)} ${Number(price).toFixed(2)}`;
}

function productCardHTML(p, userFavorites) {
    const img = p.image || (Array.isArray(p.images) && p.images[0]) || '';
    const isFav = userFavorites.has(String(p.id));
    const lowStock = p.stock_quantity !== undefined && p.stock_quantity !== null && Number(p.stock_quantity) <= 5;
    const badge = p.badge ? `<div class="shop-card-badge">${escapeHtml(p.badge)}</div>` : '';
    return `
    <article class="shop-card" data-product-id="${escapeHtml(p.id)}" role="article" tabindex="0">
        <div class="shop-card-img">
            <img src="${escapeHtml(img)}" alt="${escapeHtml(p.name)}" loading="lazy" onerror="this.src='data:image/svg+xml,<svg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 300 220%22><rect fill=%22%23fce7f0%22 width=%22300%22 height=%22220%22/><text x=%22150%22 y=%22120%22 text-anchor=%22middle%22 fill=%22%23d8447c%22 font-size=%2224%22>No Image</text></svg>'">
            ${badge}
            <button class="shop-card-wishlist${isFav ? ' fav-active' : ''}" data-action="wishlist" data-id="${escapeHtml(p.id)}" aria-label="${isFav ? 'Remove from wishlist' : 'Add to wishlist'}">
                <i class="bi ${isFav ? 'bi-heart-fill' : 'bi-heart'}"></i>
            </button>
            <div class="shop-card-actions">
                <button class="btn-quick-view" data-action="view" data-id="${escapeHtml(p.id)}"><i class="bi bi-eye"></i> View</button>
                <button class="btn-add-cart" data-action="cart" data-id="${escapeHtml(p.id)}" data-name="${escapeHtml(p.name)}" data-price="${Number(p.price)}" data-img="${escapeHtml(p.image || p.images?.[0] || '')}"><i class="bi bi-cart-plus"></i> Add</button>
            </div>
        </div>
        <div class="shop-card-body">
            <div class="shop-card-seller">${escapeHtml(p.seller || 'Seller')}</div>
            <div class="shop-card-name">${escapeHtml(p.name)}</div>
            <div class="shop-card-rating">${renderStars(p.rating || 0)} <span>(${p.reviews || 0})</span></div>
            <div style="display:flex;justify-content:space-between;align-items:center;">
                <div class="shop-card-price">${formatCurrency(p.price, p.currency)}</div>
                ${p.delivery_time ? `<div class="shop-card-delivery"><i class="bi bi-lightning"></i> ${escapeHtml(p.delivery_time)}</div>` : ''}
            </div>
            ${p.stock_quantity !== undefined && p.stock_quantity !== null && Number(p.stock_quantity) <= 5 ? `<div class="shop-card-stock"><i class="bi bi-exclamation-triangle"></i> Only ${p.stock_quantity} left!</div>` : ''}
        </div>
    </article>`;
}

function skeletonCards(count) {
    let html = '';
    for (let i = 0; i < count; i++) {
        html += `<div class="skeleton-card">
            <div class="skeleton-img"></div>
            <div class="skeleton-body">
                <div class="skeleton-line w60"></div>
                <div class="skeleton-line w80 h20"></div>
                <div class="skeleton-line w40"></div>
                <div class="skeleton-line w60"></div>
            </div>
        </div>`;
    }
    return html;
}

// ========================================================================
// Marketplace Class
// ========================================================================

class Marketplace {
    constructor() {
        this.allProducts = [];
        this.filteredProducts = [];
        this.currentPage = 1;
        this.perPage = PER_PAGE;
        this.currentView = 'grid';
        this.userFavorites = new Set();
        this.selectedFilters = {
            categories: [], occasions: [], colors: [], types: [], delivery: [],
            minPrice: null, maxPrice: null, rating: 0, search: '', sort: 'newest'
        };
        this.categories = [];
        this.sellers = [];
        this.init();
    }

    async init() {
        this.bindDOM();
        this.bindEvents();
        await this.loadInitialData();
        this.loadFiltersFromURL();
        this.applyFilters(false);
    }

    bindDOM() {
        this.els = {
            grid: document.getElementById('productGrid'),
            count: document.getElementById('productCount'),
            pagination: document.getElementById('pagination'),
            sortSelect: document.getElementById('sortSelect'),
            heroSearch: document.getElementById('heroSearch'),
            priceMin: document.getElementById('priceMin'),
            priceMax: document.getElementById('priceMax'),
            priceError: document.getElementById('priceError'),
            ratingFilter: document.getElementById('ratingFilter'),
            colorOptions: document.querySelectorAll('.color-circle'),
            filterSidebar: document.getElementById('filterSidebar'),
            mobileFilterBtn: document.querySelector('.mobile-filter-btn'),
            viewBtns: document.querySelectorAll('.view-btn'),
            clearFiltersBtn: document.querySelector('button[onclick="clearAllFilters"]'),
            applyFiltersBtn: document.querySelector('button[onclick="applySidebarFilters"]'),
            categoryGrid: document.getElementById('marketplaceCategories'),
            sellersScroll: document.getElementById('sellersScroll'),
            recentScroll: document.getElementById('recentScroll'),
            recentSection: document.getElementById('recentSection')
        };
    }

    bindEvents() {
        // Sidebar toggle
        this.els.mobileFilterBtn?.addEventListener('click', () => this.toggleSidebar(true));
        document.addEventListener('click', (e) => {
            if (this.els.filterSidebar?.classList.contains('open') &&
                !this.els.filterSidebar.contains(e.target) &&
                !this.els.mobileFilterBtn?.contains(e.target)) {
                this.toggleSidebar(false);
            }
        });

        // Sort
        this.els.sortSelect?.addEventListener('change', () => this.applyFilters());

        // Hero search
        let searchTimeout;
        this.els.heroSearch?.addEventListener('input', () => {
            clearTimeout(searchTimeout);
            this.selectedFilters.search = this.els.heroSearch.value.trim();
            this.applyFilters();
        });

        // Price inputs
        [this.els.priceMin, this.els.priceMax].forEach(el => {
            el?.addEventListener('change', () => {
                const min = this.els.priceMin?.value ? parseFloat(this.els.priceMin.value) : null;
                const max = this.els.priceMax?.value ? parseFloat(this.els.priceMax.value) : null;
                if (min !== null && min < 0) this.els.priceMin.value = 0;
                if (max !== null && max < 0) this.els.priceMax.value = 0;
            });
        });

        // Rating stars
        this.els.ratingFilter?.addEventListener('click', (e) => {
            const star = e.target.closest('.rating-star');
            if (star) {
                const rating = parseInt(star.dataset.rating);
                this.selectedFilters.rating = rating;
                this.updateRatingStars(rating);
                this.applyFilters();
            }
        });

        // Color circles
        this.els.colorOptions?.forEach(c => {
            c.addEventListener('click', () => {
                this.els.colorOptions.forEach(x => x.classList.remove('active'));
                c.classList.add('active');
            });
        });

        // Checkbox filters
        ['cat', 'occasion', 'type', 'delivery'].forEach(name => {
            document.querySelectorAll(`input[name="${name}"]`).forEach(cb => {
                cb.addEventListener('change', () => this.applyFilters());
            });
        });

        // Apply/Clear buttons
        this.els.applyFiltersBtn?.addEventListener('click', () => {
            this.applySidebarFilters();
            this.toggleSidebar(false);
        });
        this.els.clearFiltersBtn?.addEventListener('click', () => this.clearAllFilters());

        // View toggle
        this.els.viewBtns?.forEach(btn => {
            btn.addEventListener('click', () => this.setView(btn.dataset.view));
        });

        // Product grid delegation
        this.els.grid?.addEventListener('click', (e) => this.handleGridClick(e));

        // Pagination
        this.els.pagination?.addEventListener('click', (e) => {
            const btn = e.target.closest('.page-btn');
            if (btn && btn.dataset.page) {
                this.currentPage = parseInt(btn.dataset.page);
                this.renderProducts();
                this.els.grid?.scrollIntoView({ behavior: 'smooth', block: 'start' });
            }
        });

        // Keyboard accessibility
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') this.toggleSidebar(false);
        });

        // Recently viewed
        this.loadRecentlyViewed();
    }

    async loadInitialData() {
        this.showSkeletons(8);
        try {
            const [productsRes, categoriesRes] = await Promise.all([
                this.fetchAPI('/api/products?limit=100'),
                this.fetchAPI('/api/products/list/categories')
            ]);
            this.allProducts = productsRes.products || productsRes || [];
            this.categories = categoriesRes.categories || categoriesRes || [];
            this.filteredProducts = [...this.allProducts];
            this.populateCategories();
            this.populateSellerFilter();
            await this.loadUserFavorites();
        } catch (err) {
            this.showError(err.message || 'Network error. Please check your connection.');
        }
    }

    async fetchAPI(url) {
        const res = await fetch(url, { headers: { 'Content-Type': 'application/json' } });
        if (!res.ok) throw new Error(`Server returned ${res.status}`);
        return res.json();
    }

    async loadUserFavorites() {
        if (!this.isAuthenticated()) return;
        try {
            const favs = await this.fetchAPI('/api/buyer/favorites');
            this.userFavorites = new Set((Array.isArray(favs) ? favs : (favs.favorites || [])).map(f => String(f.product_id || f.id)));
        } catch {}
    }

    isAuthenticated() {
        return localStorage.getItem('flower-token') !== null;
    }

    // ========================================================================
    // Filter Handling
    // ========================================================================

    loadFiltersFromURL() {
        const params = new URLSearchParams(window.location.search);
        const map = {
            category: 'categories', occasion: 'occasions', type: 'types',
            delivery: 'delivery', color: 'colors', sort: 'sortOverride'
        };
        Object.entries(map).forEach(([param, key]) => {
            const val = params.get(param);
            if (val) {
                if (Array.isArray(this.selectedFilters[key])) {
                    this.selectedFilters[key] = val.split(',');
                    document.querySelectorAll(`input[name="${param === 'category' ? 'cat' : param}"]`).forEach(cb => {
                        if (this.selectedFilters[key].includes(cb.value)) cb.checked = true;
                    });
                } else if (key === 'colors') {
                    this.selectedFilters.colors = [val];
                    document.querySelectorAll('.color-circle').forEach(c => c.classList.toggle('active', c.dataset.color === val));
                } else if (key === 'sortOverride') {
                    this.els.sortSelect.value = val;
                }
            }
        });
        ['minPrice', 'maxPrice', 'rating', 'search', 'page'].forEach(k => {
            const val = params.get(k === 'search' ? 'q' : k);
            if (val) {
                if (k === 'search') this.selectedFilters.search = val;
                else if (k === 'page') this.currentPage = Math.max(1, parseInt(val) || 1);
                else this.selectedFilters[k] = parseFloat(val) || parseInt(val);
                if (k === 'search' && this.els.heroSearch) this.els.heroSearch.value = val;
                if (k === 'rating') this.updateRatingStars(this.selectedFilters.rating);
            }
        });
    }

    pushFiltersToURL() {
        const params = new URLSearchParams();
        const sort = this.els.sortSelect?.value || 'newest';
        if (this.selectedFilters.search) params.set('q', this.selectedFilters.search);
        if (this.selectedFilters.categories.length) params.set('category', this.selectedFilters.categories.join(','));
        if (this.selectedFilters.occasions.length) params.set('occasion', this.selectedFilters.occasions.join(','));
        if (this.selectedFilters.types.length) params.set('type', this.selectedFilters.types.join(','));
        if (this.selectedFilters.delivery.length) params.set('delivery', this.selectedFilters.delivery.join(','));
        if (this.selectedFilters.colors.length) params.set('color', this.selectedFilters.colors[0]);
        if (this.selectedFilters.minPrice !== null) params.set('minPrice', this.selectedFilters.minPrice);
        if (this.selectedFilters.maxPrice !== null) params.set('maxPrice', this.selectedFilters.maxPrice);
        if (this.selectedFilters.rating) params.set('rating', this.selectedFilters.rating);
        if (sort !== 'newest') params.set('sort', sort);
        if (this.currentPage > 1) params.set('page', this.currentPage);
        history.replaceState({}, '', params.toString() ? '?' + params.toString() : window.location.pathname);
    }

    clearAllFilters() {
        this.selectedFilters = { categories: [], occasions: [], colors: [], types: [], delivery: [], minPrice: null, maxPrice: null, rating: 0, search: '' };
        document.querySelectorAll('.shop-sidebar input[type="checkbox"]').forEach(cb => cb.checked = false);
        document.querySelectorAll('.color-circle').forEach(c => c.classList.remove('active'));
        if (this.els.priceMin) this.els.priceMin.value = '';
        if (this.els.priceMax) this.els.priceMax.value = '';
        if (this.els.heroSearch) this.els.heroSearch.value = '';
        if (this.els.priceError) this.els.priceError.style.display = 'none';
        document.querySelectorAll('.rating-star').forEach(s => s.classList.remove('active'));
        if (this.els.sortSelect) this.els.sortSelect.value = 'newest';
        this.applyFilters();
    }

    applySidebarFilters() {
        const minEl = this.els.priceMin;
        const maxEl = this.els.priceMax;
        const priceErr = this.els.priceError;
        const minVal = minEl?.value ? parseFloat(minEl.value) : null;
        const maxVal = maxEl?.value ? parseFloat(maxEl.value) : null;

        if (minVal !== null && minVal < 0) { minEl.value = 0; }
        if (maxVal !== null && maxVal < 0) { maxEl.value = 0; }
        if (minVal !== null && maxVal !== null && minVal >= maxVal) {
            priceErr.style.display = 'inline';
            return;
        }
        priceErr.style.display = 'none';

        this.selectedFilters.categories = [...document.querySelectorAll('input[name="cat"]:checked')].map(c => c.value);
        this.selectedFilters.occasions = [...document.querySelectorAll('input[name="occasion"]:checked')].map(c => c.value);
        this.selectedFilters.types = [...document.querySelectorAll('input[name="type"]:checked')].map(c => c.value);
        this.selectedFilters.delivery = [...document.querySelectorAll('input[name="delivery"]:checked')].map(c => c.value);
        this.selectedFilters.minPrice = minVal;
        this.selectedFilters.maxPrice = maxVal;
        const activeColor = document.querySelector('.color-circle.active');
        this.selectedFilters.colors = activeColor ? [activeColor.dataset.color] : [];

        this.applyFilters();
        this.toggleSidebar(false);
    }

    applyFilters(pushURL = true) {
        const q = this.selectedFilters.search.toLowerCase();
        const sort = this.els.sortSelect?.value || 'newest';

        this.filteredProducts = this.allProducts.filter(p => {
            // Text search
            if (q && !`${p.name} ${p.description || ''} ${p.seller || ''} ${p.category || ''}`.toLowerCase().includes(q)) return false;
            // Category — case-insensitive
            if (this.selectedFilters.categories.length) {
                const cat = (p.category || '').toLowerCase();
                if (!this.selectedFilters.categories.some(c => cat.includes(c.toLowerCase()))) return false;
            }
            // Occasion — products with "any" match all occasions
            if (this.selectedFilters.occasions.length) {
                const occ = (p.occasion || '').toLowerCase();
                if (occ !== 'any' && !this.selectedFilters.occasions.some(o => occ.includes(o.toLowerCase()))) return false;
            }
            // Color — case-insensitive
            if (this.selectedFilters.colors.length) {
                const col = (p.color || '').toLowerCase();
                if (!this.selectedFilters.colors.some(c => col.includes(c.toLowerCase()))) return false;
            }
            // Type / Freshness — map to flower_cond values
            if (this.selectedFilters.types.length) {
                const cond = (p.flower_cond || '').toLowerCase();
                const isFresh = p.fresh === true || cond === 'natural';
                const isDried = cond === 'dried';
                const isPreserved = cond === 'preserved';
                const isArtificial = cond === 'artificial';
                const passes = this.selectedFilters.types.some(t => {
                    if (t === 'natural') return isFresh;
                    if (t === 'dried') return isDried;
                    if (t === 'preserved') return isPreserved;
                    if (t === 'artificial') return isArtificial;
                    return false;
                });
                if (!passes) return false;
            }
            // Delivery filter — use actual fields
            if (this.selectedFilters.delivery.length) {
                const passesDelivery = this.selectedFilters.delivery.every(d => {
                    if (d === 'sameday') return (p.delivery_time || '').toLowerCase().includes('same');
                    if (d === 'free') return Number(p.shipping_fee) === 0;
                    if (d === 'pickup') return p.pickup_available === true;
                    return false;
                });
                if (!passesDelivery) return false;
            }
            // Price in GHS
            if (this.selectedFilters.minPrice !== null && !isNaN(this.selectedFilters.minPrice) && toGHS(p.price, p.currency) < this.selectedFilters.minPrice) return false;
            if (this.selectedFilters.maxPrice !== null && !isNaN(this.selectedFilters.maxPrice) && toGHS(p.price, p.currency) > this.selectedFilters.maxPrice) return false;
            // Rating
            if (this.selectedFilters.rating && (Number(p.rating) || 0) < this.selectedFilters.rating) return false;
            return true;
        });

        // Sorting
        if (sort === 'price_asc') this.filteredProducts.sort((a, b) => toGHS(a.price, a.currency) - toGHS(b.price, b.currency));
        else if (sort === 'price_desc') this.filteredProducts.sort((a, b) => toGHS(b.price, b.currency) - toGHS(a.price, a.currency));
        else if (sort === 'rating') this.filteredProducts.sort((a, b) => (Number(b.rating) || 0) - (Number(a.rating) || 0) || String(b.id).localeCompare(String(a.id)));
        else if (sort === 'popular') this.filteredProducts.sort((a, b) => (Number(b.reviews) || 0) - (Number(a.reviews) || 0) || String(b.id).localeCompare(String(a.id)));
        else /* newest */ this.filteredProducts.sort((a, b) => {
            const da = a.created_at ? new Date(a.created_at) : 0;
            const db_ = b.created_at ? new Date(b.created_at) : 0;
            return (db_ || 0) - (da || 0) || String(b.id).localeCompare(String(a.id));
        });

        this.currentPage = 1;
        this.renderProducts();
        if (pushURL) this.pushFiltersToURL();
    }

    // ========================================================================
    // Render
    // ========================================================================

    renderProducts() {
        const grid = this.els.grid;
        const count = this.els.count;
        const start = (this.currentPage - 1) * this.perPage;
        const pageItems = this.filteredProducts.slice(start, start + this.perPage);

        if (!this.filteredProducts.length) {
            count.textContent = '0 results';
            grid.innerHTML = '<div class="shop-empty"><i class="bi bi-flower1"></i><h3>No flowers match your search</h3><p>Try adjusting your filters or explore another category.</p><button class="btn btn-primary" onclick="marketplace.clearAllFilters()">Clear Filters</button></div>';
        } else {
            count.textContent = `Showing ${start + 1}–${Math.min(start + this.perPage, this.filteredProducts.length)} of ${this.filteredProducts.length} flowers`;
            grid.className = 'shop-grid';
            grid.innerHTML = pageItems.map(p => productCardHTML(p, this.userFavorites)).join('');
        }
        this.renderPagination();
    }

    renderPagination() {
        const el = this.els.pagination;
        if (!el) return;
        const totalPages = Math.ceil(this.filteredProducts.length / this.perPage);
        if (totalPages <= 1) { el.innerHTML = ''; return; }

        const start = (this.currentPage - 1) * this.perPage + 1;
        const end = Math.min(this.currentPage * this.perPage, this.filteredProducts.length);

        let pages = '';
        const maxVisible = 5;
        let startPage = Math.max(1, this.currentPage - Math.floor(maxVisible / 2));
        let endPage = Math.min(totalPages, startPage + maxVisible - 1);
        if (endPage - startPage < maxVisible - 1) startPage = Math.max(1, endPage - maxVisible + 1);

        if (this.currentPage > 1) pages += `<button class="page-btn" data-page="${this.currentPage - 1}"><i class="bi bi-chevron-left"></i></button>`;
        if (startPage > 1) { pages += `<button class="page-btn" data-page="1">1</button>`; if (startPage > 2) pages += `<span class="page-dots">...</span>`; }
        for (let i = startPage; i <= endPage; i++) {
            pages += `<button class="page-btn${i === this.currentPage ? ' active' : ''}" data-page="${i}">${i}</button>`;
        }
        if (endPage < totalPages) { if (endPage < totalPages - 1) pages += `<span class="page-dots">...</span>`; pages += `<button class="page-btn" data-page="${totalPages}">${totalPages}</button>`; }
        if (this.currentPage < totalPages) pages += `<button class="page-btn" data-page="${this.currentPage + 1}"><i class="bi bi-chevron-right"></i></button>`;

        el.innerHTML = `
            <div class="pagination-inner">
                <span class="page-info">Showing ${start}–${end} of ${this.filteredProducts.length}</span>
                <div class="page-btns">${pages}</div>
            </div>`;
    }

    // ========================================================================
    // Grid Interaction
    // ========================================================================

    handleGridClick(e) {
        const btn = e.target.closest('[data-action]');
        if (!btn) return;

        const action = btn.dataset.action;
        const id = btn.dataset.id;

        if (action === 'wishlist') this.toggleWishlist(id, btn);
        else if (action === 'cart') this.addToCart(id, btn);
        else if (action === 'view') this.viewProduct(id);
    }

    async toggleWishlist(id, btn) {
        const icon = btn.querySelector('i');
        const isFav = this.userFavorites.has(id);

        try {
            if (isFav) {
                await this.fetchAPI(`/api/buyer/favorites/${id}`, { method: 'DELETE' });
                this.userFavorites.delete(id);
                btn.classList.remove('fav-active');
                icon.classList.replace('bi-heart-fill', 'bi-heart');
                btn.setAttribute('aria-label', 'Add to wishlist');
            } else {
                await this.fetchAPI('/api/buyer/favorites', { method: 'POST', body: JSON.stringify({ product_id: id }) });
                this.userFavorites.add(id);
                btn.classList.add('fav-active');
                icon.classList.replace('bi-heart', 'bi-heart-fill');
                btn.setAttribute('aria-label', 'Remove from wishlist');
            }
            if (typeof showToast === 'function') showToast(isFav ? 'Removed from wishlist' : 'Added to wishlist', isFav ? 'info' : 'success');
        } catch (err) {
            this.handleError(err, 'Failed to update wishlist');
        }
    }

    addToCart(id, btn) {
        const name = btn.dataset.name;
        const price = parseFloat(btn.dataset.price);
        const img = btn.dataset.img;

        if (this.isAuthenticated()) {
            this.fetchAPI('/api/cart/add', { method: 'POST', body: JSON.stringify({ product_id: id, quantity: 1 }) })
                .then(() => { if (typeof syncCartFromServer === 'function') syncCartFromServer(); })
                .catch(err => this.handleError(err, 'Failed to add to cart'));
        } else {
            const cartData = JSON.parse(localStorage.getItem('flower-cart') || '[]');
            const existing = cartData.find(i => i.id === id);
            if (existing) existing.qty += 1;
            else cartData.push({ id, name, price, image: img, qty: 1 });
            localStorage.setItem('flower-cart', JSON.stringify(cartData));
            if (typeof updateAllBadges === 'function') updateAllBadges();
        }
        if (typeof showToast === 'function') showToast('Added to cart', 'success');
    }

    viewProduct(id) {
        window.location.href = `product-detail.html?id=${id}`;
    }

    setView(view) {
        this.currentView = view;
        this.els.viewBtns?.forEach(btn => btn.classList.toggle('active', btn.dataset.view === view));
        // View logic could be extended for list/grid
    }

    // ========================================================================
    // Helpers
    // ========================================================================

    showSkeletons(count) {
        if (!this.els.grid) return;
        this.els.grid.className = 'shop-grid';
        this.els.grid.innerHTML = skeletonCards(count);
        if (this.els.count) this.els.count.textContent = 'Loading products...';
    }

    showError(msg) {
        const grid = this.els.grid;
        if (!grid) return;
        if (this.els.count) this.els.count.textContent = '';
        grid.className = '';
        grid.innerHTML = `
            <div class="shop-empty">
                <i class="bi bi-exclamation-triangle"></i>
                <h3>Could not load products</h3>
                <p>${escapeHtml(msg)}</p>
                <button class="btn btn-primary" onclick="marketplace.retryLoad()"><i class="bi bi-arrow-clockwise"></i> Try Again</button>
            </div>`;
    }

    async retryLoad() {
        this.showSkeletons(8);
        await this.loadInitialData();
        this.applyFilters(false);
    }

    toggleSidebar(open) {
        if (!this.els.filterSidebar) return;
        if (open === undefined) open = !this.els.filterSidebar.classList.contains('open');
        this.els.filterSidebar.classList.toggle('open', open);
    }

    updateRatingStars(rating) {
        document.querySelectorAll('.rating-star').forEach(s => s.classList.toggle('active', parseInt(s.dataset.rating) <= rating));
    }

    populateCategories() {
        if (!this.els.categoryGrid) return;
        const colors = ['#e74c3c', '#27ae60', '#8b5cf6', '#f59e0b', '#3b82f6', '#ec4899'];
        const icons = ['bi-flower1', 'bi-tree', 'bi-flower3', 'bi-sun', 'bi-moisture', 'bi-stars'];
        this.els.categoryGrid.innerHTML = (this.categories || []).map((c, i) => `
            <a href="marketplace.html?category=${encodeURIComponent(c.slug || c.name)}" class="category-card" style="text-decoration:none;color:inherit;">
                <div class="category-icon" style="background:${colors[i % colors.length]}15;color:${colors[i % colors.length]};"><i class="bi ${icons[i % icons.length]}"></i></div>
                <h4>${escapeHtml(c.name)}</h4>
                <p>${c.product_count || 0} products</p>
            </a>
        `).join('');
    }

    populateSellerFilter() {
        const sel = document.getElementById('sellerFilter');
        if (!sel) return;
        const sellers = [...new Set(this.allProducts.map(p => p.seller))];
        sel.innerHTML = '<option value="all">All Sellers</option>' + sellers.map(s => `<option value="${escapeHtml(s)}">${escapeHtml(s)}</option>`).join('');
    }

    async loadSellers() {
        try {
            const res = await this.fetchAPI('/api/sellers?limit=10');
            const sellers = res.sellers || res || [];
            if (!this.els.sellersScroll) return;
            this.els.sellersScroll.innerHTML = sellers.map(s => `
                <div class="seller-card">
                    <div class="seller-avatar">${(s.name || 'S')[0].toUpperCase()}</div>
                    <div class="seller-name">${escapeHtml(s.name || 'Seller')}</div>
                    <div class="seller-rating">${renderStars(s.rating || 0)}</div>
                    <div class="seller-products">${s.product_count || 0} products</div>
                </div>
            `).join('');
        } catch {}
    }

    loadRecentlyViewed() {
        try {
            let recent = JSON.parse(localStorage.getItem('recentlyViewed') || '[]');
            const cutoff = Date.now() - 7 * 24 * 60 * 60 * 1000;
            recent = recent.filter(r => !r.ts || r.ts > cutoff);
            localStorage.setItem('recentlyViewed', JSON.stringify(recent));
            if (!recent.length || !this.els.recentSection) { 
                if (this.els.recentSection) this.els.recentSection.style.display = 'none';
                return; 
            }
            this.els.recentSection.style.display = 'block';
            this.els.recentScroll.innerHTML = recent.map(r => `
                <a href="product-detail.html?id=${escapeHtml(r.id)}" class="recent-card">
                    <img src="${escapeHtml(r.image || '')}" alt="${escapeHtml(r.name)}" loading="lazy" onerror="this.src='data:image/svg+xml,<svg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 150 150%22><rect fill=%22%23fce7f0%22 width=%22150%22 height=%22150%22/><text x=%2275%22 y=%2285%22 text-anchor=%22middle%22 fill=%22%23d8447c%22 font-size=%2218%22>No Image</text></svg>'">
                    <div class="recent-card-name">${escapeHtml(r.name)}</div>
                </a>
            `).join('');
        } catch {}
    }

    handleGridClick(e) {
        const btn = e.target.closest('[data-action]');
        if (!btn) return;

        const action = btn.dataset.action;
        const id = btn.dataset.id;

        if (action === 'wishlist') this.toggleWishlist(id, btn);
        else if (action === 'cart') this.addToCart(id, btn);
        else if (action === 'view') this.viewProduct(id);
    }

    async addToCart(id, btn) {
        const name = btn.dataset.name;
        const price = parseFloat(btn.dataset.price);
        const img = btn.dataset.img;

        if (this.isAuthenticated()) {
            try {
                await this.fetchAPI('/api/cart/add', { method: 'POST', body: JSON.stringify({ product_id: id, quantity: 1 }) });
                if (typeof syncCartFromServer === 'function') syncCartFromServer();
            } catch (err) { this.handleError(err, 'Failed to add to cart'); }
        } else {
            const cartData = JSON.parse(localStorage.getItem('flower-cart') || '[]');
            const existing = cartData.find(i => i.id === id);
            if (existing) existing.qty += 1;
            else cartData.push({ id, name, price, image: img, qty: 1 });
            localStorage.setItem('flower-cart', JSON.stringify(cartData));
            if (typeof updateAllBadges === 'function') updateAllBadges();
        }
        if (typeof showToast === 'function') showToast('Added to cart', 'success');
    }

    viewProduct(id) {
        window.location.href = `product-detail.html?id=${id}`;
    }

    handleError(err, msg) {
        console.error(msg, err);
        if (typeof showToast === 'function') showToast(msg, 'error');
        else alert(msg + ': ' + (err?.message || err));
    }

    retryLoad() {
        this.showSkeletons(8);
        this.loadInitialData();
    }
}

// ========================================================================
// Global Initialization
// ========================================================================

let marketplace;

document.addEventListener('DOMContentLoaded', () => {
    marketplace = new Marketplace();
    // Expose for onclick handlers in HTML
    window.marketplace = marketplace;
});