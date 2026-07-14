// js/buyer-dashboard.js
// Buyer Dashboard — orders, saved items, tracking, learning, events, community, messages, notifications, settings

var allOrders = [];
var allSavedItems = [];
var allNotifications = [];
var currentFilter = { orders: 'all', saved: 'all' };

function initBuyerDashboard() {
    if (!localStorage.getItem('flower-user')) {
        sessionStorage.setItem('pending-redirect', 'buyer-dashboard.html');
        sessionStorage.setItem('pending-auth', 'login');
        if (typeof openAuthModal === 'function') openAuthModal('login');
        return;
    }
    // Redirect non-buyer roles to their correct dashboard
    try {
        const user = JSON.parse(localStorage.getItem('flower-user'));
        const role = (user?.role || '').toLowerCase();
        if (['admin', 'superadmin'].includes(role)) { window.location.href = 'admin.html'; return; }
        if (['instructor'].includes(role)) { window.location.href = 'instructor-dashboard.html'; return; }
        if (['student'].includes(role)) { window.location.href = 'student-dashboard.html'; return; }
        if (['seller', 'florist', 'grower'].includes(role)) { window.location.href = 'seller-dashboard.html'; return; }
    } catch {}

    const dc = document.getElementById('dashContent');
    if (dc) dc.style.display = 'block';

    document.querySelectorAll('.dash-nav a[data-section]').forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault();
            const section = link.dataset.section;
            document.querySelectorAll('.dash-nav a').forEach(l => l.classList.remove('active'));
            link.classList.add('active');
            document.querySelectorAll('.section').forEach(s => s.classList.remove('active'));
            document.getElementById('section-' + section).classList.add('active');
            loadSection(section);
            window.scrollTo({ top: 0, behavior: 'smooth' });
        });
    });

    document.getElementById('buyerLogout')?.addEventListener('click', (e) => {
        e.preventDefault();
        if (typeof logout === 'function') logout();
        window.location.href = '/index.html';
    });

    document.querySelectorAll('.dash-mobile-item').forEach(item => {
        item.addEventListener('click', (e) => {
            e.preventDefault();
            const section = item.dataset.section;
            document.querySelectorAll('.dash-mobile-item').forEach(i => i.classList.remove('active'));
            item.classList.add('active');
            document.querySelectorAll('.dash-nav a').forEach(l => {
                l.classList.toggle('active', l.dataset.section === section);
            });
            document.querySelectorAll('.section').forEach(s => s.classList.remove('active'));
            document.getElementById('section-' + section).classList.add('active');
            loadSection(section);
            window.scrollTo({ top: 0, behavior: 'smooth' });
        });
    });

    const themeToggle = document.getElementById('themeToggle');
    if (themeToggle) {
        themeToggle.addEventListener('click', (e) => {
            e.preventDefault();
            document.documentElement.classList.toggle('dark-mode');
            const icon = document.getElementById('themeIcon');
            const text = document.getElementById('themeText');
            if (icon && text) {
                const isDark = document.documentElement.classList.contains('dark-mode');
                icon.className = isDark ? 'bi bi-sun-fill' : 'bi bi-moon-fill';
                text.textContent = isDark ? 'Light Mode' : 'Dark Mode';
            }
        });
    }

    loadUserProfile();
    loadSection('dashboard');
}

async function loadUserProfile() {
    try {
        const user = await fetchWithAuth('/api/user/profile', { headers: authHeaders() }).then(r => r.json());
        document.getElementById('sidebarName').textContent = user.name || 'My Account';
        document.getElementById('sidebarAvatar').textContent = (user.name || 'U')[0].toUpperCase();
        document.getElementById('welcomeTitle').textContent = `Welcome Back, ${user.name || 'there'}`;
    } catch {
        document.getElementById('sidebarName').textContent = 'My Account';
        document.getElementById('welcomeTitle').textContent = 'Welcome Back';
    }
}

async function loadSection(section) {
    switch (section) {
        case 'dashboard': await loadOverview(); break;
        case 'orders': await loadOrders(); break;
        case 'saved': await loadSavedItems(); break;
        case 'tracking': await loadTracking(); break;
        case 'recently-viewed': await loadRecentlyViewed(); break;
        case 'learning': await loadLearning(); break;
        case 'events': await loadMyEvents(); break;
        case 'community': await loadCommunity(); break;
        case 'messages': break;
        case 'notifications': await loadNotifications(); break;
        case 'activity': await loadActivity(); break;
        case 'settings': loadSettings(); break;
    }
}

async function loadOverview() {
    try {
        const orders = await fetchWithAuth('/api/orders', { headers: authHeaders() }).then(r => r.json());
        const orderList = Array.isArray(orders) ? orders : (orders.orders || []);

        const totalSpent = orderList.reduce((s, o) => s + Number(o.total_amount || 0), 0);
        const pending = orderList.filter(o => ['PENDING', 'CONFIRMED', 'PROCESSING'].includes(o.status)).length;
        const delivered = orderList.filter(o => o.status === 'DELIVERED').length;
        const savedItems = await fetchWithAuth('/api/buyer/saved', { headers: authHeaders() }).then(r => r.json()).then(d => Array.isArray(d) ? d : (d.items || [])).catch(() => []);

        document.getElementById('statsGrid').innerHTML = `
            <div class="stat-card"><div class="icon"><i class="bi bi-receipt"></i></div><div class="num">${orderList.length}</div><div class="label">Total Orders</div></div>
            <div class="stat-card"><div class="icon"><i class="bi bi-currency-dollar"></i></div><div class="num">GHS ${totalSpent.toFixed(2)}</div><div class="label">Total Spent</div></div>
            <div class="stat-card"><div class="icon"><i class="bi bi-hourglass-split"></i></div><div class="num">${pending}</div><div class="label">In Progress</div></div>
            <div class="stat-card"><div class="icon"><i class="bi bi-check-circle"></i></div><div class="num">${delivered}</div><div class="label">Delivered</div></div>
            <div class="stat-card"><div class="icon"><i class="bi bi-heart"></i></div><div class="num">${savedItems.length}</div><div class="label">Saved Items</div></div>
        `;

        const recent = orderList.slice(0, 5);
        document.getElementById('recentOrders').innerHTML = recent.length ? recent.map(o => `
            <div class="order-card" onclick="viewOrder('${o.id}')">
                <div class="order-info">
                    <div class="order-name">Order #${(o.id || '').slice(0, 8)}</div>
                    <div class="order-meta">${o.created_at ? new Date(o.created_at).toLocaleDateString() : ''}</div>
                </div>
                <div class="order-right">
                    <div class="order-price">GHS ${Number(o.total_amount || 0).toFixed(2)}</div>
                    <span class="badge badge-${(o.status || '').toLowerCase()}">${o.status || 'Pending'}</span>
                </div>
            </div>
        `).join('') : '<p style="color:var(--text-light);text-align:center;padding:2rem;">No orders yet. <a href="marketplace.html">Start shopping!</a></p>';

        let products = [];
        try { products = await fetchWithAuth('/api/products?limit=4&sort=popular', { headers: authHeaders() }).then(r => r.json()); } catch {}
        const productList = Array.isArray(products) ? products : (products.products || []);

        document.getElementById('recommendations').innerHTML = productList.length ? productList.map(p => `
            <div style="display:flex;gap:0.75rem;padding:0.75rem;border-bottom:1px solid var(--border-light);cursor:pointer;" onclick="window.location.href='product-detail.html?id=${p.id}'">
                <div style="width:50px;height:50px;border-radius:8px;overflow:hidden;flex-shrink:0;">
                    <img src="${escapeHtml(p.image || p.thumbnail_url || '')}" alt="${escapeHtml(p.name || 'Product')}" style="width:100%;height:100%;object-fit:cover;" loading="lazy">
                </div>
                <div style="flex:1;">
                    <div style="font-weight:500;font-size:0.88rem;">${escapeHtml(p.name || 'Product')}</div>
                    <div style="font-size:0.8rem;color:var(--primary-color);font-weight:600;">GHS ${Number(p.price || 0).toFixed(2)}</div>
                </div>
            </div>
        `).join('') : '<p style="color:var(--text-light);text-align:center;padding:1rem;">No recommendations yet</p>';

        let events = [];
        try { events = await fetchWithAuth('/api/events?limit=3', { headers: authHeaders() }).then(r => r.json()); } catch {}
        const eventList = Array.isArray(events) ? events : (events.events || []);

        document.getElementById('dashboardEvents').innerHTML = eventList.length ? eventList.slice(0, 3).map(e => `
            <div style="display:flex;gap:0.75rem;padding:0.75rem;border-bottom:1px solid var(--border-light);">
                <div style="width:40px;height:40px;border-radius:8px;background:var(--primary-light);display:flex;flex-direction:column;align-items:center;justify-content:center;flex-shrink:0;">
                    <span style="font-size:0.5rem;color:var(--primary-color);font-weight:600;">${e.event_date ? new Date(e.event_date).toLocaleDateString('en', {month:'short'}) : ''}</span>
                    <span style="font-size:0.85rem;font-weight:700;color:var(--primary-color);">${e.event_date ? new Date(e.event_date).getDate() : ''}</span>
                </div>
                <div>
                    <div style="font-weight:500;font-size:0.88rem;">${escapeHtml(e.title || 'Event')}</div>
                    <div style="font-size:0.78rem;color:var(--text-light);">${e.event_date ? new Date(e.event_date).toLocaleTimeString('en', {hour:'numeric',minute:'2-digit'}) : ''}</div>
                </div>
            </div>
        `).join('') : '<p style="color:var(--text-light);text-align:center;padding:1rem;">No upcoming events</p>';
    } catch (err) {
        handleError(err, 'Failed to load dashboard');
    }
}

async function loadOrders() {
    try {
        allOrders = await fetchWithAuth('/api/orders', { headers: authHeaders() }).then(r => r.json());
        allOrders = Array.isArray(allOrders) ? allOrders : (allOrders.orders || []);
    } catch {
        allOrders = [];
    }
    renderOrders();
    renderOrderFilters();
}

function renderOrderFilters() {
    const el = document.getElementById('orderFilters');
    if (!el) return;
    const statuses = ['all', 'PENDING', 'CONFIRMED', 'PROCESSING', 'SHIPPED', 'DELIVERED', 'CANCELLED'];
    el.innerHTML = `
        <input type="text" id="orderSearch" placeholder="Search orders..." class="cl-input" style="max-width:200px;" oninput="filterOrders()">
        <select id="orderStatusFilter" class="cl-input" onchange="filterOrders()">
            ${statuses.map(s => `<option value="${s}">${s === 'all' ? 'All Status' : s}</option>`).join('')}
        </select>
    `;
}

function filterOrders() {
    const q = (document.getElementById('orderSearch')?.value || '').toLowerCase();
    const status = document.getElementById('orderStatusFilter')?.value || 'all';
    const filtered = allOrders.filter(o => {
        const matchSearch = !q || (o.id || '').toLowerCase().includes(q) || (o.seller_name || '').toLowerCase().includes(q);
        const matchStatus = status === 'all' || o.status === status;
        return matchSearch && matchStatus;
    });
    renderOrders(filtered);
}

function renderOrders(orders = allOrders) {
    const el = document.getElementById('ordersList');
    if (!el) return;
    el.innerHTML = orders.length ? orders.map(o => `
        <div class="order-card" onclick="viewOrder('${o.id}')">
            <div class="order-info">
                <div class="order-name">Order #${(o.id || '').slice(0, 8)}</div>
                <div class="order-meta">${o.created_at ? new Date(o.created_at).toLocaleDateString() : ''} ${o.items ? '\u00B7 ' + o.items + ' item(s)' : ''}</div>
            </div>
            <div class="order-right">
                <div class="order-price">GHS ${Number(o.total_amount || 0).toFixed(2)}</div>
                <span class="badge badge-${(o.status || '').toLowerCase()}">${o.status || 'Pending'}</span>
            </div>
        </div>
    `).join('') : '<p style="color:var(--text-light);text-align:center;padding:3rem;">No orders yet. <a href="marketplace.html">Browse products</a></p>';
}

async function viewOrder(id) {
    try {
        const order = await fetchWithAuth(`/api/orders/${id}`, { headers: authHeaders() }).then(r => r.json());
        const modal = document.getElementById('orderModal');
        const content = document.getElementById('modalOrderContent');
        const title = document.getElementById('modalOrderTitle');
        if (!modal || !content) return;

        title.textContent = `Order #${(order.id || '').slice(0, 8)}`;
        const date = order.created_at ? new Date(order.created_at).toLocaleString() : '\u2014';

        content.innerHTML = `
            <div style="display:grid;grid-template-columns:1fr 1fr;gap:1rem;margin-bottom:1rem;">
                <div><div style="font-size:0.8rem;color:var(--text-light);">Seller</div><div style="font-weight:500;">${escapeHtml(order.seller_name || '\u2014')}</div></div>
                <div><div style="font-size:0.8rem;color:var(--text-light);">Date</div><div>${date}</div></div>
                <div><div style="font-size:0.8rem;color:var(--text-light);">Status</div><div>${statusBadge(order.status)}</div></div>
                <div><div style="font-size:0.8rem;color:var(--text-light);">Total</div><div style="font-weight:700;font-size:1.1rem;color:var(--primary-color);">GHS ${Number(order.total_amount || 0).toFixed(2)}</div></div>
            </div>
            <h3 style="margin:1rem 0 0.5rem;font-size:0.95rem;">Items</h3>
            ${(order.items || []).map(item => {
                return `<div style="display:flex;gap:0.75rem;padding:0.75rem 0;border-bottom:1px solid var(--border-light);align-items:center;">
                    <div style="width:50px;height:50px;border-radius:8px;overflow:hidden;flex-shrink:0;background:var(--bg-light);">${item.image ? `<img src="${escapeHtml(item.image)}" alt="" style="width:100%;height:100%;object-fit:cover;">` : '<div style="width:100%;height:100%;display:flex;align-items:center;justify-content:center;color:var(--text-light);"><i class="bi bi-image"></i></div>'}</div>
                    <div style="flex:1;"><div style="font-weight:500;">${escapeHtml(item.name || 'Product')}</div><div style="font-size:0.8rem;color:var(--text-light);">Qty: ${item.quantity} \u00D7 GHS ${Number(item.price || 0).toFixed(2)}</div></div>
                    <div style="font-weight:600;">GHS ${(item.quantity * parseFloat(item.price || 0)).toFixed(2)}</div>
                </div>`;
            }).join('') || '<p style="color:var(--text-light);">No items</p>'}
            ${['PENDING', 'CONFIRMED'].includes(order.status) ? `
            <div style="margin-top:1.5rem;display:flex;gap:0.5rem;justify-content:flex-end;">
                <button class="btn btn-outline" onclick="cancelOrder('${order.id}')"><i class="bi bi-x-circle"></i> Cancel Order</button>
            </div>` : ''}
            ${order.status === 'SHIPPED' ? `
            <div style="margin-top:1.5rem;padding:1rem;background:var(--bg-light);border-radius:8px;">
                <div style="font-weight:500;">Tracking: ${escapeHtml(order.tracking_number || 'Not available')}</div>
                <div style="font-size:0.8rem;color:var(--text-light);">Estimated delivery: ${order.estimated_delivery ? new Date(order.estimated_delivery).toLocaleDateString() : 'Unknown'}</div>
            </div>` : ''}
        `;
        modal.style.display = 'flex';
    } catch (err) {
        handleError(err, 'Failed to load order details');
    }
}

function statusBadge(status) {
    const colors = { PENDING: '#e67e22', CONFIRMED: '#3b82f6', PROCESSING: '#7c3aed', SHIPPED: '#8b5cf6', DELIVERED: '#16a34a', CANCELLED: '#dc2626' };
    const bg = colors[status] || '#6b7280';
    return `<span style="display:inline-flex;align-items:center;gap:0.3rem;padding:0.25rem 0.6rem;border-radius:20px;font-size:0.75rem;font-weight:600;background:${bg}15;color:${bg};"><span style="width:6px;height:6px;border-radius:50%;background:${bg};"></span>${status}</span>`;
}

async function cancelOrder(id) {
    if (!confirm('Cancel this order?')) return;
    try {
        await fetchWithAuth(`/api/orders/${id}/cancel`, { method: 'POST', headers: authHeaders() });
        closeOrderModal();
        loadOrders();
        loadOverview();
        if (typeof showToast === 'function') showToast('Order cancelled', 'success');
    } catch (err) {
        handleError(err, 'Failed to cancel order');
    }
}

function closeOrderModal() {
    const modal = document.getElementById('orderModal');
    if (modal) modal.style.display = 'none';
}

document.addEventListener('click', (e) => {
    if (e.target.id === 'orderModal') closeOrderModal();
});

async function loadSavedItems() {
    try {
        allSavedItems = await fetchWithAuth('/api/buyer/saved', { headers: authHeaders() }).then(r => r.json());
        allSavedItems = Array.isArray(allSavedItems) ? allSavedItems : (allSavedItems.items || []);
    } catch {
        allSavedItems = [];
    }
    renderSavedItems();
    renderSavedFilters();
}

function renderSavedFilters() {
    const el = document.getElementById('savedFilters');
    if (!el) return;
    el.innerHTML = `
        <input type="text" id="savedSearch" placeholder="Search saved items..." class="cl-input" style="max-width:200px;" oninput="filterSavedItems()">
        <select id="savedTypeFilter" class="cl-input" onchange="filterSavedItems()">
            <option value="all">All Types</option>
            <option value="product">Products</option>
            <option value="service">Services</option>
        </select>
    `;
}

function filterSavedItems() {
    const q = (document.getElementById('savedSearch')?.value || '').toLowerCase();
    const type = document.getElementById('savedTypeFilter')?.value || 'all';
    const filtered = allSavedItems.filter(item => {
        const matchSearch = !q || (item.name || '').toLowerCase().includes(q);
        const matchType = type === 'all' || item.type === type;
        return matchSearch && matchType;
    });
    renderSavedItems(filtered);
}

function renderSavedItems(items = allSavedItems) {
    const el = document.getElementById('savedItemsGrid');
    if (!el) return;
    if (!items.length) {
        el.innerHTML = '<p style="color:var(--text-light);text-align:center;padding:3rem;grid-column:1/-1;">No saved items yet. <a href="marketplace.html">Browse products</a></p>';
        return;
    }
    el.innerHTML = items.map(item => `
        <div class="fav-card" onclick="window.location.href='product-detail.html?id=${escapeHtml(item.id)}'">
            <div class="fav-img"><img src="${escapeHtml(item.image || item.thumbnail_url || '')}" alt="${escapeHtml(item.name || 'Product')}" loading="lazy"></div>
            <div class="fav-body">
                <div class="fav-name">${escapeHtml(item.name || 'Product')}</div>
                <div class="fav-price">GHS ${Number(item.price || 0).toFixed(2)}</div>
                <div style="display:flex;gap:0.5rem;margin-top:0.75rem;">
                    <button class="btn btn-sm btn-primary" style="flex:1;" onclick="event.stopPropagation(); addToCart('${item.id}')"><i class="bi bi-cart-plus"></i> Add to Cart</button>
                    <button class="btn btn-sm btn-outline" style="flex:1;" onclick="event.stopPropagation(); removeSavedItem('${item.id}')"><i class="bi bi-heart-break"></i> Remove</button>
                </div>
            </div>
        </div>
    `).join('');
}

async function removeSavedItem(id) {
    if (!confirm('Remove from saved items?')) return;
    try {
        await fetchWithAuth(`/api/buyer/saved/${id}`, { method: 'DELETE', headers: authHeaders() });
        allSavedItems = allSavedItems.filter(item => item.id !== id);
        renderSavedItems();
        if (typeof showToast === 'function') showToast('Removed from saved items', 'success');
    } catch (err) {
        handleError(err, 'Failed to remove saved item');
    }
}

async function loadTracking() {
    try {
        const orders = await fetchWithAuth('/api/orders', { headers: authHeaders() }).then(r => r.json());
        const orderList = Array.isArray(orders) ? orders : (orders.orders || []);
        const activeOrders = orderList.filter(o => !['DELIVERED', 'CANCELLED'].includes(o.status));

        const statusSteps = ['PENDING', 'CONFIRMED', 'PROCESSING', 'SHIPPED', 'DELIVERED'];
        const statusIcons = { PENDING: 'bi-clock', CONFIRMED: 'bi-check-circle', PROCESSING: 'bi-gear', SHIPPED: 'bi-truck', DELIVERED: 'bi-house-check' };

        document.getElementById('trackingList').innerHTML = activeOrders.length ? activeOrders.map(o => {
            const currentIdx = statusSteps.indexOf(o.status);
            return `
                <div class="section-card" style="margin-bottom:1rem;">
                    <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:1rem;">
                        <div>
                            <div style="font-weight:600;">Order #${(o.id || '').slice(0, 8)}</div>
                            <div style="font-size:0.8rem;color:var(--text-light);">${o.created_at ? new Date(o.created_at).toLocaleDateString() : ''}</div>
                        </div>
                        <div style="font-weight:700;color:var(--primary-color);">GHS ${Number(o.total_amount || 0).toFixed(2)}</div>
                    </div>
                    <div style="display:flex;justify-content:space-between;position:relative;">
                        <div style="position:absolute;top:15px;left:0;right:0;height:3px;background:var(--bg-light);"></div>
                        <div style="position:absolute;top:15px;left:0;height:3px;background:var(--accent-green);width:${(currentIdx / (statusSteps.length - 1)) * 100}%;"></div>
                        ${statusSteps.map((s, i) => `
                            <div style="text-align:center;z-index:1;">
                                <div style="width:32px;height:32px;border-radius:50%;background:${i <= currentIdx ? 'var(--accent-green)' : 'var(--bg-light)'};display:flex;align-items:center;justify-content:center;margin:0 auto 0.25rem;">
                                    <i class="bi ${statusIcons[s]}" style="color:${i <= currentIdx ? 'white' : 'var(--text-muted)'};font-size:0.9rem;"></i>
                                </div>
                                <div style="font-size:0.7rem;color:${i <= currentIdx ? 'var(--accent-green)' : 'var(--text-muted)'};">${s}</div>
                            </div>
                        `).join('')}
                    </div>
                </div>
            `;
        }).join('') : '<p style="color:var(--text-light);text-align:center;padding:3rem;">No active orders to track</p>';
    } catch (err) {
        handleError(err, 'Failed to load tracking');
    }
}

async function loadRecentlyViewed() {
    let items = [];
    try { items = JSON.parse(localStorage.getItem('recentlyViewed') || '[]'); } catch {}
    const uniqueItems = items.filter((item, i, self) => self.findIndex(x => x.id === item.id) === i).slice(0, 12);

    document.getElementById('recentlyViewedGrid').innerHTML = uniqueItems.length ? uniqueItems.map(item => `
        <div class="fav-card" onclick="window.location.href='product-detail.html?id=${item.id}'">
            <div class="fav-img"><img src="${escapeHtml(item.image || '')}" alt="${escapeHtml(item.name || 'Product')}" loading="lazy"></div>
            <div class="fav-body">
                <div class="fav-name">${escapeHtml(item.name || 'Product')}</div>
                <div class="fav-price">GHS ${Number(item.price || 0).toFixed(2)}</div>
            </div>
        </div>
    `).join('') : '<p style="color:var(--text-light);text-align:center;padding:3rem;">No recently viewed items</p>';
}

async function loadLearning() {
    try {
        const enrollments = await fetchWithAuth('/api/enrollments', { headers: authHeaders() }).then(r => r.json());
        const enrolled = Array.isArray(enrollments) ? enrollments : (enrollments.enrollments || []);

        const completed = enrolled.filter(e => e.completed).length;
        const inProgress = enrolled.filter(e => !e.completed).length;
        const certificates = enrolled.filter(e => e.certificate).length;

        document.getElementById('learningStats').innerHTML = `
            <div class="stat-card"><div class="icon"><i class="bi bi-book"></i></div><div class="num">${enrolled.length}</div><div class="label">Enrolled</div></div>
            <div class="stat-card"><div class="icon"><i class="bi bi-play-circle"></i></div><div class="num">${inProgress}</div><div class="label">In Progress</div></div>
            <div class="stat-card"><div class="icon"><i class="bi bi-check-circle"></i></div><div class="num">${completed}</div><div class="label">Completed</div></div>
            <div class="stat-card"><div class="icon"><i class="bi bi-award"></i></div><div class="num">${certificates}</div><div class="label">Certificates</div></div>
        `;

        const inProgressCourses = enrolled.filter(e => !e.completed).slice(0, 3);
        document.getElementById('continueCourses').innerHTML = inProgressCourses.length ? inProgressCourses.map(c => `
            <div style="display:flex;gap:0.75rem;padding:0.75rem;border-bottom:1px solid var(--border-light);">
                <div style="width:50px;height:50px;border-radius:8px;background:var(--primary-light);display:flex;align-items:center;justify-content:center;flex-shrink:0;">
                    <i class="bi bi-book" style="color:var(--primary-color);"></i>
                </div>
                <div style="flex:1;">
                    <div style="font-weight:500;font-size:0.9rem;">${escapeHtml(c.course_name || 'Course')}</div>
                    <div style="font-size:0.8rem;color:var(--text-light);">${c.progress || 0}% complete</div>
                    <div style="height:4px;background:var(--bg-light);border-radius:2px;margin-top:0.25rem;">
                        <div style="height:100%;width:${c.progress || 0}%;background:var(--primary-color);border-radius:2px;"></div>
                    </div>
                </div>
                <a href="course-detail.html?id=${c.course_id}" class="btn btn-sm btn-outline">Continue</a>
            </div>
        `).join('') : '<p style="color:var(--text-light);text-align:center;padding:2rem;">No courses in progress. <a href="learning.html">Browse courses</a></p>';

        const certs = enrolled.filter(e => e.certificate).slice(0, 3);
        document.getElementById('certificatesList').innerHTML = certs.length ? certs.map(c => `
            <div style="display:flex;gap:0.75rem;padding:0.75rem;border-bottom:1px solid var(--border-light);">
                <div style="width:40px;height:40px;border-radius:50%;background:rgba(139,92,246,0.1);display:flex;align-items:center;justify-content:center;flex-shrink:0;">
                    <i class="bi bi-award" style="color:#8b5cf6;"></i>
                </div>
                <div>
                    <div style="font-weight:500;font-size:0.9rem;">${escapeHtml(c.course_name || 'Course')}</div>
                    <div style="font-size:0.8rem;color:var(--text-light);">Completed ${c.completed_at ? new Date(c.completed_at).toLocaleDateString() : ''}</div>
                </div>
            </div>
        `).join('') : '<p style="color:var(--text-light);text-align:center;padding:2rem;">No certificates yet</p>';

        const progressHtml = enrolled.length ? `
            <div style="display:flex;flex-direction:column;gap:0.75rem;">
                ${enrolled.slice(0, 5).map(c => `
                    <div style="display:flex;align-items:center;gap:0.75rem;">
                        <div style="flex:1;font-size:0.9rem;">${escapeHtml(c.course_name || 'Course')}</div>
                        <div style="width:100px;height:6px;background:var(--bg-light);border-radius:3px;">
                            <div style="height:100%;width:${c.progress || 0}%;background:${c.progress >= 100 ? 'var(--accent-green)' : 'var(--primary-color)'};border-radius:3px;"></div>
                        </div>
                        <div style="font-size:0.8rem;font-weight:500;width:40px;text-align:right;">${c.progress || 0}%</div>
                    </div>
                `).join('')}
            </div>
        ` : '<p style="color:var(--text-light);text-align:center;padding:1rem;">No learning data yet</p>';
        document.getElementById('learningProgress').innerHTML = progressHtml;
    } catch (err) {
        handleError(err, 'Failed to load learning');
    }
}

async function loadMyEvents() {
    try {
        const events = await fetchWithAuth('/api/events/my', { headers: authHeaders() }).then(r => r.json());
        const eventList = Array.isArray(events) ? events : (events.events || []);

        const upcoming = eventList.filter(e => new Date(e.event_date) >= new Date());
        const past = eventList.filter(e => new Date(e.event_date) < new Date());

        document.getElementById('upcomingEventsList').innerHTML = upcoming.length ? upcoming.map(e => `
            <div style="display:flex;gap:0.75rem;padding:0.75rem;border-bottom:1px solid var(--border-light);">
                <div style="width:50px;height:50px;border-radius:8px;background:var(--primary-light);display:flex;flex-direction:column;align-items:center;justify-content:center;flex-shrink:0;">
                    <span style="font-size:0.6rem;color:var(--primary-color);font-weight:600;">${e.event_date ? new Date(e.event_date).toLocaleDateString('en', {month:'short'}) : ''}</span>
                    <span style="font-size:1rem;font-weight:700;color:var(--primary-color);">${e.event_date ? new Date(e.event_date).getDate() : ''}</span>
                </div>
                <div style="flex:1;">
                    <div style="font-weight:500;font-size:0.9rem;">${escapeHtml(e.title || 'Event')}</div>
                    <div style="font-size:0.8rem;color:var(--text-light);">${e.location || 'Online'}</div>
                </div>
                <a href="event-detail.html?id=${e.id}" class="btn btn-sm btn-outline">View</a>
            </div>
        `).join('') : '<p style="color:var(--text-light);text-align:center;padding:2rem;">No upcoming events. <a href="events.html">Browse events</a></p>';

        document.getElementById('pastEventsList').innerHTML = past.length ? past.map(e => `
            <div style="display:flex;gap:0.75rem;padding:0.75rem;border-bottom:1px solid var(--border-light);opacity:0.7;">
                <div style="width:50px;height:50px;border-radius:8px;background:var(--bg-light);display:flex;flex-direction:column;align-items:center;justify-content:center;flex-shrink:0;">
                    <span style="font-size:0.6rem;color:var(--text-muted);font-weight:600;">${e.event_date ? new Date(e.event_date).toLocaleDateString('en', {month:'short'}) : ''}</span>
                    <span style="font-size:1rem;font-weight:700;color:var(--text-muted);">${e.event_date ? new Date(e.event_date).getDate() : ''}</span>
                </div>
                <div style="flex:1;">
                    <div style="font-weight:500;font-size:0.9rem;">${escapeHtml(e.title || 'Event')}</div>
                    <div style="font-size:0.8rem;color:var(--text-light);">Attended</div>
                </div>
            </div>
        `).join('') : '<p style="color:var(--text-light);text-align:center;padding:2rem;">No past events</p>';
    } catch (err) {
        handleError(err, 'Failed to load events');
    }
}

async function loadCommunity() {
    try {
        const posts = await fetchWithAuth('/api/posts?my=1', { headers: authHeaders() }).then(r => r.json());
        const postList = Array.isArray(posts) ? posts : (posts.posts || []);

        document.getElementById('myPosts').innerHTML = postList.slice(0, 5).length ? postList.slice(0, 5).map(p => `
            <div style="padding:0.75rem;border-bottom:1px solid var(--border-light);">
                <div style="font-weight:500;font-size:0.9rem;">${escapeHtml(p.title || p.content?.slice(0, 50) || 'Post')}</div>
                <div style="font-size:0.8rem;color:var(--text-light);">${p.likes || 0} likes \u00B7 ${p.comments || 0} comments</div>
            </div>
        `).join('') : '<p style="color:var(--text-light);text-align:center;padding:2rem;">No posts yet. <a href="create-post.html">Create your first post</a></p>';

        const discussions = await fetchWithAuth('/api/discussions?my=1', { headers: authHeaders() }).then(r => r.json());
        const discList = Array.isArray(discussions) ? discussions : (discussions.discussions || []);

        document.getElementById('myDiscussions').innerHTML = discList.slice(0, 5).length ? discList.slice(0, 5).map(d => `
            <div style="padding:0.75rem;border-bottom:1px solid var(--border-light);">
                <div style="font-weight:500;font-size:0.9rem;">${escapeHtml(d.title || 'Discussion')}</div>
                <div style="font-size:0.8rem;color:var(--text-light);">${d.replies || 0} replies</div>
            </div>
        `).join('') : '<p style="color:var(--text-light);text-align:center;padding:2rem;">No discussions yet. <a href="discussions.html">Join a discussion</a></p>';

        const events = await fetchWithAuth('/api/events?upcoming=3', { headers: authHeaders() }).then(r => r.json());
        const eventList = Array.isArray(events) ? events : (events.events || []);

        document.getElementById('upcomingEvents').innerHTML = eventList.slice(0, 3).length ? eventList.slice(0, 3).map(e => `
            <div style="display:flex;gap:1rem;padding:0.75rem;border-bottom:1px solid var(--border-light);">
                <div style="width:50px;height:50px;border-radius:8px;background:var(--primary-light);display:flex;flex-direction:column;align-items:center;justify-content:center;flex-shrink:0;">
                    <span style="font-size:0.65rem;color:var(--primary-color);font-weight:600;">${e.date ? new Date(e.date).toLocaleDateString('en', {month:'short'}) : ''}</span>
                    <span style="font-size:1rem;font-weight:700;color:var(--primary-color);">${e.date ? new Date(e.date).getDate() : ''}</span>
                </div>
                <div>
                    <div style="font-weight:500;font-size:0.9rem;">${escapeHtml(e.title || 'Event')}</div>
                    <div style="font-size:0.8rem;color:var(--text-light);">${e.attendees || 0} attending</div>
                </div>
            </div>
        `).join('') : '<p style="color:var(--text-light);text-align:center;padding:2rem;">No upcoming events. <a href="events.html">Browse events</a></p>';
    } catch (err) {
        handleError(err, 'Failed to load community');
    }
}

async function loadNotifications() {
    try {
        allNotifications = await fetchWithAuth('/api/notifications', { headers: authHeaders() }).then(r => r.json());
        allNotifications = Array.isArray(allNotifications) ? allNotifications : (allNotifications.notifications || []);
    } catch {
        allNotifications = [];
    }
    renderNotifications();
    updateNotifBadge();
}

function updateNotifBadge() {
    const unread = allNotifications.filter(n => !n.is_read).length;
    const badge = document.getElementById('notifBadge');
    if (badge) {
        if (unread > 0) {
            badge.textContent = unread > 99 ? '99+' : unread;
            badge.style.display = 'inline';
        } else {
            badge.style.display = 'none';
        }
    }
}

function renderNotifications() {
    const el = document.getElementById('notificationsList');
    if (!el) return;
    if (!allNotifications.length) {
        el.innerHTML = '<p style="color:var(--text-light);text-align:center;padding:3rem;">No notifications</p>';
        return;
    }
    const iconMap = {
        order: 'bi-bag-check',
        message: 'bi-chat-dots',
        system: 'bi-bell',
        review: 'bi-star',
        payment: 'bi-credit-card'
    };
    el.innerHTML = allNotifications.map(n => {
        const icon = iconMap[n.type] || 'bi-bell';
        return `
            <div class="notif-item ${n.is_read ? '' : 'unread'}" onclick="markNotifRead('${n.id}')" style="display:flex;gap:0.75rem;padding:1rem;margin-bottom:0.5rem;border-radius:10px;cursor:pointer;transition:all 0.15s;${n.is_read ? 'background:var(--bg-white);border:1px solid var(--border-color);' : 'background:rgba(139,92,246,0.04);border:1px solid rgba(139,92,246,0.15);'}">
                <div style="width:36px;height:36px;border-radius:50%;background:var(--primary-light);display:flex;align-items:center;justify-content:center;flex-shrink:0;">
                    <i class="bi ${icon}" style="color:var(--primary-color);"></i>
                </div>
                <div style="flex:1;">
                    <div style="font-weight:500;font-size:0.9rem;">${escapeHtml(n.title || 'Notification')}</div>
                    <div style="font-size:0.82rem;color:var(--text-light);">${escapeHtml(n.message || '')}</div>
                    <div style="font-size:0.75rem;color:var(--text-muted);margin-top:0.25rem;">${n.created_at ? timeAgo(n.created_at) : ''}</div>
                </div>
                ${!n.is_read ? '<div style="width:8px;height:8px;border-radius:50%;background:var(--primary-color);flex-shrink:0;margin-top:0.35rem;"></div>' : ''}
            </div>
        `;
    }).join('');
}

async function markNotifRead(id) {
    const notif = allNotifications.find(n => n.id === id);
    if (notif && !notif.is_read) {
        notif.is_read = true;
        try { await fetchWithAuth(`/api/notifications/${id}/read`, { method: 'PUT', headers: authHeaders() }); } catch {}
        updateNotifBadge();
        renderNotifications();
    }
}

async function markAllNotifRead() {
    try {
        await fetchWithAuth('/api/notifications/read', { method: 'PUT', headers: authHeaders() });
        allNotifications.forEach(n => n.is_read = true);
        updateNotifBadge();
        renderNotifications();
    } catch {}
}

async function loadActivity() {
    try {
        const orders = await fetchWithAuth('/api/orders', { headers: authHeaders() }).then(r => r.json());
        const orderList = Array.isArray(orders) ? orders : (orders.orders || []);

        const activities = orderList.slice(0, 10).map(o => ({
            icon: 'bi-bag-check',
            iconBg: 'rgba(216,68,124,0.1)',
            iconColor: 'var(--primary-color)',
            text: `Order #${(o.id || '').slice(0, 8)} \u2014 ${o.status || 'Pending'}`,
            time: o.created_at ? timeAgo(o.created_at) : ''
        }));

        document.getElementById('activityList').innerHTML = activities.length ? activities.map(a => `
            <div class="activity-item">
                <div class="activity-icon" style="background:${a.iconBg};color:${a.iconColor};"><i class="bi ${a.icon}"></i></div>
                <div>
                    <div class="activity-text">${a.text}</div>
                    <div class="activity-time">${a.time}</div>
                </div>
            </div>
        `).join('') : '<p style="color:var(--text-light);text-align:center;padding:3rem;">No activity yet</p>';
    } catch (err) {
        handleError(err, 'Failed to load activity');
    }
}

function loadSettings() {
    const user = typeof getCurrentUser === 'function' ? getCurrentUser() : {};
    const settingsEl = document.getElementById('settingsForm');
    if (!settingsEl) return;

    settingsEl.innerHTML = `
        <div style="display:flex;gap:0.5rem;margin-bottom:1.5rem;border-bottom:1px solid var(--border-color);padding-bottom:0.5rem;">
            <button class="btn btn-sm settings-tab active" data-tab="profile"><i class="bi bi-person"></i> Profile</button>
            <button class="btn btn-sm settings-tab" data-tab="notifications"><i class="bi bi-bell"></i> Notifications</button>
            <button class="btn btn-sm settings-tab" data-tab="preferences"><i class="bi bi-gear"></i> Preferences</button>
        </div>

        <div id="settings-profile" class="settings-panel">
            <div style="display:grid;grid-template-columns:1fr 1fr;gap:1rem;">
                <div class="form-group"><label>Full Name</label><input type="text" id="setName" class="form-input" value="${escapeHtml(user.name || '')}"></div>
                <div class="form-group"><label>Email</label><input type="email" id="setEmail" class="form-input" value="${escapeHtml(user.email || '')}" disabled></div>
                <div class="form-group"><label>Phone</label><input type="tel" id="setPhone" class="form-input" placeholder="+233 XX XXX XXXX"></div>
                <div class="form-group"><label>Location</label><input type="text" id="setLocation" class="form-input" placeholder="City, Country"></div>
            </div>
            <div class="form-group"><label>Bio</label><textarea id="setBio" class="form-input" rows="2" placeholder="Tell us about yourself..."></textarea></div>
            <div class="form-group"><label>Default Delivery Address</label><textarea id="setAddress" class="form-input" rows="2" placeholder="Enter your delivery address"></textarea></div>
            <button class="btn btn-primary" onclick="saveSettings('profile')" style="margin-top:1rem;"><i class="bi bi-save"></i> Save Profile</button>
        </div>

        <div id="settings-notifications" class="settings-panel" style="display:none;">
            <div style="display:flex;flex-direction:column;gap:1rem;">
                <label style="display:flex;align-items:center;gap:0.75rem;padding:0.75rem;background:var(--bg-light);border-radius:8px;cursor:pointer;">
                    <input type="checkbox" id="notifOrders" checked style="width:18px;height:18px;accent-color:var(--primary-color);">
                    <div><div style="font-weight:500;">Order Updates</div><div style="font-size:0.8rem;color:var(--text-light);">Get notified about order status changes</div></div>
                </label>
                <label style="display:flex;align-items:center;gap:0.75rem;padding:0.75rem;background:var(--bg-light);border-radius:8px;cursor:pointer;">
                    <input type="checkbox" id="notifMessages" checked style="width:18px;height:18px;accent-color:var(--primary-color);">
                    <div><div style="font-weight:500;">New Messages</div><div style="font-size:0.8rem;color:var(--text-light);">Receive alerts for new messages</div></div>
                </label>
                <label style="display:flex;align-items:center;gap:0.75rem;padding:0.75rem;background:var(--bg-light);border-radius:8px;cursor:pointer;">
                    <input type="checkbox" id="notifCourses" checked style="width:18px;height:18px;accent-color:var(--primary-color);">
                    <div><div style="font-weight:500;">Course Updates</div><div style="font-size:0.8rem;color:var(--text-light);">Notifications about enrolled courses</div></div>
                </label>
                <label style="display:flex;align-items:center;gap:0.75rem;padding:0.75rem;background:var(--bg-light);border-radius:8px;cursor:pointer;">
                    <input type="checkbox" id="notifMarketing" style="width:18px;height:18px;accent-color:var(--primary-color);">
                    <div><div style="font-weight:500;">Marketing Emails</div><div style="font-size:0.8rem;color:var(--text-light);">Receive tips, offers, and news</div></div>
                </label>
            </div>
            <button class="btn btn-primary" onclick="saveSettings('notifications')" style="margin-top:1.5rem;"><i class="bi bi-save"></i> Save Preferences</button>
        </div>

        <div id="settings-preferences" class="settings-panel" style="display:none;">
            <div style="display:flex;flex-direction:column;gap:1rem;">
                <div class="form-group">
                    <label>Language</label>
                    <select id="setLanguage" class="form-input">
                        <option value="en">English</option>
                        <option value="tw">Twi</option>
                        <option value="fr">French</option>
                    </select>
                </div>
                <div class="form-group">
                    <label>Currency</label>
                    <select id="setCurrency" class="form-input">
                        <option value="GHS">Ghanaian Cedi (GHS)</option>
                        <option value="USD">US Dollar (USD)</option>
                        <option value="NGN">Nigerian Naira (NGN)</option>
                    </select>
                </div>
                <label style="display:flex;align-items:center;gap:0.75rem;padding:0.75rem;background:var(--bg-light);border-radius:8px;cursor:pointer;">
                    <input type="checkbox" id="darkMode" style="width:18px;height:18px;accent-color:var(--primary-color);">
                    <div><div style="font-weight:500;">Dark Mode</div><div style="font-size:0.8rem;color:var(--text-light);">Use dark theme</div></div>
                </label>
            </div>
            <button class="btn btn-primary" onclick="saveSettings('preferences')" style="margin-top:1.5rem;"><i class="bi bi-save"></i> Save Preferences</button>
        </div>
    `;

    document.querySelectorAll('.settings-tab').forEach(tab => {
        tab.addEventListener('click', () => {
            document.querySelectorAll('.settings-tab').forEach(t => t.classList.remove('active'));
            tab.classList.add('active');
            document.querySelectorAll('.settings-panel').forEach(p => p.style.display = 'none');
            document.getElementById('settings-' + tab.dataset.tab).style.display = 'block';
        });
    });

    if (user.preferences) {
        document.getElementById('setPhone').value = user.preferences.phone || '';
        document.getElementById('setLocation').value = user.preferences.location || '';
        document.getElementById('setBio').value = user.preferences.bio || '';
        document.getElementById('setAddress').value = user.preferences.address || '';
        document.getElementById('setLanguage').value = user.preferences.language || 'en';
        document.getElementById('setCurrency').value = user.preferences.currency || 'GHS';
        document.getElementById('darkMode').checked = user.preferences.dark_mode === true;
        document.getElementById('notifOrders').checked = user.preferences.notif_orders !== false;
        document.getElementById('notifMessages').checked = user.preferences.notif_messages !== false;
        document.getElementById('notifCourses').checked = user.preferences.notif_courses !== false;
        document.getElementById('notifMarketing').checked = user.preferences.notif_marketing === true;
    }
}

async function saveSettings(type) {
    try {
        let body = {};
        if (type === 'profile') {
            body = {
                name: document.getElementById('setName')?.value?.trim(),
                phone: document.getElementById('setPhone')?.value?.trim(),
                location: document.getElementById('setLocation')?.value?.trim(),
                bio: document.getElementById('setBio')?.value?.trim(),
                address: document.getElementById('setAddress')?.value?.trim()
            };
        } else if (type === 'notifications') {
            body = {
                notif_orders: document.getElementById('notifOrders')?.checked,
                notif_messages: document.getElementById('notifMessages')?.checked,
                notif_courses: document.getElementById('notifCourses')?.checked,
                notif_marketing: document.getElementById('notifMarketing')?.checked
            };
        } else if (type === 'preferences') {
            body = {
                language: document.getElementById('setLanguage')?.value,
                currency: document.getElementById('setCurrency')?.value,
                dark_mode: document.getElementById('darkMode')?.checked
            };
        }
        await fetchWithAuth('/api/user/preferences', { method: 'PUT', headers: authHeaders(), body: JSON.stringify(body) });
        if (typeof showToast === 'function') showToast('Settings saved!', 'success');
        else alert('Settings saved!');
    } catch (err) {
        handleError(err, 'Failed to save settings');
    }
}

function timeAgo(d) {
    const diff = Math.floor((Date.now() - new Date(d)) / 1000);
    if (diff < 60) return 'just now';
    if (diff < 3600) return Math.floor(diff / 60) + 'm ago';
    if (diff < 86400) return Math.floor(diff / 3600) + 'h ago';
    return Math.floor(diff / 86400) + 'd ago';
}

function escapeHtml(str) {
    if (!str) return '';
    return String(str).replace(/[&<>"']/g, c => ({ '&': '&', '<': '<', '>': '>', '"': '"', "'": '\'' }[c]));
}

function getToken() { return null; }

function authHeaders() {
    return { 'Content-Type': 'application/json', 'X-Requested-With': 'XMLHttpRequest' };
}

function handleError(err, msg) {
    console.error(msg, err);
    if (typeof showToast === 'function') showToast(msg, 'error');
    else alert(msg + ': ' + (err?.message || err));
}

if (typeof window !== 'undefined') {
    window.initBuyerDashboard = initBuyerDashboard;
    window.viewOrder = viewOrder;
    window.cancelOrder = cancelOrder;
    window.closeOrderModal = closeOrderModal;
    window.filterOrders = filterOrders;
    window.filterSavedItems = filterSavedItems;
    window.removeSavedItem = removeSavedItem;
    window.markNotifRead = markNotifRead;
    window.saveSettings = saveSettings;
    window.loadSection = loadSection;
}