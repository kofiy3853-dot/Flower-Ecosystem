// js/shared/theme.js
// Enhanced dark mode toggle with system preference detection and smooth transitions

const Theme = {
    currentTheme: 'light',

    init() {
        const html = document.documentElement;

        // Check for saved preference only (default to light)
        const savedTheme = localStorage.getItem('theme');

        this.currentTheme = savedTheme || 'light';

        // Apply theme
        this.applyTheme(this.currentTheme);
        
        // Listen for system preference changes
        window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', (e) => {
            if (!localStorage.getItem('theme')) {
                this.currentTheme = e.matches ? 'dark' : 'light';
                this.applyTheme(this.currentTheme);
            }
        });

        // Listen for theme toggle button click
        document.addEventListener('click', (e) => {
            const themeToggle = e.target.closest('.theme-toggle');
            if (themeToggle) {
                this.toggle();
            }
        });

        // Update theme icon after header loads
        document.addEventListener('componentLoaded', (e) => {
            if (e.detail.url && e.detail.url.includes('header.html')) {
                this.updateThemeIcon();
            }
        });

        // Initial icon update
        this.updateThemeIcon();
    },

    applyTheme(theme) {
        const html = document.documentElement;
        
        if (theme === 'dark') {
            html.classList.add('dark-mode');
        } else {
            html.classList.remove('dark-mode');
        }
        
        this.currentTheme = theme;
        this.updateThemeIcon();
    },

    toggle() {
        const newTheme = this.currentTheme === 'light' ? 'dark' : 'light';
        this.setTheme(newTheme);
    },

    setTheme(theme) {
        this.currentTheme = theme;
        localStorage.setItem('theme', theme);
        this.applyTheme(theme);
        
        // Optional: show toast notification
        if (typeof Toast !== 'undefined') {
            Toast.info(`${theme === 'dark' ? 'Dark' : 'Light'} mode enabled`, 2000);
        }
    },

    getTheme() {
        return this.currentTheme;
    },

    isDark() {
        return this.currentTheme === 'dark';
    },

    updateThemeIcon() {
        const themeIcon = document.getElementById('themeIcon');
        const themeText = document.getElementById('themeText');
        if (themeIcon) {
            if (this.currentTheme === 'dark') {
                themeIcon.className = 'bi bi-sun-fill';
            } else {
                themeIcon.className = 'bi bi-moon-fill';
            }
        }
        if (themeText) {
            themeText.textContent = this.currentTheme === 'dark' ? 'Light Mode' : 'Dark Mode';
        }
    }
};

// Initialize theme
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => Theme.init());
} else {
    Theme.init();
}

// Global functions for backward compatibility
window.toggleTheme = () => Theme.toggle();
window.setTheme = (theme) => Theme.setTheme(theme);
window.getTheme = () => Theme.getTheme();
window.isDarkMode = () => Theme.isDark();

// Export for module usage
if (typeof module !== 'undefined' && module.exports) {
    module.exports = Theme;
}
