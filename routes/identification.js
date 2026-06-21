const router = require('express').Router();
const path = require('path');
const { pool, asyncHandler, dbAvailable, readJSON, queryWithFallback } = require('./middleware');

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

module.exports = router;
