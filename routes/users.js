const router = require('express').Router();
const { pool, dbAvailable, asyncHandler } = require('./middleware');

router.get('/:id', asyncHandler(async (req, res) => {
    if (!(await dbAvailable())) return res.status(503).json({ error: 'Service unavailable' });
    const r = await pool.query(
        'SELECT id, first_name, last_name, role, created_at, profile_image, description FROM auth.users WHERE id = $1',
        [req.params.id]
    );
    if (!r.rows.length) return res.status(404).json({ error: 'User not found' });
    res.json({ user: r.rows[0] });
}));

router.get('/:id/stats', asyncHandler(async (req, res) => {
    if (!(await dbAvailable())) return res.status(503).json({ error: 'Service unavailable' });
    const uid = req.params.id;
    const counts = { discussions: 0, questions: 0, stories: 0, reviews: 0 };

    try {
        const dr = await pool.query('SELECT COUNT(*)::int AS c FROM community.discussions WHERE author_id = $1', [uid]);
        counts.discussions = dr.rows[0].c;
    } catch {}
    try {
        const qr = await pool.query('SELECT COUNT(*)::int AS c FROM qa.questions WHERE author_id = $1', [uid]);
        counts.questions = qr.rows[0].c;
    } catch {}
    try {
        const sr = await pool.query('SELECT COUNT(*)::int AS c FROM community.stories WHERE author_id = $1', [uid]);
        counts.stories = sr.rows[0].c;
    } catch {}
    try {
        const rr = await pool.query('SELECT COUNT(*)::int AS c FROM marketplace.reviews WHERE user_id = $1', [uid]);
        counts.reviews = rr.rows[0].c;
    } catch {}

    res.json(counts);
}));

router.get('/:id/discussions', asyncHandler(async (req, res) => {
    if (!(await dbAvailable())) return res.status(503).json({ error: 'Service unavailable' });
    try {
        const r = await pool.query(
            `SELECT d.id, d.title, d.content, d.created_at, d.views,
                    (SELECT COUNT(*)::int FROM community.discussion_comments WHERE discussion_id = d.id) AS reply_count
             FROM community.discussions d WHERE d.author_id = $1 ORDER BY d.created_at DESC LIMIT 20`,
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
             FROM qa.questions q WHERE q.author_id = $1 ORDER BY q.created_at DESC LIMIT 20`,
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
             FROM community.stories s WHERE s.author_id = $1 ORDER BY s.created_at DESC LIMIT 20`,
            [req.params.id]
        );
        res.json({ stories: r.rows });
    } catch { res.json({ stories: [] }); }
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
             FROM community.discussions d WHERE d.author_id = $1 ORDER BY score DESC LIMIT 5`,
            [uid]
        );
        dr.rows.forEach(r => items.push({ title: r.title, count: r.score, type: 'discussion' }));
    } catch {}

    try {
        const qr = await pool.query(
            `SELECT q.title, (SELECT COUNT(*)::int FROM qa.answers WHERE question_id = q.id) AS score
             FROM qa.questions q WHERE q.author_id = $1 ORDER BY score DESC LIMIT 5`,
            [uid]
        );
        qr.rows.forEach(r => items.push({ title: r.title, count: r.score, type: 'question' }));
    } catch {}

    items.sort((a, b) => b.count - a.count);
    res.json({ contributions: items.slice(0, 5) });
}));

module.exports = router;
