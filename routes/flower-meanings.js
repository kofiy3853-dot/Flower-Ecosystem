const router = require('express').Router();
const { pool, asyncHandler, dbAvailable, readJSON } = require('./middleware');
const path = require('path');

// ─── List meanings with filters ───────────────────────────────────────
router.get('/meanings', asyncHandler(async (req, res) => {
    const { search, occasion, meaning, sort = 'popular', page = 1, limit = 20 } = req.query;

    if (await dbAvailable()) {
        try {
            const conditions = ["fm.status = 'active'"];
            const values = [];
            let idx = 1;

            if (search) {
                conditions.push(`(fm.meaning ILIKE $${idx} OR f.common_name ILIKE $${idx} OR fm.description ILIKE $${idx})`);
                values.push(`%${search}%`); idx++;
            }
            if (occasion) {
                conditions.push(`$${idx} = ANY(fm.occasions)`);
                values.push(occasion); idx++;
            }
            if (meaning) {
                conditions.push(`fm.meaning ILIKE $${idx}`);
                values.push(`%${meaning}%`); idx++;
            }

            const where = 'WHERE ' + conditions.join(' AND ');
            const sortMap = { popular: 'f.views DESC', newest: 'fm.created_at DESC', name: 'f.common_name ASC' };
            const orderBy = sortMap[sort] || 'f.views DESC';

            const pg = Math.max(1, parseInt(page, 10) || 1);
            const lim = Math.min(100, Math.max(1, parseInt(limit, 10) || 20));
            const offset = (pg - 1) * lim;

            const countR = await pool.query(`
                SELECT COUNT(*)::int AS c 
                FROM learning.flower_meanings fm 
                JOIN learning.flowers f ON f.id = fm.flower_id 
                ${where}`, values);
            const total = countR.rows[0].c;

            values.push(lim, offset);
            const dataR = await pool.query(`
                SELECT fm.*, f.common_name, f.scientific_name, f.slug,
                    (SELECT image_url FROM learning.flower_images WHERE flower_id = f.id AND is_primary = true LIMIT 1) AS primary_image
                FROM learning.flower_meanings fm
                JOIN learning.flowers f ON f.id = fm.flower_id
                ${where}
                ORDER BY ${orderBy}
                LIMIT $${idx} OFFSET $${idx + 1}`, values);

            return res.json({ meanings: dataR.rows, total, page: pg, pages: Math.ceil(total / lim) });
        } catch (err) {
            console.error('Meanings query error:', err.message);
        }
    }

    const fallback = readJSON(path.join(__dirname, '..', 'data', 'flower-meanings.json'));
    let filtered = fallback;
    if (search) filtered = filtered.filter(m => m.meaning?.toLowerCase().includes(search.toLowerCase()) || m.common_name?.toLowerCase().includes(search.toLowerCase()));
    if (occasion) filtered = filtered.filter(m => m.occasions?.includes(occasion));
    res.json({ meanings: filtered, total: filtered.length, page: 1, pages: 1 });
}));

// ─── Get meanings by occasion ─────────────────────────────────────────
router.get('/meanings/occasion/:occasion', asyncHandler(async (req, res) => {
    const { occasion } = req.params;

    if (await dbAvailable()) {
        try {
            const r = await pool.query(`
                SELECT fm.*, f.common_name, f.scientific_name, f.slug,
                    (SELECT image_url FROM learning.flower_images WHERE flower_id = f.id AND is_primary = true LIMIT 1) AS primary_image
                FROM learning.flower_meanings fm
                JOIN learning.flowers f ON f.id = fm.flower_id
                WHERE fm.status = 'active' AND $1 = ANY(fm.occasions)
                ORDER BY f.views DESC LIMIT 12`, [occasion]);
            return res.json(r.rows);
        } catch {}
    }
    const fallback = readJSON(path.join(__dirname, '..', 'data', 'flower-meanings.json'));
    res.json(fallback.filter(m => m.occasions?.includes(occasion)).slice(0, 12));
}));

// ─── Get featured meanings ────────────────────────────────────────────
router.get('/meanings/featured', asyncHandler(async (_, res) => {
    if (await dbAvailable()) {
        try {
            const r = await pool.query(`
                SELECT fm.*, f.common_name, f.scientific_name, f.slug,
                    (SELECT image_url FROM learning.flower_images WHERE flower_id = f.id AND is_primary = true LIMIT 1) AS primary_image
                FROM learning.flower_meanings fm
                JOIN learning.flowers f ON f.id = fm.flower_id
                WHERE fm.status = 'active' AND fm.is_featured = true
                ORDER BY f.views DESC LIMIT 6`);
            if (r.rows.length) return res.json(r.rows);
        } catch {}
    }
    const fallback = readJSON(path.join(__dirname, '..', 'data', 'flower-meanings.json'));
    res.json(fallback.filter(m => m.is_featured).slice(0, 6));
}));

// ─── Get meaning by flower slug ───────────────────────────────────────
router.get('/meanings/:slug', asyncHandler(async (req, res) => {
    const { slug } = req.params;

    if (await dbAvailable()) {
        try {
            const r = await pool.query(`
                SELECT fm.*, f.common_name, f.scientific_name, f.family, f.origin, f.slug,
                    (SELECT COALESCE(json_agg(fi.*), '[]') FROM learning.flower_images fi WHERE fi.flower_id = f.id) AS images
                FROM learning.flower_meanings fm
                JOIN learning.flowers f ON f.id = fm.flower_id
                WHERE f.slug = $1 AND fm.status = 'active'`, [slug]);
            if (r.rows.length) return res.json(r.rows[0]);
        } catch (err) {
            console.error('Meaning detail error:', err.message);
        }
    }

    const fallback = readJSON(path.join(__dirname, '..', 'data', 'flower-meanings.json'));
    const meaning = fallback.find(m => m.slug === slug);
    meaning ? res.json(meaning) : res.status(404).json({ error: 'Meaning not found' });
}));

// ─── Get all occasions ────────────────────────────────────────────────
router.get('/occasions', asyncHandler(async (_, res) => {
    if (await dbAvailable()) {
        try {
            const r = await pool.query(`
                SELECT DISTINCT unnest(occasions) AS occasion, COUNT(*)::int AS count
                FROM learning.flower_meanings
                WHERE status = 'active'
                GROUP BY occasion
                ORDER BY count DESC`);
            return res.json(r.rows);
        } catch {}
    }
    const fallback = readJSON(path.join(__dirname, '..', 'data', 'flower-meanings.json'));
    const occasions = {};
    fallback.forEach(m => {
        (m.occasions || []).forEach(o => {
            occasions[o] = (occasions[o] || 0) + 1;
        });
    });
    const sorted = Object.entries(occasions).map(([name, count]) => ({ occasion: name, count })).sort((a, b) => b.count - a.count);
    res.json(sorted);
}));

module.exports = router;
