const router = require('express').Router();
const { pool, asyncHandler, dbAvailable, requireAuth, escapeHtml } = require('./middleware');

// ─── Research Categories ────────────────────────────────────────────────

router.get('/categories', asyncHandler(async (_, res) => {
    if (!(await dbAvailable())) return res.json([]);
    try {
        const r = await pool.query('SELECT * FROM research.categories ORDER BY sort_order');
        res.json(r.rows);
    } catch { res.json([]); }
}));

// ─── List Research Articles ─────────────────────────────────────────────

router.get('/', asyncHandler(async (req, res) => {
    if (!(await dbAvailable())) return res.json({ articles: [], total: 0, page: 1, pages: 0 });
    const { q, category, institution, year, sort = 'newest', page = 1, limit = 20 } = req.query;
    const pg = Math.max(1, parseInt(page, 10) || 1);
    const lim = Math.min(50, Math.max(1, parseInt(limit, 10) || 20));
    const offset = (pg - 1) * lim;

    try {
        const conditions = ["a.status = 'published'"];
        const values = [];
        let idx = 1;

        if (q) {
            conditions.push(`(a.title ILIKE $${idx} OR a.abstract ILIKE $${idx} OR EXISTS (SELECT 1 FROM research.article_authors aa JOIN research.authors au ON au.id = aa.author_id WHERE aa.article_id = a.id AND au.full_name ILIKE $${idx}))`);
            values.push(`%${q}%`); idx++;
        }
        if (category) { conditions.push(`c.slug = $${idx}`); values.push(category); idx++; }
        if (institution) { conditions.push(`i.name ILIKE $${idx}`); values.push(`%${institution}%`); idx++; }
        if (year) { conditions.push(`EXTRACT(YEAR FROM a.publication_date) = $${idx}`); values.push(parseInt(year, 10)); idx++; }

        const where = 'WHERE ' + conditions.join(' AND ');
        const sortMap = { newest: 'a.publication_date DESC', oldest: 'a.publication_date ASC', popular: 'a.views DESC', title: 'a.title ASC' };
        const orderBy = sortMap[sort] || 'a.publication_date DESC';

        const countR = await pool.query(`SELECT COUNT(*)::int AS c FROM research.articles a LEFT JOIN research.categories c ON c.id = a.category_id LEFT JOIN research.institutions i ON i.id = a.institution_id ${where}`, values);
        const total = countR.rows[0].c;

        values.push(lim, offset);
        const r = await pool.query(`
            SELECT a.id, a.title, a.slug, LEFT(a.abstract, 300) AS abstract_preview, a.publication_date,
                   a.cover_image, a.views, a.downloads, a.bookmark_count, a.doi, a.journal,
                   c.name AS category_name, c.slug AS category_slug, c.icon AS category_icon,
                   i.name AS institution_name,
                   (SELECT COALESCE(json_agg(au.full_name), '[]'::json)
                    FROM research.article_authors aa JOIN research.authors au ON au.id = aa.author_id
                    WHERE aa.article_id = a.id) AS authors
            FROM research.articles a
            LEFT JOIN research.categories c ON c.id = a.category_id
            LEFT JOIN research.institutions i ON i.id = a.institution_id
            ${where}
            ORDER BY ${orderBy}
            LIMIT $${idx} OFFSET $${idx + 1}`, values);

        res.json({ articles: r.rows, total, page: pg, pages: Math.ceil(total / lim) });
    } catch (err) {
        console.error('Research query error:', err.message);
        res.json({ articles: [], total: 0, page: pg, pages: 0 });
    }
}));

// ─── Featured Research ──────────────────────────────────────────────────

router.get('/featured', asyncHandler(async (_, res) => {
    if (!(await dbAvailable())) return res.json([]);
    try {
        const r = await pool.query(`
            SELECT a.id, a.title, a.slug, LEFT(a.abstract, 200) AS abstract_preview, a.publication_date,
                   a.cover_image, a.views, c.name AS category_name, c.icon AS category_icon,
                   i.name AS institution_name,
                   (SELECT COALESCE(json_agg(au.full_name), '[]'::json)
                    FROM research.article_authors aa JOIN research.authors au ON au.id = aa.author_id
                    WHERE aa.article_id = a.id) AS authors
            FROM research.articles a
            LEFT JOIN research.categories c ON c.id = a.category_id
            LEFT JOIN research.institutions i ON i.id = a.institution_id
            WHERE a.status = 'published'
            ORDER BY a.views DESC, a.publication_date DESC LIMIT 6`);
        res.json(r.rows);
    } catch { res.json([]); }
}));

// ─── Latest Publications ────────────────────────────────────────────────

router.get('/latest', asyncHandler(async (_, res) => {
    if (!(await dbAvailable())) return res.json([]);
    try {
        const r = await pool.query(`
            SELECT a.id, a.title, a.slug, LEFT(a.abstract, 200) AS abstract_preview, a.publication_date,
                   a.cover_image, c.name AS category_name, c.icon AS category_icon,
                   (SELECT COALESCE(json_agg(au.full_name), '[]'::json)
                    FROM research.article_authors aa JOIN research.authors au ON au.id = aa.author_id
                    WHERE aa.article_id = a.id) AS authors
            FROM research.articles a
            LEFT JOIN research.categories c ON c.id = a.category_id
            WHERE a.status = 'published'
            ORDER BY a.publication_date DESC LIMIT 10`);
        res.json(r.rows);
    } catch { res.json([]); }
}));

// ─── Research Detail ────────────────────────────────────────────────────

router.get('/:slug', asyncHandler(async (req, res) => {
    if (!(await dbAvailable())) return res.status(404).json({ error: 'Not found' });
    try {
        const r = await pool.query(`
            SELECT a.*,
                   c.name AS category_name, c.slug AS category_slug, c.icon AS category_icon,
                   i.name AS institution_name, i.country AS institution_country, i.website AS institution_website,
                   (SELECT COALESCE(json_agg(json_build_object('id', au.id, 'name', au.full_name, 'bio', au.biography, 'image', au.profile_image, 'orcid', au.orcid, 'institution', ai.name) ORDER BY aa.sort_order), '[]'::json)
                    FROM research.article_authors aa
                    JOIN research.authors au ON au.id = aa.author_id
                    LEFT JOIN research.institutions ai ON ai.id = au.institution_id
                    WHERE aa.article_id = a.id) AS author_details,
                   (SELECT COALESCE(json_agg(k.keyword), '[]'::json)
                    FROM research.article_keywords ak
                    JOIN research.keywords k ON k.id = ak.keyword_id
                    WHERE ak.article_id = a.id) AS keywords,
                   (SELECT COALESCE(json_agg(f.id || '|' || f.file_name || '|' || f.file_type || '|' || f.file_size), '[]'::json)
                    FROM research.files f WHERE f.article_id = a.id) AS files
            FROM research.articles a
            LEFT JOIN research.categories c ON c.id = a.category_id
            LEFT JOIN research.institutions i ON i.id = a.institution_id
            WHERE (a.slug = $1 OR a.id::text = $1) AND a.status = 'published'`, [req.params.slug]);

        if (!r.rows.length) return res.status(404).json({ error: 'Research not found' });

        // Increment views
        await pool.query('UPDATE research.articles SET views = views + 1 WHERE id = $1', [r.rows[0].id]);

        // Get related articles
        const related = await pool.query(`
            SELECT a.id, a.title, a.slug, LEFT(a.abstract, 150) AS abstract_preview, a.publication_date,
                   c.name AS category_name, c.icon AS category_icon
            FROM research.articles a
            LEFT JOIN research.categories c ON c.id = a.category_id
            WHERE a.id != $1 AND a.status = 'published'
            AND (a.category_id = $2 OR a.institution_id = $3)
            ORDER BY a.views DESC LIMIT 4`, [r.rows[0].id, r.rows[0].category_id, r.rows[0].institution_id]);

        res.json({ ...r.rows[0], related: related.rows });
    } catch (err) {
        console.error('Research detail error:', err.message);
        res.status(404).json({ error: 'Research not found' });
    }
}));

// ─── Bookmarks ──────────────────────────────────────────────────────────

router.get('/user/bookmarks', requireAuth, asyncHandler(async (req, res) => {
    if (!(await dbAvailable())) return res.json([]);
    try {
        const r = await pool.query(`
            SELECT b.id AS bookmark_id, b.folder, b.notes, b.created_at AS bookmarked_at,
                   a.id, a.title, a.slug, LEFT(a.abstract, 200) AS abstract_preview, a.publication_date,
                   c.name AS category_name, c.icon AS category_icon
            FROM research.bookmarks b
            JOIN research.articles a ON a.id = b.article_id
            LEFT JOIN research.categories c ON c.id = a.category_id
            WHERE b.user_id = $1
            ORDER BY b.created_at DESC`, [req.user.id]);
        res.json(r.rows);
    } catch { res.json([]); }
}));

router.post('/bookmarks/:articleId', requireAuth, asyncHandler(async (req, res) => {
    if (!(await dbAvailable())) return res.status(503).json({ error: 'Database unavailable' });
    const { folder, notes } = req.body;
    const existing = await pool.query('SELECT id FROM research.bookmarks WHERE user_id = $1 AND article_id = $2', [req.user.id, req.params.articleId]);
    if (existing.rows.length) {
        await pool.query('DELETE FROM research.bookmarks WHERE user_id = $1 AND article_id = $2', [req.user.id, req.params.articleId]);
        await pool.query('UPDATE research.articles SET bookmark_count = GREATEST(bookmark_count - 1, 0) WHERE id = $1', [req.params.articleId]);
        return res.json({ bookmarked: false });
    }
    await pool.query('INSERT INTO research.bookmarks (user_id, article_id, folder, notes) VALUES ($1, $2, $3, $4)', [req.user.id, req.params.articleId, folder || 'Default', notes || null]);
    await pool.query('UPDATE research.articles SET bookmark_count = bookmark_count + 1 WHERE id = $1', [req.params.articleId]);
    res.json({ bookmarked: true });
}));

router.delete('/bookmarks/:articleId', requireAuth, asyncHandler(async (req, res) => {
    if (!(await dbAvailable())) return res.status(503).json({ error: 'Database unavailable' });
    await pool.query('DELETE FROM research.bookmarks WHERE user_id = $1 AND article_id = $2', [req.user.id, req.params.articleId]);
    res.json({ message: 'Removed' });
}));

// ─── Submit Research (admin/researcher) ─────────────────────────────────

router.post('/', requireAuth, asyncHandler(async (req, res) => {
    if (!(await dbAvailable())) return res.status(503).json({ error: 'Database unavailable' });
    const { title, abstract, content, publication_date, category_id, institution_id, doi, journal, methodology, key_findings, practical_apps, author_ids, keywords } = req.body;
    if (!title) return res.status(400).json({ error: 'Title is required' });

    const slug = title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 500);

    const r = await pool.query(
        `INSERT INTO research.articles (title, slug, abstract, content, publication_date, category_id, institution_id, doi, journal, methodology, key_findings, practical_apps, submitted_by, status)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, 'pending') RETURNING *`,
        [title, slug, abstract || null, content || null, publication_date || null, category_id || null, institution_id || null, doi || null, journal || null, methodology || null, key_findings ? JSON.stringify(key_findings) : null, practical_apps || null, req.user.id]
    );

    // Link authors
    if (author_ids?.length) {
        for (let i = 0; i < author_ids.length; i++) {
            await pool.query('INSERT INTO research.article_authors (article_id, author_id, sort_order) VALUES ($1, $2, $3) ON CONFLICT DO NOTHING', [r.rows[0].id, author_ids[i], i]);
        }
    }

    // Link keywords
    if (keywords?.length) {
        for (const kw of keywords) {
            const kwR = await pool.query('INSERT INTO research.keywords (keyword) VALUES ($1) ON CONFLICT (keyword) DO UPDATE SET keyword = $1 RETURNING id', [kw.toLowerCase()]);
            await pool.query('INSERT INTO research.article_keywords (article_id, keyword_id) VALUES ($1, $2) ON CONFLICT DO NOTHING', [r.rows[0].id, kwR.rows[0].id]);
        }
    }

    res.status(201).json(r.rows[0]);
}));

// ─── Admin: approve research ────────────────────────────────────────────

router.put('/:id/approve', requireAuth, asyncHandler(async (req, res) => {
    if (!(await dbAvailable())) return res.status(503).json({ error: 'Database unavailable' });
    const userRole = (req.user.role || '').toUpperCase();
    if (!['ADMIN', 'SUPERADMIN'].includes(userRole)) return res.status(403).json({ error: 'Admin access required' });

    const r = await pool.query(
        'UPDATE research.articles SET status = $1, approved_by = $2 WHERE id = $3 RETURNING *',
        ['published', req.user.id, req.params.id]
    );
    if (!r.rows.length) return res.status(404).json({ error: 'Not found' });
    res.json(r.rows[0]);
}));

router.put('/:id/reject', requireAuth, asyncHandler(async (req, res) => {
    if (!(await dbAvailable())) return res.status(503).json({ error: 'Database unavailable' });
    const userRole = (req.user.role || '').toUpperCase();
    if (!['ADMIN', 'SUPERADMIN'].includes(userRole)) return res.status(403).json({ error: 'Admin access required' });

    const r = await pool.query(
        'UPDATE research.articles SET status = $1 WHERE id = $2 RETURNING *',
        ['rejected', req.params.id]
    );
    if (!r.rows.length) return res.status(404).json({ error: 'Not found' });
    res.json(r.rows[0]);
}));

module.exports = router;
