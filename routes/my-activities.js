const router = require('express').Router();
const { pool, asyncHandler, dbAvailable, requireAuth } = require('./middleware');

// ─── Activity timeline (paginated, aggregated) ───────────────────────────

router.get('/my-activities/timeline', requireAuth, asyncHandler(async (req, res) => {
    if (!(await dbAvailable())) return res.json([]);
    const page = Math.max(1, parseInt(req.query.page, 10) || 1);
    const limit = Math.min(50, Math.max(1, parseInt(req.query.limit, 10) || 20));
    const offset = (page - 1) * limit;
    const uid = req.user.id;
    const items = [];

    try {
        const d = await pool.query("SELECT id, title AS label, 'discussion' AS type, created_at FROM community.discussions WHERE user_id = $1 ORDER BY created_at DESC LIMIT 20", [uid]);
        d.rows.forEach(r => items.push({ id: r.id, type: r.type, label: r.label, created_at: r.created_at }));
    } catch {}
    try {
        const q = await pool.query("SELECT id, title AS label, 'question' AS type, created_at FROM qa.questions WHERE user_id = $1 ORDER BY created_at DESC LIMIT 20", [uid]);
        q.rows.forEach(r => items.push({ id: r.id, type: r.type, label: r.label, created_at: r.created_at }));
    } catch {}
    try {
        const s = await pool.query("SELECT id, title AS label, 'story' AS type, created_at FROM community.success_stories WHERE user_id = $1 ORDER BY created_at DESC LIMIT 20", [uid]);
        s.rows.forEach(r => items.push({ id: r.id, type: r.type, label: r.label, created_at: r.created_at }));
    } catch {}
    try {
        const p = await pool.query("SELECT id, title AS label, 'showcase' AS type, created_at FROM community.posts WHERE user_id = $1 AND post_type = 'showcase' ORDER BY created_at DESC LIMIT 20", [uid]);
        p.rows.forEach(r => items.push({ id: r.id, type: r.type, label: r.label, created_at: r.created_at }));
    } catch {}
    try {
        const e = await pool.query("SELECT e.id, e.title AS label, 'event' AS type, er.registered_at AS created_at FROM events.event_registrations er JOIN events.events e ON e.id = er.event_id WHERE er.user_id = $1 ORDER BY er.registered_at DESC LIMIT 20", [uid]);
        e.rows.forEach(r => items.push({ id: r.id, type: r.type, label: r.label, created_at: r.created_at }));
    } catch {}
    try {
        const l = await pool.query("SELECT cl.id, cl.name AS label, 'club_join' AS type, cm.joined_at AS created_at FROM community.club_members cm JOIN community.clubs cl ON cl.id = cm.club_id WHERE cm.user_id = $1 ORDER BY cm.joined_at DESC LIMIT 20", [uid]);
        l.rows.forEach(r => items.push({ id: r.id, type: r.type, label: r.label, created_at: r.created_at }));
    } catch {}

    items.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
    const total = items.length;
    const paginated = items.slice(offset, offset + limit);
    res.json({ items: paginated, total, page, hasMore: offset + limit < total });
}));

// ─── Saved content (posts + stories) ──────────────────────────────────────

router.get('/my-activities/saved', requireAuth, asyncHandler(async (req, res) => {
    if (!(await dbAvailable())) return res.json({ posts: [], stories: [], discussions: [] });
    const uid = req.user.id;
    const result = { posts: [], stories: [], discussions: [] };

    try {
        const p = await pool.query(`
            SELECT p.id, p.title, p.content, p.like_count, p.comment_count, p.created_at,
                u.first_name, u.last_name, u.profile_image
            FROM community.post_saves ps
            JOIN community.posts p ON p.id = ps.post_id
            LEFT JOIN auth.users u ON u.id = p.user_id
            WHERE ps.user_id = $1 ORDER BY ps.created_at DESC LIMIT 20`, [uid]);
        result.posts = p.rows;
    } catch {}
    try {
        const s = await pool.query(`
            SELECT s.id, s.title, s.content, s.like_count, s.cover_image, s.created_at,
                u.first_name, u.last_name, u.profile_image
            FROM community.story_bookmarks sb
            JOIN community.success_stories s ON s.id = sb.story_id
            LEFT JOIN auth.users u ON u.id = s.user_id
            WHERE sb.user_id = $1 ORDER BY sb.created_at DESC LIMIT 20`, [uid]);
        result.stories = s.rows;
    } catch {}

    res.json(result);
}));

// ─── User's clubs with membership role ───────────────────────────────────

router.get('/my-activities/clubs', requireAuth, asyncHandler(async (req, res) => {
    if (!(await dbAvailable())) return res.json([]);
    try {
        const r = await pool.query(`
            SELECT c.*, cm.role AS membership_role, cm.joined_at
            FROM community.club_members cm
            JOIN community.clubs c ON c.id = cm.club_id
            WHERE cm.user_id = $1 ORDER BY cm.joined_at DESC`, [req.user.id]);
        res.json(r.rows);
    } catch { res.json([]); }
}));

// ─── Contribution heatmap (GitHub-style calendar) ────────────────────────

router.get('/my-activities/heatmap', requireAuth, asyncHandler(async (req, res) => {
    if (!(await dbAvailable())) return res.json([]);
    const uid = req.user.id;
    const months = parseInt(req.query.months, 10) || 12;
    const since = new Date();
    since.setMonth(since.getMonth() - months);

    try {
        const r = await pool.query(`
            SELECT DATE(created_at) AS day, COUNT(*)::int AS count FROM (
                SELECT created_at FROM community.discussions WHERE user_id = $1 AND created_at >= $2
                UNION ALL SELECT created_at FROM qa.questions WHERE user_id = $1 AND created_at >= $2
                UNION ALL SELECT created_at FROM community.success_stories WHERE user_id = $1 AND created_at >= $2
                UNION ALL SELECT created_at FROM community.posts WHERE user_id = $1 AND post_type = 'showcase' AND created_at >= $2
                UNION ALL SELECT registered_at FROM events.event_registrations WHERE user_id = $1 AND registered_at >= $2
                UNION ALL SELECT joined_at FROM community.club_members WHERE user_id = $1 AND joined_at >= $2
            ) acts GROUP BY DATE(created_at) ORDER BY day`, [uid, since]);
        res.json(r.rows);
    } catch { res.json([]); }
}));

// ─── Analytics ────────────────────────────────────────────────────────────

router.get('/my-activities/analytics', requireAuth, asyncHandler(async (req, res) => {
    if (!(await dbAvailable())) return res.json({});
    const uid = req.user.id;
    try {
        const [followers, following, topPosts, topDiscussions, bestStory, weekday] = await Promise.all([
            pool.query('SELECT COUNT(*)::int AS c FROM platform.follows WHERE following_id = $1', [uid]),
            pool.query('SELECT COUNT(*)::int AS c FROM platform.follows WHERE follower_id = $1', [uid]),
            pool.query("SELECT id, title, like_count, comment_count FROM community.posts WHERE user_id = $1 AND post_type != 'showcase' ORDER BY like_count + comment_count DESC LIMIT 1", [uid]),
            pool.query("SELECT id, title FROM community.discussions WHERE user_id = $1 ORDER BY views DESC LIMIT 1", [uid]),
            pool.query("SELECT id, title, like_count FROM community.success_stories WHERE user_id = $1 ORDER BY like_count DESC LIMIT 1", [uid]),
            pool.query(`
                SELECT EXTRACT(DOW FROM created_at)::int AS dow, COUNT(*)::int AS c FROM (
                    SELECT created_at FROM community.discussions WHERE user_id = $1
                    UNION ALL SELECT created_at FROM community.posts WHERE user_id = $1
                ) acts GROUP BY dow ORDER BY c DESC LIMIT 1`, [uid])
        ]);

        const weekdayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
        const mostActiveDay = weekday.rows.length ? weekdayNames[weekday.rows[0].dow] : 'N/A';

        res.json({
            followers: followers.rows[0].c || 0,
            following: following.rows[0].c || 0,
            top_post: topPosts.rows.length ? { id: topPosts.rows[0].id, title: topPosts.rows[0].title } : null,
            top_discussion: topDiscussions.rows.length ? { id: topDiscussions.rows[0].id, title: topDiscussions.rows[0].title } : null,
            top_story: bestStory.rows.length ? { id: bestStory.rows[0].id, title: bestStory.rows[0].title } : null,
            most_active_day: mostActiveDay
        });
    } catch { res.json({}); }
}));

module.exports = router;
