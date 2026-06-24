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
        el.style.animation = 'none';
        void el.offsetWidth;
        el.style.animation = 'pulse 0.5s ease';
    });
}

function authHeaders() {
    let token; try { token = localStorage.getItem('flower-token'); } catch { token = null; }
    return token ? { 'Authorization': 'Bearer ' + token, 'Content-Type': 'application/json' } : { 'Content-Type': 'application/json' };
}

function isLoggedIn() {
    try { return !!localStorage.getItem('flower-token'); } catch { return false; }
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
