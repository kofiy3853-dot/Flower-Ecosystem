// Student Dashboard
(function(){
const $=s=>document.querySelector(s);
const $$=s=>document.querySelectorAll(s);

let courses=[],lessons=[],quizzes=[];
let calDate=new Date();

// ─── Navigation ──────────────────────────────────────
function switchSection(name){
    $$('.stu-nav-item').forEach(n=>n.classList.toggle('active',n.dataset.section===name));
    $$('.stu-section').forEach(s=>s.classList.toggle('active',s.id==='sec-'+name));
    if(name==='my-courses') renderMyCourses();
    if(name==='browse') renderBrowse();
    if(name==='assignments') renderAssignments();
    if(name==='quizzes') renderQuizzes();
    if(name==='discussions') renderDiscussions();
    if(name==='certificates') renderCertificates();
    if(name==='calendar') renderCalendar();
    if(name==='progress') renderProgress();
}
window.switchSection=switchSection;

$$('.stu-nav-item[data-section]').forEach(n=>n.addEventListener('click',()=>switchSection(n.dataset.section)));
$('#stuHamburger')?.addEventListener('click',()=>$('#stuSidebar').classList.toggle('open'));
document.addEventListener('click',e=>{
    if(!e.target.closest('.stu-sidebar')&&!e.target.closest('.stu-hamburger'))$('#stuSidebar').classList.remove('open');
});

// ─── Notifications ───────────────────────────────────
$('#stuNotifBtn')?.addEventListener('click',()=>$('#stuNotifPanel').classList.toggle('open'));
document.addEventListener('click',e=>{
    if(!e.target.closest('.stu-notif-panel')&&!e.target.closest('#stuNotifBtn'))$('#stuNotifPanel').classList.remove('open');
});

const notifications=[
    {icon:'bi-journal-check',text:'Assignment due tomorrow: Rose Care Quiz',time:'2 hrs ago',color:'#d4af37'},
    {icon:'bi-camera-video',text:'Live class starting in 1 hour: Floral Basics',time:'3 hrs ago',color:'#4a90d9'},
    {icon:'bi-award',text:'You earned a certificate in Flower Care!',time:'1 day ago',color:'#27ae60'}
];

function renderNotifications(){
    $('#stuNotifList').innerHTML=notifications.map(n=>`
        <div class="stu-notif-item">
            <div class="stu-notif-icon" style="background:${n.color}20;color:${n.color};"><i class="bi ${n.icon}"></i></div>
            <div><div>${n.text}</div><div style="font-size:.7rem;color:var(--text-light);margin-top:.2rem;">${n.time}</div></div>
        </div>
    `).join('');
}

// ─── Init ────────────────────────────────────────────
async function init(){
    try{[courses,lessons,quizzes]=await Promise.all([api.fetchCourses(),api.fetchLessons(),api.fetchQuizzes()]);}catch(e){courses=[];lessons=[];quizzes=[];}
    renderOverview();
    renderNotifications();
}

// ─── Overview ────────────────────────────────────────
function renderOverview(){
    const enrolled=courses.slice(0,4);
    const completed=[courses[1]];

    // Continue Learning
    const continueData=enrolled.slice(0,3).map((c,i)=>{
        const pct=[65,42,15,80][i]||0;
        const thumb=c.thumbnail||c.thumbnail_url||'';
        const thumbSrc=thumb.startsWith('http')?thumb:(thumb?'/'+thumb:'');
        return{...c,pct,thumbSrc};
    });
    $('#continueLearning').innerHTML=continueData.map(c=>`
        <div class="stu-continue-item" onclick="window.location.href='course-detail.html?id=${c.id}'">
            ${c.thumbSrc?`<img class="stu-continue-thumb" src="${c.thumbSrc}" alt="${c.title}">`:''}
            <div class="stu-continue-info">
                <div class="stu-continue-title">${c.title}</div>
                <div class="stu-continue-meta">${c.instructor||''}</div>
                <div class="stu-continue-progress">
                    <div class="stu-progress-row"><div class="stu-progress-bar"><div class="stu-progress-fill" style="width:${c.pct}%"></div></div><span class="stu-progress-pct">${c.pct}%</span></div>
                </div>
            </div>
        </div>
    `).join('');

    // Upcoming Deadlines
    const deadlines=[
        {day:'29',month:'Jun',title:'Rose Care Quiz',course:'Flower Care & Preservation'},
        {day:'01',month:'Jul',title:'Arrangement Project',course:'Flower Arrangement Basics'},
        {day:'03',month:'Jul',title:'Wedding Mood Board',course:'Wedding Floristry Masterclass'}
    ];
    $('#upcomingDeadlines').innerHTML=deadlines.map(d=>`
        <div class="stu-deadline-item">
            <div class="stu-deadline-date"><div class="day">${d.day}</div><div class="month">${d.month}</div></div>
            <div class="stu-deadline-info"><div class="stu-deadline-title">${d.title}</div><div class="stu-deadline-meta">${d.course}</div></div>
        </div>
    `).join('');

    // Activity chart
    drawBarChart('activityCanvas',['Mon','Tue','Wed','Thu','Fri','Sat','Sun'],[45,60,30,75,50,20,0]);

    // Achievements
    const achievements=[
        {icon:'&#x1F339;',title:'First Lesson Complete',desc:'Completed your first lesson',bg:'rgba(212,175,55,.1)'},
        {icon:'&#x1F3C6;',title:'Course Completed',desc:'Finished Natural vs Artificial Flowers',bg:'rgba(39,174,96,.1)'},
        {icon:'&#x1F4DA;',title:'Bookworm',desc:'Studied 10 lessons this week',bg:'rgba(74,144,217,.1)'}
    ];
    $('#achievements').innerHTML=achievements.map(a=>`
        <div class="stu-achievement-item">
            <div class="stu-achievement-icon" style="background:${a.bg};font-size:1.3rem;">${a.icon}</div>
            <div class="stu-achievement-info"><div class="stu-achievement-title">${a.title}</div><div class="stu-achievement-desc">${a.desc}</div></div>
        </div>
    `).join('');

    // Recommended
    const recommended=courses.slice(2,6);
    $('#recommendedGrid').innerHTML=recommended.map(c=>{
        const thumb=c.thumbnail||c.thumbnail_url||'';
        const thumbSrc=thumb.startsWith('http')?thumb:(thumb?'/'+thumb:'');
        return `
        <div class="stu-recommend-card" onclick="window.location.href='course-detail.html?id=${c.id}'">
            ${thumbSrc?`<img src="${thumbSrc}" alt="${c.title}">`:''}
            <div class="stu-recommend-body">
                <div class="stu-recommend-title">${c.title}</div>
                <div class="stu-recommend-meta">${c.instructor||''} &middot; ${c.level||'All Levels'}</div>
            </div>
        </div>`;
    }).join('');
}

// ─── My Courses ──────────────────────────────────────
function renderMyCourses(){
    const enrolled=courses.slice(0,4);
    const progress=[65,42,100,15];
    const statuses=['active','active','completed','active'];
    $('#myCoursesGrid').innerHTML=enrolled.map((c,i)=>{
        const thumb=c.thumbnail||c.thumbnail_url||'';
        const thumbSrc=thumb.startsWith('http')?thumb:(thumb?'/'+thumb:'');
        const lessonsForCourse=lessons.filter(l=>l.course_id===c.id).length;
        return `
        <div class="stu-course-card">
            ${thumbSrc?`<img class="stu-course-thumb" src="${thumbSrc}" alt="${c.title}">`:''}
            <div class="stu-course-body">
                <div class="stu-course-title">${c.title}</div>
                <div class="stu-course-meta">
                    <span><i class="bi bi-person"></i> ${c.instructor||''}</span>
                    <span><i class="bi bi-clock"></i> ${lessonsForCourse} lessons</span>
                    <span><i class="bi bi-star-fill" style="color:#f1c40f;"></i> ${c.rating||'N/A'}</span>
                </div>
                <div class="stu-course-progress">
                    <div class="stu-progress-row"><div class="stu-progress-bar"><div class="stu-progress-fill" style="width:${progress[i]}%"></div></div><span class="stu-progress-pct">${progress[i]}%</span></div>
                </div>
                <div class="stu-course-actions">
                    <a href="course-detail.html?id=${c.id}" class="stu-btn stu-btn-primary stu-btn-sm">${progress[i]===100?'Review':'Continue'}</a>
                </div>
            </div>
        </div>`;
    }).join('');
}

// ─── Browse Courses ──────────────────────────────────
function renderBrowse(){
    const cats=[...new Set(courses.map(c=>c.category).filter(Boolean))];
    $('#browseCatFilter').innerHTML='<option value="all">All Categories</option>'+cats.map(c=>`<option>${c}</option>`).join('');
    $('#browseGrid').innerHTML=courses.map(c=>{
        const thumb=c.thumbnail||c.thumbnail_url||'';
        const thumbSrc=thumb.startsWith('http')?thumb:(thumb?'/'+thumb:'');
        return `
        <div class="stu-course-card">
            ${thumbSrc?`<img class="stu-course-thumb" src="${thumbSrc}" alt="${c.title}">`:''}
            <div class="stu-course-body">
                <div class="stu-course-title">${c.title}</div>
                <div class="stu-course-meta">
                    <span><i class="bi bi-person"></i> ${c.instructor||''}</span>
                    <span><i class="bi bi-bar-chart"></i> ${c.level||'All'}</span>
                    <span><i class="bi bi-people"></i> ${c.students||c.students_count||0}</span>
                </div>
                <div class="stu-course-actions">
                    <a href="course-detail.html?id=${c.id}" class="stu-btn stu-btn-primary stu-btn-sm" style="flex:1;justify-content:center;">${c.price>0?'$'+c.price.toFixed(2):'Free'}</a>
                </div>
            </div>
        </div>`;
    }).join('');
}

// ─── Assignments ─────────────────────────────────────
function renderAssignments(){
    const allAssignments=[
        {title:'Rose Care Quiz',course:'Flower Care & Preservation',due:'Jun 29',status:'pending',icon:'bi-journal-text',color:'#d4af37'},
        {title:'Arrangement Project',course:'Flower Arrangement Basics',due:'Jul 1',status:'pending',icon:'bi-brush',color:'#5a7a60'},
        {title:'Wedding Mood Board',course:'Wedding Floristry Masterclass',due:'Jul 3',status:'pending',icon:'bi-images',color:'#4a90d9'},
        {title:'Flower Identification Test',course:'Natural vs Artificial Flowers',due:'Jun 20',status:'submitted',icon:'bi-search',color:'#27ae60'},
        {title:'Color Theory Exercise',course:'Flower Arrangement Basics',due:'Jun 15',status:'graded',icon:'bi-palette',color:'#ac3250',grade:'92%'}
    ];
    const renderList=(filter)=>{
        const items=filter==='all'?allAssignments:allAssignments.filter(a=>a.status===filter);
        if(!items.length) return '<p style="text-align:center;color:var(--text-light);padding:2rem;">No assignments.</p>';
        return items.map(a=>`
            <div class="stu-assign-item">
                <div class="stu-assign-icon" style="background:${a.color}15;color:${a.color};"><i class="bi ${a.icon}"></i></div>
                <div class="stu-assign-info">
                    <div class="stu-assign-title">${a.title}</div>
                    <div class="stu-assign-meta">${a.course} &middot; Due: ${a.due}</div>
                </div>
                ${a.grade?`<span style="font-weight:600;color:#5a7a60;">${a.grade}</span>`:''}
                <span class="stu-status ${a.status}">${a.status}</span>
            </div>
        `).join('');
    };
    renderList('pending');
    $$('.stu-tab[data-atab]').forEach(t=>t.addEventListener('click',()=>{
        $$('.stu-tab[data-atab]').forEach(b=>b.classList.remove('active'));
        t.classList.add('active');
        renderList(t.dataset.atab);
    }));
}

// ─── Quizzes ─────────────────────────────────────────
function renderQuizzes(){
    const quizList=[
        {title:'Flower Care Basics',course:'Flower Care & Preservation',questions:10,status:'available',score:null},
        {title:'Color Theory for Florists',course:'Flower Arrangement Basics',questions:8,status:'available',score:null},
        {title:'Natural vs Artificial',course:'Natural vs Artificial Flowers',questions:12,status:'completed',score:'85%'},
        {title:'Wedding Planning',course:'Wedding Floristry Masterclass',questions:15,status:'available',score:null}
    ];
    $('#quizzesList').innerHTML=quizList.map(q=>`
        <div class="stu-assign-item">
            <div class="stu-assign-icon" style="background:rgba(90,122,96,.1);color:#5a7a60;"><i class="bi bi-question-circle"></i></div>
            <div class="stu-assign-info">
                <div class="stu-assign-title">${q.title}</div>
                <div class="stu-assign-meta">${q.course} &middot; ${q.questions} questions</div>
            </div>
            ${q.score?`<span style="font-weight:600;color:#5a7a60;">${q.score}</span>`:''}
            <button class="stu-btn ${q.status==='completed'?'stu-btn-outline':'stu-btn-primary'} stu-btn-sm">${q.status==='completed'?'Review':'Start Quiz'}</button>
        </div>
    `).join('');
}

// ─── Discussions ─────────────────────────────────────
function renderDiscussions(){
    const posts=[
        {author:'Ama Mensah',initial:'A',time:'2 hours ago',title:'Tips for keeping roses fresh longer?',body:'I bought some beautiful roses but they wilted after 3 days. Any professional tips to extend their vase life?',replies:5,likes:12},
        {author:'Kojo Asante',initial:'K',time:'5 hours ago',title:'Best flowers for a first-date bouquet?',body:"I'm looking for something romantic but not too overwhelming. Budget around GHS 50. Any suggestions?",replies:8,likes:15},
        {author:'Abena Osei',initial:'A',time:'1 day ago',title:'How to price wedding packages?',body:'I just started my floristry business and struggling with pricing my wedding packages competitively. How do you calculate costs?',replies:12,likes:23},
        {author:'Grace Addai',initial:'G',time:'2 days ago',title:'My first hand-tied bouquet attempt!',body:'Just tried the spiral technique from Lesson 3. It took me 3 attempts but I finally got it! Sharing my progress.',replies:15,likes:34}
    ];
    $('#discussionsList').innerHTML=posts.map(p=>`
        <div class="stu-discussion-item">
            <div class="stu-discussion-header">
                <div class="stu-discussion-avatar">${p.initial}</div>
                <div class="stu-discussion-author">${p.author}</div>
                <div class="stu-discussion-time">${p.time}</div>
            </div>
            <div class="stu-discussion-title">${p.title}</div>
            <div class="stu-discussion-body">${p.body}</div>
            <div class="stu-discussion-footer">
                <span><i class="bi bi-chat"></i> ${p.replies} replies</span>
                <span><i class="bi bi-heart"></i> ${p.likes} likes</span>
                <span><i class="bi bi-share"></i> Share</span>
            </div>
        </div>
    `).join('');
}

// ─── Certificates ────────────────────────────────────
function renderCertificates(){
    const certs=[
        {course:'Natural vs Artificial Flowers',date:'June 20, 2026',id:'CERT-2026-001'},
        {course:'Flower Care & Preservation',date:'June 15, 2026',id:'CERT-2026-002'}
    ];
    $('#certsGrid').innerHTML=certs.map(c=>`
        <div class="stu-cert-card">
            <div class="stu-cert-icon">&#x1F3C6;</div>
            <div class="stu-cert-title">Certificate of Completion</div>
            <div class="stu-cert-course">${c.course}</div>
            <div class="stu-cert-date">Issued: ${c.date}</div>
            <div class="stu-cert-id">${c.id}</div>
            <div class="stu-cert-actions">
                <button class="stu-btn stu-btn-primary stu-btn-sm"><i class="bi bi-download"></i> Download</button>
                <button class="stu-btn stu-btn-outline stu-btn-sm"><i class="bi bi-share"></i> Share</button>
            </div>
        </div>
    `).join('');
}

// ─── Calendar ────────────────────────────────────────
function renderCalendar(){
    const year=calDate.getFullYear(),month=calDate.getMonth();
    const monthNames=['January','February','March','April','May','June','July','August','September','October','November','December'];
    $('#stuCalMonth').textContent=`${monthNames[month]} ${year}`;
    const firstDay=new Date(year,month,1).getDay();
    const daysInMonth=new Date(year,month+1,0).getDate();
    const daysInPrev=new Date(year,month,0).getDate();
    const today=new Date();
    const eventDays=[3,7,12,15,20,25,29];
    let html=['Sun','Mon','Tue','Wed','Thu','Fri','Sat'].map(d=>`<div class="stu-cal-day-header">${d}</div>`).join('');
    for(let i=firstDay-1;i>=0;i--) html+=`<div class="stu-cal-day other-month">${daysInPrev-i}</div>`;
    for(let d=1;d<=daysInMonth;d++){
        const isToday=d===today.getDate()&&month===today.getMonth()&&year===today.getFullYear();
        const hasEvent=eventDays.includes(d);
        html+=`<div class="stu-cal-day${isToday?' today':''}${hasEvent?' has-event':''}">${d}</div>`;
    }
    const remaining=42-(firstDay+daysInMonth);
    for(let d=1;d<=remaining;d++) html+=`<div class="stu-cal-day other-month">${d}</div>`;
    $('#stuCalendarGrid').innerHTML=html;

    // Week events
    const weekEvents=[
        {day:'Today',time:'10:00 AM',title:'Live: Floral Arrangement Basics',type:'class'},
        {day:'Today',time:'11:59 PM',title:'Rose Care Quiz Due',type:'deadline'},
        {day:'Tomorrow',time:'2:00 PM',title:'Live: Advanced Rose Care',type:'class'},
        {day:'Wednesday',time:'9:00 AM',title:'Assignment: Arrangement Project',type:'deadline'}
    ];
    $('#weekEvents').innerHTML=weekEvents.map(e=>`
        <div class="stu-deadline-item">
            <div class="stu-deadline-date"><div class="day" style="font-size:.85rem;">${e.day}</div></div>
            <div class="stu-deadline-info"><div class="stu-deadline-title">${e.title}</div><div class="stu-deadline-meta">${e.time}</div></div>
            <span class="stu-status ${e.type==='class'?'active':'pending'}">${e.type}</span>
        </div>
    `).join('');
}
$('#stuCalPrev')?.addEventListener('click',()=>{calDate.setMonth(calDate.getMonth()-1);renderCalendar();});
$('#stuCalNext')?.addEventListener('click',()=>{calDate.setMonth(calDate.getMonth()+1);renderCalendar();});

// ─── Progress ────────────────────────────────────────
function renderProgress(){
    $('#progressStats').innerHTML=`
        <div class="stu-stat-card"><div class="stu-stat-info"><div class="stu-stat-value">28h</div><div class="stu-stat-label">Total Learning Time</div></div></div>
        <div class="stu-stat-card"><div class="stu-stat-info"><div class="stu-stat-value">18</div><div class="stu-stat-label">Lessons Completed</div></div></div>
        <div class="stu-stat-card"><div class="stu-stat-info"><div class="stu-stat-value">78%</div><div class="stu-stat-label">Avg Quiz Score</div></div></div>
    `;
    drawRadarChart('skillsCanvas',['Flower Care','Arrangement','Color Theory','Wedding','Business','Identification'],[85,72,68,45,30,90]);

    const streak=[1,1,1,0,1,1,0,0,1,1,1,1,0,0];
    const streakCount=7;
    $('#streakInfo').innerHTML=`
        <div class="stu-streak-info">
            <div class="stu-streak-stat"><div class="value">${streakCount}</div><div class="label">Day Streak</div></div>
            <div class="stu-streak-stat"><div class="value">18</div><div class="label">Days Active</div></div>
            <div class="stu-streak-days">
                ${streak.map((s,i)=>`<div class="stu-streak-day ${s?'active':'inactive'}">${i+1}</div>`).join('')}
            </div>
        </div>
    `;
}

// ─── Settings ────────────────────────────────────────
window.saveStuSettings=()=>{
    const name=$('#stuSetName').value;
    if(name){$('#stuWelcomeName').textContent=name.split(' ')[0];$('#stuName').textContent=name;}
    showStuToast('Settings saved!','success');
};

// ─── Modal ───────────────────────────────────────────
const discussionForm=`
    <form id="newDiscussionForm">
    <div class="stu-form-group"><label>Title *</label><input id="mDiscTitle" required></div>
    <div class="stu-form-group"><label>Your Question</label><textarea id="mDiscBody" rows="4"></textarea></div>
    <div class="stu-form-group"><label>Course</label><select id="mDiscCourse"><option value="">General</option>${courses.map(c=>`<option>${c.title}</option>`).join('')}</select></div>
    <button type="submit" class="stu-btn stu-btn-primary" style="width:100%;">Post Discussion</button>
    </form>`;
const forms={'new-discussion':discussionForm};
const titles={'new-discussion':'New Discussion Post'};

window.openModal=type=>{
    $('#stuModalTitle').textContent=titles[type]||'Create';
    $('#stuModalBody').innerHTML=forms[type]||'';
    $('#stuModalOverlay').classList.add('active');
};
window.closeStuModal=()=>$('#stuModalOverlay').classList.remove('active');
$('#stuModalOverlay')?.addEventListener('click',e=>{if(e.target===e.currentTarget)closeStuModal();});

document.addEventListener('submit',async e=>{
    if(e.target.id==='newDiscussionForm'){
        e.preventDefault();
        closeStuModal();showStuToast('Discussion posted!','success');
    }
});

// ─── Charts ──────────────────────────────────────────
function drawBarChart(canvasId,labels,data){
    const canvas=document.getElementById(canvasId);
    if(!canvas)return;
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
        ctx.fillText(Math.round(max*(1-i/3))+'m',startX-6,y+3);
    }
    const gap=(w-startX-15)/labels.length;
    data.forEach((v,i)=>{
        const x=startX+i*gap+gap/2-barW/2;
        const barH=(v/max)*chartH;
        const grad=ctx.createLinearGradient(x,15+chartH-barH,x,15+chartH);
        grad.addColorStop(0,'#5a7a60');grad.addColorStop(1,'#3d5a42');
        ctx.fillStyle=grad;
        ctx.beginPath();ctx.roundRect(x,15+chartH-barH,barW,barH,[3,3,0,0]);ctx.fill();
        ctx.fillStyle='#6b7280';ctx.font='10px Poppins,sans-serif';ctx.textAlign='center';
        ctx.fillText(labels[i],x+barW/2,h-6);
    });
}

function drawRadarChart(canvasId,labels,data){
    const canvas=document.getElementById(canvasId);
    if(!canvas)return;
    const ctx=canvas.getContext('2d');
    const w=canvas.width=canvas.parentElement.clientWidth;
    const h=canvas.height;
    ctx.clearRect(0,0,w,h);
    const cx=w/2,cy=h/2,r=Math.min(w,h)/2-40;
    const n=labels.length;
    const angleStep=Math.PI*2/n;
    // Grid
    for(let ring=1;ring<=4;ring++){
        ctx.beginPath();
        for(let i=0;i<=n;i++){
            const a=-Math.PI/2+i*angleStep;
            const rr=r*(ring/4);
            const x=cx+Math.cos(a)*rr;
            const y=cy+Math.sin(a)*rr;
            i===0?ctx.moveTo(x,y):ctx.lineTo(x,y);
        }
        ctx.closePath();ctx.strokeStyle='#e5e7eb';ctx.lineWidth=1;ctx.stroke();
    }
    // Axes + Labels
    labels.forEach((l,i)=>{
        const a=-Math.PI/2+i*angleStep;
        ctx.beginPath();ctx.moveTo(cx,cy);ctx.lineTo(cx+Math.cos(a)*r,cy+Math.sin(a)*r);ctx.strokeStyle='#e5e7eb';ctx.stroke();
        const lx=cx+Math.cos(a)*(r+20);
        const ly=cy+Math.sin(a)*(r+20);
        ctx.fillStyle='#6b7280';ctx.font='11px Poppins,sans-serif';ctx.textAlign='center';ctx.textBaseline='middle';
        ctx.fillText(l,lx,ly);
    });
    // Data polygon
    ctx.beginPath();
    data.forEach((v,i)=>{
        const a=-Math.PI/2+i*angleStep;
        const rr=r*(v/100);
        const x=cx+Math.cos(a)*rr;
        const y=cy+Math.sin(a)*rr;
        i===0?ctx.moveTo(x,y):ctx.lineTo(x,y);
    });
    ctx.closePath();
    ctx.fillStyle='rgba(90,122,96,.2)';ctx.fill();
    ctx.strokeStyle='#5a7a60';ctx.lineWidth=2;ctx.stroke();
    // Dots
    data.forEach((v,i)=>{
        const a=-Math.PI/2+i*angleStep;
        const rr=r*(v/100);
        const x=cx+Math.cos(a)*rr;
        const y=cy+Math.sin(a)*rr;
        ctx.beginPath();ctx.arc(x,y,4,0,Math.PI*2);ctx.fillStyle='#5a7a60';ctx.fill();
        ctx.strokeStyle='#fff';ctx.lineWidth=2;ctx.stroke();
    });
}

// ─── Helpers ─────────────────────────────────────────
function showStuToast(msg,type){
    const t=document.createElement('div');
    t.style.cssText=`position:fixed;bottom:2rem;right:2rem;padding:.75rem 1.5rem;border-radius:10px;color:#fff;font-size:.9rem;z-index:999;animation:fadeIn .3s;background:${type==='success'?'#27ae60':'#e74c3c'};`;
    t.textContent=msg;document.body.appendChild(t);
    setTimeout(()=>t.remove(),3000);
}
window.showStuToast=showStuToast;

init();
})();
