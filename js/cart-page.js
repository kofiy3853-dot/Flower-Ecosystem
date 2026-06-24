// js/cart-page.js
// Shopping cart page — render, update, remove, save for later, promo codes
// Server-backed when logged in, localStorage fallback when not

function renderCart() {
    let cartData, savedData;
    try { cartData = JSON.parse(localStorage.getItem('flower-cart')) || []; } catch { cartData = []; }
    try { savedData = JSON.parse(localStorage.getItem('flower-saved')) || []; } catch { savedData = []; }
    const emptyEl = document.getElementById('cartEmpty');
    const contentEl = document.getElementById('cartContent');
    const itemsEl = document.getElementById('cartItems');
    const savedEl = document.getElementById('savedItems');
    const savedSection = document.getElementById('savedSection');

    if (!cartData.length) {
        emptyEl.style.display = 'block';
        contentEl.style.display = 'none';
    } else {
        emptyEl.style.display = 'none';
        contentEl.style.display = 'block';
        renderCartItems(cartData, itemsEl);
        updateSummary(cartData);
    }

    if (savedSection) {
        if (savedData.length) {
            savedSection.style.display = 'block';
            renderSavedItems(savedData, savedEl);
        } else {
            savedSection.style.display = 'none';
        }
    }
}

function renderCartItems(cartData, container) {
    container.innerHTML = cartData.map((item, idx) => `
        <div class="cart-item" data-idx="${idx}">
            <a href="product-detail.html?id=${escapeHtml(String(item.id))}" class="cart-item-img">
                <img src="${escapeHtml(item.image || 'https://images.unsplash.com/photo-1490750967868-88df5691a78b?q=80&w=120&auto=format&fit=crop')}" alt="${escapeHtml(item.name)}">
            </a>
            <div class="cart-item-info">
                <div class="cart-item-top">
                    <div>
                        <a href="product-detail.html?id=${escapeHtml(String(item.id))}" class="cart-item-name">${escapeHtml(item.name)}</a>
                        <p class="cart-item-price">$${Number(item.price).toFixed(2)} each</p>
                    </div>
                    <button class="cart-item-remove" data-action="remove" data-idx="${idx}" data-cart-item-id="${item.cartItemId || ''}" aria-label="Remove item" title="Remove">
                        <i class="bi bi-trash"></i>
                    </button>
                </div>
                <div class="cart-item-bottom">
                    <div class="cart-qty">
                        <button class="cart-qty-btn" data-action="qty" data-idx="${idx}" data-delta="-1" data-cart-item-id="${item.cartItemId || ''}" aria-label="Decrease quantity">−</button>
                        <span class="cart-qty-val">${item.qty || 1}</span>
                        <button class="cart-qty-btn" data-action="qty" data-idx="${idx}" data-delta="1" data-cart-item-id="${item.cartItemId || ''}" aria-label="Increase quantity">+</button>
                    </div>
                    <div class="cart-item-total">$${(item.price * (item.qty || 1)).toFixed(2)}</div>
                    <button class="cart-save-btn" data-action="save" data-idx="${idx}" title="Save for later">
                        <i class="bi bi-heart"></i> Save
                    </button>
                </div>
            </div>
        </div>
    `).join('');
}

function renderSavedItems(savedData, container) {
    container.innerHTML = savedData.map((item, idx) => `
        <div class="cart-item saved-item">
            <a href="product-detail.html?id=${escapeHtml(String(item.id))}" class="cart-item-img">
                <img src="${escapeHtml(item.image || 'https://images.unsplash.com/photo-1490750967868-88df5691a78b?q=80&w=120&auto=format&fit=crop')}" alt="${escapeHtml(item.name)}">
            </a>
            <div class="cart-item-info">
                <div class="cart-item-top">
                    <div>
                        <a href="product-detail.html?id=${escapeHtml(String(item.id))}" class="cart-item-name">${escapeHtml(item.name)}</a>
                        <p class="cart-item-price">$${Number(item.price).toFixed(2)}</p>
                    </div>
                    <button class="cart-item-remove" data-action="unsave" data-idx="${idx}" aria-label="Remove from saved" title="Remove">
                        <i class="bi bi-x"></i>
                    </button>
                </div>
                <div class="cart-item-bottom">
                    <button class="btn btn-primary btn-sm" data-action="move-to-cart" data-idx="${idx}">
                        <i class="bi bi-cart-plus"></i> Move to Cart
                    </button>
                </div>
            </div>
        </div>
    `).join('');
}

function updateSummary(cartData) {
    const subtotal = cartData.reduce((sum, item) => sum + item.price * (item.qty || 1), 0);
    const count = cartData.reduce((sum, item) => sum + (item.qty || 1), 0);
    const discount = parseFloat(sessionStorage.getItem('cart-discount') || '0');

    const subtotalEl = document.getElementById('cartSubtotal');
    const totalEl = document.getElementById('cartTotal');
    const countEl = document.getElementById('cartCount');
    const discountRow = document.getElementById('discountRow');
    const discountEl = document.getElementById('cartDiscount');

    if (subtotalEl) subtotalEl.textContent = '$' + subtotal.toFixed(2);
    if (countEl) countEl.textContent = `${count} item${count !== 1 ? 's' : ''}`;
    if (totalEl) totalEl.textContent = '$' + (subtotal - discount).toFixed(2);

    if (discount > 0 && discountRow && discountEl) {
        discountRow.style.display = 'flex';
        discountEl.textContent = '-$' + discount.toFixed(2);
    } else if (discountRow) {
        discountRow.style.display = 'none';
    }

    const checkoutBtn = document.getElementById('checkoutBtn');
    if (checkoutBtn) checkoutBtn.disabled = !cartData.length;
}

function updateCartBadge() {
    let cart;
    try { cart = JSON.parse(localStorage.getItem('flower-cart')) || []; } catch { cart = []; }
    const count = cart.reduce((s, i) => s + (i.qty || 1), 0);
    document.querySelectorAll('.cart-count').forEach(el => el.textContent = count);
}

function authHeaders() {
    const token = localStorage.getItem('flower-token');
    return token ? { 'Authorization': 'Bearer ' + token, 'Content-Type': 'application/json' } : { 'Content-Type': 'application/json' };
}

function userLoggedIn() {
    return typeof window.isLoggedIn === 'function' ? window.isLoggedIn() : !!localStorage.getItem('flower-token');
}

async function handleCartAction(action, idx, delta) {
    let cart, saved;
    try { cart = JSON.parse(localStorage.getItem('flower-cart')) || []; } catch { cart = []; }
    try { saved = JSON.parse(localStorage.getItem('flower-saved')) || []; } catch { saved = []; }
    const btn = document.querySelector(`[data-action="${action}"][data-idx="${idx}"]`);
    const cartItemId = btn?.dataset?.cartItemId;

    if (action === 'qty') {
        const newQty = Math.max(1, (cart[idx].qty || 1) + parseInt(delta));

        if (userLoggedIn() && cartItemId) {
            try {
                await fetch(`/api/cart/items/${cartItemId}`, {
                    method: 'PUT',
                    headers: authHeaders(),
                    body: JSON.stringify({ quantity: newQty })
                });
            } catch (_) {}
        }
        cart[idx].qty = newQty;
        localStorage.setItem('flower-cart', JSON.stringify(cart));

    } else if (action === 'remove') {
        if (userLoggedIn() && cartItemId) {
            try {
                await fetch(`/api/cart/items/${cartItemId}`, {
                    method: 'DELETE',
                    headers: authHeaders()
                });
            } catch (_) {}
        }
        cart.splice(idx, 1);
        localStorage.setItem('flower-cart', JSON.stringify(cart));

    } else if (action === 'save') {
        const item = cart.splice(idx, 1)[0];
        saved.unshift(item);
        localStorage.setItem('flower-cart', JSON.stringify(cart));
        localStorage.setItem('flower-saved', JSON.stringify(saved));

    } else if (action === 'unsave') {
        saved.splice(idx, 1);
        localStorage.setItem('flower-saved', JSON.stringify(saved));

    } else if (action === 'move-to-cart') {
        const item = saved.splice(idx, 1)[0];
        if (userLoggedIn()) {
            try {
                await fetch('/api/cart/items', {
                    method: 'POST',
                    headers: authHeaders(),
                    body: JSON.stringify({ product_id: item.id, quantity: item.qty || 1 })
                });
            } catch (_) {}
        }
        const existing = cart.find(i => i.id === item.id);
        if (existing) { existing.qty = (existing.qty || 1) + (item.qty || 1); }
        else { cart.push(item); }
        localStorage.setItem('flower-cart', JSON.stringify(cart));
        localStorage.setItem('flower-saved', JSON.stringify(saved));
    }

    updateCartBadge();
    renderCart();
}

function applyPromoCode() {
    const input = document.getElementById('promoInput');
    const msg = document.getElementById('promoMsg');
    if (!input || !msg) return;

    const code = input.value.trim().toUpperCase();
    if (!code) { msg.textContent = 'Please enter a promo code'; msg.className = 'promo-msg promo-error'; return; }

    const promos = { 'FLORAL10': 10, 'SPRING15': 15, 'WELCOME20': 20 };
    const discount = promos[code];

    if (discount) {
        let cart;
        try { cart = JSON.parse(localStorage.getItem('flower-cart')) || []; } catch { cart = []; }
        const subtotal = cart.reduce((sum, item) => sum + item.price * (item.qty || 1), 0);
        const discountAmount = Math.min(subtotal * (discount / 100), subtotal);
        sessionStorage.setItem('cart-discount', discountAmount.toFixed(2));
        msg.textContent = `Code applied! $${discountAmount.toFixed(2)} off your order.`;
        msg.className = 'promo-msg promo-success';
        input.value = '';
        renderCart();
    } else {
        msg.textContent = 'Invalid promo code. Try FLORAL10, SPRING15, or WELCOME20.';
        msg.className = 'promo-msg promo-error';
    }
}

document.addEventListener('click', (e) => {
    const btn = e.target.closest('[data-action]');
    if (btn) {
        e.preventDefault();
        const action = btn.dataset.action;
        const idx = parseInt(btn.dataset.idx);
        const delta = btn.dataset.delta;
        handleCartAction(action, idx, delta);
        return;
    }

    if (e.target.closest('#checkoutBtn')) {
        window.location.href = 'checkout.html';
    }

    if (e.target.closest('#applyPromo')) {
        applyPromoCode();
    }
});

document.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && e.target.id === 'promoInput') {
        e.preventDefault();
        applyPromoCode();
    }
});

document.addEventListener('DOMContentLoaded', () => {
    if (userLoggedIn() && typeof syncCartFromServer === 'function') {
        syncCartFromServer().then(() => {
            renderCart();
            updateCartBadge();
        });
    } else {
        renderCart();
        updateCartBadge();
    }
});
