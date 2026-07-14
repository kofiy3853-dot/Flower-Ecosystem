const router = require('express').Router();
const path = require('path');
const { pool, asyncHandler, dbAvailable, readJSON, requireRole } = require('./middleware');

router.get('/users', requireRole('ADMIN', 'SUPERADMIN'), asyncHandler(async (_, res) => {
    if (!(await dbAvailable())) {
        return res.json([{ id: 1, first_name: 'Admin', email: 'admin@example.com', role: 'ADMIN', is_active: true }]);
    }
    const r = await pool.query('SELECT id, first_name, last_name, email, role, is_active, created_at, location, description, profile_image FROM auth.users ORDER BY created_at DESC');
    res.json(r.rows);
}));

router.get('/users/:id', requireRole('ADMIN', 'SUPERADMIN'), asyncHandler(async (req, res) => {
    if (!(await dbAvailable())) return res.status(503).json({ error: 'Database unavailable' });
    const r = await pool.query('SELECT id, first_name, last_name, email, role, is_active, created_at, location, description, profile_image FROM auth.users WHERE id = $1', [req.params.id]);
    if (!r.rows.length) return res.status(404).json({ error: 'User not found' });
    res.json(r.rows[0]);
}));

router.put('/users/:id/role', requireRole('ADMIN', 'SUPERADMIN'), asyncHandler(async (req, res) => {
    const { id } = req.params;
    const { role } = req.body;
    if (!role) return res.status(400).json({ error: 'Role is required' });
    const validRoles = ['ADMIN', 'CUSTOMER', 'SELLER', 'FLORIST', 'GROWER', 'INSTRUCTOR', 'MODERATOR', 'SUPERADMIN'];
    if (!validRoles.includes(role.toUpperCase())) return res.status(400).json({ error: `Invalid role. Must be one of: ${validRoles.join(', ')}` });
    const existing = await pool.query('SELECT role FROM auth.users WHERE id = $1', [id]);
    if (!existing.rows.length) return res.status(404).json({ error: 'User not found' });
    const oldRole = existing.rows[0].role;
    const r = await pool.query('UPDATE auth.users SET role = $1 WHERE id = $2 RETURNING id, first_name, last_name, email, role', [role.toUpperCase(), id]);
    try {
        await pool.query(
            `INSERT INTO admin.audit_log (user_id, action, entity_type, entity_id, details)
             VALUES ($1, 'role_change', 'user', $2, $3)`,
            [req.user.id, id, JSON.stringify({ old_role: oldRole, new_role: role.toUpperCase() })]
        );
    } catch {}
    res.json(r.rows[0]);
}));

router.put('/users/:id/status', requireRole('ADMIN', 'SUPERADMIN'), asyncHandler(async (req, res) => {
    const { id } = req.params;
    const user = await pool.query('SELECT is_active FROM auth.users WHERE id = $1', [id]);
    if (!user.rows.length) return res.status(404).json({ error: 'User not found' });
    const r = await pool.query('UPDATE auth.users SET is_active = NOT is_active WHERE id = $1 RETURNING id, first_name, last_name, email, is_active', [id]);
    res.json(r.rows[0]);
}));

router.put('/users/:id', requireRole('ADMIN', 'SUPERADMIN'), asyncHandler(async (req, res) => {
    if (!(await dbAvailable())) return res.status(503).json({ error: 'Database unavailable' });
    const { name, email, role, location, description } = req.body;
    const validRoles = ['ADMIN', 'CUSTOMER', 'SELLER', 'FLORIST', 'GROWER', 'INSTRUCTOR', 'MODERATOR', 'SUPERADMIN'];
    if (role && !validRoles.includes(role.toUpperCase())) return res.status(400).json({ error: `Invalid role. Must be one of: ${validRoles.join(', ')}` });
    const existing = await pool.query('SELECT id FROM auth.users WHERE id = $1', [req.params.id]);
    if (!existing.rows.length) return res.status(404).json({ error: 'User not found' });
    const r = await pool.query(
        `UPDATE auth.users SET first_name=$1, email=$2, role=$3, location=$4, description=$5, updated_at=CURRENT_TIMESTAMP
         WHERE id=$6 RETURNING id, first_name, last_name, email, role, is_active, location, description, profile_image`,
        [name, email, role?.toUpperCase(), location || null, description || null, req.params.id]
    );
    res.json(r.rows[0]);
}));

router.post('/users/bulk-delete', requireRole('ADMIN', 'SUPERADMIN'), asyncHandler(async (req, res) => {
    if (!(await dbAvailable())) return res.status(503).json({ error: 'Database unavailable' });
    const { ids } = req.body;
    if (!Array.isArray(ids) || !ids.length) return res.status(400).json({ error: 'No user IDs provided' });
    const filtered = ids.filter(id => id !== req.user.id);
    if (!filtered.length) return res.status(400).json({ error: 'Cannot delete your own account' });
    await pool.query('DELETE FROM auth.users WHERE id = ANY($1)', [filtered]);
    res.json({ deleted: filtered.length });
}));

router.delete('/users/:id', requireRole('ADMIN', 'SUPERADMIN'), asyncHandler(async (req, res) => {
    if (!(await dbAvailable())) return res.status(503).json({ error: 'Database unavailable' });
    if (req.user.id === req.params.id) return res.status(400).json({ error: 'Cannot delete your own account' });
    const existing = await pool.query('SELECT id FROM auth.users WHERE id = $1', [req.params.id]);
    if (!existing.rows.length) return res.status(404).json({ error: 'User not found' });
    await pool.query('DELETE FROM auth.users WHERE id=$1', [req.params.id]);
    res.json({ success: true });
}));

// ─── Admin: Get User Activity ────────────────────────────
router.get('/users/:id/activity', requireRole('ADMIN', 'SUPERADMIN'), asyncHandler(async (req, res) => {
    if (!(await dbAvailable())) return res.status(503).json({ error: 'Database unavailable' });
    const { id } = req.params;

    const user = await pool.query('SELECT id, first_name, last_name, email, role, created_at FROM auth.users WHERE id = $1', [id]);
    if (!user.rows.length) return res.status(404).json({ error: 'User not found' });

    const [enrollments, orders, posts, discussions, certificates] = await Promise.all([
        pool.query(`SELECT e.*, c.title AS course_title FROM learning.enrollments e
            LEFT JOIN learning.courses c ON c.id = e.course_id WHERE e.user_id = $1 ORDER BY e.enrolled_at DESC LIMIT 10`, [id]).catch(() => ({ rows: [] })),
        pool.query(`SELECT * FROM marketplace.orders WHERE buyer_id = $1 ORDER BY created_at DESC LIMIT 10`, [id]).catch(() => ({ rows: [] })),
        pool.query(`SELECT * FROM community.posts WHERE user_id = $1 ORDER BY created_at DESC LIMIT 10`, [id]).catch(() => ({ rows: [] })),
        pool.query(`SELECT * FROM community.discussions WHERE user_id = $1 ORDER BY created_at DESC LIMIT 10`, [id]).catch(() => ({ rows: [] })),
        pool.query(`SELECT * FROM learning.certificates WHERE user_id = $1 ORDER BY issued_at DESC`, [id]).catch(() => ({ rows: [] }))
    ]);

    res.json({
        user: user.rows[0],
        enrollments: enrollments.rows,
        orders: orders.rows,
        posts: posts.rows,
        discussions: discussions.rows,
        certificates: certificates.rows
    });
}));

router.put('/products/:id/approve', requireRole('ADMIN', 'SUPERADMIN'), asyncHandler(async (req, res) => {
    if (!(await dbAvailable())) return res.status(503).json({ error: 'Database unavailable' });
    const { id } = req.params;
    const { is_active } = req.body;
    const r = await pool.query('UPDATE marketplace.products SET is_active = $1 WHERE id = $2 RETURNING *', [is_active, id]);
    if (!r.rows.length) return res.status(404).json({ error: 'Product not found' });
    res.json(r.rows[0]);
}));

router.post('/audit', requireRole('ADMIN', 'SUPERADMIN'), asyncHandler(async (req, res) => {
    const { action, target_type, target_id, details } = req.body;
    if (!action) return res.status(400).json({ error: 'Action is required' });
    const r = await pool.query(
        `INSERT INTO admin.audit_log (user_id, action, entity_type, entity_id, details)
         VALUES ($1, $2, $3, $4, $5) RETURNING *`,
        [req.user.id, action, target_type || null, target_id || null, details ? JSON.stringify(details) : null]
    );
    res.status(201).json(r.rows[0]);
}));

router.get('/orders', requireRole('ADMIN', 'SUPERADMIN'), asyncHandler(async (req, res) => {
    if (!(await dbAvailable())) return res.json([]);
    const r = await pool.query(
        `SELECT o.id, o.total_amount, o.status, o.created_at,
                u.first_name || ' ' || u.last_name AS customer, u.email
         FROM marketplace.orders o JOIN auth.users u ON u.id = o.user_id
         ORDER BY o.created_at DESC`
    );
    res.json(r.rows);
}));

router.put('/orders/:id/status', requireRole('ADMIN', 'SUPERADMIN'), asyncHandler(async (req, res) => {
    const { id } = req.params;
    const { status } = req.body;
    const valid = ['PENDING', 'CONFIRMED', 'PROCESSING', 'SHIPPED', 'DELIVERED', 'CANCELLED'];
    if (!valid.includes((status || '').toUpperCase())) return res.status(400).json({ error: 'Invalid status' });
    const r = await pool.query('UPDATE marketplace.orders SET status = $1 WHERE id = $2 RETURNING *', [status.toUpperCase(), id]);
    if (!r.rows.length) return res.status(404).json({ error: 'Order not found' });
    res.json(r.rows[0]);
}));

router.delete('/orders/:id', requireRole('ADMIN', 'SUPERADMIN'), asyncHandler(async (req, res) => {
    if (!(await dbAvailable())) return res.status(503).json({ error: 'Database unavailable' });
    const { id } = req.params;
    const existing = await pool.query('SELECT id, status FROM marketplace.orders WHERE id = $1', [id]);
    if (!existing.rows.length) return res.status(404).json({ error: 'Order not found' });
    await pool.query('DELETE FROM marketplace.order_items WHERE order_id = $1', [id]).catch(() => {});
    await pool.query('DELETE FROM marketplace.orders WHERE id = $1', [id]);
    res.json({ message: 'Order deleted' });
}));

router.get('/sellers', requireRole('ADMIN', 'SUPERADMIN'), asyncHandler(async (req, res) => {
    if (!(await dbAvailable())) {
        const fallback = readJSON(path.join(__dirname, '..', 'data', 'admin.json'));
        return res.json(fallback.sellerVerifications || []);
    }
    const r = await pool.query(`
        SELECT u.id, u.first_name || ' ' || u.last_name AS name, u.email, u.role, u.is_active, u.created_at,
               COALESCE(pc.product_count, 0) AS product_count,
               COALESCE(oc.order_count, 0) AS order_count,
               COALESCE(oc.total_revenue, 0) AS revenue
        FROM auth.users u
        LEFT JOIN (
            SELECT seller_id, COUNT(*) AS product_count
            FROM marketplace.products
            GROUP BY seller_id
        ) pc ON pc.seller_id = u.id
        LEFT JOIN (
            SELECT seller_id, COUNT(DISTINCT order_id) AS order_count, SUM(unit_price * quantity) AS total_revenue
            FROM marketplace.order_items
            GROUP BY seller_id
        ) oc ON oc.seller_id = u.id
        WHERE u.role IN ('SELLER','FLORIST','GROWER')
        ORDER BY u.created_at DESC
    `);
    res.json(r.rows);
}));

router.get('/buyers', requireRole('ADMIN', 'SUPERADMIN'), asyncHandler(async (req, res) => {
    if (!(await dbAvailable())) return res.json([]);
    const r = await pool.query(`
        SELECT u.id, u.first_name || ' ' || u.last_name AS name, u.email, u.role, u.is_active, u.created_at,
               COALESCE(oc.order_count, 0) AS order_count,
               COALESCE(oc.total_spent, 0) AS total_spent
        FROM auth.users u
        LEFT JOIN (
            SELECT o.user_id, COUNT(DISTINCT o.id) AS order_count, SUM(o.total_amount) AS total_spent
            FROM marketplace.orders o
            GROUP BY o.user_id
        ) oc ON oc.user_id = u.id
        WHERE u.role IN ('CUSTOMER')
        ORDER BY u.created_at DESC
    `);
    res.json(r.rows);
}));

router.get('/announcements', requireRole('ADMIN', 'SUPERADMIN'), asyncHandler(async (req, res) => {
    const fallback = readJSON(path.join(__dirname, '..', 'data', 'admin.json'));
    res.json(fallback.announcements || []);
}));

router.post('/announcements', requireRole('ADMIN', 'SUPERADMIN'), asyncHandler(async (req, res) => {
    const { title, content } = req.body;
    if (!title || !content) return res.status(400).json({ error: 'Title and content are required' });
    res.status(201).json({ id: Date.now(), title, content, active: true, date: new Date().toLocaleDateString() });
}));

router.get('/analytics', requireRole('ADMIN', 'SUPERADMIN'), asyncHandler(async (req, res) => {
    if (!(await dbAvailable())) return res.json({ users: 0, products: 0, orders: 0, revenue: 0 });
    const [users, products, orders] = await Promise.all([
        pool.query('SELECT COUNT(*) FROM auth.users'),
        pool.query('SELECT COUNT(*) FROM marketplace.products WHERE is_active = true'),
        pool.query('SELECT COUNT(*), COALESCE(SUM(total_amount),0) AS revenue FROM marketplace.orders')
    ]);
    res.json({
        users: parseInt(users.rows[0].count),
        products: parseInt(products.rows[0].count),
        orders: parseInt(orders.rows[0].count),
        revenue: parseFloat(orders.rows[0].revenue)
    });
}));

module.exports = router;
