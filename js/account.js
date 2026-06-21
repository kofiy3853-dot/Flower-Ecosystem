// js/account.js
// Account dashboard — customer and seller views, orders, wishlist, articles, events

(function () {
    if (!isLoggedIn()) {
        const content = document.getElementById('sectionBody');
        if (content) content.innerHTML = '<div class="empty-state"><i class="bi bi-person-lock"></i><h3>Please Sign In</h3><p style="margin-bottom:1.5rem;">You need to be logged in to view your dashboard.</p><button class="btn btn-primary" onclick="openAuthModal(\'login\')">Sign In</button></div>';
        return;
    }

    const user = getCurrentUser();
    let currentRole = (user?.role || '').toLowerCase();
    const isSellerRole = ['seller', 'florist', 'grower', 'admin', 'superadmin'].includes(currentRole);
    let role = isSellerRole ? 'seller' : 'customer';
    let section = 'overview';
    let allProducts = [];

    function authFetch(url, opts = {}) {
        const token = localStorage.getItem('flower-token');
        return fetch(url, { ...opts, headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}), ...(opts.headers || {}) } });
    }

    // Populate user info
    const name = user.name || user.email?.split('@')[0] || 'User';
    const dashAvatar = document.getElementById('dashAvatar');
    if (dashAvatar) dashAvatar.textContent = name.charAt(0).toUpperCase();
    const dashName = document.getElementById('dashName');
    if (dashName) dashName.textContent = name;
    const dashEmail = document.getElementById('dashEmail');
    if (dashEmail) dashEmail.textContent = user.email || '';

    // Show/hide seller menu items based on toggle state
    document.querySelectorAll('.seller-only').forEach(el => {
        el.style.display = role === 'seller' ? '' : 'none';
    });

    // Role toggle — always visible so any user can switch views
    const toggleBtns = document.querySelectorAll('#roleToggle button');
    toggleBtns.forEach(btn => {
        if (btn.dataset.role === role) btn.classList.add('active');
        else btn.classList.remove('active');
    });
    toggleBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            role = btn.dataset.role;
            section = 'overview';
            toggleBtns.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            // Update seller-only menu visibility based on toggle
            document.querySelectorAll('.seller-only').forEach(el => {
                el.style.display = role === 'seller' ? '' : 'none';
            });
            document.querySelectorAll('.dash-menu a[data-section]').forEach(a => {
                a.classList.remove('active');
            });
            document.querySelector('.dash-menu a[data-section="overview"]')?.classList.add('active');
            render();
        });
    });

    // Seed demo data
    if (!localStorage.getItem('dash-seeded')) {
        localStorage.setItem('dash-orders', JSON.stringify([
            { id: 'FLW-88291', name: 'Premium Orchids', total: 45.00, items: 1, date: '12 June 2026', status: 'delivered', image: 'https://images.unsplash.com/photo-1522926193341-e9ffd686c60f?q=80&w=100&auto=format&fit=crop' },
            { id: 'FLW-77102', name: 'Wedding Arrangement', total: 114.98, items: 2, date: '28 May 2026', status: 'processing', image: 'https://images.unsplash.com/photo-1549488344-1f9b8d2bd1f3?q=80&w=100&auto=format&fit=crop' },
            { id: 'FLW-66013', name: 'Classic Red Roses', total: 34.99, items: 1, date: '10 May 2026', status: 'delivered', image: 'https://images.unsplash.com/photo-1548094990-c16ca90f1f0d?q=80&w=100&auto=format&fit=crop' }
        ]));
        localStorage.setItem('savedArticles', JSON.stringify([
            { id: 'a1', title: 'The Ultimate Rose Care Guide', author: 'Flora Williams', readTime: '8 min read' },
            { id: 'a3', title: "Beginner's Guide to Floristry", author: 'Sarah Chen', readTime: '10 min read' }
        ]));
        localStorage.setItem('eventRegistrations', JSON.stringify([
            { title: 'Advanced Arrangement Techniques Workshop', day: '15', month: 'Jul', date: '15 Jul 2026', location: 'Accra, Ghana' },
            { title: 'Wedding Flower Planning 101', day: '05', month: 'Aug', date: '5 Aug 2026', location: 'Online (Zoom)' }
        ]));
        localStorage.setItem('seller-orders', JSON.stringify([
            { customer: 'Sarah M.', total: 89.99, items: 1, date: '10 June 2026', status: 'delivered' },
            { customer: 'James K.', total: 124.50, items: 2, date: '5 June 2026', status: 'shipped' },
            { customer: 'Priya R.', total: 45.00, items: 1, date: '1 June 2026', status: 'processing' }
        ]));
        localStorage.setItem('dash-seeded', 'true');
    }

    // Menu navigation
    document.getElementById('dashMenu')?.addEventListener('click', e => {
        const link = e.target.closest('a[data-section]');
        if (!link) return;
        e.preventDefault();
        section = link.dataset.section;
        document.querySelectorAll('.dash-menu a').forEach(a => a.classList.remove('active'));
        link.classList.add('active');
        render();
    });

    // Logout
    document.getElementById('logoutBtn')?.addEventListener('click', e => {
        e.preventDefault();
        logout();
        if (typeof updateAccountUI === 'function') updateAccountUI();
        window.location.href = 'index.html';
    });

    function badge(status) {
        const map = { delivered: 'badge-delivered', processing: 'badge-processing', shipped: 'badge-shipped', cancelled: 'badge-cancelled', pending: 'badge-processing', confirmed: 'badge-shipped' };
        return `<span class="badge-status ${map[status] || 'badge-processing'}">${escapeHtml(status || 'pending')}</span>`;
    }

    async function render() {
        const sectionTitle = document.getElementById('sectionTitle');
        const sectionSubtitle = document.getElementById('sectionSubtitle');
        const sectionBody = document.getElementById('sectionBody');
        if (!sectionBody) return;

        const titles = {
            overview: { customer: 'Dashboard Overview', seller: 'Seller Dashboard' },
            orders: { customer: 'My Orders', seller: 'Orders Received' },
            wishlist: { customer: 'My Wishlist', seller: 'My Products' },
            articles: { customer: 'Saved Articles', seller: 'Revenue & Analytics' },
            events: { customer: 'Event Registrations', seller: '' },
            'seller-overview': { customer: '', seller: 'Seller Dashboard' },
            'my-listings': { customer: '', seller: 'My Active Listings' }
        };
        if (sectionTitle) sectionTitle.textContent = titles[section]?.[role] || 'Dashboard';
        if (sectionSubtitle) sectionSubtitle.textContent = section === 'overview' ? (role === 'customer' ? "Welcome back! Here's what's happening." : 'Manage your shop, products, and earnings.') : '';

        if (!allProducts.length) {
            try { allProducts = await api.fetchProducts(); } catch {}
        }

        // Load server orders when logged in
        if (section === 'orders' || section === 'overview') {
            try {
                const token = localStorage.getItem('flower-token');
                if (token) {
                    const res = await fetch('/api/orders', { headers: { 'Authorization': 'Bearer ' + token } });
                    if (res.ok) {
                        const serverOrders = await res.json();
                        if (serverOrders.length) {
                            const localOrders = JSON.parse(localStorage.getItem('dash-orders') || '[]');
                            const localIds = new Set(localOrders.map(o => o.id));
                            serverOrders.forEach(o => {
                                if (!localIds.has(o.id)) {
                                    const items = o.items || [];
                                    items.forEach(item => {
                                        localOrders.push({
                                            id: o.id,
                                            name: item.name || 'Order #' + o.id,
                                            total: parseFloat(item.price || 0) * (item.quantity || 1),
                                            items: item.quantity || 1,
                                            date: new Date(o.created_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' }),
                                            status: (o.status || 'pending').toLowerCase(),
                                            image: item.image || ''
                                        });
                                    });
                                }
                            });
                            localStorage.setItem('dash-orders', JSON.stringify(localOrders));
                        }
                    }
                }
            } catch (_) {}
        }

        if (section === 'seller-overview') { renderSellerOverview(sectionBody); return; }
        role === 'customer' ? renderCustomer(sectionBody) : renderSeller(sectionBody);
    }

    function renderCustomer(body) {
        switch (section) {
            case 'overview': {
                const savedIds = JSON.parse(localStorage.getItem('gallerySaved') || '[]');
                const orders = JSON.parse(localStorage.getItem('dash-orders') || '[]');
                const articles = JSON.parse(localStorage.getItem('savedArticles') || '[]');
                const totalSpent = orders.reduce((s, o) => s + (o.total || 0), 0);
                body.innerHTML = `
                    <div class="stat-grid">
                        <div class="stat-card"><div class="num">${orders.length}</div><div class="label">Orders</div></div>
                        <div class="stat-card"><div class="num">${savedIds.length}</div><div class="label">Saved Items</div></div>
                        <div class="stat-card"><div class="num">${articles.length}</div><div class="label">Saved Articles</div></div>
                        <div class="stat-card"><div class="num">$${totalSpent.toFixed(0)}</div><div class="label">Total Spent</div></div>
                    </div>
                    <h3 style="margin-bottom:1rem;font-size:1.05rem;">Recent Orders</h3>
                    ${orders.length ? orders.slice(-3).map(o => `
                        <div class="dash-order">
                            <img class="order-img" src="${escapeHtml(o.image || '')}" alt="">
                            <div class="order-info"><h4>${escapeHtml(o.name || 'Order #' + o.id)}</h4><div class="order-meta">${escapeHtml(o.date)} · $${(o.total || 0).toFixed(2)}</div></div>
                            ${badge(o.status || 'delivered')}
                        </div>`).join('') : '<p style="color:var(--text-light);">No orders yet. <a href="marketplace.html">Start shopping!</a></p>'}
                `;
                break;
            }
            case 'orders': {
                const orders = JSON.parse(localStorage.getItem('dash-orders') || '[]');
                body.innerHTML = orders.length ? orders.slice().reverse().map(o => `
                    <div class="dash-order">
                        <img class="order-img" src="${escapeHtml(o.image || 'https://images.unsplash.com/photo-1490750967868-88df5691a78b?q=80&w=100&auto=format&fit=crop')}" alt="">
                        <div class="order-info"><h4>${escapeHtml(o.name || 'Order #' + o.id)}</h4><div class="order-meta">${escapeHtml(o.date)} · ${o.items || 1} item(s) · $${(o.total || 0).toFixed(2)}</div></div>
                        ${badge(o.status || 'delivered')}
                    </div>`).join('')
                : '<div class="empty-state"><i class="bi bi-box-seam"></i><h3>No Orders Yet</h3><p>Browse our marketplace!</p><a href="marketplace.html" class="btn btn-primary" style="margin-top:1rem;display:inline-block;">Shop Now</a></div>';
                break;
            }
            case 'wishlist': {
                const savedIds = JSON.parse(localStorage.getItem('gallerySaved') || '[]');
                const items = allProducts.filter(p => savedIds.includes(p.id));
                if (!items.length) {
                    body.innerHTML = '<div class="empty-state"><i class="bi bi-heart"></i><h3>Wishlist Empty</h3><p>Save products while browsing.</p><a href="marketplace.html" class="btn btn-primary" style="margin-top:1rem;display:inline-block;">Browse Products</a></div>';
                    return;
                }
                body.innerHTML = `<div class="wishlist-grid">${items.map(p => `
                    <div class="wl-item">
                        <a href="product-detail.html?id=${escapeHtml(p.id)}" style="text-decoration:none;color:inherit;">
                            <img loading="lazy" src="${escapeHtml(p.image)}" alt="${escapeHtml(p.name)}">
                            <div class="wl-body"><h4>${escapeHtml(p.name)}</h4><div class="wl-price">$${p.price.toFixed(2)}</div></div>
                        </a>
                        <button class="wl-remove" data-id="${escapeHtml(p.id)}" style="background:none;border:none;color:var(--error-color);font-size:0.8rem;cursor:pointer;padding:0 1rem 0.75rem;"><i class="bi bi-heartbreak"></i> Remove</button>
                    </div>`).join('')}</div>`;
                body.querySelectorAll('.wl-remove').forEach(btn => {
                    btn.addEventListener('click', () => {
                        const arr = JSON.parse(localStorage.getItem('gallerySaved') || '[]');
                        localStorage.setItem('gallerySaved', JSON.stringify(arr.filter(i => i !== btn.dataset.id)));
                        renderCustomer(body);
                    });
                });
                break;
            }
            case 'articles': {
                const articles = JSON.parse(localStorage.getItem('savedArticles') || '[]');
                body.innerHTML = articles.length ? articles.map(a => `
                    <div class="dash-order"><div style="flex:1;"><h4 style="font-size:0.9rem;margin-bottom:0.2rem;">${escapeHtml(a.title)}</h4><div style="font-size:0.8rem;color:var(--text-light);">${escapeHtml(a.author)} · ${escapeHtml(a.readTime)}</div></div><a href="article-detail.html?id=${escapeHtml(a.id)}" class="btn btn-outline btn-sm">Read</a></div>`).join('')
                : '<div class="empty-state"><i class="bi bi-book"></i><h3>No Saved Articles</h3><a href="learning.html" class="btn btn-primary" style="margin-top:1rem;display:inline-block;">Browse Articles</a></div>';
                break;
            }
            case 'events': {
                const regs = JSON.parse(localStorage.getItem('eventRegistrations') || '[]');
                body.innerHTML = regs.length ? regs.map(r => `
                    <div class="event-reg-card"><div class="ev-date"><strong>${escapeHtml(r.day || '15')}</strong><span>${escapeHtml(r.month || 'Jul')}</span></div><div style="flex:1;"><h4 style="font-size:0.95rem;margin-bottom:0.15rem;">${escapeHtml(r.title)}</h4><div style="font-size:0.8rem;color:var(--text-light);">${escapeHtml(r.location)} · ${escapeHtml(r.date)}</div></div><span class="badge-status badge-processing">Registered</span></div>`).join('')
                : '<div class="empty-state"><i class="bi bi-calendar-event"></i><h3>No Event Registrations</h3><a href="events.html" class="btn btn-primary" style="margin-top:1rem;display:inline-block;">Browse Events</a></div>';
                break;
            }
        }
    }

    function renderSeller(body) {
        switch (section) {
            case 'overview': renderSellerOverview(body); break;
            case 'my-listings': {
                const sellerProducts = JSON.parse(localStorage.getItem('seller-products') || '[]');
                const all = [...allProducts, ...sellerProducts];
                const active = all.filter(p => p.is_active !== false);
                if (!active.length) {
                    body.innerHTML = '<div class="empty-state"><i class="bi bi-box-seam"></i><h3>No Active Listings</h3><p>List your first product to start selling.</p><a href="create-listing.html" class="btn btn-primary" style="margin-top:1rem;display:inline-block;">Create Listing</a></div>';
                    return;
                }
                body.innerHTML = `
                    <div style="margin-bottom:1rem;display:flex;justify-content:space-between;align-items:center;">
                        <p style="color:var(--text-light);font-size:0.9rem;">${active.length} active listing(s)</p>
                        <a href="create-listing.html" class="btn btn-primary btn-sm"><i class="bi bi-plus-lg"></i> Add New</a>
                    </div>
                    <div class="wishlist-grid">${active.map(p => `
                        <div class="wl-item" data-product-id="${escapeHtml(p.id)}">
                            <a href="product-detail.html?id=${escapeHtml(p.id)}" style="text-decoration:none;color:inherit;">
                                <img loading="lazy" src="${escapeHtml(p.image || p.images?.[0] || '')}" alt="${escapeHtml(p.name)}">
                                <div class="wl-body">
                                    <h4>${escapeHtml(p.name)}</h4>
                                    <div class="wl-price">$${(p.price || 0).toFixed(2)}</div>
                                    <div style="font-size:0.8rem;color:var(--text-light);">${p.stock_quantity ?? '—'} in stock</div>
                                </div>
                            </a>
                            <div style="display:flex;gap:0.5rem;padding:0 0.75rem 0.75rem;">
                                <a href="create-listing.html?id=${escapeHtml(p.id)}" class="btn btn-outline btn-sm" style="flex:1;font-size:0.8rem;"><i class="bi bi-pencil"></i> Edit</a>
                                <button class="btn btn-sm delete-listing-btn" data-id="${escapeHtml(p.id)}" data-name="${escapeHtml(p.name)}" style="flex:1;font-size:0.8rem;background:rgba(220,38,38,0.1);color:#dc2626;border:1px solid rgba(220,38,38,0.2);"><i class="bi bi-trash"></i> Delete</button>
                            </div>
                        </div>`).join('')}</div>`;
                body.querySelectorAll('.delete-listing-btn').forEach(btn => {
                    btn.addEventListener('click', async () => {
                        const id = btn.dataset.id;
                        const name = btn.dataset.name;
                        if (!confirm(`Delete "${name}"? This cannot be undone.`)) return;
                        btn.disabled = true;
                        btn.innerHTML = '<i class="bi bi-hourglass-split"></i> ...';
                        try {
                            const res = await authFetch(`/api/products/${id}`, { method: 'DELETE' });
                            if (res.ok) {
                                // Remove from local array
                                const idx = allProducts.findIndex(p => String(p.id) === String(id));
                                if (idx !== -1) allProducts.splice(idx, 1);
                                const sellerIdx = sellerProducts.findIndex(p => String(p.id) === String(id));
                                if (sellerIdx !== -1) {
                                    sellerProducts.splice(sellerIdx, 1);
                                    localStorage.setItem('seller-products', JSON.stringify(sellerProducts));
                                }
                                render();
                            } else {
                                const err = await res.json().catch(() => ({}));
                                alert(err.error || 'Failed to delete');
                                btn.disabled = false;
                                btn.innerHTML = '<i class="bi bi-trash"></i> Delete';
                            }
                        } catch (e) {
                            alert('Network error — try again');
                            btn.disabled = false;
                            btn.innerHTML = '<i class="bi bi-trash"></i> Delete';
                        }
                    });
                });
                break;
            }
            case 'orders': {
                const sellerOrders = JSON.parse(localStorage.getItem('seller-orders') || '[]');
                body.innerHTML = sellerOrders.length ? sellerOrders.slice().reverse().map(o => `
                    <div class="dash-order">
                        <div style="flex:1;"><h4 style="font-size:0.95rem;">${escapeHtml(o.customer || 'Customer')} · $${(o.total || 0).toFixed(2)}</h4><div class="order-meta">${escapeHtml(o.date || '')} · ${o.items || 1} item(s)</div></div>
                        ${badge(o.status || 'processing')}
                    </div>`).join('')
                : '<div class="empty-state"><i class="bi bi-inbox"></i><h3>No Orders Yet</h3></div>';
                break;
            }
            case 'wishlist': {
                const sellerProducts = JSON.parse(localStorage.getItem('seller-products') || '[]');
                const all = [...allProducts, ...sellerProducts].slice(0, 10);
                body.innerHTML = `
                    <div style="margin-bottom:1rem;"><a href="create-listing.html" class="btn btn-primary btn-sm">+ Add Product</a></div>
                    <table class="seller-table">
                        <thead><tr><th>Product</th><th>Price</th><th>Category</th><th>Status</th></tr></thead>
                        <tbody>${all.map(p => `<tr><td><strong>${escapeHtml(p.name)}</strong></td><td>$${(p.price || 0).toFixed(2)}</td><td>${escapeHtml(p.category || '—')}</td><td><span class="badge-status badge-delivered">Active</span></td></tr>`).join('')}</tbody>
                    </table>`;
                break;
            }
            case 'articles': {
                const sellerOrders = JSON.parse(localStorage.getItem('seller-orders') || '[]');
                const totalRevenue = sellerOrders.reduce((s, o) => s + (o.total || 0), 0);
                body.innerHTML = `
                    <div class="stat-grid">
                        <div class="stat-card"><div class="num">$${totalRevenue.toFixed(0)}</div><div class="label">Total Revenue</div></div>
                        <div class="stat-card"><div class="num">${sellerOrders.filter(o => o.status === 'delivered').length}</div><div class="label">Completed Orders</div></div>
                        <div class="stat-card"><div class="num">0</div><div class="label">Store Views</div></div>
                        <div class="stat-card"><div class="num">0%</div><div class="label">Conversion Rate</div></div>
                    </div>
                    <p style="color:var(--text-light);font-size:0.9rem;">Full analytics coming soon — connect to the live platform to see real-time data.</p>`;
                break;
            }
            default:
                body.innerHTML = '';
        }
    }

    function renderSellerOverview(body) {
        const sellerOrders = JSON.parse(localStorage.getItem('seller-orders') || '[]');
        const sellerProducts = JSON.parse(localStorage.getItem('seller-products') || '[]');
        const totalRevenue = sellerOrders.reduce((s, o) => s + (o.total || 0), 0);
        body.innerHTML = `
            <div class="stat-grid">
                <div class="stat-card"><div class="num">${sellerProducts.length + allProducts.length}</div><div class="label">Products</div></div>
                <div class="stat-card"><div class="num">${sellerOrders.length}</div><div class="label">Orders</div></div>
                <div class="stat-card"><div class="num">$${totalRevenue.toFixed(0)}</div><div class="label">Revenue</div></div>
                <div class="stat-card"><div class="num">${sellerOrders.length ? '$' + (totalRevenue / sellerOrders.length).toFixed(0) : '$0'}</div><div class="label">Avg. Order</div></div>
            </div>
            <h3 style="margin-bottom:1rem;font-size:1.05rem;">Quick Actions</h3>
            <div style="display:flex;gap:1rem;flex-wrap:wrap;">
                <a href="create-listing.html" class="btn btn-primary">Add New Product</a>
                <a href="manage-orders.html" class="btn btn-outline">Manage Orders</a>
            </div>`;
    }

    render();
})();
