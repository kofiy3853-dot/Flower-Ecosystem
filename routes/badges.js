const router = require('express').Router();
const { pool, asyncHandler, dbAvailable } = require('./middleware');

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
    if (await dbAvailable()) {
        try {
            const r = await pool.query(`
                SELECT b.*, ub.awarded_at
                FROM community.user_badges ub
                JOIN community.badges b ON b.id = ub.badge_id
                WHERE ub.user_id = $1
                ORDER BY ub.awarded_at DESC`, [req.params.userId]);
            return res.json(r.rows);
        } catch (err) { console.error('User badges error:', err.message); }
    }
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

module.exports = router;
