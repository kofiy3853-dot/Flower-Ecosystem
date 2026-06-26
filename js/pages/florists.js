// Florists Page - Search, filters, map view

class FloristsPage {
    constructor() {
        this.florists = [];
        this.init();
    }

    async init() {
        await this.loadFlorists();
        this.renderList();
        this.setupSearch();
    }

    async loadFlorists() {
        this.florists = await api.fetchFlorists();
    }

    renderList() {
        const container = document.getElementById('florist-list');
        if (!container) return;
        container.innerHTML = this.florists.map(f => `
            <div class="florist-card">
                <img src="${f.logo}" alt="${f.name}" />
                <h3>${f.name}</h3>
                <p>${f.location}</p>
            </div>
        `).join('');
    }

    setupSearch() {
        const input = document.getElementById('florist-search');
        if (!input) return;
        input.addEventListener('input', (e) => {
            const term = e.target.value.toLowerCase();
            const filtered = this.florists.filter(f => f.name.toLowerCase().includes(term) || f.location.toLowerCase().includes(term));
            const container = document.getElementById('florist-list');
            container.innerHTML = filtered.map(f => `
                <div class="florist-card">
                    <img src="${f.logo}" alt="${f.name}" />
                    <h3>${f.name}</h3>
                    <p>${f.location}</p>
                </div>
            `).join('');
        });
    }
}

document.addEventListener('DOMContentLoaded', () => {
    new FloristsPage();
});
