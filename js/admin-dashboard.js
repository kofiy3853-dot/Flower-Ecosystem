// Admin Dashboard
(function(){
const $=s=>document.querySelector(s);
const $$=s=>document.querySelectorAll(s);
let courses=[],products=[],users=[];

// ─── Navigation ──────────────────────────────────────
function switchSection(name){
    $$('.adm-nav-item').forEach(n=>n.classList.toggle('active',n.dataset.section===name));
    $$('.adm-section').forEach(s=>s.classList.toggle('active',s.id==='sec-'+name));
    if(name==='users') renderUsers();
    if(name==='courses') renderCourses();
    if(name==='marketplace') renderProducts();
    if(name==='orders') renderOrders();
    if(name==='sellers') renderSellers();
    if(name==='community') renderCommunity();
    if(name==='events') renderEvents();
    if(name==='articles') renderArticles();
    if(name==='analytics') renderAnalytics();
    if(name==='approvals') renderApprovals();
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

const notifications=[
    {icon:'bi-person-plus',text:'15 new users registered today',time:'10 min ago',color:'#5a7a60'},
    {icon:'bi-bag-check',text:'New order #ORD-156 — GHS 245',time:'25 min ago',color:'#d4af37'},
    {icon:'bi-exclamation-triangle',text:'3 products flagged for review',time:'1 hr ago',color:'#e74c3c'},
    {icon:'bi-person-badge',text:'2 new seller applications',time:'2 hrs ago',color:'#4a90d9'},
    {icon:'bi-chat-dots',text:'5 new community posts',time:'3 hrs ago',color:'#5a7a60'},
    {icon:'bi-book',text:'Course "Floral Business" reached 100 students',time:'5 hrs ago',color:'#d4af37'},
    {icon:'bi-award',text:'8 certificates issued today',time:'1 day ago',color:'#27ae60'},
    {icon:'bi-shield-check',text:'System backup completed',time:'1 day ago',color:'#4a90d9'}
];

function renderNotifications(){
    $('#admNotifList').innerHTML=notifications.map(n=>`
        <div class="adm-notif-item">
            <div class="adm-notif-icon" style="background:${n.color}15;color:${n.color};"><i class="bi ${n.icon}"></i></div>
            <div><div>${n.text}</div><div style="font-size:.7rem;color:var(--text-light);margin-top:.2rem;">${n.time}</div></div>
        </div>
    `).join('');
}

// ─── Init ────────────────────────────────────────────
async function init(){
    try{[courses,products]=await Promise.all([api.fetchCourses(),api.fetchProducts()]);}catch(e){courses=[];products=[];}
    renderOverview();
    renderNotifications();
}

// ─── Overview ────────────────────────────────────────
function renderOverview(){
    // Recent Users
    const recentUsers=[
        {name:'Ama Mensah',role:'Student',time:'2 hrs ago',initial:'A'},
        {name:'Kojo Asante',role:'Student',time:'3 hrs ago',initial:'K'},
        {name:'Dr. Sarah Chen',role:'Instructor',time:'5 hrs ago',initial:'S'},
        {name:'Bloom & Co.',role:'Seller',time:'1 day ago',initial:'B'}
    ];
    $('#recentUsers').innerHTML=recentUsers.map(u=>`
        <div style="display:flex;align-items:center;gap:.75rem;padding:.5rem 0;border-bottom:1px solid var(--border-color);">
            <div class="adm-user-avatar">${u.initial}</div>
            <div style="flex:1;"><div style="font-size:.85rem;font-weight:500;">${u.name}</div><div style="font-size:.7rem;color:var(--text-light);">${u.role}</div></div>
            <div style="font-size:.7rem;color:var(--text-light);">${u.time}</div>
        </div>
    `).join('');

    // Recent Orders
    const recentOrders=[
        {id:'#ORD-156',customer:'Ama M.',total:'GHS 245',status:'pending',time:'25 min ago'},
        {id:'#ORD-155',customer:'Kojo A.',total:'GHS 89',status:'completed',time:'1 hr ago'},
        {id:'#ORD-154',customer:'Abena O.',total:'GHS 156',status:'completed',time:'2 hrs ago'},
        {id:'#ORD-153',customer:'John M.',total:'GHS 312',status:'active',time:'3 hrs ago'}
    ];
    $('#recentOrders').innerHTML=recentOrders.map(o=>`
        <div style="display:flex;align-items:center;gap:.75rem;padding:.5rem 0;border-bottom:1px solid var(--border-color);">
            <div style="font-size:.8rem;font-weight:600;color:#d4af37;min-width:70px;">${o.id}</div>
            <div style="flex:1;"><div style="font-size:.85rem;font-weight:500;">${o.customer}</div><div style="font-size:.7rem;color:var(--text-light);">${o.time}</div></div>
            <div style="font-size:.85rem;font-weight:500;">${o.total}</div>
            <span class="adm-status ${o.status}">${o.status}</span>
        </div>
    `).join('');

    // Charts
    drawBarChart('activityCanvas',['Mon','Tue','Wed','Thu','Fri','Sat','Sun'],[120,185,160,210,245,180,95]);
    drawLineChart('revenueCanvas',[3200,4100,3800,5200,4800,6100,7200]);

    // Pending Actions
    const actions=[
        {icon:'bi-bag-check',text:'15 products awaiting approval'},
        {icon:'bi-person-badge',text:'8 seller applications pending'},
        {icon:'bi-flag',text:'5 reported posts to review'},
        {icon:'bi-journal-check',text:'12 assignment submissions to grade'}
    ];
    $('#pendingActions').innerHTML=actions.map(a=>`
        <div class="adm-action-item"><i class="bi ${a.icon}"></i>${a.text}</div>
    `).join('');
}

// ─── Users ───────────────────────────────────────────
function renderUsers(){
    const names=['Ama Mensah','Kojo Asante','Abena Osei','John Mensah','Grace Addai','Dr. Sarah Chen','David Osei','Sophie Laurent','Amara Sterling','Michael Botwe','Nana Agyei','Fatima Ibrahim'];
    const roles=['Customer','Customer','Customer','Customer','Customer','Instructor','Instructor','Instructor','Seller','Seller','Seller','Customer'];
    const statuses=['active','active','active','active','active','active','active','active','active','active','inactive','active'];
    const joined=['Jun 20','Jun 18','Jun 15','Jun 12','Jun 10','Jun 8','Jun 5','Jun 3','Jun 1','May 28','May 25','May 20'];
    $('#usersBody').innerHTML=names.map((n,i)=>`
        <tr>
            <td><div class="adm-user-cell"><div class="adm-user-avatar">${n[0]}</div>${n}</div></td>
            <td>${n.toLowerCase().replace(/ /g,'.')}@flower.com</td>
            <td><span class="adm-status ${roles[i]==='Instructor'?'completed':roles[i]==='Seller'?'pending':'active'}">${roles[i]}</span></td>
            <td>${joined[i]}</td>
            <td><span class="adm-status ${statuses[i]}">${statuses[i]}</span></td>
            <td><div class="adm-action-btns"><button title="Edit"><i class="bi bi-pencil"></i></button><button title="Disable" class="danger"><i class="bi bi-slash-circle"></i></button></div></td>
        </tr>
    `).join('');
}

// ─── Courses ─────────────────────────────────────────
function renderCourses(){
    $('#coursesBody').innerHTML=courses.map(c=>`
        <tr>
            <td style="font-weight:500;">${c.title}</td>
            <td>${c.instructor||''}</td>
            <td>${c.students||c.students_count||0}</td>
            <td><i class="bi bi-star-fill" style="color:#f1c40f;font-size:.75rem;"></i> ${c.rating||'N/A'}</td>
            <td><span class="adm-status active">Published</span></td>
            <td><div class="adm-action-btns"><button title="Edit"><i class="bi bi-pencil"></i></button><button title="Analytics"><i class="bi bi-bar-chart"></i></button><button title="Delete" class="danger"><i class="bi bi-trash"></i></button></div></td>
        </tr>
    `).join('');
}

// ─── Products ────────────────────────────────────────
function renderProducts(){
    const cats=['Roses','Bouquets','Orchids','Succulents','Wildflowers','Indoor Plants'];
    const sellers=['Bloom & Co.','Golden Petals','Orchid Paradise','Desert Blooms','Provence Fields','Rose Garden'];
    const productNames=['Red Rose Bouquet','Mixed Wildflower Arrangement','Purple Orchid','Succulent Trio','Dried Lavender','Indoor Fern'];
    const prices=[45.99,32.50,59.99,24.99,18.50,28.00];
    const stock=[25,12,8,35,50,20];
    const statuses=['active','active','pending','active','active','inactive'];
    $('#productsBody').innerHTML=productNames.map((p,i)=>`
        <tr>
            <td style="font-weight:500;">${p}</td>
            <td>${sellers[i]}</td>
            <td>GHS ${prices[i].toFixed(2)}</td>
            <td>${stock[i]}</td>
            <td>${cats[i]}</td>
            <td><span class="adm-status ${statuses[i]}">${statuses[i]}</span></td>
            <td><div class="adm-action-btns"><button title="Edit"><i class="bi bi-pencil"></i></button><button title="Remove" class="danger"><i class="bi bi-trash"></i></button></div></td>
        </tr>
    `).join('');
}

// ─── Orders ──────────────────────────────────────────
function renderOrders(){
    const orders=[
        {id:'#ORD-156',customer:'Ama Mensah',products:'Red Rose Bouquet',total:'GHS 245.00',date:'Jun 28',status:'pending'},
        {id:'#ORD-155',customer:'Kojo Asante',products:'Mixed Wildflower Arr.',total:'GHS 89.00',date:'Jun 28',status:'completed'},
        {id:'#ORD-154',customer:'Abena Osei',products:'Orchid + Succulent Set',total:'GHS 156.00',date:'Jun 27',status:'completed'},
        {id:'#ORD-153',customer:'John Mensah',products:'Wedding Bouquet Package',total:'GHS 312.00',date:'Jun 27',status:'active'},
        {id:'#ORD-152',customer:'Grace Addai',products:'Dried Lavender Bundle',total:'GHS 45.00',date:'Jun 26',status:'completed'},
        {id:'#ORD-151',customer:'Michael Botwe',products:'Indoor Plant Trio',total:'GHS 78.00',date:'Jun 25',status:'completed'}
    ];
    $('#ordersBody').innerHTML=orders.map(o=>`
        <tr>
            <td style="font-weight:600;color:#d4af37;">${o.id}</td>
            <td>${o.customer}</td>
            <td>${o.products}</td>
            <td style="font-weight:500;">${o.total}</td>
            <td>${o.date}</td>
            <td><span class="adm-status ${o.status}">${o.status}</span></td>
            <td><div class="adm-action-btns"><button title="View"><i class="bi bi-eye"></i></button><button title="Update"><i class="bi bi-pencil"></i></button></div></td>
        </tr>
    `).join('');
}

// ─── Sellers ─────────────────────────────────────────
function renderSellers(){
    const sellers=[
        {name:'Bloom & Co.',products:45,orders:234,revenue:'GHS 12,450',rating:4.8,status:'active'},
        {name:'Golden Petals Farm',products:32,orders:189,revenue:'GHS 8,920',rating:4.6,status:'active'},
        {name:'Orchid Paradise',products:28,orders:156,revenue:'GHS 7,340',rating:4.7,status:'active'},
        {name:'Desert Blooms',products:15,orders:78,revenue:'GHS 3,200',rating:4.3,status:'active'},
        {name:'Provence Fields',products:22,orders:112,revenue:'GHS 5,670',rating:4.5,status:'pending'},
        {name:'Rose Garden Co.',products:38,orders:201,revenue:'GHS 10,230',rating:4.9,status:'active'}
    ];
    $('#sellersBody').innerHTML=sellers.map(s=>`
        <tr>
            <td style="font-weight:500;">${s.name}</td>
            <td>${s.products}</td>
            <td>${s.orders}</td>
            <td style="font-weight:500;">${s.revenue}</td>
            <td><i class="bi bi-star-fill" style="color:#f1c40f;font-size:.75rem;"></i> ${s.rating}</td>
            <td><span class="adm-status ${s.status}">${s.status}</span></td>
            <td><div class="adm-action-btns"><button title="View"><i class="bi bi-eye"></i></button><button title="Disable" class="danger"><i class="bi bi-slash-circle"></i></button></div></td>
        </tr>
    `).join('');
}

// ─── Community ───────────────────────────────────────
function renderCommunity(){
    const posts=[
        {author:'Ama Mensah',initial:'A',title:'Best flowers for a first-date bouquet?',body:"Looking for romantic but not overwhelming. Budget GHS 50.",time:'2 hrs ago',replies:8},
        {author:'Kojo Asante',initial:'K',title:'My rose garden is getting aphids!',body:'Any organic solutions? I have about 20 bushes.',time:'5 hrs ago',replies:12},
        {author:'Grace Addai',initial:'G',title:'First hand-tied bouquet attempt!',body:'Took 3 attempts but finally got the spiral technique right!',time:'1 day ago',replies:15},
        {author:'Dr. Sarah',initial:'S',title:'Color Theory Workshop — who attended?',body:'Great session yesterday! Share your takeaways below.',time:'2 days ago',replies:23}
    ];
    $('#communityPosts').innerHTML=posts.map(p=>`
        <div class="adm-community-post">
            <div class="adm-community-avatar">${p.initial}</div>
            <div class="adm-community-content">
                <div class="adm-community-title">${p.title}</div>
                <div class="adm-community-body">${p.body}</div>
                <div class="adm-community-meta">${p.author} · ${p.time} · ${p.replies} replies</div>
            </div>
        </div>
    `).join('');
}

// ─── Events ──────────────────────────────────────────
function renderEvents(){
    const events=[
        {title:'Bridal Bouquet Workshop',date:'Jul 15, 2026',location:'Accra Studio',attendees:25,status:'active'},
        {title:'Flower Care Webinar',date:'Jul 20, 2026',location:'Online (Zoom)',attendees:120,status:'active'},
        {title:'Best Bouquet Competition',date:'Aug 5, 2026',location:'Kumasi Center',attendees:50,status:'pending'},
        {title:'Advanced Rose Workshop',date:'Aug 12, 2026',location:'Online (Zoom)',attendees:80,status:'pending'}
    ];
    $('#eventsBody').innerHTML=events.map(e=>`
        <tr>
            <td style="font-weight:500;">${e.title}</td>
            <td>${e.date}</td>
            <td>${e.location}</td>
            <td>${e.attendees}</td>
            <td><span class="adm-status ${e.status}">${e.status}</span></td>
            <td><div class="adm-action-btns"><button title="Edit"><i class="bi bi-pencil"></i></button><button title="Delete" class="danger"><i class="bi bi-trash"></i></button></div></td>
        </tr>
    `).join('');
}

// ─── Articles ────────────────────────────────────────
function renderArticles(){
    const articles=[
        {title:'The Ultimate Rose Care Guide',author:'Flora Williams',category:'Flower Care',views:1245,status:'active'},
        {title:'Seasonal Flower Arrangement Ideas',author:'James Bloom',category:'Arrangement',views:892,status:'active'},
        {title:"Beginner's Guide to Floristry",author:'Sarah Chen',category:'Beginner',views:2103,status:'active'},
        {title:'Wedding Flower Trends 2026',author:'Emma Laurent',category:'Wedding',views:1567,status:'active'},
        {title:'How to Grow Orchids at Home',author:'Amara Singh',category:'Growing',views:987,status:'active'}
    ];
    $('#articlesBody').innerHTML=articles.map(a=>`
        <tr>
            <td style="font-weight:500;">${a.title}</td>
            <td>${a.author}</td>
            <td>${a.category}</td>
            <td>${a.views.toLocaleString()}</td>
            <td><span class="adm-status ${a.status}">Published</span></td>
            <td><div class="adm-action-btns"><button title="Edit"><i class="bi bi-pencil"></i></button><button title="Delete" class="danger"><i class="bi bi-trash"></i></button></div></td>
        </tr>
    `).join('');
}

// ─── Analytics ───────────────────────────────────────
function renderAnalytics(){
    drawLineChart('userGrowthCanvas',[850,920,980,1050,1120,1190,1254]);
    drawBarChart('categoryRevenueCanvas',['Roses','Bouquets','Orchids','Succulents','Plants','Events'],[12400,8900,7300,5200,4100,3800]);

    const topCourses=courses.slice(0,4).map((c,i)=>`
        <div class="adm-top-item">
            <div class="adm-top-rank">${i+1}</div>
            <div class="adm-top-info"><div class="adm-top-title">${c.title}</div><div class="adm-top-meta">${c.students||c.students_count||0} students</div></div>
        </div>
    `).join('');
    $('#topCourses').innerHTML=topCourses;

    const topProducts=['Red Rose Bouquet','Mixed Wildflower Arr.','Purple Orchid','Indoor Fern'].map((p,i)=>`
        <div class="adm-top-item">
            <div class="adm-top-rank">${i+1}</div>
            <div class="adm-top-info"><div class="adm-top-title">${p}</div><div class="adm-top-meta">${[234,189,156,112][i]} sold</div></div>
        </div>
    `).join('');
    $('#topProducts').innerHTML=topProducts;
}

// ─── Approvals ───────────────────────────────────────
function renderApprovals(){
    const productApprovals=[
        {title:'Blue Hydrangea Bouquet',seller:'Bloom & Co.',time:'2 hrs ago'},
        {title:'Bonsai Rose Tree',seller:'Golden Petals',time:'5 hrs ago'},
        {title:'Succulent Gift Box',seller:'Desert Blooms',time:'1 day ago'}
    ];
    $('#productApprovals').innerHTML=productApprovals.map(p=>`
        <div class="adm-approval-item">
            <div style="font-size:1.5rem;"><i class="bi bi-box-seam" style="color:#d4af37;"></i></div>
            <div class="adm-approval-info"><div class="adm-approval-title">${p.title}</div><div class="adm-approval-meta">${p.seller} · ${p.time}</div></div>
            <div class="adm-action-btns"><button style="background:#27ae60;color:#fff;border-color:#27ae60;">Approve</button><button class="danger" style="color:#e74c3c;">Reject</button></div>
        </div>
    `).join('');

    const sellerApprovals=[
        {name:'Floral Dreams Studio',time:'1 day ago'},
        {name:'Petal & Bloom Co.',time:'2 days ago'}
    ];
    $('#sellerApprovals').innerHTML=sellerApprovals.map(s=>`
        <div class="adm-approval-item">
            <div style="font-size:1.5rem;"><i class="bi bi-person-badge" style="color:#4a90d9;"></i></div>
            <div class="adm-approval-info"><div class="adm-approval-title">${s.name}</div><div class="adm-approval-meta">Applied ${s.time}</div></div>
            <div class="adm-action-btns"><button style="background:#27ae60;color:#fff;border-color:#27ae60;">Approve</button><button class="danger" style="color:#e74c3c;">Reject</button></div>
        </div>
    `).join('');
}

// ─── Announcements ───────────────────────────────────
function renderAnnouncements(){
    const items=[
        {title:'Platform Maintenance — June 30',body:'Scheduled maintenance from 2:00 AM to 4:00 AM GMT. Services may be temporarily unavailable.',time:'Jun 28, 2026'},
        {title:'New Feature: Live Classes',body:'Instructors can now schedule and host live video classes directly on the platform.',time:'Jun 25, 2026'},
        {title:'Summer Sale — 20% Off All Courses',body:'Use code SUMMER26 at checkout. Valid until July 15, 2026.',time:'Jun 20, 2026'}
    ];
    $('#announcementsList').innerHTML=items.map(a=>`
        <div class="adm-announcement-item">
            <div class="adm-announcement-title">${a.title}</div>
            <div class="adm-announcement-body">${a.body}</div>
            <div class="adm-announcement-meta">${a.time}</div>
        </div>
    `).join('');
}

// ─── Settings ────────────────────────────────────────
function renderSettings(){
    $('#systemHealth').innerHTML=`
        <div class="adm-health-item"><div class="adm-health-label">Database</div><div class="adm-health-status ok">Healthy</div></div>
        <div class="adm-health-item"><div class="adm-health-label">API Server</div><div class="adm-health-status ok">Running</div></div>
        <div class="adm-health-item"><div class="adm-health-label">Storage</div><div class="adm-health-status ok">2.3 GB / 10 GB</div></div>
        <div class="adm-health-item"><div class="adm-health-label">CPU Usage</div><div class="adm-health-status ok">12%</div></div>
        <div class="adm-health-item"><div class="adm-health-label">Memory</div><div class="adm-health-status warn">68%</div></div>
        <div class="adm-health-item"><div class="adm-health-label">Last Backup</div><div class="adm-health-status ok">2 hrs ago</div></div>
        <div class="adm-health-item"><div class="adm-health-label">SSL Certificate</div><div class="adm-health-status ok">Valid</div></div>
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
    <div class="adm-form-group"><label>Condition</label><select><option>Natural (Fresh)</option><option>Artificial (Silk)</option><option>Preserved</option><option>Dried</option></select></div>
    <div class="adm-form-group"><label>Description</label><textarea rows="3"></textarea></div>
    <h4 style="margin:1rem 0 1rem;font-size:.9rem;color:var(--text-light);border-bottom:1px solid var(--border-color);padding-bottom:.5rem;">Characteristics</h4>
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:.75rem;">
        <div class="adm-form-group"><label>Occasion</label><select><option value="">Select</option><option>Romance</option><option>Wedding</option><option>Birthday</option><option>Sympathy</option><option>Celebration</option><option>Everyday</option></select></div>
        <div class="adm-form-group"><label>Color</label><select><option value="">Select</option><option>Red</option><option>Pink</option><option>White</option><option>Yellow</option><option>Purple</option><option>Orange</option><option>Multi</option></select></div>
        <div class="adm-form-group"><label>Size</label><select><option value="">Select</option><option>Single Stem</option><option>Small (5-10)</option><option>Medium (10-20)</option><option>Large (20-30)</option><option>Extra Large (30+)</option></select></div>
        <div class="adm-form-group"><label>Fragrance</label><select><option value="">Select</option><option>None</option><option>Light</option><option>Medium</option><option>Strong</option></select></div>
        <div class="adm-form-group"><label>Care Level</label><select><option value="">Select</option><option>Easy</option><option>Moderate</option><option>Expert</option></select></div>
        <div class="adm-form-group"><label>Sunlight</label><select><option value="">Select</option><option>Full Sun</option><option>Partial Sun</option><option>Shade</option><option>Indoor</option></select></div>
        <div class="adm-form-group"><label>Watering</label><select><option value="">Select</option><option>Daily</option><option>Every 2-3 days</option><option>Weekly</option><option>Bi-weekly</option><option>Monthly</option></select></div>
        <div class="adm-form-group"><label>Bloom Season</label><select><option value="">Select</option><option>Spring</option><option>Summer</option><option>Fall</option><option>Winter</option><option>Year-Round</option></select></div>
    </div>
    <div class="adm-form-group"><label>Origin</label><input placeholder="e.g. Local farm, Imported"></div>
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

window.openModal=type=>{
    $('#admModalTitle').textContent=titles[type]||'Create';
    $('#admModalBody').innerHTML=forms[type]||'';
    $('#admModalOverlay').classList.add('active');
};
window.closeModal=()=>$('#admModalOverlay').classList.remove('active');
$('#admModalOverlay')?.addEventListener('click',e=>{if(e.target===e.currentTarget)closeModal();});

document.addEventListener('submit',async e=>{
    if(e.target.id==='admUserForm'){
        e.preventDefault();closeModal();showToast('User added!','success');
    }
    if(e.target.id==='admCourseForm'){
        e.preventDefault();
        const data={title:$('#mAdmCourseTitle').value,description:$('#mAdmCourseDesc').value,instructor:$('#mAdmCourseInstructor').value};
        try{
            const token=localStorage.getItem('flower-token');
            const headers={'Content-Type':'application/json'};if(token)headers['Authorization']='Bearer '+token;
            const res=await fetch('/api/courses',{method:'POST',headers,body:JSON.stringify(data)});
            if(!res.ok)throw new Error((await res.json()).error||'Failed');
            closeModal();showToast('Course created!','success');
            courses=await api.fetchCourses();renderCourses();
        }catch(err){showToast(err.message||'Failed','error');}
    }
    if(e.target.id==='admProductForm'){
        e.preventDefault();
        const form=e.target;
        const inputs=form.querySelectorAll('input,select,textarea');
        const errors=[];
        if(!inputs[0]||!inputs[0].value.trim()) errors.push('Name is required');
        if(!inputs[1]||!inputs[1].value||parseFloat(inputs[1].value)<0) errors.push('Valid price is required');
        const catSel=form.querySelector('select');
        if(!catSel||!catSel.value) errors.push('Category is required');
        if(errors.length){showToast(errors.join('. '),'error');return;}
        closeModal();showToast('Product added!','success');
    }
    if(e.target.id==='admEventForm'){e.preventDefault();closeModal();showToast('Event created!','success');}
    if(e.target.id==='admArticleForm'){e.preventDefault();closeModal();showToast('Article published!','success');}
    if(e.target.id==='admAnnouncementForm'){e.preventDefault();closeModal();showToast('Announcement published!','success');}
});

// ─── Charts ──────────────────────────────────────────
function drawBarChart(canvasId,labels,data){
    const canvas=document.getElementById(canvasId);if(!canvas)return;
    const ctx=canvas.getContext('2d');
    const w=canvas.width=canvas.parentElement.clientWidth;
    const h=canvas.height;
    ctx.clearRect(0,0,w,h);
    const max=Math.max(...data)*1.1||1;
    const barW=Math.min(36,(w-60)/(labels.length*1.5));
    const startX=40;const chartH=h-35;
    ctx.strokeStyle='#e5e7eb';ctx.lineWidth=1;
    for(let i=0;i<=3;i++){
        const y=15+chartH*(i/3);
        ctx.beginPath();ctx.moveTo(startX,y);ctx.lineTo(w-10,y);ctx.stroke();
        ctx.fillStyle='#9ca3af';ctx.font='10px Poppins,sans-serif';ctx.textAlign='right';
        ctx.fillText(Math.round(max*(1-i/3)),startX-6,y+3);
    }
    const gap=(w-startX-15)/labels.length;
    data.forEach((v,i)=>{
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
    ctx.clearRect(0,0,w,h);
    const max=Math.max(...data)*1.1;
    const min=Math.min(...data)*0.9;
    const range=max-min||1;
    const chartH=h-35;const startX=40;
    const stepX=(w-startX-15)/(data.length-1);
    ctx.strokeStyle='#e5e7eb';ctx.lineWidth=1;
    for(let i=0;i<=3;i++){
        const y=15+chartH*(i/3);
        ctx.beginPath();ctx.moveTo(startX,y);ctx.lineTo(w-10,y);ctx.stroke();
        ctx.fillStyle='#9ca3af';ctx.font='10px Poppins,sans-serif';ctx.textAlign='right';
        ctx.fillText(Math.round(max-range*(i/3)),startX-6,y+3);
    }
    ctx.beginPath();
    data.forEach((v,i)=>{
        const x=startX+i*stepX;
        const y=15+chartH*(1-(v-min)/range);
        i===0?ctx.moveTo(x,y):ctx.lineTo(x,y);
    });
    ctx.strokeStyle='#d4af37';ctx.lineWidth=2.5;ctx.stroke();
    const grad=ctx.createLinearGradient(0,15,0,15+chartH);
    grad.addColorStop(0,'rgba(212,175,55,0.2)');grad.addColorStop(1,'rgba(212,175,55,0)');
    ctx.lineTo(startX+(data.length-1)*stepX,15+chartH);ctx.lineTo(startX,15+chartH);ctx.closePath();
    ctx.fillStyle=grad;ctx.fill();
    data.forEach((v,i)=>{
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

init();
})();
