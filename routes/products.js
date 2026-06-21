const router = require('express').Router();
const path = require('path');
const { pool, asyncHandler, escapeHtml, dbAvailable, readJSON, queryWithFallback, requireAuth, requireSeller, requireAdmin } = require('./middleware');

router.get('/', asyncHandler(async (req, res) => {
    const { search, category, min_price, max_price, color, occasion, flower_cond, sort, page = 1, limit = 20, featured, best_seller, new_arrival } = req.query;

    return queryWithFallback(
        async () => {
            const conditions = ['p.is_active = true'];
            const values = [];
            let idx = 1;

            if (search) { conditions.push(`(p.name ILIKE $${idx} OR p.description ILIKE $${idx})`); values.push(`%${search}%`); idx++; }
            if (category) { conditions.push(`c.name ILIKE $${idx}`); values.push(category); idx++; }
            if (min_price) { conditions.push(`p.price >= $${idx}`); values.push(Number(min_price)); idx++; }
            if (max_price) { conditions.push(`p.price <= $${idx}`); values.push(Number(max_price)); idx++; }
            if (color) { conditions.push(`p.color ILIKE $${idx}`); values.push(`%${color}%`); idx++; }
            if (occasion) { conditions.push(`p.occasion ILIKE $${idx}`); values.push(`%${occasion}%`); idx++; }
            if (flower_cond) { conditions.push(`p.flower_cond = $${idx}`); values.push(flower_cond.toUpperCase()); idx++; }
            if (featured === 'true') { conditions.push('p.is_featured = true'); }
            if (best_seller === 'true') { conditions.push('p.is_best_seller = true'); }
            if (new_arrival === 'true') { conditions.push('p.is_new_arrival = true'); }

            const sortMap = { price_asc: 'p.price ASC', price_desc: 'p.price DESC', rating: 'p.avg_rating DESC', newest: 'p.created_at DESC', name: 'p.name ASC' };
            const orderBy = sortMap[sort] || 'p.created_at DESC';

            const pg = Math.max(1, parseInt(page, 10) || 1);
            const lim = Math.min(100, Math.max(1, parseInt(limit, 10) || 20));
            const offset = (pg - 1) * lim;

            const where = conditions.length ? 'WHERE ' + conditions.join(' AND ') : '';

            const countQ = `SELECT COUNT(*) FROM marketplace.products p JOIN marketplace.categories c ON c.id = p.category_id ${where}`;
            const countR = await pool.query(countQ, values);
            const total = parseInt(countR.rows[0].count, 10);

            values.push(lim);
            values.push(offset);
            const dataQ = `
                SELECT p.*, c.name AS category_name, c.id AS category_id,
                    (SELECT image_url FROM marketplace.product_images WHERE product_id = p.id ORDER BY sort_order LIMIT 1) AS image,
                    COALESCE(json_agg(pi.image_url) FILTER (WHERE pi.image_url IS NOT NULL), '[]') AS images
                FROM marketplace.products p
                JOIN marketplace.categories c ON c.id = p.category_id
                LEFT JOIN marketplace.product_images pi ON pi.product_id = p.id
                ${where}
                GROUP BY p.id, c.name, c.id
                ORDER BY ${orderBy}
                LIMIT $${idx} OFFSET $${idx + 1}`;
            const dataR = await pool.query(dataQ, values);

            return { products: dataR.rows, total, page: pg, limit: lim, pages: Math.ceil(total / lim) };
        },
        'products', res, false,
        (data) => {
            let filtered = data;

            if (search) {
                const q = search.toLowerCase();
                filtered = filtered.filter(p => (p.name || '').toLowerCase().includes(q) || (p.description || '').toLowerCase().includes(q));
            }
            if (category) {
                const cat = category.toLowerCase();
                filtered = filtered.filter(p => (p.category || '').toLowerCase() === cat);
            }
            if (min_price) filtered = filtered.filter(p => p.price >= Number(min_price));
            if (max_price) filtered = filtered.filter(p => p.price <= Number(max_price));
            if (color) {
                const c = color.toLowerCase();
                filtered = filtered.filter(p => (p.color || '').toLowerCase().includes(c));
            }
            if (occasion) {
                const o = occasion.toLowerCase();
                filtered = filtered.filter(p => (p.occasion || '').toLowerCase().includes(o));
            }
            if (featured === 'true') filtered = filtered.filter(p => p.featured);
            if (best_seller === 'true') filtered = filtered.filter(p => p.bestSeller);
            if (new_arrival === 'true') filtered = filtered.filter(p => p.newArrival);

            const sortFn = {
                price_asc: (a, b) => a.price - b.price,
                price_desc: (a, b) => b.price - a.price,
                rating: (a, b) => (b.rating || 0) - (a.rating || 0),
                newest: (a, b) => (b.id || '').localeCompare(a.id || ''),
                name: (a, b) => (a.name || '').localeCompare(b.name || ''),
            };
            if (sort && sortFn[sort]) filtered.sort(sortFn[sort]);

            const pg = Math.max(1, parseInt(page, 10) || 1);
            const lim = Math.min(100, Math.max(1, parseInt(limit, 10) || 20));
            const total = filtered.length;
            const start = (pg - 1) * lim;
            const products = filtered.slice(start, start + lim);

            return { products, total, page: pg, limit: lim, pages: Math.ceil(total / lim) };
        }
    );
}));

router.get('/:id', asyncHandler(async (req, res) => {
    return queryWithFallback(
        async () => {
            const r = await pool.query(
                `SELECT p.*, c.name AS category_name,
                        (SELECT image_url FROM marketplace.product_images WHERE product_id = p.id ORDER BY sort_order LIMIT 1) AS image,
                        COALESCE(json_agg(pi.image_url) FILTER (WHERE pi.image_url IS NOT NULL), '[]') AS images,
                        COALESCE(json_agg(json_build_object('rating', pr.rating, 'review', pr.review, 'user_id', pr.user_id)) FILTER (WHERE pr.id IS NOT NULL), '[]') AS reviews
                 FROM marketplace.products p
                 JOIN marketplace.categories c ON c.id = p.category_id
                 LEFT JOIN marketplace.product_images pi ON pi.product_id = p.id
                 LEFT JOIN marketplace.product_reviews pr ON pr.product_id = p.id
                 WHERE p.id = $1
                 GROUP BY p.id, c.name`,
                [req.params.id]
            );
            if (!r.rows.length) {
                const products = readJSON(path.join(__dirname, '..', 'data', 'products.json'));
                const found = products.find(p => p.id === req.params.id);
                if (!found) return { _notFound: true };
                return found;
            }
            return r.rows[0];
        },
        'products', res, true
    );
}));

router.post('/', requireSeller, asyncHandler(async (req, res) => {
    const { name, description, price, stock_quantity, category_id, flower_cond, images } = req.body;
    if (!name || !price) {
        return res.status(400).json({ error: 'Name and price are required' });
    }
    if (typeof name !== 'string' || name.trim().length === 0 || name.length > 255) {
        return res.status(400).json({ error: 'Name must be a non-empty string under 255 characters' });
    }
    if (typeof price !== 'number' || price < 0) {
        return res.status(400).json({ error: 'Price must be a non-negative number' });
    }
    if (stock_quantity !== undefined && (typeof stock_quantity !== 'number' || stock_quantity < 0)) {
        return res.status(400).json({ error: 'Stock quantity must be a non-negative number' });
    }
    const validConds = ['NATURAL', 'ARTIFICIAL', 'PRESERVED', 'DRIED'];
    if (flower_cond && !validConds.includes(flower_cond.toUpperCase())) {
        return res.status(400).json({ error: `Invalid flower condition. Must be one of: ${validConds.join(', ')}` });
    }
    const product = await pool.query(
        `INSERT INTO marketplace.products (seller_id, name, description, price, stock_quantity, category_id, flower_cond)
         VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *`,
        [req.user.id, escapeHtml(name).slice(0, 255), escapeHtml(description || '').slice(0, 2000), price, stock_quantity || 0, category_id, flower_cond || null]
    );
    if (images && Array.isArray(images) && images.length > 0) {
        for (const url of images) {
            await pool.query(
                'INSERT INTO marketplace.product_images (product_id, image_url) VALUES ($1, $2)',
                [product.rows[0].id, url]
            );
        }
    }
    res.status(201).json(product.rows[0]);
}));

router.put('/:id', requireSeller, asyncHandler(async (req, res) => {
    const { id } = req.params;
    let existing;
    try {
        existing = await pool.query('SELECT * FROM marketplace.products WHERE id = $1', [id]);
    } catch {
        return res.status(404).json({ error: 'Product not found' });
    }
    if (!existing.rows.length) return res.status(404).json({ error: 'Product not found' });
    if (existing.rows[0].seller_id !== req.user.id && req.user.role !== 'ADMIN') {
        return res.status(403).json({ error: 'Not authorized to update this product' });
    }
    const { name, description, price, stock_quantity, category_id, flower_cond } = req.body;
    if (name !== undefined && (typeof name !== 'string' || name.trim().length === 0 || name.length > 255)) {
        return res.status(400).json({ error: 'Name must be a non-empty string under 255 characters' });
    }
    const r = await pool.query(
        `UPDATE marketplace.products
         SET name = COALESCE($1, name), description = COALESCE($2, description), price = COALESCE($3, price),
             stock_quantity = COALESCE($4, stock_quantity), category_id = COALESCE($5, category_id),
             flower_cond = COALESCE($6, flower_cond)
         WHERE id = $7 RETURNING *`,
        [name ? escapeHtml(name).slice(0, 255) : null, description ? escapeHtml(description).slice(0, 2000) : null, price, stock_quantity, category_id, flower_cond, id]
    );
    res.json(r.rows[0]);
}));

router.delete('/:id', requireSeller, asyncHandler(async (req, res) => {
    const { id } = req.params;
    let existing;
    try {
        existing = await pool.query('SELECT * FROM marketplace.products WHERE id = $1', [id]);
    } catch {
        return res.status(404).json({ error: 'Product not found' });
    }
    if (!existing.rows.length) return res.status(404).json({ error: 'Product not found' });
    if (existing.rows[0].seller_id !== req.user.id && req.user.role !== 'ADMIN') {
        return res.status(403).json({ error: 'Not authorized to delete this product' });
    }
    await pool.query('UPDATE marketplace.products SET is_active = false WHERE id = $1', [id]);
    res.json({ message: 'Product deleted' });
}));

router.post('/:id/reviews', requireAuth, asyncHandler(async (req, res) => {
    const { id } = req.params;
    const { rating, review } = req.body;
    if (!rating || rating < 1 || rating > 5) {
        return res.status(400).json({ error: 'Rating must be between 1 and 5' });
    }
    let product;
    try {
        product = await pool.query('SELECT id FROM marketplace.products WHERE id = $1 AND is_active = true', [id]);
    } catch {
        return res.status(404).json({ error: 'Product not found' });
    }
    if (!product.rows.length) return res.status(404).json({ error: 'Product not found' });
    try {
        const r = await pool.query(
            `INSERT INTO marketplace.product_reviews (product_id, user_id, rating, review)
             VALUES ($1, $2, $3, $4) RETURNING *`,
            [id, req.user.id, rating, review || '']
        );
        res.status(201).json(r.rows[0]);
    } catch (dbErr) {
        if (dbErr.code === '23505') {
            return res.status(409).json({ error: 'You have already reviewed this product' });
        }
        throw dbErr;
    }
}));

// Categories
router.get('/list/categories', asyncHandler(async (_, res) => {
    return queryWithFallback(
        async () => {
            const r = await pool.query('SELECT * FROM marketplace.categories ORDER BY name');
            if (r.rows.length === 0) throw new Error("Empty categories table");
            return r.rows;
        },
        'categories', res
    );
}));

// Florists
router.get('/list/florists', asyncHandler(async (_, res) => {
    return queryWithFallback(
        async () => {
            const r = await pool.query(
                `SELECT id, first_name AS name, profile_image AS image, role
                 FROM auth.users WHERE role IN ('SELLER', 'FLORIST') ORDER BY first_name`
            );
            return r.rows;
        },
        'florists', res
    );
}));

// Coupons
router.post('/coupons/validate', asyncHandler(async (req, res) => {
    if (!(await dbAvailable())) {
        return res.status(503).json({ error: 'Database unavailable' });
    }
    const { code, cart_total } = req.body;
    if (!code || typeof code !== 'string') return res.status(400).json({ error: 'Coupon code is required' });
    const r = await pool.query(
        'SELECT * FROM marketplace.coupons WHERE code = $1 AND is_active = true AND (expires_at IS NULL OR expires_at > CURRENT_TIMESTAMP) AND (max_uses = 0 OR current_uses < max_uses)',
        [code.toUpperCase()]
    );
    if (!r.rows.length) return res.status(404).json({ error: 'Invalid or expired coupon code' });
    const coupon = r.rows[0];
    if (cart_total !== undefined && cart_total < Number(coupon.min_order_amount)) {
        return res.status(400).json({ error: `Minimum order amount of $${Number(coupon.min_order_amount).toFixed(2)} required for this coupon` });
    }
    let discount = 0;
    if (coupon.discount_type === 'percentage') {
        discount = (Number(cart_total || 0) * Number(coupon.discount_value)) / 100;
    } else {
        discount = Number(coupon.discount_value);
    }
    if (discount > Number(cart_total || 0)) discount = Number(cart_total || 0);
    res.json({ valid: true, coupon, discount: Math.round(discount * 100) / 100 });
}));

router.get('/coupons/list', requireAdmin, asyncHandler(async (req, res) => {
    if (!(await dbAvailable())) return res.status(503).json({ error: 'Database unavailable' });
    const r = await pool.query('SELECT * FROM marketplace.coupons ORDER BY created_at DESC');
    res.json(r.rows);
}));

router.post('/coupons', requireAdmin, asyncHandler(async (req, res) => {
    if (!(await dbAvailable())) return res.status(503).json({ error: 'Database unavailable' });
    const { code, discount_type, discount_value, min_order_amount, max_uses, expires_at } = req.body;
    if (!code || !discount_type || !discount_value) return res.status(400).json({ error: 'Code, type, and value are required' });
    if (!['percentage', 'fixed'].includes(discount_type)) return res.status(400).json({ error: 'Discount type must be percentage or fixed' });
    try {
        const r = await pool.query(
            `INSERT INTO marketplace.coupons (code, discount_type, discount_value, min_order_amount, max_uses, expires_at)
             VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
            [code.toUpperCase(), discount_type, discount_value, min_order_amount || 0, max_uses || 0, expires_at || null]
        );
        res.status(201).json(r.rows[0]);
    } catch (err) {
        if (err.code === '23505') return res.status(409).json({ error: 'Coupon code already exists' });
        throw err;
    }
}));

router.put('/coupons/:id', requireAdmin, asyncHandler(async (req, res) => {
    if (!(await dbAvailable())) return res.status(503).json({ error: 'Database unavailable' });
    const { code, discount_type, discount_value, min_order_amount, max_uses, expires_at, is_active } = req.body;
    const r = await pool.query(
        `UPDATE marketplace.coupons SET code=$1, discount_type=$2, discount_value=$3, min_order_amount=$4, max_uses=$5, expires_at=$6, is_active=$7 WHERE id=$8 RETURNING *`,
        [code.toUpperCase(), discount_type, discount_value, min_order_amount || 0, max_uses || 0, expires_at || null, is_active !== false, req.params.id]
    );
    if (!r.rows.length) return res.status(404).json({ error: 'Coupon not found' });
    res.json(r.rows[0]);
}));

router.delete('/coupons/:id', requireAdmin, asyncHandler(async (req, res) => {
    if (!(await dbAvailable())) return res.status(503).json({ error: 'Database unavailable' });
    const r = await pool.query('DELETE FROM marketplace.coupons WHERE id = $1 RETURNING id', [req.params.id]);
    if (!r.rows.length) return res.status(404).json({ error: 'Coupon not found' });
    res.json({ message: 'Coupon deleted' });
}));

router.post('/coupons/:id/use', asyncHandler(async (req, res) => {
    if (!(await dbAvailable())) return res.status(503).json({ error: 'Database unavailable' });
    const r = await pool.query(
        'UPDATE marketplace.coupons SET current_uses = current_uses + 1 WHERE id = $1 AND (max_uses = 0 OR current_uses < max_uses) RETURNING *',
        [req.params.id]
    );
    if (!r.rows.length) return res.status(400).json({ error: 'Coupon usage limit reached' });
    res.json({ message: 'Coupon applied' });
}));

module.exports = router;
