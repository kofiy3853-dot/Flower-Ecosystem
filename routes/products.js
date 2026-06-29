const router = require('express').Router();
const path = require('path');
const { pool, asyncHandler, escapeHtml, dbAvailable, readJSON, queryWithFallback, requireAuth, requireSeller, requireAdmin } = require('./middleware');

const condMap = { 'FRESH CUT': 'NATURAL', 'POTTED': 'NATURAL', 'NATURAL': 'NATURAL', 'ARTIFICIAL': 'ARTIFICIAL', 'PRESERVED': 'PRESERVED', 'DRIED': 'DRIED' };

router.get('/', asyncHandler(async (req, res) => {
    const { search, category, min_price, max_price, color, occasion, flower_cond, sort, page = 1, limit = 20, featured, best_seller, new_arrival, seller_id } = req.query;

    return queryWithFallback(
        async () => {
            const conditions = ['p.is_active = true'];
            const values = [];
            let idx = 1;

            if (seller_id) { conditions.push(`p.seller_id = $${idx}`); values.push(seller_id); idx++; }
            if (search) { conditions.push(`(p.name ILIKE $${idx} OR p.description ILIKE $${idx})`); values.push(`%${search.replace(/[%_]/g, '\\$&')}%`); idx++; }
            if (category) { conditions.push(`c.name ILIKE $${idx}`); values.push(category); idx++; }
            if (min_price) { const mp = Number(min_price); if (!isNaN(mp)) { conditions.push(`p.price >= $${idx}`); values.push(mp); idx++; } }
            if (max_price) { const mp = Number(max_price); if (!isNaN(mp)) { conditions.push(`p.price <= $${idx}`); values.push(mp); idx++; } }
            if (color) { conditions.push(`p.color ILIKE $${idx}`); values.push(`%${color.replace(/[%_]/g, '\\$&')}%`); idx++; }
            if (occasion) { conditions.push(`p.occasion ILIKE $${idx}`); values.push(`%${occasion.replace(/[%_]/g, '\\$&')}%`); idx++; }
            if (flower_cond) { conditions.push(`p.flower_cond = $${idx}`); values.push(condMap[flower_cond.toUpperCase()] || flower_cond.toUpperCase()); idx++; }
            if (featured === 'true') { conditions.push('p.featured = true'); }
            if (best_seller === 'true') { conditions.push('p.best_seller = true'); }
            if (new_arrival === 'true') { conditions.push('p.new_arrival = true'); }

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
                SELECT p.id, p.name, p.description, p.price, p.stock_quantity, p.flower_cond,
                    p.is_active, p.badge, p.occasion, p.color, p.fresh, p.featured,
                    p.best_seller AS "bestSeller", p.new_arrival AS "newArrival",
                    p.image_url, p.images, p.video_url, p.harvest_date, p.shelf_life_days, p.created_at, p.updated_at,
                    p.seller_id, p.category_id, p.currency,
                    c.name AS category,
                    c.name AS category_name,
                    u.first_name || ' ' || u.last_name AS seller,
                    COALESCE(AVG(pr.rating)::numeric(2,1), 0) AS rating,
                    COUNT(DISTINCT pr.id)::int AS reviews,
                    (SELECT image_url FROM marketplace.product_images WHERE product_id = p.id ORDER BY sort_order LIMIT 1) AS image,
                    COALESCE(json_agg(DISTINCT pi.image_url) FILTER (WHERE pi.image_url IS NOT NULL), '[]') AS images
                FROM marketplace.products p
                JOIN marketplace.categories c ON c.id = p.category_id
                JOIN auth.users u ON u.id = p.seller_id
                LEFT JOIN marketplace.product_images pi ON pi.product_id = p.id
                LEFT JOIN marketplace.product_reviews pr ON pr.product_id = p.id
                ${where}
                GROUP BY p.id, c.name, c.id, u.first_name, u.last_name
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
                `SELECT p.id, p.name, p.description, p.price, p.stock_quantity, p.flower_cond,
                        p.is_active, p.badge, p.occasion, p.color, p.fresh, p.featured,
                        p.best_seller AS "bestSeller", p.new_arrival AS "newArrival",
                        p.image_url, p.images, p.video_url, p.harvest_date, p.shelf_life_days, p.created_at, p.updated_at,
                    p.seller_id, p.category_id, COALESCE(p.currency, 'GHS') AS currency,
                        c.name AS category,
                        c.name AS category_name,
                        (SELECT image_url FROM marketplace.product_images WHERE product_id = p.id ORDER BY sort_order LIMIT 1) AS image,
                        (SELECT COALESCE(json_agg(image_url ORDER BY sort_order), '[]') FROM marketplace.product_images WHERE product_id = p.id) AS images,
                        (SELECT COALESCE(json_agg(json_build_object('rating', rating, 'text', review, 'author', u2.first_name || ' ' || u2.last_name, 'date', to_char(pr2.created_at, 'Mon DD, YYYY')) ORDER BY pr2.created_at DESC), '[]')
                         FROM marketplace.product_reviews pr2
                         LEFT JOIN auth.users u2 ON u2.id = pr2.user_id
                         WHERE pr2.product_id = p.id) AS reviews
                 FROM marketplace.products p
                 JOIN marketplace.categories c ON c.id = p.category_id
                 WHERE p.id = $1`,
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
    const {
        name, description, price, stock_quantity, category_id, category,
        flower_cond, images, image_url, video_url, harvest_date, shelf_life_days,
        badge, occasion, color, fresh, featured, best_seller, new_arrival,
        currency, unit, flower_type, fragrance, bloom_season, origin, care_level,
        sku, low_stock_alert, delivery_areas, delivery_time, shipping_fee, pickup_available,
        tags, seo_slug, meta_description, status
    } = req.body;
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
    if (flower_cond) {
        const mapped = condMap[flower_cond.toUpperCase()];
        if (!mapped) {
            return res.status(400).json({ error: `Invalid flower condition. Must be one of: Fresh Cut, Potted, Artificial, Preserved, Dried` });
        }
    }

    let resolvedCategoryId = category_id || null;
    if (!resolvedCategoryId && category) {
        try {
            const catR = await pool.query('SELECT id FROM marketplace.categories WHERE name ILIKE $1', [category]);
            if (catR.rows.length) resolvedCategoryId = catR.rows[0].id;
        } catch {}
    }

    const firstImage = image_url || (Array.isArray(images) && images.length > 0 ? images[0] : null);
    const isActive = status === 'published' ? true : (status === 'draft' ? false : true);

    const client = await pool.connect();
    try {
        await client.query('BEGIN');
        const product = await client.query(
            `INSERT INTO marketplace.products
                (seller_id, name, description, price, stock_quantity, category_id, flower_cond,
                 badge, occasion, color, fresh, featured, best_seller, new_arrival, is_active,
                 image_url, video_url, harvest_date, shelf_life_days,
                 currency, unit, flower_type, fragrance, bloom_season, origin, care_level,
                 sku, low_stock_alert, delivery_areas, delivery_time, shipping_fee, pickup_available,
                 tags, seo_slug, meta_description, status)
             VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,$21,$22,$23,$24,$25,$26,$27,$28,$29,$30,$31,$32,$33,$34,$35,$36) RETURNING *`,
            [req.user.id, escapeHtml(name).slice(0, 255), escapeHtml(description || '').slice(0, 2000),
             price, stock_quantity || 0, resolvedCategoryId, flower_cond ? (condMap[flower_cond.toUpperCase()] || flower_cond.toUpperCase()) : null,
             badge || null, occasion || null, color || null, fresh || false,
             featured || false, best_seller || false, true, isActive,
             firstImage, video_url || null, harvest_date || null, shelf_life_days || 7,
             currency || 'GHS', unit || 'Piece', flower_type || null, fragrance || null,
             bloom_season || null, origin || null, care_level || null,
             sku || null, low_stock_alert || 10, delivery_areas || [], delivery_time || null,
             shipping_fee || 0, pickup_available !== false, tags || [], seo_slug || null,
             meta_description || null, status || 'published']
        );
        if (images && Array.isArray(images) && images.length > 0) {
            for (let i = 0; i < images.length; i++) {
                await client.query(
                    'INSERT INTO marketplace.product_images (product_id, image_url, sort_order) VALUES ($1, $2, $3)',
                    [product.rows[0].id, images[i], i]
                );
            }
        }
        await client.query('COMMIT');
        res.status(201).json(product.rows[0]);
    } catch (err) {
        await client.query('ROLLBACK');
        throw err;
    } finally {
        client.release();
    }
}));

router.put('/:id', requireSeller, asyncHandler(async (req, res) => {
    const { id } = req.params;
    let existing;
    try {
        existing = await pool.query('SELECT * FROM marketplace.products WHERE id = $1', [id]);
    } catch {
        return res.status(503).json({ error: 'Database error' });
    }
    if (!existing.rows.length) return res.status(404).json({ error: 'Product not found' });
    if (existing.rows[0].seller_id !== req.user.id && req.user.role !== 'ADMIN') {
        return res.status(403).json({ error: 'Not authorized to update this product' });
    }
    const {
        name, description, price, stock_quantity, category_id, category,
        flower_cond, images, image_url, video_url,
        badge, occasion, color, fresh, featured, best_seller, new_arrival,
        currency, unit, flower_type, fragrance, bloom_season, origin, care_level,
        sku, low_stock_alert, delivery_areas, delivery_time, shipping_fee, pickup_available,
        tags, seo_slug, meta_description, status
    } = req.body;
    if (name !== undefined && (typeof name !== 'string' || name.trim().length === 0 || name.length > 255)) {
        return res.status(400).json({ error: 'Name must be a non-empty string under 255 characters' });
    }
    if (price !== undefined && (typeof price !== 'number' || price < 0)) {
        return res.status(400).json({ error: 'Price must be a non-negative number' });
    }

    let resolvedCategoryId = category_id || null;
    if (!resolvedCategoryId && category) {
        try {
            const catR = await pool.query('SELECT id FROM marketplace.categories WHERE name ILIKE $1', [category]);
            if (catR.rows.length) resolvedCategoryId = catR.rows[0].id;
        } catch {}
    }

    const firstImage = image_url || (Array.isArray(images) && images.length > 0 ? images[0] : null);
    const isActive = status !== undefined ? (status === 'published' ? true : false) : undefined;

    const client = await pool.connect();
    try {
        await client.query('BEGIN');
        const r = await client.query(
            `UPDATE marketplace.products
             SET name = COALESCE($1, name), description = COALESCE($2, description), price = COALESCE($3, price),
                 stock_quantity = COALESCE($4, stock_quantity), category_id = COALESCE($5, category_id),
                 flower_cond = COALESCE($6, flower_cond), badge = COALESCE($7, badge),
                 occasion = COALESCE($8, occasion), color = COALESCE($9, color),
                 fresh = COALESCE($10, fresh), featured = COALESCE($11, featured),
                 best_seller = COALESCE($12, best_seller), new_arrival = COALESCE($13, new_arrival),
                 image_url = COALESCE($14, image_url), video_url = COALESCE($15, video_url),
                 currency = COALESCE($16, currency), unit = COALESCE($17, unit),
                 flower_type = COALESCE($18, flower_type), fragrance = COALESCE($19, fragrance),
                 bloom_season = COALESCE($20, bloom_season), origin = COALESCE($21, origin),
                 care_level = COALESCE($22, care_level), sku = COALESCE($23, sku),
                 low_stock_alert = COALESCE($24, low_stock_alert),
                 delivery_areas = COALESCE($25, delivery_areas), delivery_time = COALESCE($26, delivery_time),
                 shipping_fee = COALESCE($27, shipping_fee), pickup_available = COALESCE($28, pickup_available),
                 tags = COALESCE($29, tags), seo_slug = COALESCE($30, seo_slug),
                 meta_description = COALESCE($31, meta_description),
                 is_active = COALESCE($32, is_active), status = COALESCE($33, status)
             WHERE id = $34 RETURNING *`,
            [name ? escapeHtml(name).slice(0, 255) : null, description ? escapeHtml(description).slice(0, 2000) : null,
             price, stock_quantity, resolvedCategoryId,
             flower_cond ? (condMap[flower_cond.toUpperCase()] || flower_cond.toUpperCase()) : null,
             badge, occasion, color, fresh, featured, best_seller, new_arrival,
             firstImage, video_url,
             currency, unit, flower_type, fragrance, bloom_season, origin, care_level,
             sku, low_stock_alert, delivery_areas, delivery_time, shipping_fee, pickup_available,
             tags, seo_slug, meta_description, isActive, status, id]
        );
        if (images && Array.isArray(images) && images.length > 0) {
            await client.query('DELETE FROM marketplace.product_images WHERE product_id = $1', [id]);
            for (let i = 0; i < images.length; i++) {
                await client.query(
                    'INSERT INTO marketplace.product_images (product_id, image_url, sort_order) VALUES ($1, $2, $3)',
                    [id, images[i], i]
                );
            }
        }
        await client.query('COMMIT');
        res.json(r.rows[0]);
    } catch (err) {
        await client.query('ROLLBACK');
        throw err;
    } finally {
        client.release();
    }
}));

router.delete('/:id', requireSeller, asyncHandler(async (req, res) => {
    const { id } = req.params;
    let existing;
    try {
        existing = await pool.query('SELECT * FROM marketplace.products WHERE id = $1', [id]);
    } catch {
        return res.status(503).json({ error: 'Database error' });
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
        return res.status(503).json({ error: 'Database error' });
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

// Related products by category
router.get('/:id/related', asyncHandler(async (req, res) => {
    return queryWithFallback(
        async () => {
            const r = await pool.query(
                `SELECT p.id, p.name, p.price, p.image_url, p.badge, p.rating,
                        c.name AS category_name,
                        (SELECT image_url FROM marketplace.product_images WHERE product_id = p.id ORDER BY sort_order LIMIT 1) AS image
                 FROM marketplace.products p
                 JOIN marketplace.categories c ON c.id = p.category_id
                 WHERE p.category_id = (SELECT category_id FROM marketplace.products WHERE id = $1)
                   AND p.id != $1 AND p.is_active = true
                 ORDER BY RANDOM() LIMIT 4`,
                [req.params.id]
            );
            return r.rows;
        },
        'products', res, false,
        (data) => {
            const product = data.find(p => p.id === req.params.id);
            const cat = product ? (product.category || product.category_name || '') : '';
            return data.filter(p => p.id !== req.params.id && (p.category || p.category_name || '') === cat).slice(0, 4);
        }
    );
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
                `SELECT DISTINCT ON (u.id) u.id, u.first_name AS name, u.profile_image AS image, u.role
                 FROM auth.users u WHERE u.role IN ('SELLER', 'FLORIST') AND u.is_active = true ORDER BY u.id, u.first_name`
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
