const router = require('express').Router();
const { pool, requireAuth, asyncHandler, dbAvailable, readJSON } = require('./middleware');
const path = require('path');

// ─── List flowers with filters ────────────────────────────────────────
router.get('/flowers', asyncHandler(async (req, res) => {
    const { search, color, season, sunlight, water, care_level, indoor_outdoor, sort = 'name', page = 1, limit = 20, letter } = req.query;

    if (await dbAvailable()) {
        try {
            const conditions = ["f.status = 'active'"];
            const values = [];
            let idx = 1;

            if (search) { conditions.push(`(f.common_name ILIKE $${idx} OR f.scientific_name ILIKE $${idx})`); values.push(`%${search}%`); idx++; }
            if (color) { conditions.push(`$${idx} = ANY(f.colors)`); values.push(color); idx++; }
            if (season) { conditions.push(`f.bloom_season ILIKE $${idx}`); values.push(`%${season}%`); idx++; }
            if (sunlight) { conditions.push(`f.sunlight ILIKE $${idx}`); values.push(`%${sunlight}%`); idx++; }
            if (water) { conditions.push(`f.water_requirements ILIKE $${idx}`); values.push(`%${water}%`); idx++; }
            if (care_level) { conditions.push(`f.care_level = $${idx}`); values.push(care_level); idx++; }
            if (indoor_outdoor) { conditions.push(`f.indoor_outdoor = $${idx}`); values.push(indoor_outdoor); idx++; }
            if (letter) { conditions.push(`f.common_name ILIKE $${idx}`); values.push(`${letter}%`); idx++; }

            const where = 'WHERE ' + conditions.join(' AND ');
            const sortMap = { name: 'f.common_name ASC', newest: 'f.created_at DESC', popular: 'f.views DESC' };
            const orderBy = sortMap[sort] || 'f.common_name ASC';

            const pg = Math.max(1, parseInt(page, 10) || 1);
            const lim = Math.min(100, Math.max(1, parseInt(limit, 10) || 20));
            const offset = (pg - 1) * lim;

            const countR = await pool.query(`SELECT COUNT(*)::int AS c FROM learning.flowers f ${where}`, values);
            const total = countR.rows[0].c;

            values.push(lim, offset);
            const dataR = await pool.query(`
                SELECT f.*,
                    (SELECT image_url FROM learning.flower_images WHERE flower_id = f.id AND is_primary = true LIMIT 1) AS primary_image,
                    (SELECT COUNT(*)::int FROM learning.flower_images WHERE flower_id = f.id) AS image_count
                FROM learning.flowers f
                ${where}
                ORDER BY ${orderBy}
                LIMIT $${idx} OFFSET $${idx + 1}`, values);

            return res.json({ flowers: dataR.rows, total, page: pg, pages: Math.ceil(total / lim) });
        } catch (err) {
            console.error('Flowers query error:', err.message);
        }
    }

    const fallback = readJSON(path.join(__dirname, '..', 'data', 'flowers.json'));
    let filtered = fallback;
    if (search) filtered = filtered.filter(f => f.common_name?.toLowerCase().includes(search.toLowerCase()));
    if (letter) filtered = filtered.filter(f => f.common_name?.toLowerCase().startsWith(letter.toLowerCase()));
    res.json({ flowers: filtered, total: filtered.length, page: 1, pages: 1 });
}));

// ─── Get featured flowers ─────────────────────────────────────────────
router.get('/flowers/featured', asyncHandler(async (_, res) => {
    if (await dbAvailable()) {
        try {
            const r = await pool.query(`
                SELECT f.*,
                    (SELECT image_url FROM learning.flower_images WHERE flower_id = f.id AND is_primary = true LIMIT 1) AS primary_image
                FROM learning.flowers f
                WHERE f.status = 'active'
                ORDER BY f.views DESC LIMIT 6`);
            if (r.rows.length) return res.json(r.rows);
        } catch {}
    }
    const fallback = readJSON(path.join(__dirname, '..', 'data', 'flowers.json'));
    res.json(fallback.slice(0, 6));
}));

// ─── Get seasonal flowers ─────────────────────────────────────────────
router.get('/flowers/seasonal/:season', asyncHandler(async (req, res) => {
    const { season } = req.params;

    if (await dbAvailable()) {
        try {
            const r = await pool.query(`
                SELECT f.*,
                    (SELECT image_url FROM learning.flower_images WHERE flower_id = f.id AND is_primary = true LIMIT 1) AS primary_image
                FROM learning.flowers f
                WHERE f.status = 'active' AND f.bloom_season ILIKE $1
                ORDER BY f.common_name LIMIT 12`, [`%${season}%`]);
            return res.json(r.rows);
        } catch {}
    }
    const fallback = readJSON(path.join(__dirname, '..', 'data', 'flowers.json'));
    res.json(fallback.filter(f => f.bloom_season?.toLowerCase().includes(season.toLowerCase())).slice(0, 12));
}));

// ─── Get flower by slug ───────────────────────────────────────────────
router.get('/flowers/:slug', asyncHandler(async (req, res) => {
    const { slug } = req.params;

    if (await dbAvailable()) {
        try {
            const r = await pool.query(`
                SELECT f.*,
                    (SELECT COALESCE(json_agg(fi.* ORDER BY fi.sort_order), '[]') FROM learning.flower_images fi WHERE fi.flower_id = f.id) AS images,
                    (SELECT row_to_json(fc) FROM learning.flower_care fc WHERE fc.flower_id = f.id) AS care,
                    (SELECT COALESCE(json_agg(fd.*), '[]') FROM learning.flower_diseases fd WHERE fd.flower_id = f.id) AS diseases,
                    (SELECT COALESCE(json_agg(fs.*), '[]') FROM learning.flower_seasons fs WHERE fs.flower_id = f.id) AS seasons
                FROM learning.flowers f
                WHERE f.slug = $1 AND f.status = 'active'`, [slug]);

            if (r.rows.length) {
                // Increment views
                await pool.query('UPDATE learning.flowers SET views = views + 1 WHERE slug = $1', [slug]);
                return res.json(r.rows[0]);
            }
        } catch (err) {
            console.error('Flower detail error:', err.message);
        }
    }

    const fallback = readJSON(path.join(__dirname, '..', 'data', 'flowers.json'));
    const flower = fallback.find(f => f.slug === slug);
    flower ? res.json(flower) : res.status(404).json({ error: 'Flower not found' });
}));

// ─── Get similar flowers ──────────────────────────────────────────────
router.get('/flowers/:slug/similar', asyncHandler(async (req, res) => {
    const { slug } = req.params;

    if (await dbAvailable()) {
        try {
            const current = await pool.query('SELECT family, colors FROM learning.flowers WHERE slug = $1', [slug]);
            if (!current.rows.length) return res.json([]);

            const { family, colors } = current.rows[0];
            const r = await pool.query(`
                SELECT f.*,
                    (SELECT image_url FROM learning.flower_images WHERE flower_id = f.id AND is_primary = true LIMIT 1) AS primary_image
                FROM learning.flowers f
                WHERE f.slug != $1 AND f.status = 'active' AND (f.family = $2 OR f.colors && $3)
                ORDER BY RANDOM() LIMIT 6`, [slug, family, colors || []]);
            return res.json(r.rows);
        } catch {}
    }
    const fallback = readJSON(path.join(__dirname, '..', 'data', 'flowers.json'));
    res.json(fallback.filter(f => f.slug !== slug).slice(0, 4));
}));

module.exports = router;
