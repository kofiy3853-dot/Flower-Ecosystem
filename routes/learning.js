const router = require('express').Router();
const path = require('path');
const { pool, asyncHandler, dbAvailable, readJSON, queryWithFallback, requireAuth, requireInstructor } = require('./middleware');

router.get('/courses', asyncHandler(async (req, res) => {
    return queryWithFallback(
        async () => {
            const { category, search, level, price, sort = 'popular', page = 1, limit = 12, featured } = req.query;
            const conditions = ['is_published = true'];
            const values = [];
            let idx = 1;

            if (category) { conditions.push(`category = $${idx}`); values.push(category); idx++; }
            if (search) { conditions.push(`(title ILIKE $${idx} OR description ILIKE $${idx})`); values.push(`%${search}%`); idx++; }
            if (level) { conditions.push(`level ILIKE $${idx}`); values.push(level); idx++; }
            if (price === 'free') { conditions.push('(price = 0 OR price IS NULL)'); }
            if (price === 'paid') { conditions.push('price > 0'); }
            if (featured === 'true') { conditions.push('is_featured = true'); }

            const where = 'WHERE ' + conditions.join(' AND ');
            const sortMap = { popular: 'students_count DESC NULLS LAST', newest: 'created_at DESC', rating: 'rating DESC NULLS LAST', price_low: 'price ASC', price_high: 'price DESC' };
            const orderBy = sortMap[sort] || 'created_at DESC';

            const pg = Math.max(1, parseInt(page, 10) || 1);
            const lim = Math.min(50, Math.max(1, parseInt(limit, 10) || 12));
            const offset = (pg - 1) * lim;

            const countR = await pool.query(`SELECT COUNT(*)::int AS c FROM learning.courses ${where}`, values);
            const total = countR.rows[0].c;

            values.push(lim);
            values.push(offset);
            const dataR = await pool.query(`SELECT * FROM learning.courses ${where} ORDER BY ${orderBy} LIMIT $${idx} OFFSET $${idx + 1}`, values);

            return { courses: dataR.rows, total, page: pg, pages: Math.ceil(total / lim) };
        },
        'courses', res
    );
}));

router.get('/courses/enrolled', requireAuth, asyncHandler(async (req, res) => {
    if (!(await dbAvailable())) return res.json({ courses: [] });
    try {
        const r = await pool.query(`
            SELECT c.*, cp.completion_percentage AS progress
            FROM learning.enrollments e
            JOIN learning.courses c ON c.id = e.course_id
            LEFT JOIN learning.progress cp ON cp.user_id = e.user_id AND cp.course_id = e.course_id
            WHERE e.user_id = $1
            ORDER BY e.enrolled_at DESC`, [req.user.id]);
        res.json({ courses: r.rows });
    } catch { res.json({ courses: [] }); }
}));

router.get('/courses/:id', asyncHandler(async (req, res) => {
    return queryWithFallback(
        async () => {
            const course = await pool.query('SELECT * FROM learning.courses WHERE id = $1', [req.params.id]);
            if (!course.rows.length) return null;
            const lessons = await pool.query('SELECT * FROM learning.lessons WHERE course_id = $1 ORDER BY sort_order', [req.params.id]);
            return { ...course.rows[0], lessons: lessons.rows };
        },
        'courses', res
    );
}));

router.post('/courses', requireInstructor, asyncHandler(async (req, res) => {
    const { title, description, instructor, level, price, category } = req.body;
    if (!title) return res.status(400).json({ error: 'Title is required' });
    const r = await pool.query(
        `INSERT INTO learning.courses (title, description, instructor, level, price, category, is_published)
         VALUES ($1, $2, $3, $4, $5, $6, false) RETURNING *`,
        [title, description || '', instructor || req.user.email, level || 'Beginner', price || 0, category || '']
    );
    res.status(201).json(r.rows[0]);
}));

router.put('/courses/:id', requireInstructor, asyncHandler(async (req, res) => {
    const { id } = req.params;
    const { title, description, instructor, level, price, category, is_published } = req.body;
    
    // Verify instructor owns this course
    const ownership = await pool.query(
        'SELECT id, instructor FROM learning.courses WHERE id = $1',
        [id]
    );
    if (!ownership.rows.length) return res.status(404).json({ error: 'Course not found' });
    if (ownership.rows[0].instructor !== req.user.email && req.user.role !== 'admin') {
        return res.status(403).json({ error: 'Not authorized to edit this course' });
    }
    
    const r = await pool.query(
        `UPDATE learning.courses SET title = COALESCE($1, title), description = COALESCE($2, description),
         instructor = COALESCE($3, instructor), level = COALESCE($4, level), price = COALESCE($5, price),
         category = COALESCE($6, category), is_published = COALESCE($7, is_published)
         WHERE id = $8 RETURNING *`,
        [title, description, instructor, level, price, category, is_published, id]
    );
    res.json(r.rows[0]);
}));

router.delete('/courses/:id', requireInstructor, asyncHandler(async (req, res) => {
    const { id } = req.params;
    
    // Verify instructor owns this course
    const ownership = await pool.query(
        'SELECT id, instructor FROM learning.courses WHERE id = $1',
        [id]
    );
    if (!ownership.rows.length) return res.status(404).json({ error: 'Course not found' });
    if (ownership.rows[0].instructor !== req.user.email && req.user.role !== 'admin') {
        return res.status(403).json({ error: 'Not authorized to delete this course' });
    }
    
    const r = await pool.query('DELETE FROM learning.courses WHERE id = $1 RETURNING id', [id]);
    res.json({ message: 'Course deleted' });
}));

router.get('/courses/:id/enroll', requireAuth, asyncHandler(async (req, res) => {
    if (!(await dbAvailable())) return res.status(503).json({ error: 'Database unavailable' });
    const { id } = req.params;
    const r = await pool.query(
        'SELECT * FROM learning.enrollments WHERE user_id = $1 AND course_id = $2',
        [req.user.id, id]
    );
    res.json({ enrolled: r.rows.length > 0, enrollment: r.rows[0] || null });
}));

router.post('/courses/:id/enroll', requireAuth, asyncHandler(async (req, res) => {
    if (!(await dbAvailable())) return res.status(503).json({ error: 'Database unavailable' });
    const { id } = req.params;
    const course = await pool.query('SELECT id FROM learning.courses WHERE id = $1', [id]);
    if (!course.rows.length) return res.status(404).json({ error: 'Course not found' });
    try {
        const r = await pool.query(
            'INSERT INTO learning.enrollments (user_id, course_id) VALUES ($1, $2) RETURNING *',
            [req.user.id, id]
        );
        // Sync students_count on courses table
        try {
            await pool.query(`
                UPDATE learning.courses SET students_count = (
                    SELECT COUNT(*)::int FROM learning.enrollments WHERE course_id = $1
                ) WHERE id = $1`, [id]);
        } catch (e) { console.error('students_count sync error:', e.message); }
        // Notify instructor of new enrollment
        try {
            const courseInfo = await pool.query('SELECT instructor, title FROM learning.courses WHERE id = $1', [id]);
            const studentInfo = await pool.query('SELECT first_name FROM auth.users WHERE id = $1', [req.user.id]);
            if (courseInfo.rows.length) {
                const inst = courseInfo.rows[0];
                const studentName = studentInfo.rows[0]?.first_name || 'A student';
                // Find instructor user_id by email or id
                const instUser = await pool.query('SELECT id FROM auth.users WHERE email = $1 OR id::text = $2', [inst.instructor, inst.instructor]);
                if (instUser.rows.length && instUser.rows[0].id !== req.user.id) {
                    await pool.query(
                        'INSERT INTO platform.notifications (user_id, type, title, message, link) VALUES ($1, $2, $3, $4, $5)',
                        [instUser.rows[0].id, 'enrollment', 'New Enrollment', `${studentName} enrolled in "${inst.title || 'your course'}"`, '/instructor-dashboard']
                    );
                }
            }
        } catch (e) { console.error('Enrollment notification error:', e.message); }
        res.status(201).json(r.rows[0]);
    } catch (dbErr) {
        if (dbErr.code === '23505') {
            return res.status(409).json({ error: 'Already enrolled' });
        }
        throw dbErr;
    }
}));

router.put('/courses/:id/progress', requireAuth, asyncHandler(async (req, res) => {
    if (!(await dbAvailable())) return res.status(503).json({ error: 'Database unavailable' });
    const { id } = req.params;
    const { lesson_id, progress } = req.body;
    try {
        const existing = await pool.query(
            'SELECT id FROM learning.enrollments WHERE user_id = $1 AND course_id = $2',
            [req.user.id, id]
        );
        if (!existing.rows.length) return res.status(403).json({ error: 'Not enrolled in this course' });
        const r = await pool.query(
            `INSERT INTO learning.progress (user_id, course_id, lesson_id, progress, updated_at)
             VALUES ($1, $2, $3, $4, CURRENT_TIMESTAMP)
             ON CONFLICT (user_id, course_id, lesson_id)
             DO UPDATE SET progress = $4, updated_at = CURRENT_TIMESTAMP
             RETURNING *`,
            [req.user.id, id, lesson_id, progress || 100]
        );
        res.json(r.rows[0]);
    } catch (err) {
        // If progress table doesn't exist, return a simple response
        res.json({ user_id: req.user.id, course_id: id, lesson_id, progress: progress || 100 });
    }
}));

router.post('/lessons/:id/complete', requireAuth, asyncHandler(async (req, res) => {
    if (!(await dbAvailable())) return res.status(503).json({ error: 'Database unavailable' });
    const { id } = req.params;
    try {
        const r = await pool.query(
            `INSERT INTO learning.lesson_completions (user_id, lesson_id, completed_at)
             VALUES ($1, $2, CURRENT_TIMESTAMP)
             ON CONFLICT (user_id, lesson_id) DO NOTHING
             RETURNING *`,
            [req.user.id, id]
        );
        res.json({ completed: true, completion: r.rows[0] || { user_id: req.user.id, lesson_id: id } });
    } catch (err) {
        res.json({ completed: true });
    }
}));

router.get('/quizzes/:id', asyncHandler(async (req, res) => {
    return queryWithFallback(
        async () => {
            const r = await pool.query(
                `SELECT q.*, json_agg(qq.* ORDER BY qq.id) AS questions
                 FROM learning.quizzes q
                 LEFT JOIN learning.quiz_questions qq ON qq.quiz_id = q.id
                 WHERE q.id = $1
                 GROUP BY q.id`,
                [req.params.id]
            );
            if (!r.rows.length) return null;
            return r.rows[0];
        },
        'quizzes', res, false,
        (data) => data.find(q => q.id === req.params.id) || null
    );
}));

router.post('/quizzes/:id/submit', requireAuth, asyncHandler(async (req, res) => {
    if (!(await dbAvailable())) return res.status(503).json({ error: 'Database unavailable' });
    const { id } = req.params;
    const { answers } = req.body;
    if (!answers || !Array.isArray(answers)) {
        return res.status(400).json({ error: 'Answers array is required' });
    }
    try {
        const quiz = await pool.query('SELECT * FROM learning.quizzes WHERE id = $1', [id]);
        if (!quiz.rows.length) return res.status(404).json({ error: 'Quiz not found' });

        const questions = await pool.query(
            'SELECT id, correct_answer FROM learning.quiz_questions WHERE quiz_id = $1 ORDER BY id',
            [id]
        );

        let correct = 0;
        const total = questions.rows.length;
        questions.rows.forEach((q, i) => {
            if (answers[i] === q.correct_answer) correct++;
        });

        const score = total > 0 ? Math.round((correct / total) * 100) : 0;

        const r = await pool.query(
            `INSERT INTO learning.quiz_attempts (user_id, quiz_id, answers, score, completed_at)
             VALUES ($1, $2, $3, $4, CURRENT_TIMESTAMP)
             RETURNING *`,
            [req.user.id, id, JSON.stringify(answers), score]
        );

        // Notify instructor of quiz completion
        try {
            const quizInfo = await pool.query('SELECT title, course_id FROM learning.quizzes WHERE id = $1', [id]);
            if (quizInfo.rows.length && quizInfo.rows[0].course_id) {
                const courseInfo = await pool.query('SELECT instructor, title FROM learning.courses WHERE id = $1', [quizInfo.rows[0].course_id]);
                const studentInfo = await pool.query('SELECT first_name FROM auth.users WHERE id = $1', [req.user.id]);
                if (courseInfo.rows.length) {
                    const inst = courseInfo.rows[0];
                    const studentName = studentInfo.rows[0]?.first_name || 'A student';
                    const instUser = await pool.query('SELECT id FROM auth.users WHERE email = $1 OR id::text = $2', [inst.instructor, inst.instructor]);
                    if (instUser.rows.length && instUser.rows[0].id !== req.user.id) {
                        await pool.query(
                            'INSERT INTO platform.notifications (user_id, type, title, message, link) VALUES ($1, $2, $3, $4, $5)',
                            [instUser.rows[0].id, 'quiz', 'Quiz Completed', `${studentName} scored ${score}% on "${quizInfo.rows[0].title || 'a quiz'}" in "${inst.title || 'your course'}"`, '/instructor-dashboard']
                        );
                    }
                }
            }
        } catch (e) { console.error('Quiz notification error:', e.message); }

        res.json({ score, correct, total, attempt: r.rows[0] });
    } catch (err) {
        // If tables don't exist, calculate score from JSON fallback
        const fallback = readJSON(path.join(__dirname, '..', 'data', 'quizzes.json'));
        const quiz = fallback.find(q => q.id === id);
        if (!quiz || !quiz.questions) return res.status(404).json({ error: 'Quiz not found' });

        let correct = 0;
        quiz.questions.forEach((q, i) => {
            if (answers[i] === q.correct) correct++;
        });

        const total = quiz.questions.length;
        const score = total > 0 ? Math.round((correct / total) * 100) : 0;
        res.json({ score, correct, total });
    }
}));

router.get('/lessons', asyncHandler(async (_, res) => {
    return queryWithFallback(
        async () => {
            const r = await pool.query('SELECT * FROM learning.lessons ORDER BY course_id, sort_order');
            return r.rows;
        },
        'lessons', res
    );
}));

router.get('/quizzes', asyncHandler(async (_, res) => {
    return queryWithFallback(
        async () => {
            const r = await pool.query(
                `SELECT q.*, json_agg(qq.* ORDER BY qq.id) AS questions
                 FROM learning.quizzes q
                 LEFT JOIN learning.quiz_questions qq ON qq.quiz_id = q.id
                 GROUP BY q.id`
            );
            return r.rows;
        },
        'quizzes', res
    );
}));

router.get('/articles/categories', asyncHandler(async (_, res) => {
    if (await dbAvailable()) {
        try {
            const r = await pool.query('SELECT * FROM learning.article_categories ORDER BY sort_order');
            if (r.rows.length) return res.json(r.rows);
        } catch {}
    }
    res.json([
        { id: 1, name: 'Flower Identification', slug: 'flower-identification', icon: 'flower1' },
        { id: 2, name: 'Medicinal Flowers', slug: 'medicinal-flowers', icon: 'leaf' },
        { id: 3, name: 'Floristry', slug: 'floristry', icon: 'flower2' },
        { id: 4, name: 'Gardening', slug: 'gardening', icon: 'seed' },
        { id: 5, name: 'Palm Trees', slug: 'palm-trees', icon: 'tree' },
        { id: 6, name: 'Flower Care', slug: 'flower-care', icon: 'droplet' },
        { id: 7, name: 'Perfume Flowers', slug: 'perfume-flowers', icon: 'droplet-half' },
        { id: 8, name: 'Landscaping', slug: 'landscaping', icon: 'house' },
        { id: 9, name: 'Edible Flowers', slug: 'edible-flowers', icon: 'cup-hot' }
    ]);
}));

router.get('/articles', asyncHandler(async (req, res) => {
    const { category, search, sort = 'newest', page = 1, limit = 20, featured } = req.query;
    const pg = Math.max(1, parseInt(page, 10) || 1);
    const lim = Math.min(100, Math.max(1, parseInt(limit, 10) || 20));
    const offset = (pg - 1) * lim;

    if (await dbAvailable()) {
        try {
            const conditions = ['a.is_published = true'];
            const values = [];
            let idx = 1;

            if (category) { conditions.push(`ac.slug = $${idx}`); values.push(category); idx++; }
            if (search) { conditions.push(`(a.title ILIKE $${idx} OR a.excerpt ILIKE $${idx} OR a.content ILIKE $${idx})`); values.push(`%${search}%`); idx++; }
            if (featured === 'true') { conditions.push(`a.is_featured = true`); }

            const where = 'WHERE ' + conditions.join(' AND ');
            const sortMap = { newest: 'a.published_at DESC', popular: 'a.views DESC', reading_time: 'a.reading_time ASC' };
            const orderBy = sortMap[sort] || 'a.published_at DESC';

            const countQ = `SELECT COUNT(*) FROM learning.articles a LEFT JOIN learning.article_categories ac ON ac.id = a.category_id ${where}`;
            const countR = await pool.query(countQ, values);
            const total = parseInt(countR.rows[0].count, 10);

            values.push(lim);
            values.push(offset);

            const dataQ = `
                SELECT a.id, a.title, a.slug, a.excerpt, a.thumbnail_url, a.author_name, a.author_title,
                       a.reading_time, a.is_featured, a.views, a.published_at, a.table_of_contents,
                       ac.name AS category_name, ac.slug AS category_slug, ac.icon AS category_icon
                FROM learning.articles a
                LEFT JOIN learning.article_categories ac ON ac.id = a.category_id
                ${where}
                ORDER BY a.is_featured DESC, ${orderBy}
                LIMIT $${idx} OFFSET $${idx + 1}`;

            const dataR = await pool.query(dataQ, values);
            return res.json({ articles: dataR.rows, total, page: pg, limit: lim, pages: Math.ceil(total / lim) });
        } catch (err) {
            console.error('Articles query error:', err.message);
        }
    }

    const fallback = readJSON(path.join(__dirname, '..', 'data', 'articles.json'));
    const filtered = category ? fallback.filter(a => (a.category || '').toLowerCase().includes(category.toLowerCase())) : fallback;
    res.json({ articles: filtered.slice(offset, offset + lim), total: filtered.length, page: pg, limit: lim, pages: 1 });
}));

router.get('/articles/featured', asyncHandler(async (_, res) => {
    if (await dbAvailable()) {
        try {
            const r = await pool.query(`
                SELECT a.*, ac.name AS category_name, ac.icon AS category_icon
                FROM learning.articles a
                LEFT JOIN learning.article_categories ac ON ac.id = a.category_id
                WHERE a.is_featured = true AND a.is_published = true
                ORDER BY a.published_at DESC LIMIT 4`);
            if (r.rows.length) return res.json(r.rows);
        } catch {}
    }
    const fallback = readJSON(path.join(__dirname, '..', 'data', 'articles.json'));
    res.json(fallback.filter(a => a.tag === 'Guide' || a.tag === 'Identification').slice(0, 4));
}));

router.get('/articles/:id', asyncHandler(async (req, res) => {
    const { id } = req.params;

    if (await dbAvailable()) {
        try {
            const r = await pool.query(`
                SELECT a.*, ac.name AS category_name, ac.slug AS category_slug, ac.icon AS category_icon
                FROM learning.articles a
                LEFT JOIN learning.article_categories ac ON ac.id = a.category_id
                WHERE a.id = $1 OR a.slug = $1`, [id]);

            if (!r.rows.length) return res.status(404).json({ error: 'Article not found' });

            await pool.query('UPDATE learning.articles SET views = views + 1 WHERE id = $1', [r.rows[0].id]);

            const images = await pool.query('SELECT image_url, caption FROM learning.article_images WHERE article_id = $1 ORDER BY sort_order', [r.rows[0].id]);
            const videos = await pool.query('SELECT video_url, title, duration FROM learning.article_videos WHERE article_id = $1 ORDER BY sort_order', [r.rows[0].id]);
            const downloads = await pool.query('SELECT file_name, file_url, file_type, file_size FROM learning.article_downloads WHERE article_id = $1', [r.rows[0].id]);

            return res.json({ ...r.rows[0], images: images.rows, videos: videos.rows, downloads: downloads.rows });
        } catch (err) {
            console.error('Article detail error:', err.message);
        }
    }

    const fallback = readJSON(path.join(__dirname, '..', 'data', 'articles.json'));
    const article = fallback.find(a => a.id === id || a.slug === id);
    article ? res.json(article) : res.status(404).json({ error: 'Article not found' });
}));

router.get('/articles/:id/related', asyncHandler(async (req, res) => {
    const { id } = req.params;

    if (await dbAvailable()) {
        try {
            const current = await pool.query('SELECT category_id FROM learning.articles WHERE id = $1', [id]);
            if (current.rows.length && current.rows[0].category_id) {
                const r = await pool.query(`
                    SELECT a.id, a.title, a.slug, a.excerpt, a.thumbnail_url, a.reading_time, a.published_at,
                           ac.name AS category_name, ac.icon AS category_icon
                    FROM learning.articles a
                    LEFT JOIN learning.article_categories ac ON ac.id = a.category_id
                    WHERE a.category_id = $1 AND a.id != $2 AND a.is_published = true
                    ORDER BY a.published_at DESC LIMIT 4`, [current.rows[0].category_id, id]);
                if (r.rows.length) return res.json(r.rows);
            }
            const r2 = await pool.query(`
                SELECT a.id, a.title, a.slug, a.excerpt, a.thumbnail_url, a.reading_time, a.published_at,
                       ac.name AS category_name, ac.icon AS category_icon
                FROM learning.articles a
                LEFT JOIN learning.article_categories ac ON ac.id = a.category_id
                WHERE a.id != $1 AND a.is_published = true
                ORDER BY a.views DESC LIMIT 4`, [id]);
            return res.json(r2.rows);
        } catch {}
    }

    const fallback = readJSON(path.join(__dirname, '..', 'data', 'articles.json'));
    res.json(fallback.filter(a => a.id !== id).slice(0, 4));
}));

router.get('/videos', asyncHandler(async (_, res) => {
    return queryWithFallback(
        async () => {
            const r = await pool.query(`
                SELECT l.id, l.title, l.content AS description, l.video_url, l.duration_minutes,
                       l.sort_order,
                       c.title AS course_title, c.instructor, c.category, c.thumbnail_url AS course_image,
                       c.id AS course_id
                FROM learning.lessons l
                JOIN learning.courses c ON c.id = l.course_id
                WHERE l.video_url IS NOT NULL AND l.video_url != '' AND c.is_published = true
                ORDER BY l.sort_order DESC, c.created_at DESC
                LIMIT 12
            `);
            return r.rows.map(row => ({
                id: row.id,
                title: row.title,
                description: row.description || '',
                video_url: row.video_url,
                duration: row.duration_minutes ? `${row.duration_minutes} min` : '',
                image: row.course_image,
                instructor: row.instructor,
                category: row.category || '',
                tag: 'Course',
                views: 0,
                course_id: row.course_id,
                course_title: row.course_title
            }));
        },
        'videos', res
    );
}));

router.get('/flowers', asyncHandler(async (_, res) => {
    return queryWithFallback(
        async () => {
            const r = await pool.query('SELECT * FROM learning.flower_library ORDER BY common_name');
            return r.rows;
        },
        'identification', res
    );
}));

// ─── Workshops ────────────────────────────────────────
router.get('/workshops', asyncHandler(async (_, res) => {
    return queryWithFallback(
        async () => {
            const r = await pool.query('SELECT * FROM learning.workshops ORDER BY date ASC');
            return r.rows;
        },
        'workshops', res
    );
}));

router.get('/workshops/:id', asyncHandler(async (req, res) => {
    return queryWithFallback(
        async () => {
            const r = await pool.query('SELECT * FROM learning.workshops WHERE id = $1', [req.params.id]);
            if (!r.rows.length) return null;
            return r.rows[0];
        },
        'workshops', res
    );
}));

// ─── Live Classes ─────────────────────────────────────
router.get('/live-classes', asyncHandler(async (_, res) => {
    return queryWithFallback(
        async () => {
            const r = await pool.query('SELECT * FROM learning.live_classes ORDER BY scheduled_at ASC');
            return r.rows;
        },
        'live-classes', res
    );
}));

router.get('/live-classes/:id', asyncHandler(async (req, res) => {
    return queryWithFallback(
        async () => {
            const r = await pool.query('SELECT * FROM learning.live_classes WHERE id = $1', [req.params.id]);
            if (!r.rows.length) return null;
            return r.rows[0];
        },
        'live-classes', res
    );
}));

// ─── Assignments ──────────────────────────────────────
router.get('/assignments', requireAuth, asyncHandler(async (req, res) => {
    if (!(await dbAvailable())) return res.status(503).json({ error: 'Database unavailable' });
    try {
        const r = await pool.query(
            'SELECT * FROM learning.assignments WHERE user_id = $1 ORDER BY due_date ASC',
            [req.user.id]
        );
        return res.json(r.rows);
    } catch (err) {
        return res.json([]);
    }
}));

router.post('/assignments/:id/submit', requireAuth, asyncHandler(async (req, res) => {
    if (!(await dbAvailable())) return res.status(503).json({ error: 'Database unavailable' });
    const { id } = req.params;
    const { file_url, notes } = req.body;
    try {
        const r = await pool.query(
            `UPDATE learning.assignments SET status = 'submitted', submitted_at = CURRENT_TIMESTAMP, file_url = $1, notes = $2
             WHERE id = $3 AND user_id = $4 RETURNING *`,
            [file_url, notes, id, req.user.id]
        );
        if (!r.rows.length) return res.status(404).json({ error: 'Assignment not found' });
        // Notify instructor of assignment submission
        try {
            const asgnInfo = await pool.query('SELECT title, course_id FROM learning.assignments WHERE id = $1', [id]);
            if (asgnInfo.rows.length && asgnInfo.rows[0].course_id) {
                const courseInfo = await pool.query('SELECT instructor, title FROM learning.courses WHERE id = $1', [asgnInfo.rows[0].course_id]);
                const studentInfo = await pool.query('SELECT first_name FROM auth.users WHERE id = $1', [req.user.id]);
                if (courseInfo.rows.length) {
                    const inst = courseInfo.rows[0];
                    const studentName = studentInfo.rows[0]?.first_name || 'A student';
                    const instUser = await pool.query('SELECT id FROM auth.users WHERE email = $1 OR id::text = $2', [inst.instructor, inst.instructor]);
                    if (instUser.rows.length && instUser.rows[0].id !== req.user.id) {
                        await pool.query(
                            'INSERT INTO platform.notifications (user_id, type, title, message, link) VALUES ($1, $2, $3, $4, $5)',
                            [instUser.rows[0].id, 'assignment', 'Assignment Submitted', `${studentName} submitted "${asgnInfo.rows[0].title || 'an assignment'}" for "${inst.title || 'your course'}"`, '/instructor-dashboard']
                        );
                    }
                }
            }
        } catch (e) { console.error('Assignment notification error:', e.message); }
        res.json(r.rows[0]);
    } catch (err) {
        res.json({ id, status: 'submitted' });
    }
}));

// ─── Learning Paths ───────────────────────────────────
router.get('/learning-paths', asyncHandler(async (_, res) => {
    return queryWithFallback(
        async () => {
            const r = await pool.query('SELECT * FROM learning.learning_paths ORDER BY created_at DESC');
            return r.rows;
        },
        'learning-paths', res
    );
}));

router.get('/learning-paths/:id', asyncHandler(async (req, res) => {
    if (!(await dbAvailable())) {
        return res.status(503).json({ error: 'Database unavailable' });
    }
    try {
        const param = req.params.id;
        const r = await pool.query(
            'SELECT * FROM learning.learning_paths WHERE slug = $1 OR id::text = $1',
            [param]
        );
        if (!r.rows.length) {
            return res.status(404).json({ error: 'Learning path not found' });
        }
        return res.json({ ...r.rows[0], courses: [] });
    } catch (err) {
        console.error('Learning path detail error:', err.message);
        return res.status(500).json({ error: 'Failed to load learning path' });
    }
}));

// ─── Workshop Registration ────────────────────────────
router.post('/workshops/:id/register', requireAuth, asyncHandler(async (req, res) => {
    if (!(await dbAvailable())) return res.status(503).json({ error: 'Database unavailable' });
    const { id } = req.params;
    try {
        const ws = await pool.query('SELECT id, seats_left FROM learning.workshops WHERE id = $1', [id]);
        if (!ws.rows.length) return res.status(404).json({ error: 'Workshop not found' });
        if (ws.rows[0].seats_left <= 0) return res.status(400).json({ error: 'No seats available' });
        await pool.query('UPDATE learning.workshops SET seats_left = seats_left - 1 WHERE id = $1', [id]);
        res.json({ message: 'Registration successful' });
    } catch (err) {
        res.json({ message: 'Registration confirmed' });
    }
}));

// ─── Live Class Registration ──────────────────────────
router.post('/live-classes/:id/register', requireAuth, asyncHandler(async (req, res) => {
    if (!(await dbAvailable())) return res.status(503).json({ error: 'Database unavailable' });
    const { id } = req.params;
    try {
        const lc = await pool.query('SELECT id, seats, instructor FROM learning.live_classes WHERE id = $1', [id]);
        if (!lc.rows.length) return res.status(404).json({ error: 'Class not found' });
        await pool.query('UPDATE learning.live_classes SET enrolled = enrolled + 1 WHERE id = $1', [id]);
        // Notify instructor of new registration
        try {
            const classInfo = await pool.query('SELECT title, instructor FROM learning.live_classes WHERE id = $1', [id]);
            const studentInfo = await pool.query('SELECT first_name FROM auth.users WHERE id = $1', [req.user.id]);
            if (classInfo.rows.length && classInfo.rows[0].instructor) {
                const instName = classInfo.rows[0].instructor;
                const studentName = studentInfo.rows[0]?.first_name || 'A student';
                // Find instructor by name or email
                const instUser = await pool.query('SELECT id FROM auth.users WHERE email = $1 OR id::text = $1 OR (first_name || \' \' || last_name) = $1', [instName]);
                if (instUser.rows.length && instUser.rows[0].id !== req.user.id) {
                    await pool.query(
                        'INSERT INTO platform.notifications (user_id, type, title, message, link) VALUES ($1, $2, $3, $4, $5)',
                        [instUser.rows[0].id, 'live_class', 'New Class Registration', `${studentName} registered for "${classInfo.rows[0].title || 'your live class'}"`, '/instructor-dashboard']
                    );
                }
            }
        } catch (e) { console.error('Live class notification error:', e.message); }
        res.json({ message: 'Registration successful' });
    } catch (err) {
        res.json({ message: 'Registration confirmed' });
    }
}));

// ─── Live Class Attendance ────────────────────────────
router.post('/live-classes/:id/attend', requireAuth, asyncHandler(async (req, res) => {
    if (!(await dbAvailable())) return res.status(503).json({ error: 'Database unavailable' });
    const { id } = req.params;
    try {
        await pool.query(
            `INSERT INTO learning.class_attendance (user_id, class_id, attended_at)
             VALUES ($1, $2, CURRENT_TIMESTAMP)
             ON CONFLICT (user_id, class_id) DO NOTHING`,
            [req.user.id, id]
        );
        res.json({ attended: true });
    } catch (err) {
        res.json({ attended: true });
    }
}));

// ─── Assignment Grading ───────────────────────────────
router.put('/assignments/:id/grade', requireInstructor, asyncHandler(async (req, res) => {
    if (!(await dbAvailable())) return res.status(503).json({ error: 'Database unavailable' });
    const { id } = req.params;
    const { grade, feedback } = req.body;
    try {
        const r = await pool.query(
            `UPDATE learning.assignments SET grade = $1, feedback = $2, status = 'graded', graded_at = CURRENT_TIMESTAMP
             WHERE id = $3 RETURNING *`,
            [grade, feedback, id]
        );
        if (!r.rows.length) return res.status(404).json({ error: 'Assignment not found' });
        res.json(r.rows[0]);
    } catch (err) {
        res.json({ id, grade, feedback, status: 'graded' });
    }
}));

// ─── Certificates ─────────────────────────────────────
router.get('/certificates', requireAuth, asyncHandler(async (req, res) => {
    if (!(await dbAvailable())) return res.json([]);
    try {
        const r = await pool.query(
            'SELECT * FROM learning.certificates WHERE user_id = $1 ORDER BY issued_at DESC',
            [req.user.id]
        );
        res.json(r.rows);
    } catch (err) {
        res.json([]);
    }
}));

router.get('/certificates/:id/verify', asyncHandler(async (req, res) => {
    if (!(await dbAvailable())) return res.json({ valid: false });
    try {
        const r = await pool.query(
            'SELECT * FROM learning.certificates WHERE id = $1',
            [req.params.id]
        );
        res.json({ valid: r.rows.length > 0, certificate: r.rows[0] || null });
    } catch (err) {
        res.json({ valid: false });
    }
}));

// ─── Discussions ──────────────────────────────────────
router.get('/discussions', asyncHandler(async (req, res) => {
    return queryWithFallback(
        async () => {
            const r = await pool.query(
                `SELECT d.*, u.first_name AS author_name FROM learning.discussions d
                 LEFT JOIN auth.users u ON u.id = d.user_id
                 ORDER BY d.created_at DESC LIMIT 20`
            );
            return r.rows;
        },
        'discussions', res
    );
}));

router.post('/discussions', requireAuth, asyncHandler(async (req, res) => {
    if (!(await dbAvailable())) return res.status(503).json({ error: 'Database unavailable' });
    const { title, content, category } = req.body;
    if (!title || !content) return res.status(400).json({ error: 'Title and content are required' });
    try {
        const r = await pool.query(
            `INSERT INTO learning.discussions (user_id, title, content, category)
             VALUES ($1, $2, $3, $4) RETURNING *`,
            [req.user.id, title, content, category || 'general']
        );
        res.status(201).json(r.rows[0]);
    } catch (err) {
        res.status(201).json({ id: Date.now().toString(), title, content, category });
    }
}));

// ─── Resources ────────────────────────────────────────
router.get('/resources', asyncHandler(async (_, res) => {
    return queryWithFallback(
        async () => {
            const r = await pool.query('SELECT * FROM learning.resources ORDER BY created_at DESC');
            return r.rows;
        },
        'resources', res
    );
}));

// ─── Student Progress Overview ────────────────────────
router.get('/progress/overview', requireAuth, asyncHandler(async (req, res) => {
    if (!(await dbAvailable())) return res.json({ courses: 0, completed: 0, hours: 0, certificates: 0 });
    try {
        const enrolled = await pool.query(
            'SELECT COUNT(*) FROM learning.enrollments WHERE user_id = $1', [req.user.id]
        );
        const completed = await pool.query(
            'SELECT COUNT(*) FROM learning.lesson_completions WHERE user_id = $1', [req.user.id]
        );
        const certificates = await pool.query(
            'SELECT COUNT(*) FROM learning.certificates WHERE user_id = $1', [req.user.id]
        );
        res.json({
            courses: parseInt(enrolled.rows[0].count),
            completed: parseInt(completed.rows[0].count),
            certificates: parseInt(certificates.rows[0].count)
        });
    } catch (err) {
        res.json({ courses: 0, completed: 0, certificates: 0 });
    }
}));

// ─── Instructor Dashboard Endpoints ───────────────────────────────────────

router.get('/instructor/courses', requireInstructor, asyncHandler(async (req, res) => {
    if (!(await dbAvailable())) return res.json([]);
    const r = await pool.query(
        `SELECT c.*, COALESCE(e.enrolled, 0) AS enrolled_count
         FROM learning.courses c
         LEFT JOIN (SELECT course_id, COUNT(*) AS enrolled FROM learning.enrollments GROUP BY course_id) e ON e.course_id = c.id
         WHERE c.instructor = $1 OR c.instructor = $2
         ORDER BY c.created_at DESC`,
        [req.user.email, req.user.id]
    );
    res.json(r.rows);
}));

router.get('/instructor/students', requireInstructor, asyncHandler(async (req, res) => {
    if (!(await dbAvailable())) return res.json([]);
    try {
        const r = await pool.query(
            `SELECT DISTINCT u.id, u.first_name, u.last_name, u.email, u.profile_image, u.created_at,
                    c.title AS course_title, c.id AS course_id
             FROM learning.enrollments en
             JOIN auth.users u ON u.id = en.user_id
             JOIN learning.courses c ON c.id = en.course_id
             WHERE c.instructor = $1 OR c.instructor = $2
             ORDER BY u.created_at DESC`,
            [req.user.email, req.user.id]
        );
        res.json(r.rows);
    } catch (err) {
        console.error('Instructor students error:', err.message);
        res.json([]);
    }
}));

router.get('/instructor/assignments', requireInstructor, asyncHandler(async (req, res) => {
    if (!(await dbAvailable())) return res.json([]);
    try {
        const r = await pool.query(
            `SELECT a.*, u.first_name || ' ' || u.last_name AS student_name, c.title AS course_title
             FROM learning.assignments a
             JOIN auth.users u ON u.id = a.user_id
             JOIN learning.courses c ON c.id = a.course_id
             WHERE c.instructor = $1 OR c.instructor = $2
             ORDER BY a.submitted_at DESC NULLS LAST, a.created_at DESC`,
            [req.user.email, req.user.id]
        );
        res.json(r.rows);
    } catch (err) {
        console.error('Instructor assignments error:', err.message);
        res.json([]);
    }
}));

router.get('/instructor/live-classes', requireInstructor, asyncHandler(async (req, res) => {
    if (!(await dbAvailable())) return res.json([]);
    try {
        const r = await pool.query(
            `SELECT * FROM learning.live_classes
             WHERE instructor = $1 OR instructor = $2
             ORDER BY day DESC, time DESC`,
            [req.user.email, req.user.id]
        );
        res.json(r.rows);
    } catch (err) {
        console.error('Instructor live-classes error:', err.message);
        res.json([]);
    }
}));

router.get('/instructor/certificates', requireInstructor, asyncHandler(async (req, res) => {
    if (!(await dbAvailable())) return res.json([]);
    try {
        const r = await pool.query(
            `SELECT cert.*, u.first_name || ' ' || u.last_name AS student_name, c.title AS course_title
             FROM learning.certificates cert
             JOIN auth.users u ON u.id = cert.user_id
             JOIN learning.courses c ON c.id = cert.course_id
             WHERE c.instructor = $1 OR c.instructor = $2
             ORDER BY cert.issued_at DESC`,
            [req.user.email, req.user.id]
        );
        res.json(r.rows);
    } catch (err) {
        console.error('Instructor certificates error:', err.message);
        res.json([]);
    }
}));

router.get('/instructor/analytics', requireInstructor, asyncHandler(async (req, res) => {
    if (!(await dbAvailable())) return res.json({ enrollments: 0, completionRate: 0, avgQuizScore: 0, revenue: 0 });
    let enrollments = 0, completionRate = 0, avgQuizScore = 0, revenue = 0;
    try {
        const r = await pool.query(`SELECT COUNT(*) FROM learning.enrollments en JOIN learning.courses c ON c.id = en.course_id WHERE c.instructor = $1 OR c.instructor = $2`, [req.user.email, req.user.id]);
        enrollments = parseInt(r.rows[0].count) || 0;
    } catch {}
    try {
        const r = await pool.query(`SELECT COUNT(*) FILTER (WHERE completed = true) AS completed, COUNT(*) AS total FROM learning.lesson_progress lp JOIN learning.courses c ON c.id = lp.course_id WHERE c.instructor = $1 OR c.instructor = $2`, [req.user.email, req.user.id]);
        const completed = parseInt(r.rows[0].completed) || 0;
        const total = parseInt(r.rows[0].total) || 1;
        completionRate = Math.round((completed / total) * 100);
    } catch {}
    try {
        const r = await pool.query(`SELECT ROUND(AVG(score), 1) AS avg_score FROM learning.quiz_submissions qs JOIN learning.courses c ON c.id = qs.course_id WHERE c.instructor = $1 OR c.instructor = $2`, [req.user.email, req.user.id]);
        avgQuizScore = parseFloat(r.rows[0].avg_score) || 0;
    } catch {}
    try {
        const r = await pool.query(`SELECT COALESCE(SUM(c.price), 0) AS revenue FROM learning.enrollments en JOIN learning.courses c ON c.id = en.course_id WHERE c.instructor = $1 OR c.instructor = $2`, [req.user.email, req.user.id]);
        revenue = parseFloat(r.rows[0].revenue) || 0;
    } catch {}
    res.json({ enrollments, completionRate, avgQuizScore, revenue });
}));

module.exports = router;
