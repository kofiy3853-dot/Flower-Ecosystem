const router = require('express').Router();
const { pool, asyncHandler, dbAvailable, requireAuth } = require('./middleware');

router.get('/profile', requireAuth, asyncHandler(async (req, res) => {
    if (!(await dbAvailable())) return res.status(503).json({ error: 'Database unavailable' });
    try {
        const user = await pool.query('SELECT first_name, last_name, email FROM auth.users WHERE id = $1', [req.user.id]);
        const u = user.rows[0] || {};
        return res.json({ shop_name: `${u.first_name || ''} ${u.last_name || ''}`.trim() + "'s Shop", user_id: req.user.id, email: u.email });
    } catch { return res.json({ shop_name: 'My Shop', user_id: req.user.id }); }
}));

router.put('/profile', requireAuth, asyncHandler(async (req, res) => {
    const { shop_name, description, location, phone } = req.body;
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
    res.json([]);
}));

router.put('/orders/:id', requireAuth, asyncHandler(async (req, res) => {
    res.status(404).json({ error: 'Not implemented' });
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
        const [products, avgRating] = await Promise.all([
            pool.query('SELECT COUNT(*) FROM marketplace.products WHERE seller_id = $1 AND is_active = true', [req.user.id]),
            pool.query('SELECT COALESCE(AVG(rating), 0)::numeric(2,1) AS avg FROM marketplace.product_reviews WHERE product_id IN (SELECT id FROM marketplace.products WHERE seller_id = $1)', [req.user.id])
        ]);
        res.json({
            products: parseInt(products.rows[0].count) || 0,
            total_orders: 0,
            revenue: 0,
            pending_orders: 0,
            avg_rating: parseFloat(avgRating.rows[0].avg) || 0,
            views: 0
        });
    } catch { res.json({ products: 0, total_orders: 0, revenue: 0, pending_orders: 0, avg_rating: 0, views: 0 }); }
}));

module.exports = router;
