const router = require('express').Router();
const path = require('path');
const { pool, asyncHandler, escapeHtml, dbAvailable, readJSON, queryWithFallback, requireAuth, requireAdmin } = require('./middleware');

router.get('/flowers', asyncHandler(async (req, res) => {
    return queryWithFallback(
        async () => {
            const { category, search, difficulty, sunlight, water, bloom_season } = req.query;
            let q = 'SELECT fk.* FROM learning.flower_knowledge fk';
            const params = [];
            const conds = ['fk.is_published = true'];

            if (category) {
                q += ' JOIN learning.flower_category_mapping fcm ON fcm.flower_id = fk.id JOIN learning.knowledge_categories kc ON kc.id = fcm.category_id';
                conds.push('kc.slug = $' + (params.length + 1));
                params.push(category);
            }
            if (search) {
                conds.push('(fk.common_name ILIKE $' + (params.length + 1) + ' OR fk.scientific_name ILIKE $' + (params.length + 1) + ')');
                params.push('%' + search + '%');
            }
            if (difficulty) { conds.push('fk.difficulty ILIKE $' + (params.length + 1)); params.push('%' + difficulty + '%'); }
            if (sunlight) { conds.push('fk.sunlight ILIKE $' + (params.length + 1)); params.push('%' + sunlight + '%'); }
            if (water) { conds.push('fk.water ILIKE $' + (params.length + 1)); params.push('%' + water + '%'); }
            if (bloom_season) { conds.push('fk.bloom_season ILIKE $' + (params.length + 1)); params.push('%' + bloom_season + '%'); }

            q += ' WHERE ' + conds.join(' AND ');
            q += ' ORDER BY fk.common_name';
            if (category) q += ' GROUP BY fk.id';

            const r = await pool.query(q, params);
            return r.rows;
        },
        'flower-knowledge', res, false,
        (data) => {
            let f = data;
            if (req.query.category) f = f.filter(d => (d.category_ids || []).includes(Number(req.query.category)));
            if (req.query.search) { const q = req.query.search.toLowerCase(); f = f.filter(d => d.common_name.toLowerCase().includes(q) || (d.scientific_name || '').toLowerCase().includes(q)); }
            if (req.query.difficulty) { const q = req.query.difficulty.toLowerCase(); f = f.filter(d => (d.difficulty || '').toLowerCase().includes(q)); }
            if (req.query.sunlight) { const q = req.query.sunlight.toLowerCase(); f = f.filter(d => (d.sunlight || '').toLowerCase().includes(q)); }
            if (req.query.water) { const q = req.query.water.toLowerCase(); f = f.filter(d => (d.water || '').toLowerCase().includes(q)); }
            if (req.query.bloom_season) { const q = req.query.bloom_season.toLowerCase(); f = f.filter(d => (d.bloom_season || '').toLowerCase().includes(q)); }
            return f;
        }
    );
}));

router.get('/flowers/:slug', asyncHandler(async (req, res) => {
    return queryWithFallback(
        async () => {
            const r = await pool.query('SELECT * FROM learning.flower_knowledge WHERE slug = $1', [req.params.slug]);
            if (!r.rows.length) return { _notFound: true };
            const flower = r.rows[0];
            const categories = await pool.query(
                `SELECT kc.* FROM learning.knowledge_categories kc
                 JOIN learning.flower_category_mapping fcm ON fcm.category_id = kc.id
                 WHERE fcm.flower_id = $1`, [flower.id]);
            const benefits = await pool.query(
                'SELECT id, flower_id, benefit_type, benefit_description AS description, sort_order FROM learning.flower_benefits WHERE flower_id = $1 ORDER BY benefit_type, sort_order', [flower.id]);
            const careTips = await pool.query(
                'SELECT * FROM learning.flower_care_tips WHERE flower_id = $1 ORDER BY sort_order', [flower.id]);
            return { ...flower, categories: categories.rows, benefits: benefits.rows, care_tips: careTips.rows };
        },
        'flower-knowledge', res, true,
        (data) => {
            const found = data.find(d => d.slug === req.params.slug);
            if (!found) return { _notFound: true };
            return found;
        }
    );
}));

router.get('/categories', asyncHandler(async (_, res) => {
    return queryWithFallback(
        async () => {
            const r = await pool.query('SELECT * FROM learning.knowledge_categories ORDER BY name');
            return r.rows;
        },
        'flower-knowledge-categories', res
    );
}));

router.post('/favorites', requireAuth, asyncHandler(async (req, res) => {
    const { slug } = req.body;
    if (!slug) return res.status(400).json({ error: 'slug is required' });
    if (!(await dbAvailable())) return res.status(503).json({ error: 'Database unavailable' });
    await pool.query(
        'INSERT INTO learning.user_flower_favorites (user_id, flower_slug) VALUES ($1, $2) ON CONFLICT DO NOTHING',
        [req.user.id, slug]
    );
    res.json({ success: true });
}));

router.delete('/favorites/:slug', requireAuth, asyncHandler(async (req, res) => {
    if (!(await dbAvailable())) return res.status(503).json({ error: 'Database unavailable' });
    await pool.query(
        'DELETE FROM learning.user_flower_favorites WHERE user_id = $1 AND flower_slug = $2',
        [req.user.id, req.params.slug]
    );
    res.json({ success: true });
}));

router.get('/favorites', requireAuth, asyncHandler(async (req, res) => {
    if (!(await dbAvailable())) return res.json({ favorites: [] });
    const r = await pool.query(
        'SELECT flower_slug, created_at FROM learning.user_flower_favorites WHERE user_id = $1 ORDER BY created_at DESC',
        [req.user.id]
    );
    res.json({ favorites: r.rows.map(r => r.flower_slug) });
}));

router.get('/random', asyncHandler(async (_, res) => {
    const dayOfYear = Math.floor((Date.now() - new Date(new Date().getFullYear(), 0, 0)) / 86400000);
    return queryWithFallback(
        async () => {
            const r = await pool.query('SELECT * FROM learning.flower_knowledge WHERE is_published = true ORDER BY RANDOM() LIMIT 1');
            return r.rows[0] || null;
        },
        'flower-knowledge', res, true,
        (data) => {
            if (!data || !data.length) return null;
            return data[dayOfYear % data.length];
        }
    );
}));

router.get('/bloom-calendar', asyncHandler(async (_, res) => {
    return queryWithFallback(
        async () => {
            const r = await pool.query('SELECT slug, common_name, scientific_name, emoji, image_url, bloom_season, category_ids FROM learning.flower_knowledge WHERE is_published = true ORDER BY common_name');
            return r.rows;
        },
        'flower-knowledge', res, false,
        (data) => data.map(f => ({ slug: f.slug, common_name: f.common_name, scientific_name: f.scientific_name, emoji: f.emoji, image_url: f.image_url, bloom_season: f.bloom_season || 'Year-round', category_ids: f.category_ids || [] }))
    );
}));

router.get('/flowers/:slug/related', asyncHandler(async (req, res) => {
    try {
        const fallbackData = readJSON(path.join(__dirname, '..', 'data', 'flower-knowledge.json'));
        const flower = fallbackData.find(d => d.slug === req.params.slug);
        if (!flower) return res.json([]);
        const tags = flower.marketplace_tags || [flower.common_name.toLowerCase()];
        const products = readJSON(path.join(__dirname, '..', 'data', 'products.json'));
        const matched = products.filter(p => {
            const name = (p.name || '').toLowerCase();
            const desc = (p.description || '').toLowerCase();
            return tags.some(t => name.includes(t) || desc.includes(t));
        });
        return res.json(matched.slice(0, 8));
    } catch (e) {
        console.error('Related products error:', e.message);
        return res.json([]);
    }
}));

router.get('/flowers/:slug/comments', asyncHandler(async (req, res) => {
    if (!(await dbAvailable())) return res.status(503).json({ error: 'Database unavailable' });
    const r = await pool.query(
        'SELECT id, flower_slug, user_id, display_name, comment, rating, created_at FROM community.flower_comments WHERE flower_slug = $1 ORDER BY created_at DESC',
        [req.params.slug]
    );
    res.json(r.rows);
}));

router.post('/flowers/:slug/comments', requireAuth, asyncHandler(async (req, res) => {
    if (!(await dbAvailable())) return res.status(503).json({ error: 'Database unavailable' });
    const { comment, rating } = req.body;
    if (!comment || typeof comment !== 'string') return res.status(400).json({ error: 'Comment is required' });
    const r = await pool.query(
        'INSERT INTO community.flower_comments (flower_slug, user_id, display_name, comment, rating) VALUES ($1, $2, $3, $4, $5) RETURNING *',
        [req.params.slug, req.user.id, req.user.display_name || 'Anonymous', escapeHtml(comment).slice(0, 2000), rating || null]
    );
    res.status(201).json(r.rows[0]);
}));

router.delete('/flowers/comments/:id', requireAuth, asyncHandler(async (req, res) => {
    if (!(await dbAvailable())) return res.status(503).json({ error: 'Database unavailable' });
    const { id } = req.params;
    const existing = await pool.query('SELECT * FROM community.flower_comments WHERE id = $1', [id]);
    if (!existing.rows.length) return res.status(404).json({ error: 'Comment not found' });
    const userRole = (req.user.role || '').toUpperCase();
    const isOwner = existing.rows[0].user_id === req.user.id;
    const isPrivileged = ['ADMIN', 'SUPERADMIN', 'MODERATOR'].includes(userRole);
    if (!isOwner && !isPrivileged) return res.status(403).json({ error: 'Not authorized to delete this comment' });
    await pool.query('DELETE FROM community.flower_comments WHERE id = $1', [id]);
    res.json({ message: 'Comment deleted' });
}));

router.get('/flowers/:slug/average-rating', asyncHandler(async (req, res) => {
    if (!(await dbAvailable())) return res.json({ average: 0, count: 0 });
    const r = await pool.query(
        'SELECT ROUND(AVG(rating)::numeric, 1) AS average, COUNT(*) AS count FROM community.flower_comments WHERE flower_slug = $1 AND rating IS NOT NULL',
        [req.params.slug]
    );
    res.json(r.rows[0]);
}));

// Admin knowledge CRUD
router.get('/admin/flowers', requireAdmin, asyncHandler(async (req, res) => {
    return queryWithFallback(
        async () => {
            const r = await pool.query('SELECT id, slug, common_name, scientific_name, emoji, is_published, created_at FROM learning.flower_knowledge ORDER BY common_name');
            return r.rows;
        },
        'flower-knowledge', res
    );
}));

router.get('/admin/flowers/:slug', requireAdmin, asyncHandler(async (req, res) => {
    return queryWithFallback(
        async () => {
            const r = await pool.query('SELECT * FROM learning.flower_knowledge WHERE slug = $1', [req.params.slug]);
            if (!r.rows.length) return res.status(404).json({ error: 'Not found' });
            const flower = r.rows[0];
            const cats = await pool.query('SELECT category_id FROM learning.flower_category_mapping WHERE flower_id = $1', [flower.id]);
            const benefits = await pool.query('SELECT benefit_type, benefit_description AS description, sort_order FROM learning.flower_benefits WHERE flower_id = $1 ORDER BY benefit_type, sort_order', [flower.id]);
            const tips = await pool.query('SELECT title, description, sort_order FROM learning.flower_care_tips WHERE flower_id = $1 ORDER BY sort_order', [flower.id]);
            return { ...flower, category_ids: cats.rows.map(c => c.category_id), benefits: benefits.rows, care_tips: tips.rows };
        },
        'flower-knowledge', res, true,
        (data) => { const found = data.find(d => d.slug === req.params.slug); return found || null; }
    );
}));

router.post('/admin/flowers', requireAdmin, asyncHandler(async (req, res) => {
    if (!(await dbAvailable())) return res.status(503).json({ error: 'Database unavailable' });
    const { slug, common_name, scientific_name, family, origin, description, image_url, emoji, sunlight, water, soil, difficulty, growth_rate, height, bloom_season, marketplace_tags, category_ids, benefits, care_tips } = req.body;
    if (!slug || !common_name) return res.status(400).json({ error: 'slug and common_name are required' });
    const r = await pool.query(
        `INSERT INTO learning.flower_knowledge (slug, common_name, scientific_name, family, origin, description, image_url, emoji, sunlight, water, soil, difficulty, growth_rate, height, bloom_season, marketplace_tags)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16) RETURNING id`,
        [slug, common_name, scientific_name, family, origin, description, image_url, emoji, sunlight, water, soil, difficulty, growth_rate, height, bloom_season || 'Year-round', marketplace_tags || []]
    );
    const flowerId = r.rows[0].id;
    for (const catId of (category_ids || [])) {
        await pool.query('INSERT INTO learning.flower_category_mapping (flower_id, category_id) VALUES ($1,$2) ON CONFLICT DO NOTHING', [flowerId, catId]);
    }
    for (const b of (benefits || [])) {
        await pool.query('INSERT INTO learning.flower_benefits (flower_id, benefit_type, benefit_description, sort_order) VALUES ($1,$2,$3,$4)', [flowerId, b.benefit_type, b.description, b.sort_order || 0]);
    }
    for (const t of (care_tips || [])) {
        await pool.query('INSERT INTO learning.flower_care_tips (flower_id, title, description, sort_order) VALUES ($1,$2,$3,$4)', [flowerId, t.title, t.description, t.sort_order || 0]);
    }
    res.json({ success: true, slug });
}));

router.put('/admin/flowers/:slug', requireAdmin, asyncHandler(async (req, res) => {
    if (!(await dbAvailable())) return res.status(503).json({ error: 'Database unavailable' });
    const { common_name, scientific_name, family, origin, description, image_url, emoji, sunlight, water, soil, difficulty, growth_rate, height, bloom_season, marketplace_tags, category_ids, benefits, care_tips } = req.body;
    const exists = await pool.query('SELECT id FROM learning.flower_knowledge WHERE slug = $1', [req.params.slug]);
    if (!exists.rows.length) return res.status(404).json({ error: 'Not found' });
    const flowerId = exists.rows[0].id;
    await pool.query(
        `UPDATE learning.flower_knowledge SET common_name=$1, scientific_name=$2, family=$3, origin=$4, description=$5, image_url=$6, emoji=$7, sunlight=$8, water=$9, soil=$10, difficulty=$11, growth_rate=$12, height=$13, bloom_season=$16, marketplace_tags=$14 WHERE id=$15`,
        [common_name, scientific_name, family, origin, description, image_url, emoji, sunlight, water, soil, difficulty, growth_rate, height, marketplace_tags || [], flowerId, bloom_season || 'Year-round']
    );
    await pool.query('DELETE FROM learning.flower_category_mapping WHERE flower_id = $1', [flowerId]);
    for (const catId of (category_ids || [])) {
        await pool.query('INSERT INTO learning.flower_category_mapping (flower_id, category_id) VALUES ($1,$2) ON CONFLICT DO NOTHING', [flowerId, catId]);
    }
    await pool.query('DELETE FROM learning.flower_benefits WHERE flower_id = $1', [flowerId]);
    for (const b of (benefits || [])) {
        await pool.query('INSERT INTO learning.flower_benefits (flower_id, benefit_type, benefit_description, sort_order) VALUES ($1,$2,$3,$4)', [flowerId, b.benefit_type, b.description, b.sort_order || 0]);
    }
    await pool.query('DELETE FROM learning.flower_care_tips WHERE flower_id = $1', [flowerId]);
    for (const t of (care_tips || [])) {
        await pool.query('INSERT INTO learning.flower_care_tips (flower_id, title, description, sort_order) VALUES ($1,$2,$3,$4)', [flowerId, t.title, t.description, t.sort_order || 0]);
    }
    res.json({ success: true });
}));

router.delete('/admin/flowers/:slug', requireAdmin, asyncHandler(async (req, res) => {
    if (!(await dbAvailable())) return res.status(503).json({ error: 'Database unavailable' });
    const r = await pool.query('DELETE FROM learning.flower_knowledge WHERE slug = $1 RETURNING id', [req.params.slug]);
    if (!r.rows.length) return res.status(404).json({ error: 'Not found' });
    res.json({ success: true });
}));

router.get('/admin/categories', requireAdmin, asyncHandler(async (_, res) => {
    return queryWithFallback(async () => {
        const r = await pool.query('SELECT * FROM learning.knowledge_categories ORDER BY name');
        return r.rows;
    }, 'flower-knowledge-categories', res);
}));

router.put('/admin/categories/:id', requireAdmin, asyncHandler(async (req, res) => {
    if (!(await dbAvailable())) return res.status(503).json({ error: 'Database unavailable' });
    const { name, slug, description, icon } = req.body;
    await pool.query('UPDATE learning.knowledge_categories SET name=$1, slug=$2, description=$3, icon=$4 WHERE id=$5',
        [name, slug, description, icon, req.params.id]);
    res.json({ success: true });
}));

// Garden Planner
router.get('/plans', requireAuth, asyncHandler(async (req, res) => {
    if (!(await dbAvailable())) return res.json([]);
    const plans = await pool.query('SELECT * FROM learning.user_garden_plans WHERE user_id = $1 ORDER BY created_at DESC', [req.user.id]);
    const result = [];
    for (const plan of plans.rows) {
        const items = await pool.query('SELECT * FROM learning.garden_plan_items WHERE plan_id = $1 ORDER BY created_at', [plan.id]);
        result.push({ ...plan, items: items.rows });
    }
    res.json(result);
}));

router.post('/plans', requireAuth, asyncHandler(async (req, res) => {
    if (!(await dbAvailable())) return res.status(503).json({ error: 'Database unavailable' });
    const { name } = req.body;
    const r = await pool.query('INSERT INTO learning.user_garden_plans (user_id, name) VALUES ($1, $2) RETURNING id', [req.user.id, name || 'My Garden']);
    res.json({ id: r.rows[0].id, name: name || 'My Garden', items: [] });
}));

router.post('/plans/:id/items', requireAuth, asyncHandler(async (req, res) => {
    if (!(await dbAvailable())) return res.status(503).json({ error: 'Database unavailable' });
    const plan = await pool.query('SELECT id FROM learning.user_garden_plans WHERE id = $1 AND user_id = $2', [req.params.id, req.user.id]);
    if (!plan.rows.length) return res.status(404).json({ error: 'Plan not found' });
    const { flower_slug, quantity, notes } = req.body;
    if (!flower_slug) return res.status(400).json({ error: 'flower_slug required' });
    const r = await pool.query('INSERT INTO learning.garden_plan_items (plan_id, flower_slug, quantity, notes) VALUES ($1, $2, $3, $4) RETURNING id', [req.params.id, flower_slug, quantity || 1, notes || '']);
    res.json({ success: true, id: r.rows[0].id });
}));

router.delete('/plans/:planId/items/:itemId', requireAuth, asyncHandler(async (req, res) => {
    if (!(await dbAvailable())) return res.status(503).json({ error: 'Database unavailable' });
    const plan = await pool.query('SELECT id FROM learning.user_garden_plans WHERE id = $1 AND user_id = $2', [req.params.planId, req.user.id]);
    if (!plan.rows.length) return res.status(404).json({ error: 'Plan not found' });
    await pool.query('DELETE FROM learning.garden_plan_items WHERE id = $1 AND plan_id = $2', [req.params.itemId, req.params.planId]);
    res.json({ success: true });
}));

router.delete('/plans/:id', requireAuth, asyncHandler(async (req, res) => {
    if (!(await dbAvailable())) return res.status(503).json({ error: 'Database unavailable' });
    const r = await pool.query('DELETE FROM learning.user_garden_plans WHERE id = $1 AND user_id = $2 RETURNING id', [req.params.id, req.user.id]);
    if (!r.rows.length) return res.status(404).json({ error: 'Plan not found' });
    res.json({ success: true });
}));

module.exports = router;
