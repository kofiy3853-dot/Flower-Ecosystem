// js/shared/animations.js

function initAnimations() {
    // Scroll Reveal Animations
    const observerOptions = {
        root: null,
        rootMargin: '0px',
        threshold: 0.15
    };

    const revealObserver = new IntersectionObserver((entries, observer) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('active');
                observer.unobserve(entry.target);
            }
        });
    }, observerOptions);

    // Observe initially present elements
    const observeElements = () => {
        const revealElements = document.querySelectorAll('.reveal-up:not(.active)');
        revealElements.forEach(el => revealObserver.observe(el));
    };
    
    observeElements();

    // Animated Statistics Counters
    let hasCounted = false;
    const countUp = () => {
        const counters = document.querySelectorAll('.counter');
        counters.forEach(counter => {
            const target = +counter.getAttribute('data-target');
            // If target is 0, don't animate (or it's not set properly)
            if(target === 0) return;
            
            const duration = 2000;
            const increment = target / (duration / 16);
            let current = 0;

            const updateCounter = () => {
                current += increment;
                if (current < target) {
                    counter.innerText = Math.ceil(current).toLocaleString();
                    requestAnimationFrame(updateCounter);
                } else {
                    counter.innerText = target.toLocaleString();
                    if(target === 98) counter.innerText += "%";
                    else counter.innerText += "+";
                }
            };
            updateCounter();
        });
    };

    const statsObserver = new IntersectionObserver((entries) => {
        if (entries[0].isIntersecting && !hasCounted) {
            hasCounted = true;
            countUp();
        }
    }, { threshold: 0.5 });

    const statsSection = document.querySelector('.stats-section');
    if (statsSection) {
        statsObserver.observe(statsSection);
    }

    // Re-run observe elements when new components are loaded
    document.addEventListener('componentLoaded', observeElements);

    // Also watch for dynamically added .reveal-up elements (e.g. after async data loads)
    const mutationObserver = new MutationObserver((mutations) => {
        for (const mutation of mutations) {
            for (const node of mutation.addedNodes) {
                if (node.nodeType !== 1) continue; // skip text nodes
                if (node.classList && node.classList.contains('reveal-up') && !node.classList.contains('active')) {
                    revealObserver.observe(node);
                }
                if (node.querySelectorAll) {
                    node.querySelectorAll('.reveal-up:not(.active)').forEach(el => revealObserver.observe(el));
                }
            }
        }
    });
    mutationObserver.observe(document.body, { childList: true, subtree: true });
}

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initAnimations);
} else {
    initAnimations();
}
