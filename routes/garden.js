const router = require('express').Router();
const path = require('path');
const { pool, upload, asyncHandler, escapeHtml, dbAvailable, requireAuth, getFileUrl } = require('./middleware');

// Garden Journal
router.get('/journal/entries', requireAuth, asyncHandler(async (req, res) => {
    if (!(await dbAvailable())) return res.json([]);
    try {
        const r = await pool.query(`
            SELECT e.*,
                (SELECT COUNT(*) FROM garden.journal_photos WHERE entry_id = e.id) AS photo_count,
                (SELECT COUNT(*) FROM garden.journal_plants WHERE entry_id = e.id) AS plant_count,
                (SELECT json_agg(json_build_object('image_url', image_url, 'caption', caption, 'plant_name', plant_name) ORDER BY sort_order) FROM garden.journal_photos WHERE entry_id = e.id) AS photos,
                (SELECT json_agg(json_build_object('plant_name', plant_name, 'action', action, 'notes', notes) ORDER BY created_at) FROM garden.journal_plants WHERE entry_id = e.id) AS plants
            FROM garden.journal_entries e WHERE e.user_id = $1 ORDER BY e.entry_date DESC, e.created_at DESC LIMIT 50`, [req.user.id]);
        res.json(r.rows);
    } catch { res.json([]); }
}));

router.get('/journal/entries/:id', requireAuth, asyncHandler(async (req, res) => {
    if (!(await dbAvailable())) return res.status(404).json({ error: 'Not found' });
    try {
        const r = await pool.query(`
            SELECT e.*,
                (SELECT json_agg(json_build_object('id', p.id, 'image_url', p.image_url, 'caption', p.caption, 'plant_name', p.plant_name) ORDER BY p.sort_order) FROM garden.journal_photos p WHERE p.entry_id = e.id) AS photos,
                (SELECT json_agg(json_build_object('id', p.id, 'plant_name', p.plant_name, 'action', p.action, 'notes', p.notes) ORDER BY p.created_at) FROM garden.journal_plants p WHERE p.entry_id = e.id) AS plants
            FROM garden.journal_entries e WHERE e.id = $1 AND e.user_id = $2`, [req.params.id, req.user.id]);
        if (!r.rows.length) return res.status(404).json({ error: 'Entry not found' });
        res.json(r.rows[0]);
    } catch { res.status(404).json({ error: 'Entry not found' }); }
}));

router.post('/journal/entries', requireAuth, upload.array('photos', 10), asyncHandler(async (req, res) => {
    if (!(await dbAvailable())) return res.status(503).json({ error: 'Database unavailable' });
    const { title, content, entry_date, weather, temperature, mood, garden_area, plants } = req.body;
    if (!title) return res.status(400).json({ error: 'Title is required' });
    const r = await pool.query(
        `INSERT INTO garden.journal_entries (user_id, title, content, entry_date, weather, temperature, mood, garden_area)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING *`,
        [req.user.id, escapeHtml(title).slice(0, 255), escapeHtml(content || '').slice(0, 5000),
         entry_date || new Date().toISOString().split('T')[0], weather || null, temperature || null, mood || null, garden_area || null]
    );
    const entryId = r.rows[0].id;
    if (req.files && req.files.length) {
        for (let i = 0; i < req.files.length; i++) {
            await pool.query('INSERT INTO garden.journal_photos (entry_id, image_url, sort_order) VALUES ($1, $2, $3)', [entryId, getFileUrl(req.files[i]), i]);
        }
    }
    if (plants) {
        const plantList = typeof plants === 'string' ? JSON.parse(plants) : plants;
        for (const p of plantList) {
            if (p.name) {
                await pool.query('INSERT INTO garden.journal_plants (entry_id, plant_name, action, notes) VALUES ($1, $2, $3, $4)', [entryId, p.name, p.action || null, p.notes || null]);
            }
        }
    }
    res.status(201).json(r.rows[0]);
}));

router.put('/journal/entries/:id', requireAuth, asyncHandler(async (req, res) => {
    if (!(await dbAvailable())) return res.status(503).json({ error: 'Database unavailable' });
    const { id } = req.params;
    const existing = await pool.query('SELECT id FROM garden.journal_entries WHERE id = $1 AND user_id = $2', [id, req.user.id]);
    if (!existing.rows.length) return res.status(404).json({ error: 'Entry not found' });
    const { title, content, entry_date, weather, temperature, mood, garden_area } = req.body;
    const r = await pool.query(
        `UPDATE garden.journal_entries SET title = COALESCE($1, title), content = COALESCE($2, content),
            entry_date = COALESCE($3, entry_date), weather = COALESCE($4, weather),
            temperature = COALESCE($5, temperature), mood = COALESCE($6, mood),
            garden_area = COALESCE($7, garden_area), updated_at = CURRENT_TIMESTAMP
         WHERE id = $8 RETURNING *`,
        [title, content, entry_date, weather, temperature, mood, garden_area, id]
    );
    res.json(r.rows[0]);
}));

router.delete('/journal/entries/:id', requireAuth, asyncHandler(async (req, res) => {
    if (!(await dbAvailable())) return res.status(503).json({ error: 'Database unavailable' });
    const { id } = req.params;
    const r = await pool.query('DELETE FROM garden.journal_entries WHERE id = $1 AND user_id = $2 RETURNING id', [id, req.user.id]);
    if (!r.rows.length) return res.status(404).json({ error: 'Entry not found' });
    res.json({ message: 'Entry deleted' });
}));

router.get('/journal/reminders', requireAuth, asyncHandler(async (req, res) => {
    if (!(await dbAvailable())) return res.json([]);
    try {
        const r = await pool.query('SELECT * FROM garden.journal_reminders WHERE user_id = $1 ORDER BY reminder_date ASC LIMIT 20', [req.user.id]);
        res.json(r.rows);
    } catch { res.json([]); }
}));

router.post('/journal/reminders', requireAuth, asyncHandler(async (req, res) => {
    if (!(await dbAvailable())) return res.status(503).json({ error: 'Database unavailable' });
    const { title, reminder_date, plant_name, task_type } = req.body;
    if (!title || !reminder_date) return res.status(400).json({ error: 'Title and date are required' });
    const r = await pool.query('INSERT INTO garden.journal_reminders (user_id, title, reminder_date, plant_name, task_type) VALUES ($1, $2, $3, $4, $5) RETURNING *', [req.user.id, escapeHtml(title).slice(0, 255), reminder_date, plant_name || null, task_type || null]);
    res.status(201).json(r.rows[0]);
}));

router.put('/journal/reminders/:id', requireAuth, asyncHandler(async (req, res) => {
    if (!(await dbAvailable())) return res.status(503).json({ error: 'Database unavailable' });
    const { id } = req.params;
    const { is_completed } = req.body;
    const r = await pool.query('UPDATE garden.journal_reminders SET is_completed = $1 WHERE id = $2 AND user_id = $3 RETURNING *', [is_completed, id, req.user.id]);
    if (!r.rows.length) return res.status(404).json({ error: 'Reminder not found' });
    res.json(r.rows[0]);
}));

router.delete('/journal/reminders/:id', requireAuth, asyncHandler(async (req, res) => {
    if (!(await dbAvailable())) return res.status(503).json({ error: 'Database unavailable' });
    const { id } = req.params;
    const r = await pool.query('DELETE FROM garden.journal_reminders WHERE id = $1 AND user_id = $2 RETURNING id', [id, req.user.id]);
    if (!r.rows.length) return res.status(404).json({ error: 'Reminder not found' });
    res.json({ message: 'Reminder deleted' });
}));

// Planting Calendar
router.get('/planting/tasks', asyncHandler(async (req, res) => {
    const { month, season } = req.query;
    if (await dbAvailable()) {
        try {
            let query = 'SELECT * FROM learning.planting_tasks';
            const conditions = [];
            const values = [];
            let idx = 1;
            if (month) { conditions.push(`month = $${idx}`); values.push(parseInt(month, 10)); idx++; }
            if (season) { conditions.push(`season = $${idx}`); values.push(season); idx++; }
            if (conditions.length) query += ' WHERE ' + conditions.join(' AND ');
            query += ' ORDER BY month, priority DESC';
            const r = await pool.query(query, values);
            if (r.rows.length) return res.json(r.rows);
        } catch {}
    }
    const months = { 1:'Winter', 2:'Winter', 3:'Spring', 4:'Spring', 5:'Spring', 6:'Summer', 7:'Summer', 8:'Summer', 9:'Fall', 10:'Fall', 11:'Fall', 12:'Winter' };
    const m = month ? parseInt(month, 10) : null;
    let tasks = [
        { month: 1, season: 'Winter', task_type: 'planning', title: 'Plan Your Spring Garden', description: 'Start planning your garden layout. Order seeds and bulbs for spring planting.', plant_names: 'All flowers' },
        { month: 1, season: 'Winter', task_type: 'indoor', title: 'Start Seeds Indoors', description: 'Begin starting seeds indoors for annuals that need a head start.', plant_names: 'Petunias, Marigolds, Zinnias' },
        { month: 2, season: 'Winter', task_type: 'indoor', title: 'Continue Indoor Seeding', description: 'Start more seeds indoors. Check stored bulbs for sprouting.', plant_names: 'Geraniums, Begonias' },
        { month: 3, season: 'Spring', task_type: 'outdoor', title: 'Plant Cool-Season Annuals', description: 'Plant cool-season annuals directly outdoors as soil becomes workable.', plant_names: 'Pansies, Snapdragons, Dianthus' },
        { month: 4, season: 'Spring', task_type: 'outdoor', title: 'Plant Spring Annuals', description: 'After last frost, plant spring annuals in prepared beds.', plant_names: 'Tulips, Daffodils, Hyacinths' },
        { month: 5, season: 'Spring', task_type: 'outdoor', title: 'Plant Warm-Season Annuals', description: 'Plant warm-season annuals after danger of frost has passed.', plant_names: 'Petunias, Marigolds, Zinnias, Sunflowers' },
        { month: 6, season: 'Summer', task_type: 'outdoor', title: 'Plant Summer Bloomers', description: 'Plant heat-loving annuals and perennials for summer color.', plant_names: 'Lantana, Pentas, Cannas, Salvia' },
        { month: 7, season: 'Summer', task_type: 'outdoor', title: 'Plant Fall-Blooming Plants', description: 'Plant chrysanthemums and asters for fall color.', plant_names: 'Mums, Asters, Sedum' },
        { month: 8, season: 'Summer', task_type: 'outdoor', title: 'Sow Fall Annuals', description: 'Sow seeds for fall-blooming annuals.', plant_names: 'Asters, Chrysanthemums, Pansies' },
        { month: 9, season: 'Fall', task_type: 'outdoor', title: 'Plant Spring Bulbs', description: 'Plant spring-blooming bulbs 6-8 weeks before first frost.', plant_names: 'Tulips, Daffodils, Crocuses, Alliums' },
        { month: 10, season: 'Fall', task_type: 'outdoor', title: 'Plant Spring Bulbs (continued)', description: 'Continue planting spring-flowering bulbs.', plant_names: 'Garlic, Tulips, Daffodils' },
        { month: 11, season: 'Fall', task_type: 'maintenance', title: 'Protect Perennials', description: 'Apply mulch to protect perennial roots from winter cold.', plant_names: 'All perennials' },
        { month: 12, season: 'Winter', task_type: 'indoor', title: 'Force Indoor Blooms', description: 'Force bulbs indoors for winter color.', plant_names: 'Paperwhites, Amaryllis, Hyacinths' }
    ];
    if (m) tasks = tasks.filter(t => t.month === m);
    if (season) tasks = tasks.filter(t => t.season === season);
    res.json(tasks);
}));

router.get('/planting/guides', asyncHandler(async (_, res) => {
    if (await dbAvailable()) {
        try {
            const r = await pool.query('SELECT * FROM learning.seasonal_guides WHERE is_published = true ORDER BY season');
            if (r.rows.length) return res.json(r.rows);
        } catch {}
    }
    res.json([
        { season: 'Spring', title: 'Spring Planting Guide', content: 'Spring is the most exciting time in the garden.', tips: ['Start seeds indoors 6-8 weeks before last frost','Prepare beds with compost','Plant cool-season annuals','Divide perennials','Apply pre-emergent'] },
        { season: 'Summer', title: 'Summer Care Guide', content: 'Summer brings vibrant blooms but also heat stress.', tips: ['Water deeply in the morning','Mulch to retain moisture','Deadhead spent blooms','Watch for pests','Provide shade for sensitive plants'] },
        { season: 'Fall', title: 'Fall Planting Guide', content: 'Fall is perfect for planting trees, shrubs, and spring bulbs.', tips: ['Plant bulbs 6-8 weeks before frost','Lift tender bulbs','Plant cool-season annuals','Apply mulch','Clean up beds'] },
        { season: 'Winter', title: 'Winter Garden Planning', content: 'Winter is planning season for the year ahead.', tips: ['Order seeds early','Review past seasons','Clean tools','Force bulbs indoors','Plan new beds'] }
    ]);
}));

router.get('/planting/zones', asyncHandler(async (_, res) => {
    if (await dbAvailable()) {
        try {
            const r = await pool.query('SELECT * FROM learning.planting_zones ORDER BY min_temp');
            if (r.rows.length) return res.json(r.rows);
        } catch {}
    }
    res.json([
        { zone_name: 'Tropical (10-13)', min_temp: 60, max_temp: 90, description: 'Year-round growing season, frost-free' },
        { zone_name: 'Subtropical (8-9)', min_temp: 40, max_temp: 80, description: 'Mild winters, long growing season' },
        { zone_name: 'Temperate (5-7)', min_temp: 0, max_temp: 75, description: 'Four distinct seasons, moderate winters' },
        { zone_name: 'Continental (3-4)', min_temp: -30, max_temp: 70, description: 'Cold winters, warm summers' },
        { zone_name: 'Boreal (1-2)', min_temp: -50, max_temp: 60, description: 'Short growing season, harsh winters' }
    ]);
}));

module.exports = router;
