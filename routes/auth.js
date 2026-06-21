const router = require('express').Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const { pool, JWT_SECRET, upload, rateLimiter, asyncHandler, dbAvailable, requireAuth } = require('./middleware');

const resetTokens = new Map();

setInterval(() => {
    const now = Date.now();
    for (const [token, data] of resetTokens.entries()) {
        if (data.expires < now) resetTokens.delete(token);
    }
}, 300000);

router.post('/register', upload.single('avatar'), rateLimiter(10, 60000), asyncHandler(async (req, res) => {
    const { name, email, password, role, location, description } = req.body;
    const profile_image = req.file ? `/uploads/${req.file.filename}` : null;
    if (!name || !email || !password) {
        return res.status(400).json({ error: 'Name, email, and password are required' });
    }
    if (password.length < 8) {
        return res.status(400).json({ error: 'Password must be at least 8 characters' });
    }

    if (typeof name !== 'string' || typeof email !== 'string' || typeof password !== 'string') {
        return res.status(400).json({ error: 'Invalid input types' });
    }

    const roleMap = { buyer: 'CUSTOMER', seller: 'SELLER', florist: 'FLORIST', grower: 'SELLER', customer: 'CUSTOMER' };
    const dbRole = roleMap[(role || '').toLowerCase()] || 'CUSTOMER';
    const isActive = ['SELLER', 'FLORIST'].includes(dbRole) ? false : true;

    if (!(await dbAvailable())) {
        return res.status(503).json({ error: 'Service unavailable — database not connected' });
    }

    const hash = await bcrypt.hash(password, 12);
    let user;
    try {
      const r = await pool.query(
        `INSERT INTO auth.users (first_name, last_name, email, password_hash, role, location, description, profile_image, is_active)
         VALUES ($1, '', $2, $3, $4, $5, $6, $7, $8) RETURNING id, first_name, email, role, is_active, created_at`,
        [name, email, hash, dbRole, location || null, description || null, profile_image, isActive]
      );
      user = r.rows[0];
    } catch (dbErr) {
      if (dbErr.code === '42P01') {
        return res.status(503).json({ error: 'Database schema not initialized' });
      }
      if (dbErr.code === '23505') {
        return res.status(409).json({ error: 'Email already registered' });
      }
      throw dbErr;
    }

    const token = jwt.sign({ id: user.id, email: user.email, role: user.role }, JWT_SECRET, { expiresIn: '7d' });
    res.status(201).json({ token, user: { id: user.id, name: user.first_name, email: user.email, role: user.role, profile_image } });
}));

router.post('/login', rateLimiter(20, 60000), asyncHandler(async (req, res) => {
    const { email, password } = req.body;
    if (!email || !password) {
        return res.status(400).json({ error: 'Email and password are required' });
    }

    if (typeof email !== 'string' || typeof password !== 'string') {
        return res.status(400).json({ error: 'Invalid input types' });
    }

    if (!(await dbAvailable())) {
        return res.status(503).json({ error: 'Service unavailable — database not connected' });
    }

    let user;
    try {
        const r = await pool.query('SELECT id, first_name, email, password_hash, role, profile_image FROM auth.users WHERE email = $1', [email]);
        if (!r.rows.length) {
            return res.status(401).json({ error: 'Invalid email or password' });
        }
        user = r.rows[0];
    } catch (dbErr) {
        if (dbErr.code === '42P01') {
            return res.status(503).json({ error: 'Database schema not initialized' });
        }
        throw dbErr;
    }
    const valid = await bcrypt.compare(password, user.password_hash);
    if (!valid) {
        return res.status(401).json({ error: 'Invalid email or password' });
    }

    const token = jwt.sign({ id: user.id, email: user.email, role: user.role }, JWT_SECRET, { expiresIn: '7d' });
    res.json({ token, user: { id: user.id, name: user.first_name, email: user.email, role: user.role, profile_image: user.profile_image } });
}));

router.get('/me', requireAuth, asyncHandler(async (req, res) => {
    if (!(await dbAvailable())) {
        return res.status(503).json({ error: 'Service unavailable — database not connected' });
    }

    const r = await pool.query('SELECT id, first_name, email, role, created_at, profile_image, last_name FROM auth.users WHERE id = $1', [req.user.id]);
    if (!r.rows.length) return res.status(404).json({ error: 'User not found' });
    res.json({ user: r.rows[0] });
}));

router.post('/forgot-password', rateLimiter(5, 60000), asyncHandler(async (req, res) => {
    const { email } = req.body;
    if (!email || typeof email !== 'string') {
        return res.status(400).json({ error: 'Email is required' });
    }
    if (!(await dbAvailable())) {
        return res.status(503).json({ error: 'Service unavailable' });
    }
    const user = await pool.query('SELECT id FROM auth.users WHERE email = $1', [email]);
    if (user.rows.length) {
        const token = crypto.randomBytes(32).toString('hex');
        resetTokens.set(token, { email, expires: Date.now() + 3600000 });
    }
    res.json({ message: 'If the email exists, a reset link has been sent.' });
}));

router.post('/reset-password', rateLimiter(5, 60000), asyncHandler(async (req, res) => {
    const { token, password } = req.body;
    if (!token || !password) {
        return res.status(400).json({ error: 'Token and password are required' });
    }
    if (typeof password !== 'string' || password.length < 8) {
        return res.status(400).json({ error: 'Password must be at least 8 characters' });
    }
    const stored = resetTokens.get(token);
    if (!stored || stored.expires < Date.now()) {
        resetTokens.delete(token);
        return res.status(400).json({ error: 'Invalid or expired token' });
    }
    if (!(await dbAvailable())) {
        return res.status(503).json({ error: 'Service unavailable' });
    }
    const hash = await bcrypt.hash(password, 12);
    await pool.query('UPDATE auth.users SET password_hash = $1 WHERE email = $2', [hash, stored.email]);
    resetTokens.delete(token);
    res.json({ message: 'Password reset successfully' });
}));

router.put('/profile', requireAuth, asyncHandler(async (req, res) => {
    if (!(await dbAvailable())) {
        return res.status(503).json({ error: 'Database unavailable' });
    }
    const { first_name, last_name, profile_image } = req.body;
    const r = await pool.query(
        `UPDATE auth.users SET first_name = COALESCE($1, first_name), last_name = COALESCE($2, last_name), profile_image = COALESCE($3, profile_image)
         WHERE id = $4 RETURNING id, first_name, last_name, email, role, profile_image`,
        [first_name, last_name, profile_image, req.user.id]
    );
    res.json({ user: r.rows[0] });
}));

router.put('/password', requireAuth, asyncHandler(async (req, res) => {
    if (!(await dbAvailable())) {
        return res.status(503).json({ error: 'Database unavailable' });
    }
    const { current_password, new_password } = req.body;
    if (!current_password || !new_password) {
        return res.status(400).json({ error: 'Current and new password are required' });
    }
    if (new_password.length < 8) {
        return res.status(400).json({ error: 'New password must be at least 8 characters' });
    }
    const r = await pool.query('SELECT password_hash FROM auth.users WHERE id = $1', [req.user.id]);
    if (!r.rows.length) return res.status(404).json({ error: 'User not found' });
    const valid = await bcrypt.compare(current_password, r.rows[0].password_hash);
    if (!valid) return res.status(401).json({ error: 'Current password is incorrect' });
    const hash = await bcrypt.hash(new_password, 12);
    await pool.query('UPDATE auth.users SET password_hash = $1 WHERE id = $2', [hash, req.user.id]);
    res.json({ message: 'Password updated successfully' });
}));

module.exports = router;
