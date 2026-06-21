const router = require('express').Router();
const { pool, asyncHandler, dbAvailable, requireAuth } = require('./middleware');

router.get('/profile', requireAuth, asyncHandler(async (req, res) => {
    if (!(await dbAvailable())) return res.status(503).json({ error: 'Database unavailable' });
    try {
        const r = await pool.query('SELECT * FROM sellers.profiles WHERE user_id = $1', [req.user.id]);
        if (r.rows.length) return res.json(r.rows[0]);
        const user = await pool.query('SELECT first_name, last_name, email FROM auth.users WHERE id = $1', [req.user.id]);
        const u = user.rows[0] || {};
        return res.json({ shop_name: `${u.first_name || ''} ${u.last_name || ''}`.trim() + "'s Shop", user_id: req.user.id });
    } catch { return res.json({ shop_name: 'My Shop', user_id: req.user.id }); }
}));

router.put('/profile', requireAuth, asyncHandler(async (req, res) => {
    if (!(await dbAvailable())) return res.status(503).json({ error: 'Database unavailable' });
    const { shop_name, description, location, phone, specialties } = req.body;
    try {
        const existing = await pool.query('SELECT id FROM sellers.profiles WHERE user_id = $1', [req.user.id]);
        if (existing.rows.length) {
            const r = await pool.query(
                `UPDATE sellers.profiles SET shop_name = COALESCE($1, shop_name), description = COALESCE($2, description),
                    location = COALESCE($3, location), phone = COALESCE($4, phone),
                    specialties = COALESCE($5, specialties), updated_at = CURRENT_TIMESTAMP
                 WHERE user_id = $6 RETURNING *`,
                [shop_name, description, location, phone, specialties, req.user.id]
            );
            return res.json(r.rows[0]);
        }
        const r = await pool.query(
            'INSERT INTO sellers.profiles (user_id, shop_name, description, location, phone) VALUES ($1, $2, $3, $4, $5) RETURNING *',
            [req.user.id, shop_name || 'My Shop', description || null, location || null, phone || null]
        );
        res.status(201).json(r.rows[0]);
    } catch { res.json({ shop_name: shop_name || 'My Shop', user_id: req.user.id }); }
}));

router.get('/products', requireAuth, asyncHandler(async (req, res) => {
    if (!(await dbAvailable())) return res.json([]);
    try {
        const profile = await pool.query('SELECT id FROM sellers.profiles WHERE user_id = $1', [req.user.id]);
        if (!profile.rows.length) return res.json([]);
        const r = await pool.query('SELECT * FROM sellers.products WHERE seller_id = $1 ORDER BY created_at DESC', [profile.rows[0].id]);
        res.json(r.rows);
    } catch { res.json([]); }
}));

router.post('/products', requireAuth, asyncHandler(async (req, res) => {
    if (!(await dbAvailable())) return res.status(503).json({ error: 'Database unavailable' });
    const profile = await pool.query('SELECT id FROM sellers.profiles WHERE user_id = $1', [req.user.id]);
    if (!profile.rows.length) return res.status(400).json({ error: 'Create a seller profile first' });
    const { name, description, price, category, stock_quantity, image_url, flower_type, color, occasion } = req.body;
    if (!name || !price) return res.status(400).json({ error: 'Name and price are required' });
    const r = await pool.query(
        `INSERT INTO sellers.products (seller_id, name, description, price, category, stock_quantity, image_url, flower_type, color, occasion)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10) RETURNING *`,
        [profile.rows[0].id, name, description || null, price, category || null, stock_quantity || 0, image_url || null, flower_type || null, color || null, occasion || null]
    );
    res.status(201).json(r.rows[0]);
}));

router.put('/products/:id', requireAuth, asyncHandler(async (req, res) => {
    if (!(await dbAvailable())) return res.status(503).json({ error: 'Database unavailable' });
    const { name, description, price, category, stock_quantity, image_url, flower_type, color, occasion, is_active } = req.body;
    const r = await pool.query(
        `UPDATE sellers.products SET name = COALESCE($1, name), description = COALESCE($2, description),
            price = COALESCE($3, price), category = COALESCE($4, category), stock_quantity = COALESCE($5, stock_quantity),
            image_url = COALESCE($6, image_url), flower_type = COALESCE($7, flower_type), color = COALESCE($8, color),
            occasion = COALESCE($9, occasion), is_active = COALESCE($10, is_active), updated_at = CURRENT_TIMESTAMP
         WHERE id = $11 RETURNING *`,
        [name, description, price, category, stock_quantity, image_url, flower_type, color, occasion, is_active, req.params.id]
    );
    if (!r.rows.length) return res.status(404).json({ error: 'Product not found' });
    res.json(r.rows[0]);
}));

router.delete('/products/:id', requireAuth, asyncHandler(async (req, res) => {
    if (!(await dbAvailable())) return res.status(503).json({ error: 'Database unavailable' });
    const r = await pool.query('DELETE FROM sellers.products WHERE id = $1 RETURNING id', [req.params.id]);
    if (!r.rows.length) return res.status(404).json({ error: 'Product not found' });
    res.json({ message: 'Product deleted' });
}));

router.get('/orders', requireAuth, asyncHandler(async (req, res) => {
    if (!(await dbAvailable())) return res.json([]);
    try {
        const profile = await pool.query('SELECT id FROM sellers.profiles WHERE user_id = $1', [req.user.id]);
        if (!profile.rows.length) return res.json([]);
        const r = await pool.query(`
            SELECT o.*,
                (SELECT json_agg(json_build_object('product_name', oi.product_name, 'quantity', oi.quantity, 'unit_price', oi.unit_price, 'total_price', oi.total_price))
                 FROM sellers.order_items oi WHERE oi.order_id = o.id) AS items
            FROM sellers.orders o WHERE o.seller_id = $1 ORDER BY o.created_at DESC LIMIT 50`, [profile.rows[0].id]);
        res.json(r.rows);
    } catch { res.json([]); }
}));

router.put('/orders/:id', requireAuth, asyncHandler(async (req, res) => {
    if (!(await dbAvailable())) return res.status(503).json({ error: 'Database unavailable' });
    const { status } = req.body;
    const validStatuses = ['pending', 'confirmed', 'processing', 'shipped', 'delivered', 'cancelled'];
    if (!validStatuses.includes(status)) return res.status(400).json({ error: 'Invalid status' });
    const r = await pool.query('UPDATE sellers.orders SET status = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2 RETURNING *', [status, req.params.id]);
    if (!r.rows.length) return res.status(404).json({ error: 'Order not found' });
    res.json(r.rows[0]);
}));

router.get('/reviews', requireAuth, asyncHandler(async (req, res) => {
    if (!(await dbAvailable())) return res.json([]);
    try {
        const profile = await pool.query('SELECT id FROM sellers.profiles WHERE user_id = $1', [req.user.id]);
        if (!profile.rows.length) return res.json([]);
        const r = await pool.query('SELECT * FROM sellers.reviews WHERE seller_id = $1 ORDER BY created_at DESC LIMIT 20', [profile.rows[0].id]);
        res.json(r.rows);
    } catch { res.json([]); }
}));

router.get('/messages', requireAuth, asyncHandler(async (req, res) => {
    if (!(await dbAvailable())) return res.json([]);
    try {
        const profile = await pool.query('SELECT id FROM sellers.profiles WHERE user_id = $1', [req.user.id]);
        if (!profile.rows.length) return res.json([]);
        const r = await pool.query('SELECT * FROM sellers.messages WHERE seller_id = $1 ORDER BY created_at DESC LIMIT 50', [profile.rows[0].id]);
        res.json(r.rows);
    } catch { res.json([]); }
}));

router.get('/analytics', requireAuth, asyncHandler(async (req, res) => {
    if (!(await dbAvailable())) return res.json({ products: 0, total_orders: 0, revenue: 0, pending_orders: 0, avg_rating: 0, views: 0 });
    try {
        const profile = await pool.query('SELECT id FROM sellers.profiles WHERE user_id = $1', [req.user.id]);
        if (!profile.rows.length) return res.json({ products: 0, total_orders: 0, revenue: 0, pending_orders: 0, avg_rating: 0, views: 0 });
        const sid = profile.rows[0].id;
        const [products, orders, revenue, pending, rating, views] = await Promise.all([
            pool.query('SELECT COUNT(*) FROM sellers.products WHERE seller_id = $1 AND is_active = true', [sid]),
            pool.query('SELECT COUNT(*) FROM sellers.orders WHERE seller_id = $1', [sid]),
            pool.query("SELECT COALESCE(SUM(total_amount), 0) AS total FROM sellers.orders WHERE seller_id = $1 AND status = 'delivered'", [sid]),
            pool.query("SELECT COUNT(*) FROM sellers.orders WHERE seller_id = $1 AND status = 'pending'", [sid]),
            pool.query('SELECT COALESCE(AVG(rating), 0) AS avg, COUNT(*) AS count FROM sellers.reviews WHERE seller_id = $1', [sid]),
            pool.query('SELECT COALESCE(SUM(views), 0) AS total FROM sellers.products WHERE seller_id = $1', [sid])
        ]);
        res.json({
            products: parseInt(products.rows[0].count) || 0,
            total_orders: parseInt(orders.rows[0].count) || 0,
            revenue: parseFloat(revenue.rows[0].total) || 0,
            pending_orders: parseInt(pending.rows[0].count) || 0,
            avg_rating: parseFloat(rating.rows[0].avg) || 0,
            review_count: parseInt(rating.rows[0].count) || 0,
            views: parseInt(views.rows[0].total) || 0
        });
    } catch { res.json({ products: 0, total_orders: 0, revenue: 0, pending_orders: 0, avg_rating: 0, views: 0 }); }
}));

module.exports = router;
