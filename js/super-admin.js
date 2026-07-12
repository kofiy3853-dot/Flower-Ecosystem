/* ═══════════════════════════════════════════════════════════════════════════
   Super Admin Dashboard — Platform Control Center
   ═══════════════════════════════════════════════════════════════════════════ */
(function () {
    const $ = s => document.querySelector(s);
    const $$ = s => document.querySelectorAll(s);

    // ─── State ────────────────────────────────────────────
    let users = [], products = [], courses = [], orders = [], sellers = [], overview = {};

    // ─── Utilities ────────────────────────────────────────
    function esc(str) { return typeof escapeHtml === 'function' ? escapeHtml(str) : String(str || '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]); }

    function showToast(msg, type) {
        const t = $('#saToast');
        t.textContent = msg;
        t.className = 'sa-toast sa-toast-' + (type || 'success') + ' active';
        setTimeout(() => t.classList.remove('active'), 3000);
    }
    window.showToast = showToast;

    function timeAgo(date) {
        if (!date) return '—';
        const s = Math.floor((Date.now() - new Date(date)) / 1000);
        if (s < 60) return 'just now';
        if (s < 3600) return Math.floor(s / 60) + 'm ago';
        if (s < 86400) return Math.floor(s / 3600) + 'h ago';
        return Math.floor(s / 86400) + 'd ago';
    }

    async function saFetch(url, opts = {}) {
        try {
            const res = await fetch(url, {
                credentials: 'include',
                headers: { 'Content-Type': 'application/json', 'X-Requested-With': 'XMLHttpRequest', ...(opts.headers || {}) },
                ...opts
            });
            if (res.status === 401 || res.status === 403) {
                localStorage.removeItem('flower-user');
                window.location.href = 'index.html';
                return null;
            }
            return res;
        } catch (e) {
            console.error('Fetch error:', e);
            return null;
        }
    }

    // ─── Auth Guard ───────────────────────────────────────
    function checkAuth() {
        if (typeof isLoggedIn === 'undefined' || !isLoggedIn()) {
            document.body.innerHTML = '<div style="display:flex;align-items:center;justify-content:center;min-height:100vh;font-family:Poppins,sans-serif;"><div style="text-align:center;"><i class="bi bi-person-lock" style="font-size:3rem;color:#d4af37;"></i><h3 style="margin:1rem 0;">Please Sign In</h3><p style="color:var(--text-light);margin-bottom:1.5rem;">You need to be logged in as a Super Admin.</p><a href="index.html" class="sa-btn sa-btn-primary">Go to Store</a></div></div>';
            return false;
        }
        const user = getCurrentUser();
        const role = (user?.role || '').toUpperCase();
        if (role !== 'SUPERADMIN') {
            document.body.innerHTML = '<div style="display:flex;align-items:center;justify-content:center;min-height:100vh;font-family:Poppins,sans-serif;"><div style="text-align:center;"><i class="bi bi-shield-lock" style="font-size:3rem;color:#dc2626;"></i><h3 style="margin:1rem 0;">Super Admin Access Only</h3><p style="color:var(--text-light);">You do not have permission to view this page.</p><a href="index.html" class="sa-btn sa-btn-outline" style="margin-top:1rem;">Go Home</a></div></div>';
            return false;
        }
        return true;
    }

    // ─── Navigation ───────────────────────────────────────
    function switchSection(name) {
        $$('.sa-nav-item').forEach(n => n.classList.toggle('active', n.dataset.section === name));
        $$('.sa-section').forEach(s => s.classList.toggle('active', s.dataset.section === name));
        const label = $(`.sa-nav-item[data-section="${name}"]`);
        $('#saPageTitle').textContent = label ? label.textContent.trim() : name;
        window.scrollTo({ top: 0, behavior: 'smooth' });
        $('#saSidebar').classList.remove('open');
        loadSection(name);
    }

    function loadSection(name) {
        switch (name) {
            case 'overview': renderOverview(); break;
            case 'users': renderUsers(); break;
            case 'sellers': renderSellers(); break;
            case 'instructors': renderInstructors(); break;
            case 'products': renderProducts(); break;
            case 'categories': renderCategories(); break;
            case 'orders': renderOrders(); break;
            case 'courses': renderCourses(); break;
            case 'events': renderEvents(); break;
            case 'community': renderCommunity(); break;
            case 'settings': renderSettings(); break;
        }
    }

    // ─── Overview ─────────────────────────────────────────
    async function renderOverview() {
        // Fetch overview + health + pending + users for activity
        const [ovRes, healthRes, pendingRes] = await Promise.all([
            saFetch('/api/super-admin/overview'),
            saFetch('/api/super-admin/system-health'),
            saFetch('/api/super-admin/pending-approvals')
        ]);

        overview = ovRes ? await ovRes.json() : {};
        const health = healthRes ? await healthRes.json() : {};
        const pending = pendingRes ? await pendingRes.json() : {};

        // Stat cards
        $('#saOverviewStats').innerHTML = [
            statCard('bi-people', '#d4af37', overview.users || 0, 'Total Users', '+12%', true),
            statCard('bi-cash-stack', '#16a34a', 'GHS ' + formatNum(overview.revenue || 0), 'Revenue', '+18%', false),
            statCard('bi-box-seam', '#3b82f6', overview.products || 0, 'Products', '+8%', false),
            statCard('bi-book', '#7c3aed', overview.courses || 0, 'Courses', '+5%', false),
            statCard('bi-chat-dots', '#06b6d4', overview.discussions || 0, 'Discussions', '+3%', false),
            statCard('bi-calendar-event', '#f59e0b', overview.events || 0, 'Events', '+2%', false)
        ].join('');

        // Quick actions
        $('#saQuickActions').innerHTML = [
            quickCard('bi-plus-circle', 'rgba(212,175,55,0.1)', 'Add User', 'Create a new user account'),
            quickCard('bi-check-circle', 'rgba(22,163,74,0.1)', 'Approve Products', 'Review pending products'),
            quickCard('bi-megaphone', 'rgba(59,130,246,0.1)', 'Announcement', 'Send platform announcement'),
            quickCard('bi-download', 'rgba(124,58,237,0.1)', 'Export Data', 'Download platform data')
        ].join('');

        // Charts
        renderBarChart('saUsersChart', [40, 55, 45, 70, 65, 80], ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun']);
        renderBarChart('saRevenueChart', [30, 45, 55, 40, 65, 75], ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun']);

        // Pending approvals
        $('#saPendingApprovals').innerHTML = [
            approvalCard('bi-person-workspace', 'rgba(124,58,237,0.1)', pending.instructors || 0, 'Instructor Applications'),
            approvalCard('bi-shop', 'rgba(59,130,246,0.1)', pending.sellers || 0, 'Seller Verifications'),
            approvalCard('bi-box-seam', 'rgba(245,158,11,0.1)', pending.products || 0, 'Product Approvals'),
            approvalCard('bi-book', 'rgba(22,163,74,0.1)', pending.courses || 0, 'Course Approvals')
        ].join('');

        // Recent activity (from users)
        await renderRecentActivity();

        // System health
        renderSystemHealth(health);
    }

    async function renderRecentActivity() {
        const res = await saFetch('/api/admin/users');
        if (!res) return;
        const data = await res.json();
        const recentUsers = (Array.isArray(data) ? data : data.users || []).slice(0, 6);

        $('#saRecentActivity').innerHTML = recentUsers.map(u => `
            <div class="sa-activity-item">
                <div class="sa-activity-icon" style="background:rgba(212,175,55,0.1);color:#d4af37;"><i class="bi bi-person-plus"></i></div>
                <div>
                    <div class="sa-activity-text">New user: <strong>${esc(u.first_name)} ${esc(u.last_name)}</strong> (${esc(u.role)})</div>
                    <div class="sa-activity-time">${timeAgo(u.created_at)}</div>
                </div>
            </div>
        `).join('') || '<p style="color:var(--text-light);text-align:center;padding:1rem;">No recent activity</p>';
    }

    function renderSystemHealth(health) {
        const items = [
            { label: 'Database', status: health.database === 'ok' ? 'ok' : 'error', value: health.databaseLatency ? health.databaseLatency + 'ms' : '—' },
            { label: 'Server', status: 'ok', value: 'Running' },
            { label: 'DB Size', status: 'ok', value: health.dbSize || '—' },
            { label: 'Pool', status: 'ok', value: `${health.poolIdle || 0} idle / ${health.poolTotal || 0} total` },
            { label: 'API', status: 'ok', value: 'Operational' },
            { label: 'Recent Errors', status: (health.recentErrors || 0) > 0 ? 'warn' : 'ok', value: health.recentErrors || 0 }
        ];

        $('#saSystemHealth').innerHTML = items.map(h => `
            <div class="sa-health-card">
                <div class="sa-health-dot ${h.status}"></div>
                <div>
                    <div class="sa-health-label">${h.label}</div>
                    <div class="sa-health-value">${h.value}</div>
                </div>
            </div>
        `).join('');
    }

    // ─── Users ────────────────────────────────────────────
    async function renderUsers() {
        const res = await saFetch('/api/admin/users');
        if (!res) return;
        const data = await res.json();
        users = Array.isArray(data) ? data : (data.users || []);
        filterUsers();
        $('#saUserSearch').oninput = filterUsers;
        $('#saRoleFilter').onchange = filterUsers;
    }

    function filterUsers() {
        const q = ($('#saUserSearch')?.value || '').toLowerCase();
        const r = $('#saRoleFilter')?.value || 'all';
        const list = users.filter(u => {
            const name = ((u.first_name || '') + ' ' + (u.last_name || '') + ' ' + (u.email || '')).toLowerCase();
            return name.includes(q) && (r === 'all' || u.role === r);
        });
        $('#saUsersBody').innerHTML = list.map(u => `<tr>
            <td><div class="sa-user-cell"><div class="sa-user-avatar">${(u.first_name || '?')[0]}${(u.last_name || '') [0]}</div><div><div class="sa-user-name">${esc(u.first_name)} ${esc(u.last_name)}</div><div class="sa-user-email">${esc(u.email)}</div></div></div></td>
            <td><span class="sa-badge ${u.role === 'SUPERADMIN' ? 'sa-badge-superadmin' : 'sa-badge-role'}">${u.role}</span></td>
            <td><span class="sa-badge ${u.is_active ? 'sa-badge-active' : 'sa-badge-suspended'}">${u.is_active ? 'Active' : 'Suspended'}</span></td>
            <td>${u.created_at ? new Date(u.created_at).toLocaleDateString() : '—'}</td>
            <td><div class="sa-action-btns">
                <button onclick="saEditUser('${u.id}')"><i class="bi bi-pencil"></i></button>
                <button onclick="saToggleStatus('${u.id}',${u.is_active})">${u.is_active ? '<i class="bi bi-pause"></i>' : '<i class="bi bi-play"></i>'}</button>
                <button onclick="saChangeRole('${u.id}','${u.role}')"><i class="bi bi-shield"></i></button>
                <button class="danger" onclick="saDeleteUser('${u.id}')"><i class="bi bi-trash"></i></button>
            </div></td>
        </tr>`).join('') || '<tr><td colspan="5" style="text-align:center;color:var(--text-light);">No users found</td></tr>';
    }

    window.saToggleStatus = async function (id, active) {
        if (!confirm(`${active ? 'Suspend' : 'Activate'} this user?`)) return;
        await saFetch(`/api/admin/users/${id}/status`, { method: 'PUT' });
        users = users.map(u => u.id === id ? { ...u, is_active: !active } : u);
        filterUsers();
        showToast(`User ${active ? 'suspended' : 'activated'}`, 'success');
    };

    window.saChangeRole = async function (id, current) {
        const roles = ['CUSTOMER', 'SELLER', 'FLORIST', 'GROWER', 'INSTRUCTOR', 'MODERATOR', 'ADMIN', 'SUPERADMIN'];
        const r = prompt(`Current: ${current}\nNew role (${roles.join(', ')}):`, current);
        if (!r || !roles.includes(r.toUpperCase())) return;
        await saFetch(`/api/admin/users/${id}/role`, { method: 'PUT', body: JSON.stringify({ role: r.toUpperCase() }) });
        users = users.map(u => u.id === id ? { ...u, role: r.toUpperCase() } : u);
        filterUsers();
        showToast('Role updated', 'success');
    };

    window.saDeleteUser = async function (id) {
        if (!confirm('Permanently delete this user? This cannot be undone.')) return;
        await saFetch(`/api/admin/users/${id}`, { method: 'DELETE' });
        users = users.filter(u => u.id !== id);
        filterUsers();
        showToast('User deleted', 'success');
    };

    window.saEditUser = function (id) {
        const user = users.find(u => String(u.id) === String(id));
        if (!user) return;
        $('#saModalTitle').textContent = 'Edit User';
        $('#saModalForm').innerHTML = `
            <div class="sa-form-group"><label>First Name</label><input type="text" id="saEditFname" value="${esc(user.first_name)}" required></div>
            <div class="sa-form-group"><label>Email</label><input type="email" id="saEditEmail" value="${esc(user.email)}" required></div>
            <div class="sa-form-group"><label>Role</label><select id="saEditRole">
                ${['CUSTOMER', 'SELLER', 'FLORIST', 'GROWER', 'INSTRUCTOR', 'MODERATOR', 'ADMIN', 'SUPERADMIN'].map(r => `<option value="${r}" ${user.role === r ? 'selected' : ''}>${r}</option>`).join('')}
            </select></div>
            <div class="sa-form-group"><label>Location</label><input type="text" id="saEditLocation" value="${esc(user.location || '')}" placeholder="e.g. Accra, Ghana"></div>
            <div class="sa-form-group"><label>Description</label><textarea id="saEditDesc" rows="3" placeholder="Short bio">${esc(user.description || '')}</textarea></div>
            <div style="display:flex;gap:0.5rem;margin-top:1rem;">
                <button type="submit" class="sa-btn sa-btn-primary" style="flex:1;">Save Changes</button>
                <button type="button" class="sa-btn sa-btn-outline" style="flex:1;" onclick="saCloseModal()">Cancel</button>
            </div>
        `;
        $('#saModalForm').onsubmit = async (e) => {
            e.preventDefault();
            const data = {
                name: $('#saEditFname').value,
                email: $('#saEditEmail').value,
                role: $('#saEditRole').value,
                location: $('#saEditLocation').value,
                description: $('#saEditDesc').value
            };
            await saFetch(`/api/admin/users/${id}`, { method: 'PUT', body: JSON.stringify(data) });
            const idx = users.findIndex(u => String(u.id) === String(id));
            if (idx !== -1) users[idx] = { ...users[idx], ...data, first_name: data.name };
            showToast('User updated', 'success');
            saCloseModal();
            filterUsers();
        };
        $('#saModalOverlay').classList.add('active');
    };

    // ─── Sellers ──────────────────────────────────────────
    async function renderSellers() {
        const res = await saFetch('/api/admin/sellers');
        if (!res) return;
        sellers = await res.json();
        $('#saSellersBody').innerHTML = sellers.map(s => `<tr>
            <td><div class="sa-user-cell"><div class="sa-user-avatar">${(s.name || '?')[0]}</div><div><div class="sa-user-name">${esc(s.name)}</div><div class="sa-user-email">${esc(s.email)}</div></div></div></td>
            <td><span class="sa-badge sa-badge-role">${s.role}</span></td>
            <td>${s.product_count || 0}</td>
            <td>GHS ${Number(s.revenue || 0).toFixed(2)}</td>
            <td><span class="sa-badge ${s.is_active ? 'sa-badge-active' : 'sa-badge-pending'}">${s.is_active ? 'Active' : 'Pending'}</span></td>
            <td><div class="sa-action-btns">
                <button onclick="saToggleStatus('${s.id}',${s.is_active})">${s.is_active ? 'Suspend' : 'Approve'}</button>
                <button onclick="saEditUser('${s.id}')"><i class="bi bi-pencil"></i></button>
            </div></td>
        </tr>`).join('') || '<tr><td colspan="6" style="text-align:center;color:var(--text-light);">No sellers found</td></tr>';
    }

    // ─── Instructors ──────────────────────────────────────
    async function renderInstructors() {
        const res = await saFetch('/api/admin/users');
        if (!res) return;
        const data = await res.json();
        const instructors = (Array.isArray(data) ? data : data.users || []).filter(u => u.role === 'INSTRUCTOR');
        $('#saInstructorsBody').innerHTML = instructors.map(u => `<tr>
            <td><div class="sa-user-cell"><div class="sa-user-avatar">${(u.first_name || '?')[0]}${(u.last_name || '')[0]}</div><div><div class="sa-user-name">${esc(u.first_name)} ${esc(u.last_name)}</div><div class="sa-user-email">${esc(u.email)}</div></div></div></td>
            <td>—</td>
            <td>—</td>
            <td><span class="sa-badge ${u.is_verified ? 'sa-badge-active' : 'sa-badge-pending'}">${u.is_verified ? 'Verified' : 'Pending'}</span></td>
            <td><div class="sa-action-btns">
                <button onclick="saEditUser('${u.id}')"><i class="bi bi-pencil"></i></button>
                <button onclick="saToggleStatus('${u.id}',${u.is_active})">${u.is_active ? 'Suspend' : 'Activate'}</button>
            </div></td>
        </tr>`).join('') || '<tr><td colspan="5" style="text-align:center;color:var(--text-light);">No instructors found</td></tr>';
    }

    // ─── Products ─────────────────────────────────────────
    async function renderProducts() {
        const res = await saFetch('/api/products');
        if (!res) return;
        const data = await res.json();
        products = Array.isArray(data) ? data : (data.products || []);
        $('#saProductsBody').innerHTML = products.map(p => `<tr>
            <td><strong>${esc(p.name || p.title)}</strong></td>
            <td>${esc(p.seller_name || '—')}</td>
            <td>GHS ${Number(p.price || 0).toFixed(2)}</td>
            <td>${p.stock ?? '—'}</td>
            <td><span class="sa-badge ${p.is_active ? 'sa-badge-active' : 'sa-badge-pending'}">${p.is_active ? 'Active' : 'Inactive'}</span></td>
            <td><div class="sa-action-btns">
                <button onclick="saApproveProduct('${p.id}',${!p.is_active})">${p.is_active ? 'Deactivate' : 'Approve'}</button>
                <button class="danger" onclick="saDeleteProduct('${p.id}')"><i class="bi bi-trash"></i></button>
            </div></td>
        </tr>`).join('') || '<tr><td colspan="6" style="text-align:center;color:var(--text-light);">No products found</td></tr>';
    }

    window.saApproveProduct = async function (id, isActive) {
        await saFetch(`/api/admin/products/${id}/approve`, { method: 'PUT', body: JSON.stringify({ is_active: isActive }) });
        products = products.map(p => p.id === id ? { ...p, is_active: isActive } : p);
        renderProducts();
        showToast('Product updated', 'success');
    };

    window.saDeleteProduct = async function (id) {
        if (!confirm('Delete this product?')) return;
        await saFetch(`/api/products/${id}`, { method: 'DELETE' });
        products = products.filter(p => p.id !== id);
        renderProducts();
        showToast('Product deleted', 'success');
    };

    // ─── Categories & Images ──────────────────────────────
    let currentCatId = null;

    async function renderCategories() {
        const res = await saFetch('/api/products/categories');
        if (!res) return;
        const data = await res.json();
        const cats = Array.isArray(data) ? data : (data.categories || []);

        // Fetch image counts for each category
        const catImages = {};
        await Promise.all(cats.map(async c => {
            try {
                const imgRes = await saFetch(`/api/categories/${c.id}/images`);
                if (imgRes) {
                    const imgData = await imgRes.json();
                    catImages[c.id] = imgData.images || [];
                }
            } catch {}
        }));

        $('#saCategoriesBody').innerHTML = cats.map(c => {
            const imgs = catImages[c.id] || [];
            const featured = imgs.find(i => i.is_featured);
            return `<tr>
                <td><strong>${esc(c.name)}</strong></td>
                <td>${imgs.length}</td>
                <td>${featured ? `<img src="${esc(featured.storage_path)}" alt="" style="width:40px;height:40px;object-fit:cover;border-radius:6px;">` : '<span style="color:var(--text-light);">—</span>'}</td>
                <td><div class="sa-action-btns">
                    <button onclick="saViewCatImages('${c.id}','${esc(c.name)}')"><i class="bi bi-images"></i> Images</button>
                </div></td>
            </tr>`;
        }).join('') || '<tr><td colspan="4" style="text-align:center;color:var(--text-light);">No categories found</td></tr>';
    }

    window.saViewCatImages = async function (catId, catName) {
        currentCatId = catId;
        $('#saCategoryImagesTitle').textContent = catName + ' — Images';
        $('#saCategoryImagesPanel').style.display = 'block';
        $('#saCategoryImagesPanel').scrollIntoView({ behavior: 'smooth', block: 'nearest' });

        const res = await saFetch(`/api/categories/${catId}/images`);
        if (!res) return;
        const data = await res.json();
        const images = data.images || [];

        $('#saCatImagesBody').innerHTML = images.map(img => `<tr>
            <td><img src="${esc(img.storage_path)}" alt="${esc(img.alt_text || '')}" style="width:50px;height:50px;object-fit:cover;border-radius:6px;"></td>
            <td>${esc(img.file_name || '—')}</td>
            <td><span class="sa-badge ${img.status === 'active' ? 'sa-badge-active' : 'sa-badge-pending'}">${img.status || 'active'}</span></td>
            <td>${img.is_featured ? '<span class="sa-badge sa-badge-superadmin"><i class="bi bi-star"></i> Featured</span>' : '—'}</td>
            <td><div class="sa-action-btns">
                ${!img.is_featured ? `<button onclick="saFeatureImage('${img.id}')"><i class="bi bi-star"></i></button>` : ''}
                <button onclick="saToggleImageStatus('${img.id}','${img.status === 'active' ? 'inactive' : 'active'}')">${img.status === 'active' ? 'Hide' : 'Show'}</button>
                <button class="danger" onclick="saDeleteImage('${img.id}')"><i class="bi bi-trash"></i></button>
            </div></td>
        </tr>`).join('') || '<tr><td colspan="5" style="text-align:center;color:var(--text-light);">No images uploaded yet</td></tr>';
    };

    window.saUploadCatImages = async function (input) {
        if (!currentCatId || !input.files.length) return;
        const formData = new FormData();
        for (const file of input.files) formData.append('images', file);

        try {
            const res = await fetch(`/api/categories/${currentCatId}/images`, {
                method: 'POST', credentials: 'include', body: formData
            });
            if (res.ok) {
                showToast(`${input.files.length} image(s) uploaded`, 'success');
                saViewCatImages(currentCatId, $('#saCategoryImagesTitle').textContent.replace(' — Images', ''));
            } else {
                showToast('Upload failed', 'error');
            }
        } catch { showToast('Upload failed', 'error'); }
        input.value = '';
    };

    window.saDeleteImage = async function (id) {
        if (!confirm('Delete this image?')) return;
        const res = await saFetch(`/api/categories/images/${id}`, { method: 'DELETE' });
        if (res && res.ok) {
            showToast('Image deleted', 'success');
            saViewCatImages(currentCatId, $('#saCategoryImagesTitle').textContent.replace(' — Images', ''));
            renderCategories();
        } else {
            showToast('Failed to delete', 'error');
        }
    };

    window.saFeatureImage = async function (id) {
        const res = await saFetch(`/api/categories/images/${id}/feature`, { method: 'PATCH' });
        if (res && res.ok) {
            showToast('Featured image updated', 'success');
            saViewCatImages(currentCatId, $('#saCategoryImagesTitle').textContent.replace(' — Images', ''));
            renderCategories();
        }
    };

    window.saToggleImageStatus = async function (id, status) {
        const res = await saFetch(`/api/categories/images/${id}/status`, {
            method: 'PATCH', body: JSON.stringify({ status })
        });
        if (res && res.ok) {
            showToast('Image status updated', 'success');
            saViewCatImages(currentCatId, $('#saCategoryImagesTitle').textContent.replace(' — Images', ''));
        }
    };

    // ─── Orders ───────────────────────────────────────────
    async function renderOrders() {
        const res = await saFetch('/api/admin/orders');
        if (!res) return;
        orders = await res.json();
        $('#saOrderFilter').onchange = () => filterOrders();
        filterOrders();
    }

    function filterOrders() {
        const f = $('#saOrderFilter')?.value || 'all';
        const list = f === 'all' ? orders : orders.filter(o => o.status === f);
        $('#saOrdersBody').innerHTML = list.map(o => `<tr>
            <td>#${String(o.id).slice(0, 8)}</td>
            <td>${esc(o.customer || '—')}</td>
            <td>GHS ${Number(o.total_amount || 0).toFixed(2)}</td>
            <td><span class="sa-badge sa-badge-${(o.status || '').toLowerCase()}">${o.status || '—'}</span></td>
            <td>${o.created_at ? new Date(o.created_at).toLocaleDateString() : '—'}</td>
            <td><div class="sa-action-btns">
                <button onclick="saUpdateOrderStatus('${o.id}','SHIPPED')">Ship</button>
                <button onclick="saUpdateOrderStatus('${o.id}','DELIVERED')">Deliver</button>
            </div></td>
        </tr>`).join('') || '<tr><td colspan="6" style="text-align:center;color:var(--text-light);">No orders found</td></tr>';
    }

    window.saUpdateOrderStatus = async function (id, status) {
        await saFetch(`/api/admin/orders/${id}/status`, { method: 'PUT', body: JSON.stringify({ status }) });
        orders = orders.map(o => o.id === id ? { ...o, status } : o);
        filterOrders();
        showToast('Order status updated', 'success');
    };

    // ─── Courses ──────────────────────────────────────────
    async function renderCourses() {
        const res = await saFetch('/api/courses');
        if (!res) return;
        const data = await res.json();
        courses = Array.isArray(data) ? data : (data.courses || []);
        $('#saCoursesBody').innerHTML = courses.map(c => `<tr>
            <td><strong>${esc(c.title)}</strong></td>
            <td>${esc(c.instructor_name || c.instructor || '—')}</td>
            <td>${esc(c.level || '—')}</td>
            <td>${c.enrolled_count ?? c.students ?? '—'}</td>
            <td><span class="sa-badge ${c.is_published ? 'sa-badge-active' : 'sa-badge-pending'}">${c.is_published ? 'Published' : 'Draft'}</span></td>
            <td><div class="sa-action-btns">
                <button onclick="saApproveCourse('${c.id}',${!c.is_published})">${c.is_published ? 'Unpublish' : 'Publish'}</button>
            </div></td>
        </tr>`).join('') || '<tr><td colspan="6" style="text-align:center;color:var(--text-light);">No courses found</td></tr>';
    }

    window.saApproveCourse = async function (id, publish) {
        await saFetch(`/api/courses/${id}`, { method: 'PUT', body: JSON.stringify({ is_published: publish }) });
        courses = courses.map(c => c.id === id ? { ...c, is_published: publish } : c);
        renderCourses();
        showToast('Course updated', 'success');
    };

    // ─── Events ───────────────────────────────────────────
    async function renderEvents() {
        const res = await saFetch('/api/events');
        if (!res) return;
        const data = await res.json();
        const events = Array.isArray(data) ? data : (data.events || []);
        $('#saEventsBody').innerHTML = events.map(e => `<tr>
            <td><strong>${esc(e.title)}</strong></td>
            <td>${e.event_date ? new Date(e.event_date).toLocaleDateString() : '—'}</td>
            <td><span class="sa-badge sa-badge-role">${esc(e.event_type || e.type || '—')}</span></td>
            <td>${esc(e.location || 'Online')}</td>
            <td>${e.attendee_count ?? e.registered_count ?? '—'}</td>
            <td><div class="sa-action-btns">
                <button onclick="saDeleteEvent('${e.id}')"><i class="bi bi-trash"></i> Delete</button>
            </div></td>
        </tr>`).join('') || '<tr><td colspan="6" style="text-align:center;color:var(--text-light);">No events found</td></tr>';
    }

    window.saDeleteEvent = async function (id) {
        if (!confirm('Delete this event? This cannot be undone.')) return;
        const res = await saFetch(`/api/events/${id}`, { method: 'DELETE' });
        if (res && res.ok) {
            showToast('Event deleted', 'success');
            renderEvents();
        } else {
            showToast('Failed to delete event', 'error');
        }
    };

    // ─── Community ────────────────────────────────────────
    async function renderCommunity() {
        const res = await saFetch('/api/discussions');
        if (!res) return;
        const data = await res.json();
        const discussions = Array.isArray(data) ? data : (data.discussions || []);
        $('#saCommunityBody').innerHTML = discussions.map(d => `<tr>
            <td><strong>${esc(d.title)}</strong></td>
            <td>${esc(d.author_name || d.author || '—')}</td>
            <td>${d.reply_count ?? d.replies ?? 0}</td>
            <td>${d.created_at ? new Date(d.created_at).toLocaleDateString() : '—'}</td>
            <td><div class="sa-action-btns">
                <button onclick="saDeleteDiscussion('${d.id}')"><i class="bi bi-trash"></i> Delete</button>
            </div></td>
        </tr>`).join('') || '<tr><td colspan="5" style="text-align:center;color:var(--text-light);">No discussions found</td></tr>';
    }

    window.saDeleteDiscussion = async function (id) {
        if (!confirm('Delete this discussion? This cannot be undone.')) return;
        const res = await saFetch(`/api/discussions/${id}`, { method: 'DELETE' });
        if (res && res.ok) {
            showToast('Discussion deleted', 'success');
            renderCommunity();
        } else {
            showToast('Failed to delete discussion', 'error');
        }
    };

    // ─── Settings ─────────────────────────────────────────
    function renderSettings() {
        const user = getCurrentUser();
        $('#saSettingEmail').textContent = user?.email || '—';
    }

    // ─── Card Builders ────────────────────────────────────
    function statCard(icon, color, value, label, trend, highlight) {
        return `<div class="sa-stat-card${highlight ? ' highlight' : ''}">
            <div class="sa-stat-icon" style="background:${color}15;color:${color};"><i class="bi ${icon}"></i></div>
            <div class="sa-stat-info">
                <div class="sa-stat-value">${value}</div>
                <div class="sa-stat-label">${label}</div>
                <div class="sa-stat-change positive"><i class="bi bi-arrow-up-right"></i> ${trend}</div>
            </div>
        </div>`;
    }

    function quickCard(icon, bg, title, desc) {
        return `<div class="sa-quick-card">
            <div class="sa-quick-icon" style="background:${bg};"><i class="bi ${icon}"></i></div>
            <div><div class="sa-quick-title">${title}</div><div class="sa-quick-desc">${desc}</div></div>
        </div>`;
    }

    function approvalCard(icon, bg, count, label) {
        return `<div class="sa-approval-card">
            <div class="sa-approval-icon" style="background:${bg};"><i class="bi ${icon}"></i></div>
            <div class="sa-approval-count">${count}</div>
            <div class="sa-approval-label">${label}</div>
        </div>`;
    }

    function renderBarChart(id, values, labels) {
        const el = document.getElementById(id);
        if (!el) return;
        const max = Math.max(...values, 1);
        el.innerHTML = values.map((v, i) =>
            `<div><div class="sa-chart-bar" style="height:${(v / max) * 100}%;opacity:${0.5 + i * 0.1};"></div><div class="sa-chart-bar-label">${labels[i]}</div></div>`
        ).join('');
    }

    function formatNum(n) {
        if (n >= 1000000) return (n / 1000000).toFixed(1) + 'M';
        if (n >= 1000) return (n / 1000).toFixed(1) + 'K';
        return Number(n).toFixed(2);
    }

    // ─── Modal ────────────────────────────────────────────
    window.saCloseModal = function () { $('#saModalOverlay').classList.remove('active'); };

    // ─── Notifications ────────────────────────────────────
    async function renderNotifications() {
        const items = [];
        const recentUsers = users.slice(0, 3);
        recentUsers.forEach(u => items.push({ icon: 'bi-person-plus', text: `New user: ${u.first_name} ${u.last_name}`, time: timeAgo(u.created_at), color: '#d4af37' }));
        if (!items.length) items.push({ icon: 'bi-shield-check', text: 'System running normally', time: 'now', color: '#16a34a' });
        $('#saNotifBadge').textContent = items.length;
        $('#saNotifList').innerHTML = items.map(n => `
            <div class="sa-notif-item">
                <div class="sa-notif-icon" style="background:${n.color}15;color:${n.color};"><i class="bi ${n.icon}"></i></div>
                <div><div>${esc(n.text)}</div><div class="sa-activity-time">${n.time}</div></div>
            </div>
        `).join('');
    }

    // ─── Logout ───────────────────────────────────────────
    window.saLogout = function () {
        localStorage.removeItem('flower-user');
        localStorage.removeItem('flower-auth');
        window.location.href = 'index.html';
    };

    // ─── Init ─────────────────────────────────────────────
    async function init() {
        if (!checkAuth()) return;

        const user = getCurrentUser();
        const initials = ((user?.first_name || 'S')[0] + (user?.last_name || 'A')[0]).toUpperCase();
        $('#saAvatar').textContent = initials;
        $('#saProfileName').textContent = user?.first_name || 'Super Admin';

        // Sidebar nav
        $$('.sa-nav-item[data-section]').forEach(n => n.addEventListener('click', () => switchSection(n.dataset.section)));

        // Hamburger
        $('#saHamburger')?.addEventListener('click', () => $('#saSidebar').classList.toggle('open'));
        document.addEventListener('click', e => {
            if (!e.target.closest('.sa-sidebar') && !e.target.closest('.sa-hamburger')) $('#saSidebar').classList.remove('open');
        });

        // Notifications
        $('#saNotifBtn')?.addEventListener('click', () => $('#saNotifPanel').classList.toggle('open'));
        document.addEventListener('click', e => {
            if (!e.target.closest('.sa-notif-panel') && !e.target.closest('#saNotifBtn')) $('#saNotifPanel').classList.remove('open');
        });

        // Logout
        $('#saLogout')?.addEventListener('click', e => { e.preventDefault(); saLogout(); });

        // Load initial data
        const [usersRes] = await Promise.all([
            saFetch('/api/admin/users')
        ]);
        if (usersRes) {
            const data = await usersRes.json();
            users = Array.isArray(data) ? data : (data.users || []);
        }

        renderNotifications();
        renderOverview();
    }

    // Start
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();
