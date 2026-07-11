var MA = {
    timelinePage: 1,
    timelineLoading: false,
    hasMoreTimeline: true,
    loadedTabs: {},
    privacySettings: {
        public_profile: true,
        show_showcase: true,
        show_events: true,
        show_saved: false,
        show_achievements: true
    }
};

function isLoggedIn() { return !!localStorage.getItem('flower-user'); }
function getToken() { return null; }

function authFetch(url, opts) {
    opts = opts || {};
    opts.headers = opts.headers || {};
    opts.headers['Authorization'] = 'Bearer ' + getToken();
    return fetch(url, opts).then(function(r) { return r.json(); });
}

function getCurrentUser() {
    try { return JSON.parse(localStorage.getItem('flower-auth') || '{}'); } catch { return {}; }
}

async function loadMyActivities() {
    if (!isLoggedIn()) {
        document.getElementById('maLoading').style.display = 'none';
        document.getElementById('maEmpty').style.display = 'block';
        document.getElementById('maEmpty').querySelector('p').textContent = 'Please log in to view your activities.';
        return;
    }

    var user = getCurrentUser();
    if (!user || !user.id) {
        document.getElementById('maLoading').innerHTML = '<p style="text-align:center;color:var(--text-light);">Could not load profile. Try refreshing.</p>';
        return;
    }

    try {
        await Promise.all([
            loadProfileSummary(user),
            loadStats(user.id),
            loadTimeline(),
            loadReputation(user.id),
            loadNotifications()
        ]);

        document.getElementById('maLoading').style.display = 'none';
        document.getElementById('maHero').style.display = 'block';
        document.getElementById('maMain').style.display = 'block';

            if (!totalItems) {
            document.getElementById('maEmpty').style.display = 'block';
        }

        // Load heatmap and analytics async
        loadHeatmap();
        loadAnalytics();
    } catch (e) {
        document.getElementById('maLoading').innerHTML = '<p style="text-align:center;color:var(--text-light);">Something went wrong. Please try again.</p>';
    }
}

async function loadProfileSummary(user) {
    document.getElementById('maName').textContent = (user.first_name || user.name || 'User') + ' ' + (user.last_name || '');
    var role = user.role || 'MEMBER';
    var roleLabel = { CUSTOMER: 'Customer', SELLER: 'Seller', FLORIST: 'Florist', GROWER: 'Grower', ADMIN: 'Admin', SUPERADMIN: 'Super Admin' };
    document.getElementById('maRole').textContent = roleLabel[role] || 'Member';
    if (user.profile_image) {
        document.getElementById('maAvatar').innerHTML = '<img src="' + escapeHtml(user.profile_image) + '" alt="">';
    }
}

async function loadStats(userId) {
    try {
        var data = await authFetch('/api/users/' + userId + '/stats');
        var repData = await authFetch('/api/members/' + userId + '/reputation');
        var clubData = await authFetch('/api/my-activities/clubs');
        var eventData = await authFetch('/api/events/my');

        var posts = data.discussions || 0;
        var discussions = data.questions || 0;
        var showcase = data.showcase || 0;
        var stories = data.stories || 0;
        var clubs = clubData.length || 0;
        var events = eventData.length || 0;
        var points = repData.points || 0;
        var likesReceived = 0;

        // Get likes count from posts
        try {
            var likeRes = await authFetch('/api/feed/insights');
            likesReceived = likeRes.likes || 0;
        } catch {}

        var totalItems = posts + stories + discussions + showcase + events + clubs;

        var statsHtml =
            renderStatCard('bi-file-text', 'Posts', posts, '#0ea5e9') +
            renderStatCard('bi-chat-dots', 'Discussions', discussions, '#f59e0b') +
            renderStatCard('bi-heart', 'Likes Received', likesReceived, '#ec4899') +
            renderStatCard('bi-images', 'Showcase', showcase, '#8b5cf6') +
            renderStatCard('bi-calendar-event', 'Events', events, '#10b981') +
            renderStatCard('bi-people', 'Clubs', clubs, '#14b8a6') +
            renderStatCard('bi-star', 'Reputation', points, '#f59e0b');

        document.getElementById('maStats').innerHTML = statsHtml;
    } catch {}
}

async function loadReputation(userId) {
    try {
        var r = await authFetch('/api/members/' + userId + '/reputation');
        if (!r) return;

        var stars = Math.min(5, Math.max(1, Math.ceil(r.level / 5)));
        document.getElementById('maStars').innerHTML = '★'.repeat(stars) + '☆'.repeat(5 - stars);
        document.getElementById('maLevel').innerHTML = '<i class="bi bi-graph-up-arrow"></i> Level ' + r.level + ' ' + escapeHtml(r.title);
        document.getElementById('maRepText').textContent = 'Community Reputation: ' + formatNumber(r.points);

        var nextLevelXP = (Math.pow(r.level, 2) * 10) + 200;
        var currentLevelXP = (Math.pow(r.level - 1, 2) * 10) + 200;
        var progress = Math.min(100, Math.round(((r.points - currentLevelXP) / (nextLevelXP - currentLevelXP)) * 100));

        var ways = ['Create quality posts', 'Receive likes', 'Answer questions', 'Host events', 'Complete courses', 'Upload showcase projects', 'Help other members'];

        document.getElementById('maRepSection').innerHTML =
            '<div class="rep-progress">' +
            '<div class="rep-header"><span class="rep-level">Level ' + r.level + ' <span style="font-weight:400;font-size:0.82rem;color:var(--text-light);">' + escapeHtml(r.title) + '</span></span><span class="rep-xp">' + formatNumber(r.points) + ' XP</span></div>' +
            '<div class="rep-bar-wrap"><div class="rep-bar-fill" style="width:' + Math.max(2, progress) + '%;"></div></div>' +
            '<div style="display:flex;justify-content:space-between;font-size:0.75rem;color:var(--text-muted);margin-bottom:0.75rem;"><span>' + formatNumber(r.points) + ' XP</span><span>Next Level: ' + formatNumber(nextLevelXP) + ' XP</span></div>' +
            '<div style="font-size:0.78rem;font-weight:500;color:var(--text-muted);margin-bottom:0.4rem;">Ways to earn points:</div>' +
            '<div class="rep-ways">' + ways.map(function(w) { return '<span class="rep-way">' + w + '</span>'; }).join('') + '</div>' +
            '</div>';
    } catch {}
}

var tlPage = 1;
var tlHasMore = true;
var tlLoading = false;

async function loadTimeline() {
    if (tlLoading || !tlHasMore) return;
    tlLoading = true;

    var btn = document.querySelector('#tlMore .btn');
    if (btn) { btn.textContent = 'Loading...'; btn.disabled = true; }

    try {
        var data = await authFetch('/api/my-activities/timeline?page=' + tlPage + '&limit=15');
        tlHasMore = data.hasMore;
        var el = document.getElementById('maTimeline');

        if (tlPage === 1) {
            if (!data.items || !data.items.length) {
                el.innerHTML = emptyState('bi-clock-history', 'No recent activity yet. Start contributing!');
                document.getElementById('tlMore').style.display = 'none';
                return;
            }
            el.innerHTML = '';
        }

        data.items.forEach(function(item) {
            el.innerHTML += renderTimelineItem(item);
        });

        tlPage++;
        document.getElementById('tlMore').style.display = tlHasMore ? 'block' : 'none';
    } catch {
        if (tlPage === 1) {
            document.getElementById('maTimeline').innerHTML = emptyState('bi-clock-history', 'Could not load activity.');
        }
    }

    if (btn) { btn.textContent = 'Load More'; btn.disabled = false; }
    tlLoading = false;
}

async function loadNotifications() {
    try {
        var data = await authFetch('/api/notifications');
        var el = document.getElementById('maNotifications');
        if (!data || !data.length) {
            el.innerHTML = emptyState('bi-bell', 'No notifications yet.');
            return;
        }
        el.innerHTML = data.slice(0, 5).map(function(n) { return renderNotification(n); }).join('');
        var allLink = '<div style="text-align:center;margin-top:0.5rem;"><a href="notifications.html" class="btn btn-sm btn-outline">View All Notifications</a></div>';
        el.innerHTML += allLink;
    } catch {
        document.getElementById('maNotifications').innerHTML = emptyState('bi-bell', 'Could not load notifications.');
    }
}

async function loadHeatmap() {
    try {
        var data = await authFetch('/api/my-activities/heatmap');
        var now = new Date();
        document.getElementById('maHeatmap').innerHTML = renderHeatmap(data, now.getFullYear(), now.getMonth() + 1);
    } catch {
        document.getElementById('maHeatmap').innerHTML = '<p style="font-size:0.85rem;color:var(--text-muted);">Activity calendar unavailable.</p>';
    }
}

async function loadAnalytics() {
    try {
        var data = await authFetch('/api/my-activities/analytics');
        var el = document.getElementById('maAnalytics');
        var html = '<div class="analytics-grid">' +
            '<div class="analytic-card"><div class="analytic-value">' + formatNumber(data.followers || 0) + '</div><div class="analytic-label">Followers</div></div>' +
            '<div class="analytic-card"><div class="analytic-value">' + formatNumber(data.following || 0) + '</div><div class="analytic-label">Following</div></div>' +
            '<div class="analytic-card"><div class="analytic-value">' + escapeHtml(data.most_active_day || 'N/A') + '</div><div class="analytic-label">Most Active Day</div></div>' +
            (data.top_post ? '<div class="analytic-card"><div class="analytic-value" style="font-size:1rem;"><i class="bi bi-file-text"></i></div><div class="analytic-label">Top Post</div><a class="top-link" href="feed.html?post=' + data.top_post.id + '">' + escapeHtml(data.top_post.title.substring(0, 30)) + '</a></div>' : '') +
            (data.top_discussion ? '<div class="analytic-card"><div class="analytic-value" style="font-size:1rem;"><i class="bi bi-chat-dots"></i></div><div class="analytic-label">Top Discussion</div><a class="top-link" href="discussion-detail.html?id=' + data.top_discussion.id + '">' + escapeHtml(data.top_discussion.title.substring(0, 30)) + '</a></div>' : '') +
            (data.top_story ? '<div class="analytic-card"><div class="analytic-value" style="font-size:1rem;"><i class="bi bi-heart"></i></div><div class="analytic-label">Top Story</div><a class="top-link" href="success-story-detail.html?id=' + data.top_story.id + '">' + escapeHtml(data.top_story.title.substring(0, 30)) + '</a></div>' : '') +
            '</div>';
        el.innerHTML = html;
    } catch {}
}

async function loadPosts() {
    var user = getCurrentUser();
    if (!user || !user.id) return;
    var el = document.getElementById('maPosts');
    el.innerHTML = '<div class="loading-spinner"><div class="spinner"></div></div>';

    try {
        var data = await authFetch('/api/users/' + user.id + '/discussions');
        if (!data || !data.length) {
            el.innerHTML = emptyState('bi-file-text', 'No posts yet. <a href="create-post.html" class="btn btn-sm" style="margin-top:0.5rem;">Create Post</a>');
            return;
        }
        el.innerHTML = data.slice(0, 6).map(function(p) { return renderPostCard(p); }).join('');
    } catch {
        el.innerHTML = emptyState('bi-file-text', 'Could not load posts.');
    }
}

async function loadDiscussions() {
    var user = getCurrentUser();
    if (!user || !user.id) return;
    var el = document.getElementById('maDiscussions');
    el.innerHTML = '<div class="loading-spinner"><div class="spinner"></div></div>';

    try {
        var data = await authFetch('/api/users/' + user.id + '/questions');
        if (!data || !data.length) {
            el.innerHTML = emptyState('bi-chat-dots', 'No discussions yet. <a href="create-discussion.html" class="btn btn-sm" style="margin-top:0.5rem;">Start a Discussion</a>');
            return;
        }
        el.innerHTML = data.slice(0, 6).map(function(d) { return renderDiscussionCard(d); }).join('');
    } catch {
        el.innerHTML = emptyState('bi-chat-dots', 'Could not load discussions.');
    }
}

async function loadShowcase() {
    var user = getCurrentUser();
    if (!user || !user.id) return;
    var el = document.getElementById('maShowcase');
    el.innerHTML = '<div class="loading-spinner"><div class="spinner"></div></div>';

    try {
        var data = await authFetch('/api/users/' + user.id + '/showcase');
        var items = data.showcase || [];
        el.innerHTML = renderShowcaseGrid(items);
    } catch {
        el.innerHTML = emptyState('bi-images', 'Could not load showcase.');
    }
}

async function loadEvents() {
    var el = document.getElementById('maEvents');
    el.innerHTML = '<div style="grid-column:1/-1;">' + '<div class="loading-spinner"><div class="spinner"></div></div></div>';

    try {
        var data = await authFetch('/api/events/my');
        if (!data || !data.length) {
            el.innerHTML = '<div style="grid-column:1/-1;">' + emptyState('bi-calendar-event', 'No events joined yet. <a href="events.html" class="btn btn-sm" style="margin-top:0.5rem;">Browse Events</a>') + '</div>';
            return;
        }

        var upcoming = data.filter(function(e) { return e.event_status !== 'completed'; });
        var past = data.filter(function(e) { return e.event_status === 'completed'; });

        el.innerHTML =
            '<div><h4 style="font-size:0.88rem;color:var(--text-muted);margin-bottom:0.75rem;">Upcoming</h4>' +
            (upcoming.length ? upcoming.map(function(e) { return renderEventCard(e); }).join('') : '<p style="font-size:0.82rem;color:var(--text-muted);">No upcoming events.</p>') + '</div>' +
            '<div><h4 style="font-size:0.88rem;color:var(--text-muted);margin-bottom:0.75rem;">Past Events</h4>' +
            (past.length ? past.map(function(e) { return renderEventCard(e); }).join('') : '<p style="font-size:0.82rem;color:var(--text-muted);">No past events.</p>') + '</div>';
    } catch {
        el.innerHTML = '<div style="grid-column:1/-1;">' + emptyState('bi-calendar-event', 'Could not load events.') + '</div>';
    }
}

async function loadClubs() {
    var el = document.getElementById('maClubs');
    el.innerHTML = '<div class="loading-spinner" style="grid-column:1/-1;"><div class="spinner"></div></div>';

    try {
        var data = await authFetch('/api/my-activities/clubs');
        if (!data || !data.length) {
            el.innerHTML = '<div style="grid-column:1/-1;">' + emptyState('bi-people', 'Not a member of any clubs yet. <a href="clubs.html" class="btn btn-sm" style="margin-top:0.5rem;">Browse Clubs</a>') + '</div>';
            return;
        }
        el.innerHTML = data.map(function(c) { return renderClubCard(c); }).join('');
    } catch {
        el.innerHTML = '<div style="grid-column:1/-1;">' + emptyState('bi-people', 'Could not load clubs.') + '</div>';
    }
}

async function loadSaved() {
    var elPosts = document.getElementById('maSavedPosts');
    var elStories = document.getElementById('maSavedStories');

    try {
        var data = await authFetch('/api/my-activities/saved');

        elPosts.innerHTML = '<h4 style="font-size:0.88rem;color:var(--text-muted);margin-bottom:0.5rem;">Saved Posts</h4>' +
            (data.posts && data.posts.length ? '<div class="saved-list">' + data.posts.map(function(p) { return renderSavedPost(p); }).join('') + '</div>' : '<p style="font-size:0.82rem;color:var(--text-muted);">No saved posts yet.</p>');

        elStories.innerHTML = '<h4 style="font-size:0.88rem;color:var(--text-muted);margin-bottom:0.5rem;">Saved Stories</h4>' +
            (data.stories && data.stories.length ? '<div class="saved-list">' + data.stories.map(function(s) { return renderSavedStory(s); }).join('') + '</div>' : '<p style="font-size:0.82rem;color:var(--text-muted);">No saved stories yet.</p>');
    } catch {
        elPosts.innerHTML = '<p style="font-size:0.85rem;color:var(--text-muted);">Could not load saved content.</p>';
        elStories.innerHTML = '';
    }
}

async function loadAchievements() {
    var user = getCurrentUser();
    if (!user || !user.id) return;
    var el = document.getElementById('maAchievements');
    el.innerHTML = '<div class="loading-spinner" style="grid-column:1/-1;"><div class="spinner"></div></div>';

    try {
        var data = await authFetch('/api/badges/user/' + user.id);
        if (!data || !data.length) {
            el.innerHTML = '<div style="grid-column:1/-1;">' + emptyState('bi-trophy', 'No badges earned yet. Start contributing to earn achievements!') + '</div>';
            return;
        }
        el.innerHTML = data.map(function(b) { return renderAchievementBadge(b); }).join('');
    } catch {
        el.innerHTML = '<div style="grid-column:1/-1;">' + emptyState('bi-trophy', 'Could not load achievements.') + '</div>';
    }
}

function loadPrivacy() {
    var el = document.getElementById('maPrivacy');
    el.innerHTML =
        renderPrivacyCheckbox('privacy_public', 'Public Profile', MA.privacySettings.public_profile) +
        renderPrivacyCheckbox('privacy_showcase', 'Show Showcase', MA.privacySettings.show_showcase) +
        renderPrivacyCheckbox('privacy_events', 'Show Events', MA.privacySettings.show_events) +
        renderPrivacyCheckbox('privacy_saved', 'Show Saved Items', MA.privacySettings.show_saved) +
        renderPrivacyCheckbox('privacy_achievements', 'Show Achievements', MA.privacySettings.show_achievements);

    document.querySelectorAll('#maPrivacy input[type="checkbox"]').forEach(function(cb) {
        cb.addEventListener('change', function() {
            MA.privacySettings[this.id.replace('privacy_', '')] = this.checked;
            try { localStorage.setItem('ma-privacy', JSON.stringify(MA.privacySettings)); } catch {}
        });
    });
}

// ─── Tab switching ──────────────────────────────────────────────────────

document.addEventListener('DOMContentLoaded', function() {
    document.querySelectorAll('.ma-tab').forEach(function(tab) {
        tab.addEventListener('click', function() {
            document.querySelectorAll('.ma-tab').forEach(function(t) { t.classList.remove('active'); });
            document.querySelectorAll('.tab-panel').forEach(function(p) { p.classList.remove('active'); });
            tab.classList.add('active');
            var panel = document.getElementById('tab-' + tab.dataset.tab);
            if (panel) panel.classList.add('active');

            var tabName = tab.dataset.tab;
            if (tabName === 'posts' && !tab._loaded) { tab._loaded = true; loadPosts(); }
            if (tabName === 'discussions' && !tab._loaded) { tab._loaded = true; loadDiscussions(); }
            if (tabName === 'showcase-tab' && !tab._loaded) { tab._loaded = true; loadShowcase(); }
            if (tabName === 'events' && !tab._loaded) { tab._loaded = true; loadEvents(); }
            if (tabName === 'clubs' && !tab._loaded) { tab._loaded = true; loadClubs(); }
            if (tabName === 'saved' && !tab._loaded) { tab._loaded = true; loadSaved(); }
            if (tabName === 'achievements' && !tab._loaded) { tab._loaded = true; loadAchievements(); }
        });
    });

    // Restore privacy settings
    try {
        var saved = JSON.parse(localStorage.getItem('ma-privacy') || '{}');
        Object.keys(saved).forEach(function(k) { MA.privacySettings[k] = saved[k]; });
    } catch {}
    loadPrivacy();

    // Load main page
    loadMyActivities();
});
