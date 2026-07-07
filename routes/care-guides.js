const router = require('express').Router();
const { pool, asyncHandler, dbAvailable } = require('./middleware');

router.get('/categories', asyncHandler(async (_, res) => {
    if (await dbAvailable()) {
        try {
            const r = await pool.query('SELECT * FROM learning.care_categories ORDER BY sort_order');
            if (r.rows.length) return res.json(r.rows);
        } catch {}
    }
    res.json([
        { id: 1, name: 'Indoor Plants', slug: 'indoor-plants', icon: '🪴' },
        { id: 2, name: 'Outdoor Gardens', slug: 'outdoor-gardens', icon: '🏡' },
        { id: 3, name: 'Cut Flowers', slug: 'cut-flowers', icon: '💐' },
        { id: 4, name: 'Succulents & Cacti', slug: 'succulents-cacti', icon: '🌵' },
        { id: 5, name: 'Tropical Plants', slug: 'tropical-plants', icon: '🌴' },
        { id: 6, name: 'Seasonal Care', slug: 'seasonal-care', icon: '🍂' },
        { id: 7, name: 'Pest & Disease', slug: 'pest-disease', icon: '🐛' },
        { id: 8, name: 'Soil & Fertilizer', slug: 'soil-fertilizer', icon: '🌍' }
    ]);
}));

router.get('/', asyncHandler(async (req, res) => {
    const { category, search, difficulty, sort = 'newest', page = 1, limit = 20 } = req.query;
    const pg = Math.max(1, parseInt(page, 10) || 1);
    const lim = Math.min(100, Math.max(1, parseInt(limit, 10) || 20));
    const offset = (pg - 1) * lim;

    if (await dbAvailable()) {
        try {
            const conditions = ['g.is_published = true'];
            const values = [];
            let idx = 1;
            if (category) { conditions.push(`cc.slug = $${idx}`); values.push(category); idx++; }
            if (difficulty) { conditions.push(`g.difficulty = $${idx}`); values.push(difficulty); idx++; }
            if (search) { conditions.push(`(g.title ILIKE $${idx} OR g.plant_name ILIKE $${idx} OR g.excerpt ILIKE $${idx})`); values.push(`%${search}%`); idx++; }
            const where = 'WHERE ' + conditions.join(' AND ');
            const sortMap = { newest: 'g.created_at DESC', popular: 'g.views DESC', alphabetical: 'g.title ASC', difficulty: 'g.difficulty ASC' };
            const orderBy = sortMap[sort] || 'g.created_at DESC';

            const countQ = `SELECT COUNT(*) FROM learning.care_guides g LEFT JOIN learning.care_categories cc ON cc.id = g.category_id ${where}`;
            const countR = await pool.query(countQ, values);
            const total = parseInt(countR.rows[0].count, 10);
            values.push(lim);
            values.push(offset);

            const dataQ = `
                SELECT g.id, g.title, g.slug, g.excerpt, g.cover_image, g.author_name, g.author_title,
                       g.reading_time, g.difficulty, g.plant_name, g.light, g.water, g.temperature,
                       g.humidity, g.soil, g.views, g.created_at,
                       cc.name AS category_name, cc.slug AS category_slug, cc.icon AS category_icon
                FROM learning.care_guides g
                LEFT JOIN learning.care_categories cc ON cc.id = g.category_id
                ${where}
                ORDER BY ${orderBy}
                LIMIT $${idx} OFFSET $${idx + 1}`;
            const dataR = await pool.query(dataQ, values);
            return res.json({ guides: dataR.rows, total, page: pg, limit: lim, pages: Math.ceil(total / lim) });
        } catch (err) { console.error('Care guides query error:', err.message); }
    }
    res.json({ guides: [], total: 0, page: pg, limit: lim, pages: 0 });
}));

router.get('/:id', asyncHandler(async (req, res) => {
    const { id } = req.params;
    if (await dbAvailable()) {
        try {
            const r = await pool.query(`
                SELECT g.*, cc.name AS category_name, cc.slug AS category_slug, cc.icon AS category_icon
                FROM learning.care_guides g LEFT JOIN learning.care_categories cc ON cc.id = g.category_id
                WHERE g.slug = $1 OR g.id::text = $1`, [id]);
            if (r.rows.length) {
                await pool.query('UPDATE learning.care_guides SET views = views + 1 WHERE id = $1', [r.rows[0].id]);
                const tips = await pool.query('SELECT tip_text, tip_type FROM learning.care_tips WHERE guide_id = $1 ORDER BY sort_order', [r.rows[0].id]);
                let guideTips = tips.rows;
                if (!guideTips.length) {
                    try { guideTips = r.rows[0].tips ? (typeof r.rows[0].tips === 'string' ? JSON.parse(r.rows[0].tips) : r.rows[0].tips) : []; } catch { guideTips = []; }
                }
                return res.json({ ...r.rows[0], tips: guideTips });
            }
        } catch (err) { console.error('Care guide detail error:', err.message); }
    }
    res.status(404).json({ error: 'Guide not found' });
}));

router.get('/:id/related', asyncHandler(async (req, res) => {
    const { id } = req.params;
    if (await dbAvailable()) {
        try {
            const current = await pool.query('SELECT category_id, plant_name FROM learning.care_guides WHERE id = $1', [id]);
            if (current.rows.length) {
                const { category_id, plant_name } = current.rows[0];
                const r = await pool.query(`
                    SELECT g.id, g.title, g.slug, g.excerpt, g.cover_image, g.reading_time, g.difficulty, g.plant_name,
                           cc.name AS category_name, cc.icon AS category_icon
                    FROM learning.care_guides g LEFT JOIN learning.care_categories cc ON cc.id = g.category_id
                    WHERE g.id != $1 AND g.is_published = true AND (g.category_id = $2 OR g.plant_name ILIKE $3)
                    ORDER BY g.views DESC LIMIT 4`, [id, category_id || null, plant_name ? `%${plant_name}%` : '%']);
                if (r.rows.length) return res.json(r.rows);
            }
            const r2 = await pool.query(`
                SELECT g.id, g.title, g.slug, g.excerpt, g.cover_image, g.reading_time, g.difficulty, g.plant_name,
                       cc.name AS category_name, cc.icon AS category_icon
                FROM learning.care_guides g LEFT JOIN learning.care_categories cc ON cc.id = g.category_id
                WHERE g.id != $1 AND g.is_published = true
                ORDER BY g.views DESC LIMIT 4`, [id]);
            return res.json(r2.rows);
        } catch {}
    }
    res.json([]);
}));

module.exports = router;
