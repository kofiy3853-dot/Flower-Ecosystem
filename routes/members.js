const router = require('express').Router();
const { pool, asyncHandler, dbAvailable, requireAuth } = require('./middleware');

// ─── Community stats ───────────────────────────────────────────────────

router.get('/members/stats', asyncHandler(async (_, res) => {
    if (!(await dbAvailable())) return res.json({ members: 0, countries: 0, active_today: 0, businesses: 0, experts: 0, clubs: 0 });
    try {
        const [mr, cr, ar, br, er, clr] = await Promise.all([
            pool.query("SELECT COUNT(*)::int AS c FROM auth.users WHERE is_active = true"),
            pool.query("SELECT COUNT(DISTINCT country)::int AS c FROM auth.users WHERE country IS NOT NULL AND country != ''"),
            pool.query("SELECT COUNT(*)::int AS c FROM auth.users WHERE is_active = true AND created_at >= CURRENT_DATE"),
            pool.query("SELECT COUNT(*)::int AS c FROM auth.users WHERE role IN ('SELLER','FLORIST','GROWER')"),
            pool.query("SELECT COUNT(*)::int AS c FROM auth.users WHERE role IN ('INSTRUCTOR','ADMIN','SUPERADMIN','MODERATOR')"),
            pool.query('SELECT COUNT(*)::int AS c FROM community.clubs')
        ]);
        res.json({
            members: mr.rows[0].c,
            countries: cr.rows[0].c,
            active_today: ar.rows[0].c,
            businesses: br.rows[0].c,
            experts: er.rows[0].c,
            clubs: clr.rows[0].c
        });
    } catch { res.json({ members: 0, countries: 0, active_today: 0, businesses: 0, experts: 0, clubs: 0 }); }
}));

// ─── Featured members ──────────────────────────────────────────────────

router.get('/members/featured', asyncHandler(async (_, res) => {
    if (!(await dbAvailable())) return res.json([]);
    try {
        const r = await pool.query(`
            SELECT u.id, u.first_name, u.last_name, u.profile_image, u.role, u.description, u.country,
                (SELECT COUNT(*)::int FROM platform.follows WHERE following_id = u.id) AS followers,
                COALESCE((SELECT points FROM qa.user_points WHERE user_id = u.id), 0) AS points
            FROM auth.users u
            WHERE u.is_active = true AND (u.role IN ('FLORIST','INSTRUCTOR','GROWER','ADMIN','SUPERADMIN')
                OR EXISTS (SELECT 1 FROM community.discussions WHERE user_id = u.id)
                OR EXISTS (SELECT 1 FROM qa.questions WHERE user_id = u.id))
            ORDER BY (SELECT COUNT(*)::int FROM platform.follows WHERE following_id = u.id) DESC,
                     COALESCE((SELECT points FROM qa.user_points WHERE user_id = u.id), 0) DESC
            LIMIT 6`);
        res.json(r.rows);
    } catch { res.json([]); }
}));

// ─── New members ───────────────────────────────────────────────────────

router.get('/members/new', asyncHandler(async (_, res) => {
    if (!(await dbAvailable())) return res.json([]);
    try {
        const r = await pool.query(`
            SELECT id, first_name, last_name, profile_image, role, created_at
            FROM auth.users WHERE is_active = true
            ORDER BY created_at DESC LIMIT 6`);
        res.json(r.rows);
    } catch { res.json([]); }
}));

// ─── Top contributors (by engagement score) ───────────────────────────

router.get('/members/top', asyncHandler(async (_, res) => {
    if (!(await dbAvailable())) return res.json([]);
    try {
        const r = await pool.query(`
            SELECT u.id, u.first_name, u.last_name, u.profile_image, u.role, u.description,
                (SELECT COUNT(*)::int FROM community.discussions WHERE user_id = u.id) +
                (SELECT COUNT(*)::int FROM qa.answers WHERE user_id = u.id) * 2 +
                (SELECT COUNT(*)::int FROM community.success_stories WHERE user_id = u.id) * 3 +
                COALESCE((SELECT points FROM qa.user_points WHERE user_id = u.id), 0) AS score
            FROM auth.users u
            WHERE u.is_active = true
                AND ((SELECT COUNT(*)::int FROM community.discussions WHERE user_id = u.id) > 0
                    OR (SELECT COUNT(*)::int FROM qa.answers WHERE user_id = u.id) > 0)
            ORDER BY score DESC LIMIT 10`);
        res.json(r.rows);
    } catch { res.json([]); }
}));

// ─── Suggested connections ─────────────────────────────────────────────

router.get('/members/suggested', requireAuth, asyncHandler(async (req, res) => {
    if (!(await dbAvailable())) return res.json([]);
    try {
        // Find members who share clubs with the current user
        const r = await pool.query(`
            SELECT DISTINCT u.id, u.first_name, u.last_name, u.profile_image, u.role,
                (SELECT COUNT(*)::int FROM platform.follows WHERE following_id = u.id) AS followers,
                (SELECT cm2.club_id FROM community.club_members cm2 WHERE cm2.user_id = u.id LIMIT 1) AS shared_club_id
            FROM auth.users u
            JOIN community.club_members cm ON cm.user_id = u.id
            WHERE u.id != $1 AND u.is_active = true
                AND cm.club_id IN (SELECT club_id FROM community.club_members WHERE user_id = $1)
                AND NOT EXISTS (SELECT 1 FROM platform.follows WHERE follower_id = $1 AND following_id = u.id)
            LIMIT 6`, [req.user.id]);
        if (r.rows.length) return res.json(r.rows);

        // Fallback: suggest active members
        const fallback = await pool.query(`
            SELECT u.id, u.first_name, u.last_name, u.profile_image, u.role,
                (SELECT COUNT(*)::int FROM platform.follows WHERE following_id = u.id) AS followers
            FROM auth.users u
            WHERE u.id != $1 AND u.is_active = true
                AND NOT EXISTS (SELECT 1 FROM platform.follows WHERE follower_id = $1 AND following_id = u.id)
            ORDER BY (SELECT COUNT(*)::int FROM platform.follows WHERE following_id = u.id) DESC
            LIMIT 6`, [req.user.id]);
        res.json(fallback.rows);
    } catch { res.json([]); }
}));

// ─── Member activity feed ──────────────────────────────────────────────

router.get('/members/:id/activity', asyncHandler(async (req, res) => {
    if (!(await dbAvailable())) return res.json([]);
    const uid = req.params.id;
    const items = [];

    try {
        const d = await pool.query("SELECT id, 'discussion' AS type, title AS label, created_at FROM community.discussions WHERE user_id = $1 ORDER BY created_at DESC LIMIT 5", [uid]);
        d.rows.forEach(r => items.push({ id: r.id, type: r.type, label: r.label, created_at: r.created_at }));
    } catch {}
    try {
        const q = await pool.query("SELECT id, 'question' AS type, title AS label, created_at FROM qa.questions WHERE user_id = $1 ORDER BY created_at DESC LIMIT 5", [uid]);
        q.rows.forEach(r => items.push({ id: r.id, type: r.type, label: r.label, created_at: r.created_at }));
    } catch {}
    try {
        const s = await pool.query("SELECT id, 'story' AS type, title AS label, created_at FROM community.success_stories WHERE user_id = $1 ORDER BY created_at DESC LIMIT 5", [uid]);
        s.rows.forEach(r => items.push({ id: r.id, type: r.type, label: r.label, created_at: r.created_at }));
    } catch {}
    try {
        const p = await pool.query("SELECT id, 'showcase' AS type, title AS label, created_at FROM community.posts WHERE user_id = $1 AND post_type = 'showcase' ORDER BY created_at DESC LIMIT 5", [uid]);
        p.rows.forEach(r => items.push({ id: r.id, type: r.type, label: r.label, created_at: r.created_at }));
    } catch {}

    items.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
    res.json(items.slice(0, 10));
}));

// ─── Member reputation ─────────────────────────────────────────────────

router.get('/members/:id/reputation', asyncHandler(async (req, res) => {
    if (!(await dbAvailable())) return res.json({ points: 0, level: 1, title: 'Newcomer' });
    try {
        const [qp, dr, sr] = await Promise.all([
            pool.query("SELECT points, questions_asked, answers_given, best_answers FROM qa.user_points WHERE user_id = $1", [req.params.id]),
            pool.query('SELECT COUNT(*)::int AS c FROM community.discussions WHERE user_id = $1', [req.params.id]),
            pool.query('SELECT COUNT(*)::int AS c FROM community.success_stories WHERE user_id = $1', [req.params.id])
        ]);

        const qaPoints = qp.rows.length ? qp.rows[0].points : 0;
        const discussions = dr.rows[0].c || 0;
        const stories = sr.rows[0].c || 0;
        const bestAnswers = qp.rows.length ? qp.rows[0].best_answers : 0;

        // Score = QA points + discussions*5 + stories*10 + best_answers*25
        const total = qaPoints + discussions * 5 + stories * 10 + bestAnswers * 25;
        const level = Math.floor(Math.sqrt(total / 10)) + 1;
        let title = 'Newcomer';
        if (level >= 20) title = 'Grandmaster';
        else if (level >= 15) title = 'Community Legend';
        else if (level >= 10) title = 'Master Florist';
        else if (level >= 7) title = 'Expert';
        else if (level >= 5) title = 'Community Helper';
        else if (level >= 3) title = 'Active Member';

        // Percentile rank
        const [pr, ab] = await Promise.all([
            pool.query('SELECT COUNT(*)::int AS c FROM auth.users WHERE is_active = true'),
            pool.query(`
                SELECT COUNT(*)::int AS c FROM (
                    SELECT u.id, COALESCE(qp.points,0) + (SELECT COUNT(*)::int FROM community.discussions WHERE user_id = u.id)*5 +
                        (SELECT COUNT(*)::int FROM community.success_stories WHERE user_id = u.id)*10 AS score
                    FROM auth.users u LEFT JOIN qa.user_points qp ON qp.user_id = u.id
                ) scores WHERE score > $1`, [total])
        ]);
        const totalUsers = pr.rows[0].c || 1;
        const aboveCount = ab.rows[0].c || 0;
        const pct = Math.round(((totalUsers - aboveCount) / totalUsers) * 100);

        res.json({ points: total, level, title, best_answers: bestAnswers, percentile: Math.min(100, pct) });
    } catch { res.json({ points: 0, level: 1, title: 'Newcomer', percentile: 0 }); }
}));

module.exports = router;
