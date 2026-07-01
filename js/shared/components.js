// js/shared/components.js

function ProductCard(product) {
    const _noImg = `data:image/svg+xml,${encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" width="300" height="300"><rect fill="#fdf6f9" width="300" height="300" rx="12"/><text x="150" y="168" text-anchor="middle" fill="#c50454" font-size="24" font-family="Arial">No Image</text></svg>')}`;
    const image = product.image || (product.images && product.images[0]) || _noImg;
    const name = (product.name || 'Untitled Product').replace(/</g, '&lt;');
    const price = Number(product.price || 0).toFixed(2);
    const currency = product.currency || 'GHS';
    const rating = product.rating || 0;
    const reviews = product.reviews || product.review_count || 0;
    const id = product.id || '';
    const seller = product.seller || product.seller_name || '';
    const badge = product.badge || '';
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

// Wishlist toggle — works on any page that loads components.js
document.addEventListener('click', (e) => {
    const btn = e.target.closest('.wishlist-btn');
    if (!btn) return;
    e.preventDefault();
    e.stopPropagation();
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

// Automatically load shared components if their containers exist
function initComponents() {
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
}

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initComponents);
} else {
    initComponents();
}

window.ProductCard = ProductCard;
window.loadComponent = loadComponent;
