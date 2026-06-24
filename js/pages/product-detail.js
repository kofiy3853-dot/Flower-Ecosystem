// Product Detail Page - Image gallery, quantity selector, reviews
import { api } from '../shared/api.js';
import { toast } from '../shared/toast.js';

class ProductDetailPage {
    constructor() {
        this.productId = this.getProductIdFromUrl();
        this.product = null;
        this.init();
    }

    getProductIdFromUrl() {
        const params = new URLSearchParams(window.location.search);
        return params.get('id');
    }

    async init() {
        await this.loadProduct();
        this.setupGallery();
        this.setupQuantity();
        this.setupAddToCart();
        this.renderReviews();
    }

    async loadProduct() {
        this.product = await api.getProductById(this.productId);
        document.title = this.product.name;
        document.getElementById('product-name').textContent = this.product.name;
        document.getElementById('product-price').textContent = `$${this.product.price.toFixed(2)}`;
        document.getElementById('product-description').textContent = this.product.description;
    }

    setupGallery() {
        const mainImg = document.getElementById('main-image');
        const thumbnails = document.querySelectorAll('.thumb-img');
        thumbnails.forEach(thumb => {
            thumb.addEventListener('click', () => {
                mainImg.src = thumb.dataset.large;
            });
        });
    }

    setupQuantity() {
        const qtyInput = document.getElementById('quantity-input');
        document.getElementById('inc-qty').addEventListener('click', () => qtyInput.value = Number(qtyInput.value) + 1);
        document.getElementById('dec-qty').addEventListener('click', () => {
            const val = Number(qtyInput.value);
            if (val > 1) qtyInput.value = val - 1;
        });
    }

    setupAddToCart() {
        document.getElementById('add-to-cart').addEventListener('click', () => {
            const qty = Number(document.getElementById('quantity-input').value);
            api.addToCart(this.productId, qty);
            toast.show('Added to cart');
        });
    }

    async renderReviews() {
        const reviewsContainer = document.getElementById('reviews');
        const reviews = await api.getReviews(this.productId);
        reviewsContainer.innerHTML = reviews.map(r => `
            <div class="review">
                <strong>${r.user}</strong> <span class="rating">${'★'.repeat(r.rating)}</span>
                <p>${r.comment}</p>
            </div>
        `).join('');
    }
}

document.addEventListener('DOMContentLoaded', () => {
    new ProductDetailPage();
});

export { ProductDetailPage };