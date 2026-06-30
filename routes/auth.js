const router = require('express').Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const { pool, JWT_SECRET, upload, rateLimiter, asyncHandler, dbAvailable, requireAuth, blacklistToken, blacklistUserTokens, cleanupBlacklist, getFileUrl } = require('./middleware');
const { sendPasswordResetEmail } = require('../utils/email');

// Clean expired reset tokens and blacklisted tokens periodically
setInterval(async () => {
    try {
        await pool.query("DELETE FROM auth.password_resets WHERE expires_at < CURRENT_TIMESTAMP");
    } catch {}
    cleanupBlacklist();
}, 300000);

router.post('/register', upload.single('avatar'), rateLimiter(10, 60000), asyncHandler(async (req, res) => {
    const { name, email, password, role, phone, location, city, state, country, zip_code, description,
            business_name, business_type, business_phone, business_email, website,
            social_instagram, social_facebook, social_twitter } = req.body;
    const profile_image = getFileUrl(req.file);
    if (!name || !email || !password) {
        return res.status(400).json({ error: 'Name, email, and password are required' });
    }
    if (password.length < 8) {
        return res.status(400).json({ error: 'Password must be at least 8 characters' });
    }

    if (typeof name !== 'string' || typeof email !== 'string' || typeof password !== 'string') {
        return res.status(400).json({ error: 'Invalid input types' });
    }

    const roleMap = { buyer: 'CUSTOMER', seller: 'SELLER', florist: 'FLORIST', grower: 'GROWER', customer: 'CUSTOMER', admin: 'ADMIN' };
    const dbRole = roleMap[(role || '').toLowerCase()] || 'CUSTOMER';
    const isActive = true;

    if (!(await dbAvailable())) {
        return res.status(503).json({ error: 'Service unavailable — database not connected' });
    }

    const hash = await bcrypt.hash(password, 12);
    let user;
    try {
      const r = await pool.query(
        `INSERT INTO auth.users (first_name, last_name, email, password_hash, role, phone, location, city, state, country, zip_code,
         description, profile_image, business_name, business_type, business_phone, business_email, website,
         social_instagram, social_facebook, social_twitter, is_active)
         VALUES ($1, '', $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21)
         RETURNING id, first_name, email, role, is_active, created_at`,
        [name, email, hash, dbRole, phone || null, location || null, city || null, state || null, country || null, zip_code || null,
         description || null, profile_image, business_name || null, business_type || null, business_phone || null,
         business_email || null, website || null, social_instagram || null, social_facebook || null, social_twitter || null, isActive]
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

    // Generate email verification token (for future use when email sending is configured)
    let verificationToken = null;
    try {
        verificationToken = crypto.randomBytes(32).toString('hex');
        await pool.query(
            'INSERT INTO auth.email_verifications (user_id, token, expires_at) VALUES ($1, $2, CURRENT_TIMESTAMP + INTERVAL \'24 hours\')',
            [user.id, verificationToken]
        );
    } catch (e) {
        console.error('Email verification token error:', e.message);
    }

    res.status(201).json({ token, verificationToken, user: { id: user.id, name: user.first_name, email: user.email, role: user.role, profile_image } });
}));

router.post('/logout', requireAuth, asyncHandler(async (req, res) => {
    const header = req.headers.authorization;
    if (header) {
        await blacklistToken(header.replace('Bearer ', ''));
    }
    res.json({ message: 'Logged out successfully' });
}));

router.post('/verify-email', rateLimiter(10, 60000), asyncHandler(async (req, res) => {
    const { token } = req.body;
    if (!token || typeof token !== 'string') {
        return res.status(400).json({ error: 'Verification token is required' });
    }
    if (!(await dbAvailable())) {
        return res.status(503).json({ error: 'Service unavailable' });
    }
    const r = await pool.query(
        'SELECT user_id FROM auth.email_verifications WHERE token = $1 AND expires_at > CURRENT_TIMESTAMP',
        [token]
    );
    if (!r.rows.length) {
        return res.status(400).json({ error: 'Invalid or expired verification token' });
    }
    await pool.query('UPDATE auth.users SET email_verified = TRUE WHERE id = $1', [r.rows[0].user_id]);
    await pool.query('DELETE FROM auth.email_verifications WHERE token = $1', [token]);
    res.json({ message: 'Email verified successfully' });
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
        const r = await pool.query('SELECT id, first_name, email, password_hash, role, is_active, profile_image FROM auth.users WHERE email = $1', [email]);
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
    if (user.is_active === false) {
        return res.status(403).json({ error: 'Account has been deactivated. Please contact support.' });
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
    const user = await pool.query('SELECT id, is_active FROM auth.users WHERE email = $1', [email]);
    let token = null;
    if (user.rows.length && user.rows[0].is_active !== false) {
        token = crypto.randomBytes(32).toString('hex');
        await pool.query(
            'INSERT INTO auth.password_resets (token, email, expires_at) VALUES ($1, $2, CURRENT_TIMESTAMP + INTERVAL \'1 hour\')',
            [token, email]
        );
        // Send reset email
        const baseUrl = process.env.APP_URL || `http://localhost:${process.env.PORT || 3000}`;
        const resetUrl = `${baseUrl}/reset-password.html?token=${token}`;
        await sendPasswordResetEmail(email, resetUrl);
    }
    // In development, also include the token in response for easy testing
    const isDev = process.env.NODE_ENV !== 'production';
    res.json({
        message: 'If the email exists, a reset link has been sent.',
        ...(isDev && token && { token, resetUrl: `${process.env.APP_URL || `http://localhost:${process.env.PORT || 3000}`}/reset-password.html?token=${token}` })
    });
}));

router.post('/reset-password', rateLimiter(5, 60000), asyncHandler(async (req, res) => {
    const { token, password } = req.body;
    if (!token || !password) {
        return res.status(400).json({ error: 'Token and password are required' });
    }
    if (typeof password !== 'string' || password.length < 8) {
        return res.status(400).json({ error: 'Password must be at least 8 characters' });
    }
    if (!(await dbAvailable())) {
        return res.status(503).json({ error: 'Service unavailable' });
    }
    const r = await pool.query(
        'SELECT email FROM auth.password_resets WHERE token = $1 AND expires_at > CURRENT_TIMESTAMP AND used = FALSE',
        [token]
    );
    if (!r.rows.length) {
        return res.status(400).json({ error: 'Invalid or expired token' });
    }
    const hash = await bcrypt.hash(password, 12);
    await pool.query('UPDATE auth.users SET password_hash = $1 WHERE email = $2', [hash, r.rows[0].email]);
    await pool.query('UPDATE auth.password_resets SET used = TRUE WHERE token = $1', [token]);
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
    await blacklistUserTokens(req.user.id);
    res.json({ message: 'Password updated successfully' });
}));

module.exports = router;
