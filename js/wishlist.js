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

    function isLoggedIn() {
        try { return !!localStorage.getItem('flower-token'); } catch { return false; }
    }

    async function fetchServerFavorites() {
        if (!isLoggedIn()) return [];
        try { return await api.fetchFavorites(); } catch { return []; }
    }

    async function toggleFavorite(productId) {
        if (isLoggedIn()) {
            const saved = getSavedIds();
            if (saved.includes(productId)) {
                await api.removeFavorite(productId).catch(() => {});
                localStorage.setItem('gallerySaved', JSON.stringify(saved.filter(id => id !== productId)));
            } else {
                await api.addFavorite(productId).catch(() => {});
                saved.push(productId);
                localStorage.setItem('gallerySaved', JSON.stringify(saved));
            }
        } else {
            const saved = getSavedIds();
            const idx = saved.indexOf(productId);
            if (idx >= 0) saved.splice(idx, 1);
            else saved.push(productId);
            localStorage.setItem('gallerySaved', JSON.stringify(saved));
        }
    }

    async function render() {
        let savedIds = getSavedIds();

        // Sync from server if logged in
        if (isLoggedIn()) {
            try {
                const serverFavs = await fetchServerFavorites();
                if (serverFavs.length) {
                    const serverIds = serverFavs.map(f => f.product_id);
                    savedIds = [...new Set([...savedIds, ...serverIds])];
                    localStorage.setItem('gallerySaved', JSON.stringify(savedIds));
                }
            } catch {}
        }

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
    grid.addEventListener('click', async (e) => {
        const removeBtn = e.target.closest('.wl-remove-btn');
        if (removeBtn) {
            e.preventDefault();
            const id = removeBtn.dataset.id;
            await toggleFavorite(id);
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
        clearBtn.addEventListener('click', async () => {
            if (!confirm('Remove all items from your wishlist?')) return;
            const saved = getSavedIds();
            if (isLoggedIn()) {
                for (const id of saved) {
                    await api.removeFavorite(id).catch(() => {});
                }
            }
            localStorage.setItem('gallerySaved', '[]');
            render();
        });
    }

    render();
})();
