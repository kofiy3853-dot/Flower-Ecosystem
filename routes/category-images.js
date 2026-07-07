const router = require('express').Router();
const path = require('path');
const fs = require('fs');
const { pool, requireAuth, asyncHandler, dbAvailable } = require('./middleware');
const multer = require('multer');
const sharp = require('sharp');

// Configure multer for category images
const uploadsDir = path.join(__dirname, '..', 'uploads', 'categories');
if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir, { recursive: true });
}

const storage = multer.diskStorage({
    destination: (req, file, cb) => cb(null, uploadsDir),
    filename: (req, file, cb) => {
        const ext = path.extname(file.originalname).toLowerCase();
        cb(null, `cat-${Date.now()}-${Math.random().toString(36).substr(2, 8)}${ext}`);
    }
});

const upload = multer({
    storage,
    limits: { fileSize: 5 * 1024 * 1024 },
    fileFilter: (req, file, cb) => {
        const allowed = /\.(jpg|jpeg|png|webp)$/i;
        if (allowed.test(path.extname(file.originalname))) {
            cb(null, true);
        } else {
            cb(new Error('Only image files (jpg, png, webp) are allowed'));
        }
    }
});

// ─── Get images for a category ────────────────────────────────────────
router.get('/categories/:id/images', asyncHandler(async (req, res) => {
    const { id } = req.params;
    const { status, sort = 'newest', page = 1, limit = 30 } = req.query;

    if (await dbAvailable()) {
        try {
            const conditions = ['ci.category_id = $1'];
            const values = [id];
            let idx = 2;

            if (status) { conditions.push(`ci.status = $${idx}`); values.push(status); idx++; }

            const where = 'WHERE ' + conditions.join(' AND ');
            const sortMap = { newest: 'ci.created_at DESC', oldest: 'ci.created_at ASC', featured: 'ci.is_featured DESC, ci.display_order ASC' };
            const orderBy = sortMap[sort] || 'ci.created_at DESC';

            const pg = Math.max(1, parseInt(page, 10) || 1);
            const lim = Math.min(100, Math.max(1, parseInt(limit, 10) || 30));
            const offset = (pg - 1) * lim;

            const countR = await pool.query(`SELECT COUNT(*)::int AS c FROM marketplace.category_images ci ${where}`, values);
            const total = countR.rows[0].c;

            values.push(lim, offset);
            const dataR = await pool.query(
                `SELECT ci.*, c.name AS category_name
                 FROM marketplace.category_images ci
                 JOIN marketplace.categories c ON c.id = ci.category_id
                 ${where}
                 ORDER BY ci.is_featured DESC, ${orderBy}
                 LIMIT $${idx} OFFSET $${idx + 1}`, values);

            return res.json({ images: dataR.rows, total, page: pg, pages: Math.ceil(total / lim) });
        } catch (err) {
            console.error('Get category images error:', err.message);
        }
    }
    res.json({ images: [], total: 0, page: 1, pages: 1 });
}));

// ─── Upload images to a category ──────────────────────────────────────
router.post('/categories/:id/images', requireAuth, upload.array('images', 10), asyncHandler(async (req, res) => {
    if (!(await dbAvailable())) return res.status(503).json({ error: 'Database unavailable' });

    const { id } = req.params;
    const { alt_text, caption, photographer } = req.body;

    // Verify category exists
    const cat = await pool.query('SELECT id FROM marketplace.categories WHERE id = $1', [id]);
    if (!cat.rows.length) return res.status(404).json({ error: 'Category not found' });

    if (!req.files || !req.files.length) {
        return res.status(400).json({ error: 'No images uploaded' });
    }

    const results = [];
    for (const file of req.files) {
        // Compress image
        const compressedPath = file.path.replace(path.extname(file.path), '-compressed.webp');
        try {
            await sharp(file.path)
                .resize(1200, 1200, { fit: 'inside', withoutEnlargement: true })
                .webp({ quality: 85 })
                .toFile(compressedPath);
            fs.unlinkSync(file.path);
        } catch (e) {
            // Keep original if compression fails
        }

        const finalPath = fs.existsSync(compressedPath) ? compressedPath : file.path;
        const storagePath = '/uploads/categories/' + path.basename(finalPath);

        const r = await pool.query(
            `INSERT INTO marketplace.category_images (category_id, file_name, storage_path, alt_text, caption, photographer, display_order)
             VALUES ($1, $2, $3, $4, $5, $6, (SELECT COALESCE(MAX(display_order), 0) + 1 FROM marketplace.category_images WHERE category_id = $1))
             RETURNING *`,
            [id, file.originalname, storagePath, alt_text || null, caption || null, photographer || null]
        );
        results.push(r.rows[0]);
    }

    res.status(201).json(results);
}));

// ─── Update image info ────────────────────────────────────────────────
router.put('/images/:id', requireAuth, asyncHandler(async (req, res) => {
    if (!(await dbAvailable())) return res.status(503).json({ error: 'Database unavailable' });

    const { id } = req.params;
    const { alt_text, caption, photographer, display_order } = req.body;

    const r = await pool.query(
        `UPDATE marketplace.category_images SET
            alt_text = COALESCE($1, alt_text),
            caption = COALESCE($2, caption),
            photographer = COALESCE($3, photographer),
            display_order = COALESCE($4, display_order)
         WHERE id = $5 RETURNING *`,
        [alt_text, caption, photographer, display_order, id]
    );

    if (!r.rows.length) return res.status(404).json({ error: 'Image not found' });
    res.json(r.rows[0]);
}));

// ─── Replace image file ───────────────────────────────────────────────
router.put('/images/:id/replace', requireAuth, upload.single('image'), asyncHandler(async (req, res) => {
    if (!(await dbAvailable())) return res.status(503).json({ error: 'Database unavailable' });

    const { id } = req.params;
    if (!req.file) return res.status(400).json({ error: 'No image provided' });

    const existing = await pool.query('SELECT * FROM marketplace.category_images WHERE id = $1', [id]);
    if (!existing.rows.length) return res.status(404).json({ error: 'Image not found' });

    // Delete old file
    const oldPath = path.join(__dirname, '..', existing.rows[0].storage_path);
    if (fs.existsSync(oldPath)) fs.unlinkSync(oldPath);

    // Compress new image
    const compressedPath = req.file.path.replace(path.extname(req.file.path), '-compressed.webp');
    try {
        await sharp(req.file.path)
            .resize(1200, 1200, { fit: 'inside', withoutEnlargement: true })
            .webp({ quality: 85 })
            .toFile(compressedPath);
        fs.unlinkSync(req.file.path);
    } catch (e) {}

    const finalPath = fs.existsSync(compressedPath) ? compressedPath : req.file.path;
    const storagePath = '/uploads/categories/' + path.basename(finalPath);

    const r = await pool.query(
        'UPDATE marketplace.category_images SET storage_path = $1, file_name = $2 WHERE id = $3 RETURNING *',
        [storagePath, req.file.originalname, id]
    );

    res.json(r.rows[0]);
}));

// ─── Delete image ─────────────────────────────────────────────────────
router.delete('/images/:id', requireAuth, asyncHandler(async (req, res) => {
    if (!(await dbAvailable())) return res.status(503).json({ error: 'Database unavailable' });

    const { id } = req.params;
    const existing = await pool.query('SELECT * FROM marketplace.category_images WHERE id = $1', [id]);
    if (!existing.rows.length) return res.status(404).json({ error: 'Image not found' });

    // Delete physical file
    const filePath = path.join(__dirname, '..', existing.rows[0].storage_path);
    if (fs.existsSync(filePath)) fs.unlinkSync(filePath);

    await pool.query('DELETE FROM marketplace.category_images WHERE id = $1', [id]);
    res.json({ message: 'Image deleted' });
}));

// ─── Set featured image ───────────────────────────────────────────────
router.patch('/images/:id/feature', requireAuth, asyncHandler(async (req, res) => {
    if (!(await dbAvailable())) return res.status(503).json({ error: 'Database unavailable' });

    const { id } = req.params;
    const existing = await pool.query('SELECT * FROM marketplace.category_images WHERE id = $1', [id]);
    if (!existing.rows.length) return res.status(404).json({ error: 'Image not found' });

    // Remove featured from all images in this category
    await pool.query('UPDATE marketplace.category_images SET is_featured = false WHERE category_id = $1', [existing.rows[0].category_id]);

    // Set this image as featured
    const r = await pool.query('UPDATE marketplace.category_images SET is_featured = true WHERE id = $1 RETURNING *', [id]);
    res.json(r.rows[0]);
}));

// ─── Toggle image status ──────────────────────────────────────────────
router.patch('/images/:id/status', requireAuth, asyncHandler(async (req, res) => {
    if (!(await dbAvailable())) return res.status(503).json({ error: 'Database unavailable' });

    const { id } = req.params;
    const { status } = req.body;
    if (!['active', 'inactive'].includes(status)) {
        return res.status(400).json({ error: 'Status must be active or inactive' });
    }

    const r = await pool.query('UPDATE marketplace.category_images SET status = $1 WHERE id = $2 RETURNING *', [status, id]);
    if (!r.rows.length) return res.status(404).json({ error: 'Image not found' });
    res.json(r.rows[0]);
}));

// ─── Get random/featured image for category (public) ──────────────────
router.get('/categories/:id/random-image', asyncHandler(async (req, res) => {
    const { id } = req.params;

    if (await dbAvailable()) {
        try {
            // Try featured first
            const featured = await pool.query(
                'SELECT storage_path, alt_text FROM marketplace.category_images WHERE category_id = $1 AND is_featured = true AND status = $1 LIMIT 1',
                [id, 'active']
            );
            if (featured.rows.length) return res.json(featured.rows[0]);

            // Random active image
            const random = await pool.query(
                'SELECT storage_path, alt_text FROM marketplace.category_images WHERE category_id = $1 AND status = $2 ORDER BY RANDOM() LIMIT 1',
                [id, 'active']
            );
            if (random.rows.length) return res.json(random.rows[0]);
        } catch {}
    }
    res.json(null);
}));

module.exports = router;
