const router = require('express').Router();
const { pool, asyncHandler, escapeHtml, dbAvailable, requireAuth } = require('./middleware');

router.get('/', requireAuth, asyncHandler(async (req, res) => {
    if (!(await dbAvailable())) return res.json([]);
    try {
        const r = await pool.query('SELECT * FROM platform.notifications WHERE user_id = $1 ORDER BY created_at DESC LIMIT 50', [req.user.id]);
        res.json(r.rows);
    } catch { res.json([]); }
}));

router.get('/unread-count', requireAuth, asyncHandler(async (req, res) => {
    if (!(await dbAvailable())) return res.json({ count: 0 });
    try {
        const r = await pool.query('SELECT COUNT(*) FROM platform.notifications WHERE user_id = $1 AND is_read = false', [req.user.id]);
        res.json({ count: parseInt(r.rows[0].count) || 0 });
    } catch { res.json({ count: 0 }); }
}));

router.put('/read', requireAuth, asyncHandler(async (req, res) => {
    if (!(await dbAvailable())) return res.json({ message: 'OK' });
    await pool.query('UPDATE platform.notifications SET is_read = true WHERE user_id = $1', [req.user.id]);
    res.json({ message: 'All notifications marked as read' });
}));

router.put('/:id/read', requireAuth, asyncHandler(async (req, res) => {
    if (!(await dbAvailable())) return res.json({ message: 'OK' });
    await pool.query('UPDATE platform.notifications SET is_read = true WHERE id = $1 AND user_id = $2', [req.params.id, req.user.id]);
    res.json({ message: 'Notification marked as read' });
}));

// Messaging
router.get('/conversations', requireAuth, asyncHandler(async (req, res) => {
    if (!(await dbAvailable())) return res.json([]);
    try {
        const r = await pool.query(`
            SELECT c.*,
                CASE WHEN c.participant_1 = $1 THEN c.participant_2 ELSE c.participant_1 END AS other_user_id,
                (SELECT first_name || ' ' || last_name FROM auth.users WHERE id = CASE WHEN c.participant_1 = $1 THEN c.participant_2 ELSE c.participant_1 END) AS other_name,
                (SELECT COUNT(*) FROM platform.messages WHERE conversation_id = c.id AND sender_id != $1 AND is_read = false) AS unread_count
            FROM platform.conversations c
            WHERE c.participant_1 = $1 OR c.participant_2 = $1
            ORDER BY c.last_message_at DESC`, [req.user.id]);
        res.json(r.rows);
    } catch { res.json([]); }
}));

router.post('/conversations', requireAuth, asyncHandler(async (req, res) => {
    if (!(await dbAvailable())) return res.status(503).json({ error: 'Database unavailable' });
    const { user_id } = req.body;
    if (!user_id) return res.status(400).json({ error: 'User ID required' });
    if (user_id === req.user.id) return res.status(400).json({ error: 'Cannot message yourself' });
    const ids = [req.user.id, user_id].sort();
    const p1 = ids[0];
    const p2 = ids[1];
    try {
        const existing = await pool.query('SELECT id FROM platform.conversations WHERE participant_1 = $1 AND participant_2 = $2', [p1, p2]);
        if (existing.rows.length) return res.json({ id: existing.rows[0].id });
        const r = await pool.query('INSERT INTO platform.conversations (participant_1, participant_2) VALUES ($1, $2) RETURNING id', [p1, p2]);
        res.status(201).json(r.rows[0]);
    } catch (err) {
        if (err.code === '23505') {
            const existing = await pool.query('SELECT id FROM platform.conversations WHERE participant_1 = $1 AND participant_2 = $2', [p1, p2]);
            return res.json({ id: existing.rows[0].id });
        }
        throw err;
    }
}));

router.get('/:conversationId', requireAuth, asyncHandler(async (req, res) => {
    if (!(await dbAvailable())) return res.json([]);
    const { conversationId } = req.params;
    try {
        const conv = await pool.query('SELECT * FROM platform.conversations WHERE id = $1 AND (participant_1 = $2 OR participant_2 = $2)', [conversationId, req.user.id]);
        if (!conv.rows.length) return res.status(403).json({ error: 'Access denied' });
        const r = await pool.query(`
            SELECT m.*, u.first_name || ' ' || u.last_name AS sender_name
            FROM platform.messages m JOIN auth.users u ON u.id = m.sender_id
            WHERE m.conversation_id = $1 ORDER BY m.created_at ASC`, [conversationId]);
        await pool.query('UPDATE platform.messages SET is_read = true WHERE conversation_id = $1 AND sender_id != $2', [conversationId, req.user.id]);
        res.json(r.rows);
    } catch { res.json([]); }
}));

router.post('/:conversationId', requireAuth, asyncHandler(async (req, res) => {
    if (!(await dbAvailable())) return res.status(503).json({ error: 'Database unavailable' });
    const { conversationId } = req.params;
    const { content } = req.body;
    if (!content) return res.status(400).json({ error: 'Message content required' });
    const conv = await pool.query('SELECT * FROM platform.conversations WHERE id = $1 AND (participant_1 = $2 OR participant_2 = $2)', [conversationId, req.user.id]);
    if (!conv.rows.length) return res.status(403).json({ error: 'Access denied' });
    const r = await pool.query('INSERT INTO platform.messages (conversation_id, sender_id, content) VALUES ($1, $2, $3) RETURNING *', [conversationId, req.user.id, escapeHtml(content).slice(0, 5000)]);
    await pool.query('UPDATE platform.conversations SET last_message = $1, last_message_at = CURRENT_TIMESTAMP WHERE id = $2', [escapeHtml(content).slice(0, 200), conversationId]);
    const otherUserId = conv.rows[0].participant_1 === req.user.id ? conv.rows[0].participant_2 : conv.rows[0].participant_1;
    await pool.query(
        'INSERT INTO platform.notifications (user_id, type, title, message, link) VALUES ($1, $2, $3, $4, $5)',
        [otherUserId, 'message', 'New Message', content.slice(0, 100), `/messages.html?conversation=${conversationId}`]
    );
    res.status(201).json(r.rows[0]);
}));

module.exports = router;
