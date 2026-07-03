const router = require('express').Router();
const jwt = require('jsonwebtoken');
const { pool, JWT_SECRET, upload, asyncHandler, escapeHtml, dbAvailable, readJSON, requireAuth, getFileUrl, rateLimiter } = require('./middleware');
const { checkAndAwardBadges } = require('./badges');
const path = require('path');

// Stricter rate limit for write operations: 20 per minute per IP
const writeLimiter = rateLimiter(20, 60000);

// ─── Feed Listing ──────────────────────────────────────────────────────

router.get('/', asyncHandler(async (req, res) => {
    const { tab = 'for-you', filter = 'latest', page = 1, limit = 10 } = req.query;
    const pg = Math.max(1, parseInt(page, 10) || 1);
    const lim = Math.min(50, Math.max(1, parseInt(limit, 10) || 10));
    const offset = (pg - 1) * lim;

    // Get current user if authenticated
    let userId = null;
    if (req.headers.authorization) {
        try {
            const decoded = jwt.verify(req.headers.authorization.replace('Bearer ', ''), JWT_SECRET);
            userId = decoded.id;
        } catch {}
    }

    if (await dbAvailable()) {
        try {
            let conditions = [];
            let values = [];
            let idx = 1;

            // Tab filtering
            if (tab === 'following' && userId) {
                conditions.push(`p.user_id IN (SELECT following_id FROM platform.follows WHERE follower_id = $${idx})`);
                values.push(userId);
                idx++;
            } else if (tab === 'marketplace') {
                conditions.push(`p.post_type = 'marketplace'`);
            } else if (tab === 'learning' || tab === 'achievement') {
                conditions.push(`p.post_type IN ('learning', 'achievement')`);
            } else if (tab === 'trending') {
                conditions.push(`p.created_at > NOW() - INTERVAL '7 days'`);
            } else if (tab === 'nearby') {
                conditions.push(`p.location IS NOT NULL`);
            }

            // For You tab: mix of followed + popular + fresh content
            if (tab === 'for-you' && userId) {
                conditions.push(`(
                    p.user_id IN (SELECT following_id FROM platform.follows WHERE follower_id = $${idx})
                    OR p.is_pinned = true
                    OR p.created_at > NOW() - INTERVAL '3 days'
                )`);
                values.push(userId);
                idx++;
            } else if (tab === 'for-you') {
                conditions.push(`p.created_at > NOW() - INTERVAL '7 days'`);
            }

            // Filter
            if (filter === 'photos') {
                conditions.push(`p.media_urls IS NOT NULL AND array_length(p.media_urls, 1) > 0`);
            } else if (filter === 'videos') {
                conditions.push(`'video' = ANY(p.media_type)`);
            } else if (filter === 'questions') {
                conditions.push(`p.post_type = 'question'`);
            } else if (filter === 'marketplace') {
                conditions.push(`p.post_type = 'marketplace'`);
            } else if (filter === 'learning') {
                conditions.push(`p.post_type IN ('learning', 'achievement')`);
            } else if (filter === 'nearby') {
                conditions.push(`p.location IS NOT NULL`);
            }

            const where = conditions.length ? 'WHERE ' + conditions.join(' AND ') : '';

            // Sort
            let orderBy;
            switch (filter) {
                case 'popular': orderBy = '(COALESCE(lc.like_count, 0) + COALESCE(cc.comment_count, 0) * 2) DESC'; break;
                case 'latest': default: orderBy = 'p.created_at DESC'; break;
            }

            // Count
            const countQ = `SELECT COUNT(*) FROM community.posts p ${where}`;
            const countR = await pool.query(countQ, values);
            const total = parseInt(countR.rows[0].count, 10);

            values.push(lim, offset);

            const dataQ = `
                SELECT p.*,
                    u.first_name || ' ' || u.last_name AS author_name,
                    u.profile_image AS author_avatar, u.role AS author_role,
                    COALESCE(lc.like_count, 0) AS like_count,
                    COALESCE(cc.comment_count, 0) AS comment_count,
                    (SELECT COUNT(*) FROM community.post_shares WHERE post_id = p.id) AS share_count,
                    ${userId ? `(SELECT reaction_type FROM community.post_reactions WHERE post_id = p.id AND user_id = $${idx + 2} LIMIT 1) AS user_reaction` : 'NULL AS user_reaction'},
                    ${userId ? `(SELECT EXISTS(SELECT 1 FROM community.post_saves WHERE post_id = p.id AND user_id = $${idx + 2})) AS user_saved` : 'FALSE AS user_saved'}
                FROM community.posts p
                JOIN auth.users u ON u.id = p.user_id
                LEFT JOIN (SELECT post_id, COUNT(*) AS like_count FROM community.post_likes GROUP BY post_id) lc ON lc.post_id = p.id
                LEFT JOIN (SELECT post_id, COUNT(*) AS comment_count FROM community.comments GROUP BY post_id) cc ON cc.post_id = p.id
                ${where}
                ORDER BY p.is_pinned DESC, ${orderBy}
                LIMIT $${idx} OFFSET $${idx + 1}`;

            const dataR = await pool.query(dataQ, values);

            // Enrich posts with images, poll options, product info, etc.
            const posts = await Promise.all(dataR.rows.map(async (p) => {
                const enriched = { ...p };

                // Media
                if (p.media_urls && p.media_urls.length) {
                    enriched.images = p.media_urls;
                } else {
                    const imgs = await pool.query(
                        'SELECT url FROM community.post_media WHERE post_id = $1 ORDER BY sort_order', [p.id]
                    );
                    enriched.images = imgs.rows.map(i => i.url);
                }

                // Poll options
                if (p.post_type === 'poll' && p.poll_options) {
                    enriched.poll_options = await Promise.all(
                        (Array.isArray(p.poll_options) ? p.poll_options : []).map(async (opt, i) => {
                            const v = await pool.query(
                                'SELECT COUNT(*) AS cnt FROM community.poll_votes WHERE post_id = $1 AND option_index = $2', [p.id, i]
                            );
                            return { text: opt, votes: parseInt(v.rows[0].cnt) || 0 };
                        })
                    );
                    const tv = await pool.query('SELECT COUNT(*) AS cnt FROM community.poll_votes WHERE post_id = $1', [p.id]);
                    enriched.total_votes = parseInt(tv.rows[0].cnt) || 0;
                    if (userId) {
                        const uv = await pool.query(
                            'SELECT option_index FROM community.poll_votes WHERE post_id = $1 AND user_id = $2', [p.id, userId]
                        );
                        enriched.user_vote = uv.rows.length ? uv.rows[0].option_index : null;
                    }
                }

                // Recent comments (top 2)
                const comments = await pool.query(
                    `SELECT c.*, u.first_name || ' ' || u.last_name AS author_name, u.profile_image AS author_avatar
                     FROM community.comments c JOIN auth.users u ON u.id = c.user_id
                     WHERE c.post_id = $1
                     ORDER BY c.created_at DESC LIMIT 2`, [p.id]
                );
                enriched.recent_comments = comments.rows;

                // Workshop info
                if (p.post_type === 'workshop' && p.event_id) {
                    try {
                        const ws = await pool.query(
                            'SELECT id, title, event_date, event_time, location, price, image_url, max_participants FROM events.events WHERE id = $1', [p.event_id]
                        );
                        if (ws.rows.length) {
                            enriched.workshop = ws.rows[0];
                            enriched.event_title = ws.rows[0].title;
                            enriched.event_date = ws.rows[0].event_date;
                            enriched.event_time = ws.rows[0].event_time;
                            enriched.event_location = ws.rows[0].location;
                        }
                    } catch (err) { console.error('Feed workshop enrichment error:', err.message); }
                }

                // Marketplace product info
                if (p.post_type === 'marketplace' && p.product_id) {
                    try {
                        const prod = await pool.query(
                            'SELECT id, name, price, image_url, rating FROM marketplace.products WHERE id = $1', [p.product_id]
                        );
                        if (prod.rows.length) enriched.product = prod.rows[0];
                    } catch (err) { console.error('Feed product enrichment error:', err.message); }
                }

                // Course / Learning info
                if ((p.post_type === 'learning' || p.post_type === 'achievement') && p.course_id) {
                    try {
                        const cr = await pool.query(
                            'SELECT id, title, image_url, rating, students_count FROM learning.courses WHERE id = $1', [p.course_id]
                        );
                        if (cr.rows.length) enriched.course = cr.rows[0];
                    } catch (err) { console.error('Feed course enrichment error:', err.message); }
                }

                // Event info
                if (p.post_type === 'event' && p.event_id) {
                    try {
                        const ev = await pool.query(
                            'SELECT id, title, event_date, event_time, location, image_url FROM events.events WHERE id = $1', [p.event_id]
                        );
                        if (ev.rows.length) {
                            enriched.event_title = ev.rows[0].title;
                            enriched.event_date = ev.rows[0].event_date;
                            enriched.event_time = ev.rows[0].event_time;
                            enriched.event_location = ev.rows[0].location;
                        }
                    } catch (err) { console.error('Feed event enrichment error:', err.message); }
                }

                return enriched;
            }));

            return res.json({ posts, total, page: pg, limit: lim, pages: Math.ceil(total / lim) });
        } catch (err) {
            console.error('Feed query error:', err.message);
        }
    }

    // Fallback: serve mixed content from JSON files
    const fallback = [];
    try {
        const community = readJSON(path.join(__dirname, '..', 'data', 'community.json'));
        (community.discussions || []).slice(0, 5).forEach(d => {
            fallback.push({ ...d, post_type: 'standard', author_name: d.author_name || 'Community Member' });
        });
        const stories = community.successStories || [];
        stories.slice(0, 3).forEach(s => {
            fallback.push({ ...s, post_type: 'standard', author_name: s.author_name || 'Community Member' });
        });
    } catch (err) { console.error('Feed fallback read error:', err.message); }
    const sliced = fallback.slice(offset, offset + lim);
    res.json({ posts: sliced, total: fallback.length, page: pg, limit: lim, pages: Math.ceil(fallback.length / lim) });
}));

// ─── Create Post ───────────────────────────────────────────────────────

router.post('/', writeLimiter, requireAuth, upload.array('media', 4), asyncHandler(async (req, res) => {
    if (!(await dbAvailable())) return res.status(503).json({ error: 'Database unavailable' });

    const { content, post_type = 'standard', audience = 'public', tags, category,
            poll_options, poll_question, product_id, event_id } = req.body;

    if (!content && (!req.files || !req.files.length) && !poll_options) {
        return res.status(400).json({ error: 'Content is required' });
    }

    const safeContent = escapeHtml(content || '').slice(0, 5000);
    const parsedTags = tryParseJSON(tags, []);
    const mediaUrls = (req.files || []).map(f => getFileUrl(f));
    const mediaType = (req.files || []).map(f => f.mimetype.startsWith('video/') ? 'video' : 'image');

    let parsedPollOptions = null;
    let pollEndsAt = null;
    if (post_type === 'poll' && poll_options) {
        parsedPollOptions = tryParseJSON(poll_options, null);
        pollEndsAt = new Date(Date.now() + 7 * 86400000); // 7 days
    }

    const r = await pool.query(
        `INSERT INTO community.posts (user_id, content, post_type, audience, tags, media_urls, media_type,
         poll_options, poll_ends_at, product_id, event_id, category)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
         RETURNING *`,
        [req.user.id, safeContent, post_type, audience, parsedTags, mediaUrls, mediaType,
         parsedPollOptions, pollEndsAt, product_id || null, event_id || null, category || null]
    );

    // Save individual media entries
    if (req.files && req.files.length) {
        for (let i = 0; i < req.files.length; i++) {
            try {
                await pool.query(
                    'INSERT INTO community.post_media (post_id, url, media_type, sort_order) VALUES ($1, $2, $3, $4)',
                    [r.rows[0].id, mediaUrls[i], mediaType[i], i]
                );
            } catch (err) { console.error('Feed media insert error:', err.message); }
        }
    }

    // Get user info for response
    const user = await pool.query('SELECT first_name, last_name, profile_image, role FROM auth.users WHERE id = $1', [req.user.id]);
    const u = user.rows[0] || {};

    res.status(201).json({
        ...r.rows[0],
        author_name: `${u.first_name || ''} ${u.last_name || ''}`.trim() || 'Anonymous',
        author_avatar: u.profile_image,
        author_role: u.role,
        images: mediaUrls
    });

    checkAndAwardBadges(req.user.id).catch(() => {});
}));

// ─── React to Post ─────────────────────────────────────────────────────

router.post('/:id/react', writeLimiter, requireAuth, asyncHandler(async (req, res) => {
    if (!(await dbAvailable())) return res.status(503).json({ error: 'Database unavailable' });
    const { id } = req.params;
    const { reaction } = req.body;
    const validReactions = ['love', 'beautiful', 'great-work', 'helpful', 'congrats'];
    if (!validReactions.includes(reaction)) return res.status(400).json({ error: 'Invalid reaction' });

    // Upsert reaction
    await pool.query(
        `INSERT INTO community.post_reactions (post_id, user_id, reaction_type)
         VALUES ($1, $2, $3)
         ON CONFLICT (post_id, user_id) DO UPDATE SET reaction_type = $3`,
        [id, req.user.id, reaction]
    );

    const count = await pool.query('SELECT COUNT(*) AS cnt FROM community.post_reactions WHERE post_id = $1', [id]);
    res.json({ reaction, count: parseInt(count.rows[0].cnt) || 0 });
}));

router.delete('/:id/react', requireAuth, asyncHandler(async (req, res) => {
    if (!(await dbAvailable())) return res.status(503).json({ error: 'Database unavailable' });
    const { id } = req.params;
    await pool.query('DELETE FROM community.post_reactions WHERE post_id = $1 AND user_id = $2', [id, req.user.id]);
    const count = await pool.query('SELECT COUNT(*) AS cnt FROM community.post_reactions WHERE post_id = $1', [id]);
    res.json({ count: parseInt(count.rows[0].cnt) || 0 });
}));

// ─── Comments ──────────────────────────────────────────────────────────

router.post('/:id/comments', writeLimiter, requireAuth, asyncHandler(async (req, res) => {
    if (!(await dbAvailable())) return res.status(503).json({ error: 'Database unavailable' });
    const { id } = req.params;
    const { content } = req.body;
    if (!content || typeof content !== 'string') return res.status(400).json({ error: 'Content is required' });

    const post = await pool.query('SELECT id, user_id FROM community.posts WHERE id = $1', [id]);
    if (!post.rows.length) return res.status(404).json({ error: 'Post not found' });

    const r = await pool.query(
        'INSERT INTO community.comments (post_id, user_id, content) VALUES ($1, $2, $3) RETURNING *',
        [id, req.user.id, escapeHtml(content).slice(0, 2000)]
    );

    // Notify post author
    if (post.rows[0].user_id !== req.user.id) {
        const commenter = await pool.query('SELECT first_name FROM auth.users WHERE id = $1', [req.user.id]);
        try {
            await pool.query(
                'INSERT INTO platform.notifications (user_id, type, title, message, link) VALUES ($1, $2, $3, $4, $5)',
                [post.rows[0].user_id, 'comment', 'New Comment',
                 `${commenter.rows[0]?.first_name || 'Someone'} commented on your post`,
                 `/feed.html#post-${id}`]
            );
        } catch (err) { console.error('Feed notification insert error:', err.message); }
    }

    const user = await pool.query('SELECT first_name, last_name, profile_image FROM auth.users WHERE id = $1', [req.user.id]);
    const u = user.rows[0] || {};
    res.status(201).json({
        ...r.rows[0],
        author_name: `${u.first_name || ''} ${u.last_name || ''}`.trim(),
        author_avatar: u.profile_image
    });
}));

// ─── Share Post ────────────────────────────────────────────────────────

router.post('/:id/share', requireAuth, asyncHandler(async (req, res) => {
    if (!(await dbAvailable())) return res.status(503).json({ error: 'Database unavailable' });
    const { id } = req.params;
    await pool.query('INSERT INTO community.post_shares (post_id, user_id) VALUES ($1, $2)', [id, req.user.id]);
    res.json({ message: 'Shared' });
}));

// ─── Save Post ─────────────────────────────────────────────────────────

router.post('/:id/save', requireAuth, asyncHandler(async (req, res) => {
    if (!(await dbAvailable())) return res.status(503).json({ error: 'Database unavailable' });
    const { id } = req.params;
    const existing = await pool.query('SELECT id FROM community.post_saves WHERE post_id = $1 AND user_id = $2', [id, req.user.id]);
    if (existing.rows.length) {
        await pool.query('DELETE FROM community.post_saves WHERE post_id = $1 AND user_id = $2', [id, req.user.id]);
        res.json({ saved: false });
    } else {
        await pool.query('INSERT INTO community.post_saves (post_id, user_id) VALUES ($1, $2)', [id, req.user.id]);
        res.json({ saved: true });
    }
}));

// ─── Poll Vote ─────────────────────────────────────────────────────────

router.post('/:id/vote', requireAuth, asyncHandler(async (req, res) => {
    if (!(await dbAvailable())) return res.status(503).json({ error: 'Database unavailable' });
    const { id } = req.params;
    const { option } = req.body;
    if (option == null) return res.status(400).json({ error: 'Option required' });

    const post = await pool.query('SELECT poll_options FROM community.posts WHERE id = $1 AND post_type = $2', [id, 'poll']);
    if (!post.rows.length) return res.status(404).json({ error: 'Poll not found' });

    const opts = post.rows[0].poll_options || [];
    if (option < 0 || option >= opts.length) return res.status(400).json({ error: 'Invalid option' });

    await pool.query(
        `INSERT INTO community.poll_votes (post_id, user_id, option_index)
         VALUES ($1, $2, $3)
         ON CONFLICT (post_id, user_id) DO UPDATE SET option_index = $3`,
        [id, req.user.id, option]
    );

    // Return updated results
    const results = await Promise.all(opts.map(async (_, i) => {
        const v = await pool.query('SELECT COUNT(*) AS cnt FROM community.poll_votes WHERE post_id = $1 AND option_index = $2', [id, i]);
        return { text: opts[i], votes: parseInt(v.rows[0].cnt) || 0 };
    }));
    const total = results.reduce((s, r) => s + r.votes, 0);
    res.json({ options: results, total_votes: total, user_vote: option });
}));

// ─── Trending Topics ──────────────────────────────────────────────────

router.get('/trending', asyncHandler(async (_, res) => {
    if (!(await dbAvailable())) {
        return res.json([
            { tag: 'WeddingFlowers', count: 2400 },
            { tag: 'FlowerBusiness', count: 1800 },
            { tag: 'RoseCare', count: 1200 },
            { tag: 'IndoorPlants', count: 980 },
            { tag: 'SpringArrangements', count: 756 }
        ]);
    }
    try {
        const r = await pool.query(`
            SELECT unnest(tags) AS tag, COUNT(*) AS cnt
            FROM community.posts
            WHERE tags IS NOT NULL AND array_length(tags, 1) > 0
              AND created_at > NOW() - INTERVAL '30 days'
            GROUP BY tag
            ORDER BY cnt DESC
            LIMIT 10
        `);
        if (r.rows.length) return res.json(r.rows);
    } catch (err) { console.error('Trending query error:', err.message); }
    res.json([]);
}));

// ─── Featured Creator ────────────────────────────────────────────────

router.get('/featured-creator', asyncHandler(async (_, res) => {
    if (!(await dbAvailable())) return res.json(null);
    try {
        const r = await pool.query(`
            SELECT u.id, u.first_name, u.last_name, u.profile_image, u.description, u.role,
                (SELECT COUNT(*) FROM community.posts WHERE user_id = u.id) AS posts,
                (SELECT COALESCE(SUM(like_count), 0) FROM community.posts WHERE user_id = u.id) AS total_likes,
                (SELECT COUNT(*) FROM community.discussions WHERE user_id = u.id) AS discussions
            FROM auth.users u
            WHERE EXISTS (SELECT 1 FROM community.posts WHERE user_id = u.id)
               OR EXISTS (SELECT 1 FROM community.discussions WHERE user_id = u.id)
            ORDER BY (
                (SELECT COALESCE(SUM(like_count), 0) FROM community.posts WHERE user_id = u.id) +
                (SELECT COUNT(*) FROM community.discussions WHERE user_id = u.id) * 5
            ) DESC
            LIMIT 1
        `);
        if (r.rows.length) return res.json(r.rows[0]);
    } catch (err) { console.error('Featured creator error:', err.message); }
    res.json(null);
}));

// ─── Smart Recommendations ──────────────────────────────────────────

router.get('/recommendations', asyncHandler(async (req, res) => {
    if (!(await dbAvailable())) return res.json([]);
    let userId = null;
    if (req.headers.authorization) {
        try {
            const decoded = jwt.verify(req.headers.authorization.replace('Bearer ', ''), JWT_SECRET);
            userId = decoded.id;
        } catch {}
    }
    try {
        let interests = [];
        if (userId) {
            const tags = await pool.query(`
                SELECT DISTINCT unnest(tags) AS tag FROM community.posts
                WHERE user_id = $1 AND tags IS NOT NULL AND array_length(tags, 1) > 0
                LIMIT 5
            `, [userId]);
            interests = tags.rows.map(r => r.tag);
        }
        if (!interests.length) {
            interests = ['flowers', 'gardening', 'arrangements', 'care', 'wedding'];
        }
        const condition = interests.map((_, i) => `$${i + 1}`).join(', ');
        const r = await pool.query(`
            SELECT u.id, u.first_name, u.last_name, u.profile_image, u.role, u.description,
                COUNT(*) AS match_score
            FROM auth.users u
            JOIN community.posts p ON p.user_id = u.id
            WHERE p.tags && $${interests.length + 1}::text[]
              AND p.is_published = true
              AND ($1::int IS NULL OR u.id != $1)
            GROUP BY u.id
            ORDER BY match_score DESC
            LIMIT 3
        `, [...interests, interests, userId || null]);
        res.json(r.rows);
    } catch (err) { console.error('Recommendations error:', err.message); res.json([]); }
}));

// ─── Suggested Members ─────────────────────────────────────────────────

router.get('/suggested', asyncHandler(async (req, res) => {
    if (!(await dbAvailable())) return res.json([]);
    const limit = Math.min(10, parseInt(req.query.limit, 10) || 5);

    let userId = null;
    if (req.headers.authorization) {
        try {
            const decoded = jwt.verify(req.headers.authorization.replace('Bearer ', ''), JWT_SECRET);
            userId = decoded.id;
        } catch {}
    }

    try {
        const q = userId
            ? `SELECT id, first_name, last_name, profile_image, role
               FROM auth.users
               WHERE id != $1 AND id NOT IN (SELECT following_id FROM platform.follows WHERE follower_id = $1)
               ORDER BY RANDOM() LIMIT $2`
            : `SELECT id, first_name, last_name, profile_image, role
               FROM auth.users ORDER BY RANDOM() LIMIT $1`;
        const params = userId ? [userId, limit] : [limit];
        const r = await pool.query(q, params);
        res.json(r.rows);
    } catch { res.json([]); }
}));

// ─── Feed Insights ─────────────────────────────────────────────────────

router.get('/insights', requireAuth, asyncHandler(async (req, res) => {
    if (!(await dbAvailable())) return res.json({ posts: 0, likes: 0, comments: 0, followers: 0 });
    try {
        const [posts, likes, comments, followers] = await Promise.all([
            pool.query(`SELECT COUNT(*) FROM community.posts WHERE user_id = $1 AND created_at > NOW() - INTERVAL '30 days'`, [req.user.id]),
            pool.query(`SELECT COALESCE(SUM(like_count), 0) FROM community.posts WHERE user_id = $1 AND created_at > NOW() - INTERVAL '30 days'`, [req.user.id]),
            pool.query(`SELECT COUNT(*) FROM community.comments c JOIN community.posts p ON p.id = c.post_id WHERE p.user_id = $1 AND c.created_at > NOW() - INTERVAL '30 days'`, [req.user.id]),
            pool.query(`SELECT COUNT(*) FROM platform.follows WHERE following_id = $1 AND created_at > NOW() - INTERVAL '30 days'`, [req.user.id])
        ]);
        res.json({
            posts: parseInt(posts.rows[0].count) || 0,
            likes: parseInt(likes.rows[0].sum) || 0,
            comments: parseInt(comments.rows[0].count) || 0,
            followers: parseInt(followers.rows[0].count) || 0
        });
    } catch { res.json({ posts: 0, likes: 0, comments: 0, followers: 0 }); }
}));

// ─── Helpers ───────────────────────────────────────────────────────────

function tryParseJSON(val, fallback) {
    if (!val) return fallback;
    try { return JSON.parse(val); } catch { return fallback; }
}

module.exports = router;
