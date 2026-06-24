const router = require('express').Router();
const { pool, asyncHandler, dbAvailable, requireAuth } = require('./middleware');

router.get('/profile', requireAuth, asyncHandler(async (req, res) => {
    if (!(await dbAvailable())) return res.status(503).json({ error: 'Database unavailable' });
    try {
        const r = await pool.query('SELECT * FROM growers.profiles WHERE user_id = $1', [req.user.id]);
        if (r.rows.length) return res.json(r.rows[0]);
        const user = await pool.query('SELECT first_name, last_name, email FROM auth.users WHERE id = $1', [req.user.id]);
        const u = user.rows[0] || {};
        return res.json({ farm_name: `${u.first_name || ''} ${u.last_name || ''}`.trim() + "'s Farm", user_id: req.user.id, description: '', location: '', rating: 0, specialties: [] });
    } catch { return res.json({ farm_name: 'My Farm', user_id: req.user.id }); }
}));

router.put('/profile', requireAuth, asyncHandler(async (req, res) => {
    if (!(await dbAvailable())) return res.status(503).json({ error: 'Database unavailable' });
    const { farm_name, description, location, acreage, specialties } = req.body;
    try {
        const existing = await pool.query('SELECT id FROM growers.profiles WHERE user_id = $1', [req.user.id]);
        if (existing.rows.length) {
            const r = await pool.query(
                `UPDATE growers.profiles SET farm_name = COALESCE($1, farm_name), description = COALESCE($2, description),
                    location = COALESCE($3, location), acreage = COALESCE($4, acreage),
                    specialties = COALESCE($5, specialties), updated_at = CURRENT_TIMESTAMP
                 WHERE user_id = $6 RETURNING *`,
                [farm_name, description, location, acreage, specialties, req.user.id]
            );
            return res.json(r.rows[0]);
        }
        const r = await pool.query(
            'INSERT INTO growers.profiles (user_id, farm_name, description, location, acreage, specialties) VALUES ($1, $2, $3, $4, $5, $6) RETURNING *',
            [req.user.id, farm_name || 'My Farm', description || null, location || null, acreage || null, specialties || null]
        );
        res.status(201).json(r.rows[0]);
    } catch (err) { console.error('Grower profile update error:', err.message); res.status(500).json({ error: 'Failed to update profile' }); }
}));

router.get('/crops', requireAuth, asyncHandler(async (req, res) => {
    if (!(await dbAvailable())) return res.json([]);
    try {
        const profile = await pool.query('SELECT id FROM growers.profiles WHERE user_id = $1', [req.user.id]);
        if (!profile.rows.length) return res.json([]);
        const r = await pool.query(`
            SELECT c.*, COALESCE(ch.health_score, 100) AS health_score,
                (SELECT issue FROM growers.crop_health WHERE crop_id = c.id AND resolved = false ORDER BY created_at DESC LIMIT 1) AS current_issue
            FROM growers.crops c
            LEFT JOIN LATERAL (SELECT health_score FROM growers.crop_health WHERE crop_id = c.id ORDER BY created_at DESC LIMIT 1) ch ON true
            WHERE c.grower_id = $1 ORDER BY c.updated_at DESC`, [profile.rows[0].id]);
        res.json(r.rows);
    } catch { res.json([]); }
}));

router.post('/crops', requireAuth, asyncHandler(async (req, res) => {
    if (!(await dbAvailable())) return res.status(503).json({ error: 'Database unavailable' });
    const profile = await pool.query('SELECT id FROM growers.profiles WHERE user_id = $1', [req.user.id]);
    if (!profile.rows.length) return res.status(400).json({ error: 'Create a grower profile first' });
    const { flower_name, variety, quantity, growth_stage, status, field_location, planting_date, expected_harvest, price_per_unit, quality_grade, notes } = req.body;
    if (!flower_name) return res.status(400).json({ error: 'Flower name is required' });
    const r = await pool.query(
        `INSERT INTO growers.crops (grower_id, flower_name, variety, quantity, growth_stage, status, field_location, planting_date, expected_harvest, price_per_unit, quality_grade, notes)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12) RETURNING *`,
        [profile.rows[0].id, flower_name, variety || null, quantity || 0, growth_stage || 'Seed', status || 'Healthy', field_location || null, planting_date || null, expected_harvest || null, price_per_unit || null, quality_grade || null, notes || null]
    );
    res.status(201).json(r.rows[0]);
}));

router.put('/crops/:id', requireAuth, asyncHandler(async (req, res) => {
    if (!(await dbAvailable())) return res.status(503).json({ error: 'Database unavailable' });
    const { id } = req.params;
    const { flower_name, variety, quantity, growth_stage, status, field_location, planting_date, expected_harvest, price_per_unit, quality_grade, notes } = req.body;
    const r = await pool.query(
        `UPDATE growers.crops SET flower_name = COALESCE($1, flower_name), variety = COALESCE($2, variety),
            quantity = COALESCE($3, quantity), growth_stage = COALESCE($4, growth_stage), status = COALESCE($5, status),
            field_location = COALESCE($6, field_location), planting_date = COALESCE($7, planting_date),
            expected_harvest = COALESCE($8, expected_harvest), price_per_unit = COALESCE($9, price_per_unit),
            quality_grade = COALESCE($10, quality_grade), notes = COALESCE($11, notes), updated_at = CURRENT_TIMESTAMP
         WHERE id = $12 RETURNING *`,
        [flower_name, variety, quantity, growth_stage, status, field_location, planting_date, expected_harvest, price_per_unit, quality_grade, notes, id]
    );
    if (!r.rows.length) return res.status(404).json({ error: 'Crop not found' });
    res.json(r.rows[0]);
}));

router.delete('/crops/:id', requireAuth, asyncHandler(async (req, res) => {
    if (!(await dbAvailable())) return res.status(503).json({ error: 'Database unavailable' });
    const r = await pool.query('DELETE FROM growers.crops WHERE id = $1 RETURNING id', [req.params.id]);
    if (!r.rows.length) return res.status(404).json({ error: 'Crop not found' });
    res.json({ message: 'Crop deleted' });
}));

router.post('/crops/:id/health', requireAuth, asyncHandler(async (req, res) => {
    if (!(await dbAvailable())) return res.status(503).json({ error: 'Database unavailable' });
    const { health_score, issue, issue_type, treatment } = req.body;
    const r = await pool.query(
        'INSERT INTO growers.crop_health (crop_id, health_score, issue, issue_type, treatment) VALUES ($1, $2, $3, $4, $5) RETURNING *',
        [req.params.id, health_score || 100, issue || null, issue_type || null, treatment || null]
    );
    res.status(201).json(r.rows[0]);
}));

router.get('/harvests', requireAuth, asyncHandler(async (req, res) => {
    if (!(await dbAvailable())) return res.json([]);
    try {
        const profile = await pool.query('SELECT id FROM growers.profiles WHERE user_id = $1', [req.user.id]);
        if (!profile.rows.length) return res.json([]);
        const r = await pool.query(`
            SELECT h.*, c.flower_name, c.variety
            FROM growers.harvests h
            JOIN growers.crops c ON c.id = h.crop_id
            WHERE h.grower_id = $1 ORDER BY h.harvest_date DESC LIMIT 50`, [profile.rows[0].id]);
        res.json(r.rows);
    } catch { res.json([]); }
}));

router.post('/harvests', requireAuth, asyncHandler(async (req, res) => {
    if (!(await dbAvailable())) return res.status(503).json({ error: 'Database unavailable' });
    const profile = await pool.query('SELECT id FROM growers.profiles WHERE user_id = $1', [req.user.id]);
    if (!profile.rows.length) return res.status(400).json({ error: 'Create a grower profile first' });
    const { crop_id, harvest_date, quantity, quality_grade, notes } = req.body;
    if (!crop_id || !quantity) return res.status(400).json({ error: 'Crop and quantity are required' });
    const r = await pool.query(
        'INSERT INTO growers.harvests (crop_id, grower_id, harvest_date, quantity, quality_grade, notes) VALUES ($1, $2, $3, $4, $5, $6) RETURNING *',
        [crop_id, profile.rows[0].id, harvest_date || new Date().toISOString().split('T')[0], quantity, quality_grade || null, notes || null]
    );
    await pool.query('UPDATE growers.crops SET quantity = quantity - $1 WHERE id = $2', [quantity, crop_id]);
    res.status(201).json(r.rows[0]);
}));

router.get('/orders', requireAuth, asyncHandler(async (req, res) => {
    if (!(await dbAvailable())) return res.json([]);
    try {
        const profile = await pool.query('SELECT id FROM growers.profiles WHERE user_id = $1', [req.user.id]);
        if (!profile.rows.length) return res.json([]);
        const r = await pool.query('SELECT * FROM growers.bulk_orders WHERE grower_id = $1 ORDER BY created_at DESC', [profile.rows[0].id]);
        res.json(r.rows);
    } catch { res.json([]); }
}));

router.put('/orders/:id', requireAuth, asyncHandler(async (req, res) => {
    if (!(await dbAvailable())) return res.status(503).json({ error: 'Database unavailable' });
    const { status } = req.body;
    const validStatuses = ['pending', 'confirmed', 'shipped', 'delivered', 'cancelled'];
    if (!validStatuses.includes(status)) return res.status(400).json({ error: 'Invalid status' });
    const r = await pool.query('UPDATE growers.bulk_orders SET status = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2 RETURNING *', [status, req.params.id]);
    if (!r.rows.length) return res.status(404).json({ error: 'Order not found' });
    res.json(r.rows[0]);
}));

router.get('/analytics', requireAuth, asyncHandler(async (req, res) => {
    if (!(await dbAvailable())) return res.json({ crops: 0, total_quantity: 0, harvests: 0, pending_orders: 0, revenue: 0 });
    try {
        const profile = await pool.query('SELECT id FROM growers.profiles WHERE user_id = $1', [req.user.id]);
        if (!profile.rows.length) return res.json({ crops: 0, total_quantity: 0, harvests: 0, pending_orders: 0, revenue: 0 });
        const gid = profile.rows[0].id;
        const [crops, quantity, harvests, orders, revenue] = await Promise.all([
            pool.query('SELECT COUNT(*) FROM growers.crops WHERE grower_id = $1', [gid]),
            pool.query('SELECT COALESCE(SUM(quantity), 0) AS total FROM growers.crops WHERE grower_id = $1', [gid]),
            pool.query('SELECT COUNT(*) FROM growers.harvests WHERE grower_id = $1', [gid]),
            pool.query("SELECT COUNT(*) FROM growers.bulk_orders WHERE grower_id = $1 AND status = 'pending'", [gid]),
            pool.query("SELECT COALESCE(SUM(total_price), 0) AS total FROM growers.bulk_orders WHERE grower_id = $1 AND status = 'delivered'", [gid])
        ]);
        res.json({
            crops: parseInt(crops.rows[0].count) || 0,
            total_quantity: parseInt(quantity.rows[0].total) || 0,
            harvests: parseInt(harvests.rows[0].count) || 0,
            pending_orders: parseInt(orders.rows[0].count) || 0,
            revenue: parseFloat(revenue.rows[0].total) || 0
        });
    } catch { res.json({ crops: 0, total_quantity: 0, harvests: 0, pending_orders: 0, revenue: 0 }); }
}));

router.get('/listings', requireAuth, asyncHandler(async (req, res) => {
    if (!(await dbAvailable())) return res.json([]);
    try {
        const profile = await pool.query('SELECT id FROM growers.profiles WHERE user_id = $1', [req.user.id]);
        if (!profile.rows.length) return res.json([]);
        const r = await pool.query('SELECT * FROM growers.listings WHERE grower_id = $1 ORDER BY created_at DESC', [profile.rows[0].id]);
        res.json(r.rows);
    } catch { res.json([]); }
}));

router.post('/listings', requireAuth, asyncHandler(async (req, res) => {
    if (!(await dbAvailable())) return res.status(503).json({ error: 'Database unavailable' });
    const profile = await pool.query('SELECT id FROM growers.profiles WHERE user_id = $1', [req.user.id]);
    if (!profile.rows.length) return res.status(400).json({ error: 'Create a grower profile first' });
    const { flower_name, variety, description, price_per_unit, unit_type, min_quantity, available_qty, quality_grade, harvest_date, image_url } = req.body;
    if (!flower_name || !price_per_unit) return res.status(400).json({ error: 'Flower name and price are required' });
    const r = await pool.query(
        `INSERT INTO growers.listings (grower_id, flower_name, variety, description, price_per_unit, unit_type, min_quantity, available_qty, quality_grade, harvest_date, image_url)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11) RETURNING *`,
        [profile.rows[0].id, flower_name, variety || null, description || null, price_per_unit, unit_type || 'stem', min_quantity || 100, available_qty || 0, quality_grade || null, harvest_date || null, image_url || null]
    );
    res.status(201).json(r.rows[0]);
}));

router.delete('/listings/:id', requireAuth, asyncHandler(async (req, res) => {
    if (!(await dbAvailable())) return res.status(503).json({ error: 'Database unavailable' });
    const r = await pool.query('DELETE FROM growers.listings WHERE id = $1 RETURNING id', [req.params.id]);
    if (!r.rows.length) return res.status(404).json({ error: 'Listing not found' });
    res.json({ message: 'Listing deleted' });
}));

module.exports = router;
