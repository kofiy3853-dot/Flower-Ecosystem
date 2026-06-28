// js/buyer-dashboard.js
// Buyer Dashboard — purchases, watchlist, sellers, deliveries, analytics

let profile = null;

async function initBuyerDashboard() {
    if (!localStorage.getItem('flower-token')) {
        const lp = document.getElementById('loginPrompt');
        if (lp) lp.style.display = 'block';
        return;
    }
    const dc = document.getElementById('dashContent');
    if (dc) dc.style.display = 'block';

    document.querySelectorAll('.dash-nav a').forEach(link => {
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
    loadSection('dashboard');
}

async function loadProfile() {
    try { profile = await fetch('/api/buyer/profile', { headers: authHeaders() }).then(r => r.json()); } catch { profile = { business_name: 'My Business' }; }
    document.getElementById('welcomeTitle').textContent = `Welcome Back, ${escapeHtml(profile.business_name || 'Buyer')}`;
}

async function loadSection(section) {
    switch (section) {
        case 'dashboard': await loadDashboard(); break;
        case 'purchases': await loadPurchases(); break;
        case 'watchlist': await loadWatchlist(); break;
        case 'sellers': await loadSellers(); break;
        case 'deliveries': await loadDeliveries(); break;
        case 'marketplace': await loadMarketplace(); break;
        case 'analytics': await loadAnalytics(); break;
        case 'settings': loadSettings(); break;
    }
}

async function loadDashboard() {
    try {
        const stats = await fetch('/api/buyer/analytics', { headers: authHeaders() }).then(r => r.json());
        document.getElementById('statsGrid').innerHTML = `
            <div class="stat-card"><div class="icon">🛍️</div><div class="num">${stats.total_purchases}</div><div class="label">Total Purchases</div></div>
            <div class="stat-card"><div class="icon">💰</div><div class="num">$${(stats.total_spent || 0).toLocaleString()}</div><div class="label">Total Spent</div></div>
            <div class="stat-card"><div class="icon">🏪</div><div class="num">${stats.saved_sellers}</div><div class="label">Saved Sellers</div></div>
            <div class="stat-card"><div class="icon">👁️</div><div class="num">${stats.watchlist_items}</div><div class="label">Watchlist Items</div></div>
            <div class="stat-card"><div class="icon">⭐</div><div class="num">${(stats.avg_rating || 0).toFixed(1)}</div><div class="label">Avg Rating Given</div></div>
        `;
    } catch {}

    try {
        const purchases = await fetch('/api/buyer/purchases', { headers: authHeaders() }).then(r => r.json());
        const recent = purchases.slice(0, 5);
        document.getElementById('recentPurchases').innerHTML = recent.length ? recent.map(p => `
            <div style="display:flex;justify-content:space-between;align-items:center;padding:0.4rem 0;border-bottom:1px solid var(--border-light);font-size:0.85rem;">
                <span>${escapeHtml(p.flower_name)} ${p.quantity ? '(' + p.quantity + ')' : ''}</span>
                <span style="font-weight:600;">$${(p.total_price || 0).toFixed(2)}</span>
            </div>
        `).join('') : '<div class="empty-state"><p>No purchases yet</p></div>';
    } catch {}

    try {
        const watchlist = await fetch('/api/buyer/watchlist', { headers: authHeaders() }).then(r => r.json());
        const alerts = watchlist.slice(0, 5);
        document.getElementById('watchlistAlerts').innerHTML = alerts.length ? alerts.map(w => `
            <div style="display:flex;justify-content:space-between;align-items:center;padding:0.4rem 0;border-bottom:1px solid var(--border-light);font-size:0.85rem;">
                <span>${escapeHtml(w.flower_name)}</span>
                <span class="badge badge-active">${w.target_price ? '$' + parseFloat(w.target_price).toFixed(2) : 'Any price'}</span>
            </div>
        `).join('') : '<div class="empty-state"><p>Watchlist empty</p></div>';
    } catch {}
}

async function loadPurchases() {
    let purchases;
    try { purchases = await fetch('/api/buyer/purchases', { headers: authHeaders() }).then(r => r.json()); } catch { purchases = []; }
    const el = document.getElementById('purchasesTable');
    if (!purchases.length) { el.innerHTML = '<div class="empty-state"><i class="bi bi-bag-check"></i><p>No purchases yet.</p></div>'; return; }
    el.innerHTML = `<table class="data-table"><thead><tr><th>Date</th><th>Flower</th><th>Quantity</th><th>Unit Price</th><th>Total</th><th>Seller</th><th>Rating</th></tr></thead><tbody>${purchases.map(p => `
        <tr>
            <td>${formatDate(p.purchase_date)}</td>
            <td><strong>${escapeHtml(p.flower_name)}</strong></td>
            <td>${p.quantity || '—'}</td>
            <td>$${(p.unit_price || 0).toFixed(2)}</td>
            <td style="font-weight:600;">$${(p.total_price || 0).toFixed(2)}</td>
            <td>${escapeHtml(p.seller_name || '—')}</td>
            <td><span class="rating">${p.rating ? '★'.repeat(p.rating) + '☆'.repeat(5 - p.rating) : '—'}</span></td>
        </tr>
    `).join('')}</tbody></table>`;
}

async function loadWatchlist() {
    let watchlist;
    try { watchlist = await fetch('/api/buyer/watchlist', { headers: authHeaders() }).then(r => r.json()); } catch { watchlist = []; }
    const el = document.getElementById('watchlistGrid');
    if (!watchlist.length) { el.innerHTML = '<div class="empty-state"><i class="bi bi-eye"></i><p>Watchlist empty. Add flowers you want to buy!</p></div>'; return; }
    el.innerHTML = `<div class="grid-2">${watchlist.map(w => `
        <div style="background:var(--bg-main);border:1px solid var(--border-color);border-radius:var(--radius-sm);padding:1rem;display:flex;justify-content:space-between;align-items:center;">
            <div>
                <div style="font-weight:600;font-size:0.9rem;">${escapeHtml(w.flower_name)}</div>
                <div style="font-size:0.8rem;color:var(--text-light);">${w.target_price ? 'Target: $' + parseFloat(w.target_price).toFixed(2) : 'Any price'}${w.max_quantity ? ' · Max: ' + w.max_quantity : ''}</div>
            </div>
            <button class="btn-action" onclick="removeWatchlist('${w.id}')"><i class="bi bi-trash"></i></button>
        </div>
    `).join('')}</div>`;
}

async function loadSellers() {
    let sellers;
    try { sellers = await fetch('/api/buyer/saved-sellers', { headers: authHeaders() }).then(r => r.json()); } catch { sellers = []; }
    const el = document.getElementById('sellersGrid');
    if (!sellers.length) { el.innerHTML = '<div class="empty-state"><i class="bi bi-shop"></i><p>No saved sellers yet.</p></div>'; return; }
    el.innerHTML = `<div class="grid-2">${sellers.map(s => `
        <div style="background:var(--bg-main);border:1px solid var(--border-color);border-radius:var(--radius-sm);padding:1rem;display:flex;justify-content:space-between;align-items:center;">
            <div>
                <div style="font-weight:600;font-size:0.9rem;">${escapeHtml(s.seller_name)}</div>
                ${s.notes ? `<div style="font-size:0.8rem;color:var(--text-light);">${escapeHtml(s.notes)}</div>` : ''}
            </div>
            <button class="btn-action" onclick="removeSeller('${s.id}')"><i class="bi bi-trash"></i></button>
        </div>
    `).join('')}</div>`;
}

async function loadDeliveries() {
    let deliveries;
    try { deliveries = await fetch('/api/buyer/deliveries', { headers: authHeaders() }).then(r => r.json()); } catch { deliveries = []; }
    const el = document.getElementById('deliveriesTable');
    if (!deliveries.length) { el.innerHTML = '<div class="empty-state"><i class="bi bi-truck"></i><p>No scheduled deliveries.</p></div>'; return; }
    el.innerHTML = `<table class="data-table"><thead><tr><th>Date</th><th>Flower</th><th>Quantity</th><th>Address</th><th>Status</th></tr></thead><tbody>${deliveries.map(d => `
        <tr>
            <td>${formatDate(d.delivery_date)}</td>
            <td><strong>${escapeHtml(d.flower_name || '—')}</strong></td>
            <td>${d.quantity || '—'}</td>
            <td style="max-width:200px;">${escapeHtml((d.address || '').slice(0, 50))}</td>
            <td><span class="badge badge-${d.status}">${escapeHtml(d.status)}</span></td>
        </tr>
    `).join('')}</tbody></table>`;
}

async function loadMarketplace() {
    let listings;
    try { listings = await fetch('/api/products?limit=12').then(r => r.json()).then(d => d.products || []); } catch { listings = []; }
    const el = document.getElementById('marketplaceGrid');
    if (!listings.length) { el.innerHTML = '<div class="empty-state"><i class="bi bi-bag"></i><p>No listings available.</p></div>'; return; }
    el.innerHTML = `<div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(160px,1fr));gap:1rem;">${listings.map(l => `
        <div style="background:var(--bg-main);border:1px solid var(--border-color);border-radius:var(--radius-md);overflow:hidden;cursor:pointer;" onclick="window.location.href='product-detail.html?id=${escapeHtml(String(l.id))}'">
            <img src="${escapeHtml(l.image || 'https://images.unsplash.com/photo-1490750967868-88df5691a78b?q=200&auto=format&fit=crop')}" alt="${escapeHtml(l.name)}" style="width:100%;height:120px;object-fit:cover;">
            <div style="padding:0.75rem;">
                <div style="font-weight:600;font-size:0.85rem;">${escapeHtml(l.name)}</div>
                <div style="font-size:0.8rem;color:var(--primary-color);font-weight:600;">$${(l.price || 0).toFixed(2)}</div>
            </div>
        </div>
    `).join('')}</div>`;
}

async function loadAnalytics() {
    try {
        const stats = await fetch('/api/buyer/analytics', { headers: authHeaders() }).then(r => r.json());
        const purchases = await fetch('/api/buyer/purchases', { headers: authHeaders() }).then(r => r.json());
        const flowerCounts = {};
        purchases.forEach(p => { flowerCounts[p.flower_name] = (flowerCounts[p.flower_name] || 0) + (p.quantity || 1); });
        const topFlowers = Object.entries(flowerCounts).sort((a, b) => b[1] - a[1]).slice(0, 5);

        document.getElementById('analyticsContent').innerHTML = `
            <div class="stats-grid" style="margin-bottom:1.5rem;">
                <div class="stat-card"><div class="num">${stats.total_purchases}</div><div class="label">Total Purchases</div></div>
                <div class="stat-card"><div class="num">$${(stats.total_spent || 0).toLocaleString()}</div><div class="label">Total Spent</div></div>
                <div class="stat-card"><div class="num">${stats.saved_sellers}</div><div class="label">Saved Sellers</div></div>
                <div class="stat-card"><div class="num">${stats.watchlist_items}</div><div class="label">Watchlist Items</div></div>
            </div>
            <div class="section-card"><h3>Most Purchased Flowers</h3>${topFlowers.length ? topFlowers.map(([name, qty], i) => `<div style="display:flex;justify-content:space-between;padding:0.3rem 0;font-size:0.85rem;border-bottom:1px solid var(--border-light);"><span>${i + 1}. ${escapeHtml(name)}</span><span style="font-weight:600;">${qty} units</span></div>`).join('') : '<p style="color:var(--text-light);font-size:0.85rem;">No data yet</p>'}</div>
        `;
    } catch {}
}

function loadSettings() {
    document.getElementById('settingsForm').innerHTML = `
        <h3 style="margin-bottom:1rem;">Business Profile</h3>
        <div class="form-group"><label>Business Name</label><input type="text" id="setBizName" value="${escapeHtml(profile.business_name || '')}"></div>
        <div class="form-row"><div class="form-group"><label>Business Type</label><select id="setBizType"><option value="">Select</option><option>Florist</option><option>Event Planner</option><option>Retailer</option><option>Wholesaler</option><option>Hotel/Restaurant</option><option>Individual</option></select></div><div class="form-group"><label>Phone</label><input type="tel" id="setPhone" value="${escapeHtml(profile.phone || '')}"></div></div>
        <div class="form-group"><label>Location</label><input type="text" id="setLocation" value="${escapeHtml(profile.location || '')}"></div>
        <div class="form-group"><label>Delivery Address</label><textarea id="setAddress" rows="2">${escapeHtml(profile.delivery_address || '')}</textarea></div>
        <div class="form-group"><label>Description</label><textarea id="setDesc" rows="2">${escapeHtml(profile.description || '')}</textarea></div>
        <button class="btn btn-primary btn-sm" onclick="saveSettings()">Save Settings</button>
    `;
    if (profile.business_type) document.getElementById('setBizType').value = profile.business_type;
}

async function savePurchase() {
    const flower = document.getElementById('purFlower').value.trim();
    if (!flower) return;
    try {
        await fetch('/api/buyer/purchases', { method: 'POST', headers: authHeaders(), body: JSON.stringify({
            flower_name: flower, seller_name: document.getElementById('purSeller').value.trim() || null,
            quantity: parseInt(document.getElementById('purQty').value) || null,
            unit_price: parseFloat(document.getElementById('purPrice').value) || null,
            total_price: parseFloat(document.getElementById('purTotal').value) || null,
            rating: parseInt(document.getElementById('purRating').value) || null,
            review: document.getElementById('purReview').value.trim() || null
        })});
        hideModal('purchaseModal');
        loadPurchases();
        loadDashboard();
    } catch {}
}

async function saveWatchlist() {
    const flower = document.getElementById('wlFlower').value.trim();
    if (!flower) return;
    try {
        await fetch('/api/buyer/watchlist', { method: 'POST', headers: authHeaders(), body: JSON.stringify({
            flower_name: flower, target_price: parseFloat(document.getElementById('wlPrice').value) || null,
            max_quantity: parseInt(document.getElementById('wlQty').value) || null,
            notes: document.getElementById('wlNotes').value.trim() || null
        })});
        hideModal('watchlistModal');
        loadWatchlist();
        loadDashboard();
    } catch {}
}

async function removeWatchlist(id) {
    try { await fetch(`/api/buyer/watchlist/${id}`, { method: 'DELETE', headers: authHeaders() }); loadWatchlist(); loadDashboard(); } catch {}
}

async function saveSeller() {
    const name = document.getElementById('svSeller').value.trim();
    if (!name) return;
    try {
        await fetch('/api/buyer/saved-sellers', { method: 'POST', headers: authHeaders(), body: JSON.stringify({
            seller_name: name, seller_id: document.getElementById('svSellerId').value.trim() || null,
            notes: document.getElementById('svNotes').value.trim() || null
        })});
        hideModal('sellerModal');
        loadSellers();
        loadDashboard();
    } catch {}
}

async function removeSeller(id) {
    try { await fetch(`/api/buyer/saved-sellers/${id}`, { method: 'DELETE', headers: authHeaders() }); loadSellers(); loadDashboard(); } catch {}
}

async function saveSettings() {
    try {
        await fetch('/api/buyer/profile', { method: 'PUT', headers: authHeaders(), body: JSON.stringify({
            business_name: document.getElementById('setBizName').value.trim(),
            business_type: document.getElementById('setBizType').value || null,
            phone: document.getElementById('setPhone').value.trim() || null,
            location: document.getElementById('setLocation').value.trim() || null,
            delivery_address: document.getElementById('setAddress').value.trim() || null,
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
});
