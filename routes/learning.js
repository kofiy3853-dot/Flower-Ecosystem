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
            SELECT c.*, COALESCE(cp.progress, 0) AS progress
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
    const { title, subtitle, description, short_description, instructor, level, price, category,
            language, learning_outcomes, requirements, target_audience,
            thumbnail_url, promo_video_url, gallery,
            is_free, discount_price, enrollment_limit, visibility, has_certificate, status,
            sections, resources, quiz, assignment } = req.body;
    if (!title) return res.status(400).json({ error: 'Title is is required' });
    const r = await pool.query(
        `INSERT INTO learning.courses (title, subtitle, description, short_description, instructor, level, price, category,
         language, learning_outcomes, requirements, target_audience,
         thumbnail_url, promo_video_url, gallery,
         discount_price, enrollment_limit, visibility, has_certificate, status, is_published)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,false) RETURNING *`,
        [title, subtitle||null, description||'', short_description||null, instructor||req.user.email, level||'Beginner',
         is_free ? 0 : (price||0), category||'', language||'English',
         learning_outcomes||[], requirements||[], target_audience||[],
         thumbnail_url||null, promo_video_url||null, gallery||[],
         discount_price||null, enrollment_limit||0, visibility||'public',
         has_certificate !== false, status||'draft']
    );
    const courseId = r.rows[0].id;

    // Save curriculum (sections + lessons)
    if (sections && sections.length) {
        for (let si = 0; si < sections.length; si++) {
            const sec = sections[si];
            const secR = await pool.query(
                'INSERT INTO learning.course_sections (course_id, title, sort_order) VALUES ($1,$2,$3) RETURNING id',
                [courseId, sec.title || 'Section ' + (si+1), si]
            );
            const sectionId = secR.rows[0].id;
            if (sec.lessons && sec.lessons.length) {
                for (let li = 0; li < sec.lessons.length; li++) {
                    const les = sec.lessons[li];
                    await pool.query(
                        `INSERT INTO learning.course_lessons (section_id, course_id, title, type, content, video_url, duration_minutes, sort_order)
                         VALUES ($1,$2,$3,$4,$5,$6,$7,$8)`,
                        [sectionId, courseId, les.title||'Lesson', les.type||'video', les.content||null,
                         les.video_url||null, les.duration_minutes||0, li]
                    );
                }
            }
        }
        // Update lesson_count
        const totalLessons = sections.reduce((sum, s) => sum + (s.lessons?.length || 0), 0);
        await pool.query('UPDATE learning.courses SET lesson_count = $1 WHERE id = $2', [totalLessons, courseId]);
    }

    // Save resources
    if (resources && resources.length) {
        for (let i = 0; i < resources.length; i++) {
            const r2 = resources[i];
            await pool.query(
                'INSERT INTO learning.course_downloadable_resources (course_id, name, file_url, file_type, file_size, sort_order) VALUES ($1,$2,$3,$4,$5,$6)',
                [courseId, r2.name, r2.file_url, r2.file_type||null, r2.file_size||null, i]
            );
        }
    }

    // Save quiz
    if (quiz && quiz.questions && quiz.questions.length) {
        const quizR = await pool.query(
            'INSERT INTO learning.course_quizzes (course_id, title, passing_score) VALUES ($1,$2,$3) RETURNING id',
            [courseId, quiz.title||'Course Quiz', quiz.passing_score||70]
        );
        const quizId = quizR.rows[0].id;
        for (let i = 0; i < quiz.questions.length; i++) {
            const q = quiz.questions[i];
            await pool.query(
                'INSERT INTO learning.course_quiz_questions (quiz_id, question, options, correct_answer, sort_order) VALUES ($1,$2,$3,$4,$5)',
                [quizId, q.question, q.options||[], q.correct_answer||0, i]
            );
        }
    }

    // Save assignment
    if (assignment && assignment.title) {
        await pool.query(
            'INSERT INTO learning.course_assignments (course_id, title, instructions, deadline) VALUES ($1,$2,$3,$4)',
            [courseId, assignment.title, assignment.instructions||null, assignment.deadline||null]
        );
    }

    res.status(201).json(r.rows[0]);
}));

router.put('/courses/:id', requireInstructor, asyncHandler(async (req, res) => {
    const { id } = req.params;
    const { title, subtitle, description, short_description, instructor, level, price, category,
            language, learning_outcomes, requirements, target_audience,
            thumbnail_url, promo_video_url, gallery,
            discount_price, enrollment_limit, visibility, has_certificate, is_published, status,
            sections, resources, quiz, assignment } = req.body;

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
        `UPDATE learning.courses SET
         title = COALESCE($1, title), subtitle = COALESCE($2, subtitle),
         description = COALESCE($3, description), short_description = COALESCE($4, short_description),
         instructor = COALESCE($5, instructor), level = COALESCE($6, level),
         price = COALESCE($7, price), category = COALESCE($8, category),
         language = COALESCE($9, language),
         learning_outcomes = COALESCE($10, learning_outcomes),
         requirements = COALESCE($11, requirements),
         target_audience = COALESCE($12, target_audience),
         thumbnail_url = COALESCE($13, thumbnail_url),
         promo_video_url = COALESCE($14, promo_video_url),
         gallery = COALESCE($15, gallery),
         discount_price = COALESCE($16, discount_price),
         enrollment_limit = COALESCE($17, enrollment_limit),
         visibility = COALESCE($18, visibility),
         has_certificate = COALESCE($19, has_certificate),
         is_published = COALESCE($20, is_published),
         status = COALESCE($21, status)
         WHERE id = $22 RETURNING *`,
        [title, subtitle, description, short_description, instructor, level, price, category,
         language, learning_outcomes, requirements, target_audience,
         thumbnail_url, promo_video_url, gallery,
         discount_price, enrollment_limit, visibility, has_certificate, is_published, status, id]
    );

    // Replace curriculum if provided
    if (sections) {
        await pool.query('DELETE FROM learning.course_sections WHERE course_id = $1', [id]);
        for (let si = 0; si < sections.length; si++) {
            const sec = sections[si];
            const secR = await pool.query(
                'INSERT INTO learning.course_sections (course_id, title, sort_order) VALUES ($1,$2,$3) RETURNING id',
                [id, sec.title || 'Section ' + (si+1), si]
            );
            const sectionId = secR.rows[0].id;
            if (sec.lessons && sec.lessons.length) {
                for (let li = 0; li < sec.lessons.length; li++) {
                    const les = sec.lessons[li];
                    await pool.query(
                        `INSERT INTO learning.course_lessons (section_id, course_id, title, type, content, video_url, duration_minutes, sort_order)
                         VALUES ($1,$2,$3,$4,$5,$6,$7,$8)`,
                        [sectionId, id, les.title||'Lesson', les.type||'video', les.content||null,
                         les.video_url||null, les.duration_minutes||0, li]
                    );
                }
            }
        }
        const totalLessons = sections.reduce((sum, s) => sum + (s.lessons?.length || 0), 0);
        await pool.query('UPDATE learning.courses SET lesson_count = $1 WHERE id = $2', [totalLessons, id]);
    }

    // Replace resources if provided
    if (resources) {
        await pool.query('DELETE FROM learning.course_downloadable_resources WHERE course_id = $1', [id]);
        for (let i = 0; i < resources.length; i++) {
            const r2 = resources[i];
            await pool.query(
                'INSERT INTO learning.course_downloadable_resources (course_id, name, file_url, file_type, file_size, sort_order) VALUES ($1,$2,$3,$4,$5,$6)',
                [id, r2.name, r2.file_url, r2.file_type||null, r2.file_size||null, i]
            );
        }
    }

    // Replace quiz if provided
    if (quiz) {
        await pool.query('DELETE FROM learning.course_quizzes WHERE course_id = $1', [id]);
        if (quiz.questions && quiz.questions.length) {
            const quizR = await pool.query(
                'INSERT INTO learning.course_quizzes (course_id, title, passing_score) VALUES ($1,$2,$3) RETURNING id',
                [id, quiz.title||'Course Quiz', quiz.passing_score||70]
            );
            const quizId = quizR.rows[0].id;
            for (let i = 0; i < quiz.questions.length; i++) {
                const q = quiz.questions[i];
                await pool.query(
                    'INSERT INTO learning.course_quiz_questions (quiz_id, question, options, correct_answer, sort_order) VALUES ($1,$2,$3,$4,$5)',
                    [quizId, q.question, q.options||[], q.correct_answer||0, i]
                );
            }
        }
    }

    // Replace assignment if provided
    if (assignment !== undefined) {
        await pool.query('DELETE FROM learning.course_assignments WHERE course_id = $1', [id]);
        if (assignment && assignment.title) {
            await pool.query(
                'INSERT INTO learning.course_assignments (course_id, title, instructions, deadline) VALUES ($1,$2,$3,$4)',
                [id, assignment.title, assignment.instructions||null, assignment.deadline||null]
            );
        }
    }

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
            if (answers[i] === q.correct_answer) correct++;
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

            if (category) { conditions.push(`a.category ILIKE $${idx}`); values.push(`%${category}%`); idx++; }
            if (search) { conditions.push(`(a.title ILIKE $${idx} OR a.excerpt ILIKE $${idx} OR a.content ILIKE $${idx})`); values.push(`%${search}%`); idx++; }
            if (featured === 'true') { conditions.push(`a.is_featured = true`); }

            const where = 'WHERE ' + conditions.join(' AND ');
            const sortMap = { newest: 'a.published_at DESC', popular: 'a.views DESC', reading_time: 'a.reading_time ASC' };
            const orderBy = sortMap[sort] || 'a.published_at DESC';

            const countQ = `SELECT COUNT(*) FROM learning.articles a ${where}`;
            const countR = await pool.query(countQ, values);
            const total = parseInt(countR.rows[0].count, 10);

            values.push(lim);
            values.push(offset);

            const dataQ = `
                SELECT a.id, a.title, a.slug, a.excerpt, a.thumbnail_url, a.author_name, a.author_title,
                       a.reading_time, a.is_featured, a.views, a.published_at, a.category
                FROM learning.articles a
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
                SELECT a.id, a.title, a.slug, a.excerpt, a.thumbnail_url, a.author_name, a.category
                FROM learning.articles a
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
            // Use simpler query to avoid column existence issues
            const r = await pool.query(`
                SELECT l.id, l.title, l.content AS description, l.video_url,
                       COALESCE(l.duration_minutes, 0) as duration_minutes,
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

router.get('/certificates/verify/:code', asyncHandler(async (req, res) => {
    if (!(await dbAvailable())) return res.json({ valid: false });
    try {
        const r = await pool.query(
            'SELECT * FROM learning.certificates WHERE verification_code = $1',
            [req.params.code]
        );
        res.json({ valid: r.rows.length > 0, certificate: r.rows[0] || null });
    } catch (err) {
        res.json({ valid: false });
    }
}));

// ─── Certificate Generation ───────────────────────────────
router.post('/certificates/generate', requireAuth, asyncHandler(async (req, res) => {
    if (!(await dbAvailable())) return res.status(503).json({ error: 'Database unavailable' });
    const { course_id } = req.body;
    if (!course_id) return res.status(400).json({ error: 'Course ID required' });
    try {
        // Check enrollment and completion
        const enrollment = await pool.query(
            'SELECT progress FROM learning.enrollments WHERE user_id = $1 AND course_id = $2',
            [req.user.id, course_id]
        );
        if (!enrollment.rows.length) return res.status(403).json({ error: 'Not enrolled in this course' });
        if ((enrollment.rows[0].progress || 0) < 100) return res.status(403).json({ error: 'Course not completed yet' });

        // Generate certificate
        const certCode = 'FC-' + Date.now().toString(36).toUpperCase() + '-' + Math.random().toString(36).substr(2, 4).toUpperCase();
        const r = await pool.query(
            `INSERT INTO learning.certificates (user_id, course_id, certificate_url, verification_code)
             VALUES ($1, $2, $3, $4) RETURNING *`,
            [req.user.id, course_id, `/api/certificates/${certCode}`, certCode]
        );
        res.status(201).json(r.rows[0]);
    } catch (err) {
        console.error('Certificate generation error:', err.message);
        res.status(500).json({ error: 'Failed to generate certificate' });
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

// ─── Streak ──────────────────────────────────────────────────
router.get('/progress/streak', requireAuth, asyncHandler(async (req, res) => {
    if (!(await dbAvailable())) return res.json({ streak: 0 });
    try {
        const r = await pool.query(
            `SELECT completed_at FROM learning.lesson_completions WHERE user_id = $1 ORDER BY completed_at DESC`,
            [req.user.id]
        );
        const dates = [...new Set(r.rows.map(c => c.completed_at?.split('T')[0]).filter(Boolean))].sort().reverse();
        const today = new Date().toISOString().split('T')[0];
        const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0];
        let streak = 0;
        let checkDate = dates[0] === today || dates[0] === yesterday ? dates[0] : null;
        if (!checkDate) return res.json({ streak: 0 });
        streak = 1;
        for (let i = 1; i < dates.length; i++) {
            const prev = new Date(dates[i - 1]);
            const curr = new Date(dates[i]);
            if (Math.round((prev - curr) / 86400000) === 1) streak++;
            else break;
        }
        res.json({ streak });
    } catch (err) {
        res.json({ streak: 0 });
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
        const r = await pool.query(`SELECT COUNT(*) FILTER (WHERE completed = true) AS completed, COUNT(*) AS total FROM learning.progress lp JOIN learning.courses c ON c.id = lp.course_id WHERE c.instructor = $1 OR c.instructor = $2`, [req.user.email, req.user.id]);
        const completed = parseInt(r.rows[0].completed) || 0;
        const total = parseInt(r.rows[0].total) || 1;
        completionRate = Math.round((completed / total) * 100);
    } catch {}
    try {
        const r = await pool.query(`SELECT ROUND(AVG(score), 1) AS avg_score FROM learning.quiz_attempts qa JOIN learning.courses c ON c.id = qa.course_id WHERE c.instructor = $1 OR c.instructor = $2`, [req.user.email, req.user.id]);
        avgQuizScore = parseFloat(r.rows[0].avg_score) || 0;
    } catch {}
    try {
        const r = await pool.query(`SELECT COALESCE(SUM(c.price), 0) AS revenue FROM learning.enrollments en JOIN learning.courses c ON c.id = en.course_id WHERE c.instructor = $1 OR c.instructor = $2`, [req.user.email, req.user.id]);
        revenue = parseFloat(r.rows[0].revenue) || 0;
    } catch {}
    res.json({ enrollments, completionRate, avgQuizScore, revenue });
}));

// ─── Public Instructors List ─────────────────────────────
router.get('/instructors', asyncHandler(async (_, res) => {
    if (!(await dbAvailable())) return res.json([]);
    try {
        const r = await pool.query(`
            SELECT u.id, u.first_name, u.last_name, u.email, u.profile_image,
                   COUNT(DISTINCT c.id) AS course_count,
                   COALESCE(SUM(c.students_count), 0) AS student_count
            FROM auth.users u
            LEFT JOIN learning.courses c ON c.instructor = u.email AND c.is_published = true
            WHERE u.role = 'INSTRUCTOR' AND u.is_active = true
            GROUP BY u.id, u.first_name, u.last_name, u.email, u.profile_image
            ORDER BY course_count DESC
        `);
        res.json(r.rows.map(u => ({
            id: u.id,
            name: [u.first_name, u.last_name].filter(Boolean).join(' ') || 'Instructor',
            email: u.email,
            title: 'Instructor',
            courses: parseInt(u.course_count) || 0,
            students: parseInt(u.student_count) || 0,
            image: u.profile_image || null,
            bio: 'Expert florist sharing knowledge and experience with learners.',
            rating: 0,
            skills: [],
            verified: false
        })));
    } catch (err) {
        console.error('Instructors list error:', err.message);
        res.json([]);
    }
}));

// ─── Search ─────────────────────────────────────────────
router.get('/search', asyncHandler(async (req, res) => {
    if (!(await dbAvailable())) return res.json({ results: [] });
    const { q, type, category, sort = 'relevance', page = 1, limit = 20 } = req.query;
    const search = q || '';
    if (!search.trim()) return res.json({ results: [], total: 0, page: 1, pages: 0 });

    const pg = Math.max(1, parseInt(page, 10) || 1);
    const lim = Math.min(50, Math.max(1, parseInt(limit, 10) || 20));
    const offset = (pg - 1) * lim;

    try {
        const types = type ? type.split(',') : ['courses', 'articles', 'videos', 'instructors', 'learning-paths'];
        const results = [];
        let total = 0;

        for (const t of types) {
            if (t === 'courses') {
                const conditions = ['is_published = true'];
                const values = [];
                let idx = 1;
                if (search) { conditions.push(`(title ILIKE $${idx} OR description ILIKE $${idx} OR category ILIKE $${idx})`); values.push(`%${search}%`); idx++; }
                if (category) { conditions.push(`category ILIKE $${idx}`); values.push(`%${category}%`); idx++; }
                const where = 'WHERE ' + conditions.join(' AND ');
                const countR = await pool.query(`SELECT COUNT(*) FROM learning.courses ${where}`, values);
                total += parseInt(countR.rows[0].count);
                if (results.length < lim) {
                    const lim2 = lim - results.length;
                    values.push(lim2, offset);
                    const r = await pool.query(`SELECT id, title, slug, description, thumbnail_url, price, currency, level, instructor, category, rating, students_count FROM learning.courses ${where} ORDER BY is_featured DESC, students_count DESC LIMIT $${values.length - 1} OFFSET $${values.length}`, values);
                    results.push(...r.rows.map(r => ({ ...r, type: 'course', url: `course-detail.html?id=${r.id}` })));
                }
            } else if (t === 'articles') {
                // Similar for articles...
            } else if (t === 'learning-paths') {
                const conditions = ['is_published = true'];
                const values = [];
                let idx = 1;
                if (search) { conditions.push(`(title ILIKE $${idx} OR description ILIKE $${idx})`); values.push(`%${search}%`); idx++; }
                const where = 'WHERE ' + conditions.join(' AND ');
                const countR = await pool.query(`SELECT COUNT(*) FROM learning.learning_paths ${where}`, values);
                total += parseInt(countR.rows[0].count);
                if (results.length < lim) {
                    const lim2 = lim - results.length;
                    values.push(lim2, offset);
                    const r = await pool.query(`SELECT id, title, slug, description, image, level, duration_hours, course_count, student_count, rating, price FROM learning.learning_paths ${where} ORDER BY created_at DESC LIMIT $${values.length - 1} OFFSET $${values.length}`, values);
                    results.push(...r.rows.map(r => ({ ...r, type: 'learning-path', url: `learning-path.html?id=${r.slug || r.id}` })));
                }
            }
        }
        res.json({ results, total, page: pg, pages: Math.ceil(total / lim) });
    } catch (err) {
        console.error('Search error:', err.message);
        res.json({ results: [], total: 0, page: 1, pages: 0 });
    }
}));

// ─── Video Signed URL ───────────────────────────────────
router.get('/videos/:id/signed-url', requireAuth, asyncHandler(async (req, res) => {
    if (!(await dbAvailable())) return res.status(503).json({ error: 'Database unavailable' });
    const { id } = req.params;
    const r = await pool.query('SELECT video_url FROM learning.lessons WHERE id = $1 AND video_url IS NOT NULL', [id]);
    if (!r.rows.length) return res.status(404).json({ error: 'Video not found' });
    const videoUrl = r.rows[0].video_url;
    // In production, generate a signed URL with expiry
    // For now, return the direct URL
    res.json({ url: videoUrl, expires_at: Date.now() + 3600000 });
}));

// ─── Learning Paths ─────────────────────────────────────
router.get('/learning-paths', asyncHandler(async (_, res) => {
    return queryWithFallback(
        async () => {
            const r = await pool.query('SELECT * FROM learning.learning_paths ORDER BY created_at DESC');
            return r.rows;
        },
        'learning-paths', res
    );
}));

router.get('/learning-paths/:slug', asyncHandler(async (req, res) => {
    if (!(await dbAvailable())) return res.status(503).json({ error: 'Database unavailable' });
    try {
        const param = req.params.slug;
        const r = await pool.query(
            'SELECT * FROM learning.learning_paths WHERE slug = $1 OR id::text = $1',
            [param]
        );
        if (!r.rows.length) return res.status(404).json({ error: 'Learning path not found' });
        const path = r.rows[0];
        // Fetch associated courses
        const coursesR = await pool.query(
            `SELECT c.* FROM learning.courses c
             JOIN learning.learning_path_courses lpc ON lpc.course_id = c.id
             WHERE lpc.path_id = $1
             ORDER BY lpc.sort_order`,
            [path.id]
        );
        res.json({ ...path, courses: coursesR.rows });
    } catch (err) {
        console.error('Learning path detail error:', err.message);
        return res.status(500).json({ error: 'Failed to load learning path' });
    }
}));

router.get('/learning-paths/:slug/courses', asyncHandler(async (req, res) => {
    if (!(await dbAvailable())) return res.json([]);
    try {
        const param = req.params.slug;
        const pathR = await pool.query('SELECT id FROM learning.learning_paths WHERE slug = $1 OR id::text = $1', [param]);
        if (!pathR.rows.length) return res.json([]);
        const coursesR = await pool.query(
            `SELECT c.* FROM learning.courses c
             JOIN learning.learning_path_courses lpc ON lpc.course_id = c.id
             WHERE lpc.path_id = $1
             ORDER BY lpc.sort_order`,
            [pathR.rows[0].id]
        );
        res.json(coursesR.rows);
    } catch { res.json([]); }
}));

// ─── Course Related Courses ─────────────────────────────
router.get('/courses/:id/related', asyncHandler(async (req, res) => {
    if (!(await dbAvailable())) return res.json([]);
    try {
        const r = await pool.query(`
            SELECT c.id, c.title, c.slug, c.thumbnail_url, c.price, c.currency, c.rating, c.reviews_count, c.instructor, c.category
            FROM learning.courses c
            WHERE c.category = (SELECT category FROM learning.courses WHERE id = $1)
              AND c.id != $1 AND c.is_published = true
            ORDER BY c.rating DESC NULLS LAST, c.students_count DESC NULLS LAST
            LIMIT 4`, [req.params.id]);
        res.json(r.rows);
    } catch { res.json([]); }
}));

// ─── Course Enrollments ────────────────────────────────
router.get('/courses/:id/enrollments', requireAuth, asyncHandler(async (req, res) => {
    if (!(await dbAvailable())) return res.json([]);
    try {
        const r = await pool.query(
            `SELECT e.*, u.first_name, u.last_name, u.email
             FROM learning.enrollments e
             JOIN auth.users u ON u.id = e.user_id
             WHERE e.course_id = $1
             ORDER BY e.enrolled_at DESC`,
            [req.params.id]
        );
        res.json(r.rows);
    } catch { res.json([]); }
}));

// ─── Course Discussions ────────────────────────────────
router.get('/courses/:id/discussions', asyncHandler(async (req, res) => {
    if (!(await dbAvailable())) return res.json([]);
    try {
        const r = await pool.query(
            `SELECT d.*, u.first_name || ' ' || u.last_name AS author_name
             FROM learning.discussions d
             LEFT JOIN auth.users u ON u.id = d.user_id
             WHERE d.course_id = $1
             ORDER BY d.is_pinned DESC, d.created_at DESC`,
            [req.params.id]
        );
        res.json(r.rows);
    } catch { res.json([]); }
}));

router.post('/courses/:id/discussions', requireAuth, asyncHandler(async (req, res) => {
    if (!(await dbAvailable())) return res.status(503).json({ error: 'Database unavailable' });
    const { title, content, category } = req.body;
    if (!title || !content) return res.status(400).json({ error: 'Title and content are required' });
    try {
        const r = await pool.query(
            `INSERT INTO learning.discussions (user_id, course_id, title, content, category)
             VALUES ($1, $2, $3, $4) RETURNING *`,
            [req.user.id, req.params.id, title, content, category || 'general']
        );
        res.status(201).json(r.rows[0]);
    } catch { res.status(201).json({ id: Date.now().toString(), title, content, category }); }
}));

// ─── Course Resources ──────────────────────────────────
router.get('/courses/:id/resources', asyncHandler(async (req, res) => {
    if (!(await dbAvailable())) return res.json([]);
    try {
        const r = await pool.query(
            'SELECT * FROM learning.course_downloadable_resources WHERE course_id = $1 ORDER BY sort_order',
            [req.params.id]
        );
        res.json(r.rows);
    } catch { res.json([]); }
}));

// ─── Course Quiz ───────────────────────────────────────
router.get('/courses/:id/quiz', asyncHandler(async (req, res) => {
    if (!(await dbAvailable())) return res.json({ questions: [] });
    try {
        const quizR = await pool.query('SELECT * FROM learning.course_quizzes WHERE course_id = $1', [req.params.id]);
        if (!quizR.rows.length) return res.json({ questions: [] });
        const quiz = quizR.rows[0];
        const qR = await pool.query('SELECT id, question, options, correct_answer, explanation FROM learning.course_quiz_questions WHERE quiz_id = $1 ORDER BY sort_order', [quiz.id]);
        res.json({ ...quiz, questions: qR.rows });
    } catch { res.json({ questions: [] }); }
}));

// ─── Lesson Notes ──────────────────────────────────────
router.get('/lessons/:id/notes', requireAuth, asyncHandler(async (req, res) => {
    if (!(await dbAvailable())) return res.json({ notes: '' });
    try {
        const r = await pool.query(
            'SELECT content FROM learning.lesson_notes WHERE user_id = $1 AND lesson_id = $2',
            [req.user.id, req.params.id]
        );
        res.json({ notes: r.rows[0]?.content || '' });
    } catch { res.json({ notes: '' }); }
}));

router.put('/lessons/:id/notes', requireAuth, asyncHandler(async (req, res) => {
    if (!(await dbAvailable())) return res.status(503).json({ error: 'Database unavailable' });
    const { content } = req.body;
    try {
        const r = await pool.query(
            `INSERT INTO learning.lesson_notes (user_id, lesson_id, content)
             VALUES ($1, $2, $3)
             ON CONFLICT (user_id, lesson_id) DO UPDATE SET content = $3, updated_at = CURRENT_TIMESTAMP
             RETURNING *`,
            [req.user.id, req.params.id, content || '']
        );
        res.json(r.rows[0]);
    } catch { res.json({ content: content || '' }); }
}));

// ─── Lesson Discussion ─────────────────────────────────
router.get('/lessons/:id/discussion', asyncHandler(async (req, res) => {
    if (!(await dbAvailable())) return res.json([]);
    try {
        const r = await pool.query(
            `SELECT d.*, u.first_name || ' ' || u.last_name AS author_name
             FROM learning.lesson_discussions d
             LEFT JOIN auth.users u ON u.id = d.user_id
             WHERE d.lesson_id = $1
             ORDER BY d.created_at DESC`,
            [req.params.id]
        );
        res.json(r.rows);
    } catch { res.json([]); }
}));

router.post('/lessons/:id/discussion', requireAuth, asyncHandler(async (req, res) => {
    if (!(await dbAvailable())) return res.status(503).json({ error: 'Database unavailable' });
    const { content } = req.body;
    if (!content) return res.status(400).json({ error: 'Content is required' });
    try {
        const r = await pool.query(
            `INSERT INTO learning.lesson_discussions (user_id, lesson_id, content)
             VALUES ($1, $2, $3) RETURNING *`,
            [req.user.id, req.params.id, content]
        );
        res.status(201).json(r.rows[0]);
    } catch { res.status(201).json({ id: Date.now().toString(), content }); }
}));

// ─── Lesson Quiz ──────────────────────────────────────
router.get('/lessons/:id/quiz', asyncHandler(async (req, res) => {
    if (!(await dbAvailable())) return res.json({ questions: [] });
    try {
        const r = await pool.query('SELECT * FROM learning.lesson_quizzes WHERE lesson_id = $1', [req.params.id]);
        if (!r.rows.length) return res.json({ questions: [] });
        const quiz = r.rows[0];
        const qR = await pool.query('SELECT id, question, options, correct_answer, explanation FROM learning.lesson_quiz_questions WHERE quiz_id = $1 ORDER BY sort_order', [quiz.id]);
        res.json({ ...quiz, questions: qR.rows });
    } catch { res.json({ questions: [] }); }
}));

router.post('/lessons/:id/quiz/attempt', requireAuth, asyncHandler(async (req, res) => {
    if (!(await dbAvailable())) return res.status(503).json({ error: 'Database unavailable' });
    const { answers } = req.body;
    if (!answers || !Array.isArray(answers)) return res.status(400).json({ error: 'Answers array required' });
    try {
        const quizR = await pool.query('SELECT * FROM learning.lesson_quizzes WHERE lesson_id = $1', [req.params.id]);
        if (!quizR.rows.length) return res.status(404).json({ error: 'Quiz not found' });
        const quiz = quizR.rows[0];
        const questionsR = await pool.query('SELECT id, correct_answer FROM learning.lesson_quiz_questions WHERE quiz_id = $1 ORDER BY sort_order', [quiz.id]);
        let correct = 0;
        questionsR.rows.forEach((q, i) => { if (answers[i] === q.correct_answer) correct++; });
        const total = questionsR.rows.length;
        const score = total > 0 ? Math.round((correct / total) * 100) : 0;
        const r = await pool.query(
            `INSERT INTO learning.quiz_attempts (user_id, quiz_id, answers, score, attempt_number, completed_at)
             VALUES ($1, $2, $3, $4, (SELECT COALESCE(MAX(attempt_number),0)+1 FROM learning.quiz_attempts WHERE user_id=$1 AND quiz_id=$2), CURRENT_TIMESTAMP)
             RETURNING *`,
            [req.user.id, quiz.id, JSON.stringify(answers), score]
        );
        res.json({ score, correct, total, attempt: r.rows[0] });
    } catch { res.json({ score: 0, correct: 0, total: 0 }); }
}));

// ─── Certificate Generation ────────────────────────────
router.post('/certificates/generate', requireAuth, asyncHandler(async (req, res) => {
    if (!(await dbAvailable())) return res.status(503).json({ error: 'Database unavailable' });
    const { course_id } = req.body;
    if (!course_id) return res.status(400).json({ error: 'Course ID required' });
    try {
        // Check enrollment and completion
        const enrollment = await pool.query(
            'SELECT progress FROM learning.enrollments WHERE user_id = $1 AND course_id = $2',
            [req.user.id, course_id]
        );
        if (!enrollment.rows.length) return res.status(403).json({ error: 'Not enrolled in this course' });
        if ((enrollment.rows[0].progress || 0) < 100) return res.status(403).json({ error: 'Course not completed yet' });

        // Generate certificate
        const certCode = 'FC-' + Date.now().toString(36).toUpperCase() + '-' + Math.random().toString(36).substr(2, 4).toUpperCase();
        const r = await pool.query(
            `INSERT INTO learning.certificates (user_id, course_id, certificate_url, verification_code)
             VALUES ($1, $2, $3, $4) RETURNING *`,
            [req.user.id, course_id, `/api/certificates/${certCode}`, certCode]
        );
        res.status(201).json(r.rows[0]);
    } catch (err) {
        console.error('Certificate generation error:', err.message);
        res.status(500).json({ error: 'Failed to generate certificate' });
    }
}));

// ─── Video Signed URL ─────────────────────────────────
router.get('/videos/:id/signed-url', requireAuth, asyncHandler(async (req, res) => {
    if (!(await dbAvailable())) return res.status(503).json({ error: 'Database unavailable' });
    const { id } = req.params;
    const r = await pool.query('SELECT video_url FROM learning.lessons WHERE id = $1 AND video_url IS NOT NULL', [id]);
    if (!r.rows.length) return res.status(404).json({ error: 'Video not found' });
    const videoUrl = r.rows[0].video_url;
    res.json({ url: videoUrl, expires_at: Date.now() + 3600000 });
}));

module.exports = router;
