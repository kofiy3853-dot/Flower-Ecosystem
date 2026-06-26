// js/plant-database.js
// Plant Database — grid/table view with advanced filtering

let allPlants = [];
let currentView = 'grid';
let currentSearch = '';
let currentDifficulty = '';
let currentLight = '';
let currentOrigin = '';
let currentSort = 'name';

async function initPlantDatabase() {
    try {
        const res = await fetch('/api/knowledge/flowers');
        allPlants = await res.json();
    } catch {
        allPlants = [];
    }

    populateOrigins();
    renderPlants();

    document.getElementById('dbSearchBtn').addEventListener('click', () => renderPlants());
    document.getElementById('dbSearch').addEventListener('keydown', (e) => {
        if (e.key === 'Enter') renderPlants();
    });

    ['filterDifficulty', 'filterLight', 'filterOrigin', 'sortBy'].forEach(id => {
        document.getElementById(id).addEventListener('change', () => {
            currentDifficulty = document.getElementById('filterDifficulty').value;
            currentLight = document.getElementById('filterLight').value;
            currentOrigin = document.getElementById('filterOrigin').value;
            currentSort = document.getElementById('sortBy').value;
            renderPlants();
        });
    });

    document.querySelectorAll('.view-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            document.querySelectorAll('.view-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            currentView = btn.dataset.view;
            renderPlants();
        });
    });
}

function populateOrigins() {
    const origins = [...new Set(allPlants.map(p => p.origin).filter(Boolean))].sort();
    const select = document.getElementById('filterOrigin');
    origins.forEach(o => {
        const opt = document.createElement('option');
        opt.value = o;
        opt.textContent = o;
        select.appendChild(opt);
    });
}

function getFilteredPlants() {
    const search = document.getElementById('dbSearch').value.trim().toLowerCase();
    return allPlants.filter(p => {
        if (search && !((p.common_name || '').toLowerCase().includes(search) ||
            (p.scientific_name || '').toLowerCase().includes(search) ||
            (p.family || '').toLowerCase().includes(search) ||
            (p.origin || '').toLowerCase().includes(search))) return false;
        if (currentDifficulty && p.difficulty !== currentDifficulty) return false;
        if (currentLight && !(p.sunlight || '').toLowerCase().includes(currentLight.toLowerCase())) return false;
        if (currentOrigin && p.origin !== currentOrigin) return false;
        return true;
    }).sort((a, b) => {
        switch (currentSort) {
            case 'difficulty': return (a.difficulty || '').localeCompare(b.difficulty || '');
            case 'family': return (a.family || '').localeCompare(b.family || '');
            case 'origin': return (a.origin || '').localeCompare(b.origin || '');
            default: return (a.common_name || '').localeCompare(b.common_name || '');
        }
    });
}

function renderPlants() {
    const plants = getFilteredPlants();
    const container = document.getElementById('dbContainer');
    const countEl = document.getElementById('resultsCount');

    countEl.textContent = `Showing ${plants.length} of ${allPlants.length} plants`;

    if (!plants.length) {
        container.innerHTML = '<div class="empty-state" style="grid-column:1/-1;"><i class="bi bi-search"></i><h3>No plants found</h3><p>Try adjusting your filters.</p></div>';
        container.className = '';
        return;
    }

    if (currentView === 'table') {
        container.className = 'db-table-wrap';
        container.innerHTML = `
            <table class="db-table">
                <thead>
                    <tr>
                        <th onclick="sortBy('name')">Plant <i class="bi bi-arrow-down-up"></i></th>
                        <th onclick="sortBy('family')">Family <i class="bi bi-arrow-down-up"></i></th>
                        <th>Origin</th>
                        <th>Light</th>
                        <th>Water</th>
                        <th>Difficulty</th>
                        <th>Growth</th>
                        <th>Height</th>
                    </tr>
                </thead>
                <tbody>
                    ${plants.map(p => `
                        <tr onclick="window.location.href='flower-knowledge.html?slug=${escapeHtml(p.slug || p.id)}'" style="cursor:pointer;">
                            <td>
                                <div class="plant-cell">
                                    <img class="plant-thumb" src="${escapeHtml(p.image_url || 'https://images.unsplash.com/photo-1490750967868-88df5691a78b?q=100&auto=format&fit=crop')}" alt="${escapeHtml(p.common_name)}">
                                    <div>
                                        <div class="plant-name">${escapeHtml(p.emoji || '')} ${escapeHtml(p.common_name)}</div>
                                        <div class="plant-sci">${escapeHtml(p.scientific_name)}</div>
                                    </div>
                                </div>
                            </td>
                            <td>${escapeHtml(p.family || '—')}</td>
                            <td>${escapeHtml(p.origin || '—')}</td>
                            <td>${escapeHtml(p.sunlight || '—')}</td>
                            <td style="max-width:150px;">${escapeHtml((p.water || '').split('—')[0].trim())}</td>
                            <td><span class="diff-badge ${getDiffClass(p.difficulty)}">${escapeHtml(p.difficulty || '—')}</span></td>
                            <td>${escapeHtml(p.growth_rate || '—')}</td>
                            <td>${escapeHtml(p.height || '—')}</td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>
        `;
    } else {
        container.className = 'db-grid';
        container.innerHTML = plants.map(p => `
            <div class="db-card" onclick="window.location.href='flower-knowledge.html?slug=${escapeHtml(p.slug || p.id)}'">
                <div class="db-card-img">
                    <img loading="lazy" src="${escapeHtml(p.image_url || 'https://images.unsplash.com/photo-1490750967868-88df5691a78b?q=400&auto=format&fit=crop')}" alt="${escapeHtml(p.common_name)}">
                </div>
                <div class="db-card-body">
                    <h3>${escapeHtml(p.emoji || '')} ${escapeHtml(p.common_name)}</h3>
                    <div class="sci">${escapeHtml(p.scientific_name)}</div>
                    <div class="db-card-tags">
                        <span class="db-tag">${escapeHtml(p.family || '')}</span>
                        <span class="db-tag">${escapeHtml(p.origin || '')}</span>
                        <span class="diff-badge ${getDiffClass(p.difficulty)}">${escapeHtml(p.difficulty || '')}</span>
                    </div>
                </div>
            </div>
        `).join('');
    }
}

function getDiffClass(diff) {
    if (!diff) return '';
    const d = diff.toLowerCase();
    if (d === 'easy' || d === 'beginner') return 'diff-easy';
    if (d === 'moderate' || d === 'intermediate') return 'diff-moderate';
    return 'diff-hard';
}

function sortBy(field) {
    currentSort = field;
    document.getElementById('sortBy').value = field;
    renderPlants();
}
