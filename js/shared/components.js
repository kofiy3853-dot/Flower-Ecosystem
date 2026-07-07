// js/shared/components.js

function ProductCard(product) {
    const _esc = typeof escapeHtml === 'function' ? escapeHtml : (s) => (s||'').toString().replace(/[&<>"']/g, m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;','\'':'&#39;'})[m]);
    const _noImg = `data:image/svg+xml,${encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" width="300" height="300"><rect fill="#fdf6f9" width="300" height="300" rx="12"/><text x="150" y="168" text-anchor="middle" fill="#c50454" font-size="24" font-family="Arial">No Image</text></svg>')}`;
    const image = _esc(product.image || (product.images && product.images[0]) || _noImg);
    const name = _esc(product.name || 'Untitled Product');
    const price = Number(product.price || 0).toFixed(2);
    const currency = _esc(product.currency || 'GHS');
    const rating = product.rating || 0;
    const reviews = product.reviews || product.review_count || 0;
    const id = _esc(product.id || '');
    const seller = _esc(product.seller || product.seller_name || '');
    const badge = _esc(product.badge || '');
    return `
        <div class="product-card">
            <div class="product-img-link">
                <a href="product-detail.html?id=${id}">
                    <img loading="lazy" src="${image}" alt="${name}">
                </a>
                ${badge ? `<span class="product-badge">${badge}</span>` : ''}
                <button class="wishlist-btn" data-id="${id}" aria-label="Add to wishlist">
                    <i class="bi bi-heart"></i>
                </button>
            </div>
            <div class="product-content">
                <a href="product-detail.html?id=${id}" style="text-decoration:none;color:inherit;">
                    <h3 class="product-name">${name}</h3>
                </a>
                ${seller ? `<p class="product-seller">by ${seller}</p>` : ''}
                <div class="product-rating">${'&#9733;'.repeat(Math.round(rating))}${'&#9734;'.repeat(5 - Math.round(rating))} <span>(${reviews})</span></div>
            </div>
            <div class="product-footer">
                <span class="product-price">${currency} ${price}</span>
            </div>
            <div class="product-actions">
                <button class="btn btn-primary btn-sm add-to-cart" data-id="${id}" data-name="${name}" data-price="${price}" data-image="${image}"><i class="bi bi-cart-plus"></i> Add to Cart</button>
            </div>
        </div>
    `;
}

// Wishlist toggle — relies strictly on API when logged in
document.addEventListener('click', async (e) => {
    const btn = e.target.closest('.wishlist-btn');
    if (!btn) return;
    e.preventDefault();
    e.stopPropagation();

    if (typeof isLoggedIn === 'function' && !isLoggedIn()) {
        if (typeof showToast === 'function') showToast('Please log in to save favorites.', 'error');
        return;
    }

    const icon = btn.querySelector('i');
    const isAdding = icon && icon.classList.contains('bi-heart');
    
    if (icon) {
        icon.classList.toggle('bi-heart');
        icon.classList.toggle('bi-heart-fill');
    }
    
    const id = btn.dataset.id;
    if (id && typeof api !== 'undefined') {
        try {
            if (isAdding) {
                await api.addFavorite(id);
                if (typeof showToast === 'function') showToast('Added to favorites!', 'success');
            } else {
                await api.removeFavorite(id);
                if (typeof showToast === 'function') showToast('Removed from favorites.', 'success');
            }
        } catch (err) {
            // Revert UI on failure
            if (icon) {
                icon.classList.toggle('bi-heart');
                icon.classList.toggle('bi-heart-fill');
            }
            if (typeof showToast === 'function') showToast('Failed to update favorites.', 'error');
        }
    }
});

// Add to cart delegation
document.addEventListener('click', (e) => {
    const btn = e.target.closest('.add-to-cart');
    if (!btn) return;
    e.preventDefault();
    e.stopPropagation();

    const { id, name, price, image } = btn.dataset;
    if (typeof window.cart !== 'undefined' && window.cart.addItem) {
        window.cart.addItem({ id, name, price, image, quantity: 1 });
        if (typeof showToast === 'function') showToast('Added to cart', 'success');
    } else {
        if (typeof showToast === 'function') showToast('Cart system unavailable', 'error');
    }
});

// Sync wishlist state on page load
async function initWishlistState() {
    if (typeof isLoggedIn === 'function' && isLoggedIn() && typeof api !== 'undefined' && api.fetchFavorites) {
        try {
            const data = await api.fetchFavorites();
            if (data && data.favorites) {
                const favSet = new Set(data.favorites.map(f => f.product_id || f.id));
                document.querySelectorAll('.wishlist-btn').forEach(btn => {
                    if (favSet.has(btn.dataset.id)) {
                        const icon = btn.querySelector('i');
                        if (icon) {
                            icon.classList.remove('bi-heart');
                            icon.classList.add('bi-heart-fill');
                        }
                    }
                });
            }
        } catch (err) {
            console.warn('Failed to sync wishlist state', err);
        }
    }
}

// Call initWishlistState slightly after load to ensure products are rendered
window.addEventListener('load', () => setTimeout(initWishlistState, 500));

/**
 * Loads a component HTML file and injects it into a specified element
 * @param {string} url - Path to the component HTML file
 * @param {string} targetId - ID of the element to inject the component into
 */
async function loadComponent(url, targetId) {
    try {
        const response = await fetch(url);
        if (!response.ok) {
            throw new Error(`Failed to load ${url}: ${response.statusText}`);
        }
        const html = await response.text();
        const targetElement = document.getElementById(targetId);
        
        if (targetElement) {
            targetElement.innerHTML = html;
            
            // Re-initialize any scripts that might be needed for the injected content
            // Dispatch a custom event to notify that a component was loaded
            const event = new CustomEvent('componentLoaded', { detail: { targetId, url } });
            document.dispatchEvent(event);
        } else {
            console.warn(`Target element with id '${targetId}' not found for component '${url}'`);
        }
    } catch (error) {
        console.error('Error loading component:', error);
    }
}

// Add performance hints to document head
function addPerformanceHints() {
    if (document.querySelector('link[rel="preconnect"][href="https://images.unsplash.com"]')) return;

    const hints = [
        { rel: 'preconnect', href: 'https://images.unsplash.com', crossorigin: '' },
        { rel: 'preconnect', href: 'https://ui-avatars.com', crossorigin: '' },
        { rel: 'prefetch', href: 'marketplace.html' },
        { rel: 'prefetch', href: 'learning.html' }
    ];

    hints.forEach(h => {
        const link = document.createElement('link');
        link.rel = h.rel;
        link.href = h.href;
        if (h.crossorigin) link.crossOrigin = 'anonymous';
        document.head.appendChild(link);
    });
}

// Automatically load shared components if their containers exist
function initComponents() {
    addPerformanceHints();

    if (document.getElementById('preloader-container')) {
        loadComponent('/components/preloader.html', 'preloader-container');
    }
    if (document.getElementById('auth-modal-container') && !document.getElementById('auth-modal')) {
        loadComponent('/components/auth-modal.html', 'auth-modal-container');
    }
    if (document.getElementById('header-container')) {
        loadComponent('/components/header.html', 'header-container');
    }
    if (document.getElementById('footer-container')) {
        loadComponent('/components/footer.html', 'footer-container');
    }
    // Load AI Assistant into body
    if (!document.getElementById('aiAssistant') && !window.location.pathname.includes('admin')) {
        fetch('/components/ai-assistant.html').then(r => r.text()).then(html => {
            document.body.insertAdjacentHTML('beforeend', html);
            // Initialize AI assistant after DOM update
            setTimeout(() => {
                if (typeof initAIAssistant === 'function') initAIAssistant();
            }, 200);
        }).catch(() => {});
    }
}

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initComponents);
} else {
    initComponents();
}

// Register Service Worker
if ('serviceWorker' in navigator && window.location.protocol === 'https:') {
    navigator.serviceWorker.register('/service-worker.js')
        .then(reg => console.log('Service Worker registered'))
        .catch(err => console.log('Service Worker registration failed:', err));
}

window.ProductCard = ProductCard;
window.loadComponent = loadComponent;
