const router = require('express').Router();
const { pool, rateLimiter, asyncHandler, requireAuth } = require('./middleware');

router.post('/', requireAuth, rateLimiter(10, 60000), asyncHandler(async (req, res) => {
    const { coupon_id, discount_amount } = req.body || {};
    const cart = await pool.query(
        'SELECT id FROM marketplace.carts WHERE user_id = $1',
        [req.user.id]
    );
    if (!cart.rows.length) return res.status(400).json({ error: 'Cart is empty' });

    const items = await pool.query(
        `SELECT ci.product_id, ci.quantity, p.price, p.seller_id
         FROM marketplace.cart_items ci
         JOIN marketplace.products p ON p.id = ci.product_id
         WHERE ci.cart_id = $1`,
        [cart.rows[0].id]
    );
    if (!items.rows.length) return res.status(400).json({ error: 'Cart is empty' });

    const total = items.rows.reduce((sum, item) => sum + (parseFloat(item.price) * item.quantity), 0);
    const finalTotal = Math.max(0, total - (parseFloat(discount_amount) || 0));

    const client = await pool.connect();
    try {
        await client.query('BEGIN');

        for (const item of items.rows) {
            const stock = await client.query(
                'SELECT stock_quantity FROM marketplace.products WHERE id = $1 FOR UPDATE',
                [item.product_id]
            );
            if (!stock.rows.length || stock.rows[0].stock_quantity < item.quantity) {
                await client.query('ROLLBACK');
                return res.status(400).json({ error: 'Insufficient stock for product' });
            }
        }
        const order = await client.query(
            `INSERT INTO marketplace.orders (user_id, total_amount)
             VALUES ($1, $2) RETURNING *`,
            [req.user.id, finalTotal]
        );
        for (const item of items.rows) {
            await client.query(
                `INSERT INTO marketplace.order_items (order_id, product_id, seller_id, quantity, unit_price)
                 VALUES ($1, $2, $3, $4, $5)`,
                [order.rows[0].id, item.product_id, item.seller_id, item.quantity, item.price]
            );
        }
        await client.query(
            'DELETE FROM marketplace.cart_items WHERE cart_id = $1',
            [cart.rows[0].id]
        );
        for (const item of items.rows) {
            await client.query(
                'UPDATE marketplace.products SET stock_quantity = stock_quantity - $1 WHERE id = $2',
                [item.quantity, item.product_id]
            );
        }
        await client.query('COMMIT');

        if (coupon_id) {
            pool.query('UPDATE marketplace.coupons SET current_uses = current_uses + 1 WHERE id = $1 AND (max_uses = 0 OR current_uses < max_uses)', [coupon_id])
                .catch(err => console.error('Failed to increment coupon usage:', err.message));
        }

        res.status(201).json(order.rows[0]);
    } catch (err) {
        await client.query('ROLLBACK');
        throw err;
    } finally {
        client.release();
    }
}));

router.get('/', requireAuth, asyncHandler(async (req, res) => {
    try {
        const r = await pool.query(
            `SELECT o.*, COALESCE(json_agg(json_build_object(
                'id', oi.id, 'product_id', oi.product_id, 'quantity', oi.quantity, 'unit_price', oi.unit_price,
                'name', p.name, 'image_url', (SELECT image_url FROM marketplace.product_images WHERE product_id = p.id ORDER BY sort_order LIMIT 1)
            )) FILTER (WHERE oi.id IS NOT NULL), '[]') AS items
             FROM marketplace.orders o
             LEFT JOIN marketplace.order_items oi ON oi.order_id = o.id
             LEFT JOIN marketplace.products p ON p.id = oi.product_id
             WHERE o.user_id = $1
             GROUP BY o.id
             ORDER BY o.created_at DESC`,
            [req.user.id]
        );
        res.json(r.rows);
    } catch {
        res.json([]);
    }
}));

router.get('/:id', requireAuth, asyncHandler(async (req, res) => {
    try {
        const r = await pool.query(
            `SELECT o.*, COALESCE(json_agg(json_build_object(
                'id', oi.id, 'product_id', oi.product_id, 'quantity', oi.quantity, 'unit_price', oi.unit_price,
                'name', p.name, 'image_url', (SELECT image_url FROM marketplace.product_images WHERE product_id = p.id ORDER BY sort_order LIMIT 1)
            )) FILTER (WHERE oi.id IS NOT NULL), '[]') AS items
             FROM marketplace.orders o
             LEFT JOIN marketplace.order_items oi ON oi.order_id = o.id
             LEFT JOIN marketplace.products p ON p.id = oi.product_id
             WHERE o.id = $1 AND o.user_id = $2
             GROUP BY o.id`,
            [req.params.id, req.user.id]
        );
        if (!r.rows.length) return res.status(404).json({ error: 'Order not found' });
        res.json(r.rows[0]);
    } catch {
        res.status(404).json({ error: 'Order not found' });
    }
}));

router.put('/:id/status', requireAuth, asyncHandler(async (req, res) => {
    const { id } = req.params;
    const { status } = req.body;
    if (!status) return res.status(400).json({ error: 'Status is required' });
    const validStatuses = ['PENDING', 'CONFIRMED', 'PROCESSING', 'SHIPPED', 'DELIVERED', 'CANCELLED'];
    if (!validStatuses.includes(status.toUpperCase())) {
        return res.status(400).json({ error: `Invalid status. Must be one of: ${validStatuses.join(', ')}` });
    }
    const order = await pool.query('SELECT * FROM marketplace.orders WHERE id = $1', [id]);
    if (!order.rows.length) return res.status(404).json({ error: 'Order not found' });
    const hasItem = await pool.query(
        'SELECT id FROM marketplace.order_items WHERE order_id = $1 AND seller_id = $2',
        [id, req.user.id]
    );
    if (req.user.role !== 'ADMIN' && !hasItem.rows.length) {
        return res.status(403).json({ error: 'Not authorized to update this order' });
    }
    const r = await pool.query(
        'UPDATE marketplace.orders SET status = $1 WHERE id = $2 RETURNING *',
        [status, id]
    );
    res.json(r.rows[0]);
}));

module.exports = router;
