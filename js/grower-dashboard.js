// js/grower-dashboard.js
// Grower Dashboard — crops, harvests, orders, listings, analytics, settings

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

const growthStages = ['Seed', 'Germination', 'Vegetative', 'Budding', 'Flowering', 'Harvest Ready'];
const growthPercentages = { Seed: 10, Germination: 25, Vegetative: 50, Budding: 70, Flowering: 85, 'Harvest Ready': 100 };
const statusBadges = { Healthy: 'badge-healthy', 'Needs Attention': 'badge-warning', Diseased: 'badge-danger', 'Pest Issue': 'badge-warning' };
const orderStatuses = { pending: 'badge-pending', confirmed: 'badge-confirmed', shipped: 'badge-shipped', delivered: 'badge-delivered', cancelled: 'badge-danger' };

let currentSection = 'dashboard';
let profile = null;
let crops = [];
let editingCropId = null;

async function initGrowerDashboard() {
    if (!localStorage.getItem('flower-token')) {
        document.getElementById('loginPrompt').style.display = 'block';
        return;
    }
    document.getElementById('dashContent').style.display = 'block';

    document.querySelectorAll('.dash-nav a').forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault();
            const section = link.dataset.section;
            document.querySelectorAll('.dash-nav a').forEach(l => l.classList.remove('active'));
            link.classList.add('active');
            document.querySelectorAll('.section').forEach(s => s.classList.remove('active'));
            document.getElementById('section-' + section).classList.add('active');
            currentSection = section;
            // Scroll to top when switching sections
            window.scrollTo({ top: 0, behavior: 'smooth' });
            loadSection(section);
        });
    });

    await loadProfile();
    loadSection('dashboard');
}

async function loadProfile() {
    try {
        profile = await fetch('/api/grower/profile', { headers: authHeaders() }).then(r => r.json());
    } catch { profile = { farm_name: 'My Farm' }; }
    document.getElementById('welcomeTitle').textContent = `Welcome Back, ${escapeHtml(profile.farm_name || 'Grower')}`;
}

async function loadSection(section) {
    switch (section) {
        case 'dashboard': await loadDashboard(); break;
        case 'crops': await loadCrops(); break;
        case 'harvests': await loadHarvests(); break;
        case 'orders': await loadOrders(); break;
        case 'listings': await loadListings(); break;
        case 'analytics': await loadAnalytics(); break;
        case 'settings': loadSettings(); break;
    }
}

async function loadDashboard() {
    try {
        const stats = await fetch('/api/grower/analytics', { headers: authHeaders() }).then(r => r.json());
        document.getElementById('statsGrid').innerHTML = `
            <div class="stat-card"><div class="icon">🌸</div><div class="num">${stats.crops}</div><div class="label">Flower Varieties</div></div>
            <div class="stat-card"><div class="icon">🌱</div><div class="num">${(stats.total_quantity || 0).toLocaleString()}</div><div class="label">Flowers Growing</div></div>
            <div class="stat-card"><div class="icon">🌾</div><div class="num">${stats.harvests}</div><div class="label">Total Harvests</div></div>
            <div class="stat-card"><div class="icon">📦</div><div class="num">${stats.pending_orders}</div><div class="label">Pending Orders</div></div>
            <div class="stat-card"><div class="icon">💰</div><div class="num">$${(stats.revenue || 0).toLocaleString()}</div><div class="label">Revenue</div></div>
        `;
    } catch {}

    try {
        crops = await fetch('/api/grower/crops', { headers: authHeaders() }).then(r => r.json());
        const recent = crops.slice(0, 5);
        document.getElementById('recentCrops').innerHTML = recent.length ? recent.map(c => `
            <div style="display:flex;justify-content:space-between;align-items:center;padding:0.4rem 0;border-bottom:1px solid var(--border-light);font-size:0.85rem;">
                <span>${escapeHtml(c.flower_name)}</span>
                <span class="badge ${statusBadges[c.status] || 'badge-healthy'}">${escapeHtml(c.status)}</span>
            </div>
        `).join('') : '<div class="empty-state"><p>No crops yet</p></div>';
    } catch {}

    try {
        const orders = await fetch('/api/grower/orders', { headers: authHeaders() }).then(r => r.json());
        const pending = orders.filter(o => o.status === 'pending').slice(0, 5);
        document.getElementById('pendingOrders').innerHTML = pending.length ? pending.map(o => `
            <div style="display:flex;justify-content:space-between;align-items:center;padding:0.4rem 0;border-bottom:1px solid var(--border-light);font-size:0.85rem;">
                <span>${escapeHtml(o.buyer_name || 'Buyer')} — ${escapeHtml(o.flower_name)}</span>
                <span class="badge badge-pending">${o.quantity} units</span>
            </div>
        `).join('') : '<div class="empty-state"><p>No pending orders</p></div>';
    } catch {}
}

async function loadCrops() {
    try {
        crops = await fetch('/api/grower/crops', { headers: authHeaders() }).then(r => r.json());
    } catch { crops = []; }
    const el = document.getElementById('cropsTable');
    if (!crops.length) { el.innerHTML = '<div class="empty-state"><i class="bi bi-flower1"></i><p>No crops yet. Add your first crop!</p></div>'; return; }
    el.innerHTML = `<table class="data-table"><thead><tr><th>Flower</th><th>Variety</th><th>Quantity</th><th>Growth Stage</th><th>Health</th><th>Status</th><th>Actions</th></tr></thead><tbody>${crops.map(c => `
        <tr>
            <td><strong>${escapeHtml(c.flower_name)}</strong></td>
            <td>${escapeHtml(c.variety || '—')}</td>
            <td>${(c.quantity || 0).toLocaleString()}</td>
            <td><div style="display:flex;align-items:center;gap:0.5rem;"><div class="growth-bar"><div class="growth-fill growth-${(c.growth_stage || 'seed').toLowerCase()}" style="width:${growthPercentages[c.growth_stage] || 10}%"></div></div><span style="font-size:0.75rem;">${escapeHtml(c.growth_stage)}</span></div></td>
            <td><span style="font-weight:600;color:${(c.health_score || 100) >= 80 ? 'var(--accent-green)' : (c.health_score || 100) >= 50 ? 'var(--accent-gold)' : 'var(--error-color)'};">${c.health_score || 100}%</span></td>
            <td><span class="badge ${statusBadges[c.status] || 'badge-healthy'}">${escapeHtml(c.status)}</span></td>
            <td><button class="btn-action" onclick="editCrop('${c.id}')"><i class="bi bi-pencil"></i></button> <button class="btn-action" onclick="deleteCrop('${c.id}')"><i class="bi bi-trash"></i></button></td>
        </tr>
    `).join('')}</tbody></table>`;
}

async function loadHarvests() {
    let harvests;
    try { harvests = await fetch('/api/grower/harvests', { headers: authHeaders() }).then(r => r.json()); } catch { harvests = []; }
    const el = document.getElementById('harvestsTable');
    if (!harvests.length) { el.innerHTML = '<div class="empty-state"><i class="bi bi-basket"></i><p>No harvests recorded yet.</p></div>'; return; }
    el.innerHTML = `<table class="data-table"><thead><tr><th>Flower</th><th>Variety</th><th>Date</th><th>Quantity</th><th>Grade</th></tr></thead><tbody>${harvests.map(h => `
        <tr><td><strong>${escapeHtml(h.flower_name)}</strong></td><td>${escapeHtml(h.variety || '—')}</td><td>${formatDate(h.harvest_date)}</td><td>${(h.quantity || 0).toLocaleString()}</td><td>${escapeHtml(h.quality_grade || '—')}</td></tr>
    `).join('')}</tbody></table>`;

    const cropSelect = document.getElementById('harvestCrop');
    if (cropSelect) { cropSelect.innerHTML = '<option value="">Select crop</option>' + crops.map(c => `<option value="${c.id}">${escapeHtml(c.flower_name)} (${c.quantity} available)</option>`).join(''); }
}

async function loadOrders() {
    let orders;
    try { orders = await fetch('/api/grower/orders', { headers: authHeaders() }).then(r => r.json()); } catch { orders = []; }
    const el = document.getElementById('ordersTable');
    if (!orders.length) { el.innerHTML = '<div class="empty-state"><i class="bi bi-box-seam"></i><p>No orders yet.</p></div>'; return; }
    el.innerHTML = `<table class="data-table"><thead><tr><th>Order</th><th>Buyer</th><th>Flower</th><th>Quantity</th><th>Price</th><th>Status</th><th>Actions</th></tr></thead><tbody>${orders.map(o => `
        <tr>
            <td>#${o.id.slice(0, 8)}</td>
            <td>${escapeHtml(o.buyer_name || 'Buyer')}</td>
            <td>${escapeHtml(o.flower_name)}</td>
            <td>${(o.quantity || 0).toLocaleString()}</td>
            <td>$${(o.total_price || 0).toFixed(2)}</td>
            <td><span class="badge ${orderStatuses[o.status] || 'badge-pending'}">${escapeHtml(o.status)}</span></td>
            <td>${o.status === 'pending' ? `<button class="btn-action" onclick="updateOrder('${o.id}','confirmed')">Accept</button> <button class="btn-action" onclick="updateOrder('${o.id}','cancelled')">Reject</button>` : o.status === 'confirmed' ? `<button class="btn-action" onclick="updateOrder('${o.id}','shipped')">Ship</button>` : o.status === 'shipped' ? `<button class="btn-action" onclick="updateOrder('${o.id}','delivered')">Delivered</button>` : ''}</td>
        </tr>
    `).join('')}</tbody></table>`;
}

async function loadListings() {
    let listings;
    try { listings = await fetch('/api/grower/listings', { headers: authHeaders() }).then(r => r.json()); } catch { listings = []; }
    const el = document.getElementById('listingsTable');
    if (!listings.length) { el.innerHTML = '<div class="empty-state"><i class="bi bi-shop"></i><p>No listings yet. Create your first listing!</p></div>'; return; }
    el.innerHTML = `<table class="data-table"><thead><tr><th>Flower</th><th>Price</th><th>Available</th><th>Min Order</th><th>Grade</th><th>Status</th><th>Actions</th></tr></thead><tbody>${listings.map(l => `
        <tr>
            <td><strong>${escapeHtml(l.flower_name)}</strong></td>
            <td>$${(l.price_per_unit || 0).toFixed(2)}/${escapeHtml(l.unit_type || 'stem')}</td>
            <td>${(l.available_qty || 0).toLocaleString()}</td>
            <td>${(l.min_quantity || 0).toLocaleString()}</td>
            <td>${escapeHtml(l.quality_grade || '—')}</td>
            <td><span class="badge ${l.is_active ? 'badge-healthy' : 'badge-warning'}">${l.is_active ? 'Active' : 'Inactive'}</span></td>
            <td><button class="btn-action" onclick="deleteListing('${l.id}')"><i class="bi bi-trash"></i></button></td>
        </tr>
    `).join('')}</tbody></table>`;
}

async function loadAnalytics() {
    try {
        const stats = await fetch('/api/grower/analytics', { headers: authHeaders() }).then(r => r.json());
        document.getElementById('analyticsContent').innerHTML = `
            <div class="stats-grid" style="margin-bottom:1.5rem;">
                <div class="stat-card"><div class="num">${stats.crops}</div><div class="label">Active Crops</div></div>
                <div class="stat-card"><div class="num">${(stats.total_quantity || 0).toLocaleString()}</div><div class="label">Total Plants</div></div>
                <div class="stat-card"><div class="num">${stats.harvests}</div><div class="label">Total Harvests</div></div>
                <div class="stat-card"><div class="num">$${(stats.revenue || 0).toLocaleString()}</div><div class="label">Total Revenue</div></div>
            </div>
            <div class="grid-2">
                <div class="section-card"><h3>By Growth Stage</h3><div id="stageBreakdown"></div></div>
                <div class="section-card"><h3>By Status</h3><div id="statusBreakdown"></div></div>
            </div>
        `;
        const stages = {};
        crops.forEach(c => { stages[c.growth_stage] = (stages[c.growth_stage] || 0) + 1; });
        document.getElementById('stageBreakdown').innerHTML = Object.entries(stages).map(([s, n]) => `<div style="display:flex;justify-content:space-between;padding:0.3rem 0;font-size:0.85rem;"><span>${s}</span><span style="font-weight:600;">${n}</span></div>`).join('') || '<p style="color:var(--text-light);font-size:0.85rem;">No data</p>';
        const statuses = {};
        crops.forEach(c => { statuses[c.status] = (statuses[c.status] || 0) + 1; });
        document.getElementById('statusBreakdown').innerHTML = Object.entries(statuses).map(([s, n]) => `<div style="display:flex;justify-content:space-between;padding:0.3rem 0;font-size:0.85rem;"><span><span class="badge ${statusBadges[s] || ''}">${s}</span></span><span style="font-weight:600;">${n}</span></div>`).join('') || '<p style="color:var(--text-light);font-size:0.85rem;">No data</p>';
    } catch {}
}

function loadSettings() {
    document.getElementById('settingsForm').innerHTML = `
        <h3 style="margin-bottom:1rem;">Farm Profile</h3>
        <div class="form-group"><label>Farm Name</label><input type="text" id="setFarmName" value="${escapeHtml(profile.farm_name || '')}"></div>
        <div class="form-group"><label>Description</label><textarea id="setDesc" rows="3">${escapeHtml(profile.description || '')}</textarea></div>
        <div class="form-row"><div class="form-group"><label>Location</label><input type="text" id="setLocation" value="${escapeHtml(profile.location || '')}"></div><div class="form-group"><label>Acreage</label><input type="number" id="setAcreage" value="${profile.acreage || ''}"></div></div>
        <button class="btn btn-primary btn-sm" onclick="saveSettings()">Save Settings</button>
    `;
}

function editCrop(id) {
    const crop = crops.find(c => c.id === id || c.crop_id === id);
    if (!crop) return;
    editingCropId = id;
    document.getElementById('cropName').value = crop.flower_name || '';
    document.getElementById('cropVariety').value = crop.variety || '';
    document.getElementById('cropQty').value = crop.quantity || 0;
    document.getElementById('cropStage').value = crop.growth_stage || 'Seed';
    document.getElementById('cropStatus').value = crop.status || 'Healthy';
    document.getElementById('cropPlantDate').value = crop.planting_date || '';
    document.getElementById('cropHarvestDate').value = crop.expected_harvest || '';
    document.getElementById('cropField').value = crop.field_location || '';
    document.querySelector('#cropModal .modal h3').textContent = 'Edit Crop';
    document.querySelector('#cropModal .modal .btn-primary').textContent = 'Update Crop';
    showModal('cropModal');
}

async function saveCrop() {
    const name = document.getElementById('cropName').value.trim();
    if (!name) return;
    try {
        const payload = {
            flower_name: name, variety: document.getElementById('cropVariety').value.trim(),
            quantity: parseInt(document.getElementById('cropQty').value) || 0,
            growth_stage: document.getElementById('cropStage').value,
            status: document.getElementById('cropStatus').value,
            planting_date: document.getElementById('cropPlantDate').value || null,
            expected_harvest: document.getElementById('cropHarvestDate').value || null,
            field_location: document.getElementById('cropField').value.trim() || null
        };
        if (editingCropId) {
            await fetch('/api/grower/crops/' + editingCropId, { method: 'PUT', headers: authHeaders(), body: JSON.stringify(payload) });
            editingCropId = null;
        } else {
            await fetch('/api/grower/crops', { method: 'POST', headers: authHeaders(), body: JSON.stringify(payload) });
        }
        document.querySelector('#cropModal .modal h3').textContent = 'Add New Crop';
        document.querySelector('#cropModal .modal .btn-primary').textContent = 'Save Crop';
        hideModal('cropModal');
        loadCrops();
        loadDashboard();
    } catch {}
}

async function deleteCrop(id) {
    if (!confirm('Delete this crop?')) return;
    try { await fetch(`/api/grower/crops/${id}`, { method: 'DELETE', headers: authHeaders() }); loadCrops(); loadDashboard(); } catch {}
}

async function saveHarvest() {
    const cropId = document.getElementById('harvestCrop').value;
    const qty = parseInt(document.getElementById('harvestQty').value);
    if (!cropId || !qty) return;
    try {
        await fetch('/api/grower/harvests', { method: 'POST', headers: authHeaders(), body: JSON.stringify({
            crop_id: cropId, quantity: qty, harvest_date: document.getElementById('harvestDate').value || null,
            quality_grade: document.getElementById('harvestGrade').value || null
        })});
        hideModal('harvestModal');
        loadHarvests();
        loadDashboard();
    } catch {}
}

async function updateOrder(id, status) {
    try { await fetch(`/api/grower/orders/${id}`, { method: 'PUT', headers: authHeaders(), body: JSON.stringify({ status }) }); loadOrders(); loadDashboard(); } catch {}
}

async function saveListing() {
    const flower = document.getElementById('listFlower').value.trim();
    const price = parseFloat(document.getElementById('listPrice').value);
    if (!flower || !price) return;
    try {
        await fetch('/api/grower/listings', { method: 'POST', headers: authHeaders(), body: JSON.stringify({
            flower_name: flower, price_per_unit: price, unit_type: document.getElementById('listUnit').value,
            available_qty: parseInt(document.getElementById('listQty').value) || 0,
            min_quantity: parseInt(document.getElementById('listMin').value) || 100,
            quality_grade: document.getElementById('listGrade').value,
            description: document.getElementById('listDesc').value.trim() || null
        })});
        hideModal('listingModal');
        loadListings();
    } catch {}
}

async function deleteListing(id) {
    if (!confirm('Delete this listing?')) return;
    try { await fetch(`/api/grower/listings/${id}`, { method: 'DELETE', headers: authHeaders() }); loadListings(); } catch {}
}

async function saveSettings() {
    try {
        await fetch('/api/grower/profile', { method: 'PUT', headers: authHeaders(), body: JSON.stringify({
            farm_name: document.getElementById('setFarmName').value.trim(),
            description: document.getElementById('setDesc').value.trim(),
            location: document.getElementById('setLocation').value.trim(),
            acreage: parseFloat(document.getElementById('setAcreage').value) || null
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
