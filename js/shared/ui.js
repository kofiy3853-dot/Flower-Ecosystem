// js/shared/ui.js

function initUI() {
    const navbar = document.querySelector('.navbar');

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
        const searchBtn = e.target.closest('.search-btn');
        if (searchBtn) {
            const searchInput = document.getElementById('globalSearchInput') || document.querySelector('.search-input');
            if (searchInput) {
                const query = searchInput.value.trim();
                if (query) {
                    window.location.href = '/marketplace?q=' + encodeURIComponent(query);
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
                if (query) window.location.href = '/marketplace?q=' + encodeURIComponent(query);
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
