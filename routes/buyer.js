const router = require('express').Router();
const { pool, asyncHandler, dbAvailable, requireAuth } = require('./middleware');

router.get('/profile', requireAuth, asyncHandler(async (req, res) => {
    if (!(await dbAvailable())) return res.status(503).json({ error: 'Database unavailable' });
    try {
        const r = await pool.query('SELECT * FROM buyers.profiles WHERE user_id = $1', [req.user.id]);
        if (r.rows.length) return res.json(r.rows[0]);
        const user = await pool.query('SELECT first_name, last_name, email FROM auth.users WHERE id = $1', [req.user.id]);
        const u = user.rows[0] || {};
        return res.json({ business_name: `${u.first_name || ''} ${u.last_name || ''}`.trim() + "'s Business", user_id: req.user.id });
    } catch { return res.json({ business_name: 'My Business', user_id: req.user.id }); }
}));

router.put('/profile', requireAuth, asyncHandler(async (req, res) => {
    if (!(await dbAvailable())) return res.status(503).json({ error: 'Database unavailable' });
    const { business_name, business_type, description, location, phone, preferred_flowers, budget_range, delivery_address } = req.body;
    try {
        const existing = await pool.query('SELECT id FROM buyers.profiles WHERE user_id = $1', [req.user.id]);
        if (existing.rows.length) {
            const r = await pool.query(
                `UPDATE buyers.profiles SET business_name = COALESCE($1, business_name), business_type = COALESCE($2, business_type),
                    description = COALESCE($3, description), location = COALESCE($4, location), phone = COALESCE($5, phone),
                    preferred_flowers = COALESCE($6, preferred_flowers), budget_range = COALESCE($7, budget_range),
                    delivery_address = COALESCE($8, delivery_address), updated_at = CURRENT_TIMESTAMP
                 WHERE user_id = $9 RETURNING *`,
                [business_name, business_type, description, location, phone, preferred_flowers, budget_range, delivery_address, req.user.id]
            );
            return res.json(r.rows[0]);
        }
        const r = await pool.query(
            'INSERT INTO buyers.profiles (user_id, business_name, business_type, description, location, phone) VALUES ($1, $2, $3, $4, $5, $6) RETURNING *',
            [req.user.id, business_name || 'My Business', business_type || null, description || null, location || null, phone || null]
        );
        res.status(201).json(r.rows[0]);
    } catch { res.json({ business_name: business_name || 'My Business', user_id: req.user.id }); }
}));

router.get('/purchases', requireAuth, asyncHandler(async (req, res) => {
    if (!(await dbAvailable())) return res.json([]);
    try {
        const r = await pool.query('SELECT * FROM buyers.purchase_history WHERE user_id = $1 ORDER BY purchase_date DESC LIMIT 50', [req.user.id]);
        res.json(r.rows);
    } catch { res.json([]); }
}));

router.post('/purchases', requireAuth, asyncHandler(async (req, res) => {
    if (!(await dbAvailable())) return res.status(503).json({ error: 'Database unavailable' });
    const { seller_name, flower_name, quantity, unit_price, total_price, rating, review } = req.body;
    if (!flower_name) return res.status(400).json({ error: 'Flower name is required' });
    const r = await pool.query(
        `INSERT INTO buyers.purchase_history (user_id, seller_name, flower_name, quantity, unit_price, total_price, rating, review)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING *`,
        [req.user.id, seller_name || null, flower_name, quantity || 0, unit_price || 0, total_price || 0, rating || null, review || null]
    );
    res.status(201).json(r.rows[0]);
}));

router.get('/watchlist', requireAuth, asyncHandler(async (req, res) => {
    if (!(await dbAvailable())) return res.json([]);
    try {
        const r = await pool.query('SELECT * FROM buyers.watchlist WHERE user_id = $1 AND is_active = true ORDER BY created_at DESC', [req.user.id]);
        res.json(r.rows);
    } catch { res.json([]); }
}));

router.post('/watchlist', requireAuth, asyncHandler(async (req, res) => {
    if (!(await dbAvailable())) return res.status(503).json({ error: 'Database unavailable' });
    const { flower_name, target_price, max_quantity, notes } = req.body;
    if (!flower_name) return res.status(400).json({ error: 'Flower name is required' });
    const r = await pool.query(
        'INSERT INTO buyers.watchlist (user_id, flower_name, target_price, max_quantity, notes) VALUES ($1, $2, $3, $4, $5) RETURNING *',
        [req.user.id, flower_name, target_price || null, max_quantity || null, notes || null]
    );
    res.status(201).json(r.rows[0]);
}));

router.delete('/watchlist/:id', requireAuth, asyncHandler(async (req, res) => {
    if (!(await dbAvailable())) return res.status(503).json({ error: 'Database unavailable' });
    const r = await pool.query('DELETE FROM buyers.watchlist WHERE id = $1 AND user_id = $2 RETURNING id', [req.params.id, req.user.id]);
    if (!r.rows.length) return res.status(404).json({ error: 'Not found' });
    res.json({ message: 'Removed from watchlist' });
}));

router.get('/saved-sellers', requireAuth, asyncHandler(async (req, res) => {
    if (!(await dbAvailable())) return res.json([]);
    try {
        const r = await pool.query('SELECT * FROM buyers.saved_sellers WHERE user_id = $1 ORDER BY created_at DESC', [req.user.id]);
        res.json(r.rows);
    } catch { res.json([]); }
}));

router.post('/saved-sellers', requireAuth, asyncHandler(async (req, res) => {
    if (!(await dbAvailable())) return res.status(503).json({ error: 'Database unavailable' });
    const { seller_id, seller_name, notes } = req.body;
    if (!seller_name) return res.status(400).json({ error: 'Seller name is required' });
    try {
        const r = await pool.query(
            'INSERT INTO buyers.saved_sellers (user_id, seller_id, seller_name, notes) VALUES ($1, $2, $3, $4) RETURNING *',
            [req.user.id, seller_id || null, seller_name, notes || null]
        );
        res.status(201).json(r.rows[0]);
    } catch (err) {
        if (err.code === '23505') return res.status(409).json({ error: 'Already saved' });
        throw err;
    }
}));

router.delete('/saved-sellers/:id', requireAuth, asyncHandler(async (req, res) => {
    if (!(await dbAvailable())) return res.status(503).json({ error: 'Database unavailable' });
    const r = await pool.query('DELETE FROM buyers.saved_sellers WHERE id = $1 AND user_id = $2 RETURNING id', [req.params.id, req.user.id]);
    if (!r.rows.length) return res.status(404).json({ error: 'Not found' });
    res.json({ message: 'Seller removed' });
}));

router.get('/deliveries', requireAuth, asyncHandler(async (req, res) => {
    if (!(await dbAvailable())) return res.json([]);
    try {
        const r = await pool.query('SELECT * FROM buyers.delivery_schedule WHERE user_id = $1 ORDER BY delivery_date ASC', [req.user.id]);
        res.json(r.rows);
    } catch { res.json([]); }
}));

router.get('/analytics', requireAuth, asyncHandler(async (req, res) => {
    if (!(await dbAvailable())) return res.json({ total_purchases: 0, total_spent: 0, saved_sellers: 0, watchlist_items: 0, avg_rating: 0 });
    try {
        const [purchases, spent, sellers, watchlist, rating] = await Promise.all([
            pool.query('SELECT COUNT(*) FROM buyers.purchase_history WHERE user_id = $1', [req.user.id]),
            pool.query('SELECT COALESCE(SUM(total_price), 0) AS total FROM buyers.purchase_history WHERE user_id = $1', [req.user.id]),
            pool.query('SELECT COUNT(*) FROM buyers.saved_sellers WHERE user_id = $1', [req.user.id]),
            pool.query('SELECT COUNT(*) FROM buyers.watchlist WHERE user_id = $1 AND is_active = true', [req.user.id]),
            pool.query('SELECT COALESCE(AVG(rating), 0) AS avg FROM buyers.purchase_history WHERE user_id = $1 AND rating IS NOT NULL', [req.user.id])
        ]);
        res.json({
            total_purchases: parseInt(purchases.rows[0].count) || 0,
            total_spent: parseFloat(spent.rows[0].total) || 0,
            saved_sellers: parseInt(sellers.rows[0].count) || 0,
            watchlist_items: parseInt(watchlist.rows[0].count) || 0,
            avg_rating: parseFloat(rating.rows[0].avg) || 0
        });
    } catch { res.json({ total_purchases: 0, total_spent: 0, saved_sellers: 0, watchlist_items: 0, avg_rating: 0 }); }
}));

module.exports = router;
