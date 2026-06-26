// Seller Dashboard - Manage listings and orders

class SellerDashboard {
    constructor() {
        this.listings = [];
        this.orders = [];
        this.init();
    }

    async init() {
        await this.loadListings();
        await this.loadOrders();
        this.renderListings();
        this.renderOrders();
        this.setupCreateListing();
    }

    async loadListings() {
        this.listings = await api.fetchSellerProducts();
    }

    async loadOrders() {
        this.orders = await api.fetchSellerOrders();
    }

    renderListings() {
        const container = document.getElementById('listings-grid');
        if (!container) return;
        container.innerHTML = this.listings.map(l => `
            <div class="listing-card">
                <img src="${l.image}" alt="${l.name}" />
                <h3>${l.name}</h3>
                <p>$${l.price.toFixed(2)}</p>
                <button data-id="${l.id}" class="edit-listing">Edit</button>
                <button data-id="${l.id}" class="delete-listing">Delete</button>
            </div>
        `).join('');
        this.attachListingHandlers();
    }

    renderOrders() {
        const container = document.getElementById('orders-table');
        if (!container) return;
        container.innerHTML = this.orders.map(o => `
            <tr>
                <td>${o.id}</td>
                <td>${o.productName}</td>
                <td>${o.buyer}</td>
                <td>${o.quantity}</td>
                <td>$${(o.price * o.quantity).toFixed(2)}</td>
                <td>${o.status}</td>
            </tr>
        `).join('');
    }

    attachListingHandlers() {
        document.querySelectorAll('.edit-listing').forEach(btn => {
            btn.addEventListener('click', () => this.editListing(btn.dataset.id));
        });
        document.querySelectorAll('.delete-listing').forEach(btn => {
            btn.addEventListener('click', () => this.deleteListing(btn.dataset.id));
        });
    }

    editListing(id) {
        window.location.href = `create-listing.html?id=${id}`;
    }

    async deleteListing(id) {
        await api.deleteProduct(id);
        Toast.show('Listing deleted');
        this.listings = this.listings.filter(l => l.id !== id);
        this.renderListings();
    }

    setupCreateListing() {
        const btn = document.getElementById('new-listing');
        if (btn) btn.addEventListener('click', () => window.location.href = 'create-listing.html');
    }
}

document.addEventListener('DOMContentLoaded', () => {
    new SellerDashboard();
});
