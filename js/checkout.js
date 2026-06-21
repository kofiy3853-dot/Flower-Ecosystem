// js/checkout.js
// Checkout page — cart summary, form validation, order placement via server API

(function () {
    const cartData = JSON.parse(localStorage.getItem('flower-cart') || '[]');
    let discount = parseFloat(sessionStorage.getItem('cart-discount') || '0');
    let appliedCoupon = sessionStorage.getItem('cart-coupon') || null;
    const itemsContainer = document.getElementById('checkoutItems');
    const placeBtn = document.getElementById('placeOrderBtn');

    if (!itemsContainer) return;

    if (!cartData.length) {
        itemsContainer.innerHTML = '<p style="color:var(--text-light);padding:1rem 0;">Your cart is empty. <a href="marketplace.html">Browse flowers →</a></p>';
        if (placeBtn) placeBtn.disabled = true;
        return;
    }

    let subtotal = 0;
    itemsContainer.innerHTML = cartData.map(item => {
        const sub = item.price * (item.qty || 1);
        subtotal += sub;
        return `
        <div class="chk-item">
            <img src="${escapeHtml(item.image || 'https://images.unsplash.com/photo-1490750967868-88df5691a78b?q=80&w=120&auto=format&fit=crop')}"
                 alt="${escapeHtml(item.name)}" class="chk-item-img">
            <div class="chk-item-info">
                <div class="chk-item-name">${escapeHtml(item.name)}</div>
                <div class="chk-item-meta">Qty: ${item.qty || 1}</div>
            </div>
            <div class="chk-item-price">$${sub.toFixed(2)}</div>
        </div>`;
    }).join('');

    const total = subtotal - discount;
    setText('chkSubtotal', '$' + subtotal.toFixed(2));
    setText('chkTotal', '$' + total.toFixed(2));

    const discountRow = document.getElementById('chkDiscountRow');
    const discountEl = document.getElementById('chkDiscount');
    if (discount > 0 && discountRow && discountEl) {
        discountRow.style.display = 'flex';
        discountEl.textContent = '-$' + discount.toFixed(2);
    }
    if (appliedCoupon) {
        const inp = document.getElementById('chkCouponInput');
        const msg = document.getElementById('chkCouponMsg');
        if (inp) { inp.value = appliedCoupon; inp.disabled = true; }
        if (msg) { msg.textContent = 'Coupon applied!'; msg.style.color = 'var(--accent-green)'; msg.style.display = 'block'; }
    }

    window.applyCoupon = async function () {
        const inp = document.getElementById('chkCouponInput');
        const msg = document.getElementById('chkCouponMsg');
        const code = inp ? inp.value.trim() : '';
        if (!code) { msg.textContent = 'Enter a coupon code'; msg.style.color = 'var(--error-color)'; msg.style.display = 'block'; return; }
        try {
            const res = await fetch('/api/coupons/validate', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ code, cart_total: subtotal })
            });
            const data = await res.json();
            if (!res.ok || !data.valid) throw new Error(data.error || 'Invalid coupon');
            discount = data.discount;
            appliedCoupon = code.toUpperCase();
            sessionStorage.setItem('cart-discount', discount.toString());
            sessionStorage.setItem('cart-coupon', appliedCoupon);
            sessionStorage.setItem('cart-coupon-id', data.coupon.id);
            const total = subtotal - discount;
            setText('chkTotal', '$' + total.toFixed(2));
            if (discountRow && discountEl) {
                discountRow.style.display = 'flex';
                discountEl.textContent = '-$' + discount.toFixed(2);
            }
            inp.disabled = true;
            msg.textContent = 'Coupon applied! Saved $' + discount.toFixed(2);
            msg.style.color = 'var(--accent-green)';
            msg.style.display = 'block';
            document.getElementById('chkApplyCoupon').disabled = true;
        } catch (e) {
            msg.textContent = e.message || 'Invalid coupon';
            msg.style.color = 'var(--error-color)';
            msg.style.display = 'block';
        }
    };

    const form = document.getElementById('checkoutForm');
    const fields = {
        firstName: { el: document.getElementById('firstName'), label: 'First name' },
        lastName: { el: document.getElementById('lastName'), label: 'Last name' },
        email: { el: document.getElementById('email'), label: 'Email' },
        phone: { el: document.getElementById('phone'), label: 'Phone' },
        address: { el: document.getElementById('address'), label: 'Address' },
        city: { el: document.getElementById('city'), label: 'City' },
        zipCode: { el: document.getElementById('zipCode'), label: 'Zip code' },
    };

    function validateField(key) {
        const { el, label } = fields[key];
        if (!el) return true;
        const val = el.value.trim();
        const errorEl = document.getElementById(key + 'Error');

        if (!val) {
            showError(el, errorEl, `${label} is required`);
            return false;
        }
        if (key === 'email' && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(val)) {
            showError(el, errorEl, 'Please enter a valid email');
            return false;
        }
        if (key === 'phone' && !/^[\d\s\-+()]{7,}$/.test(val)) {
            showError(el, errorEl, 'Please enter a valid phone number');
            return false;
        }
        clearError(el, errorEl);
        return true;
    }

    function showError(input, errorEl, msg) {
        input.style.borderColor = 'var(--error-color)';
        if (errorEl) { errorEl.textContent = msg; errorEl.style.display = 'block'; }
    }

    function clearError(input, errorEl) {
        input.style.borderColor = '';
        if (errorEl) { errorEl.style.display = 'none'; }
    }

    Object.keys(fields).forEach(key => {
        const el = fields[key].el;
        if (el) {
            el.addEventListener('blur', () => validateField(key));
            el.addEventListener('input', () => {
                if (el.style.borderColor) validateField(key);
            });
        }
    });

    function authHeaders() {
        const token = localStorage.getItem('flower-token');
        return token ? { 'Authorization': 'Bearer ' + token, 'Content-Type': 'application/json' } : { 'Content-Type': 'application/json' };
    }

    if (placeBtn) {
        placeBtn.addEventListener('click', async () => {
            let valid = true;
            Object.keys(fields).forEach(key => {
                if (!validateField(key)) valid = false;
            });
            if (!valid) {
                showToast('Please fill in all required fields correctly.', 'error');
                return;
            }

            const shipping = {
                firstName: fields.firstName.el.value.trim(),
                lastName: fields.lastName.el.value.trim(),
                email: fields.email.el.value.trim(),
                phone: fields.phone.el.value.trim(),
                address: fields.address.el.value.trim(),
                city: fields.city.el.value.trim(),
                zipCode: fields.zipCode.el.value.trim(),
            };

            placeBtn.disabled = true;
            placeBtn.innerHTML = '<span class="chk-spinner"></span> Processing...';

            const token = localStorage.getItem('flower-token');

            if (token) {
                try {
                    const body = {};
                    const cid = sessionStorage.getItem('cart-coupon-id');
                    if (cid && discount > 0) { body.coupon_id = cid; body.discount_amount = discount; }
                    const res = await fetch('/api/orders', {
                        method: 'POST',
                        headers: authHeaders(),
                        body: JSON.stringify(body)
                    });

                    if (!res.ok) {
                        const err = await res.json().catch(() => ({}));
                        throw new Error(err.error || 'Order failed');
                    }

                    const serverOrder = await res.json();
                    const order = {
                        id: serverOrder.id,
                        items: cartData.map(item => ({
                            name: item.name,
                            price: item.price,
                            qty: item.qty || 1,
                            image: item.image,
                            total: item.price * (item.qty || 1),
                        })),
                        shipping,
                        subtotal,
                        discount,
                        total: parseFloat(serverOrder.total_amount) || total,
                        status: (serverOrder.status || 'pending').toLowerCase(),
                        date: serverOrder.created_at || new Date().toISOString(),
                        dateFormatted: new Date(serverOrder.created_at || Date.now()).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' }),
                    };

                    localStorage.setItem('last-order', JSON.stringify(order));
                    localStorage.removeItem('flower-cart');
                    sessionStorage.removeItem('cart-discount');
                    sessionStorage.removeItem('cart-coupon');
                    sessionStorage.removeItem('cart-coupon-id');
                    document.querySelectorAll('.cart-count').forEach(el => el.textContent = '0');

                    if (typeof syncCartFromServer === 'function') await syncCartFromServer();

                    showConfirmation(order);
                    return;
                } catch (err) {
                    showToast(err.message || 'Order failed. Please try again.', 'error');
                    placeBtn.disabled = false;
                    placeBtn.innerHTML = '<i class="bi bi-lock-fill"></i> Place Order';
                    return;
                }
            }

            const orderId = 'FLW-' + Date.now().toString(36).toUpperCase();
            const order = {
                id: orderId,
                items: cartData.map(item => ({
                    name: item.name,
                    price: item.price,
                    qty: item.qty || 1,
                    image: item.image,
                    total: item.price * (item.qty || 1),
                })),
                shipping,
                subtotal,
                discount,
                total,
                status: 'confirmed',
                date: new Date().toISOString(),
                dateFormatted: new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' }),
            };

            const orders = JSON.parse(localStorage.getItem('dash-orders') || '[]');
            order.items.forEach(item => {
                orders.push({
                    id: orderId,
                    name: item.name,
                    total: item.total,
                    items: item.qty,
                    date: order.dateFormatted,
                    status: 'pending',
                    image: item.image,
                });
            });
            localStorage.setItem('dash-orders', JSON.stringify(orders));
            localStorage.setItem('last-order', JSON.stringify(order));
            localStorage.removeItem('flower-cart');
            sessionStorage.removeItem('cart-discount');
            sessionStorage.removeItem('cart-coupon');
            sessionStorage.removeItem('cart-coupon-id');
            document.querySelectorAll('.cart-count').forEach(el => el.textContent = '0');

            showConfirmation(order);
        });
    }

    function showConfirmation(order) {
        const modal = document.getElementById('confirmationModal');
        if (!modal) {
            window.location.href = 'orders.html';
            return;
        }
        document.getElementById('confOrderId').textContent = order.id;
        document.getElementById('confTotal').textContent = '$' + order.total.toFixed(2);
        document.getElementById('confEmail').textContent = order.shipping.email;
        document.getElementById('confAddress').textContent = `${order.shipping.address}, ${order.shipping.city} ${order.shipping.zipCode}`;
        document.getElementById('confDate').textContent = order.dateFormatted;
        modal.classList.add('active');
        document.body.style.overflow = 'hidden';
    }

    window.closeConfirmation = function () {
        const modal = document.getElementById('confirmationModal');
        if (modal) modal.classList.remove('active');
        document.body.style.overflow = '';
        window.location.href = 'orders.html';
    };

    window.continueShopping = function () {
        window.location.href = 'marketplace.html';
    };

    function setText(id, text) {
        const el = document.getElementById(id);
        if (el) el.textContent = text;
    }

    function showToast(msg, type) {
        const toast = document.getElementById('chkToast');
        if (!toast) { alert(msg); return; }
        toast.textContent = msg;
        toast.className = 'chk-toast chk-toast-' + type;
        toast.style.display = 'block';
        setTimeout(() => { toast.style.display = 'none'; }, 4000);
    }
})();
