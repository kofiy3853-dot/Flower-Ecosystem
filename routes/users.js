const router = require('express').Router();
const { pool, dbAvailable, asyncHandler, requireAuth } = require('./middleware');

router.get('/:id', asyncHandler(async (req, res) => {
    if (!(await dbAvailable())) return res.status(503).json({ error: 'Service unavailable' });
    const r = await pool.query(
        'SELECT id, first_name, last_name, role, created_at, profile_image, cover_image, description, location, city, website, social_instagram, social_facebook, social_twitter FROM auth.users WHERE id = $1',
        [req.params.id]
    );
    if (!r.rows.length) return res.status(404).json({ error: 'User not found' });
    res.json({ user: r.rows[0] });
}));

router.get('/:id/stats', asyncHandler(async (req, res) => {
    if (!(await dbAvailable())) return res.status(503).json({ error: 'Service unavailable' });
    const uid = req.params.id;
    const counts = { discussions: 0, questions: 0, stories: 0, reviews: 0, showcase: 0 };

    try {
        const dr = await pool.query('SELECT COUNT(*)::int AS c FROM community.discussions WHERE user_id = $1', [uid]);
        counts.discussions = dr.rows[0].c;
    } catch { console.error('Stats discussions error:', uid); }
    try {
        const qr = await pool.query('SELECT COUNT(*)::int AS c FROM qa.questions WHERE user_id = $1', [uid]);
        counts.questions = qr.rows[0].c;
    } catch { console.error('Stats questions error:', uid); }
    try {
        const sr = await pool.query('SELECT COUNT(*)::int AS c FROM community.success_stories WHERE user_id = $1', [uid]);
        counts.stories = sr.rows[0].c;
    } catch { console.error('Stats stories error:', uid); }
    try {
        const rr = await pool.query('SELECT COUNT(*)::int AS c FROM marketplace.reviews WHERE user_id = $1', [uid]);
        counts.reviews = rr.rows[0].c;
    } catch (err) { console.error('Stats reviews error:', err.message); }
    try {
        const scr = await pool.query("SELECT COUNT(*)::int AS c FROM community.posts WHERE user_id = $1 AND post_type = 'showcase'", [uid]);
        counts.showcase = scr.rows[0].c;
    } catch { console.error('Stats showcase error:', uid); }

    res.json(counts);
}));

router.get('/:id/discussions', asyncHandler(async (req, res) => {
    if (!(await dbAvailable())) return res.status(503).json({ error: 'Service unavailable' });
    try {
        const r = await pool.query(
            `SELECT d.id, d.title, d.content, d.created_at, d.views,
                    (SELECT COUNT(*)::int FROM community.discussion_comments WHERE discussion_id = d.id) AS reply_count
             FROM community.discussions d WHERE d.user_id = $1 ORDER BY d.created_at DESC LIMIT 20`,
            [req.params.id]
        );
        res.json({ discussions: r.rows });
    } catch { res.json({ discussions: [] }); }
}));

router.get('/:id/questions', asyncHandler(async (req, res) => {
    if (!(await dbAvailable())) return res.status(503).json({ error: 'Service unavailable' });
    try {
        const r = await pool.query(
            `SELECT q.id, q.title, q.content, q.created_at, q.views,
                    (SELECT COUNT(*)::int FROM qa.answers WHERE question_id = q.id) AS answer_count
             FROM qa.questions q WHERE q.user_id = $1 ORDER BY q.created_at DESC LIMIT 20`,
            [req.params.id]
        );
        res.json({ questions: r.rows });
    } catch { res.json({ questions: [] }); }
}));

router.get('/:id/stories', asyncHandler(async (req, res) => {
    if (!(await dbAvailable())) return res.status(503).json({ error: 'Service unavailable' });
    try {
        const r = await pool.query(
            `SELECT s.id, s.title, s.content, s.created_at, s.views, s.like_count
             FROM community.success_stories s WHERE s.user_id = $1 ORDER BY s.created_at DESC LIMIT 20`,
            [req.params.id]
        );
        res.json({ stories: r.rows });
    } catch { res.json({ stories: [] }); }
}));

router.get('/:id/showcase', asyncHandler(async (req, res) => {
    if (!(await dbAvailable())) return res.status(503).json({ error: 'Service unavailable' });
    try {
        const r = await pool.query(
            `SELECT p.id, p.title, p.content, p.created_at, p.media_urls,
                    (SELECT COUNT(*)::int FROM community.comments WHERE post_id = p.id) AS comment_count
             FROM community.posts p WHERE p.user_id = $1 AND p.post_type = 'showcase' ORDER BY p.created_at DESC LIMIT 50`,
            [req.params.id]
        );
        res.json({ showcase: r.rows.map(p => ({ ...p, images: p.media_urls || [] })) });
    } catch { res.json({ showcase: [] }); }
}));

// ─── Members directory ────────────────────────────────────────
router.get('/list/members', asyncHandler(async (req, res) => {
    if (!(await dbAvailable())) return res.json({ members: [], total: 0 });
    const { role, search, sort = 'recent', page = 1, limit = 24 } = req.query;
    const pg = Math.max(1, parseInt(page) || 1);
    const lim = Math.min(100, Math.max(1, parseInt(limit) || 24));
    const offset = (pg - 1) * lim;

    try {
        const conditions = ['u.is_active = true'];
        const values = [];
        let idx = 1;
        if (role) { conditions.push(`u.role = $${idx}`); values.push(role.toUpperCase()); idx++; }
        if (search) { conditions.push(`(u.first_name ILIKE $${idx} OR u.last_name ILIKE $${idx} OR u.business_name ILIKE $${idx})`); values.push(`%${search}%`); idx++; }

        const where = 'WHERE ' + conditions.join(' AND ');
        const sortMap = {
            recent: 'u.created_at DESC',
            name: 'u.first_name ASC',
            discussions: '(SELECT COUNT(*) FROM community.discussions WHERE user_id = u.id) DESC',
            answers: '(SELECT COUNT(*) FROM qa.answers WHERE user_id = u.id) DESC',
            showcase: "(SELECT COUNT(*) FROM community.posts WHERE user_id = u.id AND post_type = 'showcase') DESC"
        };
        const orderBy = sortMap[sort] || 'u.created_at DESC';

        const countR = await pool.query(`SELECT COUNT(*)::int AS c FROM auth.users u ${where}`, values);
        const total = countR.rows[0].c;
        values.push(lim); values.push(offset);

        const r = await pool.query(`
            SELECT u.id, u.first_name, u.last_name, u.profile_image, u.role, u.business_name, u.description, u.location, u.created_at,
                (SELECT COUNT(*)::int FROM community.discussions WHERE user_id = u.id) AS discussions,
                (SELECT COUNT(*)::int FROM qa.questions WHERE user_id = u.id) AS questions,
                (SELECT COUNT(*)::int FROM community.success_stories WHERE user_id = u.id) AS stories,
                (SELECT COUNT(*)::int FROM community.posts WHERE user_id = u.id AND post_type = 'showcase') AS showcase
            FROM auth.users u ${where}
            ORDER BY ${orderBy}
            LIMIT $${idx} OFFSET $${idx + 1}`, values);
        return res.json({ members: r.rows, total, page: pg, pages: Math.ceil(total / lim) });
    } catch (err) { console.error('Members list error:', err.message); }
    res.json({ members: [], total: 0 });
}));

router.get('/:id/reviews', asyncHandler(async (req, res) => {
    if (!(await dbAvailable())) return res.status(503).json({ error: 'Service unavailable' });
    try {
        const r = await pool.query(
            `SELECT r.id, r.rating, r.text, r.created_at, r.product_id,
                    p.name AS product_name
             FROM marketplace.reviews r
             LEFT JOIN marketplace.products p ON p.id = r.product_id
             WHERE r.user_id = $1 ORDER BY r.created_at DESC LIMIT 20`,
            [req.params.id]
        );
        res.json({ reviews: r.rows });
    } catch { res.json({ reviews: [] }); }
}));

router.get('/:id/contributions', asyncHandler(async (req, res) => {
    if (!(await dbAvailable())) return res.status(503).json({ error: 'Service unavailable' });
    const uid = req.params.id;
    const items = [];

    try {
        const dr = await pool.query(
            `SELECT d.title, (SELECT COUNT(*)::int FROM community.discussion_comments WHERE discussion_id = d.id) AS score
             FROM community.discussions d WHERE d.user_id = $1 ORDER BY score DESC LIMIT 5`,
            [uid]
        );
        dr.rows.forEach(r => items.push({ title: r.title, count: r.score, type: 'discussion' }));
    } catch { console.error('Contributions discussions error:', uid); }

    try {
        const qr = await pool.query(
            `SELECT q.title, (SELECT COUNT(*)::int FROM qa.answers WHERE question_id = q.id) AS score
             FROM qa.questions q WHERE q.user_id = $1 ORDER BY score DESC LIMIT 5`,
            [uid]
        );
        qr.rows.forEach(r => items.push({ title: r.title, count: r.score, type: 'question' }));
    } catch { console.error('Contributions questions error:', uid); }

    items.sort((a, b) => b.count - a.count);
    res.json({ contributions: items.slice(0, 5) });
}));

// ─── Follow System ────────────────────────────────────
router.get('/:id/follow-counts', asyncHandler(async (req, res) => {
    if (!(await dbAvailable())) return res.json({ followers: 0, following: 0 });
    try {
        const [followers, following] = await Promise.all([
            pool.query('SELECT COUNT(*)::int AS c FROM platform.follows WHERE following_id = $1', [req.params.id]),
            pool.query('SELECT COUNT(*)::int AS c FROM platform.follows WHERE follower_id = $1', [req.params.id])
        ]);
        res.json({ followers: followers.rows[0].c, following: following.rows[0].c });
    } catch { res.json({ followers: 0, following: 0 }); }
}));

router.get('/:id/following', asyncHandler(async (req, res) => {
    if (!(await dbAvailable())) return res.json([]);
    try {
        const r = await pool.query(
            `SELECT u.id, u.first_name, u.last_name, u.profile_image, u.role, f.created_at AS followed_at
             FROM platform.follows f JOIN auth.users u ON u.id = f.following_id
             WHERE f.follower_id = $1 ORDER BY f.created_at DESC`, [req.params.id]
        );
        res.json(r.rows);
    } catch { res.json([]); }
}));

router.get('/:id/followers', asyncHandler(async (req, res) => {
    if (!(await dbAvailable())) return res.json([]);
    try {
        const r = await pool.query(
            `SELECT u.id, u.first_name, u.last_name, u.profile_image, u.role, f.created_at AS followed_at
             FROM platform.follows f JOIN auth.users u ON u.id = f.follower_id
             WHERE f.following_id = $1 ORDER BY f.created_at DESC`, [req.params.id]
        );
        res.json(r.rows);
    } catch { res.json([]); }
}));

router.get('/:id/follow-check', requireAuth, asyncHandler(async (req, res) => {
    if (!(await dbAvailable())) return res.json({ following: false });
    try {
        const r = await pool.query(
            'SELECT 1 FROM platform.follows WHERE follower_id = $1 AND following_id = $2',
            [req.user.id, req.params.id]
        );
        res.json({ following: r.rows.length > 0 });
    } catch { res.json({ following: false }); }
}));

router.post('/:id/follow', requireAuth, asyncHandler(async (req, res) => {
    if (!(await dbAvailable())) return res.status(503).json({ error: 'Database unavailable' });
    if (req.user.id === req.params.id) return res.status(400).json({ error: 'Cannot follow yourself' });
    try {
        await pool.query(
            'INSERT INTO platform.follows (follower_id, following_id) VALUES ($1, $2) ON CONFLICT DO NOTHING',
            [req.user.id, req.params.id]
        );
        res.json({ following: true });
    } catch (err) {
        if (err.code === '23503') return res.status(404).json({ error: 'User not found' });
        throw err;
    }
}));

router.delete('/:id/follow', requireAuth, asyncHandler(async (req, res) => {
    if (!(await dbAvailable())) return res.status(503).json({ error: 'Database unavailable' });
    await pool.query(
        'DELETE FROM platform.follows WHERE follower_id = $1 AND following_id = $2',
        [req.user.id, req.params.id]
    );
    res.json({ following: false });
}));

module.exports = router;
