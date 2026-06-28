// js/gardening.js
// Gardening Hub — season info, tasks, bloom preview, stats

const monthNames = ['January','February','March','April','May','June','July','August','September','October','November','December'];
const seasonNames = { 1:'Winter', 2:'Winter', 3:'Spring', 4:'Spring', 5:'Spring', 6:'Summer', 7:'Summer', 8:'Summer', 9:'Fall', 10:'Fall', 11:'Fall', 12:'Winter' };
const seasonEmojis = { Spring:'🌷', Summer:'☀️', Fall:'🍂', Winter:'❄️' };

async function initGardeningPage() {
    const now = new Date();
    const month = now.getMonth() + 1;
    const season = seasonNames[month];

    const seasonBadge = document.getElementById('seasonBadge');
    if (seasonBadge) seasonBadge.innerHTML = `${seasonEmojis[season]} Currently: ${season} · ${monthNames[month - 1]}`;
    const taskMonthTitle = document.getElementById('taskMonthTitle');
    if (taskMonthTitle) taskMonthTitle.textContent = `${monthNames[month - 1]}'s Gardening Tasks`;

    loadStats(month);
    loadMonthlyTasks(month);
    loadBloomPreview();
}

async function loadStats(month) {
    let taskCount = 0;
    let plantCount = 0;
    let guideCount = 0;

    try {
        const [tasksRes, plantsRes, guidesRes] = await Promise.all([
            fetch(`/api/planting/tasks?month=${month}`),
            fetch('/api/knowledge/flowers'),
            fetch('/api/care-guides?limit=100')
        ]);
        const tasks = await tasksRes.json();
        const plants = await plantsRes.json();
        const guides = await guidesRes.json();

        taskCount = Array.isArray(tasks) ? tasks.length : 0;
        plantCount = Array.isArray(plants) ? plants.length : 0;
        guideCount = Array.isArray(guides.guides) ? guides.guides.length : (Array.isArray(guides) ? guides.length : 0);
    } catch {}

    const taskEl = document.getElementById('statTasks');
    const plantEl = document.getElementById('statPlants');
    const guideEl = document.getElementById('statGuides');
    if (taskEl) taskEl.textContent = taskCount || 12;
    if (plantEl) plantEl.textContent = plantCount || 28;
    if (guideEl) guideEl.textContent = guideCount || 8;
}

async function loadMonthlyTasks(month) {
    let tasks;
    try {
        const res = await fetch(`/api/planting/tasks?month=${month}`);
        tasks = await res.json();
    } catch {
        tasks = [];
    }

    if (!Array.isArray(tasks) || !tasks.length) {
        const taskList = document.getElementById('taskList');
        if (taskList) taskList.innerHTML = '<li style="color:var(--text-muted);font-size:0.9rem;padding:0.5rem 0;">No tasks for this month. Check the full calendar for details.</li>';
        return;
    }

    const typeClasses = {
        planning: 'badge-planning',
        indoor: 'badge-indoor',
        outdoor: 'badge-outdoor',
        maintenance: 'badge-maintenance',
        watering: 'badge-indoor',
        harvesting: 'badge-outdoor'
    };

    const taskList = document.getElementById('taskList');
    if (taskList) taskList.innerHTML = tasks.slice(0, 6).map((t, i) => `
        <li class="task-item">
            <div class="task-check" onclick="this.classList.toggle('done');this.nextElementSibling.classList.toggle('done')"><i class="bi bi-check"></i></div>
            <span class="task-label">${escapeHtml(t.title)}</span>
            <span class="task-type-badge ${typeClasses[t.task_type] || 'badge-outdoor'}">${escapeHtml(t.task_type || 'general')}</span>
        </li>
    `).join('');
}

async function loadBloomPreview() {
    let flowers;
    try {
        const res = await fetch('/api/knowledge/flowers');
        flowers = await res.json();
    } catch {
        flowers = [];
    }

    if (!Array.isArray(flowers) || !flowers.length) {
        const bloomGrid = document.getElementById('bloomGrid');
        if (bloomGrid) bloomGrid.innerHTML = '<div style="grid-column:1/-1;text-align:center;color:var(--text-muted);padding:2rem;">Loading bloom data...</div>';
        return;
    }

    const season = seasonNames[new Date().getMonth() + 1];
    const seasonal = flowers.filter(f => {
        const bs = (f.bloom_season || '').toLowerCase();
        return bs.includes(season.toLowerCase()) || bs.includes('year-round') || bs.includes('all');
    }).slice(0, 4);

    const display = seasonal.length >= 4 ? seasonal : flowers.slice(0, 4);

    const bloomGrid = document.getElementById('bloomGrid');
    if (bloomGrid) bloomGrid.innerHTML = display.map(f => `
        <a href="flower-knowledge.html?slug=${escapeHtml(f.slug || '')}" class="bloom-mini">
            <img src="${escapeHtml(f.image_url || 'https://images.unsplash.com/photo-1490750967868-88aa4f44baee?q=300&auto=format&fit=crop')}" alt="${escapeHtml(f.common_name || '')}" loading="lazy">
            <div class="info">
                <h4>${escapeHtml(f.emoji || '')} ${escapeHtml(f.common_name || '')}</h4>
                <span>${escapeHtml(f.bloom_season || 'Year-round')}</span>
            </div>
        </a>
    `).join('');
}
