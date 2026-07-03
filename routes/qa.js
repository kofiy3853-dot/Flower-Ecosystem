const router = require('express').Router();
const jwt = require('jsonwebtoken');
const { pool, JWT_SECRET, upload, asyncHandler, escapeHtml, dbAvailable, requireAuth, getFileUrl } = require('./middleware');

router.get('/categories', asyncHandler(async (_, res) => {
    if (await dbAvailable()) {
        try {
            const r = await pool.query('SELECT * FROM qa.categories ORDER BY sort_order');
            if (r.rows.length) return res.json(r.rows);
        } catch (err) { console.error('QA categories error:', err.message); }
    }
    res.json([
        { id: 1, name: 'Flower Identification', slug: 'flower-identification', icon: '🌹' },
        { id: 2, name: 'Flower Care', slug: 'flower-care', icon: '🌿' },
        { id: 3, name: 'Floristry', slug: 'floristry', icon: '💐' },
        { id: 4, name: 'Medicinal Flowers', slug: 'medicinal-flowers', icon: '💊' },
        { id: 5, name: 'Palm Trees', slug: 'palm-trees', icon: '🌴' },
        { id: 6, name: 'Gardening', slug: 'gardening', icon: '🌱' },
        { id: 7, name: 'Marketplace', slug: 'marketplace', icon: '🛒' },
        { id: 8, name: 'Growing Flowers', slug: 'growing-flowers', icon: '🌸' },
        { id: 9, name: 'Events & Workshops', slug: 'events-workshops', icon: '🎪' }
    ]);
}));

router.get('/questions', asyncHandler(async (req, res) => {
    const { category, search, sort = 'newest', page = 1, limit = 20, solved } = req.query;
    const pg = Math.max(1, parseInt(page, 10) || 1);
    const lim = Math.min(100, Math.max(1, parseInt(limit, 10) || 20));
    const offset = (pg - 1) * lim;

    if (await dbAvailable()) {
        try {
            const conditions = [];
            const values = [];
            let idx = 1;
            if (category) { conditions.push(`qc.slug = $${idx}`); values.push(category); idx++; }
            if (search) { conditions.push(`(q.title ILIKE $${idx} OR q.content ILIKE $${idx})`); values.push(`%${search}%`); idx++; }
            if (solved === 'true') { conditions.push(`q.is_solved = true`); }
            if (solved === 'false') { conditions.push(`q.is_solved = false`); }
            const where = conditions.length ? 'WHERE ' + conditions.join(' AND ') : '';
            const sortMap = { newest: 'q.created_at DESC', votes: 'q.answer_count DESC', views: 'q.views DESC', unanswered: 'q.answer_count ASC' };
            const orderBy = sortMap[sort] || 'q.created_at DESC';

            const countQ = `SELECT COUNT(*) FROM qa.questions q LEFT JOIN qa.categories qc ON qc.id = q.category_id ${where}`;
            const countR = await pool.query(countQ, values);
            const total = parseInt(countR.rows[0].count, 10);
            values.push(lim);
            values.push(offset);

            const dataQ = `
                SELECT q.id, q.title, LEFT(q.content, 200) AS excerpt, q.views, q.answer_count, q.has_accepted, q.is_solved,
                       q.tags, q.created_at,
                       qc.name AS category_name, qc.slug AS category_slug, qc.icon AS category_icon,
                       u.first_name || ' ' || u.last_name AS author_name, u.role AS author_role,
                       (SELECT COUNT(*) FROM qa.answer_votes av JOIN qa.answers a ON a.id = av.answer_id WHERE a.question_id = q.id AND av.vote_type = 'up') AS upvotes
                FROM qa.questions q
                LEFT JOIN qa.categories qc ON qc.id = q.category_id
                LEFT JOIN auth.users u ON u.id = q.user_id
                ${where}
                ORDER BY q.is_solved ASC, ${orderBy}
                LIMIT $${idx} OFFSET $${idx + 1}`;
            const dataR = await pool.query(dataQ, values);
            return res.json({ questions: dataR.rows, total, page: pg, limit: lim, pages: Math.ceil(total / lim) });
        } catch (err) { console.error('QA query error:', err.message); }
    }
    res.json({ questions: [], total: 0, page: pg, limit: lim, pages: 0 });
}));

router.get('/questions/:id', asyncHandler(async (req, res) => {
    const { id } = req.params;
    if (await dbAvailable()) {
        try {
            const r = await pool.query(`
                SELECT q.*, qc.name AS category_name, qc.slug AS category_slug, qc.icon AS category_icon,
                       u.first_name || ' ' || u.last_name AS author_name, u.role AS author_role
                FROM qa.questions q
                LEFT JOIN qa.categories qc ON qc.id = q.category_id
                LEFT JOIN auth.users u ON u.id = q.user_id
                WHERE q.id = $1 OR q.slug = $1`, [id]);
            if (!r.rows.length) return res.status(404).json({ error: 'Question not found' });
            await pool.query('UPDATE qa.questions SET views = views + 1 WHERE id = $1', [r.rows[0].id]);
            const images = await pool.query('SELECT image_url, caption FROM qa.question_images WHERE question_id = $1 ORDER BY sort_order', [r.rows[0].id]);
            const answers = await pool.query(`
                SELECT a.*, u.first_name || ' ' || u.last_name AS author_name, u.role AS author_role,
                    (SELECT SUM(CASE WHEN av.vote_type = 'up' THEN 1 ELSE -1 END) FROM qa.answer_votes av WHERE av.answer_id = a.id) AS vote_count
                FROM qa.answers a LEFT JOIN auth.users u ON u.id = a.user_id
                WHERE a.question_id = $1
                ORDER BY a.is_accepted DESC, vote_count DESC, a.created_at ASC`, [r.rows[0].id]);
            let userVote = null;
            if (req.headers.authorization) {
                try {
                    const decoded = jwt.verify(req.headers.authorization.replace('Bearer ', ''), JWT_SECRET);
                    const uv = await pool.query('SELECT vote_type FROM qa.answer_votes WHERE user_id = $1 AND answer_id IN (SELECT id FROM qa.answers WHERE question_id = $2)', [decoded.id, r.rows[0].id]);
                    if (uv.rows.length) userVote = uv.rows[0].vote_type;
                } catch {}
            }
            return res.json({ ...r.rows[0], images: images.rows, answers: answers.rows, userVote });
        } catch (err) { console.error('QA detail error:', err.message); }
    }
    res.status(404).json({ error: 'Question not found' });
}));

router.post('/questions', requireAuth, upload.array('images', 5), asyncHandler(async (req, res) => {
    if (!(await dbAvailable())) return res.status(503).json({ error: 'Database unavailable' });
    const { title, content, category_id, tags } = req.body;
    if (!title || !content) return res.status(400).json({ error: 'Title and content are required' });
    const r = await pool.query('INSERT INTO qa.questions (user_id, title, content, category_id, tags) VALUES ($1, $2, $3, $4, $5) RETURNING *', [req.user.id, escapeHtml(title).slice(0, 255), escapeHtml(content).slice(0, 10000), category_id || null, tags || null]);
    if (req.files && req.files.length) {
        for (let i = 0; i < req.files.length; i++) {
            await pool.query('INSERT INTO qa.question_images (question_id, image_url, sort_order) VALUES ($1, $2, $3)', [r.rows[0].id, getFileUrl(req.files[i]), i]);
        }
    }
    await pool.query(`INSERT INTO qa.user_points (user_id, points, questions_asked) VALUES ($1, 5, 1) ON CONFLICT (user_id) DO UPDATE SET points = qa.user_points.points + 5, questions_asked = qa.user_points.questions_asked + 1`, [req.user.id]);
    res.status(201).json(r.rows[0]);
}));

router.get('/questions/:id/answers', asyncHandler(async (req, res) => {
    if (!(await dbAvailable())) return res.json([]);
    try {
        const r = await pool.query(`
            SELECT a.*, u.first_name || ' ' || u.last_name AS author_name, u.role AS author_role,
                (SELECT SUM(CASE WHEN av.vote_type = 'up' THEN 1 ELSE -1 END) FROM qa.answer_votes av WHERE av.answer_id = a.id) AS vote_count
            FROM qa.answers a LEFT JOIN auth.users u ON u.id = a.user_id
            WHERE a.question_id = $1
            ORDER BY a.is_accepted DESC, vote_count DESC, a.created_at ASC`, [req.params.id]);
        res.json(r.rows);
    } catch { res.json([]); }
}));

router.post('/questions/:id/answers', requireAuth, asyncHandler(async (req, res) => {
    if (!(await dbAvailable())) return res.status(503).json({ error: 'Database unavailable' });
    const { content } = req.body;
    if (!content) return res.status(400).json({ error: 'Answer content required' });
    const r = await pool.query('INSERT INTO qa.answers (question_id, user_id, content) VALUES ($1, $2, $3) RETURNING *', [req.params.id, req.user.id, escapeHtml(content).slice(0, 5000)]);
    await pool.query('UPDATE qa.questions SET answer_count = answer_count + 1, updated_at = CURRENT_TIMESTAMP WHERE id = $1', [req.params.id]);
    await pool.query(`INSERT INTO qa.user_points (user_id, points, answers_given) VALUES ($1, 10, 1) ON CONFLICT (user_id) DO UPDATE SET points = qa.user_points.points + 10, answers_given = qa.user_points.answers_given + 1`, [req.user.id]);
    const question = await pool.query('SELECT user_id FROM qa.questions WHERE id = $1', [req.params.id]);
    if (question.rows.length && question.rows[0].user_id !== req.user.id) {
        const asker = await pool.query('SELECT first_name FROM auth.users WHERE id = $1', [req.user.id]);
        await pool.query(
            'INSERT INTO platform.notifications (user_id, type, title, message, link) VALUES ($1, $2, $3, $4, $5)',
            [question.rows[0].user_id, 'answer', 'New Answer', `${asker.rows[0]?.first_name || 'Someone'} answered your question`, `/question-detail.html?id=${req.params.id}`]
        );
    }
    res.status(201).json(r.rows[0]);
}));

router.put('/questions/:id/accept', requireAuth, asyncHandler(async (req, res) => {
    if (!(await dbAvailable())) return res.status(503).json({ error: 'Database unavailable' });
    const { answer_id } = req.body;
    const question = await pool.query('SELECT user_id FROM qa.questions WHERE id = $1', [req.params.id]);
    if (!question.rows.length) return res.status(404).json({ error: 'Question not found' });
    if (question.rows[0].user_id !== req.user.id) return res.status(403).json({ error: 'Only question author can accept answers' });
    await pool.query('UPDATE qa.answers SET is_accepted = false WHERE question_id = $1', [req.params.id]);
    if (answer_id) {
        await pool.query('UPDATE qa.answers SET is_accepted = true WHERE id = $1', [answer_id]);
        await pool.query('UPDATE qa.questions SET has_accepted = true, is_solved = true WHERE id = $1', [req.params.id]);
        await pool.query(`INSERT INTO qa.user_points (user_id, points, best_answers) VALUES ((SELECT user_id FROM qa.answers WHERE id = $1), 25, 1) ON CONFLICT (user_id) DO UPDATE SET points = qa.user_points.points + 25, best_answers = qa.user_points.best_answers + 1`, [answer_id]);
    } else {
        await pool.query('UPDATE qa.questions SET has_accepted = false, is_solved = false WHERE id = $1', [req.params.id]);
    }
    res.json({ message: 'Answer accepted' });
}));

router.post('/answers/:id/vote', requireAuth, asyncHandler(async (req, res) => {
    if (!(await dbAvailable())) return res.status(503).json({ error: 'Database unavailable' });
    const { vote_type } = req.body;
    if (!['up', 'down'].includes(vote_type)) return res.status(400).json({ error: 'Vote type must be up or down' });
    try {
        await pool.query('INSERT INTO qa.answer_votes (answer_id, user_id, vote_type) VALUES ($1, $2, $3) ON CONFLICT (answer_id, user_id) DO UPDATE SET vote_type = $3', [req.params.id, req.user.id, vote_type]);
    } catch (err) {
        if (err.code === '23505') { await pool.query('DELETE FROM qa.answer_votes WHERE answer_id = $1 AND user_id = $2', [req.params.id, req.user.id]); } else { throw err; }
    }
    const v = await pool.query("SELECT SUM(CASE WHEN vote_type = 'up' THEN 1 ELSE -1 END) AS vote_count FROM qa.answer_votes WHERE answer_id = $1", [req.params.id]);
    res.json({ vote_count: parseInt(v.rows[0].vote_count) || 0 });
}));

router.get('/leaderboard', asyncHandler(async (_, res) => {
    if (!(await dbAvailable())) return res.json([]);
    try {
        const r = await pool.query(`
            SELECT up.*, u.first_name || ' ' || u.last_name AS name, u.role, u.profile_image
            FROM qa.user_points up JOIN auth.users u ON u.id = up.user_id
            ORDER BY up.points DESC LIMIT 10`);
        res.json(r.rows);
    } catch { res.json([]); }
}));

router.get('/stats', asyncHandler(async (_, res) => {
    if (!(await dbAvailable())) return res.json({ questions: 0, answers: 0, experts: 0, answer_rate: 0 });
    try {
        const [q, a, e] = await Promise.all([
            pool.query('SELECT COUNT(*) FROM qa.questions'),
            pool.query('SELECT COUNT(*) FROM qa.answers'),
            pool.query("SELECT COUNT(DISTINCT user_id) FROM qa.user_points WHERE points >= 100")
        ]);
        const totalQ = parseInt(q.rows[0].count) || 0;
        const totalA = parseInt(a.rows[0].count) || 0;
        res.json({ questions: totalQ, answers: totalA, experts: parseInt(e.rows[0].count) || 0, answer_rate: totalQ > 0 ? Math.round((totalA / totalQ) * 100) : 0 });
    } catch { res.json({ questions: 0, answers: 0, experts: 0, answer_rate: 0 }); }
}));

module.exports = router;
