const router = require('express').Router();
const { pool, asyncHandler, dbAvailable, requireAuth, requireRole, getFileUrl, upload, uploadVideo } = require('./middleware');

// ─── Submit Instructor Application ──────────────────────
router.post('/apply', requireAuth, asyncHandler(async (req, res) => {
    if (!(await dbAvailable())) return res.status(503).json({ error: 'Database unavailable' });

    const userId = req.user.id;

    // Check if user already has a pending or approved application
    const existing = await pool.query(
        `SELECT id, status FROM learning.instructor_applications WHERE user_id = $1 AND status IN ('pending','under_review','approved')`,
        [userId]
    );
    if (existing.rows.length) {
        const s = existing.rows[0].status;
        if (s === 'approved') return res.status(400).json({ error: 'You are already an approved instructor' });
        return res.status(400).json({ error: `You already have a ${s} application` });
    }

    const {
        full_name, email, phone, country, city, languages, profile_photo,
        professional_title, years_experience, current_employer, own_business,
        bio, expertise, education, certifications, portfolio,
        has_taught_before, teaching_format, students_taught, previous_platforms,
        intro_video, sample_lesson_url, sample_lesson_outline,
        gov_id_url, selfie_url,
        website, business_website, portfolio_url, social_links,
        bank_account_name, bank_name, bank_account_number, bank_routing,
        mobile_money_number, tax_id, payout_method,
        terms_accepted, content_guidelines, copyright_policy, community_standards
    } = req.body;

    if (!full_name || !email) return res.status(400).json({ error: 'Full name and email are required' });
    if (!bio) return res.status(400).json({ error: 'Professional bio is required' });
    if (!expertise || !expertise.length) return res.status(400).json({ error: 'At least one area of expertise is required' });
    if (!years_experience) return res.status(400).json({ error: 'Years of experience is required' });
    if (!gov_id_url) return res.status(400).json({ error: 'Government ID is required for verification' });
    if (!terms_accepted || !content_guidelines || !copyright_policy || !community_standards) {
        return res.status(400).json({ error: 'You must accept all agreements' });
    }

    const r = await pool.query(`
        INSERT INTO learning.instructor_applications (
            user_id, full_name, email, phone, country, city, languages, profile_photo,
            professional_title, years_experience, current_employer, own_business,
            bio, expertise, education, certifications, portfolio,
            has_taught_before, teaching_format, students_taught, previous_platforms,
            intro_video, sample_lesson_url, sample_lesson_outline,
            gov_id_url, selfie_url,
            website, business_website, portfolio_url, social_links,
            bank_account_name, bank_name, bank_account_number, bank_routing,
            mobile_money_number, tax_id, payout_method,
            terms_accepted, content_guidelines, copyright_policy, community_standards,
            status
        ) VALUES (
            $1,$2,$3,$4,$5,$6,$7,$8,
            $9,$10,$11,$12,
            $13,$14,$15,$16,$17,
            $18,$19,$20,$21,
            $22,$23,$24,
            $25,$26,
            $27,$28,$29,$30,
            $31,$32,$33,$34,
            $35,$36,$37,
            $38,$39,$40,$41,
            'pending'
        ) RETURNING id, status, created_at
    `, [
        userId, full_name, email, phone || null, country || null, city || null,
        languages || [], profile_photo || null,
        professional_title || null, years_experience, current_employer || null,
        own_business || null,
        bio, expertise, JSON.stringify(education || []),
        JSON.stringify(certifications || []), JSON.stringify(portfolio || []),
        has_taught_before || false, teaching_format || null, students_taught || 0,
        previous_platforms || null,
        intro_video || null, sample_lesson_url || null, sample_lesson_outline || null,
        gov_id_url, selfie_url || null,
        website || null, business_website || null, portfolio_url || null,
        JSON.stringify(social_links || {}),
        bank_account_name || null, bank_name || null, bank_account_number || null,
        bank_routing || null, mobile_money_number || null, tax_id || null,
        payout_method || null,
        terms_accepted || false, content_guidelines || false,
        copyright_policy || false, community_standards || false
    ]);

    res.status(201).json({ application: r.rows[0] });
}));

// ─── Get My Application Status ──────────────────────────
router.get('/my-application', requireAuth, asyncHandler(async (req, res) => {
    if (!(await dbAvailable())) return res.json(null);
    const r = await pool.query(
        `SELECT id, status, rejection_reason, created_at, reviewed_at,
                professional_title, years_experience, bio, expertise
         FROM learning.instructor_applications WHERE user_id = $1
         ORDER BY created_at DESC LIMIT 1`,
        [req.user.id]
    );
    res.json(r.rows[0] || null);
}));

// ─── Get My Instructor Level ────────────────────────────
router.get('/my-level', requireAuth, asyncHandler(async (req, res) => {
    if (!(await dbAvailable())) return res.json(null);
    const r = await pool.query(
        `SELECT * FROM learning.instructor_levels WHERE user_id = $1`,
        [req.user.id]
    );
    res.json(r.rows[0] || null);
}));

// ─── Admin: List All Applications ───────────────────────
router.get('/applications', requireRole('ADMIN', 'SUPERADMIN'), asyncHandler(async (req, res) => {
    if (!(await dbAvailable())) return res.json([]);
    const { status } = req.query;
    let q = `SELECT a.*, u.first_name, u.last_name, u.profile_image, u.email_verified, u.is_verified
             FROM learning.instructor_applications a
             JOIN auth.users u ON u.id = a.user_id`;
    const params = [];
    if (status) {
        q += ' WHERE a.status = $1';
        params.push(status);
    }
    q += ' ORDER BY a.created_at DESC';
    const r = await pool.query(q, params);
    res.json(r.rows);
}));

// ─── Admin: Get Single Application Detail ───────────────
router.get('/applications/:id', requireRole('ADMIN', 'SUPERADMIN'), asyncHandler(async (req, res) => {
    if (!(await dbAvailable())) return res.status(503).json({ error: 'Database unavailable' });
    const r = await pool.query(
        `SELECT a.*, u.first_name, u.last_name, u.profile_image, u.email, u.phone, u.email_verified
         FROM learning.instructor_applications a
         JOIN auth.users u ON u.id = a.user_id
         WHERE a.id = $1`,
        [req.params.id]
    );
    if (!r.rows.length) return res.status(404).json({ error: 'Application not found' });

    const reviews = await pool.query(
        `SELECT r.*, u.first_name AS reviewer_name
         FROM learning.instructor_reviews r
         JOIN auth.users u ON u.id = r.reviewer_id
         WHERE r.application_id = $1 ORDER BY r.created_at ASC`,
        [req.params.id]
    );

    res.json({ ...r.rows[0], reviews: reviews.rows });
}));

// ─── Admin: Update Application Status ───────────────────
router.put('/applications/:id', requireRole('ADMIN', 'SUPERADMIN'), asyncHandler(async (req, res) => {
    if (!(await dbAvailable())) return res.status(503).json({ error: 'Database unavailable' });
    const { status, rejection_reason, admin_notes } = req.body;
    const validStatuses = ['pending', 'under_review', 'approved', 'rejected', 'needs_info'];
    if (!validStatuses.includes(status)) return res.status(400).json({ error: `Invalid status. Must be: ${validStatuses.join(', ')}` });

    const existing = await pool.query('SELECT * FROM learning.instructor_applications WHERE id = $1', [req.params.id]);
    if (!existing.rows.length) return res.status(404).json({ error: 'Application not found' });

    const app = existing.rows[0];

    const r = await pool.query(
        `UPDATE learning.instructor_applications
         SET status = $1, rejection_reason = $2, admin_notes = $3,
             reviewed_by = $4, reviewed_at = CURRENT_TIMESTAMP
         WHERE id = $5
         RETURNING id, status, rejection_reason, reviewed_at`,
        [status, rejection_reason || null, admin_notes || null, req.user.id, req.params.id]
    );

    // If approved, change user role to INSTRUCTOR
    if (status === 'approved') {
        await pool.query(
            `UPDATE auth.users SET role = 'INSTRUCTOR', updated_at = CURRENT_TIMESTAMP WHERE id = $1`,
            [app.user_id]
        );
    }

    // Record review action
    await pool.query(
        `INSERT INTO learning.instructor_reviews (application_id, reviewer_id, action, notes)
         VALUES ($1, $2, $3, $4)`,
        [req.params.id, req.user.id, status === 'needs_info' ? 'request_info' : status, rejection_reason || admin_notes || null]
    );

    // Audit log
    try {
        await pool.query(
            `INSERT INTO admin.audit_log (user_id, action, entity_type, entity_id, details)
             VALUES ($1, 'instructor_application_' || $2, 'instructor_application', $3, $4)`,
            [req.user.id, status, req.params.id, JSON.stringify({ user_id: app.user_id, status })]
        );
    } catch {}

    res.json(r.rows[0]);
}));

// ─── Admin: Get Instructor Levels ───────────────────────
router.get('/levels', requireRole('ADMIN', 'SUPERADMIN'), asyncHandler(async (req, res) => {
    if (!(await dbAvailable())) return res.json([]);
    const r = await pool.query(
        `SELECT l.*, u.first_name, u.last_name, u.email, u.profile_image
         FROM learning.instructor_levels l
         JOIN auth.users u ON u.id = l.user_id
         ORDER BY l.level DESC, l.total_students DESC`
    );
    res.json(r.rows);
}));

// ─── Admin: Update Instructor Level ─────────────────────
router.put('/levels/:userId', requireRole('ADMIN', 'SUPERADMIN'), asyncHandler(async (req, res) => {
    if (!(await dbAvailable())) return res.status(503).json({ error: 'Database unavailable' });
    const { level } = req.body;
    const validLevels = ['new', 'verified', 'professional', 'master'];
    if (!validLevels.includes(level)) return res.status(400).json({ error: `Invalid level. Must be: ${validLevels.join(', ')}` });

    const r = await pool.query(
        `UPDATE learning.instructor_levels SET level = $1, promoted_at = CURRENT_TIMESTAMP
         WHERE user_id = $2 RETURNING *`,
        [level, req.params.userId]
    );
    if (!r.rows.length) return res.status(404).json({ error: 'Instructor level not found' });
    res.json(r.rows[0]);
}));

// ─── Admin: Instructor Stats ────────────────────────────
router.get('/stats', requireRole('ADMIN', 'SUPERADMIN'), asyncHandler(async (req, res) => {
    if (!(await dbAvailable())) return res.json({ pending: 0, approved: 0, rejected: 0, total: 0 });
    const r = await pool.query(`
        SELECT
            COUNT(*) FILTER (WHERE status = 'pending') AS pending,
            COUNT(*) FILTER (WHERE status = 'approved') AS approved,
            COUNT(*) FILTER (WHERE status = 'rejected') AS rejected,
            COUNT(*) FILTER (WHERE status = 'under_review') AS under_review,
            COUNT(*) AS total
        FROM learning.instructor_applications
    `);
    res.json(r.rows[0]);
}));

// ─── Upload Portfolio Image ─────────────────────────────
router.post('/upload-portfolio', requireAuth, upload.single('file'), asyncHandler(async (req, res) => {
    if (!req.file) return res.status(400).json({ error: 'No file uploaded' });
    const url = getFileUrl(req.file);
    res.json({ url, filename: req.file.originalname });
}));

// ─── Upload Video ───────────────────────────────────────
if (uploadVideo) {
    router.post('/upload-video', requireAuth, uploadVideo.single('file'), asyncHandler(async (req, res) => {
        if (!req.file) return res.status(400).json({ error: 'No file uploaded' });
        const url = getFileUrl(req.file);
        res.json({ url, filename: req.file.originalname });
    }));
}

module.exports = router;
