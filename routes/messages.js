const router = require('express').Router();
const { pool, asyncHandler, dbAvailable, requireAuth } = require('./middleware');

router.get('/conversations', requireAuth, asyncHandler(async (req, res) => {
    if (!(await dbAvailable())) return res.status(503).json({ error: 'Database unavailable' });
    try {
        const r = await pool.query(
            `SELECT DISTINCT
                CASE WHEN sender_id = $1 THEN recipient_id ELSE sender_id END AS other_user_id,
                MAX(created_at) AS last_message_at
             FROM messages.messages
             WHERE sender_id = $1 OR recipient_id = $1
             GROUP BY other_user_id
             ORDER BY last_message_at DESC`,
            [req.user.id]
        ).catch(() => ({ rows: [] }));
        res.json(r.rows);
    } catch {
        res.json([]);
    }
}));

router.get('/:userId', requireAuth, asyncHandler(async (req, res) => {
    if (!(await dbAvailable())) return res.status(503).json({ error: 'Database unavailable' });
    try {
        const r = await pool.query(
            `SELECT * FROM messages.messages
             WHERE (sender_id = $1 AND recipient_id = $2)
                OR (sender_id = $2 AND recipient_id = $1)
             ORDER BY created_at ASC`,
            [req.user.id, req.params.userId]
        ).catch(() => ({ rows: [] }));
        res.json(r.rows);
    } catch {
        res.json([]);
    }
}));

module.exports = router;
