// js/shared/loading.js
// Standardized loading component with spinner, skeleton screens, and progress indicators

const Loading = {
    container: null,
    activeLoaders: new Map(),

    init() {
        if (this.container) return;
        
        this.container = document.createElement('div');
        this.container.id = 'loading-container';
        this.container.style.cssText = `
            position: fixed;
            inset: 0;
            background: rgba(255, 255, 255, 0.8);
            z-index: 9998;
            display: none;
            align-items: center;
            justify-content: center;
            backdrop-filter: blur(2px);
        `;
        document.body.appendChild(this.container);
    },

    // Full page loading overlay
    show(message = 'Loading...') {
        this.init();
        
        const loaderId = 'fullpage-' + Date.now();
        const loader = document.createElement('div');
        loader.id = loaderId;
        loader.style.cssText = `
            display: flex;
            flex-direction: column;
            align-items: center;
            gap: 16px;
        `;
        loader.innerHTML = `
            <div class="spinner-large" style="width: 48px; height: 48px; border: 4px solid var(--border-color); border-top-color: var(--primary-color); border-radius: 50%; animation: spin 0.8s linear infinite;"></div>
            <p style="margin: 0; color: var(--text-main); font-size: 0.95rem; font-weight: 500;">${this.escapeHtml(message)}</p>
        `;
        
        this.container.appendChild(loader);
        this.container.style.display = 'flex';
        this.activeLoaders.set(loaderId, loader);
        
        return loaderId;
    },

    hide(loaderId) {
        if (loaderId) {
            const loader = this.activeLoaders.get(loaderId);
            if (loader && loader.parentElement) {
                loader.parentElement.removeChild(loader);
            }
            this.activeLoaders.delete(loaderId);
        }
        
        if (this.activeLoaders.size === 0) {
            this.container.style.display = 'none';
        }
    },

    hideAll() {
        this.activeLoaders.forEach((loader) => {
            if (loader.parentElement) {
                loader.parentElement.removeChild(loader);
            }
        });
        this.activeLoaders.clear();
        this.container.style.display = 'none';
    },

    // Inline spinner for specific elements
    showInline(element, size = 'small') {
        if (!element) return null;
        
        const sizes = {
            small: { width: '16px', height: '16px', border: '2px' },
            medium: { width: '24px', height: '24px', border: '3px' },
            large: { width: '32px', height: '32px', border: '4px' }
        };
        
        const s = sizes[size] || sizes.small;
        const loaderId = 'inline-' + Date.now();
        
        const originalContent = element.innerHTML;
        element.dataset.originalContent = originalContent;
        
        const spinner = document.createElement('span');
        spinner.id = loaderId;
        spinner.className = 'inline-spinner';
        spinner.style.cssText = `
            display: inline-block;
            width: ${s.width};
            height: ${s.height};
            border: ${s.border} solid var(--border-color);
            border-top-color: var(--primary-color);
            border-radius: 50%;
            animation: spin 0.8s linear infinite;
            vertical-align: middle;
        `;
        
        element.innerHTML = '';
        element.appendChild(spinner);
        element.disabled = true;
        
        this.activeLoaders.set(loaderId, { element, spinner, originalContent });
        
        return loaderId;
    },

    hideInline(loaderId) {
        const loader = this.activeLoaders.get(loaderId);
        if (!loader) return;
        
        const { element, originalContent } = loader;
        element.innerHTML = originalContent;
        element.disabled = false;
        
        this.activeLoaders.delete(loaderId);
    },

    // Skeleton screen for content loading
    skeleton(options = {}) {
        const {
            width = '100%',
            height = '100px',
            count = 1,
            variant = 'rect',
            circle = false
        } = options;
        
        const skeletons = [];
        
        for (let i = 0; i < count; i++) {
            const skeleton = document.createElement('div');
            skeleton.className = 'skeleton';
            
            if (circle || variant === 'circle') {
                skeleton.style.cssText = `
                    width: ${typeof width === 'number' ? width + 'px' : width};
                    height: ${typeof height === 'number' ? height + 'px' : height};
                    border-radius: 50%;
                    background: linear-gradient(90deg, var(--bg-light) 25%, var(--border-color) 50%, var(--bg-light) 75%);
                    background-size: 200% 100%;
                    animation: shimmer 1.5s infinite;
                `;
            } else if (variant === 'text') {
                skeleton.style.cssText = `
                    width: ${typeof width === 'number' ? width + 'px' : width};
                    height: ${typeof height === 'number' ? height + 'px' : height};
                    border-radius: 4px;
                    background: linear-gradient(90deg, var(--bg-light) 25%, var(--border-color) 50%, var(--bg-light) 75%);
                    background-size: 200% 100%;
                    animation: shimmer 1.5s infinite;
                `;
            } else {
                skeleton.style.cssText = `
                    width: ${typeof width === 'number' ? width + 'px' : width};
                    height: ${typeof height === 'number' ? height + 'px' : height};
                    border-radius: 8px;
                    background: linear-gradient(90deg, var(--bg-light) 25%, var(--border-color) 50%, var(--bg-light) 75%);
                    background-size: 200% 100%;
                    animation: shimmer 1.5s infinite;
                `;
            }
            
            skeletons.push(skeleton);
        }
        
        return skeletons;
    },

    // Progress bar for long-running operations
    showProgress(element, options = {}) {
        const {
            value = 0,
            max = 100,
            showLabel = true,
            color = 'var(--primary-color)'
        } = options;
        
        if (!element) return null;
        
        const progressId = 'progress-' + Date.now();
        const percentage = Math.min(100, Math.max(0, (value / max) * 100));
        
        element.innerHTML = `
            <div class="progress-container" style="width: 100%;">
                ${showLabel ? `<div class="progress-label" style="display: flex; justify-content: space-between; margin-bottom: 8px; font-size: 0.85rem; color: var(--text-main);">
                    <span>Progress</span>
                    <span class="progress-percentage">${Math.round(percentage)}%</span>
                </div>` : ''}
                <div class="progress-bar-bg" style="width: 100%; height: 8px; background: var(--bg-light); border-radius: 4px; overflow: hidden;">
                    <div class="progress-bar-fill" 
                         style="width: ${percentage}%; height: 100%; background: ${color}; border-radius: 4px; transition: width 0.3s ease;"></div>
                </div>
            </div>
        `;
        
        this.activeLoaders.set(progressId, { element, max, showLabel, color });
        
        return progressId;
    },

    updateProgress(progressId, value) {
        const loader = this.activeLoaders.get(progressId);
        if (!loader) return;
        
        const { element, max, showLabel } = loader;
        const percentage = Math.min(100, Math.max(0, (value / max) * 100));
        
        const fill = element.querySelector('.progress-bar-fill');
        const label = element.querySelector('.progress-percentage');
        
        if (fill) fill.style.width = percentage + '%';
        if (label) label.textContent = Math.round(percentage) + '%';
    },

    hideProgress(progressId) {
        const loader = this.activeLoaders.get(progressId);
        if (!loader) return;
        
        const { element } = loader;
        element.innerHTML = '';
        
        this.activeLoaders.delete(progressId);
    },

    // Button loading state
    setButtonLoading(button, loading = true, originalText = null) {
        if (!button) return;
        
        if (loading) {
            button.dataset.originalText = originalText || button.textContent;
            button.disabled = true;
            button.innerHTML = `
                <span class="btn-spinner" style="display: inline-block; width: 14px; height: 14px; border: 2px solid currentColor; border-top-color: transparent; border-radius: 50%; animation: spin 0.8s linear infinite; margin-right: 8px; vertical-align: middle;"></span>
                <span style="vertical-align: middle;">Loading...</span>
            `;
        } else {
            button.disabled = false;
            button.textContent = button.dataset.originalText || originalText || button.textContent;
            delete button.dataset.originalText;
        }
    },

    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }
};

// Add CSS animations
const style = document.createElement('style');
style.textContent = `
    @keyframes spin {
        to { transform: rotate(360deg); }
    }

    @keyframes shimmer {
        0% { background-position: -200% 0; }
        100% { background-position: 200% 0; }
    }

    @media (prefers-reduced-motion: reduce) {
        .spinner-large,
        .inline-spinner,
        .skeleton,
        .btn-spinner {
            animation: none;
        }
        
        .skeleton {
            background: var(--bg-light);
        }
    }
`;
document.head.appendChild(style);

// Global functions for backward compatibility
window.showLoading = (message) => Loading.show(message);
window.hideLoading = (id) => Loading.hide(id);
window.hideAllLoading = () => Loading.hideAll();
window.showInlineLoading = (element, size) => Loading.showInline(element, size);
window.hideInlineLoading = (id) => Loading.hideInline(id);
window.setButtonLoading = (button, loading, text) => Loading.setButtonLoading(button, loading, text);

// Export for module usage
if (typeof module !== 'undefined' && module.exports) {
    module.exports = Loading;
}
