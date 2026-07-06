const router = require('express').Router();
const { pool, asyncHandler, dbAvailable, requireAuth } = require('./middleware');

// ─── Badge criteria checker ─────────────────────────────────────────────
async function checkAndAwardBadges(userId) {
    if (!(await dbAvailable())) return [];
    const awarded = [];
    try {
        const existing = await pool.query('SELECT badge_id FROM community.user_badges WHERE user_id = $1', [userId]);
        const owned = new Set(existing.rows.map(r => r.badge_id));

        // Gather user stats in parallel
        const [discussions, stories, showcasePosts, bestAnswers, clubJoins, registrations, accountAge] = await Promise.all([
            pool.query('SELECT COUNT(*)::int AS c FROM community.discussions WHERE user_id = $1', [userId]),
            pool.query('SELECT COUNT(*)::int AS c FROM community.success_stories WHERE user_id = $1', [userId]),
            pool.query("SELECT COUNT(*)::int AS c, COALESCE(SUM(like_count),0)::int AS total_likes FROM community.posts WHERE user_id = $1 AND post_type = 'showcase'", [userId]),
            pool.query('SELECT COUNT(*)::int AS c FROM community.discussion_comments WHERE user_id = $1 AND is_best_answer = true', [userId]),
            pool.query('SELECT COUNT(*)::int AS c FROM community.club_members WHERE user_id = $1', [userId]),
            pool.query('SELECT COUNT(*)::int AS c FROM events.event_registrations WHERE user_id = $1', [userId]),
            pool.query("SELECT EXTRACT(EPOCH FROM (NOW() - created_at)) / 86400::int AS days FROM auth.users WHERE id = $1", [userId])
        ]);

        const stats = {
            discussions: discussions.rows[0].c,
            stories: stories.rows[0].c,
            showcase_count: showcasePosts.rows[0].c,
            showcase_likes: showcasePosts.rows[0].total_likes,
            best_answers: bestAnswers.rows[0].c,
            club_joins: clubJoins.rows[0].c,
            event_registrations: registrations.rows[0].c,
            days_active: accountAge.rows[0]?.days || 0
        };

        const totalActivity = stats.discussions + stats.stories + stats.showcase_count + stats.best_answers;

        // Badge criteria
        const criteria = {
            'rising-star':     stats.showcase_count >= 1,
            'garden-guru':     false, // requires garden tracking (not yet implemented)
            'floral-expert':   stats.best_answers >= 10,
            'community-hero':  totalActivity >= 50,
            'green-thumb':     stats.days_active >= 180,
            'top-creator':     stats.showcase_count >= 1 && stats.showcase_likes > 0, // simplified: has a liked showcase
            'conversation-starter': stats.discussions >= 10,
            'helping-hand':    (await pool.query('SELECT COUNT(*)::int AS c FROM community.discussion_comments WHERE user_id = $1', [userId])).rows[0].c >= 20,
            'master-florist':  stats.showcase_count >= 10 && stats.showcase_likes >= 100,
            'loyal-member':    stats.days_active >= 365
        };

        // Award qualifying badges
        for (const [slug, met] of Object.entries(criteria)) {
            if (!met) continue;
            const badge = await pool.query('SELECT id FROM community.badges WHERE slug = $1', [slug]);
            if (badge.rows.length && !owned.has(badge.rows[0].id)) {
                await pool.query('INSERT INTO community.user_badges (user_id, badge_id) VALUES ($1, $2) ON CONFLICT DO NOTHING', [userId, badge.rows[0].id]);
                awarded.push(slug);
            }
        }
    } catch (err) { console.error('Badge check error:', err.message); }
    return awarded;
}

// ─── List all badges ────────────────────────────────────────────────────

router.get('/badges', asyncHandler(async (req, res) => {
    if (await dbAvailable()) {
        try {
            const { category } = req.query;
            const values = [];
            let where = '';
            if (category) { values.push(category); where = 'WHERE category = $1'; }
            const r = await pool.query(`SELECT * FROM community.badges ${where} ORDER BY sort_order ASC`, values);
            return res.json(r.rows);
        } catch (err) { console.error('Badges list error:', err.message); }
    }
    res.json([]);
}));

// ─── Get user badges ────────────────────────────────────────────────────

router.get('/badges/user/:userId', asyncHandler(async (req, res) => {
    if (!(await dbAvailable())) return res.json([]);
    try {
        const r = await pool.query(`
            SELECT b.*, ub.awarded_at
            FROM community.user_badges ub
            JOIN community.badges b ON b.id = ub.badge_id
            WHERE ub.user_id = $1
            ORDER BY ub.awarded_at DESC`, [req.params.userId]);
        return res.json(r.rows);
    } catch (err) { console.error('User badges error:', err.message); }
    res.json([]);
}));

// ─── Badge stats ────────────────────────────────────────────────────────

router.get('/badges/stats', asyncHandler(async (_, res) => {
    if (await dbAvailable()) {
        try {
            const r = await pool.query('SELECT COUNT(*)::int AS c FROM community.user_badges');
            return res.json({ awarded: r.rows[0].c });
        } catch {}
    }
    res.json({ awarded: 0 });
}));

// ─── Check and award badges for current user ────────────────────────────

router.post('/badges/check', requireAuth, asyncHandler(async (req, res) => {
    const awarded = await checkAndAwardBadges(req.user.id);
    res.json({ awarded, count: awarded.length });
}));

// ─── Check and award badges for a specific user (admin) ─────────────────

router.post('/badges/check/:userId', requireAuth, asyncHandler(async (req, res) => {
    if (req.user.role !== 'ADMIN' && req.user.role !== 'SUPERADMIN') {
        return res.status(403).json({ error: 'Not authorized' });
    }
    const awarded = await checkAndAwardBadges(req.params.userId);
    res.json({ awarded, count: awarded.length });
}));

module.exports = router;
module.exports.checkAndAwardBadges = checkAndAwardBadges;
