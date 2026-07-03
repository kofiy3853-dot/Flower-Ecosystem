const router = require('express').Router();
const jwt = require('jsonwebtoken');
const path = require('path');
const { pool, JWT_SECRET, upload, asyncHandler, escapeHtml, dbAvailable, readJSON, requireAuth, getFileUrl } = require('./middleware');

async function getUser(req) {
    if (req.headers.authorization) {
        try { return jwt.verify(req.headers.authorization.replace('Bearer ', ''), JWT_SECRET); } catch {}
    }
    return null;
}

// ─── List showcase projects ─────────────────────────────────────────────

router.get('/showcase', asyncHandler(async (req, res) => {
    const { category, search, sort = 'newest', page = 1, limit = 20, featured } = req.query;
    const pg = Math.max(1, parseInt(page, 10) || 1);
    const lim = Math.min(100, Math.max(1, parseInt(limit, 10) || 20));
    const offset = (pg - 1) * lim;

    if (await dbAvailable()) {
        try {
            const conditions = ["p.post_type = 'showcase'", 'p.is_published = true'];
            const values = [];
            let idx = 1;

            if (category) { conditions.push(`p.category = $${idx}`); values.push(category); idx++; }
            if (featured === 'true') { conditions.push(`p.is_featured = true`); }
            if (search) { conditions.push(`(p.title ILIKE $${idx} OR p.content ILIKE $${idx})`); values.push(`%${search}%`); idx++; }

            const where = 'WHERE ' + conditions.join(' AND ');
            const sortMap = {
                newest: 'p.created_at DESC',
                popular: 'p.like_count + p.view_count DESC',
                views: 'p.view_count DESC',
                likes: 'p.like_count DESC',
                editor: 'p.is_featured DESC, p.created_at DESC'
            };
            const orderBy = sortMap[sort] || 'p.created_at DESC';

            const countR = await pool.query(`SELECT COUNT(*) FROM community.posts p ${where}`, values);
            const total = parseInt(countR.rows[0].count, 10);

            values.push(lim, offset);
            const dataR = await pool.query(`
                SELECT p.id, p.user_id, p.title, p.content, p.media_urls, p.category, p.tags,
                    p.like_count, p.comment_count, p.view_count, p.save_count, p.showcase_meta,
                    p.is_featured, p.created_at, p.updated_at,
                    u.first_name, u.last_name, u.profile_image, u.role AS user_role
                FROM community.posts p
                JOIN auth.users u ON u.id = p.user_id
                ${where}
                ORDER BY ${orderBy}
                LIMIT $${idx} OFFSET $${idx + 1}`, values);
            return res.json({ projects: dataR.rows, total, page: pg, pages: Math.ceil(total / lim) });
        } catch (err) { console.error('Showcase query error:', err.message); }
    }
    res.json({ projects: [], total: 0, page: 1, pages: 1 });
}));

// ─── Featured project ───────────────────────────────────────────────────

router.get('/showcase/featured', asyncHandler(async (_, res) => {
    if (await dbAvailable()) {
        try {
            const r = await pool.query(`
                SELECT p.*, u.first_name, u.last_name, u.profile_image, u.role AS user_role
                FROM community.posts p JOIN auth.users u ON u.id = p.user_id
                WHERE p.post_type = 'showcase' AND p.is_featured = true AND p.is_published = true
                ORDER BY p.created_at DESC LIMIT 1`);
            if (r.rows.length) return res.json(r.rows[0]);
        } catch {}
    }
    res.json(null);
}));

// ─── Single project detail ──────────────────────────────────────────────

router.get('/showcase/:id', asyncHandler(async (req, res) => {
    const { id } = req.params;
    if (await dbAvailable()) {
        try {
            // Deduplicate views: only count once per user/IP per hour
            const viewerId = await getUser(req);
            const viewerKey = viewerId ? viewerId.id : (req.headers['x-forwarded-for'] || req.socket.remoteAddress || 'unknown');
            const viewCheck = await pool.query(
                `SELECT 1 FROM community.post_views WHERE post_id = $1 AND viewer_id = $2 AND created_at > NOW() - INTERVAL '1 hour'`,
                [id, String(viewerKey)]
            );
            if (!viewCheck.rows.length) {
                await pool.query('UPDATE community.posts SET view_count = view_count + 1 WHERE id = $1 AND post_type = $2', [id, 'showcase']);
                try {
                    await pool.query(
                        `INSERT INTO community.post_views (post_id, viewer_id) VALUES ($1, $2)`,
                        [id, String(viewerKey)]
                    );
                } catch {}
            }
            const r = await pool.query(`
                SELECT p.*, u.first_name, u.last_name, u.profile_image, u.role AS user_role
                FROM community.posts p JOIN auth.users u ON u.id = p.user_id
                WHERE p.id = $1 AND p.post_type = 'showcase'`, [id]);
            if (!r.rows.length) return res.status(404).json({ error: 'Project not found' });

            const project = r.rows[0];
            const images = project.media_urls || [];

            const comments = await pool.query(`
                SELECT c.*, u.first_name, u.last_name, u.profile_image, u.role AS author_role
                FROM community.comments c LEFT JOIN auth.users u ON u.id = c.user_id
                WHERE c.post_id = $1 ORDER BY c.created_at ASC`, [id]);

            let userLiked = false, userSaved = false;
            const user = await getUser(req);
            if (user) {
                const like = await pool.query('SELECT id FROM community.post_likes WHERE post_id = $1 AND user_id = $2', [id, user.id]);
                userLiked = like.rows.length > 0;
            }

            const related = await pool.query(`
                SELECT p.id, p.title, p.media_urls, p.like_count, p.created_at,
                    u.first_name, u.last_name, u.profile_image
                FROM community.posts p JOIN auth.users u ON u.id = p.user_id
                WHERE p.post_type = 'showcase' AND p.is_published = true AND p.id != $1
                    AND (p.category = $2 OR $2 IS NULL)
                ORDER BY p.like_count DESC LIMIT 4`, [id, project.category]);

            return res.json({
                ...project, images, comments: comments.rows,
                user_liked: userLiked, user_saved: userSaved,
                related: related.rows
            });
        } catch (err) { console.error('Showcase detail error:', err.message); }
    }
    res.status(404).json({ error: 'Project not found' });
}));

// ─── Create project ─────────────────────────────────────────────────────

router.post('/showcase', requireAuth, upload.array('images', 10), asyncHandler(async (req, res) => {
    if (!(await dbAvailable())) return res.status(503).json({ error: 'Database unavailable' });
    const { title, content, category, tags, flowers_used, techniques, materials, style, color, flower_types, country, location, product_ids } = req.body;
    if (!title && !content && (!req.files || !req.files.length)) return res.status(400).json({ error: 'Title or media required' });

    const mediaUrls = (req.files || []).map(f => getFileUrl(f));
    const parsedTags = tags ? (typeof tags === 'string' ? tags.split(',').map(t => t.trim()).filter(Boolean) : tags) : [];

    const showcaseMeta = {};
    if (flowers_used) showcaseMeta.flowers_used = typeof flowers_used === 'string' ? flowers_used.split(',').map(t => t.trim()) : flowers_used;
    if (techniques) showcaseMeta.techniques = typeof techniques === 'string' ? techniques.split(',').map(t => t.trim()) : techniques;
    if (materials) showcaseMeta.materials = typeof materials === 'string' ? materials.split(',').map(t => t.trim()) : materials;
    if (style) showcaseMeta.style = style;
    if (color) showcaseMeta.color = color;
    if (flower_types) showcaseMeta.flower_types = typeof flower_types === 'string' ? flower_types.split(',').map(t => t.trim()) : flower_types;
    if (country) showcaseMeta.country = country;
    if (location) showcaseMeta.location = location;
    if (product_ids) showcaseMeta.product_ids = typeof product_ids === 'string' ? product_ids.split(',').map(t => t.trim()).filter(Boolean) : product_ids;
    if (req.files?.length) {
        // Check if last two files are before/after
        const baBefore = req.body.before_image_index !== undefined ? req.files[parseInt(req.body.before_image_index)] : null;
        const baAfter = req.body.after_image_index !== undefined ? req.files[parseInt(req.body.after_image_index)] : null;
        if (baBefore) showcaseMeta.before_image = getFileUrl(baBefore);
        if (baAfter) showcaseMeta.after_image = getFileUrl(baAfter);
    }

    const r = await pool.query(`
        INSERT INTO community.posts (user_id, title, content, post_type, category, tags, media_urls, showcase_meta, is_published)
        VALUES ($1, $2, $3, 'showcase', $4, $5, $6, $7, true) RETURNING *`,
        [req.user.id, escapeHtml(title || '').slice(0, 255), escapeHtml(content || '').slice(0, 10000),
         category || null, JSON.stringify(parsedTags), JSON.stringify(mediaUrls), JSON.stringify(showcaseMeta)]);

    if (req.files && req.files.length) {
        for (let i = 0; i < req.files.length; i++) {
            try {
                await pool.query('INSERT INTO community.post_media (post_id, url, media_type, sort_order) VALUES ($1, $2, $3, $4)',
                    [r.rows[0].id, mediaUrls[i], 'image', i]);
            } catch (err) { console.error('Media insert error:', err.message); }
        }
    }
    res.status(201).json(r.rows[0]);
}));

// ─── Update project ─────────────────────────────────────────────────────

router.put('/showcase/:id', requireAuth, asyncHandler(async (req, res) => {
    const { id } = req.params;
    const existing = await pool.query('SELECT * FROM community.posts WHERE id = $1 AND post_type = $2', [id, 'showcase']);
    if (!existing.rows.length) return res.status(404).json({ error: 'Project not found' });
    if (existing.rows[0].user_id !== req.user.id && !['ADMIN', 'SUPERADMIN'].includes((req.user.role || '').toUpperCase()))
        return res.status(403).json({ error: 'Not authorized' });

    const { title, content, category, tags, showcase_meta } = req.body;
    const r = await pool.query(`
        UPDATE community.posts SET
            title = COALESCE($1, title), content = COALESCE($2, content),
            category = COALESCE($3, category), tags = COALESCE($4, tags),
            showcase_meta = COALESCE($5, showcase_meta)
        WHERE id = $6 RETURNING *`,
        [title, content, category, tags ? JSON.stringify(tags) : null, showcase_meta ? JSON.stringify(showcase_meta) : null, id]);
    res.json(r.rows[0]);
}));

// ─── Delete project ─────────────────────────────────────────────────────

router.delete('/showcase/:id', requireAuth, asyncHandler(async (req, res) => {
    const { id } = req.params;
    const existing = await pool.query('SELECT * FROM community.posts WHERE id = $1 AND post_type = $2', [id, 'showcase']);
    if (!existing.rows.length) return res.status(404).json({ error: 'Project not found' });
    if (existing.rows[0].user_id !== req.user.id && !['ADMIN', 'SUPERADMIN', 'MODERATOR'].includes((req.user.role || '').toUpperCase()))
        return res.status(403).json({ error: 'Not authorized' });
    await pool.query('DELETE FROM community.posts WHERE id = $1', [id]);
    res.json({ message: 'Project deleted' });
}));

// ─── Like ───────────────────────────────────────────────────────────────

router.post('/showcase/:id/like', requireAuth, asyncHandler(async (req, res) => {
    const { id } = req.params;
    const existing = await pool.query('SELECT id FROM community.post_likes WHERE post_id = $1 AND user_id = $2', [id, req.user.id]);
    if (existing.rows.length) {
        await pool.query('DELETE FROM community.post_likes WHERE post_id = $1 AND user_id = $2', [id, req.user.id]);
        await pool.query('UPDATE community.posts SET like_count = GREATEST(like_count - 1, 0) WHERE id = $1', [id]);
        res.json({ liked: false });
    } else {
        await pool.query('INSERT INTO community.post_likes (post_id, user_id) VALUES ($1, $2)', [id, req.user.id]);
        await pool.query('UPDATE community.posts SET like_count = like_count + 1 WHERE id = $1', [id]);
        res.json({ liked: true });
    }
}));

// ─── Collections ────────────────────────────────────────────────────────

router.get('/collections', asyncHandler(async (req, res) => {
    const user = await getUser(req);
    if (await dbAvailable()) {
        try {
            const conditions = user ? ['(c.is_public = true OR c.user_id = $1)'] : ['c.is_public = true'];
            const values = user ? [user.id] : [];
            const r = await pool.query(`
                SELECT c.*, (SELECT COUNT(*) FROM community.collection_items ci WHERE ci.collection_id = c.id) AS item_count
                FROM community.collections c
                ${conditions.length ? 'WHERE ' + conditions.join(' AND ') : ''}
                ORDER BY c.updated_at DESC LIMIT 20`, values);
            return res.json(r.rows);
        } catch (err) { console.error('Collections error:', err.message); }
    }
    res.json([]);
}));

router.get('/collections/:id', asyncHandler(async (req, res) => {
    const { id } = req.params;
    if (await dbAvailable()) {
        try {
            const col = await pool.query('SELECT * FROM community.collections WHERE id = $1', [id]);
            if (!col.rows.length) return res.status(404).json({ error: 'Collection not found' });
            const items = await pool.query(`
                SELECT p.*, u.first_name, u.last_name, u.profile_image, u.role AS user_role
                FROM community.collection_items ci
                JOIN community.posts p ON p.id = ci.post_id
                JOIN auth.users u ON u.id = p.user_id
                WHERE ci.collection_id = $1 ORDER BY ci.sort_order`, [id]);
            return res.json({ ...col.rows[0], items: items.rows });
        } catch {}
    }
    res.status(404).json({ error: 'Collection not found' });
}));

router.post('/collections', requireAuth, asyncHandler(async (req, res) => {
    if (!(await dbAvailable())) return res.status(503).json({ error: 'Database unavailable' });
    const { title, description, cover_image, is_public } = req.body;
    if (!title) return res.status(400).json({ error: 'Title required' });
    const r = await pool.query(
        'INSERT INTO community.collections (user_id, title, description, cover_image, is_public) VALUES ($1, $2, $3, $4, $5) RETURNING *',
        [req.user.id, title, description || null, cover_image || null, is_public !== false]);
    res.status(201).json(r.rows[0]);
}));

router.post('/collections/:id/items', requireAuth, asyncHandler(async (req, res) => {
    const { id } = req.params;
    const { post_id } = req.body;
    if (!post_id) return res.status(400).json({ error: 'post_id required' });
    const col = await pool.query('SELECT * FROM community.collections WHERE id = $1', [id]);
    if (!col.rows.length) return res.status(404).json({ error: 'Collection not found' });
    if (col.rows[0].user_id !== req.user.id) return res.status(403).json({ error: 'Not authorized' });
    try {
        const r = await pool.query(
            'INSERT INTO community.collection_items (collection_id, post_id) VALUES ($1, $2) ON CONFLICT DO NOTHING RETURNING *',
            [id, post_id]);
        res.status(201).json(r.rows[0] || { message: 'Already in collection' });
    } catch (err) { res.status(400).json({ error: err.message }); }
}));

router.delete('/collections/:id/items/:postId', requireAuth, asyncHandler(async (req, res) => {
    const { id, postId } = req.params;
    const col = await pool.query('SELECT * FROM community.collections WHERE id = $1', [id]);
    if (!col.rows.length) return res.status(404).json({ error: 'Collection not found' });
    if (col.rows[0].user_id !== req.user.id) return res.status(403).json({ error: 'Not authorized' });
    await pool.query('DELETE FROM community.collection_items WHERE collection_id = $1 AND post_id = $2', [id, postId]);
    res.json({ message: 'Removed from collection' });
}));

// ─── Competitions ───────────────────────────────────────────────────────

router.get('/competitions', asyncHandler(async (_, res) => {
    if (await dbAvailable()) {
        try {
            const r = await pool.query(`
                SELECT c.*,
                    (SELECT COUNT(*) FROM community.competition_entries ce WHERE ce.competition_id = c.id) AS entry_count
                FROM community.competitions c ORDER BY c.start_date DESC LIMIT 10`);
            return res.json(r.rows);
        } catch {}
    }
    res.json([]);
}));

// ─── Creators (top showcase contributors) ───────────────────────────────

router.get('/showcase/creators', asyncHandler(async (_, res) => {
    if (await dbAvailable()) {
        try {
            const r = await pool.query(`
                SELECT u.id, u.first_name, u.last_name, u.profile_image, u.role,
                    COUNT(p.id) AS project_count,
                    SUM(p.like_count) AS total_likes,
                    AVG(p.like_count) AS avg_likes
                FROM auth.users u
                JOIN community.posts p ON p.user_id = u.id AND p.post_type = 'showcase' AND p.is_published = true
                GROUP BY u.id
                ORDER BY project_count DESC, total_likes DESC
                LIMIT 8`);
            return res.json(r.rows);
        } catch {}
    }
    res.json([]);
}));

router.get('/showcase/stats', asyncHandler(async (_, res) => {
    if (await dbAvailable()) {
        try {
            const r = await pool.query(`
                SELECT
                    COUNT(*)::int AS total_projects,
                    COALESCE(SUM(like_count), 0)::int AS total_likes,
                    COALESCE(SUM(view_count), 0)::int AS total_views,
                    COALESCE(SUM(comment_count), 0)::int AS total_comments,
                    COUNT(DISTINCT user_id)::int AS total_creators
                FROM community.posts WHERE post_type = 'showcase' AND is_published = true`);
            return res.json(r.rows[0]);
        } catch {}
    }
    res.json({ total_projects: 0, total_likes: 0, total_views: 0, total_comments: 0, total_creators: 0 });
}));

// ─── Get products by IDs (for showcase product links) ──────────────────

router.post('/showcase/products', asyncHandler(async (req, res) => {
    if (!(await dbAvailable())) return res.json([]);
    const { ids } = req.body;
    if (!ids || !Array.isArray(ids) || !ids.length) return res.json([]);
    try {
        const placeholders = ids.map((_, i) => `$${i + 1}`).join(',');
        const r = await pool.query(
            `SELECT id, name, price, image_url FROM marketplace.products WHERE id IN (${placeholders}) AND is_active = true`,
            ids
        );
        res.json(r.rows);
    } catch { res.json([]); }
}));

module.exports = router;
