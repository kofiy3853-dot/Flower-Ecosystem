const router = require('express').Router();
const path = require('path');
const { pool, asyncHandler, dbAvailable, readJSON, queryWithFallback, requireAuth } = require('./middleware');

router.get('/categories', asyncHandler(async (_, res) => {
    if (await dbAvailable()) {
        try {
            const r = await pool.query('SELECT * FROM learning.id_categories ORDER BY sort_order');
            if (r.rows.length) return res.json(r.rows);
        } catch {}
    }
    res.json([
        { id: 1, name: 'Roses', slug: 'roses', icon: '🌹' },
        { id: 2, name: 'Tulips', slug: 'tulips', icon: '🌷' },
        { id: 3, name: 'Orchids', slug: 'orchids', icon: '🌺' },
        { id: 4, name: 'Lilies', slug: 'lilies', icon: '💮' },
        { id: 5, name: 'Preservation', slug: 'preservation', icon: '🏺' },
        { id: 6, name: 'General', slug: 'general', icon: '🔍' }
    ]);
}));

router.get('/', asyncHandler(async (req, res) => {
    const { category, search, difficulty } = req.query;
    if (await dbAvailable()) {
        try {
            const conditions = ['t.is_published = true'];
            const values = [];
            let idx = 1;
            if (category) { conditions.push(`ic.slug = $${idx}`); values.push(category); idx++; }
            if (difficulty) { conditions.push(`t.difficulty = $${idx}`); values.push(difficulty); idx++; }
            if (search) { conditions.push(`(t.title ILIKE $${idx} OR t.description ILIKE $${idx})`); values.push(`%${search}%`); idx++; }
            const where = 'WHERE ' + conditions.join(' AND ');
            const r = await pool.query(`
                SELECT t.*, ic.name AS category_name, ic.icon AS category_icon
                FROM learning.identification_topics t
                LEFT JOIN learning.id_categories ic ON ic.id = t.category_id
                ${where}
                ORDER BY t.title`, values);
            if (r.rows.length) return res.json(r.rows);
        } catch (err) { console.error('Identification query error:', err.message); }
    }
    let data = readJSON(path.join(__dirname, '..', 'data', 'identification.json'));
    if (category) data = data.filter(d => (d.category || '').toLowerCase().includes(category.toLowerCase()));
    if (difficulty) data = data.filter(d => (d.level || '').toLowerCase() === difficulty.toLowerCase());
    res.json(data);
}));

router.get('/:id', asyncHandler(async (req, res) => {
    const { id } = req.params;
    if (await dbAvailable()) {
        try {
            const r = await pool.query(`
                SELECT t.*, ic.name AS category_name, ic.icon AS category_icon
                FROM learning.identification_topics t
                LEFT JOIN learning.id_categories ic ON ic.id = t.category_id
                WHERE t.id = $1 OR t.slug = $1`, [id]);
            if (r.rows.length) {
                const images = await pool.query('SELECT image_url, label, image_type FROM learning.id_images WHERE topic_id = $1 ORDER BY sort_order', [r.rows[0].id]);
                const videos = await pool.query('SELECT video_url, title, duration FROM learning.id_videos WHERE topic_id = $1', [r.rows[0].id]);
                return res.json({ ...r.rows[0], images: images.rows, videos: videos.rows });
            }
        } catch (err) { console.error('Identification detail error:', err.message); }
    }
    const data = readJSON(path.join(__dirname, '..', 'data', 'identification.json'));
    const topic = data.find(d => d.id === id || d.slug === id);
    topic ? res.json(topic) : res.status(404).json({ error: 'Topic not found' });
}));

router.get('/gallery', asyncHandler(async (_, res) => {
    const data = readJSON(path.join(__dirname, '..', 'data', 'gallery.json'));
    res.json(data);
}));

// ─── Identification History ────────────────────────────────────────────────

router.post('/history', requireAuth, asyncHandler(async (req, res) => {
    if (!(await dbAvailable())) return res.status(503).json({ error: 'Database unavailable' });
    const { uploaded_image, flower_name, scientific_name, confidence, category, family, origin, care_guide, ai_result } = req.body;
    if (!flower_name) return res.status(400).json({ error: 'flower_name is required' });
    const r = await pool.query(
        `INSERT INTO learning.flower_identifications
         (user_id, uploaded_image, flower_name, scientific_name, confidence, category, family, origin, care_guide, ai_result)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10) RETURNING *`,
        [req.user.id, uploaded_image || null, flower_name, scientific_name || null, confidence || null,
         category || null, family || null, origin || null, care_guide ? JSON.stringify(care_guide) : null,
         ai_result ? JSON.stringify(ai_result) : null]
    );
    res.status(201).json(r.rows[0]);
}));

router.get('/history', requireAuth, asyncHandler(async (req, res) => {
    if (!(await dbAvailable())) return res.json([]);
    const { limit = 20, offset = 0 } = req.query;
    const r = await pool.query(
        `SELECT id, uploaded_image, flower_name, scientific_name, confidence, category, saved_to_garden, created_at
         FROM learning.flower_identifications
         WHERE user_id = $1
         ORDER BY created_at DESC
         LIMIT $2 OFFSET $3`,
        [req.user.id, Math.min(100, parseInt(limit, 10) || 20), parseInt(offset, 10) || 0]
    );
    res.json(r.rows);
}));

router.delete('/history/:id', requireAuth, asyncHandler(async (req, res) => {
    if (!(await dbAvailable())) return res.status(503).json({ error: 'Database unavailable' });
    const r = await pool.query(
        'DELETE FROM learning.flower_identifications WHERE id = $1 AND user_id = $2 RETURNING id',
        [req.params.id, req.user.id]
    );
    if (!r.rows.length) return res.status(404).json({ error: 'Not found' });
    res.json({ message: 'Deleted' });
}));

// ─── Save to My Garden ────────────────────────────────────────────────────

router.post('/save-to-garden', requireAuth, asyncHandler(async (req, res) => {
    if (!(await dbAvailable())) return res.status(503).json({ error: 'Database unavailable' });
    const { identification_id, flower_name, image_url } = req.body;
    if (!flower_name) return res.status(400).json({ error: 'flower_name is required' });

    // Mark identification as saved if provided
    if (identification_id) {
        await pool.query(
            'UPDATE learning.flower_identifications SET saved_to_garden = true WHERE id = $1 AND user_id = $2',
            [identification_id, req.user.id]
        ).catch(() => {});
    }

    // Get user's garden
    const garden = await pool.query('SELECT id FROM garden.gardens WHERE user_id = $1', [req.user.id]);
    if (!garden.rows.length) return res.status(400).json({ error: 'Create a garden first' });

    // Add plant to garden
    const r = await pool.query(
        `INSERT INTO garden.garden_plants (garden_id, name, image_url, notes)
         VALUES ($1, $2, $3, $4) RETURNING *`,
        [garden.rows[0].id, flower_name, image_url || null, 'Added from AI identification']
    );
    res.status(201).json(r.rows[0]);
}));

module.exports = router;
