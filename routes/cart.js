const router = require('express').Router();
const path = require('path');
const { pool, asyncHandler, dbAvailable, readJSON, requireAuth } = require('./middleware');

const mockCarts = new Map();

function getMockCart(userId) {
    if (!mockCarts.has(userId)) mockCarts.set(userId, { id: `cart_${userId}`, user_id: userId, items: [] });
    return mockCarts.get(userId);
}

function getMockCartProducts(cart) {
    const products = readJSON(path.join(__dirname, '..', 'data', 'products.json'));
    return cart.items.map(item => {
        const p = products.find(x => x.id === item.product_id) || {};
        return { ...item, name: p.name || '', price: item.price || p.price || 0, image: p.image || '', stock_quantity: p.stock_quantity || 99 };
    });
}

function cartTotal(items) {
    return items.reduce((sum, i) => sum + (i.price || 0) * i.quantity, 0);
}

router.get('/', requireAuth, asyncHandler(async (req, res) => {
    if (await dbAvailable()) {
        try {
            let cart = await pool.query('SELECT id FROM marketplace.carts WHERE user_id = $1', [req.user.id]);
            if (!cart.rows.length) {
                cart = await pool.query('INSERT INTO marketplace.carts (user_id) VALUES ($1) RETURNING *', [req.user.id]);
            }
            const items = await pool.query(
                `SELECT ci.*, p.name, p.price, p.flower_cond, p.stock_quantity,
                        COALESCE(json_agg(pi.image_url) FILTER (WHERE pi.image_url IS NOT NULL), '[]') AS images
                 FROM marketplace.cart_items ci
                 JOIN marketplace.products p ON p.id = ci.product_id
                 LEFT JOIN marketplace.product_images pi ON pi.product_id = p.id
                 WHERE ci.cart_id = $1
                 GROUP BY ci.id, p.name, p.price, p.flower_cond, p.stock_quantity`,
                [cart.rows[0].id]
            );
            const total = cartTotal(items.rows);
            return res.json({ cart: cart.rows[0], items: items.rows, total });
        } catch (err) {
            console.error('Cart query error:', err.message);
        }
    }
    const mockCart = getMockCart(req.user.id);
    const items = getMockCartProducts(mockCart);
    res.json({ cart: { id: mockCart.id, user_id: mockCart.user_id }, items, total: cartTotal(items) });
}));

router.post('/items', requireAuth, asyncHandler(async (req, res) => {
    const { product_id, quantity } = req.body;
    if (!product_id || !quantity || quantity < 1) {
        return res.status(400).json({ error: 'Product ID and positive quantity are required' });
    }

    if (await dbAvailable()) {
        try {
            const product = await pool.query('SELECT id, stock_quantity FROM marketplace.products WHERE id = $1 AND is_active = true', [product_id]);
            if (!product.rows.length) return res.status(404).json({ error: 'Product not found' });
            if (product.rows[0].stock_quantity < quantity) {
                return res.status(400).json({ error: 'Insufficient stock', available: product.rows[0].stock_quantity });
            }

            let cart = await pool.query('SELECT id FROM marketplace.carts WHERE user_id = $1', [req.user.id]);
            if (!cart.rows.length) {
                cart = await pool.query('INSERT INTO marketplace.carts (user_id) VALUES ($1) RETURNING *', [req.user.id]);
            }
            const existing = await pool.query(
                'SELECT id, quantity FROM marketplace.cart_items WHERE cart_id = $1 AND product_id = $2',
                [cart.rows[0].id, product_id]
            );
            if (existing.rows.length) {
                const newQty = existing.rows[0].quantity + quantity;
                if (newQty > product.rows[0].stock_quantity) {
                    return res.status(400).json({ error: 'Insufficient stock', available: product.rows[0].stock_quantity });
                }
                await pool.query('UPDATE marketplace.cart_items SET quantity = $1 WHERE id = $2', [newQty, existing.rows[0].id]);
            } else {
                await pool.query('INSERT INTO marketplace.cart_items (cart_id, product_id, quantity) VALUES ($1, $2, $3)', [cart.rows[0].id, product_id, quantity]);
            }
            const items = await pool.query(
                `SELECT ci.*, p.name, p.price, p.flower_cond, p.stock_quantity,
                        COALESCE(json_agg(pi.image_url) FILTER (WHERE pi.image_url IS NOT NULL), '[]') AS images
                 FROM marketplace.cart_items ci
                 JOIN marketplace.products p ON p.id = ci.product_id
                 LEFT JOIN marketplace.product_images pi ON pi.product_id = p.id
                 WHERE ci.cart_id = $1
                 GROUP BY ci.id, p.name, p.price, p.flower_cond, p.stock_quantity`,
                [cart.rows[0].id]
            );
            return res.status(201).json({ items: items.rows, total: cartTotal(items.rows) });
        } catch (err) {
            console.error('Cart add error:', err.message);
        }
    }

    const products = readJSON(path.join(__dirname, '..', 'data', 'products.json'));
    const product = products.find(p => p.id === product_id);
    if (!product) return res.status(404).json({ error: 'Product not found' });

    const cart = getMockCart(req.user.id);
    const existing = cart.items.find(i => i.product_id === product_id);
    if (existing) {
        existing.quantity += quantity;
    } else {
        cart.items.push({ id: `ci_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`, product_id, quantity, price: product.price });
    }
    const items = getMockCartProducts(cart);
    res.status(201).json({ items, total: cartTotal(items) });
}));

router.put('/items/:id', requireAuth, asyncHandler(async (req, res) => {
    const { id } = req.params;
    const { quantity } = req.body;
    if (!quantity || quantity < 1) {
        return res.status(400).json({ error: 'Quantity must be at least 1' });
    }

    if (await dbAvailable()) {
        try {
            const existing = await pool.query(
                `SELECT ci.id, ci.product_id, p.stock_quantity
                 FROM marketplace.cart_items ci
                 JOIN marketplace.products p ON p.id = ci.product_id
                 WHERE ci.id = $1 AND ci.cart_id IN (SELECT id FROM marketplace.carts WHERE user_id = $2)`,
                [id, req.user.id]
            );
            if (!existing.rows.length) return res.status(404).json({ error: 'Cart item not found' });
            if (quantity > existing.rows[0].stock_quantity) {
                return res.status(400).json({ error: 'Insufficient stock', available: existing.rows[0].stock_quantity });
            }
            const r = await pool.query('UPDATE marketplace.cart_items SET quantity = $1 WHERE id = $2 RETURNING *', [quantity, id]);
            return res.json(r.rows[0]);
        } catch (err) {
            console.error('Cart update error:', err.message);
            return res.status(500).json({ error: 'Failed to update cart item' });
        }
    }

    const cart = getMockCart(req.user.id);
    const item = cart.items.find(i => i.id === id);
    if (!item) return res.status(404).json({ error: 'Cart item not found' });
    item.quantity = quantity;
    res.json(item);
}));

router.delete('/items/:id', requireAuth, asyncHandler(async (req, res) => {
    const { id } = req.params;

    if (await dbAvailable()) {
        try {
            const r = await pool.query(
                `DELETE FROM marketplace.cart_items
                 WHERE id = $1 AND cart_id IN (SELECT id FROM marketplace.carts WHERE user_id = $2)
                 RETURNING *`,
                [id, req.user.id]
            );
            if (!r.rows.length) return res.status(404).json({ error: 'Cart item not found' });
            return res.json({ message: 'Item removed from cart' });
        } catch (err) {
            console.error('Cart delete error:', err.message);
            return res.status(500).json({ error: 'Failed to remove cart item' });
        }
    }

    const cart = getMockCart(req.user.id);
    const idx = cart.items.findIndex(i => i.id === id);
    if (idx === -1) return res.status(404).json({ error: 'Cart item not found' });
    cart.items.splice(idx, 1);
    res.json({ message: 'Item removed from cart' });
}));

router.delete('/', requireAuth, asyncHandler(async (req, res) => {
    if (await dbAvailable()) {
        try {
            const cart = await pool.query('SELECT id FROM marketplace.carts WHERE user_id = $1', [req.user.id]);
            if (cart.rows.length) {
                await pool.query('DELETE FROM marketplace.cart_items WHERE cart_id = $1', [cart.rows[0].id]);
            }
            return res.json({ message: 'Cart cleared' });
        } catch (err) {
            console.error('Cart clear error:', err.message);
            return res.status(500).json({ error: 'Failed to clear cart' });
        }
    }

    const cart = getMockCart(req.user.id);
    cart.items = [];
    res.json({ message: 'Cart cleared' });
}));

module.exports = router;
