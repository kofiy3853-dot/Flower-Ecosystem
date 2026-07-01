// js/seller-dashboard.js
// Seller Dashboard — products, orders, reviews, messages, analytics

var profile = null;
var pendingImages = [];
var pendingVideo = null;
var pendingTags = [];

function timeAgo(d) {
    const diff = Math.floor((Date.now() - new Date(d)) / 1000);
    if (diff < 60) return 'just now';
    if (diff < 3600) return Math.floor(diff / 60) + 'm ago';
    if (diff < 86400) return Math.floor(diff / 3600) + 'h ago';
    return Math.floor(diff / 86400) + 'd ago';
}

function formatDate(dateStr) {
    if (!dateStr) return '—';
    const d = new Date(dateStr);
    const now = Date.now();
    const diff = now - d.getTime();
    if (diff < 60000) return 'Just now';
    if (diff < 3600000) return Math.floor(diff / 60000) + 'm ago';
    if (diff < 86400000) return Math.floor(diff / 3600000) + 'h ago';
    if (diff < 604800000) return Math.floor(diff / 86400000) + 'd ago';
    return d.toLocaleDateString('en', { month: 'short', day: 'numeric', year: d.getFullYear() !== new Date().getFullYear() ? 'numeric' : undefined });
}

async function initSellerDashboard() {
    if (!localStorage.getItem('flower-token')) {
        sessionStorage.setItem('pending-redirect', 'seller-dashboard.html');
        sessionStorage.setItem('pending-auth', 'login');
        if (typeof openAuthModal === 'function') openAuthModal('login');
        return;
    }
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
            // Scroll to top when switching sections
            window.scrollTo({ top: 0, behavior: 'smooth' });
            loadSection(section);
        });
    });

    await loadProfile();
    await initCategoryDropdown();
    updateNotifBadge();
    loadSection('dashboard');
}

async function loadProfile() {
    try { profile = await fetch('/api/seller/profile', { headers: authHeaders() }).then(r => r.json()); } catch { profile = { shop_name: 'My Shop' }; }
    const shopName = profile.shop_name || 'My Shop';
    document.getElementById('welcomeTitle').textContent = `Welcome Back, ${escapeHtml(shopName)}`;
    
    const sidebarShopName = document.getElementById('sidebarShopName');
    const sidebarAvatar = document.getElementById('sidebarAvatar');
    if (sidebarShopName) sidebarShopName.textContent = shopName;
    if (sidebarAvatar) {
        if (profile.profile_image) {
            sidebarAvatar.innerHTML = `<img src="${escapeHtml(profile.profile_image)}" alt="Avatar" style="width:100%;height:100%;object-fit:cover;border-radius:50%;">`;
        } else {
            sidebarAvatar.textContent = shopName.charAt(0).toUpperCase();
        }
    }
}

async function initCategoryDropdown() {
    const sel = document.getElementById('prodCategory');
    if (!sel) return;
    try {
        const cats = await fetch('/api/products/list/categories').then(r => r.json());
        if (Array.isArray(cats) && cats.length) {
            sel.innerHTML = '<option value="">Select Category</option>' + cats.map(c => `<option value="${escapeHtml(c.name)}">${escapeHtml(c.name)}</option>`).join('');
        }
    } catch {}
}

async function loadSection(section) {
    switch (section) {
        case 'dashboard': await loadDashboard(); break;
        case 'products': await loadProducts(); break;
        case 'orders': await loadOrders(); break;
        case 'reviews': await loadReviews(); break;
        case 'notifications': await loadNotifications(); break;
        case 'messages': await loadMessages(); break;
        case 'analytics': await loadAnalytics(); break;
        case 'settings': loadSettings(); break;
    }
}

async function loadDashboard() {
    try {
        const stats = await fetch('/api/seller/analytics', { headers: authHeaders() }).then(r => r.json());
        const statsEl = document.getElementById('statsGrid');
        if (statsEl) statsEl.innerHTML = `
            <div class="stat-card"><div class="icon"><i class="bi bi-box-seam"></i></div><div class="num">${stats.products}</div><div class="label">Products</div></div>
            <div class="stat-card"><div class="icon"><i class="bi bi-receipt"></i></div><div class="num">${stats.total_orders}</div><div class="label">Total Orders</div></div>
            <div class="stat-card"><div class="icon"><i class="bi bi-currency-dollar"></i></div><div class="num">GHS ${(stats.revenue || 0).toLocaleString(undefined, {minimumFractionDigits:2, maximumFractionDigits:2})}</div><div class="label">Revenue</div></div>
            <div class="stat-card"><div class="icon"><i class="bi bi-hourglass-split"></i></div><div class="num">${stats.pending_orders}</div><div class="label">Pending</div></div>
            <div class="stat-card"><div class="icon"><i class="bi bi-star-fill"></i></div><div class="num">${(stats.avg_rating || 0).toFixed(1)}</div><div class="label">Avg Rating</div></div>
            <div class="stat-card"><div class="icon"><i class="bi bi-truck"></i></div><div class="num">${stats.delivered_orders || 0}</div><div class="label">Delivered</div></div>
        `;
    } catch {}

    try {
        const orders = await fetch('/api/seller/orders', { headers: authHeaders() }).then(r => r.json());
        const recent = orders.slice(0, 5);
        const ordersEl = document.getElementById('recentOrders');
        if (ordersEl) ordersEl.innerHTML = recent.length ? recent.map(o => `
            <div style="display:flex;justify-content:space-between;align-items:center;padding:0.75rem 0;border-bottom:1px solid var(--border-light);font-size:0.9rem;">
                <div>
                    <div style="font-weight:600;color:var(--text-main);">${escapeHtml(o.buyer_name || 'Buyer')}</div>
                    <div style="font-size:0.8rem;color:var(--text-light);">GHS ${Number(o.total_amount || 0).toFixed(2)}</div>
                </div>
                <span class="badge badge-${o.status}">${escapeHtml(o.status)}</span>
            </div>
        `).join('') : '<div class="empty-state"><i class="bi bi-receipt"></i><p>No orders yet</p></div>';
    } catch {}

    try {
        const reviews = await fetch('/api/seller/reviews', { headers: authHeaders() }).then(r => r.json());
        const recent = reviews.slice(0, 3);
        const reviewsEl = document.getElementById('latestReviews');
        if (reviewsEl) reviewsEl.innerHTML = recent.length ? recent.map(r => `
            <div class="review-card">
                <div class="stars">${'★'.repeat(r.rating)}${'☆'.repeat(5 - r.rating)}</div>
                <div style="font-size:0.8rem;color:var(--text-light);">${escapeHtml(r.reviewer_name || 'Anonymous')}</div>
                ${r.comment ? `<div class="comment">${escapeHtml(r.comment)}</div>` : ''}
            </div>
        `).join('') : '<div class="empty-state"><p>No reviews yet</p></div>';
    } catch {}
}

let allProducts = [];
let productView = 'grid';
let selectedProducts = new Set();

async function loadProducts() {
    try {
        const res = await fetch('/api/seller/products', { headers: authHeaders() });
        if (!res.ok) { allProducts = []; return; }
        const data = await res.json();
        allProducts = Array.isArray(data) ? data : (data.products || []);
    } catch { allProducts = []; }
    filterProducts();
}

function filterProducts() {
    const q = (document.getElementById('productSearch')?.value || '').toLowerCase();
    const status = document.getElementById('productStatusFilter')?.value || 'all';
    const filtered = allProducts.filter(p => {
        const matchSearch = !q || (p.name || '').toLowerCase().includes(q) || (p.category_name || p.category || '').toLowerCase().includes(q) || (p.flower_type || '').toLowerCase().includes(q);
        let matchStatus = true;
        if (status === 'active') matchStatus = p.is_active;
        else if (status === 'inactive') matchStatus = !p.is_active && p.status !== 'draft';
        else if (status === 'draft') matchStatus = p.status === 'draft';
        return matchSearch && matchStatus;
    });
    renderProducts(filtered);
}

function renderProducts(products) {
    const el = document.getElementById('productsContainer');
    if (!el) return;
    if (!products.length) {
        el.innerHTML = '<div class="empty-state" style="text-align:center;padding:3rem;color:var(--text-light);"><i class="bi bi-box" style="font-size:3rem;display:block;margin-bottom:1rem;"></i><p>No products found.</p><button class="btn btn-primary btn-sm" style="margin-top:1rem;" onclick="navigateToAddProduct()"><i class="bi bi-plus"></i> Add Your First Product</button></div>';
        return;
    }
    if (productView === 'grid') renderGrid(el, products);
    else renderList(el, products);
    updateBulkBar();
}

function renderGrid(el, products) {
    el.innerHTML = `<div class="products-grid">${products.map(p => {
        const img = p.image_url || (p.images && p.images[0]) || null;
        const stock = p.stock_quantity || 0;
        const stockClass = stock === 0 ? 'out' : stock <= (p.low_stock_alert || 10) ? 'low' : '';
        const stockText = stock === 0 ? 'Out of Stock' : stock <= (p.low_stock_alert || 10) ? `Low: ${stock}` : `${stock} in stock`;
        const tags = Array.isArray(p.tags) ? p.tags.slice(0, 3) : [];
        const isSelected = selectedProducts.has(p.id);
        const currency = p.currency || 'GHS';
        return `<div class="product-card" data-id="${p.id}">
            <label class="card-select"><input type="checkbox" ${isSelected ? 'checked' : ''} onchange="toggleProductSelect('${p.id}')"></label>
            <div class="product-card-img">${img ? `<img src="${escapeHtml(img)}" alt="${escapeHtml(p.name)}" loading="lazy">` : '<i class="bi bi-image"></i>'}</div>
            <div class="product-card-body">
                <h4 title="${escapeHtml(p.name)}">${escapeHtml(p.name)}</h4>
                <div style="font-size:0.8rem;color:var(--text-light);">${escapeHtml(p.category_name || p.category || '')}</div>
                ${tags.length ? `<div class="product-card-tags">${tags.map(t => `<span>${escapeHtml(t)}</span>`).join('')}</div>` : ''}
                <div class="product-card-meta">
                    <span class="product-card-price">${currency} ${Number(p.price || 0).toFixed(2)}</span>
                    <span class="badge ${p.is_active ? 'badge-active' : (p.status === 'draft' ? 'badge-pending' : 'badge-inactive')}" style="font-size:0.7rem;">${p.status === 'draft' ? 'Draft' : p.is_active ? 'Active' : 'Inactive'}</span>
                </div>
                <div class="product-card-stock ${stockClass}">${stockText}</div>
                <div class="product-card-actions">
                    <button class="btn-card-edit" onclick="editProduct('${p.id}')" title="Edit"><i class="bi bi-pencil"></i> Edit</button>
                    <button class="btn-card-toggle" onclick="toggleProductStatus('${p.id}', ${p.is_active})" title="${p.is_active ? 'Deactivate' : 'Activate'}"><i class="bi bi-${p.is_active ? 'pause' : 'play'}"></i></button>
                    <button class="btn-card-delete" onclick="deleteProduct('${p.id}')" title="Delete"><i class="bi bi-trash"></i></button>
                </div>
            </div>
        </div>`;
    }).join('')}</div>`;
}

function renderList(el, products) {
    el.innerHTML = `<div class="section-card products-list"><div class="table-wrap"><table class="data-table">
        <thead><tr><th><input type="checkbox" id="selectAllProducts" onchange="toggleSelectAll(this.checked)" style="accent-color:var(--primary-color);cursor:pointer;"></th><th>Product</th><th>Price</th><th>Stock</th><th>Category</th><th>Type</th><th>Status</th><th>Actions</th></tr></thead>
        <tbody>${products.map(p => {
            const img = p.image_url || (p.images && p.images[0]) || null;
            const isSelected = selectedProducts.has(p.id);
            const currency = p.currency || 'GHS';
            return `<tr data-id="${p.id}">
                <td><input type="checkbox" ${isSelected ? 'checked' : ''} onchange="toggleProductSelect('${p.id}')" style="accent-color:var(--primary-color);cursor:pointer;"></td>
                <td><div style="display:flex;align-items:center;gap:0.75rem;">
                    <div style="width:44px;height:44px;border-radius:8px;overflow:hidden;flex-shrink:0;background:var(--bg-light);">${img ? `<img src="${escapeHtml(img)}" alt="" style="width:100%;height:100%;object-fit:cover;">` : '<div style="width:100%;height:100%;display:flex;align-items:center;justify-content:center;color:var(--text-light);"><i class="bi bi-image"></i></div>'}</div>
                    <div><div style="font-weight:600;font-size:0.9rem;">${escapeHtml(p.name)}</div><div style="font-size:0.75rem;color:var(--text-light);">${escapeHtml(p.category_name || p.category || '—')}</div></div>
                </div></td>
                <td style="font-weight:600;">${currency} ${Number(p.price || 0).toFixed(2)}</td>
                <td><span class="product-card-stock ${(p.stock_quantity || 0) === 0 ? 'out' : (p.stock_quantity || 0) <= (p.low_stock_alert || 10) ? 'low' : ''}">${p.stock_quantity || 0}</span></td>
                <td>${escapeHtml(p.category_name || p.category || '—')}</td>
                <td>${escapeHtml(p.flower_cond || p.flower_type || '—')}</td>
                <td><span class="badge ${p.is_active ? 'badge-active' : (p.status === 'draft' ? 'badge-pending' : 'badge-inactive')}">${p.status === 'draft' ? 'Draft' : p.is_active ? 'Active' : 'Inactive'}</span></td>
                <td><div style="display:flex;gap:0.35rem;">
                    <button class="btn-action" onclick="editProduct('${p.id}')" title="Edit"><i class="bi bi-pencil"></i></button>
                    <button class="btn-action" onclick="toggleProductStatus('${p.id}', ${p.is_active})" title="${p.is_active ? 'Deactivate' : 'Activate'}"><i class="bi bi-${p.is_active ? 'pause' : 'play'}"></i></button>
                    <button class="btn-action" onclick="deleteProduct('${p.id}')" title="Delete"><i class="bi bi-trash"></i></button>
                </div></td>
            </tr>`;
        }).join('')}</tbody></table></div></div>`;
}

function setProductView(view) {
    productView = view;
    const gridBtn = document.getElementById('viewGridBtn');
    const listBtn = document.getElementById('viewListBtn');
    if (gridBtn) gridBtn.classList.toggle('active', view === 'grid');
    if (listBtn) listBtn.classList.toggle('active', view === 'list');
    filterProducts();
}

function toggleProductSelect(id) {
    if (selectedProducts.has(id)) selectedProducts.delete(id);
    else selectedProducts.add(id);
    updateBulkBar();
}

function toggleSelectAll(checked) {
    if (checked) allProducts.forEach(p => selectedProducts.add(p.id));
    else selectedProducts.clear();
    filterProducts();
    updateBulkBar();
}

function clearSelection() {
    selectedProducts.clear();
    document.querySelectorAll('.products-list input[type="checkbox"], .product-card input[type="checkbox"]').forEach(cb => cb.checked = false);
    const selectAll = document.getElementById('selectAllProducts');
    if (selectAll) selectAll.checked = false;
    updateBulkBar();
}

function updateBulkBar() {
    const bar = document.getElementById('bulkActionsBar');
    const count = document.getElementById('bulkCount');
    if (!bar) return;
    if (selectedProducts.size > 0) {
        bar.style.display = 'flex';
        if (count) count.textContent = selectedProducts.size + ' product' + (selectedProducts.size > 1 ? 's' : '') + ' selected';
    } else {
        bar.style.display = 'none';
    }
}

async function bulkAction(action) {
    const ids = Array.from(selectedProducts);
    if (!ids.length) return;
    if (action === 'delete' && !confirm(`Delete ${ids.length} product(s)? This cannot be undone.`)) return;

    let errors = [];
    for (const id of ids) {
        try {
            let res;
            if (action === 'delete') {
                res = await fetch(`/api/products/${id}`, { method: 'DELETE', headers: authHeaders() });
            } else if (action === 'activate' || action === 'deactivate') {
                res = await fetch(`/api/products/${id}`, { method: 'PUT', headers: authHeaders(), body: JSON.stringify({ is_active: action === 'activate', status: action === 'activate' ? 'published' : 'inactive' }) });
            } else if (action === 'featured') {
                res = await fetch(`/api/products/${id}`, { method: 'PUT', headers: authHeaders(), body: JSON.stringify({ featured: true }) });
            }
            if (res && !res.ok) {
                const data = await res.json();
                errors.push(data.error || 'Failed');
            }
        } catch (e) {
            errors.push(e.message);
        }
    }
    if (errors.length) alert('Some operations failed: ' + errors[0]);
    clearSelection();
    await loadProducts();
}

async function toggleProductStatus(id, currentActive) {
    try {
        await fetch(`/api/products/${id}`, { method: 'PUT', headers: authHeaders(), body: JSON.stringify({ is_active: !currentActive, status: !currentActive ? 'published' : 'inactive' }) });
        await loadProducts();
    } catch { alert('Failed to update status'); }
}

let allOrders = [];

async function loadOrders() {
    try { allOrders = await fetch('/api/seller/orders', { headers: authHeaders() }).then(r => r.json()); } catch { allOrders = []; }
    renderOrderStats();
    filterOrders();
}

function renderOrderStats() {
    const el = document.getElementById('orderStats');
    if (!el) return;
    const total = allOrders.length;
    const pending = allOrders.filter(o => o.status === 'PENDING').length;
    const processing = allOrders.filter(o => o.status === 'PROCESSING' || o.status === 'CONFIRMED').length;
    const shipped = allOrders.filter(o => o.status === 'SHIPPED').length;
    const delivered = allOrders.filter(o => o.status === 'DELIVERED').length;
    const revenue = allOrders.reduce((s, o) => s + parseFloat(o.seller_total || o.total_amount || 0), 0);
    const currency = allOrders[0]?.currency || 'GHS';
    el.innerHTML = `
        <div class="stat-card" style="padding:1rem;"><div class="num" style="font-size:1.4rem;">${total}</div><div class="label">Total Orders</div></div>
        <div class="stat-card" style="padding:1rem;border-left:3px solid #e67e22;"><div class="num" style="font-size:1.4rem;color:#e67e22;">${pending}</div><div class="label">Pending</div></div>
        <div class="stat-card" style="padding:1rem;border-left:3px solid #3b82f6;"><div class="num" style="font-size:1.4rem;color:#3b82f6;">${processing}</div><div class="label">Processing</div></div>
        <div class="stat-card" style="padding:1rem;border-left:3px solid #7c3aed;"><div class="num" style="font-size:1.4rem;color:#7c3aed;">${shipped}</div><div class="label">Shipped</div></div>
        <div class="stat-card" style="padding:1rem;border-left:3px solid #16a34a;"><div class="num" style="font-size:1.4rem;color:#16a34a;">${delivered}</div><div class="label">Delivered</div></div>
        <div class="stat-card" style="padding:1rem;border-left:3px solid var(--primary-color);"><div class="num" style="font-size:1.4rem;color:var(--primary-color);">${currency} ${revenue.toFixed(2)}</div><div class="label">Revenue</div></div>
    `;
}

function filterOrders() {
    const q = (document.getElementById('orderSearch')?.value || '').toLowerCase();
    const status = document.getElementById('orderStatusFilter')?.value || 'all';
    const filtered = allOrders.filter(o => {
        const matchSearch = !q || (o.buyer_name || '').toLowerCase().includes(q) || (o.id || '').toLowerCase().includes(q) || (o.buyer_email || '').toLowerCase().includes(q);
        const matchStatus = status === 'all' || o.status === status;
        return matchSearch && matchStatus;
    });
    renderOrders(filtered);
}

function renderOrders(orders) {
    const el = document.getElementById('ordersContainer');
    if (!el) return;
    if (!orders.length) {
        el.innerHTML = '<div class="empty-state" style="text-align:center;padding:3rem;color:var(--text-light);"><i class="bi bi-receipt" style="font-size:3rem;display:block;margin-bottom:1rem;"></i><p>No orders found.</p></div>';
        return;
    }
    el.innerHTML = `<div class="section-card"><div class="table-wrap"><table class="data-table">
        <thead><tr><th>Order ID</th><th>Buyer</th><th>Items</th><th>Total</th><th>Status</th><th>Date</th><th>Actions</th></tr></thead>
        <tbody>${orders.map(o => {
            const date = o.created_at ? new Date(o.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : '—';
            const time = o.created_at ? new Date(o.created_at).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }) : '';
            return `<tr>
                <td><span style="font-family:monospace;font-size:0.8rem;color:var(--text-light);">#${(o.id || '').slice(0, 8)}</span></td>
                <td><div style="font-weight:500;">${escapeHtml(o.buyer_name || 'Buyer')}</div><div style="font-size:0.75rem;color:var(--text-light);">${escapeHtml(o.buyer_email || '')}</div></td>
                <td>${o.item_count || 0} item${o.item_count != 1 ? 's' : ''}</td>
                <td style="font-weight:600;">GHS ${Number(o.seller_total || o.total_amount || 0).toFixed(2)}</td>
                <td>${statusBadge(o.status)}</td>
                <td><div style="font-size:0.85rem;">${date}</div><div style="font-size:0.75rem;color:var(--text-light);">${time}</div></td>
                <td><div style="display:flex;gap:0.35rem;">
                    <button class="btn-action" onclick="viewOrder('${o.id}')" title="View Details"><i class="bi bi-eye"></i></button>
                    ${o.status !== 'DELIVERED' && o.status !== 'CANCELLED' ? `<select onchange="updateOrderStatus('${o.id}', this.value);this.value=''" style="padding:0.3rem;border:1px solid var(--border-color);border-radius:4px;font-size:0.75rem;cursor:pointer;">
                        <option value="">Update...</option>
                        ${o.status === 'PENDING' ? '<option value="CONFIRMED">Confirm</option>' : ''}
                        ${o.status === 'CONFIRMED' ? '<option value="PROCESSING">Process</option>' : ''}
                        ${o.status === 'PROCESSING' ? '<option value="SHIPPED">Ship</option>' : ''}
                        ${o.status === 'SHIPPED' ? '<option value="DELIVERED">Deliver</option>' : ''}
                        <option value="CANCELLED" style="color:#dc2626;">Cancel</option>
                    </select>` : ''}
                </div></td>
            </tr>`;
        }).join('')}</tbody></table></div></div>`;
}

function statusBadge(status) {
    const colors = { PENDING: '#e67e22', CONFIRMED: '#3b82f6', PROCESSING: '#7c3aed', SHIPPED: '#8b5cf6', DELIVERED: '#16a34a', CANCELLED: '#dc2626' };
    const bg = colors[status] || '#6b7280';
    return `<span style="display:inline-flex;align-items:center;gap:0.3rem;padding:0.25rem 0.6rem;border-radius:20px;font-size:0.75rem;font-weight:600;background:${bg}15;color:${bg};"><span style="width:6px;height:6px;border-radius:50%;background:${bg};"></span>${status}</span>`;
}

async function updateOrderStatus(id, status) {
    if (!status) return;
    try {
        await fetch(`/api/seller/orders/${id}`, { method: 'PUT', headers: authHeaders(), body: JSON.stringify({ status }) });
        await loadOrders();
    } catch { alert('Failed to update order status'); }
}

async function viewOrder(id) {
    try {
        const order = await fetch(`/api/seller/orders/${id}`, { headers: authHeaders() }).then(r => r.json());
        const modal = document.getElementById('orderModal');
        const content = document.getElementById('modalOrderContent');
        const title = document.getElementById('modalOrderTitle');
        if (!modal || !content) return;
        title.textContent = `Order #${(order.id || '').slice(0, 8)}`;
        const date = order.created_at ? new Date(order.created_at).toLocaleString() : '—';
        content.innerHTML = `
            <div style="display:grid;grid-template-columns:1fr 1fr;gap:1rem;margin-bottom:1rem;">
                <div><div style="font-size:0.8rem;color:var(--text-light);">Buyer</div><div style="font-weight:500;">${escapeHtml(order.buyer_name || '—')}</div><div style="font-size:0.8rem;color:var(--text-light);">${escapeHtml(order.buyer_email || '')}</div></div>
                <div><div style="font-size:0.8rem;color:var(--text-light);">Date</div><div>${date}</div></div>
                <div><div style="font-size:0.8rem;color:var(--text-light);">Status</div><div>${statusBadge(order.status)}</div></div>
                <div><div style="font-size:0.8rem;color:var(--text-light);">Total</div><div style="font-weight:700;font-size:1.1rem;color:var(--primary-color);">GHS ${Number(order.total_amount || 0).toFixed(2)}</div></div>
            </div>
            <h3 style="margin:1rem 0 0.5rem;font-size:0.95rem;">Items</h3>
            ${(order.items || []).map(item => {
                const img = item.image_url || (item.images && item.images[0]) || null;
                return `<div style="display:flex;gap:0.75rem;padding:0.75rem 0;border-bottom:1px solid var(--border-light);align-items:center;">
                    <div style="width:50px;height:50px;border-radius:8px;overflow:hidden;flex-shrink:0;background:var(--bg-light);">${img ? `<img src="${escapeHtml(img)}" alt="" style="width:100%;height:100%;object-fit:cover;">` : '<div style="width:100%;height:100%;display:flex;align-items:center;justify-content:center;color:var(--text-light);"><i class="bi bi-image"></i></div>'}</div>
                    <div style="flex:1;"><div style="font-weight:500;">${escapeHtml(item.product_name || 'Product')}</div><div style="font-size:0.8rem;color:var(--text-light);">Qty: ${item.quantity} × GHS ${Number(item.unit_price || 0).toFixed(2)}</div></div>
                    <div style="font-weight:600;">GHS ${(item.quantity * parseFloat(item.unit_price || 0)).toFixed(2)}</div>
                </div>`;
            }).join('') || '<p style="color:var(--text-light);">No items</p>'}
            ${order.status !== 'DELIVERED' && order.status !== 'CANCELLED' ? `
            <div style="margin-top:1.5rem;display:flex;gap:0.5rem;">
                <select id="modalStatusSelect" style="flex:1;padding:0.5rem;border:1px solid var(--border-color);border-radius:8px;font-size:0.85rem;">
                    <option value="">Change status...</option>
                    ${order.status === 'PENDING' ? '<option value="CONFIRMED">Confirm</option>' : ''}
                    ${order.status === 'CONFIRMED' ? '<option value="PROCESSING">Processing</option>' : ''}
                    ${order.status === 'PROCESSING' ? '<option value="SHIPPED">Shipped</option>' : ''}
                    ${order.status === 'SHIPPED' ? '<option value="DELIVERED">Delivered</option>' : ''}
                    <option value="CANCELLED" style="color:#dc2626;">Cancel Order</option>
                </select>
                <button class="btn btn-primary btn-sm" onclick="updateOrderStatus('${order.id}', document.getElementById('modalStatusSelect').value);closeOrderModal();">Update</button>
            </div>` : ''}
        `;
        modal.style.display = 'flex';
    } catch { alert('Failed to load order details'); }
}

function closeOrderModal() {
    const modal = document.getElementById('orderModal');
    if (modal) modal.style.display = 'none';
}

document.addEventListener('click', (e) => {
    if (e.target.id === 'orderModal') closeOrderModal();
});

async function loadReviews() {
    let reviews;
    try { reviews = await fetch('/api/seller/reviews', { headers: authHeaders() }).then(r => r.json()); } catch { reviews = []; }
    const el = document.getElementById('reviewsSection');
    if (!el) return;
    if (!reviews.length) { el.innerHTML = '<div class="empty-state"><i class="bi bi-star"></i><p>No reviews yet.</p></div>'; return; }
    el.innerHTML = reviews.map(r => `
        <div class="review-card">
            <div style="display:flex;justify-content:space-between;align-items:center;">
                <div>
                    <div class="stars">${'★'.repeat(r.rating)}${'☆'.repeat(5 - r.rating)}</div>
                    <div style="font-size:0.8rem;color:var(--text-light);">${escapeHtml(r.reviewer_name || 'Anonymous')} · ${formatDate(r.created_at)}</div>
                </div>
            </div>
            ${r.comment ? `<div class="comment">${escapeHtml(r.comment)}</div>` : ''}
        </div>
    `).join('');
}

let allNotifications = [];

async function loadNotifications() {
    try { allNotifications = await fetch('/api/notifications', { headers: authHeaders() }).then(r => r.json()); } catch { allNotifications = []; }
    updateNotifBadge();
    filterNotifications();
}

async function updateNotifBadge() {
    try {
        const data = await fetch('/api/notifications/unread-count', { headers: authHeaders() }).then(r => r.json());
        const badge = document.getElementById('notifBadge');
        if (badge) {
            if (data.count > 0) {
                badge.textContent = data.count > 99 ? '99+' : data.count;
                badge.style.display = 'inline';
            } else {
                badge.style.display = 'none';
            }
        }
    } catch {}
}

function filterNotifications() {
    const filter = document.getElementById('notifFilter')?.value || 'all';
    let filtered = allNotifications;
    if (filter === 'unread') filtered = allNotifications.filter(n => !n.is_read);
    else if (filter === 'order') filtered = allNotifications.filter(n => (n.type || '').includes('order'));
    else if (filter === 'product') filtered = allNotifications.filter(n => (n.type || '').includes('product'));
    else if (filter === 'system') filtered = allNotifications.filter(n => (n.type || '').includes('system') || (!n.type?.includes('order') && !n.type?.includes('product')));
    renderNotifications(filtered);
}

function renderNotifications(notifications) {
    const el = document.getElementById('notificationsContainer');
    if (!el) return;
    if (!notifications.length) {
        el.innerHTML = '<div class="empty-state" style="text-align:center;padding:3rem;color:var(--text-light);"><i class="bi bi-bell-slash" style="font-size:3rem;display:block;margin-bottom:1rem;"></i><p>No notifications to show.</p></div>';
        return;
    }
    const iconMap = {
        order: { icon: 'bi-receipt', color: '#3b82f6' },
        product: { icon: 'bi-box', color: '#16a34a' },
        payment: { icon: 'bi-credit-card', color: '#f59e0b' },
        system: { icon: 'bi-gear', color: '#7c3aed' },
        review: { icon: 'bi-star', color: '#f59e0b' },
        promo: { icon: 'bi-megaphone', color: '#ec4899' }
    };
    el.innerHTML = notifications.map(n => {
        const type = (n.type || 'system').split('_')[0];
        const style = iconMap[type] || iconMap.system;
        const timeAgo = notifTimeAgo(n.created_at);
        return `<div class="notif-item ${n.is_read ? '' : 'unread'}" onclick="markNotifRead('${n.id}')" style="display:flex;gap:0.85rem;padding:1rem;margin-bottom:0.5rem;border-radius:12px;cursor:pointer;transition:all 0.15s;${n.is_read ? 'background:var(--bg-white);border:1px solid var(--border-color);' : 'background:rgba(139,92,246,0.04);border:1px solid rgba(139,92,246,0.15);'}">
            <div style="width:40px;height:40px;border-radius:10px;background:${style.color}12;display:flex;align-items:center;justify-content:center;flex-shrink:0;"><i class="bi ${style.icon}" style="color:${style.color};font-size:1.1rem;"></i></div>
            <div style="flex:1;min-width:0;">
                <div style="display:flex;justify-content:space-between;align-items:flex-start;gap:0.5rem;">
                    <div style="font-size:0.9rem;font-weight:${n.is_read ? '400' : '600'};color:var(--text-main);">${escapeHtml(n.title || n.message || 'Notification')}</div>
                    <span style="font-size:0.7rem;color:var(--text-light);white-space:nowrap;flex-shrink:0;">${timeAgo}</span>
                </div>
                ${n.message && n.title ? `<div style="font-size:0.8rem;color:var(--text-light);margin-top:0.2rem;">${escapeHtml(n.message).slice(0, 120)}${(n.message || '').length > 120 ? '...' : ''}</div>` : ''}
            </div>
            ${!n.is_read ? '<div style="width:8px;height:8px;border-radius:50%;background:var(--primary-color);flex-shrink:0;margin-top:0.35rem;"></div>' : ''}
        </div>`;
    }).join('');
}

function notifTimeAgo(dateStr) {
    if (!dateStr) return '';
    const diff = Date.now() - new Date(dateStr).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return 'Just now';
    if (mins < 60) return mins + 'm ago';
    const hours = Math.floor(mins / 60);
    if (hours < 24) return hours + 'h ago';
    const days = Math.floor(hours / 24);
    if (days < 7) return days + 'd ago';
    return new Date(dateStr).toLocaleDateString('en', { month: 'short', day: 'numeric' });
}

async function markNotifRead(id) {
    const notif = allNotifications.find(n => n.id === id);
    if (notif && !notif.is_read) {
        notif.is_read = true;
        try { await fetch(`/api/notifications/${id}/read`, { method: 'PUT', headers: authHeaders() }); } catch {}
        updateNotifBadge();
        filterNotifications();
    }
}

async function markAllRead() {
    try {
        await fetch('/api/notifications/read', { method: 'PUT', headers: authHeaders() });
        allNotifications.forEach(n => n.is_read = true);
        updateNotifBadge();
        filterNotifications();
    } catch {}
}

async function loadMessages() {
    let conversations;
    try { conversations = await fetch('/api/messages/conversations', { headers: authHeaders() }).then(r => r.json()); } catch { conversations = []; }
    const el = document.getElementById('messagesSection');
    if (!el) return;
    if (!conversations.length) { el.innerHTML = '<div class="empty-state"><i class="bi bi-chat-dots"></i><p>No conversations yet.</p><p style="font-size:0.85rem;">When buyers contact you, conversations will appear here.</p></div>'; return; }
    el.innerHTML = conversations.map(c => `
        <a href="/messages.html?conversation=${c.id}" style="display:flex;gap:0.75rem;padding:0.75rem;border:1px solid var(--border-color);border-radius:var(--radius-sm);margin-bottom:0.5rem;text-decoration:none;color:inherit;transition:all 0.15s;${c.unread_count > 0 ? 'border-left:3px solid var(--primary-color);background:rgba(172,50,80,0.02);' : ''}" onmouseover="this.style.borderColor='var(--primary-color)'" onmouseout="this.style.borderColor='${c.unread_count > 0 ? 'var(--primary-color)' : 'var(--border-color)'}'">
            <div style="width:40px;height:40px;border-radius:50%;background:var(--bg-light);display:flex;align-items:center;justify-content:center;font-size:1rem;flex-shrink:0;">${(c.other_name || '?')[0].toUpperCase()}</div>
            <div style="flex:1;min-width:0;">
                <div style="display:flex;justify-content:space-between;font-size:0.85rem;"><strong>${escapeHtml(c.other_name || 'User')}</strong><span style="color:var(--text-muted);font-size:0.78rem;">${c.last_message_at ? timeAgo(c.last_message_at) : ''}</span></div>
                <div style="font-size:0.8rem;color:var(--text-light);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${escapeHtml(c.last_message || 'Start a conversation')}</div>
            </div>
            ${c.unread_count > 0 ? '<div style="width:8px;height:8px;border-radius:50%;background:var(--primary-color);flex-shrink:0;align-self:center;"></div>' : ''}
        </a>
    `).join('');
}

async function loadAnalytics() {
    try {
        const stats = await fetch('/api/seller/analytics', { headers: authHeaders() }).then(r => r.json());
        const currency = (stats.top_products && stats.top_products[0]?.currency) || 'GHS';
        const el = document.getElementById('analyticsContent');
        if (!el) return;

        // ─── Stat Cards ───────────────────────────────────────────────────
        const statCards = [
            { icon: 'bi-box-seam', color: 'var(--primary-color)', value: stats.products, label: 'Active Products' },
            { icon: 'bi-receipt', color: '#3b82f6', value: stats.total_orders, label: 'Total Orders' },
            { icon: 'bi-currency-dollar', color: '#16a34a', value: `${currency} ${(stats.revenue || 0).toLocaleString(undefined, {minimumFractionDigits:2, maximumFractionDigits:2})}`, label: 'Total Revenue' },
            { icon: 'bi-hourglass-split', color: '#e67e22', value: stats.pending_orders, label: 'Pending Orders' },
            { icon: 'bi-star-fill', color: '#f59e0b', value: (stats.avg_rating || 0).toFixed(1), label: `Avg Rating (${stats.review_count || 0} reviews)` },
            { icon: 'bi-truck', color: '#7c3aed', value: stats.delivered_orders || 0, label: 'Delivered' }
        ];
        const statsHtml = `<div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(170px,1fr));gap:1rem;margin-bottom:2rem;">
            ${statCards.map(s => `<div style="background:var(--bg-white);border:1px solid var(--border-color);border-radius:14px;padding:1.25rem;display:flex;align-items:center;gap:1rem;">
                <div style="width:48px;height:48px;border-radius:12px;background:${s.color}12;display:flex;align-items:center;justify-content:center;flex-shrink:0;"><i class="bi ${s.icon}" style="font-size:1.3rem;color:${s.color};"></i></div>
                <div><div style="font-size:1.4rem;font-weight:700;color:var(--text-main);">${s.value}</div><div style="font-size:0.8rem;color:var(--text-light);">${s.label}</div></div>
            </div>`).join('')}
        </div>`;

        // ─── Revenue Trend (CSS Bar Chart) ────────────────────────────────
        const daily = stats.daily_trend || [];
        const maxRevenue = Math.max(...daily.map(d => parseFloat(d.revenue) || 0), 1);
        const trendHtml = `<div style="background:var(--bg-white);border:1px solid var(--border-color);border-radius:14px;padding:1.5rem;margin-bottom:1.5rem;">
            <h3 style="margin:0 0 1rem;font-size:1rem;">Revenue Trend (Last 30 Days)</h3>
            ${daily.length ? `<div style="display:flex;align-items:flex-end;gap:4px;height:140px;padding-bottom:1.5rem;border-bottom:1px solid var(--border-light);position:relative;">
                ${daily.map(d => {
                    const h = Math.max(4, (parseFloat(d.revenue) / maxRevenue) * 100);
                    const day = new Date(d.day).toLocaleDateString('en', { weekday: 'short' });
                    return `<div style="flex:1;display:flex;flex-direction:column;align-items:center;gap:4px;" title="${d.day}: ${currency} ${parseFloat(d.revenue).toFixed(2)} (${d.orders} orders)">
                        <span style="font-size:0.65rem;color:var(--text-light);">${d.orders}</span>
                        <div style="width:100%;max-width:30px;height:${h}%;background:linear-gradient(180deg,var(--primary-color),#c084fc);border-radius:4px 4px 0 0;transition:height 0.3s;"></div>
                    </div>`;
                }).join('')}
            </div>
            <div style="display:flex;justify-content:space-between;margin-top:0.5rem;">
                <span style="font-size:0.7rem;color:var(--text-light);">${daily[0]?.day ? new Date(daily[0].day).toLocaleDateString('en', { month: 'short', day: 'numeric' }) : ''}</span>
                <span style="font-size:0.7rem;color:var(--text-light);">${daily[daily.length-1]?.day ? new Date(daily[daily.length-1].day).toLocaleDateString('en', { month: 'short', day: 'numeric' }) : ''}</span>
            </div>` : '<div style="text-align:center;padding:2rem;color:var(--text-light);"><i class="bi bi-graph-up" style="font-size:2rem;display:block;margin-bottom:0.5rem;"></i>No order data yet</div>'}
        </div>`;

        // ─── Two Column: Top Products + Order Status ───────────────────────
        const topProducts = stats.top_products || [];
        const topProductsHtml = `<div style="background:var(--bg-white);border:1px solid var(--border-color);border-radius:14px;padding:1.5rem;">
            <h3 style="margin:0 0 1rem;font-size:1rem;">Top Products</h3>
            ${topProducts.length ? topProducts.map((p, i) => {
                const img = p.image_url || null;
                const maxRev = parseFloat(topProducts[0]?.total_revenue) || 1;
                const barWidth = Math.max(10, (parseFloat(p.total_revenue) / maxRev) * 100);
                return `<div style="display:flex;align-items:center;gap:0.75rem;padding:0.6rem 0;${i < topProducts.length - 1 ? 'border-bottom:1px solid var(--border-light);' : ''}">
                    <div style="width:28px;height:28px;border-radius:8px;background:var(--primary-color)12;display:flex;align-items:center;justify-content:center;font-size:0.75rem;font-weight:700;color:var(--primary-color);flex-shrink:0;">${i + 1}</div>
                    <div style="width:40px;height:40px;border-radius:8px;overflow:hidden;flex-shrink:0;background:var(--bg-light);">${img ? `<img src="${escapeHtml(img)}" alt="" style="width:100%;height:100%;object-fit:cover;">` : ''}</div>
                    <div style="flex:1;min-width:0;">
                        <div style="font-size:0.85rem;font-weight:500;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${escapeHtml(p.name)}</div>
                        <div style="display:flex;align-items:center;gap:0.5rem;margin-top:0.25rem;">
                            <div style="flex:1;height:6px;background:var(--bg-light);border-radius:3px;overflow:hidden;"><div style="width:${barWidth}%;height:100%;background:var(--primary-color);border-radius:3px;"></div></div>
                            <span style="font-size:0.7rem;color:var(--text-light);white-space:nowrap;">${p.qty_sold} sold</span>
                        </div>
                    </div>
                    <div style="text-align:right;flex-shrink:0;">
                        <div style="font-size:0.85rem;font-weight:600;">${currency} ${parseFloat(p.total_revenue).toFixed(2)}</div>
                        <div style="font-size:0.7rem;color:var(--text-light);">${p.order_count} order${p.order_count != 1 ? 's' : ''}</div>
                    </div>
                </div>`;
            }).join('') : '<div style="text-align:center;padding:2rem;color:var(--text-light);">No sales data yet</div>'}
        </div>`;

        const statusData = stats.status_breakdown || [];
        const statusColors = { PENDING: '#e67e22', CONFIRMED: '#3b82f6', PROCESSING: '#7c3aed', SHIPPED: '#8b5cf6', DELIVERED: '#16a34a', CANCELLED: '#dc2626' };
        const totalOrdersForBreakdown = statusData.reduce((s, d) => s + parseInt(d.count), 0) || 1;
        const statusHtml = `<div style="background:var(--bg-white);border:1px solid var(--border-color);border-radius:14px;padding:1.5rem;">
            <h3 style="margin:0 0 1rem;font-size:1rem;">Order Status Breakdown</h3>
            ${statusData.length ? `<div style="display:flex;height:12px;border-radius:6px;overflow:hidden;margin-bottom:1rem;">
                ${statusData.map(d => {
                    const pct = (parseInt(d.count) / totalOrdersForBreakdown) * 100;
                    return `<div style="width:${pct}%;background:${statusColors[d.status] || '#6b7280'};" title="${d.status}: ${d.count}"></div>`;
                }).join('')}
            </div>
            ${statusData.map(d => `<div style="display:flex;align-items:center;justify-content:space-between;padding:0.4rem 0;${d !== statusData[statusData.length - 1] ? 'border-bottom:1px solid var(--border-light);' : ''}">
                <div style="display:flex;align-items:center;gap:0.5rem;"><span style="width:10px;height:10px;border-radius:50%;background:${statusColors[d.status] || '#6b7280'};"></span><span style="font-size:0.85rem;">${d.status.charAt(0) + d.status.slice(1).toLowerCase()}</span></div>
                <div style="display:flex;align-items:center;gap:0.5rem;"><span style="font-weight:600;font-size:0.9rem;">${d.count}</span><span style="font-size:0.75rem;color:var(--text-light);">(${((parseInt(d.count) / totalOrdersForBreakdown) * 100).toFixed(0)}%)</span></div>
            </div>`).join('')}` : '<div style="text-align:center;padding:2rem;color:var(--text-light);">No orders yet</div>'}
        </div>`;

        // ─── Performance Metrics ───────────────────────────────────────────
        const avgOrderValue = stats.avg_order_value || 0;
        const itemsPerOrder = stats.total_orders > 0 ? (stats.total_items_sold / stats.total_orders).toFixed(1) : '0';
        const cancelRate = stats.total_orders > 0 ? ((stats.cancelled_orders / stats.total_orders) * 100).toFixed(1) : '0';
        const performanceHtml = `<div style="background:var(--bg-white);border:1px solid var(--border-color);border-radius:14px;padding:1.5rem;margin-bottom:1.5rem;">
            <h3 style="margin:0 0 1rem;font-size:1rem;">Performance Metrics</h3>
            <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(180px,1fr));gap:1rem;">
                <div style="text-align:center;padding:1rem;background:var(--bg-light);border-radius:10px;">
                    <div style="font-size:1.5rem;font-weight:700;color:var(--primary-color);">${currency} ${avgOrderValue.toFixed(2)}</div>
                    <div style="font-size:0.8rem;color:var(--text-light);margin-top:0.25rem;">Avg Order Value</div>
                </div>
                <div style="text-align:center;padding:1rem;background:var(--bg-light);border-radius:10px;">
                    <div style="font-size:1.5rem;font-weight:700;color:#3b82f6;">${itemsPerOrder}</div>
                    <div style="font-size:0.8rem;color:var(--text-light);margin-top:0.25rem;">Avg Items per Order</div>
                </div>
                <div style="text-align:center;padding:1rem;background:var(--bg-light);border-radius:10px;">
                    <div style="font-size:1.5rem;font-weight:700;color:${parseFloat(cancelRate) > 10 ? '#dc2626' : '#16a34a'};">${cancelRate}%</div>
                    <div style="font-size:0.8rem;color:var(--text-light);margin-top:0.25rem;">Cancel Rate</div>
                </div>
                <div style="text-align:center;padding:1rem;background:var(--bg-light);border-radius:10px;">
                    <div style="font-size:1.5rem;font-weight:700;color:#f59e0b;">${'★'.repeat(Math.round(stats.avg_rating || 0))}${'☆'.repeat(5 - Math.round(stats.avg_rating || 0))}</div>
                    <div style="font-size:0.8rem;color:var(--text-light);margin-top:0.25rem;">Rating</div>
                </div>
            </div>
        </div>`;

        el.innerHTML = statsHtml + trendHtml + performanceHtml + `<div style="display:grid;grid-template-columns:1fr 1fr;gap:1.5rem;margin-bottom:1.5rem;">${topProductsHtml}${statusHtml}</div>`;

    } catch (err) { console.error('Analytics load failed:', err); }
}

function loadSettings() {
    const avatarHtml = profile.profile_image
        ? `<img src="${escapeHtml(profile.profile_image)}" alt="Avatar" style="width:80px;height:80px;border-radius:50%;object-fit:cover;">`
        : `<div style="width:80px;height:80px;border-radius:50%;background:var(--bg-light);display:flex;align-items:center;justify-content:center;font-size:2rem;color:var(--text-light);">${(profile.shop_name || 'S').charAt(0).toUpperCase()}</div>`;
    const settingsEl = document.getElementById('settingsForm');
    if (!settingsEl) return;
    settingsEl.innerHTML = `
        <h3 style="margin-bottom:1rem;">Shop Profile</h3>
        <div style="display:flex;align-items:center;gap:1rem;margin-bottom:1rem;">
            ${avatarHtml}
            <div>
                <label style="display:block;font-size:0.85rem;font-weight:500;margin-bottom:0.25rem;">Profile Picture</label>
                <input type="file" id="setAvatarInput" accept="image/jpeg,image/png,image/webp" style="font-size:0.85rem;">
                <p style="font-size:0.75rem;color:var(--text-light);margin-top:0.25rem;">JPG, PNG, WEBP (Max 5MB)</p>
            </div>
        </div>
        <div class="form-group"><label>Shop Name</label><input type="text" id="setShopName" value="${escapeHtml(profile.shop_name || '')}"></div>
        <div class="form-row"><div class="form-group"><label>Phone</label><input type="tel" id="setPhone" value="${escapeHtml(profile.phone || '')}"></div><div class="form-group"><label>Location</label><input type="text" id="setLocation" value="${escapeHtml(profile.location || '')}"></div></div>
        <div class="form-group"><label>Description</label><textarea id="setDesc" rows="3">${escapeHtml(profile.description || '')}</textarea></div>
        <button class="btn btn-primary btn-sm" onclick="saveSettings()">Save Settings</button>
    `;
}

function navigateToAddProduct() {
    document.querySelectorAll('.dash-nav a').forEach(l => l.classList.remove('active'));
    document.querySelectorAll('.section').forEach(s => s.classList.remove('active'));
    document.getElementById('section-add-product').classList.add('active');
    window.scrollTo({ top: 0, behavior: 'smooth' });
    setTimeout(updatePreview, 50);
}

let editingProductId = null;

async function editProduct(id) {
    try {
        const products = await fetch('/api/seller/products', { headers: authHeaders() }).then(r => r.json());
        const p = products.find(x => x.id === id);
        if (!p) { alert('Product not found'); return; }
        editingProductId = id;

        const setVal = (v, el) => { const e = document.getElementById(el); if (e) e.value = v || ''; };
        const setSel = (v, el) => { const e = document.getElementById(el); if (e) { const o = Array.from(e.options).find(o => o.value === v || o.textContent === v); if (o) e.value = o.value; } };

        setVal(p.name, 'prodName'); setVal(p.price, 'prodPrice'); setVal(p.description, 'prodDesc');
        setVal(p.color, 'prodColor'); setVal(p.origin, 'prodOrigin'); setVal(p.sku, 'prodSku');
        setVal(p.stock_quantity, 'prodStock'); setVal(p.low_stock_alert, 'prodLowStock');
        setVal(p.shipping_fee, 'prodShippingFee'); setVal(p.seo_slug, 'prodSeoSlug');
        setVal(p.meta_description, 'prodMetaDesc'); setVal(p.shelf_life_days, 'prodLifespan');
        setVal(p.currency, 'prodCurrency'); setVal(p.unit, 'prodUnit');
        setSel(p.category_name || p.category, 'prodCategory');
        setSel(p.flower_cond, 'prodType'); setSel(p.occasion, 'prodOccasion');
        setSel(p.flower_type, 'prodFlowerType'); setSel(p.fragrance, 'prodFragrance');
        setSel(p.bloom_season, 'prodBloomSeason'); setSel(p.care_level, 'prodCareLevel');
        setSel(p.delivery_time, 'prodDeliveryTime');

        if (p.delivery_areas && Array.isArray(p.delivery_areas)) {
            setVal(p.delivery_areas.join(', '), 'prodDeliveryAreas');
        }
        const pickup = document.getElementById('prodPickup'); if (pickup) pickup.checked = p.pickup_available !== false;
        const featured = document.getElementById('prodFeatured'); if (featured) featured.checked = p.featured === true;

        pendingTags = Array.isArray(p.tags) ? [...p.tags] : [];
        renderTags();

        const previews = document.getElementById('imagePreviews');
        if (previews) {
            previews.innerHTML = '';
            const existingImages = p.images || (p.image_url ? [p.image_url] : []);
            existingImages.forEach(url => {
                if (!url) return;
                const wrapper = document.createElement('div');
                wrapper.style.cssText = 'position:relative;display:inline-block;';
                const img = document.createElement('img');
                img.src = url; img.style.cssText = 'width:80px;height:80px;object-fit:cover;border-radius:8px;';
                wrapper.appendChild(img); previews.appendChild(wrapper);
            });
            if (existingImages.length > 0) {
                const icon = document.getElementById('uploadIcon'); const text = document.getElementById('uploadPromptText');
                if (icon) icon.style.display = 'none'; if (text) text.textContent = existingImages.length + ' existing image(s)';
            }
        }
        if (p.video_url) {
            const vp = document.getElementById('videoPreview'); const vt = document.getElementById('videoPromptText');
            if (vp) { vp.src = p.video_url; vp.style.display = 'block'; }
            if (vt) vt.textContent = 'Current video attached';
        }
        const title = document.getElementById('formTitle');
        if (title) title.textContent = 'Edit Product';
        navigateToAddProduct();
        updateCharCount(); updatePreview();
    } catch { alert('Failed to load product'); }
}

async function saveProduct(status) {
    status = status || 'published';
    const name = document.getElementById('prodName').value.trim();
    const price = parseFloat(document.getElementById('prodPrice').value);
    if (!name || isNaN(price)) {
        alert('Product Name and Price are required.');
        return;
    }
    
    const getVal = (id) => document.getElementById(id)?.value?.trim() || null;
    const getNum = (id) => { const v = parseFloat(document.getElementById(id)?.value); return isNaN(v) ? null : v; };

    try {
        let imageUrls = [];
        let videoUrl = null;

        if (pendingImages.length > 0) {
            const fd = new FormData();
            pendingImages.forEach(f => fd.append('images', f));
            const uploadRes = await fetch('/api/upload', {
                method: 'POST',
                headers: { 'Authorization': 'Bearer ' + getToken(), 'X-Requested-With': 'XMLHttpRequest' },
                body: fd
            });
            if (!uploadRes.ok) throw new Error('Image upload failed');
            const uploadData = await uploadRes.json();
            imageUrls = uploadData.images || [];
        }

        if (pendingVideo) {
            const fd = new FormData();
            fd.append('video', pendingVideo);
            const uploadRes = await fetch('/api/upload/video', {
                method: 'POST',
                headers: { 'Authorization': 'Bearer ' + getToken(), 'X-Requested-With': 'XMLHttpRequest' },
                body: fd
            });
            if (!uploadRes.ok) throw new Error('Video upload failed');
            const uploadData = await uploadRes.json();
            videoUrl = uploadData.url || null;
        }

        const deliveryAreasRaw = getVal('prodDeliveryAreas');
        const deliveryAreas = deliveryAreasRaw ? deliveryAreasRaw.split(',').map(s => s.trim()).filter(Boolean) : [];

        const method = editingProductId ? 'PUT' : 'POST';
        const url = editingProductId ? `/api/products/${editingProductId}` : '/api/products';
        
        const body = {
            name, price,
            description: getVal('prodDesc'),
            category: getVal('prodCategory'),
            stock_quantity: parseInt(document.getElementById('prodStock')?.value) || 0,
            flower_cond: getVal('prodType'),
            color: getVal('prodColor'),
            occasion: getVal('prodOccasion'),
            currency: getVal('prodCurrency') || 'GHS',
            unit: getVal('prodUnit') || 'Piece',
            flower_type: getVal('prodFlowerType'),
            fragrance: getVal('prodFragrance'),
            bloom_season: getVal('prodBloomSeason'),
            origin: getVal('prodOrigin'),
            care_level: getVal('prodCareLevel'),
            shelf_life_days: getNum('prodLifespan') || 7,
            sku: getVal('prodSku'),
            low_stock_alert: parseInt(document.getElementById('prodLowStock')?.value) || 10,
            delivery_areas: deliveryAreas,
            delivery_time: getVal('prodDeliveryTime'),
            shipping_fee: getNum('prodShippingFee') || 0,
            pickup_available: document.getElementById('prodPickup')?.checked ?? true,
            tags: pendingTags,
            seo_slug: getVal('prodSeoSlug'),
            meta_description: getVal('prodMetaDesc'),
            featured: document.getElementById('prodFeatured')?.checked ?? false,
            status: status,
            is_active: status === 'published'
        };

        if (imageUrls.length > 0) { body.images = imageUrls; body.image_url = imageUrls[0]; }
        if (videoUrl) body.video_url = videoUrl;

        const res = await fetch(url, { method, headers: authHeaders(), body: JSON.stringify(body) });
        if (!res.ok) { const err = await res.json().catch(() => {}); alert(err?.error || 'Failed to save product'); return; }
        
        resetProductForm();
        const productsLink = document.querySelector('.dash-nav a[data-section="products"]');
        if (productsLink) productsLink.click();
    } catch (err) {
        alert('Failed to save product');
    }
}

function resetProductForm() {
    editingProductId = null;
    const title = document.getElementById('formTitle');
    if (title) title.textContent = 'Upload New Flower Product';
    ['prodName','prodPrice','prodDesc','prodColor','prodOrigin','prodSku','prodDeliveryAreas','prodSeoSlug','prodMetaDesc','prodTagInput'].forEach(id => {
        const el = document.getElementById(id); if (el) el.value = '';
    });
    ['prodCategory','prodType','prodOccasion','prodCurrency','prodUnit','prodFlowerType','prodFragrance','prodBloomSeason','prodCareLevel','prodDeliveryTime'].forEach(id => {
        const el = document.getElementById(id); if (el) el.selectedIndex = 0;
    });
    const stock = document.getElementById('prodStock'); if (stock) stock.value = '10';
    const lowStock = document.getElementById('prodLowStock'); if (lowStock) lowStock.value = '10';
    const shipFee = document.getElementById('prodShippingFee'); if (shipFee) shipFee.value = '0';
    const pickup = document.getElementById('prodPickup'); if (pickup) pickup.checked = true;
    const featured = document.getElementById('prodFeatured'); if (featured) featured.checked = false;
    pendingImages = []; pendingVideo = []; pendingTags = [];
    const previews = document.getElementById('imagePreviews'); if (previews) previews.innerHTML = '';
    const videoPrev = document.getElementById('videoPreview'); if (videoPrev) { videoPrev.style.display = 'none'; videoPrev.src = ''; }
    const videoText = document.getElementById('videoPromptText'); if (videoText) videoText.textContent = 'Add a short video (max 30 sec)';
    const icon = document.getElementById('uploadIcon'); const text = document.getElementById('uploadPromptText');
    if (icon) icon.style.display = ''; if (text) text.textContent = 'Drag & drop images here';
    const tagsC = document.getElementById('tagsContainer'); if (tagsC) tagsC.innerHTML = '';
    updateCharCount(); updatePreview();
}

async function deleteProduct(id) {
    if (!confirm('Delete this product?')) return;
    try {
        const res = await fetch(`/api/products/${id}`, { method: 'DELETE', headers: authHeaders() });
        if (!res.ok) {
            const data = await res.json();
            throw new Error(data.error || 'Delete failed');
        }
        loadProducts();
        loadDashboard();
    } catch (err) {
        handleError(err, 'Failed to delete product');
    }
}

async function updateOrder(id, status) {
    try { await fetch(`/api/seller/orders/${id}`, { method: 'PUT', headers: authHeaders(), body: JSON.stringify({ status }) }); loadOrders(); loadDashboard(); } catch (err) { handleError(err, 'Failed to update order'); }
}

async function saveSettings() {
    try {
        const avatarInput = document.getElementById('setAvatarInput');
        let profileImage = undefined;

        if (avatarInput && avatarInput.files.length > 0) {
            const file = avatarInput.files[0];
            if (file.size > 5 * 1024 * 1024) { alert('Image must be under 5MB.'); return; }
            const fd = new FormData();
            fd.append('images', file);
            const uploadRes = await fetch('/api/upload', {
                method: 'POST',
                headers: { 'Authorization': 'Bearer ' + getToken(), 'X-Requested-With': 'XMLHttpRequest' },
                body: fd
            });
            if (!uploadRes.ok) throw new Error('Image upload failed');
            const uploadData = await uploadRes.json();
            profileImage = uploadData.images[0];
        }

        const body = {
            shop_name: document.getElementById('setShopName').value.trim(),
            phone: document.getElementById('setPhone').value.trim() || null,
            location: document.getElementById('setLocation').value.trim() || null,
            description: document.getElementById('setDesc').value.trim() || null
        };
        if (profileImage) body.profile_image = profileImage;

        await fetch('/api/seller/profile', { method: 'PUT', headers: authHeaders(), body: JSON.stringify(body) });
        await loadProfile();
        alert('Settings saved!');
    } catch (err) { handleError(err, 'Failed to save settings'); }
}

function showModal(id) { document.getElementById(id).classList.add('show'); }
function hideModal(id) { document.getElementById(id).classList.remove('show'); }

document.addEventListener('click', (e) => {
    if (e.target.classList.contains('modal-overlay')) e.target.classList.remove('show');

    if (e.target.closest('#sellerLogout')) {
        e.preventDefault();
        if (typeof logout === 'function') logout();
        window.location.href = '/index.html';
    }
});

// ─── Product Form Helpers ───────────────────────────────────────────────────

function updateCharCount() {
    const el = document.getElementById('prodDesc');
    const counter = document.getElementById('charCount');
    if (el && counter) counter.textContent = el.value.length + '/2000';
}

function updatePreview() {
    const nameEl = document.getElementById('previewName');
    const catEl = document.getElementById('previewCategory');
    const priceEl = document.getElementById('previewPrice');
    const stockEl = document.getElementById('previewStock');
    const tagsEl = document.getElementById('previewTags');
    const imgEl = document.getElementById('previewImage');
    if (!nameEl) return;

    const name = document.getElementById('prodName')?.value?.trim() || 'Product Name';
    const price = document.getElementById('prodPrice')?.value || '0';
    const currency = document.getElementById('prodCurrency')?.value || 'GHS';
    const category = document.getElementById('prodCategory')?.value || 'Category';
    const stock = parseInt(document.getElementById('prodStock')?.value) || 0;
    const color = document.getElementById('prodColor')?.value?.trim();

    nameEl.textContent = name;
    catEl.textContent = category;
    priceEl.textContent = currency + ' ' + parseFloat(price).toFixed(2);
    stockEl.textContent = stock > 0 ? 'In Stock' : 'Out of Stock';
    stockEl.style.background = stock > 0 ? 'rgba(22,163,74,0.1)' : 'rgba(220,38,38,0.1)';
    stockEl.style.color = stock > 0 ? '#16a34a' : '#dc2626';

    let tagsHtml = '';
    if (pendingTags.length) {
        tagsHtml = pendingTags.slice(0, 3).map(t => `<span style="font-size:0.7rem;padding:0.15rem 0.4rem;border-radius:12px;background:rgba(139,92,246,0.1);color:var(--primary-color);">${escapeHtml(t)}</span>`).join('');
    }
    if (color) {
        tagsHtml = `<span style="font-size:0.7rem;padding:0.15rem 0.4rem;border-radius:12px;background:rgba(139,92,246,0.1);color:var(--primary-color);">${escapeHtml(color)}</span>` + tagsHtml;
    }
    tagsEl.innerHTML = tagsHtml;

    if (imgEl && pendingImages.length > 0) {
        const reader = new FileReader();
        reader.onload = (e) => { imgEl.innerHTML = `<img src="${e.target.result}" alt="Preview" style="width:100%;height:100%;object-fit:cover;border-radius:8px;">`; };
        reader.readAsDataURL(pendingImages[0]);
    } else if (imgEl) {
        imgEl.innerHTML = '<i class="bi bi-image" style="font-size:1.5rem;"></i>';
    }
}

function renderTags() {
    const container = document.getElementById('tagsContainer');
    if (!container) return;
    container.innerHTML = pendingTags.map((tag, i) =>
        `<span style="display:inline-flex;align-items:center;gap:0.3rem;padding:0.3rem 0.6rem;background:rgba(139,92,246,0.1);color:var(--primary-color);border-radius:20px;font-size:0.8rem;">${escapeHtml(tag)}<button onclick="removeTag(${i})" style="background:none;border:none;color:var(--primary-color);cursor:pointer;font-size:1rem;line-height:1;padding:0;">&times;</button></span>`
    ).join('');
}

function removeTag(index) {
    pendingTags.splice(index, 1);
    renderTags();
    updatePreview();
}

document.addEventListener('DOMContentLoaded', () => {
    const tagInput = document.getElementById('prodTagInput');
    if (tagInput) {
        tagInput.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
                e.preventDefault();
                const val = tagInput.value.trim();
                if (val && !pendingTags.includes(val) && pendingTags.length < 10) {
                    pendingTags.push(val);
                    renderTags();
                    updatePreview();
                }
                tagInput.value = '';
            }
        });
    }
});
