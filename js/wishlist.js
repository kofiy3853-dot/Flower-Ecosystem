// js/wishlist.js
// Wishlist page — render, remove, move to cart, bulk actions

(async () => {
    const grid = document.getElementById('favoritesGrid');
    const emptyState = document.getElementById('emptyState');
    const countEl = document.getElementById('wishlistCount');
    const clearBtn = document.getElementById('clearWishlistBtn');

    if (!grid) return;

    let allProducts = [];
    try { allProducts = await api.fetchProducts(); } catch {}

    function getSavedIds() {
        return JSON.parse(localStorage.getItem('gallerySaved') || '[]');
    }

    function renderStars(rating) {
        const f = Math.floor(rating);
        const h = rating - f >= 0.5;
        let s = '';
        for (let i = 0; i < f; i++) s += '<i class="bi bi-star-fill" style="color:var(--accent-gold);"></i>';
        if (h) s += '<i class="bi bi-star-half" style="color:var(--accent-gold);"></i>';
        for (let i = 0; i < 5 - f - (h ? 1 : 0); i++) s += '<i class="bi bi-star" style="color:var(--border-color);"></i>';
        return s;
    }

    function render() {
        const savedIds = getSavedIds();
        const favorites = allProducts.filter(p => savedIds.includes(p.id));

        if (countEl) countEl.textContent = `${favorites.length} item${favorites.length !== 1 ? 's' : ''}`;
        if (clearBtn) clearBtn.style.display = favorites.length ? '' : 'none';

        if (!favorites.length) {
            emptyState.style.display = 'block';
            grid.innerHTML = '';
            return;
        }

        emptyState.style.display = 'none';
        grid.innerHTML = favorites.map(p => `
            <div class="product-card wl-card" data-id="${escapeHtml(p.id)}">
                <div class="product-img-wrap">
                    <a href="product-detail.html?id=${escapeHtml(p.id)}">
                        <img loading="lazy" src="${escapeHtml(p.image)}" alt="${escapeHtml(p.name)}" class="product-img">
                    </a>
                    ${p.badge ? `<span class="product-badge">${escapeHtml(p.badge)}</span>` : ''}
                    <button class="wishlist-btn wl-remove-btn" data-id="${escapeHtml(p.id)}" aria-label="Remove from wishlist"
                        style="position:absolute;top:0.75rem;right:0.75rem;background:rgba(255,255,255,0.9);border:none;border-radius:50%;width:32px;height:32px;cursor:pointer;font-size:1rem;display:flex;align-items:center;justify-content:center;">
                        <i class="bi bi-heart-fill" style="color:var(--primary-color);"></i>
                    </button>
                </div>
                <div class="product-info">
                    <a href="product-detail.html?id=${escapeHtml(p.id)}" style="text-decoration:none;color:inherit;">
                        <h3 class="product-name">${escapeHtml(p.name)}</h3>
                    </a>
                    <p class="product-seller">by ${escapeHtml(p.seller)}</p>
                    <div class="product-rating" style="margin:0.25rem 0;">${renderStars(p.rating)}
                        <span style="font-size:0.8rem;color:var(--text-light);">(${escapeHtml(String(p.reviews))})</span>
                    </div>
                    <div class="product-footer">
                        <span class="product-price">$${Number(p.price).toFixed(2)}</span>
                        <button class="btn btn-primary btn-sm add-to-cart-btn wl-cart-btn"
                            data-id="${escapeHtml(p.id)}" data-name="${escapeHtml(p.name)}" data-price="${p.price}" data-image="${escapeHtml(p.image)}">
                            Add to Cart
                        </button>
                    </div>
                </div>
            </div>
        `).join('');
    }

    // Remove from wishlist
    grid.addEventListener('click', e => {
        const removeBtn = e.target.closest('.wl-remove-btn');
        if (removeBtn) {
            e.preventDefault();
            const id = removeBtn.dataset.id;
            const arr = getSavedIds().filter(i => i !== id);
            localStorage.setItem('gallerySaved', JSON.stringify(arr));
            const card = removeBtn.closest('.product-card');
            if (card) {
                card.style.transition = 'opacity 0.3s, transform 0.3s';
                card.style.opacity = '0';
                card.style.transform = 'scale(0.95)';
                setTimeout(() => { card.remove(); render(); }, 300);
            }
        }
    });

    // Clear all
    if (clearBtn) {
        clearBtn.addEventListener('click', () => {
            if (!confirm('Remove all items from your wishlist?')) return;
            localStorage.setItem('gallerySaved', '[]');
            render();
        });
    }

    render();
})();
