const router = require('express').Router();
const jwt = require('jsonwebtoken');
const { pool, JWT_SECRET, upload, rateLimiter, asyncHandler, dbAvailable, readJSON, requireAuth, getFileUrl } = require('./middleware');

router.get('/categories', asyncHandler(async (_, res) => {
    if (!(await dbAvailable())) {
        return res.json([
            { id: 1, name: 'Floristry Workshops', slug: 'floristry-workshops', icon: '✂️' },
            { id: 2, name: 'Flower Care', slug: 'flower-care', icon: '🌿' },
            { id: 3, name: 'Gardening', slug: 'gardening', icon: '🌱' },
            { id: 4, name: 'Medicinal Plants', slug: 'medicinal-plants', icon: '💊' },
            { id: 5, name: 'Business & Marketing', slug: 'business-marketing', icon: '💼' },
            { id: 6, name: 'Flower Identification', slug: 'flower-identification', icon: '🔍' },
            { id: 7, name: 'Webinars', slug: 'webinars', icon: '💻' },
            { id: 8, name: 'Exhibitions', slug: 'exhibitions', icon: '🖼️' },
            { id: 9, name: 'Competitions', slug: 'competitions', icon: '🏆' }
        ]);
    }
    try {
        const r = await pool.query('SELECT * FROM events.event_categories ORDER BY sort_order');
        return res.json(r.rows);
    } catch { return res.json([]); }
}));

router.get('/', asyncHandler(async (req, res) => {
    const { category, search, type, status = 'upcoming', sort = 'date', page = 1, limit = 20, featured } = req.query;

    if (await dbAvailable()) {
        try {
            const conditions = [];
            const values = [];
            let idx = 1;

            if (status === 'upcoming') { conditions.push(`e.event_date >= CURRENT_TIMESTAMP`); }
            else if (status === 'past') { conditions.push(`e.event_date < CURRENT_TIMESTAMP`); }
            if (category) { conditions.push(`e.event_category = $${idx}`); values.push(category); idx++; }
            if (type) { conditions.push(`e.event_type = $${idx}`); values.push(type.toUpperCase()); idx++; }
            if (search) { conditions.push(`(e.title ILIKE $${idx} OR e.description ILIKE $${idx})`); values.push(`%${search}%`); idx++; }
            if (featured === 'true') { conditions.push(`e.is_featured = true`); }

            const where = conditions.length ? 'WHERE ' + conditions.join(' AND ') : '';
            const sortMap = { date: 'e.event_date ASC', newest: 'e.created_at DESC', price_low: 'e.price ASC', price_high: 'e.price DESC', popular: 'reg_count DESC' };
            const orderBy = sortMap[sort] || 'e.event_date ASC';

            const pg = Math.max(1, parseInt(page, 10) || 1);
            const lim = Math.min(100, Math.max(1, parseInt(limit, 10) || 20));
            const offset = (pg - 1) * lim;

            const countQ = `SELECT COUNT(*) FROM events.events e ${where}`;
            const countR = await pool.query(countQ, values);
            const total = parseInt(countR.rows[0].count, 10);

            values.push(lim);
            values.push(offset);

            const dataQ = `
                SELECT e.*,
                    COALESCE(rc.reg_count, 0) AS registrations,
                    COALESCE(sp.speakers, '[]'::json) AS speakers,
                    (SELECT image_url FROM events.event_speakers WHERE event_id = e.id ORDER BY sort_order LIMIT 1) AS instructor_image
                FROM events.events e
                LEFT JOIN (SELECT event_id, COUNT(*) AS reg_count FROM events.event_registrations GROUP BY event_id) rc ON rc.event_id = e.id
                LEFT JOIN (SELECT event_id, json_agg(json_build_object('name', name, 'photo_url', photo_url) ORDER BY sort_order) AS speakers FROM events.event_speakers GROUP BY event_id) sp ON sp.event_id = e.id
                ${where}
                ORDER BY e.is_featured DESC, ${orderBy}
                LIMIT $${idx} OFFSET $${idx + 1}`;

            const dataR = await pool.query(dataQ, values);

            // If database has results, return them
            if (dataR.rows.length > 0) {
                return res.json({ events: dataR.rows, total, page: pg, limit: lim, pages: Math.ceil(total / lim) });
            }
        } catch (err) { console.error('Events query error:', err.message); }
    }

    // Fallback to JSON file if database is empty or unavailable
    const fallback = readJSON(require('path').join(__dirname, '..', 'data', 'events.json'));
    const filtered = category ? fallback.filter(e => (e.event_category || '').toLowerCase() === category.toLowerCase()) : fallback;
    res.json({ events: filtered, total: filtered.length, page: 1, limit: 20, pages: 1 });
}));

router.get('/featured', asyncHandler(async (_, res) => {
    if (await dbAvailable()) {
        try {
            const r = await pool.query(`
                SELECT e.*, COALESCE(rc.reg_count, 0) AS registrations,
                    (SELECT json_agg(json_build_object('name', name, 'bio', bio, 'photo_url', photo_url))
                     FROM events.event_speakers WHERE event_id = e.id) AS speakers
                FROM events.events e
                LEFT JOIN (SELECT event_id, COUNT(*) AS reg_count FROM events.event_registrations GROUP BY event_id) rc ON rc.event_id = e.id
                WHERE e.is_featured = true AND e.event_date >= CURRENT_TIMESTAMP
                ORDER BY e.event_date LIMIT 1`);
            if (r.rows.length) return res.json(r.rows[0]);
        } catch {}
    }
    const fallback = readJSON(require('path').join(__dirname, '..', 'data', 'events.json'));
    res.json(fallback[0] || null);
}));

router.get('/my', requireAuth, asyncHandler(async (req, res) => {
    if (!(await dbAvailable())) return res.json([]);
    try {
        const r = await pool.query(`
            SELECT e.*, er.registered_at, er.status AS reg_status, er.attended,
                CASE WHEN e.event_date < CURRENT_TIMESTAMP THEN 'completed' ELSE 'upcoming' END AS event_status
            FROM events.event_registrations er
            JOIN events.events e ON e.id = er.event_id
            WHERE er.user_id = $1
            ORDER BY e.event_date DESC`, [req.user.id]);
        res.json(r.rows);
    } catch { res.json([]); }
}));

router.get('/calendar', asyncHandler(async (req, res) => {
    const { month, year } = req.query;
    const m = parseInt(month, 10) || (new Date().getMonth() + 1);
    const y = parseInt(year, 10) || new Date().getFullYear();

    if (await dbAvailable()) {
        try {
            const r = await pool.query(`
                SELECT e.id, e.title, e.event_date, e.end_date, e.event_type, e.event_category,
                    e.price, e.image_url, e.is_featured
                FROM events.events e
                WHERE EXTRACT(MONTH FROM e.event_date) = $1 AND EXTRACT(YEAR FROM e.event_date) = $2
                ORDER BY e.event_date`, [m, y]);
            return res.json(r.rows);
        } catch {}
    }
    res.json([]);
}));

router.get('/:id', asyncHandler(async (req, res) => {
    const { id } = req.params;

    if (await dbAvailable()) {
        try {
            const r = await pool.query(`
                SELECT e.*,
                    COALESCE(rc.reg_count, 0) AS registrations,
                    (SELECT json_agg(json_build_object('id', sp.id, 'name', sp.name, 'title', sp.title, 'bio', sp.bio, 'photo_url', sp.photo_url, 'experience_years', sp.experience_years, 'students_count', sp.students_count) ORDER BY sp.sort_order)
                     FROM events.event_speakers sp WHERE sp.event_id = e.id) AS speakers,
                    (SELECT json_agg(json_build_object('id', res.id, 'resource_name', res.resource_name, 'resource_type', res.resource_type, 'resource_url', res.resource_url, 'file_size', res.file_size) ORDER BY res.sort_order)
                     FROM events.event_resources res WHERE res.event_id = e.id) AS resources
                FROM events.events e
                LEFT JOIN (SELECT event_id, COUNT(*) AS reg_count FROM events.event_registrations GROUP BY event_id) rc ON rc.event_id = e.id
                WHERE e.id::text = $1 OR e.slug = $1`, [id]);

            if (!r.rows.length) return res.status(404).json({ error: 'Event not found' });

            const event = r.rows[0];
            await pool.query('UPDATE events.events SET views = views + 1 WHERE id = $1', [event.id]);

            let isRegistered = false;
            let hasCertificate = false;
            if (req.headers.authorization) {
                try {
                    const decoded = jwt.verify(req.headers.authorization.replace('Bearer ', ''), JWT_SECRET);
                    const reg = await pool.query('SELECT id FROM events.event_registrations WHERE event_id = $1 AND user_id = $2', [event.id, decoded.id]);
                    isRegistered = reg.rows.length > 0;
                    const cert = await pool.query('SELECT id FROM events.event_certificates WHERE event_id = $1 AND user_id = $2', [event.id, decoded.id]);
                    hasCertificate = cert.rows.length > 0;
                } catch {}
            }

            const spotsLeft = event.max_participants ? event.max_participants - (event.registrations || 0) : null;
            return res.json({ ...event, is_registered: isRegistered, has_certificate: hasCertificate, spots_left: spotsLeft });
        } catch (err) { console.error('Event detail error:', err.message); }
    }

    const fallback = readJSON(require('path').join(__dirname, '..', 'data', 'events.json'));
    const event = fallback.find(e => e.id === id);
    event ? res.json(event) : res.status(404).json({ error: 'Event not found' });
}));

router.post('/', requireAuth, upload.single('image'), asyncHandler(async (req, res) => {
    if (!(await dbAvailable())) return res.status(503).json({ error: 'Database unavailable' });
    const { title, description, location, event_date, end_date, event_type, event_category, max_participants, price, difficulty, prerequisites, agenda, is_featured } = req.body;
    if (!title || !event_date) return res.status(400).json({ error: 'Title and date are required' });
    const image_url = getFileUrl(req.file);
    const slug = title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
    const r = await pool.query(
        `INSERT INTO events.events (title, slug, description, location, event_date, end_date, event_type, event_category, image_url, max_participants, price, difficulty, prerequisites, agenda, is_featured, organizer_id, status)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, 'upcoming') RETURNING *`,
        [title, slug, description || null, location || null, event_date, end_date || null, event_type || 'WORKSHOP', event_category || null, image_url, max_participants || null, price || 0, difficulty || 'All Levels', prerequisites || null, agenda ? JSON.stringify(agenda) : null, is_featured || false, req.user.id]
    );
    res.status(201).json(r.rows[0]);
}));

router.put('/:id', requireAuth, asyncHandler(async (req, res) => {
    if (!(await dbAvailable())) return res.status(503).json({ error: 'Database unavailable' });
    const { id } = req.params;
    const existing = await pool.query('SELECT * FROM events.events WHERE id = $1', [id]);
    if (!existing.rows.length) return res.status(404).json({ error: 'Event not found' });
    const userRole = (req.user.role || '').toUpperCase();
    if (existing.rows[0].organizer_id !== req.user.id && !['ADMIN', 'SUPERADMIN'].includes(userRole)) {
        return res.status(403).json({ error: 'Not authorized' });
    }
    const { title, description, location, event_date, end_date, event_type, event_category, max_participants, price, difficulty, prerequisites, agenda, is_featured, status } = req.body;
    const r = await pool.query(
        `UPDATE events.events SET title = COALESCE($1, title), description = COALESCE($2, description),
            location = COALESCE($3, location), event_date = COALESCE($4, event_date),
            end_date = COALESCE($5, end_date), event_type = COALESCE($6, event_type),
            event_category = COALESCE($7, event_category), max_participants = COALESCE($8, max_participants),
            price = COALESCE($9, price), difficulty = COALESCE($10, difficulty),
            prerequisites = COALESCE($11, prerequisites), agenda = COALESCE($12, agenda),
            is_featured = COALESCE($13, is_featured), status = COALESCE($14, status)
         WHERE id = $15 RETURNING *`,
        [title, description, location, event_date, end_date, event_type, event_category, max_participants, price, difficulty, prerequisites, agenda ? JSON.stringify(agenda) : null, is_featured, status, id]
    );
    res.json(r.rows[0]);
}));

router.delete('/:id', requireAuth, asyncHandler(async (req, res) => {
    if (!(await dbAvailable())) return res.status(503).json({ error: 'Database unavailable' });
    const { id } = req.params;
    const existing = await pool.query('SELECT * FROM events.events WHERE id = $1', [id]);
    if (!existing.rows.length) return res.status(404).json({ error: 'Event not found' });
    const userRole = (req.user.role || '').toUpperCase();
    if (existing.rows[0].organizer_id !== req.user.id && !['ADMIN', 'SUPERADMIN'].includes(userRole)) {
        return res.status(403).json({ error: 'Not authorized' });
    }
    await pool.query('DELETE FROM events.events WHERE id = $1', [id]);
    res.json({ message: 'Event deleted' });
}));

router.post('/:id/register', requireAuth, rateLimiter(20, 60000), asyncHandler(async (req, res) => {
    if (!(await dbAvailable())) return res.status(503).json({ error: 'Database unavailable' });
    const { id } = req.params;
    const client = await pool.connect();
    try {
        await client.query('BEGIN');
        const event = await client.query('SELECT * FROM events.events WHERE id = $1 FOR UPDATE', [id]);
        if (!event.rows.length) {
            await client.query('ROLLBACK');
            return res.status(404).json({ error: 'Event not found' });
        }
        if (event.rows[0].max_participants) {
            const count = await client.query('SELECT COUNT(*) AS cnt FROM events.event_registrations WHERE event_id = $1', [id]);
            if (parseInt(count.rows[0].cnt) >= event.rows[0].max_participants) {
                await client.query('ROLLBACK');
                return res.status(400).json({ error: 'Event is full' });
            }
        }
        try {
            const r = await client.query('INSERT INTO events.event_registrations (event_id, user_id) VALUES ($1, $2) RETURNING *', [id, req.user.id]);
            await client.query('COMMIT');
            res.status(201).json(r.rows[0]);
        } catch (dbErr) {
            await client.query('ROLLBACK');
            if (dbErr.code === '23505') return res.status(409).json({ error: 'Already registered for this event' });
            throw dbErr;
        }
    } catch (err) {
        await client.query('ROLLBACK');
        throw err;
    } finally {
        client.release();
    }
}));

router.delete('/:id/register', requireAuth, asyncHandler(async (req, res) => {
    if (!(await dbAvailable())) return res.status(503).json({ error: 'Database unavailable' });
    const { id } = req.params;
    const r = await pool.query('DELETE FROM events.event_registrations WHERE event_id = $1 AND user_id = $2 RETURNING *', [id, req.user.id]);
    if (!r.rows.length) return res.status(404).json({ error: 'Registration not found' });
    res.json({ message: 'Registration cancelled' });
}));

router.post('/:id/speakers', requireAuth, asyncHandler(async (req, res) => {
    if (!(await dbAvailable())) return res.status(503).json({ error: 'Database unavailable' });
    const { id } = req.params;
    const { name, title, bio, photo_url, experience_years, students_count } = req.body;
    if (!name) return res.status(400).json({ error: 'Speaker name is required' });
    const r = await pool.query(
        'INSERT INTO events.event_speakers (event_id, name, title, bio, photo_url, experience_years, students_count) VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *',
        [id, name, title || null, bio || null, photo_url || null, experience_years || null, students_count || 0]
    );
    res.status(201).json(r.rows[0]);
}));

router.post('/:id/resources', requireAuth, asyncHandler(async (req, res) => {
    if (!(await dbAvailable())) return res.status(503).json({ error: 'Database unavailable' });
    const { id } = req.params;
    const { resource_name, resource_type, resource_url, file_size } = req.body;
    if (!resource_name || !resource_type) return res.status(400).json({ error: 'Name and type are required' });
    const r = await pool.query(
        'INSERT INTO events.event_resources (event_id, resource_name, resource_type, resource_url, file_size) VALUES ($1, $2, $3, $4, $5) RETURNING *',
        [id, resource_name, resource_type, resource_url || null, file_size || null]
    );
    res.status(201).json(r.rows[0]);
}));

router.get('/:id/certificate', requireAuth, asyncHandler(async (req, res) => {
    if (!(await dbAvailable())) return res.status(503).json({ error: 'Database unavailable' });
    const { id } = req.params;
    const r = await pool.query('SELECT * FROM events.event_certificates WHERE event_id = $1 AND user_id = $2', [id, req.user.id]);
    if (!r.rows.length) return res.status(404).json({ error: 'Certificate not found' });
    res.json(r.rows[0]);
}));

router.post('/:id/certificate', requireAuth, asyncHandler(async (req, res) => {
    if (!(await dbAvailable())) return res.status(503).json({ error: 'Database unavailable' });
    const { id } = req.params;
    const event = await pool.query('SELECT id FROM events.events WHERE id = $1', [id]);
    if (!event.rows.length) return res.status(404).json({ error: 'Event not found' });
    try {
        const r = await pool.query(
            'INSERT INTO events.event_certificates (event_id, user_id) VALUES ($1, $2) ON CONFLICT (event_id, user_id) DO NOTHING RETURNING *',
            [id, req.user.id]
        );
        res.status(201).json(r.rows[0] || { message: 'Certificate already issued' });
    } catch (err) { throw err; }
}));

// ─── Discussions ──────────────────────────────────────────────────────

router.get('/:id/discussions', asyncHandler(async (req, res) => {
    const { id } = req.params;
    if (await dbAvailable()) {
        try {
            const r = await pool.query(`
                SELECT d.*, u.first_name, u.last_name, u.profile_image
                FROM events.event_discussions d
                JOIN auth.users u ON u.id = d.user_id
                WHERE d.event_id = $1
                ORDER BY d.created_at DESC`, [id]);
            return res.json(r.rows);
        } catch {}
    }
    res.json([]);
}));

router.post('/:id/discussions', requireAuth, asyncHandler(async (req, res) => {
    if (!(await dbAvailable())) return res.status(503).json({ error: 'Database unavailable' });
    const { id } = req.params;
    const { content, parent_id } = req.body;
    if (!content) return res.status(400).json({ error: 'Content is required' });
    const r = await pool.query(
        'INSERT INTO events.event_discussions (event_id, user_id, content, parent_id) VALUES ($1, $2, $3, $4) RETURNING *',
        [id, req.user.id, content, parent_id || null]
    );
    res.status(201).json(r.rows[0]);
}));

// ─── Reviews ──────────────────────────────────────────────────────────

router.get('/:id/reviews', asyncHandler(async (req, res) => {
    const { id } = req.params;
    if (await dbAvailable()) {
        try {
            const r = await pool.query(`
                SELECT r.*, u.first_name, u.last_name, u.profile_image
                FROM events.event_reviews r
                JOIN auth.users u ON u.id = r.user_id
                WHERE r.event_id = $1
                ORDER BY r.created_at DESC`, [id]);
            return res.json(r.rows);
        } catch {}
    }
    res.json([]);
}));

router.post('/:id/reviews', requireAuth, asyncHandler(async (req, res) => {
    if (!(await dbAvailable())) return res.status(503).json({ error: 'Database unavailable' });
    const { id } = req.params;
    const { rating, content } = req.body;
    if (!rating || rating < 1 || rating > 5) return res.status(400).json({ error: 'Rating must be 1-5' });
    const r = await pool.query(
        'INSERT INTO events.event_reviews (event_id, user_id, rating, content) VALUES ($1, $2, $3, $4) ON CONFLICT (event_id, user_id) DO UPDATE SET rating = $3, content = $4 RETURNING *',
        [id, req.user.id, rating, content || null]
    );
    res.status(201).json(r.rows[0]);
}));

// ─── Gallery ──────────────────────────────────────────────────────────

router.get('/:id/gallery', asyncHandler(async (req, res) => {
    const { id } = req.params;
    if (await dbAvailable()) {
        try {
            const r = await pool.query(
                'SELECT * FROM events.event_gallery WHERE event_id = $1 ORDER BY sort_order, created_at',
                [id]);
            return res.json(r.rows);
        } catch {}
    }
    res.json([]);
}));

router.post('/:id/gallery', requireAuth, upload.single('image'), asyncHandler(async (req, res) => {
    if (!(await dbAvailable())) return res.status(503).json({ error: 'Database unavailable' });
    const { id } = req.params;
    const { caption } = req.body;
    const image_url = getFileUrl(req.file);
    if (!image_url) return res.status(400).json({ error: 'Image is required' });
    const r = await pool.query(
        'INSERT INTO events.event_gallery (event_id, user_id, image_url, caption) VALUES ($1, $2, $3, $4) RETURNING *',
        [id, req.user.id, image_url, caption || null]
    );
    res.status(201).json(r.rows[0]);
}));

// ─── Attendees ────────────────────────────────────────────────────────

router.get('/:id/attendees', requireAuth, asyncHandler(async (req, res) => {
    const { id } = req.params;
    if (await dbAvailable()) {
        try {
            const r = await pool.query(`
                SELECT u.id, u.first_name, u.last_name, u.profile_image, u.role,
                    er.registered_at, er.status, er.attended
                FROM events.event_registrations er
                JOIN auth.users u ON u.id = er.user_id
                WHERE er.event_id = $1
                ORDER BY er.registered_at DESC`, [id]);
            return res.json(r.rows);
        } catch {}
    }
    res.json([]);
}));

module.exports = router;
