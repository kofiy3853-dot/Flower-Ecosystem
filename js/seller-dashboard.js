// js/seller-dashboard.js
// Seller Dashboard — products, orders, reviews, messages, analytics

function authHeaders() {
    const token = localStorage.getItem('flower-token');
    return token ? { 'Authorization': 'Bearer ' + token, 'Content-Type': 'application/json' } : { 'Content-Type': 'application/json' };
}

function escapeHtml(str) {
    if (typeof str !== 'string') return String(str || '');
    const div = document.createElement('div');
    div.appendChild(document.createTextNode(str));
    return div.innerHTML;
}

function formatDate(d) { return d ? new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : '—'; }

let profile = null;

async function initSellerDashboard() {
    if (!localStorage.getItem('flower-token')) {
        document.getElementById('loginPrompt').style.display = 'block';
        return;
    }
    document.getElementById('dashContent').style.display = 'block';

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
    loadSection('dashboard');
}

async function loadProfile() {
    try { profile = await fetch('/api/seller/profile', { headers: authHeaders() }).then(r => r.json()); } catch { profile = { shop_name: 'My Shop' }; }
    const shopName = profile.shop_name || 'My Shop';
    document.getElementById('welcomeTitle').textContent = `Welcome Back, ${escapeHtml(shopName)}`;
    
    const sidebarShopName = document.getElementById('sidebarShopName');
    const sidebarAvatar = document.getElementById('sidebarAvatar');
    if (sidebarShopName) sidebarShopName.textContent = shopName;
    if (sidebarAvatar) sidebarAvatar.textContent = shopName.charAt(0).toUpperCase();
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
        case 'messages': await loadMessages(); break;
        case 'analytics': await loadAnalytics(); break;
        case 'settings': loadSettings(); break;
    }
}

async function loadDashboard() {
    try {
        const stats = await fetch('/api/seller/analytics', { headers: authHeaders() }).then(r => r.json());
        document.getElementById('statsGrid').innerHTML = `
            <div class="stat-card"><div class="icon"><i class="bi bi-box-seam"></i></div><div class="num">${stats.products}</div><div class="label">Products</div><div class="trend up">+2</div></div>
            <div class="stat-card"><div class="icon"><i class="bi bi-receipt"></i></div><div class="num">${stats.total_orders}</div><div class="label">Total Orders</div><div class="trend up">+15%</div></div>
            <div class="stat-card"><div class="icon"><i class="bi bi-currency-dollar"></i></div><div class="num">$${(stats.revenue || 0).toLocaleString()}</div><div class="label">Revenue</div><div class="trend up">+8%</div></div>
            <div class="stat-card"><div class="icon"><i class="bi bi-hourglass-split"></i></div><div class="num">${stats.pending_orders}</div><div class="label">Pending</div><div class="trend down">-1</div></div>
            <div class="stat-card"><div class="icon"><i class="bi bi-star-fill"></i></div><div class="num">${(stats.avg_rating || 0).toFixed(1)}</div><div class="label">Avg Rating</div></div>
            <div class="stat-card"><div class="icon"><i class="bi bi-eye"></i></div><div class="num">${(stats.views || 0).toLocaleString()}</div><div class="label">Views</div><div class="trend up">+24%</div></div>
        `;
    } catch {}

    try {
        const orders = await fetch('/api/seller/orders', { headers: authHeaders() }).then(r => r.json());
        const recent = orders.slice(0, 5);
        document.getElementById('recentOrders').innerHTML = recent.length ? recent.map(o => `
            <div style="display:flex;justify-content:space-between;align-items:center;padding:0.75rem 0;border-bottom:1px solid var(--border-light);font-size:0.9rem;">
                <div>
                    <div style="font-weight:600;color:var(--text-main);">${escapeHtml(o.buyer_name || 'Buyer')}</div>
                    <div style="font-size:0.8rem;color:var(--text-light);">$${(o.total_amount || 0).toFixed(2)}</div>
                </div>
                <span class="badge badge-${o.status}">${escapeHtml(o.status)}</span>
            </div>
        `).join('') : '<div class="empty-state"><i class="bi bi-receipt"></i><p>No orders yet</p></div>';
    } catch {}

    try {
        const reviews = await fetch('/api/seller/reviews', { headers: authHeaders() }).then(r => r.json());
        const recent = reviews.slice(0, 3);
        document.getElementById('latestReviews').innerHTML = recent.length ? recent.map(r => `
            <div class="review-card">
                <div class="stars">${'★'.repeat(r.rating)}${'☆'.repeat(5 - r.rating)}</div>
                <div style="font-size:0.8rem;color:var(--text-light);">${escapeHtml(r.reviewer_name || 'Anonymous')}</div>
                ${r.comment ? `<div class="comment">${escapeHtml(r.comment)}</div>` : ''}
            </div>
        `).join('') : '<div class="empty-state"><p>No reviews yet</p></div>';
    } catch {}
}

async function loadProducts() {
    let products;
    try { products = await fetch('/api/seller/products', { headers: authHeaders() }).then(r => r.json()); } catch { products = []; }
    const el = document.getElementById('productsTable');
    if (!products.length) { el.innerHTML = '<div class="empty-state"><i class="bi bi-box"></i><p>No products yet. Add your first product!</p></div>'; return; }
    el.innerHTML = `<table class="data-table"><thead><tr><th>Product</th><th>Price</th><th>Stock</th><th>Category</th><th>Type</th><th>Expiry</th><th>Status</th><th>Actions</th></tr></thead><tbody>${products.map(p => {
        let expiryHtml = '<span style="color:var(--text-light)">—</span>';
        if (p.harvest_date && p.shelf_life_days) {
            const harvest = new Date(p.harvest_date);
            const expires = new Date(harvest.getTime() + p.shelf_life_days * 86400000);
            const daysLeft = Math.ceil((expires - new Date()) / 86400000);
            if (daysLeft < 0) expiryHtml = '<span style="color:var(--error-color);font-weight:600;">Expired</span>';
            else if (daysLeft <= 2) expiryHtml = `<span style="color:#e67e22;font-weight:600;">${daysLeft}d left</span>`;
            else expiryHtml = `<span style="color:var(--text-light)">${daysLeft}d left</span>`;
        }
        return `<tr>
            <td><strong>${escapeHtml(p.name)}</strong></td>
            <td>$${Number(p.price || 0).toFixed(2)}</td>
            <td>${p.stock_quantity || 0}</td>
            <td>${escapeHtml(p.category_name || p.category || '—')}</td>
            <td>${escapeHtml(p.flower_cond || '—')}</td>
            <td>${expiryHtml}</td>
            <td><span class="badge ${p.is_active ? 'badge-active' : 'badge-inactive'}">${p.is_active ? 'Active' : 'Inactive'}</span></td>
            <td><button class="btn-action" onclick="editProduct('${p.id}')"><i class="bi bi-pencil"></i></button> <button class="btn-action" onclick="deleteProduct('${p.id}')"><i class="bi bi-trash"></i></button></td>
        </tr>`;
    }).join('')}</tbody></table>`;
}

async function loadOrders() {
    let orders;
    try { orders = await fetch('/api/seller/orders', { headers: authHeaders() }).then(r => r.json()); } catch { orders = []; }
    const el = document.getElementById('ordersTable');
    if (!orders.length) { el.innerHTML = '<div class="empty-state"><i class="bi bi-receipt"></i><p>No orders yet.</p></div>'; return; }
    el.innerHTML = `<table class="data-table"><thead><tr><th>Order</th><th>Buyer</th><th>Items</th><th>Total</th><th>Status</th><th>Date</th><th>Actions</th></tr></thead><tbody>${orders.map(o => {
        const items = o.items || [];
        return `<tr>
            <td>#${o.id.slice(0, 8)}</td>
            <td>${escapeHtml(o.buyer_name || 'Buyer')}</td>
            <td>${items.map(i => escapeHtml(i.product_name) + ' x' + i.quantity).join(', ') || '—'}</td>
            <td style="font-weight:600;">$${(o.total_amount || 0).toFixed(2)}</td>
            <td><span class="badge badge-${o.status}">${escapeHtml(o.status)}</span></td>
            <td>${formatDate(o.created_at)}</td>
            <td>
                ${o.status === 'pending' ? `<button class="btn-action" onclick="updateOrder('${o.id}','confirmed')">Confirm</button>` : ''}
                ${o.status === 'confirmed' ? `<button class="btn-action" onclick="updateOrder('${o.id}','processing')">Process</button>` : ''}
                ${o.status === 'processing' ? `<button class="btn-action" onclick="updateOrder('${o.id}','shipped')">Ship</button>` : ''}
                ${o.status === 'shipped' ? `<button class="btn-action" onclick="updateOrder('${o.id}','delivered')">Deliver</button>` : ''}
            </td>
        </tr>`;
    }).join('')}</tbody></table>`;
}

async function loadReviews() {
    let reviews;
    try { reviews = await fetch('/api/seller/reviews', { headers: authHeaders() }).then(r => r.json()); } catch { reviews = []; }
    const el = document.getElementById('reviewsSection');
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

async function loadMessages() {
    let messages;
    try { messages = await fetch('/api/seller/messages', { headers: authHeaders() }).then(r => r.json()); } catch { messages = []; }
    const el = document.getElementById('messagesSection');
    if (!messages.length) { el.innerHTML = '<div class="empty-state"><i class="bi bi-chat-dots"></i><p>No messages yet.</p></div>'; return; }
    el.innerHTML = messages.map(m => `
        <div style="padding:0.75rem;border:1px solid var(--border-color);border-radius:var(--radius-sm);margin-bottom:0.5rem;${!m.is_read ? 'border-left:3px solid var(--primary-color);' : ''}">
            <div style="display:flex;justify-content:space-between;font-size:0.85rem;"><strong>${escapeHtml(m.subject || 'No subject')}</strong><span style="color:var(--text-muted);font-size:0.78rem;">${formatDate(m.created_at)}</span></div>
            <div style="font-size:0.8rem;color:var(--text-light);">From: ${escapeHtml(m.sender_name || 'Anonymous')}</div>
            <div style="font-size:0.85rem;margin-top:0.3rem;">${escapeHtml((m.content || '').slice(0, 150))}${(m.content || '').length > 150 ? '...' : ''}</div>
        </div>
    `).join('');
}

async function loadAnalytics() {
    try {
        const stats = await fetch('/api/seller/analytics', { headers: authHeaders() }).then(r => r.json());
        document.getElementById('analyticsContent').innerHTML = `
            <div class="stats-grid" style="margin-bottom:1.5rem;">
                <div class="stat-card"><div class="num">${stats.products}</div><div class="label">Active Products</div></div>
                <div class="stat-card"><div class="num">${stats.total_orders}</div><div class="label">Total Orders</div></div>
                <div class="stat-card"><div class="num">$${(stats.revenue || 0).toLocaleString()}</div><div class="label">Revenue</div></div>
                <div class="stat-card"><div class="num">${stats.pending_orders}</div><div class="label">Pending Orders</div></div>
                <div class="stat-card"><div class="num">${(stats.avg_rating || 0).toFixed(1)}</div><div class="label">Avg Rating (${stats.review_count || 0} reviews)</div></div>
                <div class="stat-card"><div class="num">${(stats.views || 0).toLocaleString()}</div><div class="label">Total Views</div></div>
            </div>
            <div class="grid-2">
                <div class="section-card"><h3>Performance Summary</h3>
                    <div style="font-size:0.85rem;"><div style="display:flex;justify-content:space-between;padding:0.4rem 0;border-bottom:1px solid var(--border-light);"><span>Conversion Rate</span><span style="font-weight:600;">${stats.views > 0 ? ((stats.total_orders / stats.views) * 100).toFixed(1) : 0}%</span></div>
                    <div style="display:flex;justify-content:space-between;padding:0.4rem 0;border-bottom:1px solid var(--border-light);"><span>Avg Order Value</span><span style="font-weight:600;">$${stats.total_orders > 0 ? (stats.revenue / stats.total_orders).toFixed(2) : '0.00'}</span></div>
                    <div style="display:flex;justify-content:space-between;padding:0.4rem 0;"><span>Revenue per Product</span><span style="font-weight:600;">$${stats.products > 0 ? (stats.revenue / stats.products).toFixed(2) : '0.00'}</span></div></div>
                </div>
                <div class="section-card"><h3>Customer Satisfaction</h3>
                    <div style="text-align:center;padding:1rem;"><div style="font-size:2.5rem;font-weight:700;color:var(--accent-gold);">${(stats.avg_rating || 0).toFixed(1)}</div><div style="color:var(--accent-gold);font-size:1.2rem;">${'★'.repeat(Math.round(stats.avg_rating || 0))}${'☆'.repeat(5 - Math.round(stats.avg_rating || 0))}</div><div style="font-size:0.85rem;color:var(--text-light);margin-top:0.5rem;">Based on ${stats.review_count || 0} reviews</div></div>
                </div>
            </div>
        `;
    } catch {}
}

function loadSettings() {
    document.getElementById('settingsForm').innerHTML = `
        <h3 style="margin-bottom:1rem;">Shop Profile</h3>
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
}

let editingProductId = null;

async function editProduct(id) {
    try {
        const products = await fetch('/api/seller/products', { headers: authHeaders() }).then(r => r.json());
        const p = products.find(x => x.id === id);
        if (!p) { alert('Product not found'); return; }
        editingProductId = id;
        document.getElementById('prodName').value = p.name || '';
        document.getElementById('prodPrice').value = p.price || '';
        document.getElementById('prodDesc').value = p.description || '';
        document.getElementById('prodStock').value = p.stock_quantity || 0;
        if (document.getElementById('prodCategory') && (p.category_name || p.category)) {
            const catOpt = Array.from(document.getElementById('prodCategory').options).find(o => o.value.toLowerCase() === (p.category_name || p.category).toLowerCase());
            if (catOpt) catOpt.selected = true;
        }
        if (document.getElementById('prodType')) {
            const fc = p.flower_cond || '';
            document.getElementById('prodType').value = fc.charAt(0).toUpperCase() + fc.slice(1).toLowerCase();
        }
        document.getElementById('prodColor').value = p.color || '';
        if (document.getElementById('prodOccasion') && p.occasion) {
            const occOpt = Array.from(document.getElementById('prodOccasion').options).find(o => o.value.toLowerCase() === p.occasion.toLowerCase());
            if (occOpt) occOpt.selected = true;
        }
        const formTitle = document.getElementById('formTitle');
        if (formTitle) formTitle.textContent = 'Edit Product';
        navigateToAddProduct();
    } catch { alert('Failed to load product'); }
}

async function saveProduct() {
    const name = document.getElementById('prodName').value.trim();
    const price = parseFloat(document.getElementById('prodPrice').value);
    if (!name || isNaN(price)) {
        alert('Product Name and Price are required.');
        return;
    }
    
    const catField = document.getElementById('prodCategory');
    const typeField = document.getElementById('prodType');
    const catName = catField ? catField.value : '';
    const flowerCond = typeField ? typeField.value : '';
    
    const method = editingProductId ? 'PUT' : 'POST';
    const url = editingProductId ? `/api/products/${editingProductId}` : '/api/products';
    
    try {
        const res = await fetch(url, { method, headers: authHeaders(), body: JSON.stringify({
            name, price, description: document.getElementById('prodDesc').value.trim() || null,
            category: catName || null,
            stock_quantity: parseInt(document.getElementById('prodStock').value) || 0,
            flower_cond: flowerCond || null,
            color: document.getElementById('prodColor')?.value?.trim() || null,
            occasion: document.getElementById('prodOccasion')?.value || null
        })});
        if (!res.ok) { const err = await res.json().catch(() => {}); alert(err?.error || 'Failed to save product'); return; }
        
        editingProductId = null;
        document.getElementById('formTitle').textContent = 'Add New Product';
        document.getElementById('prodName').value = '';
        document.getElementById('prodPrice').value = '';
        document.getElementById('prodDesc').value = '';
        document.getElementById('prodStock').value = '10';
        
        const productsLink = document.querySelector('.dash-nav a[data-section="products"]');
        if (productsLink) productsLink.click();
    } catch (err) {
        alert('Failed to save product');
    }
}

async function deleteProduct(id) {
    if (!confirm('Delete this product?')) return;
    try { await fetch(`/api/products/${id}`, { method: 'DELETE', headers: authHeaders() }); loadProducts(); loadDashboard(); } catch {}
}

async function updateOrder(id, status) {
    try { await fetch(`/api/seller/orders/${id}`, { method: 'PUT', headers: authHeaders(), body: JSON.stringify({ status }) }); loadOrders(); loadDashboard(); } catch {}
}

async function saveSettings() {
    try {
        await fetch('/api/seller/profile', { method: 'PUT', headers: authHeaders(), body: JSON.stringify({
            shop_name: document.getElementById('setShopName').value.trim(),
            phone: document.getElementById('setPhone').value.trim() || null,
            location: document.getElementById('setLocation').value.trim() || null,
            description: document.getElementById('setDesc').value.trim() || null
        })});
        await loadProfile();
        alert('Settings saved!');
    } catch {}
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
