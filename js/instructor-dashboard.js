// Instructor Dashboard — wired to real backend APIs
(function(){
const $ = s => document.querySelector(s);
const $$ = s => document.querySelectorAll(s);

let courses=[], lessons=[], quizzes=[], studentsData=[], assignments=[], liveClasses=[], certificates=[], analytics={};
let calDate = new Date();

// ─── Navigation ──────────────────────────────────────
function switchSection(name){
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

async function renderNotifications(){
    const items=[];
    if(studentsData.length) items.push({icon:'bi-person-plus',text:`${studentsData.length} students enrolled`,time:'now',color:'green'});
    if(assignments.filter(a=>a.status==='pending').length) items.push({icon:'bi-journal-check',text:`${assignments.filter(a=>a.status==='pending').length} assignments to grade`,time:'now',color:'gold'});
    if(certificates.length) items.push({icon:'bi-award',text:`${certificates.length} certificates issued`,time:'now',color:'green'});
    if(!items.length) items.push({icon:'bi-shield-check',text:'System running normally',time:'now',color:'blue'});
    const badge=$('#notifBtn .inst-badge');
    if(badge) badge.textContent=items.length;
    $('#notifList').innerHTML=items.map(n=>`
        <div class="inst-notif-item">
            <div class="inst-notif-icon" style="background:rgba(${n.color==='green'?'39,174,96':n.color==='gold'?'212,175,55':'74,144,217'},.1);color:${n.color==='green'?'#27ae60':n.color==='gold'?'#d4af37':'#4a90d9'};">
                <i class="bi ${n.icon}"></i>
            </div>
            <div><div>${escapeHtml(n.text)}</div><div style="font-size:.7rem;color:var(--text-light);margin-top:.2rem;">${n.time}</div></div>
        </div>
    `).join('');
}
window.clearNotifications=()=>{$('#notifPanel').classList.remove('open');};

// ─── Init ────────────────────────────────────────────
async function init(){
    const role=getCurrentUserRole();
    if(!['INSTRUCTOR','ADMIN','SUPERADMIN'].includes(role)){
        document.querySelector('.inst-content').innerHTML='<div style="text-align:center;padding:4rem;"><h2>Access Denied</h2><p>You need instructor privileges.</p><a href="/" class="inst-btn inst-btn-primary" style="margin-top:1rem;">Go Home</a></div>';
        return;
    }
    const results=await Promise.allSettled([
        api.fetchInstructorCourses(),
        api.fetchLessons(),
        api.fetchQuizzes(),
        api.fetchInstructorStudents(),
        api.fetchInstructorAssignments(),
        api.fetchInstructorLiveClasses(),
        api.fetchInstructorCertificates(),
        api.fetchInstructorAnalytics()
    ]);
    courses=results[0].status==='fulfilled'?results[0].value:[];
    lessons=results[1].status==='fulfilled'?results[1].value:[];
    quizzes=results[2].status==='fulfilled'?results[2].value:[];
    studentsData=results[3].status==='fulfilled'?results[3].value:[];
    assignments=results[4].status==='fulfilled'?results[4].value:[];
    liveClasses=results[5].status==='fulfilled'?results[5].value:[];
    certificates=results[6].status==='fulfilled'?results[6].value:[];
    analytics=results[7].status==='fulfilled'?results[7].value:{};

    const failed=results.filter(r=>r.status==='rejected').length;
    if(failed===results.length) showToast('Backend unreachable','error');
    else if(failed>=3) showToast(`Partial outage — ${failed} data sources failed`,'error');

    renderOverview();
    renderNotifications();
}

// ─── Overview ────────────────────────────────────────
function renderOverview(){
    const totalStudents=courses.reduce((s,c)=>s+(c.enrolled_count||c.students||c.students_count||0),0);
    const statValues=$$('.inst-stat-value');
    if(statValues[0]) statValues[0].textContent=totalStudents.toLocaleString();
    if(statValues[1]) statValues[1].textContent=courses.length;
    if(statValues[2]) statValues[2].textContent=(analytics.completionRate||0)+'%';
    if(statValues[3]) statValues[3].textContent='GHS '+(analytics.revenue||0).toLocaleString();

    // Recent students
    const recentStudents=studentsData.slice(0,5);
    $('#studentProgress').innerHTML=recentStudents.length?recentStudents.map(s=>{
        const name=s.first_name||s.student_name||'Unknown';
        const pct=s.total_lessons?Math.round((s.completed_lessons||0)/s.total_lessons*100):0;
        const status=s.status||'active';
        return `<div style="display:flex;align-items:center;gap:.75rem;padding:.5rem 0;border-bottom:1px solid var(--border-color);">
            <div class="inst-avatar inst-avatar-sm" style="background:${status==='completed'?'#27ae60':'#d4af37'};">${name[0]}</div>
            <div style="flex:1;min-width:0;">
                <div style="font-size:.85rem;font-weight:500;">${escapeHtml(name)}</div>
                <div style="font-size:.7rem;color:var(--text-light);">${escapeHtml(s.course_title||'')}</div>
            </div>
            <div class="inst-progress-row" style="flex:1;">
                <div class="inst-progress-bar"><div class="inst-progress-fill" style="width:${pct}%"></div></div>
                <div class="inst-progress-pct">${pct}%</div>
            </div>
        </div>`;
    }).join(''):'<p style="color:var(--text-light);font-size:.85rem;padding:1rem;">No students yet</p>';

    // Pending assignments
    const pending=assignments.filter(a=>a.status==='pending').slice(0,5);
    $('#activityFeed').innerHTML=pending.length?pending.map(a=>`
        <div class="inst-activity-item">
            <div class="inst-activity-icon gold"><i class="bi bi-journal-text"></i></div>
            <div class="inst-activity-text"><strong>${escapeHtml(a.student_name||'Student')}</strong> submitted ${escapeHtml(a.title||'assignment')}</div>
            <div class="inst-activity-time">${timeAgo(a.submitted_at||a.created_at)}</div>
        </div>
    `).join(''):'<p style="color:var(--text-light);font-size:.85rem;padding:1rem;">No pending activity</p>';

    // Upcoming live classes
    const upcoming=liveClasses.filter(c=>c.status==='upcoming'||c.status==='scheduled').slice(0,3);
    $('#upcomingClasses').innerHTML=upcoming.length?upcoming.map(c=>`
        <div class="inst-class-item">
            <div class="inst-class-time">${escapeHtml(c.time||'TBD')}</div>
            <div class="inst-class-info"><div class="inst-class-title">${escapeHtml(c.title||'')}</div><div class="inst-class-meta">${escapeHtml(c.day||'')} · ${c.enrolled||0} students</div></div>
            <button class="inst-class-btn">Join</button>
        </div>
    `).join(''):'<p style="color:var(--text-light);font-size:.85rem;padding:1rem;">No upcoming classes</p>';
}

// ─── Courses ─────────────────────────────────────────
function renderCourses(){
    const grid=$('#coursesGrid');
    if(!courses.length){grid.innerHTML='<p style="color:var(--text-light);text-align:center;padding:2rem;">No courses yet</p>';return;}
    grid.innerHTML=courses.map(c=>{
        const enrolled=c.enrolled_count||c.students||c.students_count||0;
        const thumb=c.thumbnail||c.thumbnail_url||'';
        const thumbSrc=thumb.startsWith('http')?thumb:(thumb?'/'+thumb:'');
        return `
        <div class="inst-course-card">
            ${thumbSrc?`<img class="inst-course-thumb" src="${thumbSrc}" alt="${escapeHtml(c.title)}">`:''}
            <div class="inst-course-body">
                <div class="inst-course-title">${escapeHtml(c.title)}</div>
                <div class="inst-course-meta">
                    <span><i class="bi bi-people"></i> ${enrolled} students</span>
                    <span><i class="bi bi-star-fill" style="color:#f1c40f;"></i> ${c.rating||'N/A'}</span>
                    <span><i class="bi bi-bar-chart"></i> ${escapeHtml(c.level||'All')}</span>
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
    const body=$('#studentsBody');
    if(!studentsData.length){body.innerHTML='<tr><td colspan="5" style="text-align:center;padding:2rem;color:var(--text-light);">No students enrolled yet</td></tr>';return;}
    body.innerHTML=studentsData.map(s=>{
        const name=s.first_name||s.student_name||'Unknown';
        const pct=s.total_lessons?Math.round((s.completed_lessons||0)/s.total_lessons*100):0;
        const status=s.status||'active';
        return `<tr>
            <td><div style="display:flex;align-items:center;gap:.5rem;"><div class="inst-avatar inst-avatar-sm">${name[0]}</div>${escapeHtml(name)}</div></td>
            <td>${escapeHtml(s.course_title||'')}</td>
            <td><div class="inst-progress-row"><div class="inst-progress-bar"><div class="inst-progress-fill" style="width:${pct}%"></div></div><span class="inst-progress-pct">${pct}%</span></div></td>
            <td>${timeAgo(s.created_at)}</td>
            <td><span class="inst-status ${status}">${status}</span></td>
        </tr>`;
    }).join('');
}

// ─── Assignments ─────────────────────────────────────
function renderAssignments(){
    const body=$('#assignmentsBody');
    if(!assignments.length){body.innerHTML='<tr><td colspan="6" style="text-align:center;padding:2rem;color:var(--text-light);">No assignments yet</td></tr>';return;}
    body.innerHTML=assignments.map(a=>`
        <tr>
            <td>${escapeHtml(a.student_name||'Student')}</td>
            <td>${escapeHtml(a.title||'')}</td>
            <td>${escapeHtml(a.course_title||'')}</td>
            <td>${timeAgo(a.submitted_at||a.created_at)}</td>
            <td><span class="inst-status ${a.status||'pending'}">${a.status||'pending'}</span></td>
            <td><button class="inst-btn inst-btn-sm inst-btn-primary">Review</button></td>
        </tr>
    `).join('');
}

// ─── Live Classes ────────────────────────────────────
function renderLiveClasses(){
    const today=liveClasses.filter(c=>c.status==='live'||c.status==='in_progress');
    const upcoming=liveClasses.filter(c=>c.status==='upcoming'||c.status==='scheduled');
    const render=list=>list.length?list.map(c=>`
        <div class="inst-class-item">
            <div class="inst-class-time">${escapeHtml(c.time||'TBD')}</div>
            <div class="inst-class-info">
                <div class="inst-class-title">${escapeHtml(c.title||'')}</div>
                <div class="inst-class-meta">${escapeHtml(c.day||'')} · ${c.enrolled||0} students</div>
            </div>
            <button class="inst-class-btn">${c.status==='live'||c.status==='in_progress'?'Join':'View'}</button>
        </div>
    `).join(''):'<p style="color:var(--text-light);font-size:.85rem;padding:1rem;">None scheduled</p>';
    $('#todayClasses').innerHTML=render(today);
    $('#upcomingLiveClasses').innerHTML=render(upcoming);
    $('#recordingsList').innerHTML='<p style="color:var(--text-light);font-size:.85rem;padding:1rem;">No recordings yet</p>';
}

// ─── Discussions ─────────────────────────────────────
async function renderDiscussions(){
    let discussions=[];
    try{discussions=await api.fetchDiscussions();}catch{}
    const list=Array.isArray(discussions)?discussions:(discussions.discussions||[]);
    const body=$('#discussionsList');
    if(!list.length){body.innerHTML='<p style="color:var(--text-light);font-size:.85rem;padding:1rem;">No discussions yet</p>';return;}
    body.innerHTML=list.slice(0,10).map(d=>`
        <div class="inst-discussion-item">
            <div class="inst-discussion-icon"><i class="bi bi-chat-dots" style="color:var(--primary-color);"></i></div>
            <div class="inst-discussion-content">
                <div class="inst-discussion-title">${escapeHtml(d.title||'')}</div>
                <div class="inst-discussion-meta">${escapeHtml(d.author_name||'Unknown')} · ${timeAgo(d.created_at)}</div>
            </div>
            <div class="inst-discussion-replies">${d.reply_count||d.replies||0} replies</div>
        </div>
    `).join('');
}

// ─── Resources ───────────────────────────────────────
function renderResources(){
    const body=$('#resourcesGrid');
    body.innerHTML='<p style="color:var(--text-light);font-size:.85rem;padding:1rem;">Upload resources from course management</p>';
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
    const eventDays=liveClasses.filter(c=>c.day).map(c=>{try{return new Date(c.day).getDate();}catch{return null;}}).filter(Boolean);
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
    const body=$('#certificatesBody');
    if(!certificates.length){body.innerHTML='<tr><td colspan="5" style="text-align:center;padding:2rem;color:var(--text-light);">No certificates issued yet</td></tr>';return;}
    body.innerHTML=certificates.map(c=>`
        <tr>
            <td>${escapeHtml(c.student_name||'Student')}</td>
            <td>${escapeHtml(c.course_title||'')}</td>
            <td>${formatDate(c.created_at)}</td>
            <td><code>${escapeHtml(c.verification_code||c.id||'')}</code></td>
            <td><button class="inst-btn inst-btn-sm inst-btn-outline"><i class="bi bi-download"></i> Download</button></td>
        </tr>
    `).join('');
}

// ─── Analytics ───────────────────────────────────────
function renderAnalytics(){
    const stats=$('#analyticsStats');
    stats.innerHTML=`
        <div class="inst-stat-card"><div class="inst-stat-info"><div class="inst-stat-value">${(analytics.enrollments||0).toLocaleString()}</div><div class="inst-stat-label">Total Enrollments</div></div></div>
        <div class="inst-stat-card"><div class="inst-stat-info"><div class="inst-stat-value">${analytics.completionRate||0}%</div><div class="inst-stat-label">Avg Completion</div></div></div>
        <div class="inst-stat-card"><div class="inst-stat-info"><div class="inst-stat-value">${analytics.avgQuizScore||0}%</div><div class="inst-stat-label">Avg Quiz Score</div></div></div>
        <div class="inst-stat-card"><div class="inst-stat-info"><div class="inst-stat-value">GHS ${(analytics.revenue||0).toLocaleString()}</div><div class="inst-stat-label">Revenue</div></div></div>
    `;
    drawLineChart('enrollCanvas',[analytics.enrollments||0]);
    drawLineChart('completionCanvas',[analytics.completionRate||0]);
    drawBarChart('quizCanvas',['Avg'],[analytics.avgQuizScore||0]);
    drawLineChart('revenueCanvas',[analytics.revenue||0]);
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
    <button type="submit" class="inst-btn inst-btn-primary" style="width:100%;">Create Course</button>
    </form>`;

const forms={course:courseForm};
const titles={course:'Create Course'};

window.openModal=type=>{
    $('#modalTitle').textContent=titles[type]||'Create';
    $('#modalBody').innerHTML=forms[type]||'';
    $('#modalOverlay').classList.add('active');
};
window.openCreateCourse=()=>openModal('course');
window.closeModal=()=>$('#modalOverlay').classList.remove('active');
$('#modalOverlay')?.addEventListener('click',e=>{if(e.target===e.currentTarget)closeModal();});

document.addEventListener('submit',async e=>{
    if(e.target.id==='courseForm'){
        e.preventDefault();
        const data={
            title:$('#mCourseTitle').value,
            description:$('#mCourseDesc').value,
            instructor:$('#mCourseInstructor').value,
            level:$('#mCourseLevel').value,
            category:$('#mCourseCategory').value,
            price:parseFloat($('#mCoursePrice').value)||0
        };
        try{
            await api.createProduct?null:null;
            const token=localStorage.getItem('flower-token');
            const headers={'Content-Type':'application/json'};
            if(token)headers['Authorization']='Bearer '+token;
            const res=await fetch('/api/courses',{method:'POST',headers,body:JSON.stringify(data)});
            if(!res.ok)throw new Error((await res.json()).error||'Failed');
            closeModal();showToast('Course created!','success');
            courses=await api.fetchInstructorCourses();
            renderCourses();renderOverview();
        }catch(err){showToast(err.message||'Failed','error');}
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
    const barW=Math.min(40,(w-60)/(labels.length*1.5));
    const startX=40;const chartH=h-40;
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
    const max=Math.max(...data)*1.1||1;
    const min=Math.min(...data)*0.9||0;
    const range=max-min||1;
    const chartH=h-40;const startX=40;
    const stepX=(w-startX-20)/(data.length-1)||1;
    ctx.strokeStyle='#e5e7eb';ctx.lineWidth=1;
    for(let i=0;i<=4;i++){
        const y=20+chartH*(i/4);
        ctx.beginPath();ctx.moveTo(startX,y);ctx.lineTo(w-10,y);ctx.stroke();
        ctx.fillStyle='#9ca3af';ctx.font='11px Poppins,sans-serif';ctx.textAlign='right';
        ctx.fillText(Math.round(max-range*(i/4)),startX-8,y+4);
    }
    ctx.beginPath();
    data.forEach((v,i)=>{
        const x=startX+i*stepX;const y=20+chartH*(1-(v-min)/range);
        i===0?ctx.moveTo(x,y):ctx.lineTo(x,y);
    });
    ctx.strokeStyle='#d4af37';ctx.lineWidth=2.5;ctx.stroke();
    const grad=ctx.createLinearGradient(0,20,0,20+chartH);
    grad.addColorStop(0,'rgba(212,175,55,0.2)');grad.addColorStop(1,'rgba(212,175,55,0)');
    ctx.lineTo(startX+(data.length-1)*stepX,20+chartH);ctx.lineTo(startX,20+chartH);ctx.closePath();
    ctx.fillStyle=grad;ctx.fill();
    data.forEach((v,i)=>{
        const x=startX+i*stepX;const y=20+chartH*(1-(v-min)/range);
        ctx.beginPath();ctx.arc(x,y,4,0,Math.PI*2);ctx.fillStyle='#d4af37';ctx.fill();
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
