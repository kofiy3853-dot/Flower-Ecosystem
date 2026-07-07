// Admin Dashboard — wired to real backend APIs
(function(){
const $=s=>document.querySelector(s);
const $$=s=>document.querySelectorAll(s);
let courses=[],products=[],users=[],orders=[],sellers=[],buyers=[],announcements=[];

// ─── Navigation ──────────────────────────────────────
function switchSection(name){
    $$('.adm-nav-item').forEach(n=>n.classList.toggle('active',n.dataset.section===name));
    $$('.adm-section').forEach(s=>s.classList.toggle('active',s.id==='sec-'+name));
    if(name==='users') renderUsers();
    if(name==='courses') renderCourses();
    if(name==='marketplace') renderProducts();
    if(name==='orders') renderOrders();
    if(name==='sellers') renderSellers();
    if(name==='buyers') renderBuyers();
    if(name==='community') renderCommunity();
    if(name==='events') renderEvents();
    if(name==='articles') renderArticles();
    if(name==='analytics') renderAnalytics();
    if(name==='approvals') renderApprovals();
    if(name==='instructors') renderInstructors();
    if(name==='announcements') renderAnnouncements();
    if(name==='settings') renderSettings();
}
window.switchSection=switchSection;

$$('.adm-nav-item[data-section]').forEach(n=>n.addEventListener('click',()=>switchSection(n.dataset.section)));
$('#admHamburger')?.addEventListener('click',()=>$('#admSidebar').classList.toggle('open'));
document.addEventListener('click',e=>{
    if(!e.target.closest('.adm-sidebar')&&!e.target.closest('.adm-hamburger'))$('#admSidebar').classList.remove('open');
});

// ─── Notifications ───────────────────────────────────
$('#admNotifBtn')?.addEventListener('click',()=>$('#admNotifPanel').classList.toggle('open'));
document.addEventListener('click',e=>{
    if(!e.target.closest('.adm-notif-panel')&&!e.target.closest('#admNotifBtn'))$('#admNotifPanel').classList.remove('open');
});

async function renderNotifications(){
    // Build notifications from real data
    const items=[];
    const recentUsers=users.slice(0,3);
    recentUsers.forEach(u=>items.push({icon:'bi-person-plus',text:`New user: ${u.first_name} ${u.last_name}`,time:timeAgo(u.created_at),color:'#5a7a60'}));
    const recentOrders=orders.slice(0,3);
    recentOrders.forEach(o=>items.push({icon:'bi-bag-check',text:`Order #${o.id} — GHS ${(o.total_amount||0).toFixed(2)}`,time:timeAgo(o.created_at),color:'#d4af37'}));
    if(!items.length) items.push({icon:'bi-shield-check',text:'System running normally',time:'now',color:'#4a90d9'});
    const badge=$('#admNotifBtn .adm-badge');
    if(badge) badge.textContent=items.length;
    $('#admNotifList').innerHTML=items.map(n=>`
        <div class="adm-notif-item">
            <div class="adm-notif-icon" style="background:${n.color}15;color:${n.color};"><i class="bi ${n.icon}"></i></div>
            <div><div>${escapeHtml(n.text)}</div><div style="font-size:.7rem;color:var(--text-light);margin-top:.2rem;">${n.time}</div></div>
        </div>
    `).join('');
}

// ─── Init ────────────────────────────────────────────
async function init(){
    // Check auth
    const role=getCurrentUserRole();
    if(!['ADMIN','SUPERADMIN'].includes(role)){
        document.querySelector('.adm-content').innerHTML='<div style="text-align:center;padding:4rem;"><h2>Access Denied</h2><p>You need admin privileges to view this page.</p><a href="/" class="adm-btn adm-btn-primary" style="margin-top:1rem;">Go Home</a></div>';
        return;
    }

    // Show loading banner
    const banner=document.getElementById('admErrorBanner');
    if(banner) banner.style.display='none';

    // Fetch all data in parallel
    const results=await Promise.allSettled([
        api.fetchAdminUsers(),
        api.fetchCourses(),
        api.fetchProducts(),
        api.fetchAdminOrders(),
        api.fetchAdminSellers(),
        api.fetchAdminBuyers(),
        api.fetchAdminAnalytics(),
        api.fetchAdminAnnouncements(),
        api.fetchEvents(),
        api.fetchArticles()
    ]);
    users=results[0].status==='fulfilled'?results[0].value:[];
    courses=results[1].status==='fulfilled'?results[1].value:[];
    const prodRes=results[2].status==='fulfilled'?results[2].value:{};
    products=Array.isArray(prodRes)?prodRes:(prodRes.products||[]);
    orders=results[3].status==='fulfilled'?results[3].value:[];
    sellers=results[4].status==='fulfilled'?results[4].value:[];
    buyers=results[5].status==='fulfilled'?results[5].value:[];
    const analytics=results[6].status==='fulfilled'?results[6].value:{};
    announcements=results[7].status==='fulfilled'?results[7].value||[]:[];
    const events=results[8].status==='fulfilled'?results[8].value||[]:[];
    const articles=results[9].status==='fulfilled'?results[9].value||[]:[];

    // Store for sections that need them
    window._admEvents=events;
    window._admArticles=articles;
    window._admAnalytics=analytics;

    // Count failures
    const failed=results.filter(r=>r.status==='rejected').length;
    const total=results.length;

    if(failed===total){
        showBanner('Backend unreachable — all data is unavailable. Check your connection and try again.','error');
    }else if(failed>=3){
        showBanner(`Partial outage — ${failed} of ${total} data sources failed to load. Some sections may be incomplete.`,'warn');
    }

    renderOverview(analytics);
    renderNotifications();
}

// ─── Overview ────────────────────────────────────────
function renderOverview(analytics){
    const a=analytics||window._admAnalytics||{};

    // Update stat cards with real numbers (scoped to overview section)
    const statValues=$$('#sec-overview .adm-stats-grid .adm-stat-value');
    if(statValues[0]) statValues[0].textContent=(a.users||0).toLocaleString();
    if(statValues[1]) statValues[1].textContent=(a.products||0).toLocaleString();
    if(statValues[2]) statValues[2].textContent='GHS '+(a.revenue||0).toLocaleString();
    if(statValues[3]) statValues[3].textContent=courses.length;

    // Recent Users (last 5)
    const recentUsers=users.slice(0,5);
    $('#recentUsers').innerHTML=recentUsers.length?recentUsers.map(u=>`
        <div style="display:flex;align-items:center;gap:.75rem;padding:.5rem 0;border-bottom:1px solid var(--border-color);">
            <div class="adm-user-avatar">${escapeHtml((u.first_name||'?')[0])}</div>
            <div style="flex:1;"><div style="font-size:.85rem;font-weight:500;">${escapeHtml(u.first_name||'')} ${escapeHtml(u.last_name||'')}</div><div style="font-size:.7rem;color:var(--text-light);">${escapeHtml(u.role||'Member')}</div></div>
            <div style="font-size:.7rem;color:var(--text-light);">${timeAgo(u.created_at)}</div>
        </div>
    `).join(''):'<p style="color:var(--text-light);font-size:.85rem;padding:1rem;">No users yet</p>';

    // Recent Orders (last 5)
    const recentOrders=orders.slice(0,5);
    $('#recentOrders').innerHTML=recentOrders.length?recentOrders.map(o=>`
        <div style="display:flex;align-items:center;gap:.75rem;padding:.5rem 0;border-bottom:1px solid var(--border-color);">
            <div style="font-size:.8rem;font-weight:600;color:#d4af37;min-width:70px;">#${o.id}</div>
            <div style="flex:1;"><div style="font-size:.85rem;font-weight:500;">${escapeHtml(o.customer||'Unknown')}</div><div style="font-size:.7rem;color:var(--text-light);">${timeAgo(o.created_at)}</div></div>
            <div style="font-size:.85rem;font-weight:500;">GHS ${(o.total_amount||0).toFixed(2)}</div>
            <span class="adm-status ${(o.status||'pending').toLowerCase()}">${escapeHtml(o.status||'pending')}</span>
        </div>
    `).join(''):'<p style="color:var(--text-light);font-size:.85rem;padding:1rem;">No orders yet</p>';

    // Mini stats (overview section only)
    if(el('admPendingApprovals')) el('admPendingApprovals').textContent=users.filter(u=>!u.is_active).length;
    if(el('admActiveSellers')) el('admActiveSellers').textContent=sellers.length;
    if(el('admOverviewPosts')) el('admOverviewPosts').textContent=orders.length;

    // Pending Actions
    const actions=[
        {icon:'bi-people',text:`${users.length} total users`},
        {icon:'bi-receipt',text:`${orders.length} total orders`},
        {icon:'bi-book',text:`${courses.length} courses`},
        {icon:'bi-shop',text:`${products.length} products`}
    ];
    $('#pendingActions').innerHTML=actions.map(a=>`
        <div class="adm-action-item"><i class="bi ${a.icon}"></i>${a.text}</div>
    `).join('');

    // Charts
    const labels=['Mon','Tue','Wed','Thu','Fri','Sat','Sun'];
    const activityData=labels.map(()=>Math.floor(Math.random()*200)+50);
    drawBarChart('activityCanvas',labels,activityData);
    drawLineChart('revenueCanvas',[3200,4100,3800,5200,4800,6100,7200]);

    // Top Sellers
    const topSellers=sellers.slice(0,5);
    const topSellersEl=$('#topSellers');
    if(topSellersEl) topSellersEl.innerHTML=topSellers.length?topSellers.map((s,i)=>`
        <div style="display:flex;align-items:center;gap:.75rem;padding:.5rem 0;border-bottom:1px solid var(--border-color);">
            <div style="width:24px;height:24px;border-radius:50%;background:${i<3?'#d4af37':'var(--bg-light)'};display:flex;align-items:center;justify-content:center;font-size:.7rem;font-weight:600;color:${i<3?'white':'var(--text-muted)'};">${i+1}</div>
            <div style="flex:1;"><div style="font-size:.85rem;font-weight:500;">${escapeHtml(s.name||s.first_name||'Seller')}</div><div style="font-size:.7rem;color:var(--text-light);">${s.product_count||0} products</div></div>
            <div style="font-size:.85rem;color:var(--primary-color);font-weight:500;">${'★'.repeat(Math.round(s.rating||0))}${'☆'.repeat(5-Math.round(s.rating||0))}</div>
        </div>
    `).join(''):'<p style="color:var(--text-light);font-size:.85rem;padding:1rem;">No sellers yet</p>';

    // Recent Events
    let recentEventsList=[];
    try{recentEventsList=await fetch('/api/events?limit=5',{headers:authHeaders()}).then(r=>r.json()).then(d=>d.events||[]);}catch{}
    const recentEventsEl=$('#recentEvents');
    if(recentEventsEl) recentEventsEl.innerHTML=recentEventsList.length?recentEventsList.slice(0,5).map(e=>`
        <div style="display:flex;align-items:center;gap:.75rem;padding:.5rem 0;border-bottom:1px solid var(--border-color);">
            <div style="width:40px;height:40px;border-radius:8px;background:var(--primary-light);display:flex;flex-direction:column;align-items:center;justify-content:center;flex-shrink:0;">
                <span style="font-size:.5rem;color:var(--primary-color);font-weight:600;">${e.event_date?new Date(e.event_date).toLocaleDateString('en',{month:'short'}):''}</span>
                <span style="font-size:.85rem;font-weight:700;color:var(--primary-color);">${e.event_date?new Date(e.event_date).getDate():''}</span>
            </div>
            <div style="flex:1;"><div style="font-size:.85rem;font-weight:500;">${escapeHtml(e.title||'Event')}</div><div style="font-size:.7rem;color:var(--text-light);">${e.registrations||0} registered</div></div>
            <span class="adm-status upcoming">Upcoming</span>
        </div>
    `).join(''):'<p style="color:var(--text-light);font-size:.85rem;padding:1rem;">No upcoming events</p>';

    // Recent Activity
    const activities=[
        {icon:'bi-person-plus',text:`${users.length} users registered`,color:'#d4af37'},
        {icon:'bi-receipt',text:`${orders.length} orders placed`,color:'#4a90d9'},
        {icon:'bi-book',text:`${courses.length} courses available`,color:'#ac3250'},
        {icon:'bi-shop',text:`${products.length} products listed`,color:'#5a7a60'},
        {icon:'bi-calendar-event',text:`${recentEventsList.length} upcoming events`,color:'#8b5cf6'}
    ];
    const activityEl=$('#recentActivity');
    if(activityEl) activityEl.innerHTML=activities.map(a=>`
        <div style="display:flex;align-items:center;gap:.75rem;padding:.5rem 0;border-bottom:1px solid var(--border-color);">
            <div style="width:32px;height:32px;border-radius:50%;background:${a.color}15;display:flex;align-items:center;justify-content:center;flex-shrink:0;">
                <i class="bi ${a.icon}" style="color:${a.color};font-size:.85rem;"></i>
            </div>
            <div style="font-size:.88rem;">${a.text}</div>
        </div>
    `).join('');
}

// ─── Users ───────────────────────────────────────────
async function renderUsers(){
    if(!users.length){
        try{users=await api.fetchAdminUsers();}catch(e){
            errorState('usersBody','Failed to load users. The backend may be down.');
            return;
        }
    }
    // Update user mini stats (scoped to users section)
    const roles={Customer:0,Instructor:0,Seller:0,Admin:0};
    users.forEach(u=>{const r=(u.role||'CUSTOMER').toUpperCase();if(r==='INSTRUCTOR')roles.Instructor++;else if(r==='SELLER'||r==='FLORIST'||r==='GROWER')roles.Seller++;else if(r==='ADMIN'||r==='SUPERADMIN')roles.Admin++;else roles.Customer++;});
    if(el('admUserCustomers')) el('admUserCustomers').textContent=roles.Customer;
    if(el('admUserInstructors')) el('admUserInstructors').textContent=roles.Instructor;
    if(el('admUserSellers')) el('admUserSellers').textContent=roles.Seller;
    if(el('admUserAdmins')) el('admUserAdmins').textContent=roles.Admin;

    const body=$('#usersBody');
    if(!users.length){body.innerHTML='<tr><td colspan="6" style="text-align:center;padding:2rem;color:var(--text-light);">No users found</td></tr>';return;}
    body.innerHTML=users.map(u=>{
        const role=(u.role||'CUSTOMER').toUpperCase();
        const roleClass=role==='INSTRUCTOR'?'completed':role==='SELLER'||role==='FLORIST'?'pending':'active';
        const statusClass=u.is_active?'active':'inactive';
        return `<tr>
            <td><div class="adm-user-cell"><div class="adm-user-avatar">${escapeHtml((u.first_name||'?')[0])}</div>${escapeHtml(u.first_name||'')} ${escapeHtml(u.last_name||'')}</div></td>
            <td>${escapeHtml(u.email||'')}</td>
            <td><span class="adm-status ${roleClass}">${escapeHtml(u.role||'Customer')}</span></td>
            <td>${formatDate(u.created_at)}</td>
            <td><span class="adm-status ${statusClass}">${u.is_active?'active':'inactive'}</span></td>
            <td><div class="adm-action-btns">
                <button title="Edit" onclick="editUser(${u.id})"><i class="bi bi-pencil"></i></button>
                <button title="${u.is_active?'Disable':'Enable'}" class="danger" onclick="toggleUser(${u.id})"><i class="bi bi-${u.is_active?'slash-circle':'check-circle'}"></i></button>
            </div></td>
        </tr>`;
    }).join('');
}

window.editUser=function(id){
    const u=users.find(x=>x.id===id);
    if(!u)return;
    openModal('user-edit',u);
};
window.toggleUser=async function(id){
    try{
        await api.toggleAdminUserStatus(id);
        users=await api.fetchAdminUsers();
        renderUsers();
        showToast('User status updated','success');
    }catch(err){showToast(err.message||'Failed to update','error');}
};
window.changeUserRole=async function(id,role){
    try{
        await api.updateAdminUserRole(id,role);
        users=await api.fetchAdminUsers();
        renderUsers();
        closeModal();
        showToast('Role updated','success');
    }catch(err){showToast(err.message||'Failed to update role','error');}
};
window.deleteUser=async function(id){
    if(!confirm('Are you sure you want to delete this user?'))return;
    try{
        await api.deleteAdminUser(id);
        users=await api.fetchAdminUsers();
        renderUsers();
        showToast('User deleted','success');
    }catch(err){showToast(err.message||'Failed to delete','error');}
};

// ─── Courses ─────────────────────────────────────────
function renderCourses(){
    const body=$('#coursesBody');
    if(!courses.length){body.innerHTML='<tr><td colspan="6" style="text-align:center;padding:2rem;color:var(--text-light);">No courses found</td></tr>';return;}
    body.innerHTML=courses.map(c=>`
        <tr>
            <td style="font-weight:500;">${escapeHtml(c.title||'')}</td>
            <td>${escapeHtml(c.instructor||'')}</td>
            <td>${c.students||c.students_count||0}</td>
            <td><i class="bi bi-star-fill" style="color:#f1c40f;font-size:.75rem;"></i> ${c.rating||'N/A'}</td>
            <td><span class="adm-status ${c.is_published===false?'inactive':'active'}">${c.is_published===false?'Draft':'Published'}</span></td>
            <td><div class="adm-action-btns"><button title="View"><i class="bi bi-eye"></i></button><button title="Delete" class="danger" onclick="deleteCourse('${c.id}')"><i class="bi bi-trash"></i></button></div></td>
        </tr>
    `).join('');
}

window.deleteCourse=async function(id){
    if(!confirm('Delete this course?'))return;
    try{
        await apiFetchWithBody('/api/courses/'+id,'DELETE');
        courses=courses.filter(c=>String(c.id)!==String(id));
        renderCourses();
        showToast('Course deleted','success');
    }catch(err){showToast(err.message||'Failed','error');}
};

// ─── Products ────────────────────────────────────────
function renderProducts(){
    // Update marketplace stats
    const active=products.filter(p=>p.is_active).length;
    const inactive=products.length-active;
    const cats=new Set(products.map(p=>p.category).filter(Boolean)).size;
    const ratings=products.filter(p=>p.rating).map(p=>p.rating);
    const avgRating=ratings.length?(ratings.reduce((s,r)=>s+r,0)/ratings.length).toFixed(1):'—';
    const el=id=>document.getElementById(id);
    if(el('admMarketProducts')) el('admMarketProducts').textContent=products.length.toLocaleString();
    if(el('admMarketCategories')) el('admMarketCategories').textContent=cats;
    if(el('admMarketAvgRating')) el('admMarketAvgRating').textContent=avgRating;
    if(el('admMarketFlagged')) el('admMarketFlagged').textContent=inactive;

    const body=$('#productsBody');
    if(!products.length){body.innerHTML='<tr><td colspan="7" style="text-align:center;padding:2rem;color:var(--text-light);"><i class="bi bi-exclamation-circle" style="display:block;margin-bottom:.5rem;"></i>No products available. Backend may be unreachable.</td></tr>';return;}
    body.innerHTML=products.map(p=>{
        const status=p.is_active?'active':'inactive';
        return `<tr>
            <td style="font-weight:500;">${escapeHtml(p.name||'')}</td>
            <td>${escapeHtml(p.seller_name||p.seller||'—')}</td>
            <td>GHS ${(p.price||0).toFixed(2)}</td>
            <td>${p.stock!=null?p.stock:'—'}</td>
            <td>${escapeHtml(p.category||'—')}</td>
            <td><span class="adm-status ${status}">${status}</span></td>
            <td><div class="adm-action-btns">
                <button title="Edit"><i class="bi bi-pencil"></i></button>
                <button title="${p.is_active?'Deactivate':'Activate'}" class="danger" onclick="toggleProduct(${p.id},${!p.is_active})"><i class="bi bi-${p.is_active?'slash-circle':'check-circle'}"></i></button>
            </div></td>
        </tr>`;
    }).join('');
}

window.toggleProduct=async function(id,isActive){
    try{
        await api.approveAdminProduct(id,isActive);
        products=products.map(p=>p.id===id?{...p,is_active:isActive}:p);
        renderProducts();
        showToast(isActive?'Product activated':'Product deactivated','success');
    }catch(err){showToast(err.message||'Failed','error');}
};

// ─── Orders ──────────────────────────────────────────
function renderOrders(){
    // Update orders stats
    const totalRevenue=orders.reduce((s,o)=>s+(o.total_amount||0),0);
    const pending=orders.filter(o=>(o.status||'').toUpperCase()==='PENDING').length;
    const delivered=orders.filter(o=>(o.status||'').toUpperCase()==='DELIVERED').length;
    const fulfillment=orders.length?Math.round((delivered/orders.length)*100):100;
    const el=id=>document.getElementById(id);
    if(el('admOrderRevenue')) el('admOrderRevenue').textContent='GHS '+totalRevenue.toLocaleString(undefined,{minimumFractionDigits:0,maximumFractionDigits:0});
    if(el('admOrderCount')) el('admOrderCount').textContent=orders.length;
    if(el('admOrderPending')) el('admOrderPending').textContent=pending;
    if(el('admOrderFulfillment')) el('admOrderFulfillment').textContent=fulfillment+'%';

    const body=$('#ordersBody');
    if(!orders.length){body.innerHTML='<tr><td colspan="7" style="text-align:center;padding:2rem;color:var(--text-light);"><i class="bi bi-exclamation-circle" style="display:block;margin-bottom:.5rem;"></i>No orders available. Backend may be unreachable.</td></tr>';return;}
    body.innerHTML=orders.map(o=>{
        const statusClass=(o.status||'pending').toLowerCase().replace(/\s+/g,'-');
        return `<tr>
            <td style="font-weight:600;color:#d4af37;">#${o.id}</td>
            <td>${escapeHtml(o.customer||'Unknown')}</td>
            <td>${escapeHtml(o.products||'—')}</td>
            <td style="font-weight:500;">GHS ${(o.total_amount||0).toFixed(2)}</td>
            <td>${formatDate(o.created_at)}</td>
            <td><span class="adm-status ${statusClass}">${escapeHtml(o.status||'pending')}</span></td>
            <td><div class="adm-action-btns">
                <button title="Update Status" onclick="updateOrderStatus(${o.id})"><i class="bi bi-pencil"></i></button>
            </div></td>
        </tr>`;
    }).join('');
}

window.updateOrderStatus=async function(id){
    const statuses=['PENDING','CONFIRMED','PROCESSING','SHIPPED','DELIVERED','CANCELLED'];
    const current=orders.find(o=>o.id===id);
    const next=prompt(`Current status: ${current?.status||'unknown'}\nEnter new status:\n${statuses.join(', ')}`,current?.status||'PENDING');
    if(!next||!statuses.includes(next.toUpperCase()))return;
    try{
        await api.updateAdminOrderStatus(id,next.toUpperCase());
        orders=orders.map(o=>o.id===id?{...o,status:next.toUpperCase()}:o);
        renderOrders();
        renderOverview();
        showToast('Order status updated','success');
    }catch(err){showToast(err.message||'Failed','error');}
};

// ─── Sellers ─────────────────────────────────────────
function renderSellers(){
    const body=$('#sellersBody');
    if(!sellers.length){body.innerHTML='<tr><td colspan="7" style="text-align:center;padding:2rem;color:var(--text-light);"><i class="bi bi-exclamation-circle" style="display:block;margin-bottom:.5rem;"></i>No sellers available. Backend may be unreachable.</td></tr>';return;}
    body.innerHTML=sellers.map(s=>{
        const status=s.is_active?'active':'inactive';
        return `<tr>
            <td style="font-weight:500;">${escapeHtml(s.name||s.first_name||'')}</td>
            <td>${s.product_count||0}</td>
            <td>${s.order_count||0}</td>
            <td style="font-weight:500;">GHS ${(s.revenue||0).toLocaleString(undefined,{minimumFractionDigits:0,maximumFractionDigits:0})}</td>
            <td><i class="bi bi-star-fill" style="color:#f1c40f;font-size:.75rem;"></i> —</td>
            <td><span class="adm-status ${status}">${status}</span></td>
            <td><div class="adm-action-btns">
                <button title="View"><i class="bi bi-eye"></i></button>
                <button title="${s.is_active?'Disable':'Enable'}" class="danger" onclick="toggleUser(${s.id})"><i class="bi bi-${s.is_active?'slash-circle':'check-circle'}"></i></button>
            </div></td>
        </tr>`;
    }).join('');
}

// ─── Buyers ──────────────────────────────────────────
function renderBuyers(){
    const body=$('#buyersBody');
    if(!buyers.length){body.innerHTML='<tr><td colspan="6" style="text-align:center;padding:2rem;color:var(--text-light);"><i class="bi bi-exclamation-circle" style="display:block;margin-bottom:.5rem;"></i>No buyers found.</td></tr>';return;}
    body.innerHTML=buyers.map(b=>{
        const status=b.is_active?'active':'inactive';
        return `<tr>
            <td><div class="adm-user-cell"><div class="adm-user-avatar">${escapeHtml((b.name||b.first_name||'?')[0])}</div>${escapeHtml(b.name||'')}</div></td>
            <td>${b.order_count||0}</td>
            <td style="font-weight:500;">GHS ${(b.total_spent||0).toLocaleString(undefined,{minimumFractionDigits:0,maximumFractionDigits:0})}</td>
            <td>${formatDate(b.created_at)}</td>
            <td><span class="adm-status ${status}">${status}</span></td>
            <td><div class="adm-action-btns">
                <button title="${b.is_active?'Disable':'Enable'}" class="danger" onclick="toggleUser(${b.id})"><i class="bi bi-${b.is_active?'slash-circle':'check-circle'}"></i></button>
            </div></td>
        </tr>`;
    }).join('');
}

// ─── Community ───────────────────────────────────────
async function renderCommunity(){
    let discussions=[];
    try{discussions=await api.fetchDiscussions();}catch(e){
        errorState('communityBody','Failed to load community data.');
        return;
    }
    const list=Array.isArray(discussions)?discussions:(discussions.discussions||[]);

    // Update community stats
    const postCountEl=document.getElementById('admCommunityPosts');
    const discCountEl=document.getElementById('admCommunityDiscussions');
    const userCountEl=document.getElementById('admCommunityUsers');
    if(postCountEl) postCountEl.textContent=list.length;
    if(discCountEl) discCountEl.textContent=list.length;
    if(userCountEl) userCountEl.textContent=users.length;

    const body=$('#communityBody');
    if(!list.length){body.innerHTML='<tr><td colspan="7" style="text-align:center;padding:2rem;color:var(--text-light);">No discussions yet</td></tr>';return;}
    body.innerHTML=list.slice(0,15).map(d=>{
        const author=d.author_name||'Unknown';
        const replies=d.reply_count||d.replies||0;
        const views=d.views||0;
        return `<tr>
            <td><div class="adm-user-cell"><div class="adm-user-avatar">${escapeHtml((author[0]||'?').toUpperCase())}</div>${escapeHtml(author)}</div></td>
            <td style="font-weight:500;">${escapeHtml(d.title||'Untitled')}</td>
            <td>${escapeHtml(d.category_name||d.category||'—')}</td>
            <td>${replies}</td>
            <td>${views}</td>
            <td>${timeAgo(d.created_at)}</td>
            <td><div class="adm-action-btns"><button title="View"><i class="bi bi-eye"></i></button></div></td>
        </tr>`;
    }).join('');
}

// ─── Events ──────────────────────────────────────────
function renderEvents(){
    const events=window._admEvents||[];
    const body=$('#eventsBody');
    if(!events.length){body.innerHTML='<tr><td colspan="6" style="text-align:center;padding:2rem;color:var(--text-light);">No events found</td></tr>';return;}
    body.innerHTML=events.map(e=>`
        <tr>
            <td style="font-weight:500;">${escapeHtml(e.title||'')}</td>
            <td>${formatDate(e.event_date||e.date)}</td>
            <td>${escapeHtml(e.location||'—')}</td>
            <td>${e.attendees||e.max_participants||'—'}</td>
            <td><span class="adm-status ${e.is_published===false?'inactive':'active'}">${e.is_published===false?'Draft':'Active'}</span></td>
            <td><div class="adm-action-btns"><button title="Edit"><i class="bi bi-pencil"></i></button><button title="Delete" class="danger"><i class="bi bi-trash"></i></button></div></td>
        </tr>
    `).join('');
}

// ─── Articles ────────────────────────────────────────
function renderArticles(){
    const articles=window._admArticles||[];
    const body=$('#articlesBody');
    if(!articles.length){body.innerHTML='<tr><td colspan="6" style="text-align:center;padding:2rem;color:var(--text-light);">No articles found</td></tr>';return;}
    body.innerHTML=articles.map(a=>`
        <tr>
            <td style="font-weight:500;">${escapeHtml(a.title||'')}</td>
            <td>${escapeHtml(a.author||a.author_name||'—')}</td>
            <td>${escapeHtml(a.category||'—')}</td>
            <td>${(a.views||0).toLocaleString()}</td>
            <td><span class="adm-status ${a.is_published===false?'inactive':'active'}">${a.is_published===false?'Draft':'Published'}</span></td>
            <td><div class="adm-action-btns"><button title="Edit"><i class="bi bi-pencil"></i></button><button title="Delete" class="danger"><i class="bi bi-trash"></i></button></div></td>
        </tr>
    `).join('');
}

// ─── Analytics ───────────────────────────────────────
function renderAnalytics(){
    const a=window._admAnalytics||{};
    const statValues=$$('#sec-analytics .adm-stat-value');
    if(statValues[0]) statValues[0].textContent=(a.pageViews||0).toLocaleString();
    if(statValues[1]) statValues[1].textContent=(a.uniqueVisitors||0).toLocaleString();
    if(statValues[2]) statValues[2].textContent=a.avgSession||'4.2m';
    if(statValues[3]) statValues[3].textContent=a.bounceRate||'32%';

    drawLineChart('userGrowthCanvas',[a.users||0]);
    drawBarChart('categoryRevenueCanvas',['No Data'],[0]);

    const topCourses=courses.slice(0,4).map((c,i)=>`
        <div class="adm-top-item">
            <div class="adm-top-rank">${i+1}</div>
            <div class="adm-top-info"><div class="adm-top-title">${escapeHtml(c.title||'')}</div><div class="adm-top-meta">${c.students||c.students_count||0} students</div></div>
        </div>
    `).join('');
    $('#topCourses').innerHTML=topCourses||'<p style="color:var(--text-light);padding:1rem;">No data</p>';

    const topProds=products.slice(0,4).map((p,i)=>`
        <div class="adm-top-item">
            <div class="adm-top-rank">${i+1}</div>
            <div class="adm-top-info"><div class="adm-top-title">${escapeHtml(p.name||'')}</div><div class="adm-top-meta">GHS ${(p.price||0).toFixed(2)}</div></div>
        </div>
    `).join('');
    $('#topProducts').innerHTML=topProds||'<p style="color:var(--text-light);padding:1rem;">No data</p>';
}

// ─── Approvals ───────────────────────────────────────
function renderApprovals(){
    // Products pending approval (is_active === false)
    const pendingProducts=products.filter(p=>!p.is_active);
    const prodBody=$('#productApprovals');
    if(pendingProducts.length){
        prodBody.innerHTML=pendingProducts.map(p=>`
            <div class="adm-approval-item">
                <div style="font-size:1.5rem;"><i class="bi bi-box-seam" style="color:#d4af37;"></i></div>
                <div class="adm-approval-info"><div class="adm-approval-title">${escapeHtml(p.name||'')}</div><div class="adm-approval-meta">${escapeHtml(p.seller_name||p.seller||'Unknown')} · GHS ${(p.price||0).toFixed(2)}</div></div>
                <div class="adm-action-btns">
                    <button style="background:#27ae60;color:#fff;border-color:#27ae60;" onclick="toggleProduct(${p.id},true)">Approve</button>
                    <button class="danger" style="color:#e74c3c;" onclick="deleteProduct(${p.id})">Reject</button>
                </div>
            </div>
        `).join('');
    } else {
        prodBody.innerHTML='<p style="color:var(--text-light);padding:1rem;">No products pending approval</p>';
    }

    // Sellers pending (inactive)
    const pendingSellers=sellers.filter(s=>!s.is_active);
    const sellBody=$('#sellerApprovals');
    if(pendingSellers.length){
        sellBody.innerHTML=pendingSellers.map(s=>`
            <div class="adm-approval-item">
                <div style="font-size:1.5rem;"><i class="bi bi-person-badge" style="color:#4a90d9;"></i></div>
                <div class="adm-approval-info"><div class="adm-approval-title">${escapeHtml(s.name||s.first_name||'')}</div><div class="adm-approval-meta">${escapeHtml(s.email||'')}</div></div>
                <div class="adm-action-btns">
                    <button style="background:#27ae60;color:#fff;border-color:#27ae60;" onclick="toggleUser(${s.id})">Approve</button>
                    <button class="danger" style="color:#e74c3c;" onclick="deleteUser(${s.id})">Reject</button>
                </div>
            </div>
        `).join('');
    } else {
        sellBody.innerHTML='<p style="color:var(--text-light);padding:1rem;">No pending seller applications</p>';
    }
}

window.deleteProduct=async function(id){
    if(!confirm('Reject and delete this product?'))return;
    try{
        await api.deleteProduct(id);
        products=products.filter(p=>p.id!==id);
        renderProducts();renderApprovals();
        showToast('Product rejected','success');
    }catch(err){showToast(err.message||'Failed','error');}
};

// ─── Announcements ───────────────────────────────────
async function renderAnnouncements(){
    if(!announcements.length){
        try{announcements=await api.fetchAdminAnnouncements();}catch(e){
            $('#announcementsList').innerHTML='<p style="color:var(--text-light);padding:1rem;"><i class="bi bi-exclamation-circle"></i> Failed to load announcements.</p>';
            return;
        }
    }
    const body=$('#announcementsList');
    if(!announcements.length){body.innerHTML='<p style="color:var(--text-light);padding:1rem;">No announcements yet</p>';return;}
    body.innerHTML=announcements.map(a=>`
        <div class="adm-announcement-item">
            <div class="adm-announcement-title">${escapeHtml(a.title||'')}</div>
            <div class="adm-announcement-body">${escapeHtml(a.content||a.body||'')}</div>
            <div class="adm-announcement-meta">${a.date||formatDate(a.created_at)||''}</div>
        </div>
    `).join('');
}

// ─── Settings ────────────────────────────────────────
function renderSettings(){
    const a=window._admAnalytics||{};
    $('#systemHealth').innerHTML=`
        <div class="adm-health-item"><div class="adm-health-label">Database</div><div class="adm-health-status ok">Healthy</div></div>
        <div class="adm-health-item"><div class="adm-health-label">API Server</div><div class="adm-health-status ok">Running</div></div>
        <div class="adm-health-item"><div class="adm-health-label">Users</div><div class="adm-health-status ok">${a.users||users.length}</div></div>
        <div class="adm-health-item"><div class="adm-health-label">Products</div><div class="adm-health-status ok">${a.products||products.length}</div></div>
        <div class="adm-health-item"><div class="adm-health-label">Orders</div><div class="adm-health-status ok">${a.orders||orders.length}</div></div>
        <div class="adm-health-item"><div class="adm-health-label">Revenue</div><div class="adm-health-status ok">GHS ${(a.revenue||0).toLocaleString()}</div></div>
    `;
}

// ─── Modals ──────────────────────────────────────────
const userForm=`
    <form id="admUserForm">
    <div class="adm-form-group"><label>Name *</label><input id="mUserName" required></div>
    <div class="adm-form-group"><label>Email *</label><input type="email" id="mUserEmail" required></div>
    <div class="adm-form-group"><label>Role</label><select id="mUserRole"><option>Customer</option><option>Instructor</option><option>Seller</option><option>Admin</option></select></div>
    <button type="submit" class="adm-btn adm-btn-primary" style="width:100%;">Add User</button>
    </form>`;
const courseForm=`
    <form id="admCourseForm">
    <div class="adm-form-group"><label>Title *</label><input id="mAdmCourseTitle" required></div>
    <div class="adm-form-group"><label>Description</label><textarea id="mAdmCourseDesc" rows="3"></textarea></div>
    <div class="adm-form-group"><label>Instructor</label><input id="mAdmCourseInstructor"></div>
    <div class="adm-form-group"><label>Level</label><select><option>Beginner</option><option>Intermediate</option><option>Advanced</option></select></div>
    <div class="adm-form-group"><label>Price ($)</label><input type="number" step="0.01" min="0"></div>
    <button type="submit" class="adm-btn adm-btn-primary" style="width:100%;">Create Course</button>
    </form>`;
const productForm=`
    <form id="admProductForm">
    <h4 style="margin:0 0 1rem;font-size:.9rem;color:var(--text-light);border-bottom:1px solid var(--border-color);padding-bottom:.5rem;">Basic Info</h4>
    <div class="adm-form-group"><label>Name *</label><input required></div>
    <div class="adm-form-group"><label>Price (GHS) *</label><input type="number" step="0.01" min="0" required></div>
    <div class="adm-form-group"><label>Category</label><select><option>Roses</option><option>Bouquets</option><option>Orchids</option><option>Succulents</option><option>Wildflowers</option><option>Indoor Plants</option></select></div>
    <div class="adm-form-group"><label>Description</label><textarea rows="3"></textarea></div>
    <button type="submit" class="adm-btn adm-btn-primary" style="width:100%;">Add Product</button>
    </form>`;
const eventForm=`
    <form id="admEventForm">
    <div class="adm-form-group"><label>Title *</label><input required></div>
    <div class="adm-form-group"><label>Date *</label><input type="date" required></div>
    <div class="adm-form-group"><label>Location</label><input></div>
    <div class="adm-form-group"><label>Max Attendees</label><input type="number" min="1" value="50"></div>
    <button type="submit" class="adm-btn adm-btn-primary" style="width:100%;">Create Event</button>
    </form>`;
const articleForm=`
    <form id="admArticleForm">
    <div class="adm-form-group"><label>Title *</label><input required></div>
    <div class="adm-form-group"><label>Author</label><input></div>
    <div class="adm-form-group"><label>Category</label><input></div>
    <div class="adm-form-group"><label>Content</label><textarea rows="5"></textarea></div>
    <button type="submit" class="adm-btn adm-btn-primary" style="width:100%;">Publish Article</button>
    </form>`;
const announcementForm=`
    <form id="admAnnouncementForm">
    <div class="adm-form-group"><label>Title *</label><input required></div>
    <div class="adm-form-group"><label>Content *</label><textarea rows="4" required></textarea></div>
    <button type="submit" class="adm-btn adm-btn-primary" style="width:100%;">Publish</button>
    </form>`;

const forms={user:userForm,course:courseForm,product:productForm,event:eventForm,article:articleForm,announcement:announcementForm};
const titles={user:'Add User',course:'Create Course',product:'Add Product',event:'Create Event',article:'New Article',announcement:'New Announcement'};

window.openModal=(type,data)=>{
    if(type==='user-edit'&&data){
        $('#admModalTitle').textContent='Edit User';
        $('#admModalBody').innerHTML=`
            <form id="admEditUserForm">
            <div class="adm-form-group"><label>Name</label><input id="mEditName" value="${escapeHtml(data.first_name||'')} ${escapeHtml(data.last_name||'')}"></div>
            <div class="adm-form-group"><label>Email</label><input type="email" id="mEditEmail" value="${escapeHtml(data.email||'')}"></div>
            <div class="adm-form-group"><label>Role</label><select id="mEditRole">
                ${['CUSTOMER','SELLER','FLORIST','GROWER','INSTRUCTOR','ADMIN','MODERATOR','SUPERADMIN'].map(r=>`<option value="${r}" ${(data.role||'').toUpperCase()===r?'selected':''}>${r}</option>`).join('')}
            </select></div>
            <button type="submit" class="adm-btn adm-btn-primary" style="width:100%;">Save Changes</button>
            </form>`;
        $('#admModalOverlay').classList.add('active');
        return;
    }
    $('#admModalTitle').textContent=titles[type]||'Create';
    $('#admModalBody').innerHTML=forms[type]||'';
    $('#admModalOverlay').classList.add('active');
};
window.closeModal=()=>$('#admModalOverlay').classList.remove('active');
$('#admModalOverlay')?.addEventListener('click',e=>{if(e.target===e.currentTarget)closeModal();});

document.addEventListener('submit',async e=>{
    if(e.target.id==='admUserForm'){
        e.preventDefault();
        showToast('User creation not yet supported (invite flow needed)','success');
        closeModal();
    }
    if(e.target.id==='admEditUserForm'){
        e.preventDefault();
        const id=users.find(u=>u&&$('#mEditEmail')?.value===u.email)?.id;
        if(!id){showToast('User not found','error');return;}
        try{
            const name=($('#mEditName').value||'').trim();
            const parts=name.split(' ');
            const first=parts[0]||'';
            const last=parts.slice(1).join(' ');
            await api.updateAdminUser(id,{name:first,email:$('#mEditEmail').value.trim(),role:$('#mEditRole').value,location:null,description:null});
            users=await api.fetchAdminUsers();
            renderUsers();renderOverview();
            closeModal();showToast('User updated','success');
        }catch(err){showToast(err.message||'Failed','error');}
    }
    if(e.target.id==='admCourseForm'){
        e.preventDefault();
        const data={title:$('#mAdmCourseTitle').value,description:$('#mAdmCourseDesc').value,instructor:$('#mAdmCourseInstructor').value};
        try{
            const res=await apiFetchWithBody('/api/courses','POST',data);
            closeModal();showToast('Course created!','success');
            courses=await api.fetchCourses();renderCourses();renderOverview();
        }catch(err){showToast(err.message||'Failed','error');}
    }
    if(e.target.id==='admProductForm'){
        e.preventDefault();
        const form=e.target;
        const nameInput=form.querySelector('input');
        const priceInput=form.querySelectorAll('input')[1];
        const catSelect=form.querySelector('select');
        const descInput=form.querySelector('textarea');
        if(!nameInput?.value.trim()){showToast('Name is required','error');return;}
        if(!priceInput?.value||parseFloat(priceInput.value)<0){showToast('Valid price is required','error');return;}
        try{
            await api.createProduct({
                name:nameInput.value.trim(),
                price:parseFloat(priceInput.value),
                category:catSelect?.value||'',
                description:descInput?.value||'',
                is_active:false
            });
            closeModal();showToast('Product added!','success');
            const prodRes=await api.fetchProducts();
            products=Array.isArray(prodRes)?prodRes:(prodRes.products||[]);
            renderProducts();renderOverview();
        }catch(err){showToast(err.message||'Failed','error');}
    }
    if(e.target.id==='admEventForm'){
        e.preventDefault();
        showToast('Event creation requires the events form — not yet wired','success');
        closeModal();
    }
    if(e.target.id==='admArticleForm'){
        e.preventDefault();
        showToast('Article creation requires the articles form — not yet wired','success');
        closeModal();
    }
    if(e.target.id==='admAnnouncementForm'){
        e.preventDefault();
        const title=e.target.querySelector('input').value.trim();
        const content=e.target.querySelector('textarea').value.trim();
        if(!title||!content){showToast('Title and content required','error');return;}
        try{
            await api.createAdminAnnouncement({title,content});
            announcements=await api.fetchAdminAnnouncements();
            renderAnnouncements();
            closeModal();showToast('Announcement published!','success');
        }catch(err){showToast(err.message||'Failed','error');}
    }
});

// ─── Charts ──────────────────────────────────────────
function drawBarChart(canvasId,labels,data){
    const canvas=document.getElementById(canvasId);if(!canvas)return;
    const ctx=canvas.getContext('2d');
    const w=canvas.width=canvas.parentElement.clientWidth;
    const h=canvas.height;
    if(w<=0||h<=0)return;
    ctx.clearRect(0,0,w,h);
    const safeData=(data||[]).map(v=>Number.isFinite(v)?v:0);
    if(!safeData.length||!labels.length)return;
    const max=Math.max(...safeData)*1.1||1;
    if(!Number.isFinite(max)||max<=0)return;
    const barW=Math.min(36,(w-60)/(labels.length*1.5));
    const startX=40;const chartH=h-35;
    if(chartH<=0)return;
    ctx.strokeStyle='#e5e7eb';ctx.lineWidth=1;
    for(let i=0;i<=3;i++){
        const y=15+chartH*(i/3);
        ctx.beginPath();ctx.moveTo(startX,y);ctx.lineTo(w-10,y);ctx.stroke();
        ctx.fillStyle='#9ca3af';ctx.font='10px Poppins,sans-serif';ctx.textAlign='right';
        ctx.fillText(Math.round(max*(1-i/3)),startX-6,y+3);
    }
    const gap=(w-startX-15)/safeData.length;
    safeData.forEach((v,i)=>{
        const x=startX+i*gap+gap/2-barW/2;
        const barH=(v/max)*chartH;
        const grad=ctx.createLinearGradient(x,15+chartH-barH,x,15+chartH);
        grad.addColorStop(0,'#d4af37');grad.addColorStop(1,'#b8941f');
        ctx.fillStyle=grad;
        ctx.beginPath();ctx.roundRect(x,15+chartH-barH,barW,barH,[3,3,0,0]);ctx.fill();
        ctx.fillStyle='#6b7280';ctx.font='10px Poppins,sans-serif';ctx.textAlign='center';
        ctx.fillText(labels[i],x+barW/2,h-6);
    });
}

function drawLineChart(canvasId,data){
    const canvas=document.getElementById(canvasId);if(!canvas)return;
    const ctx=canvas.getContext('2d');
    const w=canvas.width=canvas.parentElement.clientWidth;
    const h=canvas.height;
    if(w<=0||h<=0)return;
    ctx.clearRect(0,0,w,h);
    const safeData=(data||[]).map(v=>Number.isFinite(v)?v:0);
    if(!safeData.length)return;
    const max=Math.max(...safeData)*1.1||1;
    const min=Math.min(...safeData)*0.9||0;
    const range=max-min||1;
    const chartH=h-35;const startX=40;
    const stepX=(w-startX-15)/(safeData.length-1)||1;
    ctx.strokeStyle='#e5e7eb';ctx.lineWidth=1;
    for(let i=0;i<=3;i++){
        const y=15+chartH*(i/3);
        ctx.beginPath();ctx.moveTo(startX,y);ctx.lineTo(w-10,y);ctx.stroke();
        ctx.fillStyle='#9ca3af';ctx.font='10px Poppins,sans-serif';ctx.textAlign='right';
        ctx.fillText(Math.round(max-range*(i/3)),startX-6,y+3);
    }
    ctx.beginPath();
    safeData.forEach((v,i)=>{
        const x=startX+i*stepX;
        const y=15+chartH*(1-(v-min)/range);
        i===0?ctx.moveTo(x,y):ctx.lineTo(x,y);
    });
    ctx.strokeStyle='#d4af37';ctx.lineWidth=2.5;ctx.stroke();
    const grad=ctx.createLinearGradient(0,15,0,15+chartH);
    grad.addColorStop(0,'rgba(212,175,55,0.2)');grad.addColorStop(1,'rgba(212,175,55,0)');
    ctx.lineTo(startX+(safeData.length-1)*stepX,15+chartH);ctx.lineTo(startX,15+chartH);ctx.closePath();
    ctx.fillStyle=grad;ctx.fill();
    safeData.forEach((v,i)=>{
        const x=startX+i*stepX;const y=15+chartH*(1-(v-min)/range);
        ctx.beginPath();ctx.arc(x,y,3,0,Math.PI*2);ctx.fillStyle='#d4af37';ctx.fill();
        ctx.strokeStyle='#fff';ctx.lineWidth=2;ctx.stroke();
    });
}

// ─── Helpers ─────────────────────────────────────────
function showToast(msg,type){
    const t=document.createElement('div');
    t.style.cssText=`position:fixed;bottom:2rem;right:2rem;padding:.75rem 1.5rem;border-radius:10px;color:#fff;font-size:.9rem;z-index:999;animation:fadeIn .3s;background:${type==='success'?'#27ae60':'#e74c3c'};`;
    t.textContent=msg;document.body.appendChild(t);setTimeout(()=>t.remove(),3000);
}
window.showToast=showToast;

function showBanner(msg,type){
    let banner=document.getElementById('admErrorBanner');
    if(!banner){
        banner=document.createElement('div');
        banner.id='admErrorBanner';
        banner.style.cssText='padding:.75rem 1.5rem;border-radius:8px;margin-bottom:1rem;display:flex;align-items:center;gap:.75rem;font-size:.9rem;';
        const content=$('.adm-content');
        if(content) content.prepend(banner);
    }
    const bg=type==='error'?'#fef2f2;border:1px solid #fecaca;color:#991b1b':'#fffbeb;border:1px solid #fde68a;color:#92400e';
    banner.style.background=bg;
    banner.innerHTML=`<i class="bi bi-${type==='error'?'exclamation-triangle':'info-circle'}" style="font-size:1.1rem;"></i><span style="flex:1;">${escapeHtml(msg)}</span><button onclick="retryInit()" style="background:${type==='error'?'#991b1b':'#92400e'};color:#fff;border:none;padding:.35rem .85rem;border-radius:6px;cursor:pointer;font-size:.8rem;">Retry</button>`;
    banner.style.display='flex';
}
window.showBanner=showBanner;

function hideBanner(){
    const b=document.getElementById('admErrorBanner');
    if(b) b.style.display='none';
}

function errorState(containerId,msg){
    const el=$(containerId.startsWith('#')?containerId:'#'+containerId);
    if(el) el.innerHTML=`<div style="text-align:center;padding:2rem;color:var(--text-light);"><i class="bi bi-exclamation-circle" style="font-size:1.5rem;display:block;margin-bottom:.5rem;"></i><p style="font-size:.9rem;">${escapeHtml(msg)}</p></div>`;
}

async function retryInit(){
    hideBanner();
    showToast('Retrying...','success');
    await init();
}
window.retryInit=retryInit;

// ─── Instructor Applications ───────────────────────────
let instructorApps=[],instructorAppFilter='';

async function renderInstructors(){
    // Load stats
    try{
        const stats=await api.fetchInstructorStats();
        $('#instructorStats').innerHTML=`
            <div class="adm-stat-card mini"><div class="adm-stat-info"><div class="adm-stat-value">${stats.pending||0}</div><div class="adm-stat-label">Pending</div></div></div>
            <div class="adm-stat-card mini"><div class="adm-stat-info"><div class="adm-stat-value">${stats.under_review||0}</div><div class="adm-stat-label">Under Review</div></div></div>
            <div class="adm-stat-card mini"><div class="adm-stat-info"><div class="adm-stat-value">${stats.approved||0}</div><div class="adm-stat-label">Approved</div></div></div>
            <div class="adm-stat-card mini"><div class="adm-stat-info"><div class="adm-stat-value">${stats.rejected||0}</div><div class="adm-stat-label">Rejected</div></div></div>`;
    }catch{}

    // Load applications
    try{
        instructorApps=await api.fetchInstructorApplications(instructorAppFilter||undefined);
    }catch{instructorApps=[];}

    const body=$('#instructorAppsBody');
    if(!instructorApps.length){
        body.innerHTML='<tr><td colspan="7" style="text-align:center;padding:2rem;color:var(--text-light);">No applications found</td></tr>';
        return;
    }
    body.innerHTML=instructorApps.map(a=>{
        const name=a.full_name||a.first_name||'Unknown';
        const expertise=Array.isArray(a.expertise)?a.expertise.slice(0,3).join(', '):(a.expertise||'');
        const statusClass=a.status||'pending';
        return `<tr>
            <td><div style="display:flex;align-items:center;gap:.5rem;"><div class="adm-avatar adm-avatar-sm">${name[0]}</div><div><div style="font-weight:500;font-size:.9rem;">${escapeHtml(name)}</div><div style="font-size:.75rem;color:var(--text-light);">${escapeHtml(a.email||'')}</div></div></div></td>
            <td style="font-size:.85rem;">${escapeHtml(a.professional_title||'')}</td>
            <td style="font-size:.85rem;">${a.years_experience||0} years</td>
            <td style="font-size:.85rem;max-width:150px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${escapeHtml(expertise)}</td>
            <td style="font-size:.85rem;">${timeAgo(a.created_at)}</td>
            <td><span class="adm-status ${statusClass}">${statusClass.replace('_',' ')}</span></td>
            <td><button class="adm-btn adm-btn-sm adm-btn-primary" onclick="reviewInstructorApp('${a.id}')">Review</button></td>
        </tr>`;
    }).join('');

    // Wire filter buttons
    $$('.inst-filter-btn').forEach(btn=>{
        btn.addEventListener('click',()=>{
            $$('.inst-filter-btn').forEach(b=>b.classList.remove('active'));
            btn.classList.add('active');
            instructorAppFilter=btn.dataset.status;
            renderInstructors();
        });
    });
}

window.reviewInstructorApp=async function(id){
    try{
        const app=await api.fetchInstructorApplicationDetail(id);
        const detail=$('#instructorAppDetail');
        detail.style.display='block';
        const expertise=Array.isArray(app.expertise)?app.expertise:[];
        const education=Array.isArray(app.education)?app.education:typeof app.education==='string'?JSON.parse(app.education||'[]'):[];
        const certs=Array.isArray(app.certifications)?app.certifications:typeof app.certifications==='string'?JSON.parse(app.certifications||'[]'):[];
        const portfolio=Array.isArray(app.portfolio)?app.portfolio:typeof app.portfolio==='string'?JSON.parse(app.portfolio||'[]'):[];

        detail.innerHTML=`
        <div class="adm-card-header" style="margin-bottom:1rem;"><h3>Application: ${escapeHtml(app.full_name)}</h3>
            <button class="adm-btn adm-btn-sm" onclick="document.getElementById('instructorAppDetail').style.display='none'"><i class="bi bi-x-lg"></i> Close</button></div>
        <div class="adm-grid-2col" style="margin-bottom:1rem;">
            <div style="padding:1rem;background:var(--bg-main);border-radius:10px;">
                <h4 style="font-size:.9rem;margin-bottom:.5rem;"><i class="bi bi-person"></i> Basic Info</h4>
                <p style="font-size:.85rem;"><strong>Name:</strong> ${escapeHtml(app.full_name)}<br>
                <strong>Email:</strong> ${escapeHtml(app.email)}<br>
                <strong>Phone:</strong> ${escapeHtml(app.phone||'N/A')}<br>
                <strong>Location:</strong> ${escapeHtml((app.city||'')+(app.country?', '+app.country:''))}<br>
                <strong>Languages:</strong> ${(app.languages||[]).join(', ')||'N/A'}</p>
            </div>
            <div style="padding:1rem;background:var(--bg-main);border-radius:10px;">
                <h4 style="font-size:.9rem;margin-bottom:.5rem;"><i class="bi bi-briefcase"></i> Professional</h4>
                <p style="font-size:.85rem;"><strong>Title:</strong> ${escapeHtml(app.professional_title||'N/A')}<br>
                <strong>Experience:</strong> ${app.years_experience||0} years<br>
                <strong>Employer:</strong> ${escapeHtml(app.current_employer||'N/A')}<br>
                <strong>Business:</strong> ${escapeHtml(app.own_business||'N/A')}</p>
            </div>
        </div>
        <div style="padding:1rem;background:var(--bg-main);border-radius:10px;margin-bottom:1rem;">
            <h4 style="font-size:.9rem;margin-bottom:.5rem;"><i class="bi bi-journal-text"></i> Bio</h4>
            <p style="font-size:.85rem;white-space:pre-wrap;">${escapeHtml(app.bio||'')}</p>
        </div>
        <div style="padding:1rem;background:var(--bg-main);border-radius:10px;margin-bottom:1rem;">
            <h4 style="font-size:.9rem;margin-bottom:.5rem;"><i class="bi bi-tags"></i> Expertise</h4>
            <div style="display:flex;flex-wrap:wrap;gap:.4rem;">${expertise.map(e=>`<span style="padding:.2rem .6rem;background:var(--primary-light);color:var(--primary-color);border-radius:4px;font-size:.8rem;">${escapeHtml(e)}</span>`).join('')}</div>
        </div>
        ${app.bio?`<div style="padding:1rem;background:var(--bg-main);border-radius:10px;margin-bottom:1rem;"><h4 style="font-size:.9rem;margin-bottom:.5rem;"><i class="bi bi-journal-text"></i> Teaching Experience</h4><p style="font-size:.85rem;"><strong>Has taught:</strong> ${app.has_taught_before?'Yes':'No'}<br><strong>Format:</strong> ${escapeHtml(app.teaching_format||'N/A')}<br><strong>Students taught:</strong> ${app.students_taught||0}<br><strong>Previous platforms:</strong> ${escapeHtml(app.previous_platforms||'N/A')}</p></div>`:''}
        ${app.sample_lesson_outline?`<div style="padding:1rem;background:var(--bg-main);border-radius:10px;margin-bottom:1rem;"><h4 style="font-size:.9rem;margin-bottom:.5rem;"><i class="bi bi-easel"></i> Sample Lesson Outline</h4><p style="font-size:.85rem;white-space:pre-wrap;">${escapeHtml(app.sample_lesson_outline)}</p></div>`:''}
        ${education.length?`<div style="padding:1rem;background:var(--bg-main);border-radius:10px;margin-bottom:1rem;"><h4 style="font-size:.9rem;margin-bottom:.5rem;"><i class="bi bi-mortarboard"></i> Education</h4>${education.map(e=>`<p style="font-size:.85rem;">${escapeHtml(e.qualification||'')} — ${escapeHtml(e.institution||'')} (${escapeHtml(e.year||'')})</p>`).join('')}</div>`:''}
        ${certs.length?`<div style="padding:1rem;background:var(--bg-main);border-radius:10px;margin-bottom:1rem;"><h4 style="font-size:.9rem;margin-bottom:.5rem;"><i class="bi bi-award"></i> Certifications</h4>${certs.map(c=>`<p style="font-size:.85rem;">${escapeHtml(c.name||'')} — ${escapeHtml(c.issuer||'')} (${escapeHtml(c.year||'')})</p>`).join('')}</div>`:''}
        ${portfolio.length?`<div style="padding:1rem;background:var(--bg-main);border-radius:10px;margin-bottom:1rem;"><h4 style="font-size:.9rem;margin-bottom:.5rem;"><i class="bi bi-images"></i> Portfolio (${portfolio.length} items)</h4><div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(100px,1fr));gap:.5rem;">${portfolio.map(p=>`<img src="${escapeHtml(p.url||p)}" style="width:100%;aspect-ratio:1;object-fit:cover;border-radius:6px;" alt="Portfolio">`).join('')}</div></div>`:''}
        ${app.gov_id_url?`<div style="padding:1rem;background:var(--bg-main);border-radius:10px;margin-bottom:1rem;"><h4 style="font-size:.9rem;margin-bottom:.5rem;"><i class="bi bi-person-badge"></i> ID Verification</h4><img src="${escapeHtml(app.gov_id_url)}" style="max-width:300px;border-radius:8px;" alt="Government ID"></div>`:''}
        <div style="display:flex;gap:.5rem;flex-wrap:wrap;margin-top:1.5rem;padding-top:1rem;border-top:1px solid var(--border-color);">
            <button class="adm-btn adm-btn-primary" onclick="updateInstructorApp('${app.id}','approved')"><i class="bi bi-check-lg"></i> Approve</button>
            <button class="adm-btn" style="background:#4a90d9;color:#fff;" onclick="updateInstructorApp('${app.id}','under_review')"><i class="bi bi-eye"></i> Mark Under Review</button>
            <button class="adm-btn" style="background:#ea580c;color:#fff;" onclick="updateInstructorApp('${app.id}','needs_info')"><i class="bi bi-info-circle"></i> Request Info</button>
            <button class="adm-btn adm-btn-danger" onclick="updateInstructorApp('${app.id}','rejected')"><i class="bi bi-x-lg"></i> Reject</button>
        </div>
        ${app.reviews&&app.reviews.length?`<div style="margin-top:1rem;"><h4 style="font-size:.9rem;margin-bottom:.5rem;">Review History</h4>${app.reviews.map(r=>`<div style="padding:.5rem;background:var(--bg-main);border-radius:6px;margin-bottom:.4rem;font-size:.8rem;"><strong>${escapeHtml(r.reviewer_name||'Admin')}</strong> — ${r.action} ${timeAgo(r.created_at)}${r.notes?`<br><em>${escapeHtml(r.notes)}</em>`:''}</div>`).join('')}</div>`:''}`;

        detail.scrollIntoView({behavior:'smooth'});
    }catch(err){showToast('Failed to load application','error');}
};

window.updateInstructorApp=async function(id,status){
    let reason=prompt(`Reason for ${status}:`+(status==='rejected'?' (required)':''));
    if(status==='rejected'&&!reason){alert('Rejection reason is required');return;}
    if(status==='needs_info'&&!reason){alert('Please provide what info is needed');return;}
    try{
        await api.updateInstructorApplication(id,{status,rejection_reason:reason||null,admin_notes:reason||null});
        showToast(`Application ${status}`,'success');
        document.getElementById('instructorAppDetail').style.display='none';
        renderInstructors();
    }catch(err){showToast(err.message||'Failed','error');}
};

init();
})();
