require('dotenv').config();
const express = require('express');
const path = require('path');
const fs = require('fs');
const compression = require('compression');
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
            scriptSrc: ["'self'", "'unsafe-inline'", "'unsafe-eval'", "https://cdn.jsdelivr.net", "https://cdnjs.cloudflare.com", "https://unpkg.com"],
            scriptSrcAttr: ["'unsafe-inline'"],
            styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com", "https://cdn.jsdelivr.net", "https://cdnjs.cloudflare.com", "https://unpkg.com"],
            fontSrc: ["'self'", "https://fonts.gstatic.com", "https://cdn.jsdelivr.net", "https://cdnjs.cloudflare.com", "https://unpkg.com"],
            imgSrc: ["'self'", "data:", "https:", "http:", "blob:"],
            mediaSrc: ["'self'", "blob:", "https:", "http:", "data:"],
            connectSrc: ["'self'", "https:", "http:"],
            frameSrc: ["'self'", "https:"],
            objectSrc: ["'none'"],
        }
    },
    crossOriginEmbedderPolicy: false,
    referrerPolicy: { policy: 'strict-origin-when-cross-origin' }
}));

// Gzip / Brotli compression — shrinks JS, CSS, HTML, JSON over the wire
app.use(compression({ threshold: 1024 }));

app.use(require('cors')({
    origin: process.env.CORS_ORIGIN ? process.env.CORS_ORIGIN.split(',') : ['http://localhost:3000', 'https://flower-ecosystem.onrender.com'],
    methods: ['GET', 'POST', 'PUT', 'DELETE'],
    credentials: true
}));

app.set('trust proxy', 1);
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: false }));

// CSRF protection — block form-encoded cross-origin POSTs
app.use((req, res, next) => {
    if (['POST', 'PUT', 'PATCH', 'DELETE'].includes(req.method)) {
        const xRequestedWith = req.get('X-Requested-With');
        const hasAuth = !!req.get('Authorization');
        const contentType = req.get('Content-Type') || '';
        const isJson = contentType.includes('application/json');
        const isMultipart = contentType.includes('multipart/form-data');
        if (xRequestedWith !== 'XMLHttpRequest' && !hasAuth && !isJson && !isMultipart) {
            return res.status(403).json({ error: 'Missing required header' });
        }
    }
    next();
});

app.get('/favicon.ico', (req, res) => res.redirect('/favicon.svg'));
app.use(express.static(path.join(__dirname), {
    setHeaders: (res, filePath) => {
        if (filePath.endsWith('.html')) {
            res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
        } else if (filePath.match(/\.(js|css)$/)) {
            res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
        } else if (filePath.match(/\.(jpg|jpeg|png|gif|webp|svg|ico)$/i)) {
            // Cache images for 30 days — single biggest bandwidth win
            res.setHeader('Cache-Control', 'public, max-age=2592000, stale-while-revalidate=86400');
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
app.get('/flower-encyclopedia', (_, res) => res.sendFile(path.join(__dirname, 'flower-encyclopedia.html')));
app.get('/flower-meanings', (_, res) => res.sendFile(path.join(__dirname, 'flower-meanings.html')));
app.get('/flower-finder', (_, res) => res.sendFile(path.join(__dirname, 'flower-finder.html')));
app.get('/care-guides-hub', (_, res) => res.sendFile(path.join(__dirname, 'care-guides-hub.html')));
app.get('/care-guide', (_, res) => res.sendFile(path.join(__dirname, 'care-guide-detail.html')));
app.get('/flower/:slug', (_, res) => res.sendFile(path.join(__dirname, 'flower-detail.html')));
app.get('/admin', (_, res) => res.sendFile(path.join(__dirname, 'admin.html')));
app.get('/admin/flowers', (_, res) => res.sendFile(path.join(__dirname, 'admin-flowers.html')));
app.get('/admin/category-images', (_, res) => res.sendFile(path.join(__dirname, 'admin-category-images.html')));
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
app.get('/members', (_, res) => res.sendFile(path.join(__dirname, 'members.html')));
app.get('/showcase', (_, res) => res.sendFile(path.join(__dirname, 'showcase.html')));
app.get('/clubs', (_, res) => res.sendFile(path.join(__dirname, 'clubs.html')));

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
app.get('/following', (_, res) => res.sendFile(path.join(__dirname, 'following.html')));
app.get('/my-activities', (_, res) => res.sendFile(path.join(__dirname, 'my-activities.html')));
app.get('/learning-path', (_, res) => res.sendFile(path.join(__dirname, 'learning-path.html')));
app.get('/learning-paths', (_, res) => res.sendFile(path.join(__dirname, 'learning-paths.html')));
app.get('/instructors', (_, res) => res.sendFile(path.join(__dirname, 'instructors.html')));
app.get('/become-instructor', (_, res) => res.sendFile(path.join(__dirname, 'instructor-apply.html')));
app.get('/instructor-dashboard', (_, res) => res.sendFile(path.join(__dirname, 'instructor-dashboard.html')));
app.get('/workshop', (_, res) => res.sendFile(path.join(__dirname, 'workshop-detail.html')));
app.get('/live-classes', (_, res) => res.sendFile(path.join(__dirname, 'live-classes.html')));
app.get('/student-dashboard', (_, res) => res.sendFile(path.join(__dirname, 'student-dashboard.html')));
app.get('/assignments', (_, res) => res.sendFile(path.join(__dirname, 'assignments.html')));
app.get('/quizzes', (_, res) => res.sendFile(path.join(__dirname, 'quizzes.html')));
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
const SUPERADMIN_EMAIL = 'superadmin@flower.com';
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

                // Seed Admin
                const adminExists = await pool.query("SELECT id, email FROM auth.users WHERE role = 'ADMIN' LIMIT 1");
                if (!adminExists.rows.length) {
                    const adminPassword = process.env.ADMIN_PASSWORD;
                    if (!adminPassword) {
                        console.error('SEED FAILED: ADMIN_PASSWORD env var not set — no admin account created');
                        console.error('Set ADMIN_PASSWORD in Render dashboard → Environment');
                        return;
                    }
                    if (adminPassword.length < 12) {
                        console.error(`SEED FAILED: ADMIN_PASSWORD is ${adminPassword.length} chars (minimum 12)`);
                        return;
                    }
                    const hash = await bcrypt.hash(adminPassword, 12);
                    if (!hash || hash.length < 60) {
                        console.error('SEED FAILED: bcrypt hash produced invalid output');
                        return;
                    }
                    await pool.query(
                        "INSERT INTO auth.users (first_name, last_name, email, password_hash, role) VALUES ('Admin', 'User', $1, $2, 'ADMIN')",
                        [ADMIN_EMAIL, hash]
                    );
                    console.log(`SUCCESS: Admin seeded → ${ADMIN_EMAIL}`);
                } else {
                    console.log(`Admin already exists: ${adminExists.rows[0].email} (id: ${adminExists.rows[0].id})`);
                }

                // Seed Super Admin
                try {
                    const superAdminExists = await pool.query("SELECT id, email FROM auth.users WHERE role = 'SUPERADMIN' LIMIT 1");
                    if (!superAdminExists.rows.length) {
                        const superAdminPassword = process.env.SUPERADMIN_PASSWORD || process.env.ADMIN_PASSWORD;
                        if (superAdminPassword && superAdminPassword.length >= 12) {
                            const hash = await bcrypt.hash(superAdminPassword, 12);
                            await pool.query(
                                "INSERT INTO auth.users (first_name, last_name, email, password_hash, role) VALUES ('Super', 'Admin', $1, $2, 'SUPERADMIN')",
                                [SUPERADMIN_EMAIL, hash]
                            );
                            console.log(`SUCCESS: Super Admin seeded → ${SUPERADMIN_EMAIL}`);
                        } else {
                            console.log('Super Admin skipped: No valid password set (SUPERADMIN_PASSWORD or ADMIN_PASSWORD)');
                        }
                    } else {
                        console.log(`Super Admin already exists: ${superAdminExists.rows[0].email} (id: ${superAdminExists.rows[0].id})`);
                    }
                } catch (e) {
                    console.log('Super Admin seed error:', e.message);
                }
            } else {
                console.warn('auth.users table does not exist — run db-init.js first');
            }
        } catch (seedErr) {
            if (seedErr.code === '42P01') {
                console.warn('auth.users table not found — skipping seed');
            } else {
                console.error('Seed error:', seedErr.message);
            }
        }
    })
    .catch(e => console.warn('PostgreSQL unavailable — serving static files only:', e.message));

// ─── Static files with cache headers ──────────────────────────────────────

const uploadsDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir, { recursive: true });
}

// Cache static assets for 1 day
app.use('/images', require('express').static(path.join(__dirname, 'images'), { maxAge: '1d' }));
app.use('/uploads', require('express').static(uploadsDir, { maxAge: '1d' }));

// Cache CSS/JS for 1 week in production
const staticOptions = process.env.NODE_ENV === 'production' ? { maxAge: '7d', immutable: true } : {};
app.use('/styles', require('express').static(path.join(__dirname, 'styles'), staticOptions));
app.use('/js', require('express').static(path.join(__dirname, 'js'), staticOptions));

// ─── API Routes ────────────────────────────────────────────────────────────

app.use('/api/auth', require('./routes/auth'));
app.use('/api/products', require('./routes/products'));
app.use('/api/cart', require('./routes/cart'));
app.use('/api/orders', require('./routes/orders'));
app.use('/api/seller', require('./routes/seller'));
app.use('/api/buyer', require('./routes/buyer'));
app.use('/api/grower', require('./routes/grower'));
app.use('/api/upload', require('./routes/upload'));
app.use('/api', require('./routes/learning'));
app.use('/api/knowledge', require('./routes/knowledge'));
app.use('/api/events', require('./routes/events'));
app.use('/api', require('./routes/community'));
app.use('/api/feed', require('./routes/feed'));
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
app.use('/api', require('./routes/showcase'));
app.use('/api', require('./routes/clubs'));
app.use('/api', require('./routes/badges'));
app.use('/api', require('./routes/members'));
app.use('/api/instructor', require('./routes/instructor'));
app.use('/api', require('./routes/my-activities'));
app.use('/api', require('./routes/flower-encyclopedia'));
app.use('/api', require('./routes/flower-meanings'));
app.use('/api', require('./routes/care-guides-enhanced'));
app.use('/api', require('./routes/category-images'));

// ─── Error handling ────────────────────────────────────────────────────────

app.use((req, res) => {
    if (req.accepts('html')) {
        res.status(404).sendFile(path.join(__dirname, '404.html'));
    } else {
        res.status(404).json({ error: 'Not found' });
    }
});

app.use((err, _req, res, _next) => {
    // Ignore client disconnects — these are normal (page nav, refresh, timeouts)
    if (err.code === 'ECONNRESET' || err.type === 'aborted' || err.message === 'Request aborted') return;
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

// ─── WebSocket Server ─────────────────────────────────────────────────────

const http = require('http');
const WebSocket = require('ws');
const jwt = require('jsonwebtoken');

const server = http.createServer(app);
const wss = new WebSocket.Server({ server });

// Store connected clients: { userId: Set<WebSocket> }
const clients = new Map();

wss.on('connection', (ws, req) => {
    let userId = null;

    // Authenticate on connect
    ws.on('message', (data) => {
        try {
            const msg = JSON.parse(data);

            if (msg.type === 'auth') {
                const token = msg.token;
                if (!token) {
                    ws.send(JSON.stringify({ type: 'error', message: 'No token provided' }));
                    ws.close();
                    return;
                }
                try {
                    const decoded = jwt.verify(token, JWT_SECRET);
                    userId = decoded.id;
                    if (!clients.has(userId)) clients.set(userId, new Set());
                    clients.get(userId).add(ws);
                    ws.send(JSON.stringify({ type: 'auth', status: 'ok', userId }));
                    console.log(`WebSocket: User ${userId} connected`);
                } catch (err) {
                    ws.send(JSON.stringify({ type: 'error', message: 'Invalid token' }));
                    ws.close();
                }
            }

            if (msg.type === 'message' && userId) {
                // Broadcast to recipient
                const recipientId = msg.recipientId;
                if (recipientId && clients.has(recipientId)) {
                    const recipientClients = clients.get(recipientId);
                    const payload = JSON.stringify({
                        type: 'message',
                        conversationId: msg.conversationId,
                        content: msg.content,
                        senderId: userId,
                        senderName: msg.senderName,
                        createdAt: new Date().toISOString()
                    });
                    recipientClients.forEach(client => {
                        if (client.readyState === WebSocket.OPEN) {
                            client.send(payload);
                        }
                    });
                }
            }

            if (msg.type === 'typing' && userId) {
                const recipientId = msg.recipientId;
                if (recipientId && clients.has(recipientId)) {
                    const recipientClients = clients.get(recipientId);
                    const payload = JSON.stringify({
                        type: 'typing',
                        conversationId: msg.conversationId,
                        senderId: userId,
                        senderName: msg.senderName
                    });
                    recipientClients.forEach(client => {
                        if (client.readyState === WebSocket.OPEN) {
                            client.send(payload);
                        }
                    });
                }
            }

        } catch (err) {
            console.error('WebSocket message error:', err.message);
        }
    });

    ws.on('close', () => {
        if (userId && clients.has(userId)) {
            clients.get(userId).delete(ws);
            if (clients.get(userId).size === 0) {
                clients.delete(userId);
            }
            console.log(`WebSocket: User ${userId} disconnected`);
        }
    });

    ws.on('error', (err) => {
        console.error('WebSocket error:', err.message);
    });
});

// ─── Start ─────────────────────────────────────────────────────────────────

server.listen(PORT, () => {
    console.log(`Flower Ecosystem running at http://localhost:${PORT}`);
});
