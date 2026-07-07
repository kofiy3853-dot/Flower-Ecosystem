const router = require('express').Router();
const { pool, requireAuth, asyncHandler, dbAvailable, readJSON } = require('./middleware');
const path = require('path');

// ─── Get bouquet styles ───────────────────────────────────────────────
router.get('/bouquet/styles', asyncHandler(async (_, res) => {
    if (await dbAvailable()) {
        try {
            const r = await pool.query('SELECT * FROM marketplace.bouquet_styles WHERE status = $1 ORDER BY sort_order', ['active']);
            if (r.rows.length) return res.json(r.rows);
        } catch {}
    }
    const fallback = readJSON(path.join(__dirname, '..', 'data', 'bouquet-styles.json'));
    res.json(fallback.length ? fallback : [
        { id: '1', name: 'Classic Bouquet', description: 'Traditional round arrangement', base_price: 15.00 },
        { id: '2', name: 'Round Bouquet', description: 'Symmetrical dome-shaped', base_price: 18.00 },
        { id: '3', name: 'Cascade Bouquet', description: 'Waterfall-style flowing', base_price: 25.00 },
        { id: '4', name: 'Hand-Tied Bouquet', description: 'Casual wrapped with visible stems', base_price: 12.00 },
        { id: '5', name: 'Rustic Bouquet', description: 'Natural garden-inspired', base_price: 16.00 },
        { id: '6', name: 'Luxury Bouquet', description: 'Premium with exotic flowers', base_price: 35.00 }
    ]);
}));

// ─── Get wrappings ────────────────────────────────────────────────────
router.get('/bouquet/wrappings', asyncHandler(async (_, res) => {
    if (await dbAvailable()) {
        try {
            const r = await pool.query('SELECT * FROM marketplace.bouquet_wrappings WHERE status = $1 ORDER BY sort_order', ['active']);
            if (r.rows.length) return res.json(r.rows);
        } catch {}
    }
    res.json([
        { id: '1', name: 'White Paper', price: 2.00 },
        { id: '2', name: 'Kraft Paper', price: 2.50 },
        { id: '3', name: 'Luxury Black Wrap', price: 4.00 },
        { id: '4', name: 'Transparent Wrap', price: 1.50 },
        { id: '5', name: 'Floral Print Wrap', price: 3.00 },
        { id: '6', name: 'Satin Wrap', price: 3.50 }
    ]);
}));

// ─── Get ribbons ──────────────────────────────────────────────────────
router.get('/bouquet/ribbons', asyncHandler(async (_, res) => {
    if (await dbAvailable()) {
        try {
            const r = await pool.query('SELECT * FROM marketplace.bouquet_ribbons WHERE status = $1 ORDER BY sort_order', ['active']);
            if (r.rows.length) return res.json(r.rows);
        } catch {}
    }
    res.json([
        { id: '1', name: 'Satin Ribbon', colors: ['White', 'Red', 'Gold', 'Silver', 'Pink', 'Black'], price: 1.50 },
        { id: '2', name: 'Silk Ribbon', colors: ['White', 'Pink', 'Gold', 'Ivory'], price: 2.50 },
        { id: '3', name: 'Burlap Ribbon', colors: ['Natural', 'White'], price: 1.00 },
        { id: '4', name: 'Lace Ribbon', colors: ['White', 'Ivory', 'Pink'], price: 3.00 }
    ]);
}));

// ─── Get extras ───────────────────────────────────────────────────────
router.get('/bouquet/extras', asyncHandler(async (_, res) => {
    if (await dbAvailable()) {
        try {
            const r = await pool.query('SELECT * FROM marketplace.bouquet_extras WHERE status = $1 ORDER BY sort_order', ['active']);
            if (r.rows.length) return res.json(r.rows);
        } catch {}
    }
    res.json([
        { id: '1', name: 'Greeting Card', price: 2.00 },
        { id: '2', name: 'Chocolates', price: 8.00 },
        { id: '3', name: 'Teddy Bear', price: 12.00 },
        { id: '4', name: 'Balloon', price: 5.00 },
        { id: '5', name: 'Vase', price: 15.00 },
        { id: '6', name: 'Gift Box', price: 10.00 }
    ]);
}));

// ─── Get available flowers for bouquet ────────────────────────────────
router.get('/bouquet/flowers', asyncHandler(async (req, res) => {
    const { color, search } = req.query;

    if (await dbAvailable()) {
        try {
            let query = `
                SELECT p.id, p.name, p.price, p.stock_quantity, p.image_url,
                    c.name AS category
                FROM marketplace.products p
                LEFT JOIN marketplace.categories c ON c.id = p.category_id
                WHERE p.is_active = true AND p.stock_quantity > 0`;
            const values = [];
            let idx = 1;

            if (color) { query += ` AND (p.color ILIKE $${idx} OR p.color = 'Mixed')`; values.push(color); idx++; }
            if (search) { query += ` AND p.name ILIKE $${idx}`; values.push(`%${search}%`); idx++; }

            query += ' ORDER BY p.name LIMIT 50';
            const r = await pool.query(query, values);
            if (r.rows.length) return res.json(r.rows);
        } catch {}
    }
    res.json([]);
}));

// ─── Calculate bouquet price ──────────────────────────────────────────
router.post('/bouquet/calculate', asyncHandler(async (req, res) => {
    const { style_id, wrapping_id, ribbon_id, ribbon_color, items, extras } = req.body;

    let subtotal = 0;
    let stylePrice = 0;
    let wrappingPrice = 0;
    let ribbonPrice = 0;
    let extrasTotal = 0;

    // Get style price
    if (style_id && await dbAvailable()) {
        try {
            const r = await pool.query('SELECT base_price FROM marketplace.bouquet_styles WHERE id = $1', [style_id]);
            if (r.rows.length) stylePrice = parseFloat(r.rows[0].base_price) || 0;
        } catch {}
    }

    // Get wrapping price
    if (wrapping_id && await dbAvailable()) {
        try {
            const r = await pool.query('SELECT price FROM marketplace.bouquet_wrappings WHERE id = $1', [wrapping_id]);
            if (r.rows.length) wrappingPrice = parseFloat(r.rows[0].price) || 0;
        } catch {}
    }

    // Get ribbon price
    if (ribbon_id && await dbAvailable()) {
        try {
            const r = await pool.query('SELECT price FROM marketplace.bouquet_ribbons WHERE id = $1', [ribbon_id]);
            if (r.rows.length) ribbonPrice = parseFloat(r.rows[0].price) || 0;
        } catch {}
    }

    // Calculate items total
    if (items && items.length) {
        for (const item of items) {
            subtotal += (parseFloat(item.price_per_unit) || 0) * (item.quantity || 1);
        }
    }

    // Calculate extras total
    if (extras && extras.length) {
        for (const extra of extras) {
            extrasTotal += (parseFloat(extra.price) || 0) * (extra.quantity || 1);
        }
    }

    const deliveryFee = subtotal > 50 ? 0 : 10;
    const total = stylePrice + subtotal + wrappingPrice + ribbonPrice + extrasTotal + deliveryFee;

    res.json({
        style_price: stylePrice,
        flowers_subtotal: subtotal,
        wrapping_price: wrappingPrice,
        ribbon_price: ribbonPrice,
        extras_total: extrasTotal,
        delivery_fee: deliveryFee,
        total: total.toFixed(2)
    });
}));

// ─── Save bouquet design ──────────────────────────────────────────────
router.post('/bouquet/designs', requireAuth, asyncHandler(async (req, res) => {
    if (!(await dbAvailable())) return res.status(503).json({ error: 'Database unavailable' });

    const { occasion, style_id, wrapping_id, ribbon_id, ribbon_color, items, extras, total_price } = req.body;

    const client = await pool.connect();
    try {
        await client.query('BEGIN');

        const design = await client.query(
            `INSERT INTO marketplace.bouquet_designs (user_id, occasion, style_id, wrapping_id, ribbon_id, ribbon_color, total_price, status)
             VALUES ($1, $2, $3, $4, $5, $6, $7, 'draft') RETURNING *`,
            [req.user.id, occasion, style_id || null, wrapping_id || null, ribbon_id || null, ribbon_color || null, total_price || 0]
        );

        const designId = design.rows[0].id;

        // Add items
        if (items && items.length) {
            for (const item of items) {
                await client.query(
                    `INSERT INTO marketplace.bouquet_design_items (design_id, item_type, item_id, item_name, quantity, price_per_unit, color)
                     VALUES ($1, 'flower', $2, $3, $4, $5, $6)`,
                    [designId, item.id || null, item.name, item.quantity || 1, item.price || 0, item.color || null]
                );
            }
        }

        // Add extras
        if (extras && extras.length) {
            for (const extra of extras) {
                await client.query(
                    `INSERT INTO marketplace.bouquet_design_items (design_id, item_type, item_id, item_name, quantity, price_per_unit)
                     VALUES ($1, 'extra', $2, $3, $4, $5)`,
                    [designId, extra.id || null, extra.name, extra.quantity || 1, extra.price || 0]
                );
            }
        }

        await client.query('COMMIT');
        res.status(201).json(design.rows[0]);
    } catch (err) {
        await client.query('ROLLBACK');
        throw err;
    } finally {
        client.release();
    }
}));

// ─── Get user's bouquet designs ───────────────────────────────────────
router.get('/bouquet/designs', requireAuth, asyncHandler(async (req, res) => {
    if (!(await dbAvailable())) return res.json([]);

    try {
        const r = await pool.query(`
            SELECT bd.*, bs.name AS style_name, bw.name AS wrapping_name, br.name AS ribbon_name
            FROM marketplace.bouquet_designs bd
            LEFT JOIN marketplace.bouquet_styles bs ON bs.id = bd.style_id
            LEFT JOIN marketplace.bouquet_wrappings bw ON bw.id = bd.wrapping_id
            LEFT JOIN marketplace.bouquet_ribbons br ON br.id = bd.ribbon_id
            WHERE bd.user_id = $1
            ORDER BY bd.created_at DESC`, [req.user.id]);
        res.json(r.rows);
    } catch { res.json([]); }
}));

module.exports = router;
