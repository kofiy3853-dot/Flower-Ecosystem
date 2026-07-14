const router = require('express').Router();
const { pool, asyncHandler, dbAvailable, requireRole } = require('./middleware');

// All routes require SUPERADMIN role
const requireSuperAdmin = requireRole('SUPERADMIN');

// ─── Overview ───────────────────────────────────────────
router.get('/overview', requireSuperAdmin, asyncHandler(async (req, res) => {
    if (!(await dbAvailable())) {
        return res.json({
            users: 0, products: 0, courses: 0, orders: 0,
            revenue: 0, sellers: 0, communityPosts: 0, events: 0
        });
    }

    const { from, to } = req.query;
    const dateFilter = from && to ? 'AND created_at BETWEEN $1 AND $2' : '';
    const dateArgs = from && to ? [from, to + ' 23:59:59'] : [];
    const monthlyFilter = from && to ? 'AND created_at BETWEEN $1 AND $2' : 'AND created_at >= NOW() - INTERVAL \'6 months\'';
    const monthlyArgs = from && to ? [from, to + ' 23:59:59'] : [];

    const baseUserFilter = dateFilter || ' AND created_at IS NOT NULL';
    const baseOrderFilter = dateFilter || ' AND created_at IS NOT NULL';

    const [users, products, courses, orders, sellers, posts, events, discussions] = await Promise.all([
        pool.query(`SELECT COUNT(*) AS count FROM auth.users WHERE 1=1 ${baseUserFilter}`, dateArgs),
        pool.query('SELECT COUNT(*) AS count FROM marketplace.products'),
        pool.query('SELECT COUNT(*) AS count FROM learning.courses').catch(() => ({ rows: [{ count: 0 }] })),
        pool.query(`SELECT COUNT(*) AS count, COALESCE(SUM(total_amount),0) AS revenue FROM marketplace.orders WHERE 1=1 ${baseOrderFilter}`, dateArgs),
        pool.query("SELECT COUNT(*) AS count FROM auth.users WHERE role IN ('SELLER','FLORIST','GROWER')"),
        pool.query('SELECT COUNT(*) AS count FROM community.posts').catch(() => ({ rows: [{ count: 0 }] })),
        pool.query('SELECT COUNT(*) AS count FROM events.events').catch(() => ({ rows: [{ count: 0 }] })),
        pool.query('SELECT COUNT(*) AS count FROM community.discussions').catch(() => ({ rows: [{ count: 0 }] }))
    ]);

    const roles = await pool.query(`
        SELECT role, COUNT(*)::int AS count FROM auth.users GROUP BY role ORDER BY count DESC
    `).catch(() => ({ rows: [] }));

    const monthlyUsers = await pool.query(`
        SELECT to_char(created_at, 'Mon') AS month, COUNT(*)::int AS count
        FROM auth.users
        WHERE 1=1 ${monthlyFilter}
        GROUP BY to_char(created_at, 'Mon'), DATE_TRUNC('month', created_at)
        ORDER BY DATE_TRUNC('month', created_at)
    `, monthlyArgs).catch(() => ({ rows: [] }));

    const monthlyRevenue = await pool.query(`
        SELECT to_char(created_at, 'Mon') AS month, COALESCE(SUM(total_amount), 0)::int AS total
        FROM marketplace.orders
        WHERE 1=1 ${monthlyFilter}
        GROUP BY to_char(created_at, 'Mon'), DATE_TRUNC('month', created_at)
        ORDER BY DATE_TRUNC('month', created_at)
    `, monthlyArgs).catch(() => ({ rows: [] }));

    res.json({
        users: parseInt(users.rows[0].count),
        products: parseInt(products.rows[0].count),
        courses: parseInt(courses.rows[0].count),
        orders: parseInt(orders.rows[0].count),
        revenue: parseFloat(orders.rows[0].revenue),
        sellers: parseInt(sellers.rows[0].count),
        communityPosts: parseInt(posts.rows[0].count),
        events: parseInt(events.rows[0].count),
        discussions: parseInt(discussions.rows[0].count),
        roleBreakdown: roles.rows,
        monthlyUsers: monthlyUsers.rows,
        monthlyRevenue: monthlyRevenue.rows
    });
}));

// ─── System Health ──────────────────────────────────────
router.get('/system-health', requireSuperAdmin, asyncHandler(async (_, res) => {
    const checks = { database: 'ok', server: 'ok' };

    // Database check
    try {
        const start = Date.now();
        await pool.query('SELECT 1');
        checks.databaseLatency = Date.now() - start;
    } catch {
        checks.database = 'error';
    }

    // Connection pool stats
    checks.poolTotal = pool.totalCount;
    checks.poolIdle = pool.idleCount;
    checks.poolWaiting = pool.waitingCount;

    // DB size
    try {
        const size = await pool.query("SELECT pg_size_pretty(pg_database_size(current_database())) AS size");
        checks.dbSize = size.rows[0].size;
    } catch {}

    // Table counts
    try {
        const tables = await pool.query(`
            SELECT schemaname, relname, n_live_tup AS row_count
            FROM pg_stat_user_tables
            WHERE schemaname IN ('auth','marketplace','learning','community','events','admin')
            ORDER BY n_live_tup DESC
            LIMIT 20
        `);
        checks.tableStats = tables.rows;
    } catch {}

    // Recent errors (last hour)
    try {
        const errors = await pool.query(`
            SELECT COUNT(*) AS count FROM admin.audit_log
            WHERE created_at > NOW() - INTERVAL '1 hour'
            AND action LIKE '%error%' OR action LIKE '%fail%'
        `).catch(() => ({ rows: [{ count: 0 }] }));
        checks.recentErrors = parseInt(errors.rows[0].count);
    } catch {
        checks.recentErrors = 0;
    }

    res.json(checks);
}));

// ─── Pending Approvals ──────────────────────────────────
router.get('/pending-approvals', requireSuperAdmin, asyncHandler(async (_, res) => {
    if (!(await dbAvailable())) return res.json({ instructors: 0, sellers: 0, products: 0, courses: 0 });

    const [instructors, sellers, products, courses] = await Promise.all([
        pool.query("SELECT COUNT(*) AS count FROM auth.users WHERE role = 'INSTRUCTOR' AND is_verified = false").catch(() => ({ rows: [{ count: 0 }] })),
        pool.query("SELECT COUNT(*) AS count FROM auth.users WHERE role IN ('SELLER','FLORIST','GROWER') AND is_verified = false").catch(() => ({ rows: [{ count: 0 }] })),
        pool.query('SELECT COUNT(*) AS count FROM marketplace.products WHERE is_active = false').catch(() => ({ rows: [{ count: 0 }] })),
        pool.query('SELECT COUNT(*) AS count FROM learning.courses WHERE is_published = false').catch(() => ({ rows: [{ count: 0 }] }))
    ]);

    res.json({
        instructors: parseInt(instructors.rows[0].count),
        sellers: parseInt(sellers.rows[0].count),
        products: parseInt(products.rows[0].count),
        courses: parseInt(courses.rows[0].count)
    });
}));

// ─── Audit Log ──────────────────────────────────────────
router.get('/audit-log', requireSuperAdmin, asyncHandler(async (req, res) => {
    if (!(await dbAvailable())) return res.json([]);
    const limit = Math.min(parseInt(req.query.limit) || 50, 200);
    const offset = parseInt(req.query.offset) || 0;

    const r = await pool.query(`
        SELECT a.*, u.first_name || ' ' || u.last_name AS admin_name, u.email AS admin_email
        FROM admin.audit_log a
        LEFT JOIN auth.users u ON u.id = a.user_id
        ORDER BY a.created_at DESC
        LIMIT $1 OFFSET $2
    `, [limit, offset]);

    const total = await pool.query('SELECT COUNT(*) AS count FROM admin.audit_log');

    res.json({
        entries: r.rows,
        total: parseInt(total.rows[0].count),
        limit,
        offset
    });
}));

// ─── Revenue Breakdown ──────────────────────────────────
router.get('/revenue-breakdown', requireSuperAdmin, asyncHandler(async (req, res) => {
    if (!(await dbAvailable())) return res.json({ byCategory: [], bySeller: [], byMonth: [] });

    const { from, to } = req.query;
    const dateFilter = from && to ? 'AND o.created_at BETWEEN $1 AND $2' : '';
    const dateArgs = from && to ? [from, to + ' 23:59:59'] : [];

    const byCategory = await pool.query(`
        SELECT COALESCE(p.category, 'Uncategorized') AS category, SUM(oi.unit_price * oi.quantity)::int AS revenue, COUNT(DISTINCT o.id) AS orders
        FROM marketplace.order_items oi
        JOIN marketplace.orders o ON o.id = oi.order_id
        LEFT JOIN marketplace.products p ON p.id = oi.product_id
        WHERE o.status != 'CANCELLED' ${dateFilter}
        GROUP BY p.category ORDER BY revenue DESC LIMIT 10
    `, dateArgs).catch(() => ({ rows: [] }));

    const bySeller = await pool.query(`
        SELECT u.first_name || ' ' || u.last_name AS seller, SUM(oi.unit_price * oi.quantity)::int AS revenue, COUNT(DISTINCT o.id) AS orders
        FROM marketplace.order_items oi
        JOIN marketplace.orders o ON o.id = oi.order_id
        JOIN auth.users u ON u.id = oi.seller_id
        WHERE o.status != 'CANCELLED' ${dateFilter}
        GROUP BY u.id, u.first_name, u.last_name ORDER BY revenue DESC LIMIT 10
    `, dateArgs).catch(() => ({ rows: [] }));

    const byMonth = await pool.query(`
        SELECT to_char(o.created_at, 'Mon YYYY') AS month, SUM(o.total_amount)::int AS revenue
        FROM marketplace.orders o
        WHERE o.status != 'CANCELLED' ${dateFilter}
        GROUP BY to_char(o.created_at, 'Mon YYYY'), DATE_TRUNC('month', o.created_at)
        ORDER BY DATE_TRUNC('month', o.created_at)
    `, dateArgs).catch(() => ({ rows: [] }));

    res.json({ byCategory: byCategory.rows, bySeller: bySeller.rows, byMonth: byMonth.rows });
}));

// ─── Platform Stats (for CSV export) ────────────────────
router.get('/export/:type', requireSuperAdmin, asyncHandler(async (req, res) => {
    if (!(await dbAvailable())) return res.json([]);
    const { type } = req.params;

    if (type === 'users') {
        const r = await pool.query('SELECT id, first_name, last_name, email, role, is_active, created_at FROM auth.users ORDER BY created_at DESC');
        return res.json(r.rows);
    }
    if (type === 'orders') {
        const r = await pool.query(`
            SELECT o.id, u.first_name || ' ' || u.last_name AS customer, u.email, o.total_amount, o.status, o.created_at
            FROM marketplace.orders o JOIN auth.users u ON u.id = o.user_id ORDER BY o.created_at DESC
        `);
        return res.json(r.rows);
    }
    if (type === 'sellers') {
        const r = await pool.query(`
            SELECT u.id, u.first_name || ' ' || u.last_name AS name, u.email, u.role, u.is_active, u.created_at,
                COALESCE(pc.product_count, 0) AS product_count, COALESCE(oc.order_count, 0) AS order_count, COALESCE(oc.revenue, 0) AS revenue
            FROM auth.users u
            LEFT JOIN (SELECT seller_id, COUNT(*) AS product_count FROM marketplace.products GROUP BY seller_id) pc ON pc.seller_id = u.id
            LEFT JOIN (SELECT seller_id, COUNT(DISTINCT order_id) AS order_count, SUM(unit_price * quantity) AS revenue FROM marketplace.order_items GROUP BY seller_id) oc ON oc.seller_id = u.id
            WHERE u.role IN ('SELLER','FLORIST','GROWER') ORDER BY u.created_at DESC
        `);
        return res.json(r.rows);
    }
    res.status(400).json({ error: 'Invalid export type' });
}));

module.exports = router;
