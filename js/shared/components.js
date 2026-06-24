// js/shared/components.js

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
    if (document.getElementById('auth-modal-container')) {
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
