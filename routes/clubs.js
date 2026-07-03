const router = require('express').Router();
const jwt = require('jsonwebtoken');
const { pool, JWT_SECRET, asyncHandler, escapeHtml, dbAvailable, requireAuth } = require('./middleware');

function authHeaders(req) {
    try { return jwt.verify(req.headers.authorization?.replace('Bearer ', ''), JWT_SECRET); } catch { return null; }
}

// ─── List clubs ─────────────────────────────────────────────────────────

router.get('/clubs', asyncHandler(async (req, res) => {
    const { category, search, sort = 'popular', page = 1, limit = 20 } = req.query;
    const pg = Math.max(1, parseInt(page, 10) || 1);
    const lim = Math.min(100, Math.max(1, parseInt(limit, 10) || 20));
    const offset = (pg - 1) * lim;

    if (await dbAvailable()) {
        try {
            const conditions = [];
            const values = [];
            let idx = 1;
            if (category) { conditions.push(`c.category = $${idx}`); values.push(category); idx++; }
            if (search) { conditions.push(`(c.name ILIKE $${idx} OR c.description ILIKE $${idx})`); values.push(`%${search}%`); idx++; }
            const where = conditions.length ? 'WHERE ' + conditions.join(' AND ') : '';
            const sortMap = { popular: 'c.member_count DESC', newest: 'c.created_at DESC', active: 'c.post_count DESC' };
            const orderBy = sortMap[sort] || 'c.member_count DESC';

            const countR = await pool.query(`SELECT COUNT(*) FROM community.clubs c ${where}`, values);
            const total = parseInt(countR.rows[0].count, 10);
            values.push(lim); values.push(offset);

            const dataR = await pool.query(`
                SELECT c.*, u.first_name || ' ' || u.last_name AS creator_name
                FROM community.clubs c
                LEFT JOIN auth.users u ON u.id = c.created_by
                ${where}
                ORDER BY ${orderBy}
                LIMIT $${idx} OFFSET $${idx + 1}`, values);
            return res.json({ clubs: dataR.rows, total, page: pg, pages: Math.ceil(total / lim) });
        } catch (err) { console.error('Clubs list error:', err.message); }
    }
    res.json({ clubs: [], total: 0, page: pg, pages: 0 });
}));

// ─── Get single club ────────────────────────────────────────────────────

router.get('/clubs/:id', asyncHandler(async (req, res) => {
    if (await dbAvailable()) {
        try {
            const r = await pool.query(`
                SELECT c.*, u.first_name || ' ' || u.last_name AS creator_name
                FROM community.clubs c LEFT JOIN auth.users u ON u.id = c.created_by
                WHERE c.id = $1`, [req.params.id]);
            if (!r.rows.length) return res.status(404).json({ error: 'Club not found' });

            // Check membership
            const user = authHeaders(req);
            let isMember = false;
            if (user) {
                const m = await pool.query('SELECT role FROM community.club_members WHERE club_id = $1 AND user_id = $2', [req.params.id, user.id]);
                isMember = m.rows.length > 0;
            }

            // Get members
            const members = await pool.query(`
                SELECT cm.role, cm.joined_at, u.id, u.first_name, u.last_name, u.profile_image, u.role AS user_role
                FROM community.club_members cm JOIN auth.users u ON u.id = cm.user_id
                WHERE cm.club_id = $1 ORDER BY cm.joined_at ASC LIMIT 20`, [req.params.id]);

            // Get posts
            const posts = await pool.query(`
                SELECT cp.*, u.first_name, u.last_name, u.profile_image
                FROM community.club_posts cp JOIN auth.users u ON u.id = cp.user_id
                WHERE cp.club_id = $1 ORDER BY cp.created_at DESC LIMIT 50`, [req.params.id]);

            return res.json({ ...r.rows[0], isMember, members: members.rows, posts: posts.rows });
        } catch (err) { console.error('Club detail error:', err.message); }
    }
    res.status(404).json({ error: 'Club not found' });
}));

// ─── Create club ────────────────────────────────────────────────────────

router.post('/clubs', requireAuth, asyncHandler(async (req, res) => {
    if (!(await dbAvailable())) return res.status(503).json({ error: 'Database unavailable' });
    const { name, description, category, icon, cover_image, is_public } = req.body;
    if (!name) return res.status(400).json({ error: 'Name is required' });
    const r = await pool.query(
        'INSERT INTO community.clubs (name, description, category, icon, cover_image, is_public, created_by) VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *',
        [escapeHtml(name).slice(0, 255), escapeHtml(description || ''), category || null, icon || '🌿', cover_image || null, is_public !== false, req.user.id]
    );
    // Auto-join creator as admin
    await pool.query('INSERT INTO community.club_members (club_id, user_id, role) VALUES ($1, $2, $3)', [r.rows[0].id, req.user.id, 'admin']);
    res.status(201).json(r.rows[0]);
}));

// ─── Update club ────────────────────────────────────────────────────────

router.put('/clubs/:id', requireAuth, asyncHandler(async (req, res) => {
    if (!(await dbAvailable())) return res.status(503).json({ error: 'Database unavailable' });
    const check = await pool.query('SELECT created_by FROM community.clubs WHERE id = $1', [req.params.id]);
    if (!check.rows.length) return res.status(404).json({ error: 'Club not found' });
    if (check.rows[0].created_by !== req.user.id) {
        const mod = await pool.query('SELECT role FROM community.club_members WHERE club_id = $1 AND user_id = $2 AND role IN ($3, $4)', [req.params.id, req.user.id, 'admin', 'moderator']);
        if (!mod.rows.length) return res.status(403).json({ error: 'Not authorized' });
    }
    const { name, description, category, icon, cover_image, is_public } = req.body;
    const r = await pool.query(
        'UPDATE community.clubs SET name = COALESCE($1, name), description = COALESCE($2, description), category = COALESCE($3, category), icon = COALESCE($4, icon), cover_image = COALESCE($5, cover_image), is_public = COALESCE($6, is_public) WHERE id = $7 RETURNING *',
        [name || null, description || null, category || null, icon || null, cover_image || null, is_public !== undefined ? is_public : null, req.params.id]
    );
    res.json(r.rows[0]);
}));

// ─── Join / leave club ─────────────────────────────────────────────────

router.post('/clubs/:id/members', requireAuth, asyncHandler(async (req, res) => {
    if (!(await dbAvailable())) return res.status(503).json({ error: 'Database unavailable' });
    const club = await pool.query('SELECT id FROM community.clubs WHERE id = $1', [req.params.id]);
    if (!club.rows.length) return res.status(404).json({ error: 'Club not found' });
    const existing = await pool.query('SELECT id FROM community.club_members WHERE club_id = $1 AND user_id = $2', [req.params.id, req.user.id]);
    if (existing.rows.length) return res.status(409).json({ error: 'Already a member' });
    await pool.query('INSERT INTO community.club_members (club_id, user_id, role) VALUES ($1, $2, $3)', [req.params.id, req.user.id, 'member']);
    await pool.query('UPDATE community.clubs SET member_count = member_count + 1 WHERE id = $1', [req.params.id]);
    res.status(201).json({ message: 'Joined club' });
}));

router.delete('/clubs/:id/members', requireAuth, asyncHandler(async (req, res) => {
    if (!(await dbAvailable())) return res.status(503).json({ error: 'Database unavailable' });
    const existing = await pool.query('SELECT id FROM community.club_members WHERE club_id = $1 AND user_id = $2', [req.params.id, req.user.id]);
    if (!existing.rows.length) return res.status(404).json({ error: 'Not a member' });
    await pool.query('DELETE FROM community.club_members WHERE id = $1', [existing.rows[0].id]);
    await pool.query('UPDATE community.clubs SET member_count = GREATEST(member_count - 1, 0) WHERE id = $1', [req.params.id]);
    res.json({ message: 'Left club' });
}));

// ─── Club posts ────────────────────────────────────────────────────────

router.post('/clubs/:id/posts', requireAuth, asyncHandler(async (req, res) => {
    if (!(await dbAvailable())) return res.status(503).json({ error: 'Database unavailable' });
    const member = await pool.query('SELECT id FROM community.club_members WHERE club_id = $1 AND user_id = $2', [req.params.id, req.user.id]);
    if (!member.rows.length) return res.status(403).json({ error: 'Must be a member to post' });
    const { content } = req.body;
    if (!content) return res.status(400).json({ error: 'Content required' });
    const r = await pool.query('INSERT INTO community.club_posts (club_id, user_id, content) VALUES ($1, $2, $3) RETURNING *',
        [req.params.id, req.user.id, escapeHtml(content).slice(0, 5000)]);
    await pool.query('UPDATE community.clubs SET post_count = post_count + 1 WHERE id = $1', [req.params.id]);
    res.status(201).json(r.rows[0]);
}));

// ─── Club stats ────────────────────────────────────────────────────────

router.get('/clubs/stats', asyncHandler(async (_, res) => {
    if (await dbAvailable()) {
        try {
            const [total, members] = await Promise.all([
                pool.query('SELECT COUNT(*) FROM community.clubs'),
                pool.query('SELECT COUNT(*) FROM community.club_members')
            ]);
            return res.json({ clubs: parseInt(total.rows[0].count), members: parseInt(members.rows[0].count) });
        } catch {}
    }
    res.json({ clubs: 0, members: 0 });
}));

module.exports = router;
