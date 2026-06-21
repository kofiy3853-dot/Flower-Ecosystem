require('dotenv').config();
const express = require('express');
const path = require('path');
const { pool, JWT_SECRET, rateLimiter } = require('./routes/middleware');

const app = express();
const PORT = process.env.PORT || 3000;

if (!process.env.JWT_SECRET) {
    console.error("CRITICAL: JWT_SECRET environment variable is not set. Generate one with: node -e \"console.log(require('crypto').randomBytes(64).toString('hex'))\"");
    process.exit(1);
}

// ─── Middleware ─────────────────────────────────────────────────────────────

const { helmet } = require('helmet')();
app.use(require('helmet')({
    contentSecurityPolicy: {
        directives: {
            defaultSrc: ["'self'"],
            scriptSrc: ["'self'", "'unsafe-inline'", "'unsafe-eval'", "https://cdn.jsdelivr.net", "https://cdnjs.cloudflare.com"],
            scriptSrcAttr: ["'unsafe-inline'"],
            styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com", "https://cdn.jsdelivr.net", "https://cdnjs.cloudflare.com"],
            fontSrc: ["'self'", "https://fonts.gstatic.com", "https://cdn.jsdelivr.net", "https://cdnjs.cloudflare.com"],
            imgSrc: ["'self'", "data:", "https:", "blob:"],
            connectSrc: ["'self'", "https:"],
            frameSrc: ["'self'", "https:"],
            objectSrc: ["'none'"],
        }
    },
    crossOriginEmbedderPolicy: false,
    referrerPolicy: { policy: 'strict-origin-when-cross-origin' }
}));

app.use(require('cors')({
    origin: process.env.CORS_ORIGIN ? process.env.CORS_ORIGIN.split(',') : 'http://localhost:3000',
    methods: ['GET', 'POST', 'PUT', 'DELETE'],
    credentials: true
}));

app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: false }));

// CSRF protection
app.use((req, res, next) => {
    if (['POST', 'PUT', 'PATCH', 'DELETE'].includes(req.method)) {
        const contentType = req.get('Content-Type') || '';
        if (contentType.includes('multipart/form-data')) return next();
        const xRequestedWith = req.get('X-Requested-With');
        if (xRequestedWith !== 'XMLHttpRequest' && !req.get('Authorization')) {
            return res.status(403).json({ error: 'Missing required header' });
        }
    }
    next();
});

app.use(express.static(path.join(__dirname)));

// General rate limiter
app.use(rateLimiter(
    parseInt(process.env.RATE_LIMIT_MAX, 10) || 100,
    parseInt(process.env.RATE_LIMIT_WINDOW_MS, 10) || 60000
));

// ─── Static page routes ────────────────────────────────────────────────────

app.get('/flowers/category/:slug', (_, res) => res.sendFile(path.join(__dirname, 'category-listing.html')));
app.get('/ai-scanner', (_, res) => res.sendFile(path.join(__dirname, 'ai-scanner.html')));
app.get('/admin', (_, res) => res.sendFile(path.join(__dirname, 'admin.html')));
app.get('/admin/flowers', (_, res) => res.sendFile(path.join(__dirname, 'admin-flowers.html')));
app.get('/composting', (_, res) => res.sendFile(path.join(__dirname, 'composting.html')));
app.get('/arrangements', (_, res) => res.sendFile(path.join(__dirname, 'arrangements.html')));
app.get('/gardening', (_, res) => res.sendFile(path.join(__dirname, 'gardening.html')));
app.get('/my-garden', (_, res) => res.sendFile(path.join(__dirname, 'my-garden.html')));
app.get('/bloom-calendar', (_, res) => res.sendFile(path.join(__dirname, 'bloom-calendar.html')));
app.get('/learn', (_, res) => res.sendFile(path.join(__dirname, 'learning.html')));
app.get('/flower-knowledge', (_, res) => res.sendFile(path.join(__dirname, 'flower-knowledge-hub.html')));
app.get('/flower-knowledge/:slug', (_, res) => res.sendFile(path.join(__dirname, 'flower-knowledge.html')));
app.get('/flower-quiz', (_, res) => res.sendFile(path.join(__dirname, 'flower-quiz.html')));
app.get('/learn/course/:id', (_, res) => res.sendFile(path.join(__dirname, 'course-detail.html')));
app.get('/learn/my-learning', (_, res) => res.sendFile(path.join(__dirname, 'my-learning.html')));
app.get('/courses/:id', (_, res) => res.sendFile(path.join(__dirname, 'course-detail.html')));
app.get('/identify/:slug', (_, res) => res.sendFile(path.join(__dirname, 'identification-detail.html')));
app.get('/identification/:slug', (_, res) => res.sendFile(path.join(__dirname, 'identification-detail.html')));
app.get('/videos/:id', (_, res) => res.sendFile(path.join(__dirname, 'video-detail.html')));
app.get('/watch/:id', (_, res) => res.sendFile(path.join(__dirname, 'video-detail.html')));
app.get('/tutorials/:id', (_, res) => res.sendFile(path.join(__dirname, 'tutorial-detail.html')));
app.get('/quizzes/:id', (_, res) => res.sendFile(path.join(__dirname, 'quiz-detail.html')));

// ─── Database connection & seed ────────────────────────────────────────────

const { Pool } = require('pg');
const bcrypt = require('bcryptjs');

const dbPool = new Pool({
    host: process.env.PG_HOST || 'localhost',
    port: process.env.PG_PORT || 5432,
    database: process.env.PG_DATABASE || 'flower_ecosystem',
    user: process.env.PG_USER || 'postgres',
    password: process.env.PG_PASSWORD || '',
});

dbPool.query('SELECT 1')
    .then(async () => {
        console.log('PostgreSQL connected');
        try {
            const tableExists = await dbPool.query(
                "SELECT EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'auth' AND table_name = 'users')"
            );
            if (tableExists.rows[0].exists) {
                await dbPool.query("ALTER TABLE auth.users ADD COLUMN IF NOT EXISTS location VARCHAR(255)");
                await dbPool.query("ALTER TABLE auth.users ADD COLUMN IF NOT EXISTS description TEXT");
                const adminExists = await dbPool.query("SELECT id FROM auth.users WHERE role = 'ADMIN' LIMIT 1");
                if (!adminExists.rows.length) {
                    const adminPassword = require('crypto').randomBytes(16).toString('hex');
                    const hash = await bcrypt.hash(adminPassword, 12);
                    await dbPool.query(
                        "INSERT INTO auth.users (first_name, last_name, email, password_hash, role) VALUES ('Admin', 'User', 'admin@flower.com', $1, 'ADMIN')",
                        [hash]
                    );
                    console.log(`Default admin created: admin@flower.com / Reset this password immediately!`);
                    console.log(`Temporary password: ${adminPassword}`);
                }
            }
        } catch (seedErr) {}
    })
    .catch(e => console.warn('PostgreSQL unavailable — serving static files only:', e.message));

// ─── Uploads static ───────────────────────────────────────────────────────

app.use('/uploads', require('express').static(path.join(__dirname, 'uploads')));

// ─── API Routes ────────────────────────────────────────────────────────────

app.use('/api/auth', require('./routes/auth'));
app.use('/api/products', require('./routes/products'));
app.use('/api/cart', require('./routes/cart'));
app.use('/api/orders', require('./routes/orders'));
app.use('/api/seller', require('./routes/seller'));
app.use('/api/buyer', require('./routes/buyer'));
app.use('/api/grower', require('./routes/grower'));
app.use('/api', require('./routes/learning'));
app.use('/api/knowledge', require('./routes/knowledge'));
app.use('/api/events', require('./routes/events'));
app.use('/api', require('./routes/community'));
app.use('/api', require('./routes/garden'));
app.use('/api/care-guides', require('./routes/care-guides'));
app.use('/api/admin', require('./routes/admin'));
app.use('/api/notifications', require('./routes/notifications'));
app.use('/api/messages', require('./routes/notifications'));
app.use('/api/qa', require('./routes/qa'));
app.use('/api/identification', require('./routes/identification'));
app.use('/api/openrouter', require('./routes/openrouter'));
app.use('/api/openai', require('./routes/openai'));
app.use('/api', require('./routes/misc'));

// ─── Error handling ────────────────────────────────────────────────────────

app.use((req, res) => {
    if (req.accepts('html')) {
        res.status(404).sendFile(path.join(__dirname, 'index.html'));
    } else {
        res.status(404).json({ error: 'Not found' });
    }
});

app.use((err, _req, res, _next) => {
    console.error('Unhandled error:', err.message);
    const status = err.status || 500;
    const message = process.env.NODE_ENV === 'production' ? 'Internal server error' : (err.message || 'Internal server error');
    if (_req.accepts('html')) {
        return res.status(status).sendFile(path.join(__dirname, '500.html'));
    }
    res.status(status).json({ error: message });
});

// ─── Catch-all for SPA-style routing ───────────────────────────────────────

app.use((req, res) => {
    if (req.accepts('html') && !req.path.startsWith('/api/')) {
        res.status(404).sendFile(path.join(__dirname, '404.html'));
    } else {
        res.status(404).json({ error: 'Not found' });
    }
});

// ─── Start ─────────────────────────────────────────────────────────────────

app.listen(PORT, () => {
    console.log(`Flower Ecosystem running at http://localhost:${PORT}`);
});
