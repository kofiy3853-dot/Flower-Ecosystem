const router = require('express').Router();
const jwt = require('jsonwebtoken');
const path = require('path');
const { pool, JWT_SECRET, upload, rateLimiter, asyncHandler, escapeHtml, dbAvailable, requireAuth } = require('./middleware');

// Newsletter
router.post('/newsletter/subscribe', asyncHandler(async (req, res) => {
    const { email } = req.body;
    if (!email || typeof email !== 'string') return res.status(400).json({ error: 'Email is required' });
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return res.status(400).json({ error: 'Invalid email format' });
    console.log(`Newsletter subscription: ${email}`);
    res.json({ message: 'Successfully subscribed' });
}));

// AI Flower Scan — redirects to the real OpenAI-powered endpoint
router.post('/ai/flower-scan', upload.single('image'), asyncHandler(async (req, res) => {
    if (!req.file) return res.status(400).json({ error: 'Image file required' });
    const forwardReq = require('http').request({
        hostname: 'localhost',
        port: process.env.PORT || 3000,
        path: '/api/openrouter/analyze-flower',
        method: 'POST',
        headers: {
            'Content-Type': req.headers['content-type'],
            'X-Requested-With': 'XMLHttpRequest'
        }
    }, (proxyRes) => {
        let body = '';
        proxyRes.on('data', (chunk) => body += chunk);
        proxyRes.on('end', () => {
            res.status(proxyRes.statusCode).setHeader('Content-Type', 'application/json').end(body);
        });
    });
    forwardReq.on('error', () => res.status(500).json({ error: 'AI analysis unavailable' }));
    req.pipe(forwardReq);
}));

// Image Upload
router.post('/upload', requireAuth, upload.array('images', 10), asyncHandler(async (req, res) => {
    if (!req.files || req.files.length === 0) return res.status(400).json({ error: 'No image files provided' });
    const urls = req.files.map(f => `/uploads/${f.filename}`);
    res.status(201).json({ images: urls });
}));

// Contact & FAQ
router.post('/contact', rateLimiter(5, 60000), asyncHandler(async (req, res) => {
    const { name, email, subject, category, message, phone, company } = req.body;
    if (!name || !email || !message) return res.status(400).json({ error: 'Name, email, and message are required' });
    if (typeof name !== 'string' || typeof email !== 'string' || typeof message !== 'string') return res.status(400).json({ error: 'Invalid input types' });
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return res.status(400).json({ error: 'Invalid email format' });

    let userId = null;
    if (req.headers.authorization) {
        try { const decoded = jwt.verify(req.headers.authorization.replace('Bearer ', ''), JWT_SECRET); userId = decoded.id; } catch {}
    }

    if (await dbAvailable()) {
        try {
            const r = await pool.query(
                `INSERT INTO community.contact_submissions (name, email, subject, category, message, phone, company, user_id)
                 VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING id, created_at`,
                [escapeHtml(name).slice(0, 255), email.toLowerCase(), escapeHtml(subject || '').slice(0, 255), category || 'General Inquiry', escapeHtml(message).slice(0, 5000), phone || null, company || null, userId]
            );
            return res.status(201).json({ message: 'Message sent successfully', id: r.rows[0].id });
        } catch (err) { console.error('Contact submission error:', err.message); }
    }
    res.status(201).json({ message: 'Message sent successfully' });
}));

router.get('/faqs', asyncHandler(async (_, res) => {
    if (await dbAvailable()) {
        try {
            const r = await pool.query('SELECT * FROM community.faqs WHERE is_published = true ORDER BY sort_order');
            if (r.rows.length) return res.json(r.rows);
        } catch {}
    }
    res.json([
        { id: 1, question: 'How do I create an account?', answer: 'Click the "Sign Up" button in the top right corner. You can register with your email address and create a password.', category: 'Getting Started', sort_order: 1 },
        { id: 2, question: 'How do I list flowers for sale?', answer: 'After logging in, go to your Seller Dashboard and click "Create Listing." Add photos, set your price, and choose a category.', category: 'Selling', sort_order: 2 },
        { id: 3, question: 'What payment methods do you accept?', answer: 'We accept all major credit cards, PayPal, and bank transfers. All transactions are securely processed.', category: 'Payments', sort_order: 3 },
        { id: 4, question: 'How do I request a refund?', answer: 'Go to your Orders page, find the order, and click "Request Refund." Our team reviews requests within 24-48 hours.', category: 'Orders', sort_order: 4 },
        { id: 5, question: 'Can I attend workshops for free?', answer: 'Many webinars and introductory workshops are free. Premium workshops and masterclasses have a fee.', category: 'Events', sort_order: 5 },
        { id: 6, question: 'How do I become a verified florist?', answer: 'Submit a verification request from your Seller Dashboard with business documentation. Verification takes 2-3 business days.', category: 'Selling', sort_order: 6 }
    ]);
}));

router.get('/faqs/categories', asyncHandler(async (_, res) => {
    if (await dbAvailable()) {
        try {
            const r = await pool.query('SELECT DISTINCT category FROM community.faqs WHERE is_published = true AND category IS NOT NULL ORDER BY category');
            return res.json(r.rows.map(r => r.category));
        } catch {}
    }
    res.json(['Getting Started', 'Selling', 'Payments', 'Orders', 'Events']);
}));

// Reviews
router.get('/reviews', asyncHandler(async (req, res) => {
    const { product_id, seller_id, page = 1, limit = 20 } = req.query;
    const pg = Math.max(1, parseInt(page, 10) || 1);
    const lim = Math.min(100, Math.max(1, parseInt(limit, 10) || 20));
    const offset = (pg - 1) * lim;
    if (!(await dbAvailable())) return res.json({ reviews: [], total: 0 });
    try {
        const conditions = [];
        const values = [];
        let idx = 1;
        if (product_id) { conditions.push(`r.product_id = $${idx}`); values.push(product_id); idx++; }
        if (seller_id) { conditions.push(`r.seller_id = $${idx}`); values.push(seller_id); idx++; }
        const where = conditions.length ? 'WHERE ' + conditions.join(' AND ') : '';
        const countR = await pool.query(`SELECT COUNT(*) FROM platform.reviews r ${where}`, values);
        const total = parseInt(countR.rows[0].count) || 0;
        values.push(lim);
        values.push(offset);
        const r = await pool.query(`
            SELECT r.*, u.first_name || ' ' || u.last_name AS reviewer_name, u.profile_image AS reviewer_avatar
            FROM platform.reviews r LEFT JOIN auth.users u ON u.id = r.user_id
            ${where}
            ORDER BY r.created_at DESC
            LIMIT $${idx} OFFSET $${idx + 1}`, values);
        res.json({ reviews: r.rows, total, page: pg, limit: lim, pages: Math.ceil(total / lim) });
    } catch { res.json({ reviews: [], total: 0 }); }
}));

router.post('/reviews', requireAuth, asyncHandler(async (req, res) => {
    if (!(await dbAvailable())) return res.status(503).json({ error: 'Database unavailable' });
    const { product_id, seller_id, rating, title, content } = req.body;
    if (!rating || rating < 1 || rating > 5) return res.status(400).json({ error: 'Rating 1-5 required' });
    const r = await pool.query(
        'INSERT INTO platform.reviews (user_id, product_id, seller_id, rating, title, content) VALUES ($1, $2, $3, $4, $5, $6) RETURNING *',
        [req.user.id, product_id || null, seller_id || null, rating, escapeHtml(title || '').slice(0, 255), escapeHtml(content || '').slice(0, 2000)]
    );
    res.status(201).json(r.rows[0]);
}));

router.delete('/reviews/:id', requireAuth, asyncHandler(async (req, res) => {
    if (!(await dbAvailable())) return res.status(503).json({ error: 'Database unavailable' });
    const existing = await pool.query('SELECT * FROM platform.reviews WHERE id = $1', [req.params.id]);
    if (!existing.rows.length) return res.status(404).json({ error: 'Review not found' });
    if (existing.rows[0].user_id !== req.user.id && !['ADMIN', 'SUPERADMIN'].includes((req.user.role || '').toUpperCase())) return res.status(403).json({ error: 'Not authorized' });
    await pool.query('DELETE FROM platform.reviews WHERE id = $1', [req.params.id]);
    res.json({ message: 'Review deleted' });
}));

router.post('/reviews/:id/helpful', requireAuth, asyncHandler(async (req, res) => {
    if (!(await dbAvailable())) return res.status(503).json({ error: 'Database unavailable' });
    await pool.query('UPDATE platform.reviews SET helpful_count = helpful_count + 1 WHERE id = $1', [req.params.id]);
    res.json({ message: 'Marked as helpful' });
}));

module.exports = router;
