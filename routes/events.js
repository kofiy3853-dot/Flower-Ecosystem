const router = require('express').Router();
const jwt = require('jsonwebtoken');
const { pool, JWT_SECRET, upload, rateLimiter, asyncHandler, dbAvailable, readJSON, requireAuth, getFileUrl } = require('./middleware');
const { sendMail } = require('../utils/email');

// Resolve an event param (UUID or slug) to a UUID
async function resolveEventId(idOrSlug) {
    if (!idOrSlug) return null;
    // Already a UUID
    if (/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(idOrSlug)) return idOrSlug;
    const r = await pool.query('SELECT id FROM events.events WHERE slug = $1', [idOrSlug]);
    return r.rows.length ? r.rows[0].id : null;
}

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
    const { category, search, type, status, sort = 'date', page = 1, limit = 20, featured, price, location_type } = req.query;

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
            if (price === 'free') { conditions.push(`(e.price = 0 OR e.price IS NULL)`); }
            if (location_type === 'online') { conditions.push(`(e.location ILIKE '%online%' OR e.location ILIKE '%zoom%' OR e.location ILIKE '%virtual%')`); }
            if (location_type === 'in-person') { conditions.push(`(e.location IS NOT NULL AND e.location != '' AND e.location NOT ILIKE '%online%' AND e.location NOT ILIKE '%zoom%' AND e.location NOT ILIKE '%virtual%')`); }

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
                    NULL AS instructor_image
                FROM events.events e
                LEFT JOIN (SELECT event_id, COUNT(*) AS reg_count FROM events.event_registrations GROUP BY event_id) rc ON rc.event_id = e.id
                LEFT JOIN (SELECT event_id, json_agg(json_build_object('name', name, 'bio', bio) ORDER BY sort_order) AS speakers FROM events.event_speakers GROUP BY event_id) sp ON sp.event_id = e.id
                ${where}
                ORDER BY e.is_featured DESC, ${orderBy}
                LIMIT $${idx} OFFSET $${idx + 1}`;

            const dataR = await pool.query(dataQ, values);

            if (dataR.rows.length > 0) {
                return res.json({ events: dataR.rows, total, page: pg, limit: lim, pages: Math.ceil(total / lim) });
            }
        } catch (err) { console.error('Events query error:', err.message); }
    }

    const fallback = readJSON(require('path').join(__dirname, '..', 'data', 'events.json'));
    let filtered = category ? fallback.filter(e => (e.event_category || '').toLowerCase() === category.toLowerCase()) : fallback;
    if (price === 'free') filtered = filtered.filter(e => !e.price || e.price === 0);
    if (location_type === 'online') filtered = filtered.filter(e => (e.location || '').toLowerCase().includes('online'));
    if (location_type === 'in-person') filtered = filtered.filter(e => e.location && !e.location.toLowerCase().includes('online'));
    res.json({ events: filtered, total: filtered.length, page: 1, limit: 20, pages: 1 });
}));

router.get('/featured', asyncHandler(async (_, res) => {
    if (await dbAvailable()) {
        try {
            const r = await pool.query(`
                SELECT e.*, COALESCE(rc.reg_count, 0) AS registrations,
                    (SELECT json_agg(json_build_object('name', name, 'bio', bio))
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
                    (SELECT json_agg(json_build_object('id', sp.id, 'name', sp.name, 'bio', sp.bio) ORDER BY sp.sort_order)
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
            if (req.headers.authorization || req.cookies?.access_token) {
                try {
                    const token = req.headers.authorization?.replace('Bearer ', '') || req.cookies.access_token;
                    const decoded = jwt.verify(token, JWT_SECRET);
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
    const id = await resolveEventId(req.params.id);
    if (!id) return res.status(404).json({ error: 'Event not found' });
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
    const id = await resolveEventId(req.params.id);
    if (!id) return res.status(404).json({ error: 'Event not found' });
    const existing = await pool.query('SELECT * FROM events.events WHERE id = $1', [id]);
    if (!existing.rows.length) return res.status(404).json({ error: 'Event not found' });
    const userRole = (req.user.role || '').toUpperCase();
    if (!['ADMIN', 'SUPERADMIN'].includes(userRole) && existing.rows[0].organizer_id !== req.user.id) {
        return res.status(403).json({ error: 'Not authorized' });
    }
    const childTables = [
        'event_certificates', 'event_discussions', 'event_gallery', 'event_orders',
        'event_registrations', 'event_resources', 'event_reviews', 'event_speakers',
        'event_ticket_types', 'event_tickets'
    ];
    for (const table of childTables) {
        await pool.query(`DELETE FROM events.${table} WHERE event_id = $1`, [id]).catch(() => {});
    }
    await pool.query('DELETE FROM events.events WHERE id = $1', [id]);
    res.json({ message: 'Event deleted' });
}));

router.post('/:id/register', requireAuth, rateLimiter(20, 60000), asyncHandler(async (req, res) => {
    if (!(await dbAvailable())) return res.status(503).json({ error: 'Database unavailable' });
    const eventId = await resolveEventId(req.params.id);
    if (!eventId) return res.status(404).json({ error: 'Event not found' });
    const client = await pool.connect();
    try {
        await client.query('BEGIN');
        const event = await client.query('SELECT * FROM events.events WHERE id = $1 FOR UPDATE', [eventId]);
        if (!event.rows.length) {
            await client.query('ROLLBACK');
            return res.status(404).json({ error: 'Event not found' });
        }
        if (event.rows[0].max_participants) {
            const count = await client.query('SELECT COUNT(*) AS cnt FROM events.event_registrations WHERE event_id = $1', [eventId]);
            if (parseInt(count.rows[0].cnt) >= event.rows[0].max_participants) {
                await client.query('ROLLBACK');
                return res.status(400).json({ error: 'Event is full' });
            }
        }
        try {
            const r = await client.query('INSERT INTO events.event_registrations (event_id, user_id) VALUES ($1, $2) RETURNING *', [eventId, req.user.id]);
            await client.query('COMMIT');
            res.status(201).json(r.rows[0]);
            // Send confirmation email (non-blocking)
            try {
                const user = await pool.query('SELECT email, first_name FROM auth.users WHERE id = $1', [req.user.id]);
                const evt = await pool.query('SELECT title, event_date, location FROM events.events WHERE id = $1', [eventId]);
                if (user.rows.length && evt.rows.length) {
                    const u = user.rows[0];
                    const e = evt.rows[0];
                    const eventDate = new Date(e.event_date).toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric', hour: 'numeric', minute: '2-digit' });
                    sendMail({
                        to: u.email,
                        subject: `Registration Confirmed: ${e.title}`,
                        html: `<!DOCTYPE html><html><head><style>body{font-family:'Segoe UI',sans-serif;background:#f5f5f5;padding:20px}.container{max-width:500px;margin:0 auto;background:white;border-radius:12px;overflow:hidden;box-shadow:0 2px 10px rgba(0,0,0,0.1)}.header{background:linear-gradient(135deg,#d63384,#e84393);padding:30px;text-align:center}.header h1{color:white;margin:0;font-size:22px}.content{padding:30px}.content p{color:#666;line-height:1.6}.detail{background:#f8f9fa;padding:12px;border-radius:8px;margin:15px 0}.detail strong{color:#333}</style></head><body><div class="container"><div class="header"><h1>🎉 Registration Confirmed!</h1></div><div class="content"><p>Hi ${u.first_name || 'there'},</p><p>You're registered for <strong>${e.title}</strong>!</p><div class="detail"><strong>📅 Date:</strong> ${eventDate}<br><strong>📍 Location:</strong> ${e.location || 'Online'}</div><p>We look forward to seeing you there!</p><p style="font-size:12px;color:#999;margin-top:30px;">Flower Ecosystem Team</p></div></div></body></html>`,
                        text: `Registration Confirmed!\n\nHi ${u.first_name || 'there'},\n\nYou're registered for ${e.title}!\nDate: ${eventDate}\nLocation: ${e.location || 'Online'}\n\nWe look forward to seeing you there!`
                    }).catch(() => {});
                }
            } catch {}
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
    const eventId = await resolveEventId(req.params.id);
    if (!eventId) return res.status(404).json({ error: 'Event not found' });
    const r = await pool.query('DELETE FROM events.event_registrations WHERE event_id = $1 AND user_id = $2 RETURNING *', [eventId, req.user.id]);
    if (!r.rows.length) return res.status(404).json({ error: 'Registration not found' });
    res.json({ message: 'Registration cancelled' });
    // Send cancellation email (non-blocking)
    try {
        const user = await pool.query('SELECT email, first_name FROM auth.users WHERE id = $1', [req.user.id]);
        const evt = await pool.query('SELECT title, event_date, location FROM events.events WHERE id = $1', [eventId]);
        if (user.rows.length && evt.rows.length) {
            const u = user.rows[0];
            const e = evt.rows[0];
            const eventDate = new Date(e.event_date).toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric', hour: 'numeric', minute: '2-digit' });
            sendMail({
                to: u.email,
                subject: `Registration Cancelled: ${e.title}`,
                html: `<!DOCTYPE html><html><head><style>body{font-family:'Segoe UI',sans-serif;background:#f5f5f5;padding:20px}.container{max-width:500px;margin:0 auto;background:white;border-radius:12px;overflow:hidden;box-shadow:0 2px 10px rgba(0,0,0,0.1)}.header{background:#6c757d;padding:30px;text-align:center}.header h1{color:white;margin:0;font-size:22px}.content{padding:30px}.content p{color:#666;line-height:1.6}.detail{background:#f8f9fa;padding:12px;border-radius:8px;margin:15px 0}.detail strong{color:#333}</style></head><body><div class="container"><div class="header"><h1>Registration Cancelled</h1></div><div class="content"><p>Hi ${u.first_name || 'there'},</p><p>Your registration for <strong>${e.title}</strong> has been cancelled.</p><div class="detail"><strong>📅 Event Date:</strong> ${eventDate}<br><strong>📍 Location:</strong> ${e.location || 'Online'}</div><p>If this was a mistake, you can re-register from the event page.</p><p style="font-size:12px;color:#999;margin-top:30px;">Flower Ecosystem Team</p></div></div></body></html>`,
                text: `Registration Cancelled\n\nHi ${u.first_name || 'there'},\n\nYour registration for ${e.title} has been cancelled.\nEvent Date: ${eventDate}\nLocation: ${e.location || 'Online'}\n\nIf this was a mistake, you can re-register from the event page.`
            }).catch(() => {});
        }
    } catch {}
}));

router.post('/:id/speakers', requireAuth, asyncHandler(async (req, res) => {
    if (!(await dbAvailable())) return res.status(503).json({ error: 'Database unavailable' });
    const eventId = await resolveEventId(req.params.id);
    if (!eventId) return res.status(404).json({ error: 'Event not found' });
    const { name, title, bio, image_url, experience_years, students_count } = req.body;
    if (!name) return res.status(400).json({ error: 'Speaker name is required' });
    const r = await pool.query(
        'INSERT INTO events.event_speakers (event_id, name, title, bio, image_url, experience_years, students_count) VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *',
        [eventId, name, title || null, bio || null, image_url || null, experience_years || null, students_count || 0]
    );
    res.status(201).json(r.rows[0]);
}));

router.post('/:id/resources', requireAuth, asyncHandler(async (req, res) => {
    if (!(await dbAvailable())) return res.status(503).json({ error: 'Database unavailable' });
    const eventId = await resolveEventId(req.params.id);
    if (!eventId) return res.status(404).json({ error: 'Event not found' });
    const { resource_name, resource_type, resource_url, file_size } = req.body;
    if (!resource_name || !resource_type) return res.status(400).json({ error: 'Name and type are required' });
    const r = await pool.query(
        'INSERT INTO events.event_resources (event_id, resource_name, resource_type, resource_url, file_size) VALUES ($1, $2, $3, $4, $5) RETURNING *',
        [eventId, resource_name, resource_type, resource_url || null, file_size || null]
    );
    res.status(201).json(r.rows[0]);
}));

router.get('/:id/certificate', requireAuth, asyncHandler(async (req, res) => {
    if (!(await dbAvailable())) return res.status(503).json({ error: 'Database unavailable' });
    const eventId = await resolveEventId(req.params.id);
    if (!eventId) return res.status(404).json({ error: 'Event not found' });
    const r = await pool.query('SELECT * FROM events.event_certificates WHERE event_id = $1 AND user_id = $2', [eventId, req.user.id]);
    if (!r.rows.length) return res.status(404).json({ error: 'Certificate not found' });
    res.json(r.rows[0]);
}));

router.post('/:id/certificate', requireAuth, asyncHandler(async (req, res) => {
    if (!(await dbAvailable())) return res.status(503).json({ error: 'Database unavailable' });
    const eventId = await resolveEventId(req.params.id);
    if (!eventId) return res.status(404).json({ error: 'Event not found' });
    try {
        const r = await pool.query(
            'INSERT INTO events.event_certificates (event_id, user_id) VALUES ($1, $2) ON CONFLICT (event_id, user_id) DO NOTHING RETURNING *',
            [eventId, req.user.id]
        );
        res.status(201).json(r.rows[0] || { message: 'Certificate already issued' });
    } catch (err) { throw err; }
}));

// ─── Discussions ──────────────────────────────────────────────────────

router.get('/:id/discussions', asyncHandler(async (req, res) => {
    const eventId = await resolveEventId(req.params.id);
    if (!eventId) return res.json([]);
    if (await dbAvailable()) {
        try {
            const r = await pool.query(`
                SELECT d.*, u.first_name, u.last_name, u.profile_image
                FROM events.event_discussions d
                JOIN auth.users u ON u.id = d.user_id
                WHERE d.event_id = $1
                ORDER BY d.created_at DESC`, [eventId]);
            return res.json(r.rows);
        } catch {}
    }
    res.json([]);
}));

router.post('/:id/discussions', requireAuth, asyncHandler(async (req, res) => {
    if (!(await dbAvailable())) return res.status(503).json({ error: 'Database unavailable' });
    const eventId = await resolveEventId(req.params.id);
    if (!eventId) return res.status(404).json({ error: 'Event not found' });
    const { content, parent_id } = req.body;
    if (!content) return res.status(400).json({ error: 'Content is required' });
    const r = await pool.query(
        'INSERT INTO events.event_discussions (event_id, user_id, content, parent_id) VALUES ($1, $2, $3, $4) RETURNING *',
        [eventId, req.user.id, content, parent_id || null]
    );
    res.status(201).json(r.rows[0]);
}));

// ─── Reviews ──────────────────────────────────────────────────────────

router.get('/:id/reviews', asyncHandler(async (req, res) => {
    const eventId = await resolveEventId(req.params.id);
    if (!eventId) return res.json([]);
    if (await dbAvailable()) {
        try {
            const r = await pool.query(`
                SELECT r.*, u.first_name, u.last_name, u.profile_image
                FROM events.event_reviews r
                JOIN auth.users u ON u.id = r.user_id
                WHERE r.event_id = $1
                ORDER BY r.created_at DESC`, [eventId]);
            return res.json(r.rows);
        } catch {}
    }
    res.json([]);
}));

router.post('/:id/reviews', requireAuth, asyncHandler(async (req, res) => {
    if (!(await dbAvailable())) return res.status(503).json({ error: 'Database unavailable' });
    const eventId = await resolveEventId(req.params.id);
    if (!eventId) return res.status(404).json({ error: 'Event not found' });
    const { rating, content } = req.body;
    if (!rating || rating < 1 || rating > 5) return res.status(400).json({ error: 'Rating must be 1-5' });
    const r = await pool.query(
        'INSERT INTO events.event_reviews (event_id, user_id, rating, content) VALUES ($1, $2, $3, $4) ON CONFLICT (event_id, user_id) DO UPDATE SET rating = $3, content = $4 RETURNING *',
        [eventId, req.user.id, rating, content || null]
    );
    res.status(201).json(r.rows[0]);
}));

// ─── Gallery ──────────────────────────────────────────────────────────

router.get('/:id/gallery', asyncHandler(async (req, res) => {
    const eventId = await resolveEventId(req.params.id);
    if (!eventId) return res.json([]);
    if (await dbAvailable()) {
        try {
            const r = await pool.query(
                'SELECT * FROM events.event_gallery WHERE event_id = $1 ORDER BY sort_order, created_at',
                [eventId]);
            return res.json(r.rows);
        } catch {}
    }
    res.json([]);
}));

router.post('/:id/gallery', requireAuth, upload.single('image'), asyncHandler(async (req, res) => {
    if (!(await dbAvailable())) return res.status(503).json({ error: 'Database unavailable' });
    const eventId = await resolveEventId(req.params.id);
    if (!eventId) return res.status(404).json({ error: 'Event not found' });
    const { caption } = req.body;
    const image_url = getFileUrl(req.file);
    if (!image_url) return res.status(400).json({ error: 'Image is required' });
    const r = await pool.query(
        'INSERT INTO events.event_gallery (event_id, user_id, image_url, caption) VALUES ($1, $2, $3, $4) RETURNING *',
        [eventId, req.user.id, image_url, caption || null]
    );
    res.status(201).json(r.rows[0]);
}));

// ─── Attendees ────────────────────────────────────────────────────────

router.get('/:id/attendees', requireAuth, asyncHandler(async (req, res) => {
    const eventId = await resolveEventId(req.params.id);
    if (!eventId) return res.json([]);
    if (await dbAvailable()) {
        try {
            const r = await pool.query(`
                SELECT u.id, u.first_name, u.last_name, u.profile_image, u.role,
                    er.registered_at, er.status, er.attended
                FROM events.event_registrations er
                JOIN auth.users u ON u.id = er.user_id
                WHERE er.event_id = $1
                ORDER BY er.registered_at DESC`, [eventId]);
            return res.json(r.rows);
        } catch {}
    }
    res.json([]);
}));

// ─── Ticket Types ─────────────────────────────────────────────────────

router.get('/:id/tickets', asyncHandler(async (req, res) => {
    const eventId = await resolveEventId(req.params.id);
    if (!eventId) return res.json([]);
    if (await dbAvailable()) {
        try {
            const r = await pool.query(`
                SELECT t.*,
                    t.quantity - COALESCE(s.sold, 0) AS available
                FROM events.event_ticket_types t
                LEFT JOIN (
                    SELECT ticket_type_id, COUNT(*) AS sold
                    FROM events.event_tickets WHERE status = 'valid'
                    GROUP BY ticket_type_id
                ) s ON s.ticket_type_id = t.id
                WHERE t.event_id = $1
                ORDER BY t.price ASC`, [eventId]);
            return res.json(r.rows);
        } catch {}
    }
    res.json([]);
}));

router.post('/:id/tickets', requireAuth, asyncHandler(async (req, res) => {
    if (!(await dbAvailable())) return res.status(503).json({ error: 'Database unavailable' });
    const eventId = await resolveEventId(req.params.id);
    if (!eventId) return res.status(404).json({ error: 'Event not found' });
    const { name, price, quantity, benefits, sale_start, sale_end } = req.body;
    if (!name) return res.status(400).json({ error: 'Ticket name is required' });
    const r = await pool.query(
        `INSERT INTO events.event_ticket_types (event_id, name, price, quantity, benefits, sale_start, sale_end)
         VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *`,
        [eventId, name, price || 0, quantity || 100, benefits || null, sale_start || null, sale_end || null]
    );
    res.status(201).json(r.rows[0]);
}));

router.put('/:id/tickets/:ticketId', requireAuth, asyncHandler(async (req, res) => {
    if (!(await dbAvailable())) return res.status(503).json({ error: 'Database unavailable' });
    const eventId = await resolveEventId(req.params.id);
    if (!eventId) return res.status(404).json({ error: 'Event not found' });
    const { ticketId } = req.params;
    const { name, price, quantity, benefits, sale_start, sale_end, is_active } = req.body;
    const r = await pool.query(
        `UPDATE events.event_ticket_types SET
            name = COALESCE($1, name), price = COALESCE($2, price),
            quantity = COALESCE($3, quantity), benefits = COALESCE($4, benefits),
            sale_start = COALESCE($5, sale_start), sale_end = COALESCE($6, sale_end),
            is_active = COALESCE($7, is_active)
         WHERE id = $8 AND event_id = $9 RETURNING *`,
        [name, price, quantity, benefits, sale_start, sale_end, is_active, ticketId, eventId]
    );
    if (!r.rows.length) return res.status(404).json({ error: 'Ticket type not found' });
    res.json(r.rows[0]);
}));

// ─── Ticket Purchase ──────────────────────────────────────────────────

router.post('/:id/purchase', requireAuth, rateLimiter(10, 60000), asyncHandler(async (req, res) => {
    if (!(await dbAvailable())) return res.status(503).json({ error: 'Database unavailable' });
    const eventId = await resolveEventId(req.params.id);
    if (!eventId) return res.status(404).json({ error: 'Event not found' });
    const { ticket_type_id, quantity = 1, payment_method } = req.body;

    const client = await pool.connect();
    try {
        await client.query('BEGIN');

        // Get ticket type
        const ticketType = await client.query(
            'SELECT * FROM events.event_ticket_types WHERE id = $1 AND event_id = $2',
            [ticket_type_id, eventId]);
        if (!ticketType.rows.length) {
            await client.query('ROLLBACK');
            return res.status(404).json({ error: 'Ticket type not found' });
        }

        const ticket = ticketType.rows[0];

        // Check availability
        const sold = await client.query(
            'SELECT COUNT(*)::int AS cnt FROM events.event_tickets WHERE ticket_type_id = $1 AND status = $2',
            [ticket_type_id, 'valid']);
        const available = ticket.quantity - (sold.rows[0].cnt || 0);
        if (quantity > available) {
            await client.query('ROLLBACK');
            return res.status(400).json({ error: `Only ${available} tickets available` });
        }

        // Calculate total
        const total_amount = ticket.price * quantity;

        // Create order
        const order = await client.query(
            `INSERT INTO events.event_orders (user_id, event_id, total_amount, payment_method, status)
             VALUES ($1, $2, $3, $4, 'pending') RETURNING *`,
            [req.user.id, eventId, total_amount, payment_method || 'card']);

        // Create tickets
        const tickets = [];
        for (let i = 0; i < quantity; i++) {
            const ticketCode = `EVT-${Date.now()}-${Math.random().toString(36).substr(2, 8).toUpperCase()}`;
            const t = await client.query(
                `INSERT INTO events.event_tickets (order_id, event_id, user_id, ticket_type_id, ticket_code, price)
                 VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
                [order.rows[0].id, eventId, req.user.id, ticket_type_id, ticketCode, ticket.price]);
            tickets.push(t.rows[0]);
        }

        // Update registration
        await client.query(
            'INSERT INTO events.event_registrations (event_id, user_id, order_id) VALUES ($1, $2, $3) ON CONFLICT (event_id, user_id) DO NOTHING',
            [eventId, req.user.id, order.rows[0].id]);

        await client.query('COMMIT');

        res.status(201).json({
            order: order.rows[0],
            tickets,
            total_amount
        });
    } catch (err) {
        await client.query('ROLLBACK');
        throw err;
    } finally {
        client.release();
    }
}));

// ─── Orders ───────────────────────────────────────────────────────────

router.get('/orders/my', requireAuth, asyncHandler(async (req, res) => {
    if (!(await dbAvailable())) return res.json([]);
    try {
        const r = await pool.query(`
            SELECT o.*, e.title AS event_title, e.event_date, e.image_url,
                (SELECT json_agg(t.*) FROM events.event_tickets t WHERE t.order_id = o.id) AS tickets
            FROM events.event_orders o
            JOIN events.events e ON e.id = o.event_id
            WHERE o.user_id = $1
            ORDER BY o.created_at DESC`, [req.user.id]);
        res.json(r.rows);
    } catch { res.json([]); }
}));

router.get('/orders/:orderId', requireAuth, asyncHandler(async (req, res) => {
    if (!(await dbAvailable())) return res.status(503).json({ error: 'Database unavailable' });
    const { orderId } = req.params;
    const r = await pool.query(`
        SELECT o.*, e.title AS event_title, e.event_date, e.location, e.image_url,
            (SELECT json_agg(json_build_object(
                'id', t.id, 'code', t.ticket_code, 'type', tt.name,
                'price', t.price, 'status', t.status
            )) FROM events.event_tickets t
            JOIN events.event_ticket_types tt ON tt.id = t.ticket_type_id
            WHERE t.order_id = o.id) AS tickets
        FROM events.event_orders o
        JOIN events.events e ON e.id = o.event_id
        WHERE o.id = $1 AND o.user_id = $2`, [orderId, req.user.id]);
    if (!r.rows.length) return res.status(404).json({ error: 'Order not found' });
    res.json(r.rows[0]);
}));

// ─── Payment Processing (Mock) ────────────────────────────────────────

router.post('/orders/:orderId/pay', requireAuth, asyncHandler(async (req, res) => {
    if (!(await dbAvailable())) return res.status(503).json({ error: 'Database unavailable' });
    const { orderId } = req.params;
    const { payment_reference } = req.body;

    const client = await pool.connect();
    try {
        await client.query('BEGIN');

        const order = await client.query(
            'SELECT * FROM events.event_orders WHERE id = $1 AND user_id = $2 FOR UPDATE',
            [orderId, req.user.id]);
        if (!order.rows.length) {
            await client.query('ROLLBACK');
            return res.status(404).json({ error: 'Order not found' });
        }
        if (order.rows[0].status !== 'pending') {
            await client.query('ROLLBACK');
            return res.status(400).json({ error: 'Order already processed' });
        }

        // Mock payment - in production, integrate with Paystack/Flutterwave
        const paymentSuccess = true; // Simulate success

        if (paymentSuccess) {
            await client.query(
                `UPDATE events.event_orders SET status = 'paid', payment_reference = $1, paid_at = CURRENT_TIMESTAMP WHERE id = $2`,
                [payment_reference || `PAY-${Date.now()}`, orderId]);

            // Update ticket status
            await client.query(
                "UPDATE events.event_tickets SET status = 'valid' WHERE order_id = $1",
                [orderId]);

            await client.query('COMMIT');
            res.json({ message: 'Payment successful', order_id: orderId });
        } else {
            await client.query('ROLLBACK');
            res.status(402).json({ error: 'Payment failed' });
        }
    } catch (err) {
        await client.query('ROLLBACK');
        throw err;
    } finally {
        client.release();
    }
}));

// ─── Refund ───────────────────────────────────────────────────────────

router.post('/orders/:orderId/refund', requireAuth, asyncHandler(async (req, res) => {
    if (!(await dbAvailable())) return res.status(503).json({ error: 'Database unavailable' });
    const { orderId } = req.params;
    const { reason } = req.body;

    const client = await pool.connect();
    try {
        await client.query('BEGIN');

        const order = await client.query(
            'SELECT * FROM events.event_orders WHERE id = $1 AND user_id = $2 FOR UPDATE',
            [orderId, req.user.id]);
        if (!order.rows.length) {
            await client.query('ROLLBACK');
            return res.status(404).json({ error: 'Order not found' });
        }
        if (order.rows[0].status !== 'paid') {
            await client.query('ROLLBACK');
            return res.status(400).json({ error: 'Can only refund paid orders' });
        }

        // Update order status
        await client.query(
            `UPDATE events.event_orders SET status = 'refunded', refund_reason = $1, refunded_at = CURRENT_TIMESTAMP WHERE id = $2`,
            [reason || 'Customer requested refund', orderId]);

        // Invalidate tickets
        await client.query(
            "UPDATE events.event_tickets SET status = 'refunded' WHERE order_id = $1",
            [orderId]);

        await client.query('COMMIT');
        res.json({ message: 'Refund processed' });
    } catch (err) {
        await client.query('ROLLBACK');
        throw err;
    } finally {
        client.release();
    }
}));

// ─── Check-in ─────────────────────────────────────────────────────────

router.post('/:id/checkin', requireAuth, asyncHandler(async (req, res) => {
    if (!(await dbAvailable())) return res.status(503).json({ error: 'Database unavailable' });
    const eventId = await resolveEventId(req.params.id);
    if (!eventId) return res.status(404).json({ error: 'Event not found' });
    const { ticket_code } = req.body;
    if (!ticket_code) return res.status(400).json({ error: 'Ticket code is required' });

    const r = await pool.query(
        `UPDATE events.event_tickets SET status = 'used', checked_in_at = CURRENT_TIMESTAMP
         WHERE event_id = $1 AND ticket_code = $2 AND status = 'valid'
         RETURNING *`, [eventId, ticket_code]);
    if (!r.rows.length) return res.status(404).json({ error: 'Invalid or already used ticket' });

    // Update registration attendance
    await pool.query(
        'UPDATE events.event_registrations SET attended = true WHERE event_id = $1 AND user_id = $2',
        [eventId, r.rows[0].user_id]);

    res.json({ message: 'Check-in successful', ticket: r.rows[0] });
}));

// ─── Event Analytics ──────────────────────────────────────────────────

router.get('/:id/analytics', requireAuth, asyncHandler(async (req, res) => {
    if (!(await dbAvailable())) return res.status(503).json({ error: 'Database unavailable' });
    const eventId = await resolveEventId(req.params.id);
    if (!eventId) return res.status(404).json({ error: 'Event not found' });

    const [registrations, revenue, tickets, attendance] = await Promise.all([
        pool.query('SELECT COUNT(*)::int AS total FROM events.event_registrations WHERE event_id = $1', [eventId]),
        pool.query(`SELECT COALESCE(SUM(total_amount), 0)::numeric AS total FROM events.event_orders WHERE event_id = $1 AND status = 'paid'`, [eventId]),
        pool.query(`SELECT tt.name, COUNT(t.id)::int AS sold FROM events.event_tickets t
            JOIN events.event_ticket_types tt ON tt.id = t.ticket_type_id
            WHERE t.event_id = $1 AND t.status = 'valid'
            GROUP BY tt.name`, [eventId]),
        pool.query('SELECT COUNT(*)::int AS attended FROM events.event_registrations WHERE event_id = $1 AND attended = true', [eventId])
    ]);

    res.json({
        registrations: registrations.rows[0].total,
        revenue: revenue.rows[0].total,
        tickets_sold: tickets.rows,
        attendance_rate: registrations.rows[0].total > 0
            ? Math.round((attendance.rows[0].attended / registrations.rows[0].total) * 100)
            : 0
    });
}));

// ─── Seed Events (Admin only) ─────────────────────────────────────────

router.post('/seed', requireAuth, asyncHandler(async (req, res) => {
    if (!(await dbAvailable())) return res.status(503).json({ error: 'Database unavailable' });

    const userRole = (req.user.role || '').toUpperCase();
    if (!['ADMIN', 'SUPERADMIN'].includes(userRole)) {
        return res.status(403).json({ error: 'Admin access required' });
    }

    // Check if events already exist
    const existing = await pool.query('SELECT COUNT(*)::int AS c FROM events.events');
    if (existing.rows[0].c > 0) {
        return res.json({ message: 'Events already exist', count: existing.rows[0].c });
    }

    const events = [
        {
            title: 'Advanced Flower Arrangement Workshop',
            description: 'Master the art of professional flower arrangement with hands-on training from industry experts. Learn bouquet design, color theory, and structural mechanics.',
            location: 'Online (Zoom)',
            event_date: '2026-08-20 10:00:00',
            end_date: '2026-08-20 13:00:00',
            event_type: 'WORKSHOP',
            event_category: 'Floristry Workshops',
            image_url: 'https://images.unsplash.com/photo-1490750967868-88df5691a78b?q=80&w=800&auto=format&fit=crop',
            max_participants: 150,
            price: 20.00,
            difficulty: 'Advanced',
            is_featured: true
        },
        {
            title: 'Medicinal Flowers Webinar',
            description: 'Discover the healing properties of common flowers and learn how to create natural remedies for everyday wellness.',
            location: 'Online (Zoom)',
            event_date: '2026-09-10 14:00:00',
            end_date: '2026-09-10 15:30:00',
            event_type: 'WEBINAR',
            event_category: 'Medicinal Plants',
            image_url: 'https://images.unsplash.com/photo-1471899236350-e3016bf1e69e?q=80&w=800&auto=format&fit=crop',
            max_participants: 500,
            price: 0,
            difficulty: 'Beginner',
            is_featured: true
        },
        {
            title: 'Annual Flower Exhibition',
            description: 'The largest flower exhibition in West Africa featuring international exhibitors, competitive displays, and rare plant auctions.',
            location: 'Accra International Conference Centre',
            event_date: '2026-10-10 09:00:00',
            end_date: '2026-10-12 18:00:00',
            event_type: 'EXHIBITION',
            event_category: 'Exhibitions',
            image_url: 'https://images.unsplash.com/photo-1567691482090-4cc36f5721f6?q=80&w=800&auto=format&fit=crop',
            max_participants: 1000,
            price: 20.00,
            difficulty: 'All Levels',
            is_featured: true
        },
        {
            title: 'Wedding Flower Planning 101',
            description: 'Expert tips for planning and executing stunning wedding flower designs on any budget. Perfect for aspiring wedding florists.',
            location: 'Online (Zoom)',
            event_date: '2026-08-05 18:00:00',
            end_date: '2026-08-05 19:30:00',
            event_type: 'WEBINAR',
            event_category: 'Floristry Workshops',
            image_url: 'https://images.unsplash.com/photo-1549488344-1f9b8d2bd1f3?q=80&w=800&auto=format&fit=crop',
            max_participants: 500,
            price: 0,
            difficulty: 'Beginner',
            is_featured: false
        },
        {
            title: 'Succulent Terrarium Building',
            description: 'Build your own beautiful succulent terrarium to take home. All materials included. Fun for all ages!',
            location: 'Takoradi Community Center',
            event_date: '2026-08-18 14:00:00',
            end_date: '2026-08-18 16:00:00',
            event_type: 'WORKSHOP',
            event_category: 'Gardening',
            image_url: 'https://images.unsplash.com/photo-1485955900006-10f4d324d411?q=80&w=800&auto=format&fit=crop',
            max_participants: 15,
            price: 25.00,
            difficulty: 'Beginner',
            is_featured: false
        },
        {
            title: 'Floral Photography Masterclass',
            description: 'Capture your floral arrangements beautifully with smartphone or DSLR. Learn lighting, composition and editing techniques.',
            location: 'Online (Live)',
            event_date: '2026-09-02 16:00:00',
            end_date: '2026-09-02 18:00:00',
            event_type: 'WEBINAR',
            event_category: 'Flower Care',
            image_url: 'https://images.unsplash.com/photo-1416879595882-3373a0480b5b?q=80&w=800&auto=format&fit=crop',
            max_participants: 100,
            price: 15.00,
            difficulty: 'Intermediate',
            is_featured: false
        }
    ];

    let inserted = 0;
    for (const e of events) {
        const slug = e.title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
        await pool.query(
            `INSERT INTO events.events (title, slug, description, location, event_date, end_date, event_type, event_category, image_url, max_participants, price, difficulty, is_featured, status, organizer_id)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, 'upcoming', $14)`,
            [e.title, slug, e.description, e.location, e.event_date, e.end_date, e.event_type, e.event_category, e.image_url, e.max_participants, e.price, e.difficulty, e.is_featured, req.user.id]
        );
        inserted++;
    }

    res.json({ message: `Seeded ${inserted} events`, count: inserted });
}));

module.exports = router;
