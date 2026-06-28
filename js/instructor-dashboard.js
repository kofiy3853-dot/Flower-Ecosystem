// Instructor Dashboard
(function(){
const $ = s => document.querySelector(s);
const $$ = s => document.querySelectorAll(s);

let courses=[], lessons=[], quizzes=[], studentsData=[];
let currentSection = 'overview';
let calDate = new Date();

// ─── Navigation ──────────────────────────────────────
function switchSection(name){
    currentSection = name;
    $$('.inst-nav-item').forEach(n=>n.classList.toggle('active',n.dataset.section===name));
    $$('.inst-section').forEach(s=>s.classList.toggle('active',s.id==='sec-'+name));
    if(name==='courses') renderCourses();
    if(name==='students') renderStudents();
    if(name==='assignments') renderAssignments();
    if(name==='live-classes') renderLiveClasses();
    if(name==='discussions') renderDiscussions();
    if(name==='resources') renderResources();
    if(name==='calendar') renderCalendar();
    if(name==='certificates') renderCertificates();
    if(name==='analytics') renderAnalytics();
}
window.switchSection = switchSection;

$$('.inst-nav-item[data-section]').forEach(n=>n.addEventListener('click',()=>switchSection(n.dataset.section)));
$('#instHamburger')?.addEventListener('click',()=>$('#instSidebar').classList.toggle('open'));
document.addEventListener('click',e=>{
    if(!e.target.closest('.inst-sidebar')&&!e.target.closest('.inst-hamburger')){
        $('#instSidebar').classList.remove('open');
    }
});

// ─── Notifications ───────────────────────────────────
$('#notifBtn')?.addEventListener('click',()=>$('#notifPanel').classList.toggle('open'));
document.addEventListener('click',e=>{
    if(!e.target.closest('.inst-notif-panel')&&!e.target.closest('#notifBtn')){
        $('#notifPanel').classList.remove('open');
    }
});

const notifications=[
    {icon:'bi-person-plus',text:'15 new students enrolled this week',time:'2 min ago',color:'green'},
    {icon:'bi-journal-check',text:'Assignment due tomorrow for Floral Design',time:'1 hr ago',color:'gold'},
    {icon:'bi-trophy',text:'Course reached 100 enrollments!',time:'3 hrs ago',color:'blue'},
    {icon:'bi-chat-dots',text:'New discussion awaiting response',time:'5 hrs ago',color:'green'},
    {icon:'bi-award',text:'3 students earned certificates today',time:'1 day ago',color:'green'}
];

function renderNotifications(){
    $('#notifList').innerHTML=notifications.map(n=>`
        <div class="inst-notif-item">
            <div class="inst-notif-icon" style="background:rgba(${n.color==='green'?'39,174,96':n.color==='gold'?'212,175,55':'74,144,217'},.1);color:${n.color==='green'?'#27ae60':n.color==='gold'?'#d4af37':'#4a90d9'};">
                <i class="bi ${n.icon}"></i>
            </div>
            <div><div>${n.text}</div><div style="font-size:.7rem;color:var(--text-light);margin-top:.2rem;">${n.time}</div></div>
        </div>
    `).join('');
}
window.clearNotifications=()=>{$('#notifPanel').classList.remove('open');};

// ─── Init ────────────────────────────────────────────
async function init(){
    try{
        [courses,lessons,quizzes]=await Promise.all([api.fetchCourses(),api.fetchLessons(),api.fetchQuizzes()]);
    }catch(e){courses=[];lessons=[];quizzes=[];}
    renderOverview();
    renderNotifications();
}

// ─── Overview ────────────────────────────────────────
function renderOverview(){
    const totalStudents=courses.reduce((s,c)=>s+(c.students||c.students_count||0),0);
    const totalCourses=courses.length;
    $$('.inst-stat-value')[0].textContent=totalStudents.toLocaleString();
    $$('.inst-stat-value')[1].textContent=totalCourses;

    // Activity feed
    const activities=[
        {icon:'bi-check-circle-fill',color:'green',text:'<strong>Ama</strong> completed Lesson 4 in Flower Arrangement Basics',time:'5 min ago'},
        {icon:'bi-journal-text',color:'blue',text:'<strong>Sarah</strong> submitted Assignment 2',time:'15 min ago'},
        {icon:'bi-person-plus',color:'gold',text:'<strong>Michael</strong> enrolled in Floral Design',time:'1 hr ago'},
        {icon:'bi-award',color:'green',text:'<strong>Grace</strong> earned a certificate',time:'2 hrs ago'},
        {icon:'bi-chat-dots',color:'blue',text:'<strong>Kojo</strong> replied in Discussion Forum',time:'3 hrs ago'}
    ];
    $('#activityFeed').innerHTML=activities.map(a=>`
        <div class="inst-activity-item">
            <div class="inst-activity-icon ${a.color}"><i class="bi ${a.icon}"></i></div>
            <div class="inst-activity-text">${a.text}</div>
            <div class="inst-activity-time">${a.time}</div>
        </div>
    `).join('');

    // Upcoming classes
    const upcomingClasses=[
        {time:'10:00 AM',title:'Floral Arrangement Basics',meta:'Lesson 5 — Centerpiece Design'},
        {time:'2:00 PM',title:'Advanced Rose Care',meta:'Live Q&A Session'},
        {time:'Tomorrow 9:00 AM',title:'Flower Business Workshop',meta:'Guest Speaker: Amara Sterling'}
    ];
    $('#upcomingClasses').innerHTML=upcomingClasses.map(c=>`
        <div class="inst-class-item">
            <div class="inst-class-time">${c.time}</div>
            <div class="inst-class-info"><div class="inst-class-title">${c.title}</div><div class="inst-class-meta">${c.meta}</div></div>
            <button class="inst-class-btn">Start</button>
        </div>
    `).join('');

    // Student progress
    const progressData=[
        {name:'Ama',course:'Floral Design',pct:85,status:'Active'},
        {name:'Kojo',course:'Flower Farming',pct:62,status:'Active'},
        {name:'Abena',course:'Orchid Care',pct:100,status:'Completed'},
        {name:'John',course:'Wedding Floristry',pct:45,status:'Active'},
        {name:'Grace',course:'Flower Business',pct:78,status:'Active'}
    ];
    $('#studentProgress').innerHTML=progressData.map(p=>`
        <div style="display:flex;align-items:center;gap:.75rem;padding:.5rem 0;border-bottom:1px solid var(--border-color);">
            <div class="inst-avatar inst-avatar-sm" style="background:${p.status==='Completed'?'#27ae60':'#d4af37'};">${p.name[0]}</div>
            <div style="flex:1;min-width:0;">
                <div style="font-size:.85rem;font-weight:500;">${p.name}</div>
                <div style="font-size:.7rem;color:var(--text-light);">${p.course}</div>
            </div>
            <div class="inst-progress-row" style="flex:1;">
                <div class="inst-progress-bar"><div class="inst-progress-fill" style="width:${p.pct}%"></div></div>
                <div class="inst-progress-pct">${p.pct}%</div>
            </div>
        </div>
    `).join('');

    // Performance chart (simple bar chart)
    drawBarChart('perfCanvas',['Rose Care','Arrangement','Orchids','Wedding','Business','Growing'],[85,72,91,68,55,78]);
}

// ─── Courses ─────────────────────────────────────────
function renderCourses(){
    $('#coursesGrid').innerHTML=courses.map(c=>{
        const enrolled=c.students||c.students_count||0;
        const pct=Math.floor(Math.random()*30+60);
        const thumb=c.thumbnail||c.thumbnail_url||'';
        const thumbSrc=thumb.startsWith('http')?thumb:(thumb?'/'+thumb:'');
        return `
        <div class="inst-course-card">
            ${thumbSrc?`<img class="inst-course-thumb" src="${thumbSrc}" alt="${c.title}">`:''}
            <div class="inst-course-body">
                <div class="inst-course-title">${c.title}</div>
                <div class="inst-course-meta">
                    <span><i class="bi bi-people"></i> ${enrolled} students</span>
                    <span><i class="bi bi-star-fill" style="color:#f1c40f;"></i> ${c.rating||'N/A'}</span>
                    <span><i class="bi bi-bar-chart"></i> ${c.level||'All'}</span>
                </div>
                <div class="inst-course-progress">
                    <div class="inst-progress-row">
                        <div class="inst-progress-bar"><div class="inst-progress-fill" style="width:${pct}%"></div></div>
                        <div class="inst-progress-pct">${pct}%</div>
                    </div>
                </div>
                <div class="inst-course-actions">
                    <button class="inst-btn inst-btn-outline inst-btn-sm" onclick="editCourse('${c.id}')"><i class="bi bi-pencil"></i> Edit</button>
                    <button class="inst-btn inst-btn-primary inst-btn-sm" onclick="manageCourse('${c.id}')"><i class="bi bi-gear"></i> Manage</button>
                </div>
            </div>
        </div>`;
    }).join('');
}
window.editCourse=id=>switchSection('overview');
window.manageCourse=id=>switchSection('overview');

// ─── Students ────────────────────────────────────────
function renderStudents(){
    const names=['Ama Mensah','Kojo Asante','Abena Osei','John Mensah','Grace Addai','Michael Botwe','Sarah Darko','Emmanuel Appiah','Fatima Ibrahim','Nana Agyei'];
    const courseNames=courses.map(c=>c.title);
    const rows=names.map((n,i)=>{
        const course=courseNames[i%courseNames.length]||'General';
        const pct=Math.floor(Math.random()*50+50);
        const statuses=['active','active','completed','active','inactive'];
        const status=statuses[i%statuses.length];
        const lastActive=['Today','Today','Yesterday','2 days ago','1 week ago'][i%5];
        return `<tr>
            <td><div style="display:flex;align-items:center;gap:.5rem;"><div class="inst-avatar inst-avatar-sm">${n[0]}</div>${n}</div></td>
            <td>${course}</td>
            <td><div class="inst-progress-row"><div class="inst-progress-bar"><div class="inst-progress-fill" style="width:${pct}%"></div></div><span class="inst-progress-pct">${pct}%</span></div></td>
            <td>${lastActive}</td>
            <td><span class="inst-status ${status}">${status}</span></td>
        </tr>`;
    });
    $('#studentsBody').innerHTML=rows.join('');
}

// ─── Assignments ─────────────────────────────────────
function renderAssignments(){
    const subs=[
        {student:'Ama Mensah',assignment:'Rose Care Quiz',course:'Flower Care',submitted:'2 hrs ago',status:'pending'},
        {student:'Kojo Asante',assignment:'Arrangement Project',course:'Floral Design',submitted:'5 hrs ago',status:'pending'},
        {student:'Abena Osei',assignment:'Wedding Mood Board',course:'Wedding Floristry',submitted:'1 day ago',status:'graded'},
        {student:'John Mensah',assignment:'Business Plan Draft',course:'Business Skills',submitted:'2 days ago',status:'graded'},
        {student:'Grace Addai',assignment:'Orchid Care Guide',course:'Flower Care',submitted:'3 days ago',status:'graded'}
    ];
    $('#assignmentsBody').innerHTML=subs.map(s=>`
        <tr>
            <td>${s.student}</td>
            <td>${s.assignment}</td>
            <td>${s.course}</td>
            <td>${s.submitted}</td>
            <td><span class="inst-status ${s.status}">${s.status}</span></td>
            <td><button class="inst-btn inst-btn-sm inst-btn-primary">Review</button></td>
        </tr>
    `).join('');
}

// ─── Live Classes ────────────────────────────────────
function renderLiveClasses(){
    const today=[
        {time:'10:00 AM',title:'Floral Arrangement Basics',meta:'Lesson 5 — Centerpiece Design',students:24},
        {time:'2:00 PM',title:'Advanced Rose Care',meta:'Live Q&A Session',students:18}
    ];
    const upcoming=[
        {time:'Tomorrow 9:00 AM',title:'Flower Business Workshop',meta:'Guest Speaker',students:35},
        {time:'Wed 10:00 AM',title:'Wedding Design Masterclass',meta:'Practical Demo',students:28}
    ];
    const render=list=>list.map(c=>`
        <div class="inst-class-item">
            <div class="inst-class-time">${c.time}</div>
            <div class="inst-class-info">
                <div class="inst-class-title">${c.title}</div>
                <div class="inst-class-meta">${c.meta} · ${c.students} students</div>
            </div>
            <button class="inst-class-btn">Join</button>
        </div>
    `).join('');
    $('#todayClasses').innerHTML=render(today);
    $('#upcomingLiveClasses').innerHTML=render(upcoming);
    $('#recordingsList').innerHTML=[
        {title:'Lesson 4 — Color Theory',duration:'32 min',views:156},
        {title:'Lesson 3 — Basic Techniques',duration:'28 min',views:203},
        {title:'Guest Lecture — Wedding Trends',duration:'45 min',views:89}
    ].map(r=>`
        <div class="inst-class-item">
            <div style="font-size:1.2rem;color:var(--primary-color);"><i class="bi bi-play-circle"></i></div>
            <div class="inst-class-info">
                <div class="inst-class-title">${r.title}</div>
                <div class="inst-class-meta">${r.duration} · ${r.views} views</div>
            </div>
        </div>
    `).join('');
}

// ─── Discussions ─────────────────────────────────────
function renderDiscussions(){
    const items=[
        {icon:'&#x1F339;',title:'How do I preserve roses for longer?',meta:'Ama Mensah · 5 min ago',replies:'3 replies'},
        {icon:'&#x1F33B;',title:"What's the best soil for sunflowers?",meta:'Kojo Asante · 1 hr ago',replies:'5 replies'},
        {icon:'&#x1F490;',title:'Tips for hand-tied bouquet wrapping',meta:'Abena Osei · 3 hrs ago',replies:'Answered'},
        {icon:'&#x1F338;',title:'Wedding flower color palette advice',meta:'Grace Addai · 1 day ago',replies:'8 replies'},
        {icon:'&#x1F331;',title:'Succulent care in humid climates',meta:'Michael Botwe · 2 days ago',replies:'Answered'}
    ];
    $('#discussionsList').innerHTML=items.map(d=>`
        <div class="inst-discussion-item">
            <div class="inst-discussion-icon">${d.icon}</div>
            <div class="inst-discussion-content">
                <div class="inst-discussion-title">${d.title}</div>
                <div class="inst-discussion-meta">${d.meta}</div>
            </div>
            <div class="inst-discussion-replies">${d.replies}</div>
        </div>
    `).join('');
}

// ─── Resources ───────────────────────────────────────
function renderResources(){
    const items=[
        {icon:'bi-camera-video',type:'video',title:'Arrangement Tutorial',size:'45 MB',date:'Jun 20'},
        {icon:'bi-filetype-pdf',type:'pdf',title:'Flower Care Guide',size:'2.4 MB',date:'Jun 18'},
        {icon:'bi-image',type:'image',title:'Color Wheel Chart',size:'1.1 MB',date:'Jun 15'},
        {icon:'bi-file-earmark-spreadsheet',type:'template',title:'Pricing Template',size:'0.5 MB',date:'Jun 12'},
        {icon:'bi-filetype-pdf',type:'pdf',title:'Business Plan Workbook',size:'3.2 MB',date:'Jun 10'},
        {icon:'bi-camera-video',type:'video',title:'Rose Pruning Demo',size:'62 MB',date:'Jun 8'}
    ];
    $('#resourcesGrid').innerHTML=items.map(r=>`
        <div class="inst-resource-card" data-type="${r.type}">
            <i class="bi ${r.icon}"></i>
            <h4>${r.title}</h4>
            <p>${r.size} · ${r.date}</p>
        </div>
    `).join('');
    $$('.inst-tab[data-rtype]').forEach(t=>t.addEventListener('click',()=>{
        $$('.inst-tab[data-rtype]').forEach(b=>b.classList.remove('active'));
        t.classList.add('active');
        const filter=t.dataset.rtype;
        $$('.inst-resource-card').forEach(c=>c.style.display=(filter==='all'||c.dataset.type===filter)?'':'none');
    }));
}

// ─── Calendar ────────────────────────────────────────
function renderCalendar(){
    const year=calDate.getFullYear(),month=calDate.getMonth();
    const monthNames=['January','February','March','April','May','June','July','August','September','October','November','December'];
    $('#calMonth').textContent=`${monthNames[month]} ${year}`;
    const firstDay=new Date(year,month,1).getDay();
    const daysInMonth=new Date(year,month+1,0).getDate();
    const daysInPrev=new Date(year,month,0).getDate();
    const today=new Date();
    const eventDays=[3,7,12,15,20,25];
    let html=['Sun','Mon','Tue','Wed','Thu','Fri','Sat'].map(d=>`<div class="inst-cal-day-header">${d}</div>`).join('');
    for(let i=firstDay-1;i>=0;i--) html+=`<div class="inst-cal-day other-month">${daysInPrev-i}</div>`;
    for(let d=1;d<=daysInMonth;d++){
        const isToday=d===today.getDate()&&month===today.getMonth()&&year===today.getFullYear();
        const hasEvent=eventDays.includes(d);
        html+=`<div class="inst-cal-day${isToday?' today':''}${hasEvent?' has-event':''}">${d}</div>`;
    }
    const remaining=42-(firstDay+daysInMonth);
    for(let d=1;d<=remaining;d++) html+=`<div class="inst-cal-day other-month">${d}</div>`;
    $('#calendarGrid').innerHTML=html;
}
$('#calPrev')?.addEventListener('click',()=>{calDate.setMonth(calDate.getMonth()-1);renderCalendar();});
$('#calNext')?.addEventListener('click',()=>{calDate.setMonth(calDate.getMonth()+1);renderCalendar();});

// ─── Certificates ────────────────────────────────────
function renderCertificates(){
    const certs=[
        {student:'Ama Mensah',course:'Flower Arrangement Basics',date:'Jun 25, 2026',id:'CERT-2026-001'},
        {student:'Abena Osei',course:'Wedding Floristry Masterclass',date:'Jun 22, 2026',id:'CERT-2026-002'},
        {student:'Grace Addai',course:'Flower Care & Preservation',date:'Jun 20, 2026',id:'CERT-2026-003'},
        {student:'Kojo Asante',course:'Natural vs Artificial Flowers',date:'Jun 18, 2026',id:'CERT-2026-004'}
    ];
    $('#certificatesBody').innerHTML=certs.map(c=>`
        <tr>
            <td>${c.student}</td>
            <td>${c.course}</td>
            <td>${c.date}</td>
            <td><code>${c.id}</code></td>
            <td><button class="inst-btn inst-btn-sm inst-btn-outline"><i class="bi bi-download"></i> Download</button></td>
        </tr>
    `).join('');
}

// ─── Analytics ───────────────────────────────────────
function renderAnalytics(){
    $('#analyticsStats').innerHTML=`
        <div class="inst-stat-card"><div class="inst-stat-info"><div class="inst-stat-value">1,254</div><div class="inst-stat-label">Total Enrollments</div></div></div>
        <div class="inst-stat-card"><div class="inst-stat-info"><div class="inst-stat-value">92%</div><div class="inst-stat-label">Avg Completion</div></div></div>
        <div class="inst-stat-card"><div class="inst-stat-info"><div class="inst-stat-value">78%</div><div class="inst-stat-label">Avg Quiz Score</div></div></div>
        <div class="inst-stat-card"><div class="inst-stat-info"><div class="inst-stat-value">GHS 8,450</div><div class="inst-stat-label">Revenue</div></div></div>
    `;
    drawLineChart('enrollCanvas',[120,145,160,185,210,240,255]);
    drawLineChart('completionCanvas',[85,87,88,90,91,92,92]);
    drawBarChart('quizCanvas',['Q1','Q2','Q3','Q4','Q5','Q6'],[72,78,81,85,80,88]);
    drawLineChart('revenueCanvas',[4200,5100,6300,7200,7800,8100,8450]);
}

// ─── Settings ────────────────────────────────────────
window.saveSettings=()=>{
    const name=$('#settingsName').value;
    if(name){$('#welcomeName').textContent=name;$('#instName').textContent=name;}
    showToast('Settings saved!','success');
};

// ─── Modals ──────────────────────────────────────────
const courseForm=`
    <form id="courseForm">
    <div class="inst-form-group"><label>Title *</label><input name="title" id="mCourseTitle" required></div>
    <div class="inst-form-group"><label>Description</label><textarea name="description" id="mCourseDesc" rows="3"></textarea></div>
    <div class="inst-form-group"><label>Instructor</label><input name="instructor" id="mCourseInstructor"></div>
    <div class="inst-form-group"><label>Level</label><select name="level" id="mCourseLevel"><option>Beginner</option><option>Intermediate</option><option>Advanced</option></select></div>
    <div class="inst-form-group"><label>Category</label><input name="category" id="mCourseCategory"></div>
    <div class="inst-form-group"><label>Price ($)</label><input name="price" id="mCoursePrice" type="number" step="0.01" min="0"></div>
    <div class="inst-form-group"><label>Thumbnail URL</label><input name="thumbnail" id="mCourseThumb" placeholder="https://... or images/..."></div>
    <button type="submit" class="inst-btn inst-btn-primary" style="width:100%;">Create Course</button>
    </form>`;

const assignmentForm=`
    <div class="inst-form-group"><label>Title *</label><input id="mAssignTitle" required></div>
    <div class="inst-form-group"><label>Course</label><select id="mAssignCourse">${courses.map(c=>`<option>${c.title}</option>`).join('')}</select></div>
    <div class="inst-form-group"><label>Due Date</label><input type="date" id="mAssignDue"></div>
    <div class="inst-form-group"><label>Description</label><textarea id="mAssignDesc" rows="3"></textarea></div>
    <button type="button" class="inst-btn inst-btn-primary" style="width:100%;" onclick="closeModal();showToast('Assignment created!','success')">Create Assignment</button>`;

const liveClassForm=`
    <div class="inst-form-group"><label>Title *</label><input id="mLiveTitle" required></div>
    <div class="inst-form-group"><label>Course</label><select id="mLiveCourse">${courses.map(c=>`<option>${c.title}</option>`).join('')}</select></div>
    <div class="inst-form-group"><label>Date</label><input type="date" id="mLiveDate"></div>
    <div class="inst-form-group"><label>Time</label><input type="time" id="mLiveTime"></div>
    <div class="inst-form-group"><label>Meeting Link</label><input id="mLiveLink" placeholder="https://zoom.us/..."></div>
    <button type="button" class="inst-btn inst-btn-primary" style="width:100%;" onclick="closeModal();showToast('Class scheduled!','success')">Schedule Class</button>`;

const resourceForm=`
    <div class="inst-form-group"><label>Resource Name *</label><input id="mResName" required></div>
    <div class="inst-form-group"><label>Type</label><select id="mResType"><option value="video">Video</option><option value="pdf">PDF</option><option value="image">Image</option><option value="template">Template</option></select></div>
    <div class="inst-form-group"><label>Course</label><select id="mResCourse">${courses.map(c=>`<option>${c.title}</option>`).join('')}</select></div>
    <div class="inst-form-group"><label>File URL</label><input id="mResUrl" placeholder="https://..."></div>
    <button type="button" class="inst-btn inst-btn-primary" style="width:100%;" onclick="closeModal();showToast('Resource uploaded!','success')">Upload</button>`;

const certificateForm=`
    <div class="inst-form-group"><label>Student</label><input id="mCertStudent" placeholder="Student name or email"></div>
    <div class="inst-form-group"><label>Course</label><select id="mCertCourse">${courses.map(c=>`<option>${c.title}</option>`).join('')}</select></div>
    <button type="button" class="inst-btn inst-btn-primary" style="width:100%;" onclick="closeModal();showToast('Certificate issued!','success')">Issue Certificate</button>`;

const forms={course:courseForm,assignment:assignmentForm,'liveclass':liveClassForm,resource:resourceForm,certificate:certificateForm};
const titles={course:'Create Course',assignment:'Create Assignment',liveclass:'Schedule Live Class',resource:'Upload Resource',certificate:'Issue Certificate'};

window.openModal=type=>{
    $('#modalTitle').textContent=titles[type]||'Create';
    $('#modalBody').innerHTML=forms[type]||'';
    $('#modalOverlay').classList.add('active');
};
window.openCreateCourse=()=>openModal('course');
window.closeModal=()=>$('#modalOverlay').classList.remove('active');
$('#modalOverlay')?.addEventListener('click',e=>{if(e.target===e.currentTarget)closeModal();});

// Handle course creation form
document.addEventListener('submit',async e=>{
    if(e.target.id==='courseForm'){
        e.preventDefault();
        const data={
            title:$('#mCourseTitle').value,
            description:$('#mCourseDesc').value,
            instructor:$('#mCourseInstructor').value,
            level:$('#mCourseLevel').value,
            category:$('#mCourseCategory').value,
            price:parseFloat($('#mCoursePrice').value)||0,
            thumbnail_url:$('#mCourseThumb').value
        };
        try{
            const token=window.getToken?window.getToken():null;
            const headers={'Content-Type':'application/json'};
            if(token)headers['Authorization']='Bearer '+token;
            const res=await fetch('/api/courses',{method:'POST',headers,body:JSON.stringify(data)});
            if(!res.ok)throw new Error((await res.json()).error||'Failed');
            closeModal();showToast('Course created!','success');
            courses=await api.fetchCourses();
            renderCourses();
        }catch(err){showToast(err.message||'Failed to create course','error');}
    }
});

// ─── Charts (simple canvas) ──────────────────────────
function drawBarChart(canvasId,labels,data){
    const canvas=document.getElementById(canvasId);
    if(!canvas)return;
    const ctx=canvas.getContext('2d');
    const w=canvas.width=canvas.parentElement.clientWidth;
    const h=canvas.height;
    ctx.clearRect(0,0,w,h);
    const max=Math.max(...data)*1.1;
    const barW=Math.min(40,(w-60)/(labels.length*1.5));
    const startX=40;
    const chartH=h-40;
    ctx.strokeStyle='#e5e7eb';ctx.lineWidth=1;
    for(let i=0;i<=4;i++){
        const y=20+chartH*(i/4);
        ctx.beginPath();ctx.moveTo(startX,y);ctx.lineTo(w-10,y);ctx.stroke();
        ctx.fillStyle='#9ca3af';ctx.font='11px Poppins,sans-serif';ctx.textAlign='right';
        ctx.fillText(Math.round(max*(1-i/4)),startX-8,y+4);
    }
    const gap=(w-startX-20)/labels.length;
    data.forEach((v,i)=>{
        const x=startX+i*gap+gap/2-barW/2;
        const barH=(v/max)*chartH;
        const grad=ctx.createLinearGradient(x,20+chartH-barH,x,20+chartH);
        grad.addColorStop(0,'#d4af37');grad.addColorStop(1,'#b8941f');
        ctx.fillStyle=grad;
        ctx.beginPath();ctx.roundRect(x,20+chartH-barH,barW,barH,[4,4,0,0]);ctx.fill();
        ctx.fillStyle='#6b7280';ctx.font='10px Poppins,sans-serif';ctx.textAlign='center';
        ctx.fillText(labels[i],x+barW/2,h-8);
    });
}

function drawLineChart(canvasId,data){
    const canvas=document.getElementById(canvasId);
    if(!canvas)return;
    const ctx=canvas.getContext('2d');
    const w=canvas.width=canvas.parentElement.clientWidth;
    const h=canvas.height;
    ctx.clearRect(0,0,w,h);
    const max=Math.max(...data)*1.1;
    const min=Math.min(...data)*0.9;
    const range=max-min||1;
    const chartH=h-40;
    const startX=40;
    const stepX=(w-startX-20)/(data.length-1);
    ctx.strokeStyle='#e5e7eb';ctx.lineWidth=1;
    for(let i=0;i<=4;i++){
        const y=20+chartH*(i/4);
        ctx.beginPath();ctx.moveTo(startX,y);ctx.lineTo(w-10,y);ctx.stroke();
        ctx.fillStyle='#9ca3af';ctx.font='11px Poppins,sans-serif';ctx.textAlign='right';
        ctx.fillText(Math.round(max-range*(i/4)),startX-8,y+4);
    }
    ctx.beginPath();
    data.forEach((v,i)=>{
        const x=startX+i*stepX;
        const y=20+chartH*(1-(v-min)/range);
        i===0?ctx.moveTo(x,y):ctx.lineTo(x,y);
    });
    ctx.strokeStyle='#d4af37';ctx.lineWidth=2.5;ctx.stroke();
    const grad=ctx.createLinearGradient(0,20,0,20+chartH);
    grad.addColorStop(0,'rgba(212,175,55,0.2)');grad.addColorStop(1,'rgba(212,175,55,0)');
    ctx.lineTo(startX+(data.length-1)*stepX,20+chartH);
    ctx.lineTo(startX,20+chartH);ctx.closePath();
    ctx.fillStyle=grad;ctx.fill();
    data.forEach((v,i)=>{
        const x=startX+i*stepX;
        const y=20+chartH*(1-(v-min)/range);
        ctx.beginPath();ctx.arc(x,y,4,0,Math.PI*2);ctx.fillStyle='#d4af37';ctx.fill();
        ctx.strokeStyle='#fff';ctx.lineWidth=2;ctx.stroke();
    });
}

// ─── Helpers ─────────────────────────────────────────
function showToast(msg,type){
    const t=document.createElement('div');
    t.style.cssText=`position:fixed;bottom:2rem;right:2rem;padding:.75rem 1.5rem;border-radius:10px;color:#fff;font-size:.9rem;z-index:999;animation:fadeIn .3s;background:${type==='success'?'#27ae60':'#e74c3c'};`;
    t.textContent=msg;document.body.appendChild(t);
    setTimeout(()=>t.remove(),3000);
}
window.showToast=showToast;

init();
})();
