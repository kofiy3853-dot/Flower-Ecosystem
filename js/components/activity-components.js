function escapeHtml(s) {
    if (!s) return '';
    return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function formatNumber(n) {
    if (n >= 1000000) return (n / 1000000).toFixed(1) + 'M';
    if (n >= 1000) return (n / 1000).toFixed(1) + 'K';
    return String(n);
}

function timeAgo(d) {
    if (!d) return '';
    const s = Math.floor((Date.now() - new Date(d)) / 1000);
    if (s < 60) return 'just now';
    if (s < 3600) return Math.floor(s / 60) + 'm ago';
    if (s < 86400) return Math.floor(s / 3600) + 'h ago';
    if (s < 2592000) return Math.floor(s / 86400) + 'd ago';
    const date = new Date(d);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

function emptyState(icon, text, action) {
    return '<div class="empty-state"><i class="bi ' + icon + '"></i><p>' + escapeHtml(text) + '</p>' + (action || '') + '</div>';
}

function renderStatCard(icon, label, value, color) {
    return '<div class="stat-card"><div class="stat-icon" style="background:' + (color || 'var(--primary-color)') + '15;color:' + (color || 'var(--primary-color)') + ';"><i class="bi ' + icon + '"></i></div><div class="stat-body"><div class="stat-value">' + formatNumber(value) + '</div><div class="stat-label">' + escapeHtml(label) + '</div></div></div>';
}

function renderTimelineItem(item) {
    const typeIcons = { discussion: 'bi-chat-dots', question: 'bi-question-circle', story: 'bi-heart', showcase: 'bi-images', event: 'bi-calendar-event', club_join: 'bi-people' };
    const typeColors = { discussion: '#0ea5e9', question: '#f59e0b', story: '#10b981', showcase: '#ec4899', event: '#8b5cf6', club_join: '#14b8a6' };
    const typeLabels = { discussion: 'Discussion', question: 'Question', story: 'Story', showcase: 'Showcase', event: 'Event', club_join: 'Club' };
    const typeVerbs = { discussion: 'Started a discussion', question: 'Asked a question', story: 'Shared a story', showcase: 'Uploaded a project', event: 'Joined an event', club_join: 'Joined a club' };
    const links = { discussion: 'discussion-detail.html?id=', question: 'question-detail.html?id=', story: 'success-story-detail.html?id=', showcase: 'showcase-detail.html?id=', event: 'event-detail.html?id=', club_join: 'club-detail.html?id=' };
    const link = links[item.type] ? links[item.type] + (item.id || '') : '';
    const color = typeColors[item.type] || 'var(--text-light)';
    const today = new Date().toDateString();
    const itemDate = new Date(item.created_at).toDateString();
    const dateLabel = itemDate === today ? 'Today' : timeAgo(item.created_at);

    return '<div class="tl-item"' + (link ? ' onclick="window.location.href=\'' + link + '\'"' : '') + '>' +
        '<div class="tl-dot" style="background:' + color + ';"></div>' +
        '<div class="tl-body">' +
        '<div class="tl-header"><span class="tl-type" style="color:' + color + ';"><i class="bi ' + (typeIcons[item.type] || 'bi-circle') + '"></i> ' + (typeLabels[item.type] || item.type) + '</span><span class="tl-date">' + dateLabel + '</span></div>' +
        '<div class="tl-text">' + escapeHtml(typeVerbs[item.type] || 'Activity') + '</div>' +
        '<div class="tl-title">' + escapeHtml(item.label || '') + '</div>' +
        '</div></div>';
}

function renderPostCard(p) {
    return '<div class="content-card" onclick="window.location.href=\'feed.html?post=' + p.id + '\'">' +
        '<div class="content-card-body">' +
        '<div class="content-card-title">' + escapeHtml(p.title || 'Untitled') + '</div>' +
        '<div class="content-card-meta">' +
        '<span><i class="bi bi-heart"></i> ' + formatNumber(p.like_count || 0) + '</span>' +
        '<span><i class="bi bi-chat"></i> ' + formatNumber(p.comment_count || 0) + '</span>' +
        '</div></div></div>';
}

function renderDiscussionCard(d) {
    return '<div class="content-card" onclick="window.location.href=\'discussion-detail.html?id=' + d.id + '\'">' +
        '<div class="content-card-body">' +
        '<div class="content-card-title">' + escapeHtml(d.title || 'Untitled') + (d.is_solved ? ' <span class="solved-badge"><i class="bi bi-check-circle"></i> Solved</span>' : '') + '</div>' +
        '<div class="content-card-meta"><span><i class="bi bi-chat"></i> ' + (parseInt(d.comment_count || d.reply_count || 0)) + ' replies</span></div>' +
        '</div></div>';
}

function renderShowcaseGrid(items) {
    if (!items || !items.length) return emptyState('bi-images', 'No showcase projects yet.');
    return '<div class="showcase-grid">' + items.map(function(p) {
        var img = p.images && p.images.length ? p.images[0] : (p.cover_image || p.image_url || '');
        return '<div class="sc-item" onclick="window.location.href=\'showcase-detail.html?id=' + p.id + '\'">' +
            (img ? '<img src="' + escapeHtml(img) + '" alt="" loading="lazy">' : '<div class="sc-placeholder"><i class="bi bi-flower1"></i></div>') +
            '<div class="sc-label">' + escapeHtml(p.title || '') + '</div></div>';
    }).join('') + '</div>';
}

function renderEventCard(e) {
    var isUpcoming = e.event_status !== 'completed' && new Date(e.event_date) > new Date();
    var dateStr = e.event_date ? new Date(e.event_date).toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' }) : '';
    return '<div class="content-card" onclick="window.location.href=\'event-detail.html?id=' + e.id + '\'">' +
        '<div class="content-card-body">' +
        '<div class="content-card-title">' + escapeHtml(e.title || '') + '</div>' +
        '<div class="content-card-meta">' +
        '<span><i class="bi bi-calendar"></i> ' + escapeHtml(dateStr) + '</span>' +
        '<span class="event-status ' + (isUpcoming ? 'upcoming' : 'completed') + '">' + (isUpcoming ? 'Upcoming' : 'Completed') + '</span>' +
        '</div></div></div>';
}

function renderClubCard(c) {
    var roleColors = { member: '#64748b', moderator: '#f59e0b', admin: '#ef4444' };
    return '<div class="content-card" onclick="window.location.href=\'clubs.html?id=' + c.id + '\'">' +
        '<div class="content-card-body">' +
        '<div class="content-card-title">' + escapeHtml(c.icon || '🌿') + ' ' + escapeHtml(c.name || '') + '</div>' +
        '<div class="content-card-meta">' +
        '<span class="club-role-badge" style="background:' + (roleColors[c.membership_role] || '#64748b') + '15;color:' + (roleColors[c.membership_role] || '#64748b') + ';">' + escapeHtml(c.membership_role || 'Member') + '</span>' +
        '<span>' + formatNumber(c.member_count || 0) + ' members</span>' +
        '</div></div></div>';
}

function renderSavedPost(p) {
    var authorName = (p.first_name || '') + ' ' + (p.last_name || '');
    return '<div class="saved-item" onclick="window.location.href=\'feed.html?post=' + p.id + '\'">' +
        '<div class="saved-item-body">' +
        '<div class="saved-item-title">' + escapeHtml(p.title || 'Untitled') + '</div>' +
        (p.content ? '<div class="saved-item-excerpt">' + escapeHtml(p.content.substring(0, 120)) + '</div>' : '') +
        '<div class="saved-item-author">' + (authorName.trim() ? 'by ' + escapeHtml(authorName.trim()) : '') + '</div>' +
        '</div></div>';
}

function renderSavedStory(s) {
    var authorName = (s.first_name || '') + ' ' + (s.last_name || '');
    return '<div class="saved-item" onclick="window.location.href=\'success-story-detail.html?id=' + s.id + '\'">' +
        '<div class="saved-item-body">' +
        '<div class="saved-item-title">' + escapeHtml(s.title || 'Untitled') + '</div>' +
        (s.content ? '<div class="saved-item-excerpt">' + escapeHtml(s.content.substring(0, 120)) + '</div>' : '') +
        '<div class="saved-item-meta"><span><i class="bi bi-heart"></i> ' + formatNumber(s.like_count || 0) + '</span>' +
        (authorName.trim() ? '<span>' + escapeHtml(authorName.trim()) + '</span>' : '') +
        '</div></div></div>';
}

function renderAchievementBadge(b) {
    var levelColors = { bronze: '#cd7f32', silver: '#9ca3af', gold: '#f59e0b', platinum: '#a78bfa', diamond: '#06b6d4' };
    var color = levelColors[b.level] || '#9ca3af';
    return '<div class="ach-badge"><div class="ach-badge-icon" style="border-color:' + color + ';color:' + color + ';">' + (b.icon || '🏆') + '</div><div class="ach-badge-name">' + escapeHtml(b.name) + '</div><div class="ach-badge-level" style="color:' + color + ';">' + escapeHtml(b.level || '') + '</div></div>';
}

function renderNotification(n) {
    return '<div class="notif-item' + (n.is_read ? '' : ' unread') + '"' + (n.link ? ' onclick="window.location.href=\'' + n.link + '\'"' : '') + '>' +
        '<div class="notif-icon"><i class="bi ' + (n.type === 'like' ? 'bi-heart' : n.type === 'follow' ? 'bi-person-plus' : n.type === 'comment' ? 'bi-chat' : n.type === 'event' ? 'bi-calendar' : 'bi-bell') + '"></i></div>' +
        '<div class="notif-body"><div class="notif-text">' + escapeHtml(n.message || n.title || '') + '</div><div class="notif-time">' + timeAgo(n.created_at) + '</div></div>' +
        (!n.is_read ? '<div class="notif-dot"></div>' : '') + '</div>';
}

function renderHeatmap(data, year, month) {
    var daysInMonth = new Date(year, month, 0).getDate();
    var firstDay = new Date(year, month - 1, 1).getDay();
    var lookup = {};
    if (data) { data.forEach(function(d) { lookup[d.day] = d.count; }); }
    var maxVal = 1;
    if (data && data.length) { maxVal = Math.max(1, Math.max.apply(null, data.map(function(d) { return d.count; }))); }

    var html = '<div class="heatmap"><div class="heatmap-header">' + new Date(year, month - 1).toLocaleDateString('en-US', { month: 'long', year: 'numeric' }) + '</div><div class="heatmap-grid">';
    var dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    dayNames.forEach(function(d) { html += '<div class="hm-day-label">' + d + '</div>'; });
    for (var i = 0; i < firstDay; i++) { html += '<div class="hm-cell empty"></div>'; }
    for (var day = 1; day <= daysInMonth; day++) {
        var dateStr = year + '-' + String(month).padStart(2, '0') + '-' + String(day).padStart(2, '0');
        var count = lookup[dateStr] || 0;
        var intensity = count > 0 ? Math.min(4, Math.ceil((count / maxVal) * 4)) : 0;
        html += '<div class="hm-cell level-' + intensity + '" title="' + dateStr + ': ' + count + ' contributions"></div>';
    }
    html += '</div><div class="hm-legend"><span>Less</span>';
    for (var l = 0; l <= 4; l++) { html += '<div class="hm-cell level-' + l + '"></div>'; }
    html += '<span>More</span></div></div>';
    return html;
}

function renderPrivacyCheckbox(id, label, checked) {
    return '<label class="privacy-item"><input type="checkbox" id="' + id + '" ' + (checked ? 'checked' : '') + '><span class="privacy-label">' + escapeHtml(label) + '</span></label>';
}
