// js/shared/ui.js

let searchProducts = [];
let searchDebounce = null;

async function loadSearchProducts() {
    if (searchProducts.length) return;
    try {
        const res = await fetch('/api/products?limit=50');
        if (res.ok) {
            const data = await res.json();
            searchProducts = data.products || data || [];
        }
    } catch {}
}

function buildSearchSuggestions(query) {
    const suggestionsEl = document.getElementById('globalSearchSuggestions');
    if (!suggestionsEl) return;

    if (!query || query.length < 2) {
        suggestionsEl.style.display = 'none';
        return;
    }

    const q = query.toLowerCase();
    const matches = searchProducts.filter(p => {
        const haystack = `${p.name} ${p.description || ''} ${p.seller || ''} ${p.category || ''}`.toLowerCase();
        return haystack.includes(q);
    }).slice(0, 5);

    if (!matches.length) {
        suggestionsEl.innerHTML = '<div class="suggestion-header">No results</div>';
        suggestionsEl.style.display = 'block';
        return;
    }

    suggestionsEl.innerHTML =
        '<div class="suggestion-header">Products</div>' +
        matches.map(p => `
            <a href="product-detail.html?id=${p.id}" class="suggestion-item">
                <img class="suggestion-img" src="${p.image || ''}" alt="" onerror="this.src='data:image/svg+xml,<svg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 40 40%22><rect fill=%22%23fce7f0%22 width=%2240%22 height=%2240%22/><text x=%2220%22 y=%2225%22 text-anchor=%22middle%22 fill=%22%23d8447c%22 font-size=%2216%22>🌸</text></svg>'">
                <div class="suggestion-info">
                    <div class="suggestion-name">${p.name}</div>
                    <div class="suggestion-meta">${p.seller || ''} · ${p.category || ''}</div>
                </div>
                <span class="suggestion-price">${p.currency || 'GHS'} ${Number(p.price || 0).toFixed(2)}</span>
            </a>
        `).join('') +
        `<a href="marketplace.html?q=${encodeURIComponent(query)}" class="suggestion-footer">View all results for "${query}"</a>`;

    suggestionsEl.style.display = 'block';
}

function initSearchSuggestions() {
    const searchInput = document.getElementById('globalSearchInput');
    if (!searchInput) return;

    loadSearchProducts();

    searchInput.addEventListener('input', (e) => {
        clearTimeout(searchDebounce);
        searchDebounce = setTimeout(() => {
            buildSearchSuggestions(e.target.value.trim());
        }, 200);
    });

    searchInput.addEventListener('focus', () => {
        if (searchInput.value.trim().length >= 2) {
            buildSearchSuggestions(searchInput.value.trim());
        }
    });

    document.addEventListener('click', (e) => {
        if (!e.target.closest('.nav-search')) {
            const suggestions = document.getElementById('globalSearchSuggestions');
            if (suggestions) suggestions.style.display = 'none';
        }
    });
}

function initUI() {
    const navbar = document.querySelector('.navbar');

    // Initialize search suggestions
    initSearchSuggestions();

    // Sticky Navbar
    if (navbar) {
        let ticking = false;
        window.addEventListener('scroll', () => {
            if (!ticking) {
                window.requestAnimationFrame(() => {
                    navbar.classList.toggle('scrolled', window.scrollY > 50);
                    ticking = false;
                });
                ticking = true;
            }
        }, { passive: true });
    }

    // Event Delegation for UI interactions
    document.addEventListener('click', (e) => {
        // Mobile Menu Toggle
        const mobileMenuBtn = e.target.closest('.mobile-menu-btn');
        if (mobileMenuBtn) {
            const navLinks = document.querySelector('.nav-links');
            if (navLinks) {
                navLinks.classList.toggle('mobile-active');
            }
        }

        // Close mobile menu on link click
        if (e.target.closest('.nav-links a')) {
            const navLinks = document.querySelector('.nav-links');
            if (navLinks) navLinks.classList.remove('mobile-active');
        }

        // Search Button
        const searchBtn = e.target.closest('.search-btn, #globalSearchBtn');
        if (searchBtn) {
            e.preventDefault();
            e.stopPropagation();
            const searchInput = document.getElementById('globalSearchInput') || document.querySelector('.search-input');
            if (searchInput) {
                const query = searchInput.value.trim();
                if (query) {
                    window.location.href = 'marketplace.html?q=' + encodeURIComponent(query);
                } else {
                    searchInput.focus();
                }
            }
        }

        // Learning/General Tabs (non-modal)
        const tabBtn = e.target.closest('.tab-btn');
        // Ensure it's not a modal tab (handled in auth.js)
        if (tabBtn && !tabBtn.classList.contains('modal-tab-btn')) {
            const tabName = tabBtn.getAttribute('data-tab');
            const tabsContainer = tabBtn.closest('.learning-tabs') || tabBtn.parentElement;
            const contentContainer = tabsContainer.nextElementSibling || document.querySelector('.tabs-wrapper');
            
            if(tabsContainer) {
                const btns = tabsContainer.querySelectorAll('.tab-btn');
                btns.forEach(b => b.classList.remove('active'));
            }
            
            const tabContents = document.querySelectorAll('.tab-content:not(.modal-tab-content)');
            tabContents.forEach(tc => tc.classList.remove('active'));
            
            tabBtn.classList.add('active');
            const targetTab = document.getElementById(`${tabName}-tab`);
            if(targetTab) targetTab.classList.add('active');
        }
    });

    // Keyboard shortcuts: search Enter + role="button" activation
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
            const searchInput = document.getElementById('globalSearchInput');
            if (searchInput && document.activeElement === searchInput) {
                const query = searchInput.value.trim();
                if (query) window.location.href = 'marketplace.html?q=' + encodeURIComponent(query);
                return;
            }
        }
        if (e.key === 'Enter' || e.key === ' ') {
            const target = e.target.closest('[role="button"]');
            if (target) { e.preventDefault(); target.click(); }
        }
    });

    // Newsletter Form Submit
    document.addEventListener('submit', (e) => {
        const form = e.target.closest('.newsletter-form');
        if (!form) return;
        e.preventDefault();
        const input = form.querySelector('input[type="email"]');
        const msg = form.nextElementSibling;
        const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (input && input.value.trim() && re.test(input.value.trim())) {
            form.classList.add('hidden');
            if (msg) { msg.textContent = 'Thanks for subscribing!'; msg.classList.remove('hidden'); }
            input.value = '';
        } else if (input) {
            input.style.borderColor = 'var(--primary-color)';
            setTimeout(() => { input.style.borderColor = ''; }, 2000);
        }
    });

    // Highlight active nav link based on current page
    const currentPage = window.location.pathname.split('/').pop() || 'index.html';
    document.querySelectorAll('.nav-link-item[data-page]').forEach(link => {
        const href = link.getAttribute('href');
        const dp = link.getAttribute('data-page');
        if (href === currentPage || dp === currentPage.replace('.html', '')) {
            link.classList.add('active');
        }
    });
}

// Use DOMContentLoaded and load event (for preloader)
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initUI);
} else {
    initUI();
}

window.addEventListener('load', () => {
    const preloader = document.querySelector('.preloader');
    if (preloader) {
        preloader.classList.add('hidden');
    }
});

// ─── Shared renderStars utility ────────────────────────────────────────────
window.renderStars = function(rating) {
    const r = Number(rating) || 0;
    const full = Math.floor(r);
    const half = r % 1 >= 0.5;
    let html = '';
    for (let i = 0; i < full; i++) html += '<i class="bi bi-star-fill"></i>';
    if (half) html += '<i class="bi bi-star-half"></i>';
    for (let i = full + (half ? 1 : 0); i < 5; i++) html += '<i class="bi bi-star"></i>';
    return html;
};

// ─── showToast helper (normalises across Toast / showToast implementations) ─
window.showToast = window.showToast || function(message, type = 'success') {
    if (typeof Toast !== 'undefined' && typeof Toast[type] === 'function') {
        Toast[type](message);
    } else {
        // Lightweight fallback
        const el = document.createElement('div');
        el.textContent = message;
        el.style.cssText = `
            position:fixed;bottom:1.5rem;right:1.5rem;z-index:99999;
            background:${type === 'error' ? '#e53e3e' : '#38a169'};
            color:#fff;padding:0.75rem 1.25rem;border-radius:8px;
            box-shadow:0 4px 20px rgba(0,0,0,.15);font-size:0.9rem;
            animation:fadeInUp .25s ease;
        `;
        document.body.appendChild(el);
        setTimeout(() => el.remove(), 3000);
    }
};
