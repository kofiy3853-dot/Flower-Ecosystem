const router = require('express').Router();
const { pool, asyncHandler, dbAvailable, readJSON } = require('./middleware');
const path = require('path');

// ─── List care guides ─────────────────────────────────────────────────
router.get('/care-guides', asyncHandler(async (req, res) => {
    const { search, flower, difficulty, indoor_outdoor, topic, sort = 'popular', page = 1, limit = 20 } = req.query;

    if (await dbAvailable()) {
        try {
            const conditions = ["cg.status = 'active'"];
            const values = [];
            let idx = 1;

            if (search) {
                conditions.push(`(cg.title ILIKE $${idx} OR f.common_name ILIKE $${idx} OR cg.description ILIKE $${idx})`);
                values.push(`%${search}%`); idx++;
            }
            if (flower) {
                conditions.push(`f.common_name ILIKE $${idx}`);
                values.push(`%${flower}%`); idx++;
            }
            if (difficulty) {
                conditions.push(`cg.difficulty = $${idx}`);
                values.push(difficulty); idx++;
            }
            if (indoor_outdoor) {
                conditions.push(`cg.indoor_outdoor = $${idx}`);
                values.push(indoor_outdoor); idx++;
            }

            const where = 'WHERE ' + conditions.join(' AND ');
            const sortMap = { popular: 'cg.views DESC', newest: 'cg.created_at DESC', name: 'f.common_name ASC' };
            const orderBy = sortMap[sort] || 'cg.views DESC';

            const pg = Math.max(1, parseInt(page, 10) || 1);
            const lim = Math.min(100, Math.max(1, parseInt(limit, 10) || 20));
            const offset = (pg - 1) * lim;

            const countR = await pool.query(`
                SELECT COUNT(*)::int AS c
                FROM learning.care_guides cg
                JOIN learning.flowers f ON f.id = cg.flower_id
                ${where}`, values);
            const total = countR.rows[0].c;

            values.push(lim, offset);
            const dataR = await pool.query(`
                SELECT cg.*, f.common_name, f.scientific_name, f.slug AS flower_slug
                FROM learning.care_guides cg
                JOIN learning.flowers f ON f.id = cg.flower_id
                ${where}
                ORDER BY ${orderBy}
                LIMIT $${idx} OFFSET $${idx + 1}`, values);

            return res.json({ guides: dataR.rows, total, page: pg, pages: Math.ceil(total / lim) });
        } catch (err) {
            console.error('Care guides query error:', err.message);
        }
    }

    const fallback = readJSON(path.join(__dirname, '..', 'data', 'care-guides.json'));
    let filtered = fallback;
    if (search) filtered = filtered.filter(g => g.title?.toLowerCase().includes(search.toLowerCase()));
    if (difficulty) filtered = filtered.filter(g => g.difficulty === difficulty);
    res.json({ guides: filtered, total: filtered.length, page: 1, pages: 1 });
}));

// ─── Get featured care guides ─────────────────────────────────────────
router.get('/care-guides/featured', asyncHandler(async (_, res) => {
    if (await dbAvailable()) {
        try {
            const r = await pool.query(`
                SELECT cg.*, f.common_name, f.scientific_name, f.slug AS flower_slug
                FROM learning.care_guides cg
                JOIN learning.flowers f ON f.id = cg.flower_id
                WHERE cg.status = 'active' AND cg.is_featured = true
                ORDER BY cg.views DESC LIMIT 6`);
            if (r.rows.length) return res.json(r.rows);
        } catch {}
    }
    const fallback = readJSON(path.join(__dirname, '..', 'data', 'care-guides.json'));
    res.json(fallback.filter(g => g.is_featured).slice(0, 6));
}));

// ─── Get care guide by slug ───────────────────────────────────────────
router.get('/care-guides/:slug', asyncHandler(async (req, res) => {
    const { slug } = req.params;

    if (await dbAvailable()) {
        try {
            const r = await pool.query(`
                SELECT cg.*, f.common_name, f.scientific_name, f.family, f.origin, f.slug AS flower_slug,
                    (SELECT COALESCE(json_agg(cp.*), '[]') FROM learning.care_problems cp WHERE cp.care_guide_id = cg.id) AS problems,
                    (SELECT COALESCE(json_agg(cs.*), '[]') FROM learning.care_seasonal cs WHERE cs.care_guide_id = cg.id) AS seasonal
                FROM learning.care_guides cg
                JOIN learning.flowers f ON f.id = cg.flower_id
                WHERE cg.slug = $1 AND cg.status = 'active'`, [slug]);

            if (r.rows.length) {
                await pool.query('UPDATE learning.care_guides SET views = views + 1 WHERE slug = $1', [slug]);
                return res.json(r.rows[0]);
            }
        } catch (err) {
            console.error('Care guide detail error:', err.message);
        }
    }

    const fallback = readJSON(path.join(__dirname, '..', 'data', 'care-guides.json'));
    const guide = fallback.find(g => g.slug === slug);
    guide ? res.json(guide) : res.status(404).json({ error: 'Care guide not found' });
}));

// ─── Get care guide by flower slug ────────────────────────────────────
router.get('/care-guides/flower/:flowerSlug', asyncHandler(async (req, res) => {
    const { flowerSlug } = req.params;

    if (await dbAvailable()) {
        try {
            const r = await pool.query(`
                SELECT cg.*, f.common_name, f.scientific_name, f.slug AS flower_slug
                FROM learning.care_guides cg
                JOIN learning.flowers f ON f.id = cg.flower_id
                WHERE f.slug = $1 AND cg.status = 'active'
                LIMIT 1`, [flowerSlug]);
            if (r.rows.length) return res.json(r.rows[0]);
        } catch {}
    }

    const fallback = readJSON(path.join(__dirname, '..', 'data', 'care-guides.json'));
    const guide = fallback.find(g => g.flower_slug === flowerSlug);
    guide ? res.json(guide) : res.status(404).json({ error: 'Care guide not found' });
}));

module.exports = router;
