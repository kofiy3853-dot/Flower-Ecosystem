const { Pool } = require('pg');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const fs = require('fs');
const path = require('path');
const multer = require('multer');
const crypto = require('crypto');

const useCloudinary = process.env.CLOUDINARY_CLOUD_NAME && process.env.CLOUDINARY_API_KEY && process.env.CLOUDINARY_API_SECRET;

let cloudinary;
let CloudinaryStorage;
let cloudinaryConfigured = false;

function initCloudinary() {
    if (cloudinaryConfigured) return;
    if (useCloudinary) {
        try {
            cloudinary = require('cloudinary').v2;
            CloudinaryStorage = require('multer-storage-cloudinary').CloudinaryStorage;
            cloudinary.config({
                cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
                api_key: process.env.CLOUDINARY_API_KEY,
                api_secret: process.env.CLOUDINARY_API_SECRET
            });
            cloudinaryConfigured = true;
            console.log('Cloudinary configured successfully');
        } catch (err) {
            console.warn('Cloudinary packages not installed, falling back to local storage:', err.message);
        }
    } else {
        console.log('Cloudinary not configured, using local disk storage');
    }
}

initCloudinary();

function getFileUrl(file) {
    if (!file) return null;
    if (cloudinaryConfigured && cloudinary) {
        return file.path; // Cloudinary URL
    } else {
        return `/uploads/${file.filename}`;
    }
}

const pool = new Pool({
    connectionString: process.env.DATABASE_URL || undefined,
    host: process.env.DATABASE_URL ? undefined : (process.env.PG_HOST || 'localhost'),
    port: process.env.DATABASE_URL ? undefined : (process.env.PG_PORT || 5432),
    database: process.env.DATABASE_URL ? undefined : (process.env.PG_DATABASE || 'flower_ecosystem'),
    user: process.env.DATABASE_URL ? undefined : (process.env.PG_USER || 'postgres'),
    password: process.env.DATABASE_URL ? undefined : (process.env.PG_PASSWORD || ''),
    ssl: process.env.DATABASE_URL ? { rejectUnauthorized: false } : (process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false),
});

const JWT_SECRET = process.env.JWT_SECRET;

const blacklistedTokens = new Set();

function hashToken(token) {
    return crypto.createHash('sha256').update(token).digest('hex');
}

function isTokenBlacklisted(token) {
    return blacklistedTokens.has(hashToken(token));
}

async function blacklistToken(token) {
    try {
        const decoded = jwt.decode(token);
        if (!decoded) return;
        const hash = hashToken(token);
        blacklistedTokens.add(hash);
        const expMs = (decoded.exp || 0) * 1000;
        const expiresAt = new Date(expMs);
        await pool.query(
            'INSERT INTO auth.token_blacklist (token_hash, user_id, expires_at) VALUES ($1, $2, $3) ON CONFLICT DO NOTHING',
            [hash, decoded.id, expiresAt]
        );
    } catch {}
}

function cleanupBlacklist() {
    const now = Date.now();
    pool.query('DELETE FROM auth.token_blacklist WHERE expires_at < CURRENT_TIMESTAMP').catch(() => {});
    pool.query('SELECT token_hash, expires_at FROM auth.token_blacklist').then(r => {
        const validHashes = new Set();
        for (const row of r.rows) {
            if (new Date(row.expires_at).getTime() > now) {
                validHashes.add(row.token_hash);
            }
        }
        for (const hash of blacklistedTokens) {
            if (!validHashes.has(hash)) {
                blacklistedTokens.delete(hash);
            }
        }
    }).catch(() => {});
}

// Load persisted blacklist from DB into memory on startup so tokens
// blacklisted before a restart remain invalid across server restarts.
async function loadBlacklistFromDb() {
    try {
        const r = await pool.query(
            'SELECT token_hash FROM auth.token_blacklist WHERE expires_at > CURRENT_TIMESTAMP'
        );
        for (const row of r.rows) {
            blacklistedTokens.add(row.token_hash);
        }
        if (r.rows.length) {
            console.log(`Token blacklist restored: ${r.rows.length} entries loaded from DB`);
        }
    } catch {
        // Table may not exist yet (first boot before migrations) — non-fatal
    }
}

// Hydrate on startup (non-blocking)
loadBlacklistFromDb();

async function blacklistUserTokens(userId) {
    try {
        const userHash = crypto.createHash('sha256').update(`user:${userId}`).digest('hex');
        blacklistedTokens.add(userHash);
        await pool.query(
            'INSERT INTO auth.token_blacklist (token_hash, user_id, expires_at) VALUES ($1, $2, CURRENT_TIMESTAMP + INTERVAL \'7 days\') ON CONFLICT DO NOTHING',
            [userHash, userId]
        );
    } catch {}
}

// Configure storage based on Cloudinary availability
let storage;
if (cloudinaryConfigured && cloudinary && CloudinaryStorage) {
    storage = new CloudinaryStorage({
        cloudinary,
        params: {
            folder: 'flower-ecosystem',
            allowed_formats: ['jpg', 'jpeg', 'png', 'webp', 'gif'],
            transformation: [{ width: 1200, height: 1200, crop: 'limit' }]
        }
    });
    console.log('Using Cloudinary for image storage');
} else {
    const uploadsDir = path.join(__dirname, '..', 'uploads');
    if (!fs.existsSync(uploadsDir)) {
        fs.mkdirSync(uploadsDir, { recursive: true });
    }
    storage = multer.diskStorage({
        destination: (req, file, cb) => cb(null, uploadsDir),
        filename: (req, file, cb) => {
            const ext = path.extname(file.originalname).toLowerCase();
            cb(null, `${Date.now()}-${crypto.randomBytes(8).toString('hex')}${ext}`);
        }
    });
    console.log('Using local disk for image storage');
}

const upload = multer({
    storage,
    limits: { fileSize: 5 * 1024 * 1024 },
    fileFilter: (req, file, cb) => {
        const allowed = /\.(jpg|jpeg|png|webp|gif)$/i;
        if (allowed.test(path.extname(file.originalname)) && file.mimetype.startsWith('image/')) {
            cb(null, true);
        } else {
            cb(new Error('Only image files (jpg, png, webp, gif) are allowed'));
        }
    }
});

// Video storage
let videoStorage;
if (useCloudinary && cloudinary && CloudinaryStorage) {
    videoStorage = new CloudinaryStorage({
        cloudinary,
        params: {
            folder: 'flower-ecosystem/videos',
            resource_type: 'video',
            allowed_formats: ['mp4', 'webm', 'mov'],
            transformation: [{ width: 1280, height: 720, crop: 'limit' }]
        }
    });
} else {
    videoStorage = storage;
}

const uploadVideo = multer({
    storage: videoStorage,
    limits: { fileSize: 50 * 1024 * 1024 },
    fileFilter: (req, file, cb) => {
        const allowed = /\.(mp4|webm|mov|avi|mkv)$/i;
        const videoMimes = ['video/mp4', 'video/webm', 'video/quicktime', 'video/x-msvideo', 'video/x-matroska'];
        if (allowed.test(path.extname(file.originalname)) || videoMimes.includes(file.mimetype)) {
            cb(null, true);
        } else {
            cb(new Error('Only video files (mp4, webm, mov, avi, mkv) are allowed'));
        }
    }
});

function rateLimiter(maxRequests = 100, windowMs = 60000) {
    const store = new Map();

    return (req, res, next) => {
        const ip = req.ip || req.connection.remoteAddress || 'unknown';
        const now = Date.now();
        let timestamps = store.get(ip);
        if (!timestamps) {
            timestamps = [];
            store.set(ip, timestamps);
        }
        const valid = timestamps.filter(t => now - t < windowMs);
        if (valid.length === 0) {
            store.delete(ip);
        } else {
            if (valid.length !== timestamps.length) {
                store.set(ip, valid);
                timestamps = valid;
            }
        }
        if (timestamps.length >= maxRequests) {
            return res.status(429).json({ error: 'Too many requests, please try again later' });
        }
        timestamps.push(now);
        next();
    };
}

function asyncHandler(fn) {
    return (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);
}

function escapeHtml(str) {
    if (str === null || str === undefined) return '';
    if (typeof str !== 'string') return String(str);
    return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#039;');
}

async function dbAvailable() {
    try {
        await pool.query('SELECT 1');
        return true;
    } catch {
        return false;
    }
}

function readJSON(filePath) {
    try {
        const data = fs.readFileSync(filePath, 'utf8');
        return JSON.parse(data);
    } catch {
        return [];
    }
}

async function queryWithFallback(queryFn, jsonKey, res, single = false, fallbackFn = null) {
    if (await dbAvailable()) {
        try {
            const data = await queryFn();
            if (data && data._notFound) {
                return res.status(404).json({ error: 'Not found' });
            }
            return res.json(data);
        } catch (err) {
            console.error('Query fallback error:', err.message.split('\n')[0].slice(0, 120));
            // Fall through to JSON fallback instead of returning empty
        }
    }
    const filePath = path.join(__dirname, '..', 'data', jsonKey + '.json');
    const fallback = readJSON(filePath);
    console.warn(`⚠️  Fallback [${jsonKey}] — DB unavailable or query failed, serving data from ${filePath}`);
    res.json(fallbackFn ? fallbackFn(fallback) : fallback);
}

async function requireAuth(req, res, next) {
    const header = req.headers.authorization;
    if (!header) return res.status(401).json({ error: 'Authorization required' });
    try {
        const token = header.replace('Bearer ', '');
        const decoded = jwt.verify(token, JWT_SECRET);
        req.user = decoded;
        if (isTokenBlacklisted(token)) {
            return res.status(401).json({ error: 'Token has been revoked' });
        }
        const userHash = crypto.createHash('sha256').update(`user:${decoded.id}`).digest('hex');
        if (blacklistedTokens.has(userHash)) {
            return res.status(401).json({ error: 'Token has been revoked' });
        }
        // DB fallback for user-level blacklist after restart
        try {
            const r = await pool.query('SELECT 1 FROM auth.token_blacklist WHERE user_id = $1 AND token_hash = $2 AND expires_at > CURRENT_TIMESTAMP', [decoded.id, userHash]);
            if (r.rows.length) {
                blacklistedTokens.add(userHash);
                return res.status(401).json({ error: 'Token has been revoked' });
            }
        } catch {}
        next();
    } catch {
        res.status(401).json({ error: 'Invalid or expired token' });
    }
}

function requireAdmin(req, res, next) {
    requireAuth(req, res, () => {
        const userRole = (req.user.role || '').toUpperCase();
        if (userRole === 'ADMIN' || userRole === 'SUPERADMIN') {
            next();
        } else {
            return res.status(403).json({ error: 'Admin access required' });
        }
    });
}

function requireRole(...allowedRoles) {
    const allowed = allowedRoles.map(r => r.toUpperCase());
    return (req, res, next) => {
        requireAuth(req, res, () => {
            const userRole = (req.user.role || '').toUpperCase();
            if (allowed.includes(userRole)) {
                next();
            } else {
                res.status(403).json({ error: 'Insufficient permissions' });
            }
        });
    };
}

function requireSeller(req, res, next) {
    requireRole('SELLER', 'FLORIST', 'GROWER', 'ADMIN', 'SUPERADMIN')(req, res, next);
}

function requireInstructor(req, res, next) {
    requireRole('INSTRUCTOR', 'ADMIN', 'SUPERADMIN')(req, res, next);
}

function requireModerator(req, res, next) {
    requireRole('MODERATOR', 'ADMIN', 'SUPERADMIN')(req, res, next);
}

function requireSuperAdmin(req, res, next) {
    requireRole('SUPERADMIN')(req, res, next);
}

module.exports = {
    pool,
    JWT_SECRET,
    upload,
    uploadVideo,
    rateLimiter,
    asyncHandler,
    escapeHtml,
    dbAvailable,
    readJSON,
    queryWithFallback,
    requireAuth,
    requireAdmin,
    requireRole,
    requireSeller,
    requireInstructor,
    requireModerator,
    requireSuperAdmin,
    blacklistToken,
    blacklistUserTokens,
    cleanupBlacklist,
    getFileUrl,
    useCloudinary,
};
