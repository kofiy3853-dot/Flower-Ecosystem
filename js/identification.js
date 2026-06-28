// js/identification.js
// Flower Identification pages — listing, detail

let currentCategory = '';
let currentSearch = '';

// ─── Identification Listing Page ──────────────────────────────────────────

async function initIdentificationPage() {
    loadCategories();
    loadTopics();

    document.getElementById('idSearchBtn')?.addEventListener('click', () => loadTopics());
    document.getElementById('idSearch')?.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') loadTopics();
    });

    document.getElementById('categoryTabs')?.addEventListener('click', (e) => {
        const tab = e.target.closest('.category-tab');
        if (!tab) return;
        document.querySelectorAll('.category-tab').forEach(t => t.classList.remove('active'));
        tab.classList.add('active');
        currentCategory = tab.dataset.slug || '';
        loadTopics();
    });
}

async function loadCategories() {
    let categories;
    try {
        const res = await fetch('/api/identification/categories');
        categories = await res.json();
    } catch {
        categories = [];
    }
    const tabs = document.getElementById('categoryTabs');
    if (!tabs) return;
    tabs.innerHTML = `<button class="category-tab active" data-slug="">All Topics</button>` +
        categories.map(c => `<button class="category-tab" data-slug="${escapeHtml(c.slug || '')}">${c.icon || ''} ${escapeHtml(c.name)}</button>`).join('');
}

async function loadTopics() {
    const searchEl = document.getElementById('idSearch');
    const search = searchEl ? searchEl.value.trim() : '';
    const params = new URLSearchParams();
    if (currentCategory) params.set('category', currentCategory);
    if (search) params.set('search', search);

    let topics;
    try {
        const res = await fetch(`/api/identification?${params}`);
        topics = await res.json();
    } catch {
        topics = [];
    }

    const grid = document.getElementById('topicsGrid');
    if (!grid) return;
    if (!topics.length) {
        grid.innerHTML = '<div class="empty-state"><i class="bi bi-search"></i><h3>No topics found</h3><p>Try a different search or category.</p></div>';
        return;
    }

    const icons = { 'roses': '🌹', 'tulips': '🌷', 'orchids': '🌺', 'lilies': '💮', 'preservation': '🏺', 'general': '🔍' };

    grid.innerHTML = topics.map(t => {
        const icon = icons[(t.category || '').toLowerCase()] || t.category_icon || '🔍';
        return `
            <div class="topic-card" onclick="window.location.href='identification-detail.html?id=${escapeHtml(String(t.id || t.slug))}'">
                <div class="topic-icon">${icon}</div>
                <h3>${escapeHtml(t.title)}</h3>
                <div class="subtitle">${escapeHtml(t.category_name || t.category || '')}</div>
                <p>${escapeHtml((t.description || '').slice(0, 120))}${(t.description || '').length > 120 ? '...' : ''}</p>
                <div class="topic-tags">
                    <span class="topic-tag tag-category">${escapeHtml(t.category_name || t.category || 'General')}</span>
                    <span class="topic-tag tag-level">${escapeHtml(t.difficulty || t.level || 'Beginner')}</span>
                    ${t.duration ? `<span class="topic-tag tag-level"><i class="bi bi-clock"></i> ${escapeHtml(t.duration)}</span>` : ''}
                </div>
            </div>
        `;
    }).join('');
}

// ─── Identification Detail Page ───────────────────────────────────────────

async function initIdentificationDetail() {
    const params = new URLSearchParams(window.location.search);
    const id = params.get('id');
    if (!id) {
        document.getElementById('idContent').innerHTML = '<div class="empty-state"><h3>Topic not found</h3></div>';
        return;
    }

    let topic;
    try {
        const res = await fetch(`/api/identification/${id}`);
        if (!res.ok) throw new Error('Not found');
        topic = await res.json();
    } catch {
        document.getElementById('idContent').innerHTML = '<div class="empty-state"><i class="bi bi-search"></i><h3>Topic not found</h3></div>';
        return;
    }

    document.title = `${topic.title} | Flower Ecosystem`;

    let quiz = [];
    try { quiz = topic.quiz_data ? (typeof topic.quiz_data === 'string' ? JSON.parse(topic.quiz_data) : topic.quiz_data) : []; } catch { quiz = []; }
    let checklist = [];
    try { checklist = topic.checklist ? (typeof topic.checklist === 'string' ? JSON.parse(topic.checklist) : topic.checklist) : []; } catch { checklist = []; }

    document.getElementById('idContent').innerHTML = `
        <a href="identification.html" class="back-link" style="display:inline-flex;align-items:center;gap:0.4rem;font-size:0.88rem;color:var(--text-light);margin-bottom:1rem;text-decoration:none;"><i class="bi bi-arrow-left"></i> Back to Identification</a>

        <div class="id-hero-section" style="background:linear-gradient(135deg, #1a1a2e, #16213e, #2d1b4e);border-radius:var(--radius-md);padding:3rem;color:white;margin-bottom:2rem;">
            <span style="display:inline-block;background:rgba(255,255,255,0.15);padding:0.3rem 0.85rem;border-radius:20px;font-size:0.8rem;margin-bottom:1rem;">${escapeHtml(topic.difficulty || topic.level || 'Beginner')}</span>
            <h1 style="font-size:2rem;margin-bottom:0.75rem;">${escapeHtml(topic.title)}</h1>
            <p style="opacity:0.85;max-width:600px;line-height:1.6;">${escapeHtml(topic.description || '')}</p>
            <div style="display:flex;gap:1.5rem;margin-top:1rem;font-size:0.85rem;opacity:0.7;">
                ${topic.category_name || topic.category ? `<span><i class="bi bi-tag"></i> ${escapeHtml(topic.category_name || topic.category)}</span>` : ''}
                ${topic.duration ? `<span><i class="bi bi-clock"></i> ${escapeHtml(topic.duration)}</span>` : ''}
            </div>
        </div>

        <div class="detail-layout" style="display:grid;grid-template-columns:1fr 280px;gap:2rem;">
            <div class="detail-main">
                ${topic.content ? `
                    <div class="content-card" style="background:var(--bg-white);border:1px solid var(--border-color);border-radius:var(--radius-md);padding:2rem;margin-bottom:1.5rem;">
                        <div class="content-text" style="font-size:0.95rem;line-height:1.8;">${renderMarkdown(topic.content)}</div>
                    </div>
                ` : ''}

                ${topic.images && topic.images.length ? `
                    <div class="content-card" style="background:var(--bg-white);border:1px solid var(--border-color);border-radius:var(--radius-md);padding:1.5rem;margin-bottom:1.5rem;">
                        <h2 style="font-size:1.1rem;margin-bottom:1rem;"><i class="bi bi-images" style="color:var(--primary-color)"></i> Image Gallery</h2>
                        <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(200px,1fr));gap:0.75rem;">
                            ${topic.images.map(img => `
                                <div style="border-radius:var(--radius-sm);overflow:hidden;border:1px solid var(--border-color);">
                                    <img src="${escapeHtml(img.image_url)}" alt="${escapeHtml(img.label || '')}" style="width:100%;aspect-ratio:1;object-fit:cover;" loading="lazy">
                                    ${img.label ? `<div style="padding:0.4rem;font-size:0.8rem;text-align:center;">${escapeHtml(img.label)}</div>` : ''}
                                </div>
                            `).join('')}
                        </div>
                    </div>
                ` : ''}

                ${topic.videos && topic.videos.length ? `
                    <div class="content-card" style="background:var(--bg-white);border:1px solid var(--border-color);border-radius:var(--radius-md);padding:1.5rem;margin-bottom:1.5rem;">
                        <h2 style="font-size:1.1rem;margin-bottom:1rem;"><i class="bi bi-play-circle" style="color:var(--primary-color)"></i> Video Demonstration</h2>
                        ${topic.videos.map(v => `
                            <div style="margin-bottom:1rem;">
                                <h4 style="font-size:0.9rem;margin-bottom:0.25rem;">${escapeHtml(v.title || 'Video')}</h4>
                                <div style="background:var(--bg-light);border-radius:var(--radius-sm);padding:2rem;text-align:center;color:var(--text-muted);">
                                    <i class="bi bi-play-circle" style="font-size:2rem;"></i>
                                    <p style="font-size:0.85rem;margin-top:0.5rem;">${escapeHtml(v.duration || '')}</p>
                                </div>
                            </div>
                        `).join('')}
                    </div>
                ` : ''}
            </div>

            <div class="detail-sidebar" style="display:flex;flex-direction:column;gap:1.25rem;">
                ${checklist.length ? `
                    <div style="background:var(--bg-white);border:1px solid var(--border-color);border-radius:var(--radius-md);padding:1.25rem;position:sticky;top:100px;">
                        <h3 style="font-size:0.9rem;margin-bottom:0.75rem;"><i class="bi bi-check2-square" style="color:var(--primary-color)"></i> Identification Checklist</h3>
                        <div id="checklistItems">
                            ${checklist.map((item, i) => `
                                <label style="display:flex;align-items:center;gap:0.5rem;padding:0.4rem 0;cursor:pointer;font-size:0.85rem;border-bottom:1px solid var(--border-light);">
                                    <input type="checkbox" onchange="updateChecklist()" data-idx="${i}" style="accent-color:var(--primary-color);">
                                    <span>${escapeHtml(item.text || item)}</span>
                                </label>
                            `).join('')}
                        </div>
                        <div id="checklistResult" style="margin-top:0.75rem;padding:0.75rem;border-radius:var(--radius-sm);text-align:center;font-weight:500;display:none;"></div>
                    </div>
                ` : ''}

                ${quiz.length ? `
                    <div style="background:var(--bg-white);border:1px solid var(--border-color);border-radius:var(--radius-md);padding:1.25rem;">
                        <h3 style="font-size:0.9rem;margin-bottom:0.75rem;"><i class="bi bi-question-circle" style="color:var(--primary-color)"></i> Quick Quiz</h3>
                        <div id="quizContainer">
                            ${quiz.map((q, qi) => `
                                <div class="quiz-question" data-qi="${qi}" style="margin-bottom:1rem;">
                                    <p style="font-size:0.85rem;font-weight:500;margin-bottom:0.4rem;">${qi + 1}. ${escapeHtml(q.q)}</p>
                                    ${q.options.map((opt, oi) => `
                                        <label style="display:block;padding:0.4rem 0.6rem;border:1px solid var(--border-color);border-radius:var(--radius-sm);margin-bottom:0.3rem;cursor:pointer;font-size:0.82rem;transition:all 0.2s;" class="quiz-option" data-qi="${qi}" data-oi="${oi}">
                                            <input type="radio" name="q${qi}" value="${oi}" style="display:none;"> ${escapeHtml(opt)}
                                        </label>
                                    `).join('')}
                                </div>
                            `).join('')}
                        </div>
                        <button class="btn btn-primary btn-sm" style="width:100%;" onclick="submitQuiz()">Check Answers</button>
                        <div id="quizResult" style="margin-top:0.75rem;text-align:center;display:none;"></div>
                    </div>
                ` : ''}

                <div style="background:var(--bg-white);border:1px solid var(--border-color);border-radius:var(--radius-md);padding:1.25rem;">
                    <h3 style="font-size:0.9rem;margin-bottom:0.75rem;"><i class="bi bi-info-circle" style="color:var(--primary-color)"></i> Topic Info</h3>
                    <div style="font-size:0.82rem;color:var(--text-light);display:flex;flex-direction:column;gap:0.4rem;">
                        ${topic.difficulty || topic.level ? `<div><i class="bi bi-bar-chart" style="margin-right:0.3rem;"></i> Level: ${escapeHtml(topic.difficulty || topic.level)}</div>` : ''}
                        ${topic.duration ? `<div><i class="bi bi-clock" style="margin-right:0.3rem;"></i> Duration: ${escapeHtml(topic.duration)}</div>` : ''}
                        ${topic.category_name || topic.category ? `<div><i class="bi bi-tag" style="margin-right:0.3rem;"></i> Category: ${escapeHtml(topic.category_name || topic.category)}</div>` : ''}
                    </div>
                </div>
            </div>
        </div>
    `;
}

let quizAnswers = {};

function renderMarkdown(text) {
    if (!text) return '';
    let html = escapeHtml(text);
    html = html.replace(/^### (.+)$/gm, '<h3>$1</h3>');
    html = html.replace(/^## (.+)$/gm, '<h2 style="font-size:1.2rem;margin:1.5rem 0 0.5rem;">$1</h2>');
    html = html.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
    html = html.replace(/^- (.+)$/gm, '<li>$1</li>');
    html = html.replace(/\n\n/g, '</p><p>');
    html = '<p>' + html + '</p>';
    return html;
}

// Quiz handling
document.addEventListener('click', (e) => {
    const opt = e.target.closest('.quiz-option');
    if (!opt) return;
    const qi = opt.dataset.qi;
    const oi = opt.dataset.oi;
    document.querySelectorAll(`.quiz-option[data-qi="${qi}"]`).forEach(o => {
        o.style.borderColor = 'var(--border-color)';
        o.style.background = '';
    });
    opt.style.borderColor = 'var(--primary-color)';
    opt.style.background = 'rgba(172,50,80,0.05)';
    quizAnswers[qi] = parseInt(oi);
});

function submitQuiz() {
    const quizData = [];
    document.querySelectorAll('.quiz-question').forEach(q => {
        const qi = q.dataset.qi;
        const options = q.querySelectorAll('.quiz-option');
        const correct = parseInt(options[0]?.closest('.quiz-question')?.querySelector('input[type="radio"]')?.value || -1);
        quizData.push({ qi, options });
    });

    const container = document.getElementById('quizContainer');
    const questions = container.querySelectorAll('.quiz-question');
    let correct = 0;

    questions.forEach((q, i) => {
        const userAnswer = quizAnswers[i];
        const opts = q.querySelectorAll('.quiz-option');
        opts.forEach((o, oi) => {
            if (oi === userAnswer) {
                o.style.borderColor = 'var(--accent-green)';
                o.style.background = 'rgba(16,185,129,0.1)';
            }
        });
    });

    const result = document.getElementById('quizResult');
    result.style.display = 'block';
    result.innerHTML = `<div style="font-size:1.1rem;font-weight:600;">Quiz Complete!</div><div style="font-size:0.85rem;color:var(--text-light);">Answered ${Object.keys(quizAnswers).length} of ${questions.length} questions</div>`;
}

function updateChecklist() {
    const checkboxes = document.querySelectorAll('#checklistItems input[type="checkbox"]');
    const total = checkboxes.length;
    const checked = Array.from(checkboxes).filter(cb => cb.checked).length;
    const result = document.getElementById('checklistResult');

    if (checked === 0) {
        result.style.display = 'none';
        return;
    }

    result.style.display = 'block';
    if (checked === total) {
        result.style.background = 'rgba(16,185,129,0.1)';
        result.style.color = 'var(--accent-green)';
        result.innerHTML = `<i class="bi bi-check-circle-fill"></i> All checks passed! This flower appears to be genuine.`;
    } else {
        result.style.background = 'rgba(245,158,11,0.1)';
        result.style.color = 'var(--accent-gold)';
        result.innerHTML = `<i class="bi bi-info-circle"></i> ${checked}/${total} checks passed. Complete all checks for a definitive identification.`;
    }
}
