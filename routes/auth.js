const router = require('express').Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const speakeasy = require('speakeasy');
const qrcode = require('qrcode');
const { pool, JWT_SECRET, JWT_REFRESH_SECRET, upload, rateLimiter, asyncHandler, dbAvailable, requireAuth, blacklistToken, blacklistUserTokens, cleanupBlacklist, getFileUrl, csrfProtection, validateCSRF } = require('./middleware');
const { sendPasswordResetEmail, sendVerificationEmail } = require('../utils/email');

const ACCESS_TOKEN_EXPIRY = '15m';
const REFRESH_TOKEN_EXPIRY = '30d';
const ACCESS_TOKEN_COOKIE_OPTIONS = {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 15 * 60 * 1000,
    path: '/'
};
const REFRESH_TOKEN_COOKIE_OPTIONS = {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 30 * 24 * 60 * 60 * 1000,
    path: '/api/auth'
};
const CSRF_COOKIE_OPTIONS = {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 24 * 60 * 60 * 1000,
    path: '/'
};

function generateTokens(user) {
    const accessToken = jwt.sign(
        { id: user.id, email: user.email, role: user.role, type: 'access' },
        JWT_SECRET,
        { expiresIn: ACCESS_TOKEN_EXPIRY }
    );
    const refreshToken = jwt.sign(
        { id: user.id, email: user.email, role: user.role, type: 'refresh' },
        JWT_REFRESH_SECRET || JWT_SECRET,
        { expiresIn: REFRESH_TOKEN_EXPIRY }
    );
    return { accessToken, refreshToken };
}

function setAuthCookies(res, accessToken, refreshToken, csrfToken) {
    res.cookie('access_token', accessToken, ACCESS_TOKEN_COOKIE_OPTIONS);
    res.cookie('refresh_token', refreshToken, REFRESH_TOKEN_COOKIE_OPTIONS);
    if (csrfToken) {
        res.cookie('csrf_token', csrfToken, CSRF_COOKIE_OPTIONS);
    }
}

function clearAuthCookies(res) {
    res.clearCookie('access_token', { ...ACCESS_TOKEN_COOKIE_OPTIONS, maxAge: 0 });
    res.clearCookie('refresh_token', { ...REFRESH_TOKEN_COOKIE_OPTIONS, maxAge: 0 });
    res.clearCookie('csrf_token', { ...CSRF_COOKIE_OPTIONS, maxAge: 0 });
}

// Clean expired reset tokens and blacklisted tokens periodically
setInterval(async () => {
    try {
        await pool.query("DELETE FROM auth.password_resets WHERE expires_at < CURRENT_TIMESTAMP");
        await pool.query("DELETE FROM auth.refresh_tokens WHERE expires_at < CURRENT_TIMESTAMP");
        await pool.query("DELETE FROM auth.token_blacklist WHERE expires_at < CURRENT_TIMESTAMP");
    } catch {}
    cleanupBlacklist();
}, 300000);

router.post('/register', upload.single('avatar'), rateLimiter(10, 60000), asyncHandler(async (req, res) => {
    const { name, email, password, role, phone, location, city, state, country, zip_code, description,
            business_name, business_type, business_phone, business_email, website,
            social_instagram, social_facebook, social_twitter, csrf_token } = req.body;
    const profile_image = getFileUrl(req.file);
    if (!name || !email || !password) {
        return res.status(400).json({ error: 'Name, email, and password are required' });
    }
    if (password.length < 12) {
        return res.status(400).json({ error: 'Password must be at least 12 characters' });
    }

    if (typeof name !== 'string' || typeof email !== 'string' || typeof password !== 'string') {
        return res.status(400).json({ error: 'Invalid input types' });
    }

    const roleMap = { buyer: 'CUSTOMER', seller: 'SELLER', florist: 'FLORIST', grower: 'GROWER', customer: 'CUSTOMER', student: 'STUDENT' };
    const dbRole = roleMap[(role || '').toLowerCase()] || 'CUSTOMER';
    const isActive = true;

    if (!(await dbAvailable())) {
        return res.status(503).json({ error: 'Service unavailable — database not connected' });
    }

    // Check if email already exists and is verified
    const existingUser = await pool.query('SELECT id, email_verified FROM auth.users WHERE email = $1', [email]);
    if (existingUser.rows.length) {
        if (existingUser.rows[0].email_verified) {
            return res.status(409).json({ error: 'Email already registered' });
        }
        // Unverified account exists - allow re-registration
        await pool.query('DELETE FROM auth.users WHERE id = $1', [existingUser.rows[0].id]);
    }

    const hash = await bcrypt.hash(password, 12);
    let user;
    try {
      const r = await pool.query(
        `INSERT INTO auth.users (first_name, last_name, email, password_hash, role, phone, location, city, state, country, zip_code,
         description, profile_image, business_name, business_type, business_phone, business_email, website,
         social_instagram, social_facebook, social_twitter, is_active, email_verified)
         VALUES ($1, '', $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, TRUE, TRUE)
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

    // Generate tokens (email auto-verified)
    const { accessToken, refreshToken } = generateTokens(user);
    const csrfToken = crypto.randomBytes(32).toString('hex');

    // Store refresh token in database
    const refreshTokenHash = crypto.createHash('sha256').update(refreshToken).digest('hex');
    await pool.query(
        'INSERT INTO auth.refresh_tokens (user_id, token_hash, expires_at) VALUES ($1, $2, CURRENT_TIMESTAMP + INTERVAL \'30 days\')',
        [user.id, refreshTokenHash]
    );

    setAuthCookies(res, accessToken, refreshToken, crypto.randomBytes(32).toString('hex'));
    res.status(201).json({ 
        message: 'Registration successful.',
        user: { id: user.id, name: user.first_name, email: user.email, role: user.role }
    });
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
    
    // Generate tokens after verification
    const user = await pool.query('SELECT id, email, role FROM auth.users WHERE id = $1', [r.rows[0].user_id]);
    if (!user.rows.length) {
        return res.status(404).json({ error: 'User not found' });
    }
    const u = user.rows[0];
    const { accessToken, refreshToken } = generateTokens(u);
    const refreshTokenHash = crypto.createHash('sha256').update(refreshToken).digest('hex');
    await pool.query(
        'INSERT INTO auth.refresh_tokens (user_id, token_hash, expires_at) VALUES ($1, $2, CURRENT_TIMESTAMP + INTERVAL \'30 days\')',
        [u.id, refreshTokenHash]
    );
    const csrfToken = crypto.randomBytes(32).toString('hex');
    setAuthCookies(res, accessToken, refreshToken, csrfToken);
    res.json({ message: 'Email verified successfully', user: { id: u.id, email: u.email, role: u.role } });
}));

router.post('/resend-verification', rateLimiter(5, 60000), asyncHandler(async (req, res) => {
    const { email } = req.body;
    if (!email || typeof email !== 'string') {
        return res.status(400).json({ error: 'Email is required' });
    }
    if (!(await dbAvailable())) {
        return res.status(503).json({ error: 'Service unavailable' });
    }
    const user = await pool.query('SELECT id FROM auth.users WHERE email = $1 AND email_verified = FALSE', [email]);
    if (user.rows.length) {
        // Delete old verification tokens for this user
        await pool.query('DELETE FROM auth.email_verifications WHERE user_id = $1', [user.rows[0].id]);
        // Generate new token
        const verificationToken = crypto.randomBytes(32).toString('hex');
        await pool.query(
            'INSERT INTO auth.email_verifications (user_id, token, expires_at) VALUES ($1, $2, CURRENT_TIMESTAMP + INTERVAL \'24 hours\')',
            [user.rows[0].id, verificationToken]
        );
        // Send verification email
        try {
            await sendVerificationEmail(email, verificationToken);
        } catch (e) {
            console.error('Failed to send verification email:', e.message);
        }
    }
    // Always return success to prevent email enumeration
    res.json({ message: 'If the email exists and is unverified, a new link has been sent.' });
}));

router.post('/login', rateLimiter(10, 60000), asyncHandler(async (req, res) => {
    const { email, password, two_factor_code } = req.body;
    if (!email || !password) {
        return res.status(400).json({ error: 'Email and password are required' });
    }
    if (typeof email !== 'string' || typeof password !== 'string') {
        return res.status(400).json({ error: 'Invalid input types' });
    }

    if (!(await dbAvailable())) {
        return res.status(503).json({ error: 'Service unavailable — database not connected' });
    }

    // Check account lockout
    const lockout = await pool.query(
        'SELECT locked_until, failed_attempts FROM auth.login_attempts WHERE email = $1',
        [email]
    );
    if (lockout.rows.length && lockout.rows[0].locked_until && new Date(lockout.rows[0].locked_until) > new Date()) {
        const mins = Math.ceil((new Date(lockout.rows[0].locked_until) - Date.now()) / 60000);
        return res.status(429).json({ error: `Account locked. Try again in ${mins} minutes.` });
    }

    if (!(await dbAvailable())) {
        return res.status(503).json({ error: 'Service unavailable — database not connected' });
    }

    let user;
    try {
        const r = await pool.query('SELECT id, first_name, last_name, email, password_hash, role, is_active, profile_image, email_verified, two_factor_enabled, two_factor_secret FROM auth.users WHERE email = $1', [email]);
        if (!r.rows.length) {
            // Record failed attempt
            await recordFailedAttempt(email);
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
    // TEMP: Email verification disabled for testing
    // if (!user.email_verified) {
    //     return res.status(403).json({ error: 'Please verify your email before logging in. Check your inbox for the verification link.' });
    // }
    const valid = await bcrypt.compare(password, user.password_hash);
    if (!valid) {
        await recordFailedAttempt(email);
        return res.status(401).json({ error: 'Invalid email or password' });
    }

    // Check 2FA
    if (user.two_factor_enabled && user.two_factor_secret) {
        if (!two_factor_code) {
            return res.status(200).json({ requires_2fa: true, message: 'Two-factor authentication required' });
        }
        const verified = speakeasy.totp.verify({
            secret: user.two_factor_secret,
            encoding: 'base32',
            token: two_factor_code,
            window: 1
        });
        if (!verified) {
            await recordFailedAttempt(email);
            return res.status(401).json({ error: 'Invalid two-factor code' });
        }
    }

    // Reset failed attempts on successful login
    await resetFailedAttempts(email);

    const { accessToken, refreshToken } = generateTokens(user);
    const refreshTokenHash = crypto.createHash('sha256').update(refreshToken).digest('hex');
    await pool.query(
        'INSERT INTO auth.refresh_tokens (user_id, token_hash, expires_at) VALUES ($1, $2, CURRENT_TIMESTAMP + INTERVAL \'30 days\')',
        [user.id, refreshTokenHash]
    );
    const csrfToken = crypto.randomBytes(32).toString('hex');
    setAuthCookies(res, accessToken, refreshToken, csrfToken);

    // Record session
    await pool.query(
        `INSERT INTO auth.sessions (user_id, user_agent, ip_address, expires_at) 
         VALUES ($1, $2, $3, CURRENT_TIMESTAMP + INTERVAL '30 days')
         RETURNING id`,
        [user.id, req.headers['user-agent'] || '', req.ip || '']
    );

    res.json({ 
        user: { id: user.id, name: user.first_name, email: user.email, role: user.role, profile_image: user.profile_image }
    });
}));

router.post('/logout', requireAuth, asyncHandler(async (req, res) => {
    const header = req.headers.authorization;
    if (header) {
        await blacklistToken(header.replace('Bearer ', ''));
    }
    // Remove refresh token from database
    const refreshToken = req.cookies.refresh_token;
    if (refreshToken) {
        const refreshTokenHash = crypto.createHash('sha256').update(refreshToken).digest('hex');
        await pool.query('DELETE FROM auth.refresh_tokens WHERE token_hash = $1', [refreshTokenHash]);
    }
    // Remove session
    if (req.session_id) {
        await pool.query('DELETE FROM auth.sessions WHERE id = $1', [req.session_id]);
    }
    clearAuthCookies(res);
    res.json({ message: 'Logged out successfully' });
}));

router.post('/refresh', asyncHandler(async (req, res) => {
    const refreshToken = req.cookies.refresh_token;
    if (!refreshToken) {
        return res.status(401).json({ error: 'Refresh token required' });
    }
    const refreshTokenHash = crypto.createHash('sha256').update(refreshToken).digest('hex');
    const r = await pool.query(
        'SELECT rt.*, u.id, u.email, u.role FROM auth.refresh_tokens rt JOIN auth.users u ON u.id = rt.user_id WHERE rt.token_hash = $1 AND rt.expires_at > CURRENT_TIMESTAMP AND rt.revoked = FALSE',
        [refreshTokenHash]
    );
    if (!r.rows.length) {
        return res.status(401).json({ error: 'Invalid or expired refresh token' });
    }
    const user = r.rows[0];
    const { accessToken, refreshToken: newRefreshToken } = generateTokens({ id: user.id, email: user.email, role: user.role });
    const newRefreshTokenHash = crypto.createHash('sha256').update(newRefreshToken).digest('hex');
    
    // Rotate refresh token
    await pool.query('UPDATE auth.refresh_tokens SET revoked = TRUE WHERE token_hash = $1', [refreshTokenHash]);
    await pool.query(
        'INSERT INTO auth.refresh_tokens (user_id, token_hash, expires_at) VALUES ($1, $2, CURRENT_TIMESTAMP + INTERVAL \'30 days\')',
        [user.id, newRefreshTokenHash]
    );
    
    const csrfToken = crypto.randomBytes(32).toString('hex');
    setAuthCookies(res, accessToken, newRefreshToken, csrfToken);
    res.json({ access_token: accessToken });
}));

router.get('/csrf-token', asyncHandler(async (req, res) => {
    const csrfToken = crypto.randomBytes(32).toString('hex');
    res.cookie('csrf_token', csrfToken, CSRF_COOKIE_OPTIONS);
    res.json({ csrf_token: csrfToken });
}));

router.get('/me', requireAuth, asyncHandler(async (req, res) => {
    if (!(await dbAvailable())) {
        return res.status(503).json({ error: 'Service unavailable — database not connected' });
    }
    const r = await pool.query('SELECT id, first_name, last_name, email, role, created_at, profile_image, last_name, email_verified, two_factor_enabled FROM auth.users WHERE id = $1', [req.user.id]);
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
        const baseUrl = process.env.APP_URL || `http://localhost:${process.env.PORT || 3000}`;
        const resetUrl = `${baseUrl}/reset-password.html?token=${token}`;
        await sendPasswordResetEmail(email, resetUrl);
    }
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
    if (typeof password !== 'string' || password.length < 12) {
        return res.status(400).json({ error: 'Password must be at least 12 characters' });
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
    await pool.query('UPDATE auth.users SET password_hash = $1, password_changed_at = CURRENT_TIMESTAMP WHERE email = $2', [hash, r.rows[0].email]);
    await pool.query('UPDATE auth.password_resets SET used = TRUE WHERE token = $1', [token]);
    await blacklistUserTokens(r.rows[0].email);
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
    if (new_password.length < 12) {
        return res.status(400).json({ error: 'New password must be at least 12 characters' });
    }
    const r = await pool.query('SELECT password_hash FROM auth.users WHERE id = $1', [req.user.id]);
    if (!r.rows.length) return res.status(404).json({ error: 'User not found' });
    const valid = await bcrypt.compare(current_password, r.rows[0].password_hash);
    if (!valid) return res.status(401).json({ error: 'Current password is incorrect' });
    const hash = await bcrypt.hash(new_password, 12);
    await pool.query('UPDATE auth.users SET password_hash = $1, password_changed_at = CURRENT_TIMESTAMP WHERE id = $2', [hash, req.user.id]);
    await blacklistUserTokens(req.user.id);
    // Revoke all refresh tokens
    await pool.query('UPDATE auth.refresh_tokens SET revoked = TRUE WHERE user_id = $1', [req.user.id]);
    res.json({ message: 'Password updated successfully. Please log in again.' });
}));

// ─── 2FA / TOTP ────────────────────────────────────────────────

router.post('/2fa/setup', requireAuth, asyncHandler(async (req, res) => {
    if (!(await dbAvailable())) return res.status(503).json({ error: 'Database unavailable' });
    const secret = speakeasy.generateSecret({ name: `Flower Ecosystem (${req.user.email})`, length: 20 });
    const otpauth = speakeasy.otpauthURL({ secret: secret.base32, label: `Flower Ecosystem (${req.user.email})`, issuer: 'Flower Ecosystem', encoding: 'base32' });
    const qr = await qrcode.toDataURL(otpauth);
    res.json({ secret: secret.base32, otpauth, qr });
}));

router.post('/2fa/enable', requireAuth, asyncHandler(async (req, res) => {
    const { secret, token } = req.body;
    if (!secret || !token) return res.status(400).json({ error: 'Secret and token required' });
    const verified = speakeasy.totp.verify({ secret, encoding: 'base32', token, window: 1 });
    if (!verified) return res.status(400).json({ error: 'Invalid token' });
    await pool.query('UPDATE auth.users SET two_factor_enabled = TRUE, two_factor_secret = $1 WHERE id = $2', [secret, req.user.id]);
    res.json({ message: 'Two-factor authentication enabled' });
}));

router.post('/2fa/disable', requireAuth, asyncHandler(async (req, res) => {
    const { password } = req.body;
    if (!password) return res.status(400).json({ error: 'Password required' });
    const r = await pool.query('SELECT password_hash FROM auth.users WHERE id = $1', [req.user.id]);
    if (!r.rows.length) return res.status(404).json({ error: 'User not found' });
    const valid = await bcrypt.compare(password, r.rows[0].password_hash);
    if (!valid) return res.status(401).json({ error: 'Incorrect password' });
    await pool.query('UPDATE auth.users SET two_factor_enabled = FALSE, two_factor_secret = NULL WHERE id = $1', [req.user.id]);
    res.json({ message: 'Two-factor authentication disabled' });
}));

// ─── Session Management ────────────────────────────────────────

router.get('/sessions', requireAuth, asyncHandler(async (req, res) => {
    if (!(await dbAvailable())) return res.json({ sessions: [] });
    try {
        const r = await pool.query(
            `SELECT id, user_agent, ip_address, created_at, expires_at, last_activity 
             FROM auth.sessions WHERE user_id = $1 AND expires_at > CURRENT_TIMESTAMP ORDER BY created_at DESC`,
            [req.user.id]
        );
        res.json({ sessions: r.rows });
    } catch { res.json({ sessions: [] }); }
}));

router.delete('/sessions/:id', requireAuth, asyncHandler(async (req, res) => {
    if (!(await dbAvailable())) return res.status(503).json({ error: 'Database unavailable' });
    await pool.query('DELETE FROM auth.sessions WHERE id = $1 AND user_id = $2', [req.params.id, req.user.id]);
    res.json({ message: 'Session revoked' });
}));

router.delete('/sessions', requireAuth, asyncHandler(async (req, res) => {
    if (!(await dbAvailable())) return res.status(503).json({ error: 'Database unavailable' });
    await pool.query('DELETE FROM auth.sessions WHERE user_id = $1 AND id != $2', [req.user.id, req.session_id]);
    await pool.query('UPDATE auth.refresh_tokens SET revoked = TRUE WHERE user_id = $1', [req.user.id]);
    res.json({ message: 'All other sessions revoked' });
}));

// ─── CSRF Token ────────────────────────────────────────────────

router.get('/csrf-token', asyncHandler(async (req, res) => {
    const csrfToken = crypto.randomBytes(32).toString('hex');
    res.cookie('csrf_token', csrfToken, CSRF_COOKIE_OPTIONS);
    res.json({ csrf_token: csrfToken });
}));

// ─── Account Lockout Helpers ──────────────────────────────────

async function recordFailedAttempt(email) {
    const now = new Date();
    const r = await pool.query(
        `INSERT INTO auth.login_attempts (email, failed_attempts, last_attempt, locked_until)
         VALUES ($1, 1, $2, NULL)
         ON CONFLICT (email) DO UPDATE SET
         failed_attempts = auth.login_attempts.failed_attempts + 1,
         last_attempt = $2,
         locked_until = CASE 
             WHEN auth.login_attempts.failed_attempts + 1 >= 5 THEN $2 + INTERVAL '15 minutes'
             ELSE auth.login_attempts.locked_until
         END
         RETURNING locked_until, failed_attempts`,
        [email, new Date()]
    );
    return r.rows[0];
}

async function resetFailedAttempts(email) {
    await pool.query('DELETE FROM auth.login_attempts WHERE email = $1', [email]);
}

module.exports = router;