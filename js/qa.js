// js/qa.js
// Questions & Answers — listing, detail, ask, answers, voting

let currentCategory = '';
let currentSort = 'newest';
let currentPage = 1;
let totalPages = 1;

function formatNumber(n) { return n >= 1000 ? (n / 1000).toFixed(1) + 'K' : String(n); }

function isExpert(role) { return ['FLORIST', 'INSTRUCTOR', 'ADMIN', 'SUPERADMIN'].includes((role || '').toUpperCase()); }

// ─── Q&A Listing Page ─────────────────────────────────────────────────────

async function initQAPage() {
    loadCategories();
    loadStats();
    loadQuestions();

    document.getElementById('qaSearchBtn')?.addEventListener('click', () => { currentPage = 1; loadQuestions(); });
    document.getElementById('qaSearch')?.addEventListener('keydown', (e) => { if (e.key === 'Enter') { currentPage = 1; loadQuestions(); } });

    document.getElementById('categoryTabs')?.addEventListener('click', (e) => {
        const tab = e.target.closest('.category-tab');
        if (!tab) return;
        document.querySelectorAll('.category-tab').forEach(t => t.classList.remove('active'));
        tab.classList.add('active');
        currentCategory = tab.dataset.slug || '';
        currentPage = 1;
        loadQuestions();
    });

    document.getElementById('sortTabs')?.addEventListener('click', (e) => {
        const tab = e.target.closest('.sort-tab');
        if (!tab) return;
        document.querySelectorAll('.sort-tab').forEach(t => t.classList.remove('active'));
        tab.classList.add('active');
        currentSort = tab.dataset.sort;
        currentPage = 1;
        loadQuestions();
    });
}

async function loadCategories() {
    let cats;
    try { cats = await fetch('/api/qa/categories').then(r => r.json()); } catch { cats = []; }
    const tabs = document.getElementById('categoryTabs');
    if (!tabs) return;
    tabs.innerHTML = `<button class="category-tab active" data-slug="">All Questions</button>` +
        cats.map(c => `<button class="category-tab" data-slug="${escapeHtml(c.slug || '')}">${c.icon || ''} ${escapeHtml(c.name)}</button>`).join('');
}

async function loadStats() {
    try {
        const stats = await fetch('/api/qa/stats').then(r => r.json());
        const statsRow = document.getElementById('statsRow');
        if (statsRow) statsRow.innerHTML = `
            <div class="stat-card"><div class="num">${formatNumber(stats.questions)}</div><div class="label">Questions</div></div>
            <div class="stat-card"><div class="num">${formatNumber(stats.answers)}</div><div class="label">Answers</div></div>
            <div class="stat-card"><div class="num">${stats.experts}</div><div class="label">Experts</div></div>
            <div class="stat-card"><div class="num">${stats.answer_rate}%</div><div class="label">Answer Rate</div></div>
        `;
    } catch {}
}

async function loadQuestions() {
    const searchEl = document.getElementById('qaSearch');
    const search = searchEl ? searchEl.value.trim() : '';
    const params = new URLSearchParams({ sort: currentSort, page: currentPage, limit: 20 });
    if (currentCategory) params.set('category', currentCategory);
    if (search) params.set('search', search);

    let data;
    try { data = await fetch(`/api/qa/questions?${params}`).then(r => r.json()); } catch { data = { questions: [], total: 0, pages: 1 }; }

    const el = document.getElementById('questionsList');
    if (!el) return;
    if (!data.questions || !data.questions.length) { el.innerHTML = '<div class="empty-state"><i class="bi bi-question-circle"></i><h3>No questions found</h3><p>Be the first to ask!</p></div>'; document.getElementById('pagination').innerHTML = ''; return; }

    totalPages = data.pages || 1;
    el.innerHTML = data.questions.map(q => `
        <div class="question-card${q.is_solved ? ' solved' : ''}" onclick="window.location.href='question-detail.html?id=${escapeHtml(String(q.id))}'">
            <div class="q-header">
                <div class="q-votes"><div class="num">${q.upvotes || 0}</div><div class="label">votes</div></div>
                <div class="q-answers ${q.has_accepted ? 'has-accepted' : ''}"><div class="num">${q.answer_count || 0}</div><div class="label">${q.has_accepted ? '✓ solved' : 'answers'}</div></div>
                <div class="q-body">
                    <div class="q-title">
                        ${q.is_solved ? '<span class="solved-badge">Solved</span>' : ''}
                        ${escapeHtml(q.title)}
                    </div>
                    <div class="q-excerpt">${escapeHtml(q.excerpt || '')}</div>
                    <div class="q-meta">
                        <span><i class="bi bi-person"></i> ${escapeHtml(q.author_name || 'Anonymous')} ${isExpert(q.author_role) ? '<span class="expert-badge">Expert</span>' : ''}</span>
                        <span><i class="bi bi-tag"></i> ${escapeHtml(q.category_name || 'General')}</span>
                        <span><i class="bi bi-eye"></i> ${formatNumber(q.views || 0)}</span>
                        <span><i class="bi bi-clock"></i> ${timeAgo(q.created_at)}</span>
                    </div>
                </div>
            </div>
        </div>
    `).join('');

    renderPagination();
}

function renderPagination() {
    const el = document.getElementById('pagination');
    if (totalPages <= 1) { el.innerHTML = ''; return; }
    let html = '';
    if (currentPage > 1) html += `<button class="page-btn" onclick="goToPage(${currentPage - 1})"><i class="bi bi-chevron-left"></i></button>`;
    for (let i = 1; i <= totalPages; i++) {
        if (totalPages > 7 && i > 3 && i < totalPages - 2 && Math.abs(i - currentPage) > 1) {
            if (i === 4 || i === totalPages - 3) html += `<span style="padding:0.4rem 0.3rem;color:var(--text-muted)">...</span>`;
            continue;
        }
        html += `<button class="page-btn${i === currentPage ? ' active' : ''}" onclick="goToPage(${i})">${i}</button>`;
    }
    if (currentPage < totalPages) html += `<button class="page-btn" onclick="goToPage(${currentPage + 1})"><i class="bi bi-chevron-right"></i></button>`;
    el.innerHTML = html;
}

function goToPage(p) { currentPage = p; loadQuestions(); window.scrollTo({ top: 0, behavior: 'smooth' }); }

// ─── Question Detail Page ─────────────────────────────────────────────────

async function initQuestionDetail() {
    const params = new URLSearchParams(window.location.search);
    const id = params.get('id');
    if (!id) { document.getElementById('questionContent').innerHTML = '<div class="empty-state"><h3>Question not found</h3></div>'; return; }

    let question;
    try { question = await fetch(`/api/qa/questions/${id}`, { headers: authHeaders() }).then(r => r.json()); } catch { question = null; }
    if (!question || question.error) { document.getElementById('questionContent').innerHTML = '<div class="empty-state"><i class="bi bi-question-circle"></i><h3>Question not found</h3></div>'; return; }

    document.title = `${question.title} | Flower Ecosystem`;
    const answers = question.answers || [];
    const images = question.images || [];

    document.getElementById('questionContent').innerHTML = `
        <div class="detail-layout">
            <div class="detail-main">
                <div class="question-card">
                    <div class="q-header">
                        <div class="q-vote">
                            <button onclick="voteQuestion('${question.id}', 'up')"><i class="bi bi-arrow-up"></i></button>
                            <span class="count" id="qVoteCount">${question.upvotes || 0}</span>
                            <button onclick="voteQuestion('${question.id}', 'down')"><i class="bi bi-arrow-down"></i></button>
                        </div>
                        <div style="flex:1;">
                            <div class="q-title">${question.is_solved ? '<span class="solved">Solved</span>' : ''} ${escapeHtml(question.title)}</div>
                            <div class="q-meta">
                                <span><i class="bi bi-person"></i> ${escapeHtml(question.author_name || 'Anonymous')} ${isExpert(question.author_role) ? '<span class="expert-badge">Expert</span>' : ''}</span>
                                <span><i class="bi bi-tag"></i> ${escapeHtml(question.category_name || 'General')}</span>
                                <span><i class="bi bi-eye"></i> ${formatNumber(question.views || 0)} views</span>
                                <span><i class="bi bi-clock"></i> ${timeAgo(question.created_at)}</span>
                            </div>
                            <div class="q-content">${escapeHtml(question.content)}</div>
                            ${images.length ? `<div class="q-images">${images.map(img => `<img src="${escapeHtml(img.image_url)}" alt="${escapeHtml(img.caption || '')}" loading="lazy">`).join('')}</div>` : ''}
                        </div>
                    </div>
                </div>

                <div class="answers-header">
                    <h2 style="font-size:1.1rem;">${answers.length} ${answers.length === 1 ? 'Answer' : 'Answers'}</h2>
                </div>

                <div id="answersList">
                    ${answers.map(a => `
                        <div class="answer-card${a.is_accepted ? ' accepted' : ''}" id="answer-${a.id}">
                            <div class="a-header">
                                <div class="a-author">
                                    <div class="a-avatar">${a.author_avatar ? `<img src="${escapeHtml(a.author_avatar)}" alt="">` : (a.author_name || 'A')[0].toUpperCase()}</div>
                                    <div>
                                        <div class="a-name">${escapeHtml(a.author_name || 'Anonymous')} ${isExpert(a.author_role) ? '<span class="expert-badge">Expert</span>' : ''}</div>
                                        <div class="a-role">${timeAgo(a.created_at)}</div>
                                    </div>
                                </div>
                                ${a.is_accepted ? '<span class="accepted-badge"><i class="bi bi-check-circle-fill"></i> Best Answer</span>' : ''}
                            </div>
                            <div class="a-content">${escapeHtml(a.content)}</div>
                            <div class="a-footer">
                                <button onclick="voteAnswer('${a.id}', 'up')"><i class="bi bi-arrow-up"></i> Helpful</button>
                                <span style="font-weight:600;">${a.vote_count || 0}</span>
                                ${question.user_id === getCurrentUserId() && !a.is_accepted ? `<button onclick="acceptAnswer('${question.id}', '${a.id}')" style="color:var(--accent-green);"><i class="bi bi-check-circle"></i> Accept</button>` : ''}
                            </div>
                        </div>
                    `).join('')}
                </div>

                <div class="reply-box" id="replyBox">
                    <h3 style="font-size:0.95rem;margin-bottom:0.75rem;">Your Answer</h3>
                    ${userLoggedIn() ? `
                        <textarea id="answerContent" placeholder="Write your answer..."></textarea>
                        <div style="display:flex;justify-content:flex-end;margin-top:0.75rem;">
                            <button class="btn btn-primary btn-sm" onclick="submitAnswer('${question.id}')"><i class="bi bi-send"></i> Submit Answer</button>
                        </div>
                    ` : '<div class="login-prompt"><a href="#" onclick="openAuthModal(\'login\');return false;">Sign in</a> to answer this question.</div>'}
                </div>
            </div>

            <div class="detail-sidebar">
                <div class="sidebar-card">
                    <h3><i class="bi bi-trophy" style="color:var(--accent-gold)"></i> Top Experts</h3>
                    <div id="leaderboard"></div>
                </div>
            </div>
        </div>
    `;

    loadLeaderboard();
}

async function submitAnswer(questionId) {
    const content = document.getElementById('answerContent').value.trim();
    if (!content) return;
    try {
        await fetch(`/api/qa/questions/${questionId}/answers`, { method: 'POST', headers: authHeaders(), body: JSON.stringify({ content }) });
        window.location.reload();
    } catch {}
}

async function acceptAnswer(questionId, answerId) {
    if (!confirm('Accept this as the best answer?')) return;
    try {
        await fetch(`/api/qa/questions/${questionId}/accept`, { method: 'PUT', headers: authHeaders(), body: JSON.stringify({ answer_id: answerId }) });
        window.location.reload();
    } catch {}
}

async function voteAnswer(answerId, voteType) {
    if (!userLoggedIn()) { openAuthModal('login'); return; }
    try {
        await fetch(`/api/qa/answers/${answerId}/vote`, { method: 'POST', headers: authHeaders(), body: JSON.stringify({ vote_type: voteType }) });
        window.location.reload();
    } catch {}
}

function userLoggedIn() { return !!localStorage.getItem('flower-token'); }

async function loadLeaderboard() {
    try {
        const leaders = await fetch('/api/qa/leaderboard').then(r => r.json());
        const el = document.getElementById('leaderboard');
        if (!leaders.length) { el.innerHTML = '<p style="color:var(--text-light);font-size:0.82rem;">No experts yet</p>'; return; }
        el.innerHTML = leaders.slice(0, 5).map((l, i) => `
            <div class="leaderboard-item">
                <span class="leaderboard-rank">${i + 1}</span>
                <span>${escapeHtml(l.name)}</span>
                <span class="leaderboard-score">${l.points} pts</span>
            </div>
        `).join('');
    } catch {}
}

// ─── Ask Question Page ────────────────────────────────────────────────────

async function initAskQuestion() {
    if (!localStorage.getItem('flower-token')) { window.location.href = 'login.html?redirect=ask-question.html'; return; }

    let cats;
    try { cats = await fetch('/api/qa/categories').then(r => r.json()); } catch { cats = []; }
    const select = document.getElementById('qCategory');
    cats.forEach(c => { const opt = document.createElement('option'); opt.value = c.id; opt.textContent = `${c.icon || ''} ${c.name}`; select.appendChild(opt); });

    let uploadedFiles = [];
    const uploadArea = document.getElementById('uploadArea');
    const fileInput = document.getElementById('fileInput');
    uploadArea.addEventListener('click', () => fileInput.click());
    uploadArea.addEventListener('dragover', (e) => { e.preventDefault(); uploadArea.classList.add('dragover'); });
    uploadArea.addEventListener('dragleave', () => uploadArea.classList.remove('dragover'));
    uploadArea.addEventListener('drop', (e) => { e.preventDefault(); uploadArea.classList.remove('dragover'); handleFiles(e.dataTransfer.files); });
    fileInput.addEventListener('change', (e) => handleFiles(e.target.files));

    function handleFiles(files) {
        const grid = document.getElementById('previewGrid');
        Array.from(files).forEach(file => {
            if (file.size > 5 * 1024 * 1024 || !file.type.startsWith('image/') || uploadedFiles.length >= 5) return;
            uploadedFiles.push(file);
            const reader = new FileReader();
            reader.onload = (e) => {
                const div = document.createElement('div');
                div.className = 'preview-item';
                const idx = uploadedFiles.length - 1;
                div.innerHTML = `<img src="${e.target.result}" alt="Preview"><button class="preview-remove" onclick="this.parentElement.remove();uploadedFiles.splice(${idx},1);"><i class="bi bi-x"></i></button>`;
                grid.appendChild(div);
            };
            reader.readAsDataURL(file);
        });
    }

    document.getElementById('askForm').addEventListener('submit', async (e) => {
        e.preventDefault();
        const title = document.getElementById('qTitle').value.trim();
        const content = document.getElementById('qContent').value.trim();
        const errorMsg = document.getElementById('errorMsg');
        const submitBtn = document.getElementById('submitBtn');
        if (!title || !content) { errorMsg.textContent = 'Title and details are required'; errorMsg.style.display = 'block'; return; }

        submitBtn.disabled = true;
        submitBtn.innerHTML = '<span class="auth-spinner" style="margin-right:0.5rem;"></span> Posting...';

        const formData = new FormData();
        formData.append('title', title);
        formData.append('content', content);
        formData.append('category_id', document.getElementById('qCategory').value);
        uploadedFiles.forEach(f => formData.append('images', f));

        try {
            const res = await fetch('/api/qa/questions', { method: 'POST', headers: { 'Authorization': 'Bearer ' + localStorage.getItem('flower-token') }, body: formData });
            if (!res.ok) { const err = await res.json(); throw new Error(err.error || 'Failed'); }
            const data = await res.json();
            window.location.href = `question-detail.html?id=${data.id}`;
        } catch (err) {
            errorMsg.textContent = err.message || 'Failed to post question';
            errorMsg.style.display = 'block';
            submitBtn.disabled = false;
            submitBtn.innerHTML = '<i class="bi bi-send"></i> Post Question';
        }
    });
}
