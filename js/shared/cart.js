// js/shared/cart.js
// Cart — server-backed when logged in, localStorage fallback when not

const CART_KEY = 'flower-cart';

function getCart() {
    try { return JSON.parse(localStorage.getItem(CART_KEY) || '[]'); } catch { return []; }
}

function saveCart(cart) {
    localStorage.setItem(CART_KEY, JSON.stringify(cart));
}

function getCartCount() {
    return getCart().reduce((sum, item) => sum + (item.qty || 1), 0);
}

function updateAllBadges() {
    const count = getCartCount();
    document.querySelectorAll('.cart-count').forEach(el => {
        el.textContent = count;
        el.style.display = count > 0 ? 'flex' : 'none';
        el.style.animation = 'none';
        void el.offsetWidth;
        el.style.animation = 'pulse 0.5s ease';
    });
    renderMiniCart();
}

function renderMiniCart() {
    const cart = getCart();
    const itemsEl = document.getElementById('miniCartItems');
    const footerEl = document.getElementById('miniCartFooter');
    const countEl = document.getElementById('miniCartCount');
    const totalEl = document.getElementById('miniCartTotal');

    if (!itemsEl) return;

    if (!cart.length) {
        itemsEl.innerHTML = '<div class="mini-cart-empty"><i class="bi bi-cart-x" style="font-size:2rem;opacity:0.4;display:block;margin-bottom:0.5rem;"></i><p>Your cart is empty</p></div>';
        if (footerEl) footerEl.style.display = 'none';
        if (countEl) countEl.textContent = '0 items';
        return;
    }

    const totalItems = cart.reduce((s, i) => s + (i.qty || 1), 0);
    const totalPrice = cart.reduce((s, i) => s + (i.price || 0) * (i.qty || 1), 0);

    if (countEl) countEl.textContent = `${totalItems} item${totalItems !== 1 ? 's' : ''}`;

    itemsEl.innerHTML = cart.slice(0, 5).map((item, idx) => `
        <div class="mini-cart-item">
            <div class="mini-cart-item-img">
                <img src="${item.image || 'data:image/svg+xml,<svg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 50 50%22><rect fill=%22%23fce7f0%22 width=%2250%22 height=%2250%22/><text x=%2225%22 y=%2230%22 text-anchor=%22middle%22 fill=%22%23d8447c%22 font-size=%2218%22>✿</text></svg>'}" alt="${item.name || ''}">
            </div>
            <div class="mini-cart-item-info">
                <div class="mini-cart-item-name">${item.name || 'Item'}</div>
                <div class="mini-cart-item-price">GHS ${(item.price || 0).toFixed(2)}</div>
                <div class="mini-cart-item-qty">Qty: ${item.qty || 1}</div>
            </div>
            <button class="mini-cart-item-remove" onclick="removeMiniCartItem(${idx})" title="Remove"><i class="bi bi-x"></i></button>
        </div>
    `).join('') + (cart.length > 5 ? `<div style="text-align:center;padding:0.5rem;font-size:0.8rem;color:var(--text-light);">+ ${cart.length - 5} more items</div>` : '');

    if (footerEl) {
        footerEl.style.display = 'block';
        if (totalEl) totalEl.textContent = `GHS ${totalPrice.toFixed(2)}`;
    }
}

function removeMiniCartItem(idx) {
    const cart = getCart();
    const item = cart[idx];
    if (item?.cartItemId && isLoggedIn()) {
        serverRemoveCartItem(item.cartItemId).catch(() => {});
    }
    cart.splice(idx, 1);
    saveCart(cart);
    updateAllBadges();
}

function isLoggedIn() {
    try { return !!localStorage.getItem('flower-user'); } catch { return false; }
}

async function syncCartFromServer() {
    if (!isLoggedIn()) return;
    try {
        const res = await fetch('/api/cart', { headers: authHeaders() });
        if (!res.ok) return;
        const data = await res.json();
        const items = (data.items || []).map(i => ({
            id: i.product_id,
            name: i.name,
            price: parseFloat(i.price),
            image: (i.images && i.images[0]) || i.image || '',
            qty: i.quantity,
            cartItemId: i.id
        }));
        saveCart(items);
        updateAllBadges();
    } catch (_) {}
}

async function serverAddToCart(productId, quantity = 1) {
    if (!isLoggedIn()) return null;
    try {
        const res = await fetch('/api/cart/items', {
            method: 'POST',
            headers: authHeaders(),
            body: JSON.stringify({ product_id: productId, quantity })
        });
        if (!res.ok) {
            const err = await res.json().catch(() => ({}));
            throw new Error(err.error || 'Failed to add to cart');
        }
        return await res.json();
    } catch (e) {
        throw e;
    }
}

async function serverUpdateCartItem(cartItemId, quantity) {
    if (!isLoggedIn()) return null;
    const res = await fetch(`/api/cart/items/${cartItemId}`, {
        method: 'PUT',
        headers: authHeaders(),
        body: JSON.stringify({ quantity })
    });
    if (!res.ok) throw new Error('Failed to update cart item');
    return await res.json();
}

async function serverRemoveCartItem(cartItemId) {
    if (!isLoggedIn()) return null;
    const res = await fetch(`/api/cart/items/${cartItemId}`, {
        method: 'DELETE',
        headers: authHeaders()
    });
    if (!res.ok) throw new Error('Failed to remove cart item');
    return await res.json();
}

async function serverClearCart() {
    if (!isLoggedIn()) return null;
    const res = await fetch('/api/cart', {
        method: 'DELETE',
        headers: authHeaders()
    });
    if (!res.ok) throw new Error('Failed to clear cart');
    return await res.json();
}

function initCart() {
    syncCartFromServer();
    updateAllBadges();

    document.addEventListener('click', async (e) => {
        const btn = e.target.closest('[class*="add-to-cart"]');
        if (!btn) return;

        const id = btn.dataset.id;
        const name = btn.dataset.name;
        const price = parseFloat(btn.dataset.price);
        const image = btn.dataset.image || 'https://images.unsplash.com/photo-1490750967868-88df5691a78b?q=80&w=120&auto=format&fit=crop';

        if (!id || !name || isNaN(price)) return;

        const originalText = btn.textContent;
        btn.disabled = true;
        btn.textContent = '✓ Added';
        btn.style.backgroundColor = 'var(--accent-green)';

        try {
            if (isLoggedIn()) {
                await serverAddToCart(id, 1);
                await syncCartFromServer();
            } else {
                const cart = getCart();
                const existing = cart.find(i => i.id === id);
                if (existing) {
                    existing.qty = (existing.qty || 1) + 1;
                } else {
                    cart.push({ id, name, price, image, qty: 1 });
                }
                saveCart(cart);
                updateAllBadges();
            }
        } catch (err) {
            showToast(err.message || 'Failed to add to cart', 'error');
        } finally {
            setTimeout(() => {
                btn.textContent = originalText;
                btn.style.backgroundColor = '';
                btn.disabled = false;
            }, 2000);
        }
    });
}

function showToast(msg, type) {
    if (typeof Toast !== 'undefined') {
        Toast[type === 'error' ? 'error' : 'success'](msg);
    } else {
        // Fallback to old method if Toast not loaded
        const toast = document.getElementById('chkToast');
        if (!toast) return;
        toast.textContent = msg;
        toast.className = 'chk-toast chk-toast-' + type;
        toast.style.display = 'block';
        setTimeout(() => { toast.style.display = 'none'; }, 4000);
    }
}

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initCart);
} else {
    initCart();
}

document.addEventListener('componentLoaded', (e) => {
    if (e.detail.url && e.detail.url.includes('header')) {
        updateAllBadges();
        syncCartFromServer();
    }
});
