// Instructor Dashboard — wired to real backend APIs
(function(){
const $ = s => document.querySelector(s);
const $$ = s => document.querySelectorAll(s);

let courses=[], lessons=[], quizzes=[], studentsData=[], assignments=[], liveClasses=[], certificates=[], analytics={};
let notificationsData=[], conversationsData=[];
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
$('#notifBtn')?.addEventListener('click',()=>{
    const panel=$('#notifPanel');
    panel.classList.toggle('open');
    if(panel.classList.contains('open')) renderNotifications();
});
document.addEventListener('click',e=>{
    if(!e.target.closest('.inst-notif-panel')&&!e.target.closest('#notifBtn')){
        $('#notifPanel').classList.remove('open');
    }
    if(!e.target.closest('.inst-msg-panel')&&!e.target.closest('#msgBtn')){
        $('#msgPanel').classList.remove('open');
    }
});

const iconColorMap={'green':'39,174,96','gold':'212,175,55','red':'231,76,60','blue':'74,144,217','orange':'251,146,60'};
const txtColorMap={'green':'#27ae60','gold':'#d4af37','red':'#e74c3c','blue':'#4a90d9','orange':'#ea580c'};

async function renderNotifications(){
    // Merge API notifications with derived local items
    const items=[];
    const typeIconMap={
        enrollment:'bi-person-plus',quiz:'bi-pencil-square',assignment:'bi-journal-check',
        certificate:'bi-award',message:'bi-envelope',course:'bi-book',live_class:'bi-camera-video-fill',
        comment:'bi-chat-dots',like:'bi-heart',follow:'bi-person-plus',system:'bi-gear',default:'bi-bell'
    };
    const typeColorMap={
        enrollment:'green',quiz:'blue',assignment:'gold',certificate:'green',message:'blue',
        course:'blue',live_class:'red',comment:'green',like:'red',follow:'green',system:'blue',default:'blue'
    };

    // API notifications (most recent first, up to 20)
    (notificationsData||[]).slice(0,20).forEach(n=>{
        items.push({
            icon:typeIconMap[n.type]||typeIconMap.default,
            text:n.title||n.message||'Notification',
            detail:n.message||'',
            time:n.created_at?timeAgo(n.created_at):'',
            color:typeColorMap[n.type]||typeColorMap.default,
            id:n.id,
            isRead:n.is_read,
            link:n.link||null
        });
    });

    // Derived items from local data (always show)
    const pendingCount=assignments.filter(a=>a.status==='pending').length;
    const activeStudents=studentsData.filter(s=>s.status==='active').length;
    const recentCerts=certificates.filter(c=>{
        if(!c.created_at)return false;
        const diff=Date.now()-new Date(c.created_at).getTime();
        return diff<7*24*60*60*1000;
    }).length;
    const liveNow=liveClasses.filter(c=>c.status==='live'||c.status==='in_progress').length;

    if(liveNow) items.push({icon:'bi-camera-video-fill',text:`${liveNow} live class${liveNow>1?'es':''} in progress`,time:'now',color:'red'});
    if(pendingCount) items.push({icon:'bi-journal-check',text:`${pendingCount} assignment${pendingCount>1?'s':''} to grade`,time:'now',color:'gold'});
    if(activeStudents) items.push({icon:'bi-person-plus',text:`${activeStudents} active student${activeStudents>1?'s':''}`,time:'now',color:'green'});
    if(recentCerts) items.push({icon:'bi-award',text:`${recentCerts} certificate${recentCerts>1?'s':''} issued this week`,time:'now',color:'green'});
    if(courses.length) items.push({icon:'bi-book',text:`${courses.length} course${courses.length>1?'s':''} published`,time:'now',color:'blue'});
    if(!items.length) items.push({icon:'bi-shield-check',text:'System running normally',time:'now',color:'blue'});

    const unreadCount=(notificationsData||[]).filter(n=>!n.is_read).length;
    const badge=$('#notifBtn .inst-badge');
    if(badge) badge.textContent=unreadCount||items.length;
    badge.style.display=(unreadCount||items.length)?'':'none';

    $('#notifList').innerHTML=items.slice(0,15).map(n=>{
        const safeLink=n.link?(n.link.startsWith('/')||n.link.startsWith('http')?n.link.replace(/[<>"'`]/g,''):''):'';
        return `
        <div class="inst-notif-item${n.isRead===false?' unread':''}" ${n.id?`data-notif-id="${n.id}"`:''} ${safeLink?`style="cursor:pointer;" onclick="window.open('${safeLink}','_self')"`:''}>
            <div class="inst-notif-icon" style="background:rgba(${iconColorMap[n.color]||iconColorMap.blue},.1);color:${txtColorMap[n.color]||txtColorMap.blue};">
                <i class="bi ${n.icon}"></i>
            </div>
            <div><div>${escapeHtml(n.text)}</div>${n.detail?`<div style="font-size:.7rem;color:var(--text-light);margin-top:.15rem;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;max-width:220px;">${escapeHtml(n.detail)}</div>`:''}<div style="font-size:.7rem;color:var(--text-light);margin-top:.2rem;">${n.time}</div></div>
        </div>
    `}).join('');
}
window.clearNotifications=async()=>{
    try{await api.markAllRead();notificationsData.forEach(n=>n.is_read=true);}catch{}
    renderNotifications();
};

// ─── Messages ─────────────────────────────────────────
$('#msgBtn')?.addEventListener('click',()=>{
    const panel=$('#msgPanel');
    panel.classList.toggle('open');
    if(panel.classList.contains('open')) renderMessages();
});
async function renderMessages(){
    const unreadTotal=(conversationsData||[]).reduce((s,c)=>s+(parseInt(c.unread_count)||0),0);
    const badge=$('#msgBtn .inst-badge');
    if(badge) badge.textContent=unreadTotal||conversationsData.length;
    badge.style.display=(unreadTotal||conversationsData.length)?'':'none';

    const list=$('#msgList');
    if(!conversationsData||!conversationsData.length){
        list.innerHTML='<div style="text-align:center;padding:2rem;color:var(--text-light);font-size:.85rem;"><i class="bi bi-envelope" style="font-size:1.5rem;display:block;margin-bottom:.5rem;"></i>No messages yet</div>';
        return;
    }
    list.innerHTML=conversationsData.slice(0,10).map(c=>`
        <div class="inst-notif-item" style="cursor:pointer;" onclick="openConversation('${c.id}','${escapeHtml(c.other_name||'User')}')">
            <div class="inst-notif-icon" style="background:rgba(74,144,217,.1);color:#4a90d9;">
                <i class="bi bi-person-circle"></i>
            </div>
            <div style="flex:1;min-width:0;">
                <div style="display:flex;justify-content:space-between;align-items:center;">
                    <span style="font-weight:500;font-size:.85rem;">${escapeHtml(c.other_name||'User')}</span>
                    ${c.unread_count>0?`<span style="background:var(--primary-color);color:#fff;border-radius:50%;width:18px;height:18px;display:flex;align-items:center;justify-content:center;font-size:.65rem;font-weight:600;">${c.unread_count}</span>`:''}
                </div>
                <div style="font-size:.8rem;color:var(--text-light);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${escapeHtml(c.last_message||'No messages')}</div>
                <div style="font-size:.7rem;color:var(--text-light);margin-top:.15rem;">${c.last_message_at?timeAgo(c.last_message_at):''}</div>
            </div>
        </div>
    `).join('');
}
window.openConversation=async(id,name)=>{
    $('#msgPanel').classList.remove('open');
    try{
        const msgs=await api.fetchMessages(id);
        const msgsHtml=(Array.isArray(msgs)?msgs:[]).map(m=>`
            <div style="margin-bottom:.75rem;${m.sender_id==getCurrentUserId()?'text-align:right;':''}">
                <div style="display:inline-block;max-width:80%;padding:.5rem .75rem;border-radius:12px;font-size:.85rem;${m.sender_id==getCurrentUserId()?'background:var(--primary-color);color:#fff;border-bottom-right-radius:4px;':'background:var(--bg-main);border-bottom-left-radius:4px;'}">${escapeHtml(m.content||'')}</div>
                <div style="font-size:.65rem;color:var(--text-light);margin-top:.2rem;">${m.created_at?timeAgo(m.created_at):''}</div>
            </div>
        `).join('');
        $('#modalTitle').textContent=`Messages — ${name}`;
        $('#modalBody').innerHTML=`
            <div id="convMessages" style="max-height:300px;overflow-y:auto;padding:.5rem 0;">${msgsHtml||'<p style="text-align:center;color:var(--text-light);">No messages yet</p>'}</div>
            <form id="sendMsgForm" style="display:flex;gap:.5rem;margin-top:.75rem;">
                <input id="msgInput" type="text" placeholder="Type a message..." style="flex:1;padding:.5rem .75rem;border:1px solid var(--border-color);border-radius:8px;font-size:.85rem;" required>
                <button type="submit" class="inst-btn inst-btn-primary"><i class="bi bi-send"></i></button>
            </form>`;
        $('#modalOverlay').classList.add('active');
        const convEl=$('#convMessages');
        if(convEl) convEl.scrollTop=convEl.scrollHeight;
        document.getElementById('sendMsgForm').addEventListener('submit',async e=>{
            e.preventDefault();
            const input=$('#msgInput');
            const content=input.value.trim();
            if(!content)return;
            try{
                await api.sendMessage(id,content);
                input.value='';
                const newMsg=document.createElement('div');
                newMsg.style.cssText='margin-bottom:.75rem;text-align:right;';
                newMsg.innerHTML=`<div style="display:inline-block;max-width:80%;padding:.5rem .75rem;border-radius:12px;font-size:.85rem;background:var(--primary-color);color:#fff;border-bottom-right-radius:4px;">${escapeHtml(content)}</div><div style="font-size:.65rem;color:var(--text-light);margin-top:.2rem;">just now</div>`;
                convEl.appendChild(newMsg);
                convEl.scrollTop=convEl.scrollHeight;
            }catch(err){showToast('Failed to send','error');}
        });
    }catch(err){showToast('Failed to load messages','error');}
};

// ─── Init ────────────────────────────────────────────
async function init(){
    const role=getCurrentUserRole();
    if(!['INSTRUCTOR','ADMIN','SUPERADMIN'].includes(role)){
        document.querySelector('.inst-content').innerHTML='<div style="text-align:center;padding:4rem;"><h2>Access Denied</h2><p>You need instructor privileges to access this dashboard.</p><p style="color:var(--text-light);margin:1rem 0;">Apply to become an instructor first.</p><a href="instructor-apply.html" class="inst-btn inst-btn-primary" style="margin:0.5rem;">Apply as Instructor</a><a href="/" class="inst-btn inst-btn-outline" style="margin:0.5rem;">Go Home</a></div>';
        return;
    }

    // Check application status for INSTRUCTOR role
    if(role==='INSTRUCTOR'){
        try{
            const token=localStorage.getItem('flower-token');
            const res=await fetch('/api/instructor/my-application',{
                headers:{'Authorization':'Bearer '+token,'X-Requested-With':'XMLHttpRequest'}
            });
            if(res.ok){
                const app=await res.json();
                if(app&&app.status==='rejected'){
                    document.querySelector('.inst-content').innerHTML=`<div style="text-align:center;padding:4rem;"><h2>Application Not Approved</h2><p>Your instructor application was not approved.</p>${app.rejection_reason?`<p style="color:var(--text-light);margin:1rem 0;"><strong>Reason:</strong> ${escapeHtml(app.rejection_reason)}</p>`:''}<a href="instructor-apply.html" class="inst-btn inst-btn-primary" style="margin:0.5rem;">Reapply</a><a href="/" class="inst-btn inst-btn-outline" style="margin:0.5rem;">Go Home</a></div>`;
                    return;
                }
                if(app&&app.status==='needs_info'){
                    document.querySelector('.inst-content').innerHTML=`<div style="text-align:center;padding:4rem;"><h2>More Information Needed</h2><p>Your application requires additional information.</p>${app.rejection_reason?`<p style="color:var(--text-light);margin:1rem 0;"><strong>Details:</strong> ${escapeHtml(app.rejection_reason)}</p>`:''}<a href="instructor-apply.html" class="inst-btn inst-btn-primary" style="margin:0.5rem;">Update Application</a><a href="/" class="inst-btn inst-btn-outline" style="margin:0.5rem;">Go Home</a></div>`;
                    return;
                }
            }
        }catch{}
    }
    const results=await Promise.allSettled([
        api.fetchInstructorCourses(),
        api.fetchLessons(),
        api.fetchQuizzes(),
        api.fetchInstructorStudents(),
        api.fetchInstructorAssignments(),
        api.fetchInstructorLiveClasses(),
        api.fetchInstructorCertificates(),
        api.fetchInstructorAnalytics(),
        api.fetchNotifications(),
        api.fetchConversations()
    ]);
    courses=results[0].status==='fulfilled'?results[0].value:[];
    lessons=results[1].status==='fulfilled'?results[1].value:[];
    quizzes=results[2].status==='fulfilled'?results[2].value:[];
    studentsData=results[3].status==='fulfilled'?results[3].value:[];
    assignments=results[4].status==='fulfilled'?results[4].value:[];
    liveClasses=results[5].status==='fulfilled'?results[5].value:[];
    certificates=results[6].status==='fulfilled'?results[6].value:[];
    analytics=results[7].status==='fulfilled'?results[7].value:{};
    notificationsData=results[8].status==='fulfilled'?results[8].value:[];
    conversationsData=results[9].status==='fulfilled'?results[9].value:[];

    const failed=results.filter(r=>r.status==='rejected').length;
    if(failed===results.length) showToast('Backend unreachable','error');
    else if(failed>=3) showToast(`Partial outage — ${failed} data sources failed`,'error');

    renderOverview();
    renderNotifications();
    loadUserProfile();
}

// ─── Load User Profile ─────────────────────────────────
async function loadUserProfile(){
    try{
        const token=localStorage.getItem('flower-token');
        const res=await fetch('/api/auth/me',{headers:{'Authorization':'Bearer '+token}});
        if(!res.ok) return;
        const user=await res.json();
        const name=user.name||user.first_name||user.email||'Instructor';
        const initial=(name[0]||'I').toUpperCase();
        $('#instName').textContent=name;
        $('#headerName').textContent=name;
        $('#welcomeName').textContent=name;
        $('#headerAvatar').textContent=initial;
        $('#instAvatar').textContent=initial;
        $('#settingsName').value=user.name||user.first_name||'';
        $('#settingsEmail').value=user.email||'';
        $('#settingsBio').value=user.bio||user.description||'';
        $('#settingsSpecialty').value=user.specialty||user.expertise||'';
    }catch{}
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

    // Performance chart
    const perfData=courses.map(c=>Number(c.enrolled_count||c.students||c.students_count)||0);
    drawBarChart('perfCanvas',courses.map(c=>(c.title||'').slice(0,12)),perfData.length?perfData:[0]);
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
window.editCourse=id=>{
    const c=courses.find(x=>String(x.id)===String(id));
    if(!c)return;
    const form=`<form id="editCourseForm">
    <div class="inst-form-group"><label>Title *</label><input id="ecTitle" value="${escapeHtml(c.title||'')}" required></div>
    <div class="inst-form-group"><label>Description</label><textarea id="ecDesc" rows="3">${escapeHtml(c.description||'')}</textarea></div>
    <div class="inst-form-group"><label>Level</label><select id="ecLevel"><option${c.level==='Beginner'?' selected':''}>Beginner</option><option${c.level==='Intermediate'?' selected':''}>Intermediate</option><option${c.level==='Advanced'?' selected':''}>Advanced</option></select></div>
    <div class="inst-form-group"><label>Category</label><input id="ecCategory" value="${escapeHtml(c.category||'')}"></div>
    <div class="inst-form-group"><label>Price ($)</label><input id="ecPrice" type="number" step="0.01" min="0" value="${c.price||0}"></div>
    <button type="submit" class="inst-btn inst-btn-primary" style="width:100%;">Save Changes</button>
    </form>`;
    $('#modalTitle').textContent='Edit Course';
    $('#modalBody').innerHTML=form;
    $('#modalOverlay').classList.add('active');
    document.getElementById('editCourseForm').addEventListener('submit',async e=>{
        e.preventDefault();
        try{
            const token=localStorage.getItem('flower-token');
            const headers={'Content-Type':'application/json'};
            if(token)headers['Authorization']='Bearer '+token;
            const res=await fetch('/api/courses/'+id,{method:'PUT',headers,body:JSON.stringify({
                title:$('#ecTitle').value,description:$('#ecDesc').value,level:$('#ecLevel').value,
                category:$('#ecCategory').value,price:parseFloat($('#ecPrice').value)||0
            })});
            if(!res.ok)throw new Error((await res.json()).error||'Failed');
            closeModal();showToast('Course updated!','success');
            courses=await api.fetchInstructorCourses();renderCourses();renderOverview();
        }catch(err){showToast(err.message||'Failed','error');}
    });
};
window.manageCourse=id=>{
    const c=courses.find(x=>String(x.id)===String(id));
    if(!c)return;
    const enrolled=c.enrolled_count||c.students||c.students_count||0;
    const body=`<div style="margin-bottom:1rem;">
        <h4 style="margin-bottom:.5rem;">${escapeHtml(c.title)}</h4>
        <p style="font-size:.85rem;color:var(--text-light);">${enrolled} students enrolled · ${c.level||'All levels'}</p>
    </div>
    <div class="inst-form-group"><label>Lessons</label><div style="font-size:.9rem;">${lessons.filter(l=>l.course_id===c.id||l.courseId===c.id).length} lessons</div></div>
    <div class="inst-form-group"><label>Quizzes</label><div style="font-size:.9rem;">${quizzes.filter(q=>q.course_id===c.id||q.courseId===c.id).length} quizzes</div></div>
    <div style="display:flex;gap:.75rem;margin-top:1.5rem;">
        <button class="inst-btn inst-btn-outline" onclick="editCourse('${c.id}')" style="flex:1;"><i class="bi bi-pencil"></i> Edit</button>
        <button class="inst-btn inst-btn-danger" onclick="deleteCourse('${c.id}')" style="flex:1;"><i class="bi bi-trash"></i> Delete</button>
    </div>`;
    $('#modalTitle').textContent='Manage Course';
    $('#modalBody').innerHTML=body;
    $('#modalOverlay').classList.add('active');
};
window.deleteCourse=async id=>{
    if(!confirm('Are you sure you want to delete this course?'))return;
    try{
        const token=localStorage.getItem('flower-token');
        const headers={};
        if(token)headers['Authorization']='Bearer '+token;
        const res=await fetch('/api/courses/'+id,{method:'DELETE',headers});
        if(!res.ok)throw new Error((await res.json()).error||'Failed');
        closeModal();showToast('Course deleted!','success');
        courses=await api.fetchInstructorCourses();renderCourses();renderOverview();
    }catch(err){showToast(err.message||'Failed','error');}
};

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
let resourcesData=[],resourceFilter='all';
async function renderResources(){
    if(!resourcesData.length){
        try{
            const res=await api.fetchResources();
            resourcesData=Array.isArray(res)?res:(res.resources||[]);
        }catch{resourcesData=[];}
    }
    const grid=$('#resourcesGrid');
    const filtered=resourceFilter==='all'?resourcesData:resourcesData.filter(r=>r.type===resourceFilter);
    if(!filtered.length){grid.innerHTML='<p style="color:var(--text-light);font-size:.85rem;padding:1rem;grid-column:1/-1;">No resources found. Upload your first resource to get started.</p>';return;}
    const iconMap={video:'bi-camera-video',pdf:'bi-file-earmark-pdf',image:'bi-image',template:'bi-file-earmark-text',document:'bi-file-earmark',default:'bi-folder'};
    grid.innerHTML=filtered.map(r=>{
        const icon=iconMap[r.type]||iconMap.default;
        return `<div class="inst-resource-card">
            <i class="bi ${icon}"></i>
            <h4>${escapeHtml(r.title||r.name||'Untitled')}</h4>
            <p>${escapeHtml(r.course_title||r.course||'')}</p>
            <p style="font-size:.7rem;margin-top:.25rem;">${formatDate(r.created_at)}</p>
        </div>`;
    }).join('');
}
$$('.inst-tab[data-rtype]').forEach(t=>t.addEventListener('click',()=>{
    $$('.inst-tab[data-rtype]').forEach(x=>x.classList.remove('active'));
    t.classList.add('active');
    resourceFilter=t.dataset.rtype;
    renderResources();
}));
window.openResourceUpload=()=>{
    const form=`<form id="resourceForm">
    <div class="inst-form-group"><label>Title *</label><input id="resTitle" required></div>
    <div class="inst-form-group"><label>Type</label><select id="resType"><option value="video">Video</option><option value="pdf">PDF</option><option value="image">Image</option><option value="template">Template</option><option value="document">Document</option></select></div>
    <div class="inst-form-group"><label>Course</label><select id="resCourse"><option value="">Select course...</option>${courses.map(c=>`<option value="${c.id}">${escapeHtml(c.title)}</option>`).join('')}</select></div>
    <div class="inst-form-group"><label>File</label><input type="file" id="resFile"></div>
    <div class="inst-form-group"><label>Description</label><textarea id="resDesc" rows="2"></textarea></div>
    <button type="submit" class="inst-btn inst-btn-primary" style="width:100%;">Upload Resource</button>
    </form>`;
    $('#modalTitle').textContent='Upload Resource';
    $('#modalBody').innerHTML=form;
    $('#modalOverlay').classList.add('active');
    document.getElementById('resourceForm').addEventListener('submit',async e=>{
        e.preventDefault();
        const file=$('#resFile').files[0];
        if(!file){showToast('Please select a file','error');return;}
        try{
            const token=localStorage.getItem('flower-token');
            const fd=new FormData();
            fd.append('title',$('#resTitle').value);
            fd.append('type',$('#resType').value);
            fd.append('course_id',$('#resCourse').value);
            fd.append('description',$('#resDesc').value);
            fd.append('file',file);
            const headers={};
            if(token)headers['Authorization']='Bearer '+token;
            const res=await fetch('/api/resources',{method:'POST',headers,body:fd});
            if(!res.ok)throw new Error((await res.json()).error||'Failed');
            closeModal();showToast('Resource uploaded!','success');
            resourcesData=[];
            renderResources();
        }catch(err){showToast(err.message||'Failed','error');}
    });
};

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
window.saveSettings=async()=>{
    const displayName=$('#settingsName').value;
    const email=$('#settingsEmail').value;
    const bio=$('#settingsBio').value;
    const specialty=$('#settingsSpecialty').value;
    try{
        const res=await api.updateProfile({name:displayName,email,bio,specialty});
        if(displayName){$('#welcomeName').textContent=displayName;$('#instName').textContent=displayName;$('#headerName').textContent=displayName;}
        showToast('Settings saved!','success');
    }catch(err){
        showToast('Failed to save settings: '+(err.message||'Unknown error'),'error');
    }
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
    const safeData=data.map(v=>Number.isFinite(v)?v:0);
    const max=Math.max(...safeData)*1.1||1;
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
    safeData.forEach((v,i)=>{
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
    const safeData=data.map(v=>Number.isFinite(v)?v:0);
    const max=Math.max(...safeData)*1.1||1;
    const min=Math.min(...safeData)*0.9||0;
    const range=max-min||1;
    const chartH=h-40;const startX=40;
    const stepX=(w-startX-20)/(safeData.length-1)||1;
    ctx.strokeStyle='#e5e7eb';ctx.lineWidth=1;
    for(let i=0;i<=4;i++){
        const y=20+chartH*(i/4);
        ctx.beginPath();ctx.moveTo(startX,y);ctx.lineTo(w-10,y);ctx.stroke();
        ctx.fillStyle='#9ca3af';ctx.font='11px Poppins,sans-serif';ctx.textAlign='right';
        ctx.fillText(Math.round(max-range*(i/4)),startX-8,y+4);
    }
    ctx.beginPath();
    safeData.forEach((v,i)=>{
        const x=startX+i*stepX;const y=20+chartH*(1-(v-min)/range);
        i===0?ctx.moveTo(x,y):ctx.lineTo(x,y);
    });
    ctx.strokeStyle='#d4af37';ctx.lineWidth=2.5;ctx.stroke();
    const grad=ctx.createLinearGradient(0,20,0,20+chartH);
    grad.addColorStop(0,'rgba(212,175,55,0.2)');grad.addColorStop(1,'rgba(212,175,55,0)');
    ctx.lineTo(startX+(safeData.length-1)*stepX,20+chartH);ctx.lineTo(startX,20+chartH);ctx.closePath();
    ctx.fillStyle=grad;ctx.fill();
    safeData.forEach((v,i)=>{
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

// ─── Resize Charts ───────────────────────────────────
let resizeTimer;
window.addEventListener('resize',()=>{
    clearTimeout(resizeTimer);
    resizeTimer=setTimeout(()=>{
        const active=$('.inst-section.active');
        if(active&&active.id==='sec-analytics') renderAnalytics();
        if(active&&active.id==='sec-overview'){
            const perfCanvas=$('#perfCanvas');
            if(perfCanvas){
                const data=courses.map(c=>Number(c.enrolled_count||c.students||c.students_count)||0);
                drawBarChart('perfCanvas',courses.map(c=>c.title?.slice(0,12)||''),data.length?data:[0]);
            }
        }
    },250);
});

init();
})();
