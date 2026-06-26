const router = require('express').Router();
const jwt = require('jsonwebtoken');
const path = require('path');
const { pool, JWT_SECRET, upload, asyncHandler, escapeHtml, dbAvailable, readJSON, requireAuth, requireRole } = require('./middleware');

// Posts
router.get('/posts', asyncHandler(async (req, res) => {
    if (await dbAvailable()) {
        try {
            const r = await pool.query(
                `SELECT p.*, u.first_name, u.last_name, u.profile_image,
                        (SELECT COUNT(*) FROM community.comments WHERE post_id = p.id) AS comment_count
                 FROM community.posts p
                 JOIN auth.users u ON u.id = p.user_id
                 ORDER BY p.is_pinned DESC, p.created_at DESC`
            );
            return res.json(r.rows);
        } catch (err) { console.error('Posts query error:', err.message); }
    }
    const data = readJSON(path.join(__dirname, '..', 'data', 'community.json'));
    const discussions = (data.discussions || []).map(d => ({
        id: d.id, title: d.title, content: d.excerpt || '', user_id: d.author || 'unknown',
        first_name: d.author || 'Unknown', last_name: '', is_pinned: d.pinned || false,
        comment_count: d.replies || 0, created_at: new Date().toISOString()
    }));
    const stories = (data.successStories || []).map(s => ({
        id: s.id, title: s.title, content: s.story || '', user_id: s.author || 'unknown',
        first_name: s.author || 'Unknown', last_name: '', is_pinned: false,
        comment_count: s.comments || 0, created_at: new Date().toISOString()
    }));
    res.json([...discussions, ...stories]);
}));

router.get('/posts/:id/comments', asyncHandler(async (req, res) => {
    if (!(await dbAvailable())) return res.json([]);
    const r = await pool.query(
        `SELECT c.*, u.first_name, u.last_name, u.profile_image
         FROM community.comments c JOIN auth.users u ON u.id = c.user_id
         WHERE c.post_id = $1 ORDER BY c.created_at`, [req.params.id]);
    res.json(r.rows);
}));

router.post('/posts/:id/comments', requireAuth, asyncHandler(async (req, res) => {
    if (!(await dbAvailable())) return res.status(503).json({ error: 'Database unavailable' });
    const { id } = req.params;
    const { content } = req.body;
    if (!content || typeof content !== 'string') return res.status(400).json({ error: 'Content is required' });
    let post;
    try { post = await pool.query('SELECT id FROM community.posts WHERE id = $1', [id]); } catch { return res.status(404).json({ error: 'Post not found' }); }
    if (!post.rows.length) return res.status(404).json({ error: 'Post not found' });
    const r = await pool.query('INSERT INTO community.comments (post_id, user_id, content) VALUES ($1, $2, $3) RETURNING *', [id, req.user.id, escapeHtml(content).slice(0, 5000)]);
    res.status(201).json(r.rows[0]);
}));

router.delete('/comments/:id', requireAuth, asyncHandler(async (req, res) => {
    if (!(await dbAvailable())) return res.status(503).json({ error: 'Database unavailable' });
    const { id } = req.params;
    const existing = await pool.query('SELECT * FROM community.comments WHERE id = $1', [id]);
    if (!existing.rows.length) return res.status(404).json({ error: 'Comment not found' });
    const userRole = (req.user.role || '').toUpperCase();
    if (existing.rows[0].user_id !== req.user.id && !['ADMIN', 'SUPERADMIN', 'MODERATOR'].includes(userRole)) {
        return res.status(403).json({ error: 'Not authorized to delete this comment' });
    }
    await pool.query('DELETE FROM community.comments WHERE id = $1', [id]);
    res.json({ message: 'Comment deleted' });
}));

router.post('/posts', requireAuth, asyncHandler(async (req, res) => {
    if (!(await dbAvailable())) return res.status(503).json({ error: 'Database unavailable' });
    const { title, content } = req.body;
    if (!title || !content) return res.status(400).json({ error: 'Title and content are required' });
    if (typeof title !== 'string' || typeof content !== 'string') return res.status(400).json({ error: 'Invalid input types' });
    const r = await pool.query('INSERT INTO community.posts (user_id, title, content) VALUES ($1, $2, $3) RETURNING *', [req.user.id, escapeHtml(title).slice(0, 255), escapeHtml(content).slice(0, 10000)]);
    res.status(201).json(r.rows[0]);
}));

router.put('/posts/:id', requireAuth, asyncHandler(async (req, res) => {
    if (!(await dbAvailable())) return res.status(503).json({ error: 'Database unavailable' });
    const { id } = req.params;
    const existing = await pool.query('SELECT * FROM community.posts WHERE id = $1', [id]);
    if (!existing.rows.length) return res.status(404).json({ error: 'Post not found' });
    if (existing.rows[0].user_id !== req.user.id && req.user.role !== 'ADMIN') return res.status(403).json({ error: 'Not authorized' });
    const { title, content } = req.body;
    const r = await pool.query('UPDATE community.posts SET title = COALESCE($1, title), content = COALESCE($2, content) WHERE id = $3 RETURNING *', [title, content, id]);
    res.json(r.rows[0]);
}));

router.delete('/posts/:id', requireAuth, asyncHandler(async (req, res) => {
    if (!(await dbAvailable())) return res.status(503).json({ error: 'Database unavailable' });
    const { id } = req.params;
    const existing = await pool.query('SELECT * FROM community.posts WHERE id = $1', [id]);
    if (!existing.rows.length) return res.status(404).json({ error: 'Post not found' });
    const userRole = (req.user.role || '').toUpperCase();
    if (existing.rows[0].user_id !== req.user.id && !['ADMIN', 'SUPERADMIN', 'MODERATOR'].includes(userRole)) return res.status(403).json({ error: 'Not authorized' });
    await pool.query('DELETE FROM community.posts WHERE id = $1', [id]);
    res.json({ message: 'Post deleted' });
}));

// Discussions
router.get('/discussions/categories', asyncHandler(async (_, res) => {
    if (!(await dbAvailable())) {
        return res.json([
            { id: 1, name: 'Flower Care', slug: 'flower-care', icon: '🌿' },
            { id: 2, name: 'Flower Identification', slug: 'flower-identification', icon: '🔍' },
            { id: 3, name: 'Floristry', slug: 'floristry', icon: '✂️' },
            { id: 4, name: 'Gardening', slug: 'gardening', icon: '🌱' },
            { id: 5, name: 'Medicinal Flowers', slug: 'medicinal-flowers', icon: '💊' },
            { id: 6, name: 'Indoor Plants', slug: 'indoor-plants', icon: '🪴' },
            { id: 7, name: 'Events', slug: 'events', icon: '🎪' },
            { id: 8, name: 'Marketplace Questions', slug: 'marketplace-questions', icon: '🛒' },
            { id: 9, name: 'Beginner Questions', slug: 'beginner-questions', icon: '❓' }
        ]);
    }
    const r = await pool.query('SELECT * FROM community.discussion_categories ORDER BY sort_order');
    res.json(r.rows);
}));

router.get('/discussions', asyncHandler(async (req, res) => {
    const { category, search, sort = 'newest', page = 1, limit = 20 } = req.query;
    const pg = Math.max(1, parseInt(page, 10) || 1);
    const lim = Math.min(100, Math.max(1, parseInt(limit, 10) || 20));
    const offset = (pg - 1) * lim;

    if (await dbAvailable()) {
        try {
            const conditions = [];
            const values = [];
            let idx = 1;
            if (category) { conditions.push(`dc.slug = $${idx}`); values.push(category); idx++; }
            if (search) { conditions.push(`(d.title ILIKE $${idx} OR d.content ILIKE $${idx})`); values.push(`%${search}%`); idx++; }
            const where = conditions.length ? 'WHERE ' + conditions.join(' AND ') : '';
            const sortMap = { newest: 'd.created_at DESC', popular: 'd.views DESC', most_replies: 'reply_count DESC', unsolved: 'd.is_solved = false, d.created_at DESC' };
            const orderBy = sortMap[sort] || 'd.created_at DESC';

            const countQ = `SELECT COUNT(*) FROM community.discussions d LEFT JOIN community.discussion_categories dc ON dc.id = d.category_id ${where}`;
            const countR = await pool.query(countQ, values);
            const total = parseInt(countR.rows[0].count, 10);
            values.push(lim);
            values.push(offset);

            const dataQ = `
                SELECT d.id, d.title, LEFT(d.content, 200) AS excerpt, d.is_pinned, d.is_solved,
                       d.views, d.created_at, d.updated_at,
                       dc.name AS category_name, dc.slug AS category_slug, dc.icon AS category_icon,
                       u.first_name || ' ' || u.last_name AS author_name,
                       u.profile_image AS author_avatar, u.role AS author_role,
                       COALESCE(v.vote_count, 0) AS vote_count,
                       COALESCE(rc.reply_count, 0) AS reply_count,
                       (SELECT image_url FROM community.discussion_images WHERE discussion_id = d.id ORDER BY sort_order LIMIT 1) AS image
                FROM community.discussions d
                LEFT JOIN community.discussion_categories dc ON dc.id = d.category_id
                LEFT JOIN auth.users u ON u.id = d.user_id
                LEFT JOIN (SELECT discussion_id, SUM(CASE WHEN vote_type = 'up' THEN 1 ELSE -1 END) AS vote_count FROM community.discussion_votes GROUP BY discussion_id) v ON v.discussion_id = d.id
                LEFT JOIN (SELECT discussion_id, COUNT(*) AS reply_count FROM community.discussion_comments GROUP BY discussion_id) rc ON rc.discussion_id = d.id
                ${where}
                ORDER BY d.is_pinned DESC, ${orderBy}
                LIMIT $${idx} OFFSET $${idx + 1}`;

            const dataR = await pool.query(dataQ, values);
            return res.json({ discussions: dataR.rows, total, page: pg, limit: lim, pages: Math.ceil(total / lim) });
        } catch (err) { console.error('Discussions query error:', err.message); }
    }
    const fallback = readJSON(path.join(__dirname, '..', 'data', 'community.json'));
    res.json({ discussions: (fallback.discussions || []).slice(offset, offset + lim), total: (fallback.discussions || []).length, page: pg, limit: lim, pages: 1 });
}));

router.get('/discussions/:id', asyncHandler(async (req, res) => {
    if (!(await dbAvailable())) {
        const fallback = readJSON(path.join(__dirname, '..', 'data', 'community.json'));
        const d = (fallback.discussions || []).find(d => d.id === req.params.id);
        return d ? res.json(d) : res.status(404).json({ error: 'Discussion not found' });
    }
    const r = await pool.query(`
        SELECT d.*, dc.name AS category_name, dc.slug AS category_slug, dc.icon AS category_icon,
               u.first_name || ' ' || u.last_name AS author_name,
               u.profile_image AS author_avatar, u.role AS author_role, u.id AS author_id,
               COALESCE(v.vote_count, 0) AS vote_count
        FROM community.discussions d
        LEFT JOIN community.discussion_categories dc ON dc.id = d.category_id
        LEFT JOIN auth.users u ON u.id = d.user_id
        LEFT JOIN (SELECT discussion_id, SUM(CASE WHEN vote_type = 'up' THEN 1 ELSE -1 END) AS vote_count FROM community.discussion_votes GROUP BY discussion_id) v ON v.discussion_id = d.id
        WHERE d.id = $1`, [req.params.id]);
    if (!r.rows.length) return res.status(404).json({ error: 'Discussion not found' });
    await pool.query('UPDATE community.discussions SET views = views + 1 WHERE id = $1', [req.params.id]);
    const images = await pool.query('SELECT image_url FROM community.discussion_images WHERE discussion_id = $1 ORDER BY sort_order', [req.params.id]);
    const comments = await pool.query(`
        SELECT c.*, u.first_name || ' ' || u.last_name AS author_name,
               u.profile_image AS author_avatar, u.role AS author_role, u.id AS author_id,
               COALESCE(v.vote_count, 0) AS vote_count
        FROM community.discussion_comments c
        LEFT JOIN auth.users u ON u.id = c.user_id
        LEFT JOIN (SELECT comment_id, SUM(CASE WHEN vote_type = 'up' THEN 1 ELSE -1 END) AS vote_count FROM community.discussion_votes GROUP BY comment_id) v ON v.comment_id = c.id
        WHERE c.discussion_id = $1
        ORDER BY c.is_best_answer DESC, c.created_at ASC`, [req.params.id]);
    let userVote = null;
    if (req.headers.authorization) {
        try {
            const decoded = jwt.verify(req.headers.authorization.replace('Bearer ', ''), JWT_SECRET);
            const uv = await pool.query('SELECT vote_type FROM community.discussion_votes WHERE discussion_id = $1 AND user_id = $2', [req.params.id, decoded.id]);
            if (uv.rows.length) userVote = uv.rows[0].vote_type;
        } catch {}
    }
    res.json({ ...r.rows[0], images: images.rows.map(i => i.image_url), comments: comments.rows, userVote });
}));

router.post('/discussions', requireAuth, upload.array('images', 5), asyncHandler(async (req, res) => {
    if (!(await dbAvailable())) return res.status(503).json({ error: 'Database unavailable' });
    const { title, content, category_id } = req.body;
    if (!title || !content) return res.status(400).json({ error: 'Title and content are required' });
    if (typeof title !== 'string' || typeof content !== 'string') return res.status(400).json({ error: 'Invalid input types' });
    if (title.length > 255) return res.status(400).json({ error: 'Title must be 255 characters or less' });
    const r = await pool.query('INSERT INTO community.discussions (user_id, title, content, category_id) VALUES ($1, $2, $3, $4) RETURNING *', [req.user.id, escapeHtml(title).slice(0, 255), escapeHtml(content).slice(0, 10000), category_id || null]);
    if (req.files && req.files.length) {
        for (let i = 0; i < req.files.length; i++) {
            await pool.query('INSERT INTO community.discussion_images (discussion_id, image_url, sort_order) VALUES ($1, $2, $3)', [r.rows[0].id, `/uploads/${req.files[i].filename}`, i]);
        }
    }
    res.status(201).json(r.rows[0]);
}));

router.put('/discussions/:id', requireAuth, asyncHandler(async (req, res) => {
    if (!(await dbAvailable())) return res.status(503).json({ error: 'Database unavailable' });
    const { id } = req.params;
    const existing = await pool.query('SELECT * FROM community.discussions WHERE id = $1', [id]);
    if (!existing.rows.length) return res.status(404).json({ error: 'Discussion not found' });
    if (existing.rows[0].user_id !== req.user.id && !['ADMIN', 'SUPERADMIN'].includes((req.user.role || '').toUpperCase())) return res.status(403).json({ error: 'Not authorized' });
    const { title, content, category_id, is_pinned, is_solved, best_answer_id } = req.body;
    const r = await pool.query(
        `UPDATE community.discussions SET title = COALESCE($1, title), content = COALESCE($2, content),
            category_id = COALESCE($3, category_id), is_pinned = COALESCE($4, is_pinned),
            is_solved = COALESCE($5, is_solved), best_answer_id = COALESCE($6, best_answer_id)
         WHERE id = $7 RETURNING *`,
        [title, content, category_id, is_pinned, is_solved, best_answer_id, id]
    );
    if (best_answer_id) {
        await pool.query('UPDATE community.discussion_comments SET is_best_answer = false WHERE discussion_id = $1', [id]);
        await pool.query('UPDATE community.discussion_comments SET is_best_answer = true WHERE id = $1', [best_answer_id]);
    }
    res.json(r.rows[0]);
}));

router.delete('/discussions/:id', requireAuth, asyncHandler(async (req, res) => {
    if (!(await dbAvailable())) return res.status(503).json({ error: 'Database unavailable' });
    const { id } = req.params;
    const existing = await pool.query('SELECT * FROM community.discussions WHERE id = $1', [id]);
    if (!existing.rows.length) return res.status(404).json({ error: 'Discussion not found' });
    const userRole = (req.user.role || '').toUpperCase();
    if (existing.rows[0].user_id !== req.user.id && !['ADMIN', 'SUPERADMIN', 'MODERATOR'].includes(userRole)) return res.status(403).json({ error: 'Not authorized' });
    await pool.query('DELETE FROM community.discussions WHERE id = $1', [id]);
    res.json({ message: 'Discussion deleted' });
}));

router.post('/discussions/:id/comments', requireAuth, asyncHandler(async (req, res) => {
    if (!(await dbAvailable())) return res.status(503).json({ error: 'Database unavailable' });
    const { id } = req.params;
    const discussion = await pool.query('SELECT id FROM community.discussions WHERE id = $1', [id]);
    if (!discussion.rows.length) return res.status(404).json({ error: 'Discussion not found' });
    const { content } = req.body;
    if (!content || typeof content !== 'string') return res.status(400).json({ error: 'Content is required' });
    const r = await pool.query('INSERT INTO community.discussion_comments (discussion_id, user_id, content) VALUES ($1, $2, $3) RETURNING *', [id, req.user.id, escapeHtml(content).slice(0, 5000)]);
    res.status(201).json(r.rows[0]);
}));

router.delete('/discussions/comments/:id', requireAuth, asyncHandler(async (req, res) => {
    if (!(await dbAvailable())) return res.status(503).json({ error: 'Database unavailable' });
    const { id } = req.params;
    const existing = await pool.query('SELECT * FROM community.discussion_comments WHERE id = $1', [id]);
    if (!existing.rows.length) return res.status(404).json({ error: 'Comment not found' });
    const userRole = (req.user.role || '').toUpperCase();
    if (existing.rows[0].user_id !== req.user.id && !['ADMIN', 'SUPERADMIN', 'MODERATOR'].includes(userRole)) return res.status(403).json({ error: 'Not authorized' });
    await pool.query('DELETE FROM community.discussion_comments WHERE id = $1', [id]);
    res.json({ message: 'Comment deleted' });
}));

router.post('/discussions/:id/vote', requireAuth, asyncHandler(async (req, res) => {
    if (!(await dbAvailable())) return res.status(503).json({ error: 'Database unavailable' });
    const { id } = req.params;
    const { vote_type } = req.body;
    if (!['up', 'down'].includes(vote_type)) return res.status(400).json({ error: 'Vote type must be up or down' });
    const discussion = await pool.query('SELECT id FROM community.discussions WHERE id = $1', [id]);
    if (!discussion.rows.length) return res.status(404).json({ error: 'Discussion not found' });
    const client = await pool.connect();
    try {
        await client.query('BEGIN');
        const existing = await client.query('SELECT id, vote_type FROM community.discussion_votes WHERE discussion_id = $1 AND user_id = $2', [id, req.user.id]);
        if (existing.rows.length) {
            if (existing.rows[0].vote_type === vote_type) {
                await client.query('DELETE FROM community.discussion_votes WHERE id = $1', [existing.rows[0].id]);
            } else {
                await client.query('UPDATE community.discussion_votes SET vote_type = $1 WHERE id = $2', [vote_type, existing.rows[0].id]);
            }
        } else {
            await client.query('INSERT INTO community.discussion_votes (discussion_id, user_id, vote_type) VALUES ($1, $2, $3)', [id, req.user.id, vote_type]);
        }
        await client.query('COMMIT');
    } catch (err) {
        await client.query('ROLLBACK');
        throw err;
    } finally {
        client.release();
    }
    const v = await pool.query("SELECT SUM(CASE WHEN vote_type = 'up' THEN 1 ELSE -1 END) AS vote_count FROM community.discussion_votes WHERE discussion_id = $1", [id]);
    res.json({ vote_count: parseInt(v.rows[0].vote_count) || 0 });
}));

router.post('/discussions/comments/:id/vote', requireAuth, asyncHandler(async (req, res) => {
    if (!(await dbAvailable())) return res.status(503).json({ error: 'Database unavailable' });
    const { id } = req.params;
    const { vote_type } = req.body;
    if (!['up', 'down'].includes(vote_type)) return res.status(400).json({ error: 'Vote type must be up or down' });
    const comment = await pool.query('SELECT id FROM community.discussion_comments WHERE id = $1', [id]);
    if (!comment.rows.length) return res.status(404).json({ error: 'Comment not found' });
    const client = await pool.connect();
    try {
        await client.query('BEGIN');
        const existing = await client.query('SELECT id, vote_type FROM community.discussion_votes WHERE comment_id = $1 AND user_id = $2', [id, req.user.id]);
        if (existing.rows.length) {
            if (existing.rows[0].vote_type === vote_type) {
                await client.query('DELETE FROM community.discussion_votes WHERE id = $1', [existing.rows[0].id]);
            } else {
                await client.query('UPDATE community.discussion_votes SET vote_type = $1 WHERE id = $2', [vote_type, existing.rows[0].id]);
            }
        } else {
            await client.query('INSERT INTO community.discussion_votes (comment_id, user_id, vote_type) VALUES ($1, $2, $3)', [id, req.user.id, vote_type]);
        }
        await client.query('COMMIT');
    } catch (err) {
        await client.query('ROLLBACK');
        throw err;
    } finally {
        client.release();
    }
    const v = await pool.query("SELECT SUM(CASE WHEN vote_type = 'up' THEN 1 ELSE -1 END) AS vote_count FROM community.discussion_votes WHERE comment_id = $1", [id]);
    res.json({ vote_count: parseInt(v.rows[0].vote_count) || 0 });
}));

router.get('/discussions/stats/overview', asyncHandler(async (_, res) => {
    if (!(await dbAvailable())) return res.json({ members: 0, discussions: 0, replies: 0 });
    const [members, discussions, replies] = await Promise.all([
        pool.query('SELECT COUNT(*) FROM auth.users'),
        pool.query('SELECT COUNT(*) FROM community.discussions'),
        pool.query('SELECT COUNT(*) FROM community.discussion_comments')
    ]);
    res.json({ members: parseInt(members.rows[0].count) || 0, discussions: parseInt(discussions.rows[0].count) || 0, replies: parseInt(replies.rows[0].count) || 0 });
}));

router.get('/discussions/top/contributors', asyncHandler(async (_, res) => {
    if (!(await dbAvailable())) return res.json([]);
    const r = await pool.query(`
        SELECT u.id, u.first_name || ' ' || u.last_name AS name, u.profile_image, u.role,
               (SELECT COUNT(*) FROM community.discussions WHERE user_id = u.id) AS discussions,
               (SELECT COUNT(*) FROM community.discussion_comments WHERE user_id = u.id) AS replies
        FROM auth.users u
        WHERE EXISTS (SELECT 1 FROM community.discussions WHERE user_id = u.id)
           OR EXISTS (SELECT 1 FROM community.discussion_comments WHERE user_id = u.id)
        ORDER BY (SELECT COUNT(*) FROM community.discussions WHERE user_id = u.id) +
                 (SELECT COUNT(*) FROM community.discussion_comments WHERE user_id = u.id) DESC
        LIMIT 10`);
    res.json(r.rows);
}));

// Success Stories
router.get('/stories', asyncHandler(async (req, res) => {
    const { category, search, sort = 'newest', page = 1, limit = 20, featured } = req.query;
    const pg = Math.max(1, parseInt(page, 10) || 1);
    const lim = Math.min(100, Math.max(1, parseInt(limit, 10) || 20));
    const offset = (pg - 1) * lim;

    if (await dbAvailable()) {
        try {
            const conditions = ['ss.is_published = true'];
            const values = [];
            let idx = 1;
            if (category) { conditions.push(`ss.category = $${idx}`); values.push(category); idx++; }
            if (search) { conditions.push(`(ss.title ILIKE $${idx} OR ss.content ILIKE $${idx} OR ss.author_name ILIKE $${idx})`); values.push(`%${search}%`); idx++; }
            if (featured === 'true') { conditions.push(`ss.is_featured = true`); }
            const where = 'WHERE ' + conditions.join(' AND ');
            const sortMap = { newest: 'ss.created_at DESC', popular: 'like_count DESC', most_comments: 'comment_count DESC' };
            const orderBy = sortMap[sort] || 'ss.created_at DESC';

            const countQ = `SELECT COUNT(*) FROM community.success_stories ss ${where}`;
            const countR = await pool.query(countQ, values);
            const total = parseInt(countR.rows[0].count, 10);
            values.push(lim);
            values.push(offset);

            const dataQ = `
                SELECT ss.*, COALESCE(lc.like_count, 0) AS like_count, COALESCE(cc.comment_count, 0) AS comment_count,
                    (SELECT image_url FROM community.story_images WHERE story_id = ss.id ORDER BY sort_order LIMIT 1) AS thumbnail
                FROM community.success_stories ss
                LEFT JOIN (SELECT story_id, COUNT(*) AS like_count FROM community.story_likes GROUP BY story_id) lc ON lc.story_id = ss.id
                LEFT JOIN (SELECT story_id, COUNT(*) AS comment_count FROM community.story_comments GROUP BY story_id) cc ON cc.story_id = ss.id
                ${where}
                ORDER BY ss.is_featured DESC, ${orderBy}
                LIMIT $${idx} OFFSET $${idx + 1}`;
            const dataR = await pool.query(dataQ, values);
            return res.json({ stories: dataR.rows, total, page: pg, limit: lim, pages: Math.ceil(total / lim) });
        } catch (err) { console.error('Stories query error:', err.message); }
    }
    const fallback = readJSON(path.join(__dirname, '..', 'data', 'community.json'));
    const stories = (fallback.successStories || []).slice(offset, offset + lim);
    res.json({ stories, total: (fallback.successStories || []).length, page: pg, limit: lim, pages: 1 });
}));

router.get('/stories/featured', asyncHandler(async (_, res) => {
    if (await dbAvailable()) {
        try {
            const r = await pool.query(`
                SELECT ss.*, COALESCE(lc.like_count, 0) AS like_count, COALESCE(cc.comment_count, 0) AS comment_count
                FROM community.success_stories ss
                LEFT JOIN (SELECT story_id, COUNT(*) AS like_count FROM community.story_likes GROUP BY story_id) lc ON lc.story_id = ss.id
                LEFT JOIN (SELECT story_id, COUNT(*) AS comment_count FROM community.story_comments GROUP BY story_id) cc ON cc.story_id = ss.id
                WHERE ss.is_featured = true AND ss.is_published = true
                ORDER BY ss.created_at DESC LIMIT 3`);
            if (r.rows.length) return res.json(r.rows);
        } catch {}
    }
    const fallback = readJSON(path.join(__dirname, '..', 'data', 'community.json'));
    res.json(fallback.successStories || []);
}));

router.get('/stories/:id', asyncHandler(async (req, res) => {
    const { id } = req.params;
    if (await dbAvailable()) {
        try {
            const r = await pool.query(`
                SELECT ss.*, COALESCE(lc.like_count, 0) AS like_count, COALESCE(cc.comment_count, 0) AS comment_count
                FROM community.success_stories ss
                LEFT JOIN (SELECT story_id, COUNT(*) AS like_count FROM community.story_likes GROUP BY story_id) lc ON lc.story_id = ss.id
                LEFT JOIN (SELECT story_id, COUNT(*) AS comment_count FROM community.story_comments GROUP BY story_id) cc ON cc.story_id = ss.id
                WHERE ss.id = $1`, [id]);
            if (!r.rows.length) return res.status(404).json({ error: 'Story not found' });
            await pool.query('UPDATE community.success_stories SET views = views + 1 WHERE id = $1', [id]);
            const images = await pool.query('SELECT image_url, caption FROM community.story_images WHERE story_id = $1 ORDER BY sort_order', [id]);
            const comments = await pool.query(`
                SELECT c.*, u.first_name || ' ' || u.last_name AS author_name, u.profile_image AS author_avatar, u.role AS author_role
                FROM community.story_comments c LEFT JOIN auth.users u ON u.id = c.user_id
                WHERE c.story_id = $1 ORDER BY c.created_at ASC`, [id]);
            let userLiked = false, userBookmarked = false;
            if (req.headers.authorization) {
                try {
                    const decoded = jwt.verify(req.headers.authorization.replace('Bearer ', ''), JWT_SECRET);
                    const like = await pool.query('SELECT id FROM community.story_likes WHERE story_id = $1 AND user_id = $2', [id, decoded.id]);
                    userLiked = like.rows.length > 0;
                    const bm = await pool.query('SELECT id FROM community.story_bookmarks WHERE story_id = $1 AND user_id = $2', [id, decoded.id]);
                    userBookmarked = bm.rows.length > 0;
                } catch {}
            }
            return res.json({ ...r.rows[0], images: images.rows, comments: comments.rows, user_liked: userLiked, user_bookmarked: userBookmarked });
        } catch (err) { console.error('Story detail error:', err.message); }
    }
    const fallback = readJSON(path.join(__dirname, '..', 'data', 'community.json'));
    const story = (fallback.successStories || []).find(s => s.id === id);
    story ? res.json(story) : res.status(404).json({ error: 'Story not found' });
}));

router.post('/stories', requireAuth, upload.array('images', 5), asyncHandler(async (req, res) => {
    if (!(await dbAvailable())) return res.status(503).json({ error: 'Database unavailable' });
    const { title, content, category } = req.body;
    if (!title || !content) return res.status(400).json({ error: 'Title and content are required' });
    const user = await pool.query('SELECT first_name, last_name, profile_image, role FROM auth.users WHERE id = $1', [req.user.id]);
    const u = user.rows[0] || {};
    const cover_image = req.files && req.files.length ? `/uploads/${req.files[0].filename}` : null;
    const r = await pool.query(
        `INSERT INTO community.success_stories (user_id, title, content, author_name, author_role, author_avatar, cover_image, category)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING *`,
        [req.user.id, escapeHtml(title).slice(0, 255), escapeHtml(content).slice(0, 10000),
         `${u.first_name || ''} ${u.last_name || ''}`.trim() || 'Anonymous', u.role || 'Member', u.profile_image || null, cover_image, category || null]
    );
    if (req.files && req.files.length > 1) {
        for (let i = 1; i < req.files.length; i++) {
            await pool.query('INSERT INTO community.story_images (story_id, image_url, sort_order) VALUES ($1, $2, $3)', [r.rows[0].id, `/uploads/${req.files[i].filename}`, i]);
        }
    }
    res.status(201).json(r.rows[0]);
}));

router.put('/stories/:id', requireAuth, asyncHandler(async (req, res) => {
    if (!(await dbAvailable())) return res.status(503).json({ error: 'Database unavailable' });
    const { id } = req.params;
    const existing = await pool.query('SELECT * FROM community.success_stories WHERE id = $1', [id]);
    if (!existing.rows.length) return res.status(404).json({ error: 'Story not found' });
    if (existing.rows[0].user_id !== req.user.id && !['ADMIN', 'SUPERADMIN'].includes((req.user.role || '').toUpperCase())) return res.status(403).json({ error: 'Not authorized' });
    const { title, content, category, is_featured } = req.body;
    const r = await pool.query(
        `UPDATE community.success_stories SET title = COALESCE($1, title), content = COALESCE($2, content),
            category = COALESCE($3, category), is_featured = COALESCE($4, is_featured)
         WHERE id = $5 RETURNING *`, [title, content, category, is_featured, id]);
    res.json(r.rows[0]);
}));

router.delete('/stories/:id', requireAuth, asyncHandler(async (req, res) => {
    if (!(await dbAvailable())) return res.status(503).json({ error: 'Database unavailable' });
    const { id } = req.params;
    const existing = await pool.query('SELECT * FROM community.success_stories WHERE id = $1', [id]);
    if (!existing.rows.length) return res.status(404).json({ error: 'Story not found' });
    if (existing.rows[0].user_id !== req.user.id && !['ADMIN', 'SUPERADMIN', 'MODERATOR'].includes((req.user.role || '').toUpperCase())) return res.status(403).json({ error: 'Not authorized' });
    await pool.query('DELETE FROM community.success_stories WHERE id = $1', [id]);
    res.json({ message: 'Story deleted' });
}));

router.post('/stories/:id/like', requireAuth, asyncHandler(async (req, res) => {
    if (!(await dbAvailable())) return res.status(503).json({ error: 'Database unavailable' });
    const { id } = req.params;
    const existing = await pool.query('SELECT id FROM community.story_likes WHERE story_id = $1 AND user_id = $2', [id, req.user.id]);
    if (existing.rows.length) { await pool.query('DELETE FROM community.story_likes WHERE story_id = $1 AND user_id = $2', [id, req.user.id]); }
    else { await pool.query('INSERT INTO community.story_likes (story_id, user_id) VALUES ($1, $2)', [id, req.user.id]); }
    const v = await pool.query('SELECT COUNT(*) AS cnt FROM community.story_likes WHERE story_id = $1', [id]);
    res.json({ liked: !existing.rows.length, like_count: parseInt(v.rows[0].cnt) || 0 });
}));

router.post('/stories/:id/bookmark', requireAuth, asyncHandler(async (req, res) => {
    if (!(await dbAvailable())) return res.status(503).json({ error: 'Database unavailable' });
    const { id } = req.params;
    const existing = await pool.query('SELECT id FROM community.story_bookmarks WHERE story_id = $1 AND user_id = $2', [id, req.user.id]);
    if (existing.rows.length) { await pool.query('DELETE FROM community.story_bookmarks WHERE story_id = $1 AND user_id = $2', [id, req.user.id]); }
    else { await pool.query('INSERT INTO community.story_bookmarks (story_id, user_id) VALUES ($1, $2)', [id, req.user.id]); }
    res.json({ bookmarked: !existing.rows.length });
}));

router.post('/stories/:id/comments', requireAuth, asyncHandler(async (req, res) => {
    if (!(await dbAvailable())) return res.status(503).json({ error: 'Database unavailable' });
    const { id } = req.params;
    const story = await pool.query('SELECT id FROM community.success_stories WHERE id = $1', [id]);
    if (!story.rows.length) return res.status(404).json({ error: 'Story not found' });
    const { content } = req.body;
    if (!content || typeof content !== 'string') return res.status(400).json({ error: 'Content is required' });
    const r = await pool.query('INSERT INTO community.story_comments (story_id, user_id, content) VALUES ($1, $2, $3) RETURNING *', [id, req.user.id, escapeHtml(content).slice(0, 2000)]);
    res.status(201).json(r.rows[0]);
}));

router.delete('/stories/comments/:id', requireAuth, asyncHandler(async (req, res) => {
    if (!(await dbAvailable())) return res.status(503).json({ error: 'Database unavailable' });
    const { id } = req.params;
    const existing = await pool.query('SELECT * FROM community.story_comments WHERE id = $1', [id]);
    if (!existing.rows.length) return res.status(404).json({ error: 'Comment not found' });
    if (existing.rows[0].user_id !== req.user.id && !['ADMIN', 'SUPERADMIN', 'MODERATOR'].includes((req.user.role || '').toUpperCase())) return res.status(403).json({ error: 'Not authorized' });
    await pool.query('DELETE FROM community.story_comments WHERE id = $1', [id]);
    res.json({ message: 'Comment deleted' });
}));

// Search
router.get('/search', asyncHandler(async (req, res) => {
    const q = String(req.query.q || '').trim().slice(0, 200);
    if (!q) return res.json([]);
    if (await dbAvailable()) {
        try {
            const products = await pool.query(`SELECT id, name AS title, description, 'product' AS type, ts_rank(search_vector, query) AS rank FROM marketplace.products, plainto_tsquery('english', $1) query WHERE search_vector @@ query AND is_active = true ORDER BY rank DESC LIMIT 5`, [q]);
            const courses = await pool.query(`SELECT id, title, description, 'course' AS type, ts_rank(search_vector, query) AS rank FROM learning.courses, plainto_tsquery('english', $1) query WHERE search_vector @@ query AND is_published = true ORDER BY rank DESC LIMIT 5`, [q]);
            const posts = await pool.query(`SELECT id, title, content AS description, 'post' AS type, ts_rank(search_vector, query) AS rank FROM community.posts, plainto_tsquery('english', $1) query WHERE search_vector @@ query ORDER BY rank DESC LIMIT 5`, [q]);
            return res.json([...products.rows, ...courses.rows, ...posts.rows]);
        } catch (err) { console.error('Search query error:', err.message); }
    }
    const ql = q.toLowerCase();
    const products = readJSON(path.join(__dirname, '..', 'data', 'products.json')).filter(p => p.name.toLowerCase().includes(ql) || (p.description || '').toLowerCase().includes(ql)).slice(0, 5).map(p => ({ id: p.id, title: p.name, description: p.description, type: 'product' }));
    const courses = readJSON(path.join(__dirname, '..', 'data', 'courses.json')).filter(c => c.title.toLowerCase().includes(ql) || (c.description || '').toLowerCase().includes(ql)).slice(0, 5).map(c => ({ id: c.id, title: c.title, description: c.description, type: 'course' }));
    const community = readJSON(path.join(__dirname, '..', 'data', 'community.json'));
    const posts = [
        ...(community.discussions || []).filter(d => d.title.toLowerCase().includes(ql) || (d.excerpt || '').toLowerCase().includes(ql)).slice(0, 5).map(d => ({ id: d.id, title: d.title, description: d.excerpt, type: 'post' })),
        ...(community.successStories || []).filter(s => s.title.toLowerCase().includes(ql) || (s.story || '').toLowerCase().includes(ql)).slice(0, 5).map(s => ({ id: s.id, title: s.title, description: s.story, type: 'post' }))
    ];
    res.json([...products, ...courses, ...posts]);
}));

module.exports = router;
