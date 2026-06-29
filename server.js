require('dotenv').config();
const express = require('express');
const path = require('path');
const { pool, JWT_SECRET, rateLimiter } = require('./routes/middleware');
const bcrypt = require('bcryptjs');

const app = express();
const PORT = process.env.PORT || 3000;

if (!process.env.JWT_SECRET) {
    console.error("CRITICAL: JWT_SECRET environment variable is not set. Generate one with: node -e \"console.log(require('crypto').randomBytes(64).toString('hex'))\"");
    process.exit(1);
}

// ─── Middleware ─────────────────────────────────────────────────────────────

app.use(require('helmet')({
    contentSecurityPolicy: {
        directives: {
            defaultSrc: ["'self'"],
            scriptSrc: ["'self'", "'unsafe-inline'", "https://cdn.jsdelivr.net", "https://cdnjs.cloudflare.com"],
            scriptSrcAttr: ["'unsafe-inline'"],
            styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com", "https://cdn.jsdelivr.net", "https://cdnjs.cloudflare.com"],
            fontSrc: ["'self'", "https://fonts.gstatic.com", "https://cdn.jsdelivr.net", "https://cdnjs.cloudflare.com"],
            imgSrc: ["'self'", "data:", "https:", "blob:"],
            mediaSrc: ["'self'", "blob:"],
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
        const xRequestedWith = req.get('X-Requested-With');
        const hasAuth = !!req.get('Authorization');
        if (xRequestedWith !== 'XMLHttpRequest' && !hasAuth) {
            return res.status(403).json({ error: 'Missing required header' });
        }
    }
    next();
});

app.use(express.static(path.join(__dirname), {
    setHeaders: (res, filePath) => {
        if (filePath.endsWith('.html')) {
            res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
        } else if (filePath.match(/\.(js|css)$/)) {
            res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
        }
    }
}));

// General rate limiter
app.use(rateLimiter(
    parseInt(process.env.RATE_LIMIT_MAX, 10) || 100,
    parseInt(process.env.RATE_LIMIT_WINDOW_MS, 10) || 60000
));

// ─── Static page routes ────────────────────────────────────────────────────

app.get('/flowers/category/:slug', (_, res) => res.sendFile(path.join(__dirname, 'category-listing.html')));
app.get('/marketplace', (_, res) => res.sendFile(path.join(__dirname, 'marketplace.html')));
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

// ─── Navigation pages ──────────────────────────────────────────────────────

app.get('/garden-journal', (_, res) => res.sendFile(path.join(__dirname, 'garden-journal.html')));
app.get('/articles', (_, res) => res.sendFile(path.join(__dirname, 'articles.html')));
app.get('/care-guides', (_, res) => res.sendFile(path.join(__dirname, 'care-guides.html')));
app.get('/planting-calendar', (_, res) => res.sendFile(path.join(__dirname, 'planting-calendar.html')));
app.get('/identification', (_, res) => res.sendFile(path.join(__dirname, 'identification.html')));
app.get('/discussions', (_, res) => res.sendFile(path.join(__dirname, 'discussions.html')));
app.get('/questions', (_, res) => res.sendFile(path.join(__dirname, 'questions.html')));
app.get('/success-stories', (_, res) => res.sendFile(path.join(__dirname, 'success-stories.html')));
app.get('/events', (_, res) => res.sendFile(path.join(__dirname, 'events.html')));
app.get('/florists', (_, res) => res.sendFile(path.join(__dirname, 'florists.html')));
app.get('/plant-database', (_, res) => res.sendFile(path.join(__dirname, 'plant-database.html')));
app.get('/gallery', (_, res) => res.sendFile(path.join(__dirname, 'gallery.html')));
app.get('/reviews', (_, res) => res.sendFile(path.join(__dirname, 'reviews.html')));

// ─── Detail pages ──────────────────────────────────────────────────────────

app.get('/products/:id', (_, res) => res.sendFile(path.join(__dirname, 'product-detail.html')));
app.get('/articles/:id', (_, res) => res.sendFile(path.join(__dirname, 'article-detail.html')));
app.get('/events/:id', (_, res) => res.sendFile(path.join(__dirname, 'event-detail.html')));
app.get('/florists/:id', (_, res) => res.sendFile(path.join(__dirname, 'florist-profile.html')));
app.get('/care-guides/:id', (_, res) => res.sendFile(path.join(__dirname, 'care-guide-detail.html')));
app.get('/discussions/:id', (_, res) => res.sendFile(path.join(__dirname, 'discussion-detail.html')));
app.get('/questions/:id', (_, res) => res.sendFile(path.join(__dirname, 'question-detail.html')));
app.get('/success-stories/:id', (_, res) => res.sendFile(path.join(__dirname, 'success-story-detail.html')));

// ─── User & dashboard pages ────────────────────────────────────────────────

app.get('/sell', (_, res) => res.sendFile(path.join(__dirname, 'sell.html')));
app.get('/seller-dashboard', (_, res) => res.sendFile(path.join(__dirname, 'seller-dashboard.html')));
app.get('/buyer-dashboard', (_, res) => res.sendFile(path.join(__dirname, 'buyer-dashboard.html')));
app.get('/grower-dashboard', (_, res) => res.sendFile(path.join(__dirname, 'grower-dashboard.html')));
app.get('/create-listing', (_, res) => res.sendFile(path.join(__dirname, 'create-listing.html')));
app.get('/create-discussion', (_, res) => res.sendFile(path.join(__dirname, 'create-discussion.html')));
app.get('/create-story', (_, res) => res.sendFile(path.join(__dirname, 'create-story.html')));
app.get('/create-journal-entry', (_, res) => res.sendFile(path.join(__dirname, 'create-journal-entry.html')));
app.get('/ask-question', (_, res) => res.sendFile(path.join(__dirname, 'ask-question.html')));
app.get('/cart', (_, res) => res.sendFile(path.join(__dirname, 'cart.html')));
app.get('/checkout', (_, res) => res.sendFile(path.join(__dirname, 'checkout.html')));
app.get('/orders', (_, res) => res.sendFile(path.join(__dirname, 'orders.html')));
app.get('/favorites', (_, res) => res.sendFile(path.join(__dirname, 'favorites.html')));
app.get('/notifications', (_, res) => res.sendFile(path.join(__dirname, 'notifications.html')));
app.get('/messages', (_, res) => res.sendFile(path.join(__dirname, 'messages.html')));
app.get('/manage-orders', (_, res) => res.sendFile(path.join(__dirname, 'manage-orders.html')));
app.get('/profile', (_, res) => res.sendFile(path.join(__dirname, 'profile.html')));
app.get('/about', (_, res) => res.sendFile(path.join(__dirname, 'about.html')));
app.get('/search', (_, res) => res.sendFile(path.join(__dirname, 'search.html')));
app.get('/forgot-password', (_, res) => res.sendFile(path.join(__dirname, 'forgot-password.html')));
app.get('/contact', (_, res) => res.sendFile(path.join(__dirname, 'contact.html')));
app.get('/account', (_, res) => res.sendFile(path.join(__dirname, 'account.html')));
app.get('/terms', (_, res) => res.sendFile(path.join(__dirname, 'terms.html')));
app.get('/privacy', (_, res) => res.sendFile(path.join(__dirname, 'privacy.html')));

// ─── Database connection & seed ────────────────────────────────────────────

const PG_HOST = process.env.PG_HOST || 'localhost';
const PG_PORT = parseInt(process.env.PG_PORT, 10) || 5432;
const PG_DATABASE = process.env.PG_DATABASE || 'flower_ecosystem';
const PG_USER = process.env.PG_USER || 'postgres';

if (!PG_DATABASE || !PG_USER) {
    console.error('CRITICAL: PG_DATABASE and PG_USER must be set');
    process.exit(1);
}

if (!Number.isFinite(PG_PORT) || PG_PORT < 1 || PG_PORT > 65535) {
    console.error(`CRITICAL: Invalid PG_PORT: ${process.env.PG_PORT}`);
    process.exit(1);
}

const ADMIN_EMAIL = 'admin@flower.com';
if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(ADMIN_EMAIL)) {
    console.error('CRITICAL: Invalid admin seed email');
    process.exit(1);
}

pool.query('SELECT 1')
    .then(async () => {
        console.log('PostgreSQL connected');
        try {
            const tableExists = await pool.query(
                "SELECT EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'auth' AND table_name = 'users')"
            );
            if (tableExists.rows[0].exists) {
                await pool.query("ALTER TABLE auth.users ADD COLUMN IF NOT EXISTS location VARCHAR(255)");
                await pool.query("ALTER TABLE auth.users ADD COLUMN IF NOT EXISTS description TEXT");
                const adminExists = await pool.query("SELECT id FROM auth.users WHERE role = 'ADMIN' LIMIT 1");
                if (!adminExists.rows.length) {
                    const adminPassword = require('crypto').randomBytes(16).toString('hex');
                    if (adminPassword.length < 16) {
                        console.error('Seed aborted: generated password too short');
                        return;
                    }
                    const hash = await bcrypt.hash(adminPassword, 12);
                    if (!hash || hash.length < 60) {
                        console.error('Seed aborted: bcrypt hash failed');
                        return;
                    }
                    await pool.query(
                        "INSERT INTO auth.users (first_name, last_name, email, password_hash, role) VALUES ('Admin', 'User', $1, $2, 'ADMIN')",
                        [ADMIN_EMAIL, hash]
                    );
                    console.log(`Default admin created: ${ADMIN_EMAIL} — use the forgot password flow to set a secure password.`);
                }
            }
        } catch (seedErr) {
            if (seedErr.code === '42P01') {
                console.warn('auth.users table not found — skipping seed');
            } else {
                console.error('Seed failed:', seedErr.message);
            }
        }
    })
    .catch(e => console.warn('PostgreSQL unavailable — serving static files only:', e.message));

// ─── Uploads static ───────────────────────────────────────────────────────

const uploadsDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir, { recursive: true });
}
app.use('/uploads', require('express').static(uploadsDir));
app.use('/images', require('express').static(path.join(__dirname, 'images')));

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
app.use('/api/openai', require('./routes/openai'));
app.use('/api/users', require('./routes/users'));
app.use('/api', require('./routes/misc'));

// ─── Error handling ────────────────────────────────────────────────────────

app.use((req, res) => {
    if (req.accepts('html')) {
        res.status(404).sendFile(path.join(__dirname, '404.html'));
    } else {
        res.status(404).json({ error: 'Not found' });
    }
});

app.use((err, _req, res, _next) => {
    console.error('Unhandled error:', err.message);
    // Handle multer errors
    if (err.code === 'LIMIT_FILE_SIZE') {
        return res.status(413).json({ error: 'File too large. Max size is 5MB for images, 50MB for videos.' });
    }
    if (err.code === 'LIMIT_UNEXPECTED_FILE') {
        return res.status(400).json({ error: 'Too many files uploaded.' });
    }
    if (err.code === 'LIMIT_FILE_COUNT') {
        return res.status(400).json({ error: 'Too many files. Maximum is 10 images.' });
    }
    const status = err.status || 500;
    const message = process.env.NODE_ENV === 'production' ? 'Internal server error' : (err.message || 'Internal server error');
    if (_req.accepts('html')) {
        return res.status(status).sendFile(path.join(__dirname, '500.html'));
    }
    res.status(status).json({ error: message });
});

// ─── Start ─────────────────────────────────────────────────────────────────

app.listen(PORT, () => {
    console.log(`Flower Ecosystem running at http://localhost:${PORT}`);
});
