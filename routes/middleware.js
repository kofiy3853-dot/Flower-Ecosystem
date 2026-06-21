const { Pool } = require('pg');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const fs = require('fs');
const path = require('path');
const multer = require('multer');
const crypto = require('crypto');

const pool = new Pool({
    host: process.env.PG_HOST || 'localhost',
    port: process.env.PG_PORT || 5432,
    database: process.env.PG_DATABASE || 'flower_ecosystem',
    user: process.env.PG_USER || 'postgres',
    password: process.env.PG_PASSWORD || '',
});

const JWT_SECRET = process.env.JWT_SECRET;

const storage = multer.diskStorage({
    destination: (req, file, cb) => cb(null, path.join(__dirname, '..', 'uploads')),
    filename: (req, file, cb) => {
        const ext = path.extname(file.originalname).toLowerCase();
        cb(null, `${Date.now()}-${crypto.randomBytes(8).toString('hex')}${ext}`);
    }
});

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

function rateLimiter(maxRequests = 100, windowMs = 60000) {
    const rateLimitStore = new Map();

    setInterval(() => {
        const now = Date.now();
        for (const [ip, timestamps] of rateLimitStore.entries()) {
            const valid = timestamps.filter(t => now - t < windowMs);
            if (valid.length === 0) {
                rateLimitStore.delete(ip);
            } else {
                rateLimitStore.set(ip, valid);
            }
        }
    }, windowMs);

    return (req, res, next) => {
        const ip = req.ip || req.connection.remoteAddress || 'unknown';
        const now = Date.now();
        if (!rateLimitStore.has(ip)) {
            rateLimitStore.set(ip, []);
        }
        const timestamps = rateLimitStore.get(ip).filter(t => now - t < windowMs);
        if (timestamps.length >= maxRequests) {
            return res.status(429).json({ error: 'Too many requests, please try again later' });
        }
        timestamps.push(now);
        rateLimitStore.set(ip, timestamps);
        next();
    };
}

function asyncHandler(fn) {
    return (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);
}

function escapeHtml(str) {
    if (typeof str !== 'string') return String(str || '');
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
        }
    }
    const fallback = readJSON(path.join(__dirname, '..', 'data', jsonKey + '.json'));
    res.json(fallbackFn ? fallbackFn(fallback) : fallback);
}

function requireAuth(req, res, next) {
    const header = req.headers.authorization;
    if (!header) return res.status(401).json({ error: 'Authorization required' });
    try {
        req.user = jwt.verify(header.replace('Bearer ', ''), JWT_SECRET);
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
    requireRole('SELLER', 'FLORIST', 'ADMIN', 'SUPERADMIN')(req, res, next);
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
};
