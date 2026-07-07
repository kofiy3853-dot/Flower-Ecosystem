const router = require('express').Router();
const { pool, requireAuth, asyncHandler, dbAvailable } = require('./middleware');

// ─── Get user's garden ────────────────────────────────────────────────
router.get('/garden', requireAuth, asyncHandler(async (req, res) => {
    if (!(await dbAvailable())) return res.json([]);

    try {
        const r = await pool.query(`
            SELECT ug.*, f.common_name, f.scientific_name, f.care_level, f.sunlight, f.water_requirements,
                (SELECT image_url FROM learning.flower_images WHERE flower_id = f.id AND is_primary = true LIMIT 1) AS image,
                (SELECT MAX(performed_at) FROM learning.garden_care_logs WHERE garden_id = ug.id AND care_type = 'water') AS last_watered,
                (SELECT MAX(performed_at) FROM learning.garden_care_logs WHERE garden_id = ug.id AND care_type = 'fertilize') AS last_fertilized
            FROM learning.user_gardens ug
            JOIN learning.flowers f ON f.id = ug.flower_id
            WHERE ug.user_id = $1
            ORDER BY ug.date_added DESC`, [req.user.id]);
        res.json(r.rows);
    } catch { res.json([]); }
}));

// ─── Add flower to garden ─────────────────────────────────────────────
router.post('/garden', requireAuth, asyncHandler(async (req, res) => {
    if (!(await dbAvailable())) return res.status(503).json({ error: 'Database unavailable' });

    const { flower_id, nickname, location } = req.body;
    if (!flower_id) return res.status(400).json({ error: 'Flower ID is required' });

    try {
        const r = await pool.query(
            `INSERT INTO learning.user_gardens (user_id, flower_id, nickname, location)
             VALUES ($1, $2, $3, $4)
             ON CONFLICT (user_id, flower_id) DO NOTHING
             RETURNING *`,
            [req.user.id, flower_id, nickname || null, location || null]
        );
        res.status(201).json(r.rows[0] || { message: 'Already in garden' });
    } catch (err) {
        if (err.code === '23505') return res.status(409).json({ error: 'Already in your garden' });
        throw err;
    }
}));

// ─── Remove from garden ───────────────────────────────────────────────
router.delete('/garden/:id', requireAuth, asyncHandler(async (req, res) => {
    if (!(await dbAvailable())) return res.status(503).json({ error: 'Database unavailable' });

    const r = await pool.query('DELETE FROM learning.user_gardens WHERE id = $1 AND user_id = $2 RETURNING *', [req.params.id, req.user.id]);
    if (!r.rows.length) return res.status(404).json({ error: 'Not found' });
    res.json({ message: 'Removed from garden' });
}));

// ─── Log care activity ────────────────────────────────────────────────
router.post('/garden/:id/care', requireAuth, asyncHandler(async (req, res) => {
    if (!(await dbAvailable())) return res.status(503).json({ error: 'Database unavailable' });

    const { care_type, notes } = req.body;
    const validTypes = ['water', 'fertilize', 'prune', 'repot', 'treat'];
    if (!validTypes.includes(care_type)) return res.status(400).json({ error: 'Invalid care type' });

    const garden = await pool.query('SELECT id FROM learning.user_gardens WHERE id = $1 AND user_id = $2', [req.params.id, req.user.id]);
    if (!garden.rows.length) return res.status(404).json({ error: 'Garden entry not found' });

    const r = await pool.query(
        'INSERT INTO learning.garden_care_logs (garden_id, care_type, notes) VALUES ($1, $2, $3) RETURNING *',
        [req.params.id, care_type, notes || null]
    );

    // Update last care timestamp
    const columnMap = { water: 'last_watered', fertilize: 'last_fertilized', prune: 'last_pruned' };
    if (columnMap[care_type]) {
        await pool.query(`UPDATE learning.user_gardens SET ${columnMap[care_type]} = CURRENT_TIMESTAMP WHERE id = $1`, [req.params.id]);
    }

    res.status(201).json(r.rows[0]);
}));

// ─── Get care history ─────────────────────────────────────────────────
router.get('/garden/:id/care', requireAuth, asyncHandler(async (req, res) => {
    if (!(await dbAvailable())) return res.json([]);

    try {
        const r = await pool.query(
            'SELECT * FROM learning.garden_care_logs WHERE garden_id = $1 ORDER BY performed_at DESC LIMIT 20',
            [req.params.id]
        );
        res.json(r.rows);
    } catch { res.json([]); }
}));

// ─── Add garden photo ─────────────────────────────────────────────────
router.post('/garden/:id/photos', requireAuth, asyncHandler(async (req, res) => {
    if (!(await dbAvailable())) return res.status(503).json({ error: 'Database unavailable' });

    const { image_url, height, notes, bloom_date } = req.body;
    if (!image_url) return res.status(400).json({ error: 'Image URL is required' });

    const r = await pool.query(
        'INSERT INTO learning.garden_photos (garden_id, image_url, height, notes, bloom_date) VALUES ($1, $2, $3, $4, $5) RETURNING *',
        [req.params.id, image_url, height || null, notes || null, bloom_date || null]
    );
    res.status(201).json(r.rows[0]);
}));

// ─── Get garden photos ────────────────────────────────────────────────
router.get('/garden/:id/photos', requireAuth, asyncHandler(async (req, res) => {
    if (!(await dbAvailable())) return res.json([]);

    try {
        const r = await pool.query(
            'SELECT * FROM learning.garden_photos WHERE garden_id = $1 ORDER BY taken_at DESC',
            [req.params.id]
        );
        res.json(r.rows);
    } catch { res.json([]); }
}));

// ─── Get garden stats ─────────────────────────────────────────────────
router.get('/garden/stats', requireAuth, asyncHandler(async (req, res) => {
    if (!(await dbAvailable())) return res.json({ total: 0, healthy: 0, needAttention: 0 });

    try {
        const r = await pool.query(`
            SELECT
                COUNT(*)::int AS total,
                COUNT(*) FILTER (WHERE status = 'healthy')::int AS healthy,
                COUNT(*) FILTER (WHERE status != 'healthy')::int AS need_attention
            FROM learning.user_gardens WHERE user_id = $1`, [req.user.id]);
        res.json(r.rows[0]);
    } catch { res.json({ total: 0, healthy: 0, needAttention: 0 }); }
}));

// ─── Get care reminders ───────────────────────────────────────────────
router.get('/garden/reminders', requireAuth, asyncHandler(async (req, res) => {
    if (!(await dbAvailable())) return res.json([]);

    try {
        const r = await pool.query(`
            SELECT ug.id, f.common_name, f.water_requirements, ug.last_watered,
                CASE
                    WHEN ug.last_watered IS NULL THEN 'overdue'
                    WHEN ug.last_watered < CURRENT_TIMESTAMP - INTERVAL '3 days' THEN 'due'
                    ELSE 'ok'
                END AS water_status
            FROM learning.user_gardens ug
            JOIN learning.flowers f ON f.id = ug.flower_id
            WHERE ug.user_id = $1
            ORDER BY water_status, ug.last_watered ASC`, [req.user.id]);
        res.json(r.rows);
    } catch { res.json([]); }
}));

module.exports = router;
