// Marketplace Page - Filters, Sorting, Pagination
import { api } from '../shared/api.js';
import { ProductCard } from '../shared/components.js';

class MarketplacePage {
    constructor() {
        this.products = [];
        this.filteredProducts = [];
        this.currentPage = 1;
        this.productsPerPage = 12;
        this.filters = {
            category: '',
            priceRange: '',
            sortBy: 'newest',
            search: ''
        };
        this.init();
    }

    async init() {
        await this.loadProducts();
        this.setupEventListeners();
        this.render();
    }

    async loadProducts() {
        this.products = await api.getProducts();
        this.filteredProducts = [...this.products];
    }

    setupEventListeners() {
        document.getElementById('category-filter')?.addEventListener('change', (e) => {
            this.filters.category = e.target.value;
            this.applyFilters();
        });

        document.getElementById('price-filter')?.addEventListener('change', (e) => {
            this.filters.priceRange = e.target.value;
            this.applyFilters();
        });

        document.getElementById('sort-filter')?.addEventListener('change', (e) => {
            this.filters.sortBy = e.target.value;
            this.applyFilters();
        });

        document.getElementById('search-input')?.addEventListener('input', (e) => {
            this.filters.search = e.target.value.toLowerCase();
            this.applyFilters();
        });

        document.getElementById('prev-page')?.addEventListener('click', () => this.changePage(-1));
        document.getElementById('next-page')?.addEventListener('click', () => this.changePage(1));
    }

    applyFilters() {
        this.filteredProducts = this.products.filter(product => {
            if (this.filters.category && product.category !== this.filters.category) return false;
            if (this.filters.priceRange) {
                const [min, max] = this.filters.priceRange.split('-').map(Number);
                if (product.price < min || (max && product.price > max)) return false;
            }
            if (this.filters.search && !product.name.toLowerCase().includes(this.filters.search)) return false;
            return true;
        });

        this.sortProducts();
        this.currentPage = 1;
        this.render();
    }

    sortProducts() {
        switch (this.filters.sortBy) {
            case 'price-low':
                this.filteredProducts.sort((a, b) => a.price - b.price);
                break;
            case 'price-high':
                this.filteredProducts.sort((a, b) => b.price - a.price);
                break;
            case 'newest':
                this.filteredProducts.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
                break;
            case 'popular':
                this.filteredProducts.sort((a, b) => b.sales - a.sales);
                break;
        }
    }

    changePage(delta) {
        const totalPages = Math.ceil(this.filteredProducts.length / this.productsPerPage);
        this.currentPage = Math.max(1, Math.min(totalPages, this.currentPage + delta));
        this.render();
    }

    render() {
        const container = document.getElementById('product-grid');
        if (!container) return;

        const start = (this.currentPage - 1) * this.productsPerPage;
        const end = start + this.productsPerPage;
        const pageProducts = this.filteredProducts.slice(start, end);

        container.innerHTML = pageProducts.map(product => ProductCard(product)).join('');

        this.updatePagination();
    }

    updatePagination() {
        const totalPages = Math.ceil(this.filteredProducts.length / this.productsPerPage);
        document.getElementById('page-info')?.textContent = `Page ${this.currentPage} of ${totalPages}`;
        document.getElementById('prev-page')?.setAttribute('disabled', this.currentPage === 1);
        document.getElementById('next-page')?.setAttribute('disabled', this.currentPage === totalPages);
    }
}

document.addEventListener('DOMContentLoaded', () => {
    new MarketplacePage();
});

export { MarketplacePage };