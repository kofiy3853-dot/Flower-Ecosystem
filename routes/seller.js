const router = require('express').Router();
const { pool, asyncHandler, dbAvailable, requireAuth } = require('./middleware');

router.get('/profile', requireAuth, asyncHandler(async (req, res) => {
    if (!(await dbAvailable())) return res.status(503).json({ error: 'Database unavailable' });
    try {
        const user = await pool.query('SELECT first_name, last_name, email, profile_image, location, description FROM auth.users WHERE id = $1', [req.user.id]);
        const u = user.rows[0] || {};
        return res.json({ shop_name: `${u.first_name || ''} ${u.last_name || ''}`.trim() + "'s Shop", user_id: req.user.id, email: u.email, profile_image: u.profile_image || null, location: u.location || null, description: u.description || null });
    } catch { return res.json({ shop_name: 'My Shop', user_id: req.user.id }); }
}));

router.put('/profile', requireAuth, asyncHandler(async (req, res) => {
    if (!(await dbAvailable())) return res.status(503).json({ error: 'Database unavailable' });
    const { shop_name, description, location, phone, profile_image } = req.body;
    try {
        await pool.query(
            `UPDATE auth.users SET description = COALESCE($1, description), location = COALESCE($2, location), profile_image = COALESCE($3, profile_image)
             WHERE id = $4`,
            [description || null, location || null, profile_image || null, req.user.id]
        );
    } catch {}
    res.json({ shop_name, description, location, phone, user_id: req.user.id });
}));

router.get('/products', requireAuth, asyncHandler(async (req, res) => {
    if (!(await dbAvailable())) return res.json([]);
    try {
        const r = await pool.query(
            `SELECT p.*, c.name AS category_name FROM marketplace.products p
             LEFT JOIN marketplace.categories c ON c.id = p.category_id
             WHERE p.seller_id = $1 ORDER BY p.created_at DESC`,
            [req.user.id]
        );
        res.json(r.rows);
    } catch { res.json([]); }
}));

router.post('/products', requireAuth, asyncHandler(async (req, res) => {
    res.status(308).json({ error: 'Use POST /api/products instead' });
}));

router.put('/products/:id', requireAuth, asyncHandler(async (req, res) => {
    res.status(308).json({ error: 'Use PUT /api/products/:id instead' });
}));

router.delete('/products/:id', requireAuth, asyncHandler(async (req, res) => {
    const owner = await pool.query('SELECT seller_id FROM marketplace.products WHERE id = $1', [req.params.id]);
    if (!owner.rows.length) return res.status(404).json({ error: 'Product not found' });
    if (owner.rows[0].seller_id !== req.user.id) return res.status(403).json({ error: 'Not authorized' });
    await pool.query('DELETE FROM marketplace.products WHERE id = $1', [req.params.id]);
    res.json({ success: true });
}));

router.get('/orders', requireAuth, asyncHandler(async (req, res) => {
    if (!(await dbAvailable())) return res.json([]);
    try {
        const r = await pool.query(`
            SELECT DISTINCT o.id, o.total_amount, o.status, o.created_at, o.updated_at,
                   u.first_name || ' ' || u.last_name AS buyer_name, u.email AS buyer_email,
                   (SELECT SUM(oi.quantity) FROM marketplace.order_items oi WHERE oi.order_id = o.id AND oi.seller_id = $1) AS item_count,
                   (SELECT SUM(oi.quantity * oi.unit_price) FROM marketplace.order_items oi WHERE oi.order_id = o.id AND oi.seller_id = $1) AS seller_total
            FROM marketplace.orders o
            JOIN marketplace.order_items oi ON oi.order_id = o.id
            JOIN auth.users u ON u.id = o.user_id
            WHERE oi.seller_id = $1
            ORDER BY o.created_at DESC
        `, [req.user.id]);
        res.json(r.rows);
    } catch { res.json([]); }
}));

router.get('/orders/:id', requireAuth, asyncHandler(async (req, res) => {
    if (!(await dbAvailable())) return res.status(404).json({ error: 'Not found' });
    try {
        const orderR = await pool.query(`
            SELECT o.*, u.first_name || ' ' || u.last_name AS buyer_name, u.email AS buyer_email
            FROM marketplace.orders o
            JOIN auth.users u ON u.id = o.user_id
            WHERE o.id = $1
        `, [req.params.id]);
        if (!orderR.rows.length) return res.status(404).json({ error: 'Order not found' });
        const itemsR = await pool.query(`
            SELECT oi.*, p.name AS product_name, p.image_url, p.images
            FROM marketplace.order_items oi
            JOIN marketplace.products p ON p.id = oi.product_id
            WHERE oi.order_id = $1 AND oi.seller_id = $2
        `, [req.params.id, req.user.id]);
        if (!itemsR.rows.length) return res.status(403).json({ error: 'Not authorized' });
        res.json({ ...orderR.rows[0], items: itemsR.rows });
    } catch { res.status(404).json({ error: 'Order not found' }); }
}));

router.put('/orders/:id', requireAuth, asyncHandler(async (req, res) => {
    if (!(await dbAvailable())) return res.status(503).json({ error: 'Database unavailable' });
    const { status } = req.body;
    const validStatuses = ['PENDING', 'CONFIRMED', 'PROCESSING', 'SHIPPED', 'DELIVERED', 'CANCELLED'];
    if (!status || !validStatuses.includes(status.toUpperCase())) {
        return res.status(400).json({ error: `Invalid status. Must be one of: ${validStatuses.join(', ')}` });
    }
    const check = await pool.query(
        'SELECT oi.order_id FROM marketplace.order_items oi WHERE oi.order_id = $1 AND oi.seller_id = $2 LIMIT 1',
        [req.params.id, req.user.id]
    );
    if (!check.rows.length) return res.status(403).json({ error: 'Not authorized' });
    await pool.query('UPDATE marketplace.orders SET status = $1 WHERE id = $2', [status.toUpperCase(), req.params.id]);
    res.json({ success: true, status: status.toUpperCase() });
}));

router.get('/reviews', requireAuth, asyncHandler(async (req, res) => {
    if (!(await dbAvailable())) return res.json([]);
    try {
        const r = await pool.query(`
            SELECT pr.id, pr.rating, pr.review, pr.created_at,
                   u.first_name || ' ' || u.last_name AS reviewer_name,
                   p.name AS product_name
            FROM marketplace.product_reviews pr
            JOIN marketplace.products p ON p.id = pr.product_id
            JOIN auth.users u ON u.id = pr.user_id
            WHERE p.seller_id = $1
            ORDER BY pr.created_at DESC
        `, [req.user.id]);
        res.json(r.rows);
    } catch { res.json([]); }
}));

router.get('/messages', requireAuth, asyncHandler(async (req, res) => {
    res.json([]);
}));

router.get('/analytics', requireAuth, asyncHandler(async (req, res) => {
    if (!(await dbAvailable())) return res.json({ products: 0, total_orders: 0, revenue: 0, pending_orders: 0, avg_rating: 0, views: 0 });
    try {
        const [products, avgRating, orderStats, topProducts, statusBreakdown, recentOrders] = await Promise.all([
            pool.query('SELECT COUNT(*) FROM marketplace.products WHERE seller_id = $1 AND is_active = true', [req.user.id]),
            pool.query('SELECT COALESCE(AVG(rating), 0)::numeric(2,1) AS avg, COUNT(*) AS review_count FROM marketplace.product_reviews WHERE product_id IN (SELECT id FROM marketplace.products WHERE seller_id = $1)', [req.user.id]),
            pool.query(`
                SELECT COUNT(DISTINCT o.id) AS total_orders,
                       COALESCE(SUM(oi.quantity * oi.unit_price), 0) AS revenue,
                       COUNT(DISTINCT CASE WHEN o.status = 'PENDING' THEN o.id END) AS pending_orders,
                       COUNT(DISTINCT CASE WHEN o.status = 'DELIVERED' THEN o.id END) AS delivered_orders,
                       COUNT(DISTINCT CASE WHEN o.status = 'CANCELLED' THEN o.id END) AS cancelled_orders,
                       COALESCE(SUM(oi.quantity), 0) AS total_items_sold
                FROM marketplace.order_items oi
                JOIN marketplace.orders o ON o.id = oi.order_id
                WHERE oi.seller_id = $1
            `, [req.user.id]),
            pool.query(`
                SELECT p.name, p.image_url, p.price, p.currency,
                       SUM(oi.quantity) AS qty_sold, SUM(oi.quantity * oi.unit_price) AS total_revenue,
                       COUNT(DISTINCT oi.order_id) AS order_count
                FROM marketplace.order_items oi
                JOIN marketplace.products p ON p.id = oi.product_id
                WHERE oi.seller_id = $1
                GROUP BY p.id, p.name, p.image_url, p.price, p.currency
                ORDER BY total_revenue DESC LIMIT 5
            `, [req.user.id]),
            pool.query(`
                SELECT o.status, COUNT(DISTINCT o.id) AS count
                FROM marketplace.order_items oi
                JOIN marketplace.orders o ON o.id = oi.order_id
                WHERE oi.seller_id = $1
                GROUP BY o.status
            `, [req.user.id]),
            pool.query(`
                SELECT DATE(o.created_at) AS day, COUNT(DISTINCT o.id) AS orders, COALESCE(SUM(oi.quantity * oi.unit_price), 0) AS revenue
                FROM marketplace.order_items oi
                JOIN marketplace.orders o ON o.id = oi.order_id
                WHERE oi.seller_id = $1 AND o.created_at > NOW() - INTERVAL '30 days'
                GROUP BY DATE(o.created_at) ORDER BY day
            `, [req.user.id])
        ]);
        const stats = orderStats.rows[0] || {};
        const avg = parseFloat(avgRating.rows[0].avg) || 0;
        const totalOrders = parseInt(stats.total_orders) || 0;
        const revenue = parseFloat(stats.revenue) || 0;
        res.json({
            products: parseInt(products.rows[0].count) || 0,
            total_orders: totalOrders,
            revenue,
            pending_orders: parseInt(stats.pending_orders) || 0,
            delivered_orders: parseInt(stats.delivered_orders) || 0,
            cancelled_orders: parseInt(stats.cancelled_orders) || 0,
            total_items_sold: parseInt(stats.total_items_sold) || 0,
            avg_rating: avg,
            review_count: parseInt(avgRating.rows[0].review_count) || 0,
            views: 0,
            top_products: topProducts.rows,
            status_breakdown: statusBreakdown.rows,
            daily_trend: recentOrders.rows,
            avg_order_value: totalOrders > 0 ? revenue / totalOrders : 0,
            conversion_rate: 0
        });
    } catch { res.json({ products: 0, total_orders: 0, revenue: 0, pending_orders: 0, avg_rating: 0, views: 0, top_products: [], status_breakdown: [], daily_trend: [] }); }
}));

module.exports = router;
