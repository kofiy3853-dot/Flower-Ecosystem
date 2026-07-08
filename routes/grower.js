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
         WHERE id = $12
           AND grower_id = (SELECT id FROM growers.profiles WHERE user_id = $13)
         RETURNING *`,
        [flower_name, variety, quantity, growth_stage, status, field_location, planting_date, expected_harvest, price_per_unit, quality_grade, notes, id, req.user.id]
    );
    if (!r.rows.length) return res.status(404).json({ error: 'Crop not found' });
    res.json(r.rows[0]);
}));

router.delete('/crops/:id', requireAuth, asyncHandler(async (req, res) => {
    if (!(await dbAvailable())) return res.status(503).json({ error: 'Database unavailable' });
    const r = await pool.query(
        `DELETE FROM growers.crops
         WHERE id = $1
           AND grower_id = (SELECT id FROM growers.profiles WHERE user_id = $2)
         RETURNING id`,
        [req.params.id, req.user.id]
    );
    if (!r.rows.length) return res.status(404).json({ error: 'Crop not found' });
    res.json({ message: 'Crop deleted' });
}));

router.post('/crops/:id/health', requireAuth, asyncHandler(async (req, res) => {
    if (!(await dbAvailable())) return res.status(503).json({ error: 'Database unavailable' });
    const own = await pool.query(
        `SELECT 1 FROM growers.crops c
         JOIN growers.profiles p ON p.id = c.grower_id
         WHERE c.id = $1 AND p.user_id = $2`,
        [req.params.id, req.user.id]
    );
    if (!own.rows.length) return res.status(403).json({ error: 'Not authorized' });
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

// =============================================================================
// PUBLIC FARM ROUTES — Flower Farm Marketplace
// =============================================================================

// GET /api/farms — list all farms (public)
router.get('/farms', asyncHandler(async (req, res) => {
    if (!(await dbAvailable())) return res.json([]);
    const { q, location, specialty, organic, tours, workshops, delivery, wholesale, sort = 'rating', page = 1, limit = 20 } = req.query;
    const pg = Math.max(1, parseInt(page, 10) || 1);
    const lim = Math.min(50, Math.max(1, parseInt(limit, 10) || 20));
    const offset = (pg - 1) * lim;

    try {
        const conditions = [];
        const values = [];
        let idx = 1;

        if (q) { conditions.push(`(p.farm_name ILIKE $${idx} OR p.description ILIKE $${idx} OR p.location ILIKE $${idx} OR $${idx} = ANY(p.specialties))`); values.push(`%${q}%`); idx++; }
        if (location) { conditions.push(`p.location ILIKE $${idx}`); values.push(`%${location}%`); idx++; }
        if (specialty) { conditions.push(`$${idx} = ANY(p.specialties)`); values.push(specialty); idx++; }
        if (organic === 'true') { conditions.push(`p.organic_certified = true`); }
        if (tours === 'true') { conditions.push(`p.farm_tours = true`); }
        if (workshops === 'true') { conditions.push(`p.workshops = true`); }
        if (delivery === 'true') { conditions.push(`p.delivery_available = true`); }
        if (wholesale === 'true') { conditions.push(`p.wholesale_available = true`); }

        const where = conditions.length ? 'WHERE ' + conditions.join(' AND ') : '';
        const sortMap = { rating: 'p.rating DESC', name: 'p.farm_name ASC', newest: 'p.created_at DESC', products: 'p.total_sales DESC' };
        const orderBy = sortMap[sort] || 'p.rating DESC';

        const countR = await pool.query(`SELECT COUNT(*) FROM growers.profiles p ${where}`, values);
        const total = parseInt(countR.rows[0].count) || 0;

        values.push(lim, offset);
        const r = await pool.query(`
            SELECT p.*, u.first_name || ' ' || u.last_name AS owner_name,
                   (SELECT COUNT(*) FROM growers.farm_followers WHERE grower_id = p.id) AS follower_count,
                   (SELECT COUNT(*) FROM growers.farm_reviews WHERE grower_id = p.id) AS review_count,
                   (SELECT COALESCE(AVG(rating), 0) FROM growers.farm_reviews WHERE grower_id = p.id) AS avg_rating
            FROM growers.profiles p
            LEFT JOIN auth.users u ON u.id = p.user_id
            ${where}
            ORDER BY ${orderBy}
            LIMIT $${idx} OFFSET $${idx + 1}`, values);

        res.json({ farms: r.rows, total, page: pg, limit: lim, pages: Math.ceil(total / lim) });
    } catch (err) {
        console.error('Farms query error:', err.message);
        res.json({ farms: [], total: 0, page: 1, limit: lim, pages: 0 });
    }
}));

// GET /api/farms/featured — featured farms
router.get('/farms/featured', asyncHandler(async (_, res) => {
    if (!(await dbAvailable())) return res.json([]);
    try {
        const r = await pool.query(`
            SELECT p.*, u.first_name || ' ' || u.last_name AS owner_name,
                   (SELECT COUNT(*) FROM growers.farm_reviews WHERE grower_id = p.id) AS review_count
            FROM growers.profiles p
            LEFT JOIN auth.users u ON u.id = p.user_id
            WHERE p.is_verified = true OR p.rating >= 4.5
            ORDER BY p.rating DESC LIMIT 6`);
        res.json(r.rows);
    } catch { res.json([]); }
}));

// GET /api/farms/recent — recently added farms
router.get('/farms/recent', asyncHandler(async (_, res) => {
    if (!(await dbAvailable())) return res.json([]);
    try {
        const r = await pool.query(`
            SELECT p.*, u.first_name || ' ' || u.last_name AS owner_name
            FROM growers.profiles p
            LEFT JOIN auth.users u ON u.id = p.user_id
            ORDER BY p.created_at DESC LIMIT 6`);
        res.json(r.rows);
    } catch { res.json([]); }
}));

// GET /api/farms/:id — farm detail (public)
router.get('/farms/:id', asyncHandler(async (req, res) => {
    if (!(await dbAvailable())) return res.status(404).json({ error: 'Farm not found' });
    try {
        const r = await pool.query(`
            SELECT p.*, u.first_name || ' ' || u.last_name AS owner_name, u.email AS owner_email,
                   (SELECT COUNT(*) FROM growers.farm_followers WHERE grower_id = p.id) AS follower_count,
                   (SELECT COUNT(*) FROM growers.farm_reviews WHERE grower_id = p.id) AS review_count,
                   (SELECT COALESCE(AVG(rating), 0) FROM growers.farm_reviews WHERE grower_id = p.id) AS avg_rating
            FROM growers.profiles p
            LEFT JOIN auth.users u ON u.id = p.user_id
            WHERE p.id = $1`, [req.params.id]);
        if (!r.rows.length) return res.status(404).json({ error: 'Farm not found' });

        const farm = r.rows[0];

        // Fetch related data in parallel
        const [services, gallery, events, products, reviews] = await Promise.all([
            pool.query('SELECT * FROM growers.farm_services WHERE grower_id = $1 AND is_active = true ORDER BY service_name', [req.params.id]).catch(() => ({ rows: [] })),
            pool.query('SELECT * FROM growers.farm_gallery WHERE grower_id = $1 ORDER BY sort_order', [req.params.id]).catch(() => ({ rows: [] })),
            pool.query('SELECT * FROM growers.farm_events WHERE grower_id = $1 AND is_active = true AND event_date > NOW() ORDER BY event_date LIMIT 10', [req.params.id]).catch(() => ({ rows: [] })),
            pool.query('SELECT * FROM growers.listings WHERE grower_id = $1 AND is_active = true ORDER BY created_at DESC LIMIT 20', [req.params.id]).catch(() => ({ rows: [] })),
            pool.query(`SELECT fr.*, u.first_name || ' ' || u.last_name AS reviewer_name, u.profile_image AS reviewer_avatar
                FROM growers.farm_reviews fr
                LEFT JOIN auth.users u ON u.id = fr.user_id
                WHERE fr.grower_id = $1 ORDER BY fr.created_at DESC LIMIT 20`, [req.params.id]).catch(() => ({ rows: [] }))
        ]);

        farm.services = services.rows;
        farm.gallery = gallery.rows;
        farm.events = events.rows;
        farm.products = products.rows;
        farm.reviews = reviews.rows;

        res.json(farm);
    } catch (err) {
        console.error('Farm detail error:', err.message);
        res.status(404).json({ error: 'Farm not found' });
    }
}));

// POST /api/farms/:id/follow — follow/unfollow farm
router.post('/farms/:id/follow', requireAuth, asyncHandler(async (req, res) => {
    if (!(await dbAvailable())) return res.status(503).json({ error: 'Database unavailable' });
    const existing = await pool.query('SELECT id FROM growers.farm_followers WHERE grower_id = $1 AND user_id = $2', [req.params.id, req.user.id]);
    if (existing.rows.length) {
        await pool.query('DELETE FROM growers.farm_followers WHERE grower_id = $1 AND user_id = $2', [req.params.id, req.user.id]);
        await pool.query('UPDATE growers.profiles SET follower_count = GREATEST(follower_count - 1, 0) WHERE id = $1', [req.params.id]);
        res.json({ following: false });
    } else {
        await pool.query('INSERT INTO growers.farm_followers (grower_id, user_id) VALUES ($1, $2)', [req.params.id, req.user.id]);
        await pool.query('UPDATE growers.profiles SET follower_count = follower_count + 1 WHERE id = $1', [req.params.id]);
        res.json({ following: true });
    }
}));

// GET /api/farms/:id/reviews — get reviews
router.get('/farms/:id/reviews', asyncHandler(async (req, res) => {
    if (!(await dbAvailable())) return res.json([]);
    const { page = 1, limit = 20 } = req.query;
    const pg = Math.max(1, parseInt(page, 10) || 1);
    const lim = Math.min(50, parseInt(limit, 10) || 20);
    const offset = (pg - 1) * lim;

    const r = await pool.query(`
        SELECT fr.*, u.first_name || ' ' || u.last_name AS reviewer_name, u.profile_image AS reviewer_avatar
        FROM growers.farm_reviews fr
        LEFT JOIN auth.users u ON u.id = fr.user_id
        WHERE fr.grower_id = $1
        ORDER BY fr.created_at DESC
        LIMIT $2 OFFSET $3`, [req.params.id, lim, offset]);
    res.json(r.rows);
}));

// POST /api/farms/:id/reviews — add review
router.post('/farms/:id/reviews', requireAuth, asyncHandler(async (req, res) => {
    if (!(await dbAvailable())) return res.status(503).json({ error: 'Database unavailable' });
    const { rating, title, comment, visit_type } = req.body;
    if (!rating || rating < 1 || rating > 5) return res.status(400).json({ error: 'Rating 1-5 required' });

    const r = await pool.query(
        `INSERT INTO growers.farm_reviews (grower_id, user_id, rating, title, comment, visit_type)
         VALUES ($1, $2, $3, $4, $5, $6)
         ON CONFLICT (grower_id, user_id) DO UPDATE SET rating = $3, title = $4, comment = $5, visit_type = $6
         RETURNING *`,
        [req.params.id, req.user.id, rating, title || null, comment || null, visit_type || null]
    );

    // Update farm average rating
    await pool.query(`UPDATE growers.profiles SET rating = (SELECT COALESCE(AVG(rating), 0) FROM growers.farm_reviews WHERE grower_id = $1) WHERE id = $1`, [req.params.id]);

    res.status(201).json(r.rows[0]);
}));

// GET /api/farms/:id/services — get services
router.get('/farms/:id/services', asyncHandler(async (req, res) => {
    if (!(await dbAvailable())) return res.json([]);
    const r = await pool.query('SELECT * FROM growers.farm_services WHERE grower_id = $1 AND is_active = true ORDER BY service_name', [req.params.id]);
    res.json(r.rows);
}));

// GET /api/farms/:id/gallery — get gallery
router.get('/farms/:id/gallery', asyncHandler(async (req, res) => {
    if (!(await dbAvailable())) return res.json([]);
    const r = await pool.query('SELECT * FROM growers.farm_gallery WHERE grower_id = $1 ORDER BY sort_order', [req.params.id]);
    res.json(r.rows);
}));

// GET /api/farms/:id/events — get events
router.get('/farms/:id/events', asyncHandler(async (req, res) => {
    if (!(await dbAvailable())) return res.json([]);
    const r = await pool.query(
        'SELECT * FROM growers.farm_events WHERE grower_id = $1 AND is_active = true AND event_date > NOW() ORDER BY event_date LIMIT 20',
        [req.params.id]
    );
    res.json(r.rows);
}));

// POST /api/farms/:id/events/:eventId/register — register for event
router.post('/farms/:id/events/:eventId/register', requireAuth, asyncHandler(async (req, res) => {
    if (!(await dbAvailable())) return res.status(503).json({ error: 'Database unavailable' });
    const event = await pool.query('SELECT * FROM growers.farm_events WHERE id = $1 AND grower_id = $2', [req.params.eventId, req.params.id]);
    if (!event.rows.length) return res.status(404).json({ error: 'Event not found' });
    const ev = event.rows[0];
    if (ev.capacity && ev.registered >= ev.capacity) return res.status(400).json({ error: 'Event is full' });
    await pool.query('UPDATE growers.farm_events SET registered = registered + 1 WHERE id = $1', [req.params.eventId]);
    res.json({ message: 'Registered successfully' });
}));

module.exports = router;
