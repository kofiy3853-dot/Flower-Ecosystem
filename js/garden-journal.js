// js/garden-journal.js
// Garden Journal — entries list, reminders, stats

const weatherEmojis = { 'Sunny': '☀️', 'Partly Cloudy': '⛅', 'Cloudy': '☁️', 'Rainy': '🌧️', 'Stormy': '⛈️', 'Snowy': '❄️', 'Windy': '💨' };
const moodEmojis = { 'Happy': '😊', 'Excited': '🎉', 'Proud': '💪', 'Peaceful': '😌', 'Curious': '🤔', 'Concerned': '😟' };

let currentTab = 'entries';

async function initGardenJournal() {
    if (!localStorage.getItem('flower-token')) {
        document.getElementById('loginPrompt').style.display = 'block';
        return;
    }

    document.getElementById('journalDashboard').style.display = 'block';

    loadStats();
    loadEntries();
    loadReminders();

    document.querySelectorAll('.jrn-tab').forEach(tab => {
        tab.addEventListener('click', () => {
            document.querySelectorAll('.jrn-tab').forEach(t => t.classList.remove('active'));
            tab.classList.add('active');
            currentTab = tab.dataset.tab;
            document.getElementById('entriesTab').style.display = currentTab === 'entries' ? 'block' : 'none';
            document.getElementById('remindersTab').style.display = currentTab === 'reminders' ? 'block' : 'none';
        });
    });
}

async function loadStats() {
    try {
        const entries = await fetch('/api/journal/entries', { headers: authHeaders() }).then(r => r.json());
        const reminders = await fetch('/api/journal/reminders', { headers: authHeaders() }).then(r => r.json());
        const totalPhotos = entries.reduce((sum, e) => sum + (e.photo_count || 0), 0);
        const totalPlants = new Set(entries.flatMap(e => (e.plants || []).map(p => p.plant_name))).size;

        document.getElementById('statsGrid').innerHTML = `
            <div class="jrn-stat"><div class="num">${entries.length}</div><div class="label">Journal Entries</div></div>
            <div class="jrn-stat"><div class="num">${totalPhotos}</div><div class="label">Photos</div></div>
            <div class="jrn-stat"><div class="num">${totalPlants}</div><div class="label">Plants Tracked</div></div>
            <div class="jrn-stat"><div class="num">${reminders.filter(r => !r.is_completed).length}</div><div class="label">Active Reminders</div></div>
        `;
    } catch {}
}

async function loadEntries() {
    let entries;
    try {
        entries = await fetch('/api/journal/entries', { headers: authHeaders() }).then(r => r.json());
    } catch {
        entries = [];
    }

    const list = document.getElementById('entriesList');
    if (!entries.length) {
        list.innerHTML = '<div class="empty-state"><i class="bi bi-journal-text"></i><h3>No entries yet</h3><p>Start documenting your garden journey!</p><a href="create-journal-entry.html" class="btn btn-primary" style="margin-top:1rem;">Create First Entry</a></div>';
        return;
    }

    list.innerHTML = entries.map(e => {
        const photos = e.photos || [];
        const plants = e.plants || [];
        return `
            <div class="entry-card" onclick="window.location.href='create-journal-entry.html?id=${escapeHtml(String(e.id))}'">
                <div class="entry-header">
                    <div>
                        <div class="entry-title">${escapeHtml(e.title)}</div>
                        <div class="entry-date">
                            <i class="bi bi-calendar3"></i> ${formatDate(e.entry_date)}
                            ${e.weather ? ` · ${weatherEmojis[e.weather] || ''} ${escapeHtml(e.weather)}` : ''}
                            ${e.mood ? ` · ${moodEmojis[e.mood] || ''} ${escapeHtml(e.mood)}` : ''}
                        </div>
                    </div>
                    <button class="btn btn-outline btn-sm" onclick="event.stopPropagation();deleteEntry('${e.id}')" title="Delete"><i class="bi bi-trash"></i></button>
                </div>
                ${e.content ? `<div class="entry-content">${escapeHtml(e.content)}</div>` : ''}
                <div class="entry-meta">
                    ${e.garden_area ? `<span><i class="bi bi-geo-alt"></i> ${escapeHtml(e.garden_area)}</span>` : ''}
                    ${e.temperature ? `<span><i class="bi bi-thermometer-half"></i> ${escapeHtml(e.temperature)}</span>` : ''}
                    <span><i class="bi bi-clock"></i> ${timeAgo(e.created_at)}</span>
                </div>
                ${photos.length ? `
                    <div class="entry-photos">
                        ${photos.map(p => `<img src="${escapeHtml(p.image_url)}" alt="${escapeHtml(p.caption || '')}" loading="lazy">`).join('')}
                    </div>
                ` : ''}
                ${plants.length ? `
                    <div class="entry-plants">
                        ${plants.map(p => `<span class="plant-tag">${p.action ? escapeHtml(p.action) + ': ' : ''}${escapeHtml(p.plant_name)}</span>`).join('')}
                    </div>
                ` : ''}
            </div>
        `;
    }).join('');
}

async function loadReminders() {
    let reminders;
    try {
        reminders = await fetch('/api/journal/reminders', { headers: authHeaders() }).then(r => r.json());
    } catch {
        reminders = [];
    }

    const list = document.getElementById('remindersList');
    if (!reminders.length) {
        list.innerHTML = '<div class="empty-state"><i class="bi bi-bell"></i><h3>No reminders</h3><p>Add reminders to never miss a garden task.</p></div>';
        return;
    }

    list.innerHTML = reminders.map(r => `
        <div class="reminder-card${r.is_completed ? ' completed' : ''}">
            <input type="checkbox" class="reminder-check" ${r.is_completed ? 'checked' : ''} onchange="toggleReminder('${r.id}', this.checked)">
            <div class="reminder-info">
                <div class="title">${escapeHtml(r.title)}</div>
                <div class="date">${formatDate(r.reminder_date)}${r.plant_name ? ' · ' + escapeHtml(r.plant_name) : ''}</div>
            </div>
            <button class="reminder-delete" onclick="deleteReminder('${r.id}')" title="Delete"><i class="bi bi-trash"></i></button>
        </div>
    `).join('');
}

function showAddReminder() {
    const form = document.getElementById('addReminderForm');
    form.style.display = form.style.display === 'none' ? 'block' : 'none';
}

async function addReminder() {
    const title = document.getElementById('reminderTitle').value.trim();
    const date = document.getElementById('reminderDate').value;
    const plant = document.getElementById('reminderPlant').value.trim();
    if (!title || !date) return;

    try {
        await fetch('/api/journal/reminders', {
            method: 'POST',
            headers: authHeaders(),
            body: JSON.stringify({ title, reminder_date: date, plant_name: plant })
        });
        document.getElementById('reminderTitle').value = '';
        document.getElementById('reminderDate').value = '';
        document.getElementById('reminderPlant').value = '';
        document.getElementById('addReminderForm').style.display = 'none';
        loadReminders();
        loadStats();
    } catch (err) { handleError(err, 'Failed to add reminder'); }
}

async function toggleReminder(id, completed) {
    try {
        await fetch(`/api/journal/reminders/${id}`, {
            method: 'PUT',
            headers: authHeaders(),
            body: JSON.stringify({ is_completed: completed })
        });
        loadReminders();
        loadStats();
    } catch (err) { handleError(err, 'Failed to update reminder'); }
}

async function deleteReminder(id) {
    if (!confirm('Delete this reminder?')) return;
    try {
        await fetch(`/api/journal/reminders/${id}`, { method: 'DELETE', headers: authHeaders() });
        loadReminders();
        loadStats();
    } catch (err) { handleError(err, 'Failed to delete reminder'); }
}

async function deleteEntry(id) {
    if (!confirm('Delete this journal entry?')) return;
    try {
        await fetch(`/api/journal/entries/${id}`, { method: 'DELETE', headers: authHeaders() });
        loadEntries();
        loadStats();
    } catch (err) { handleError(err, 'Failed to delete entry'); }
}
