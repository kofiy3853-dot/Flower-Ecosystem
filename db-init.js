const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');

const pool = new Pool({
    connectionString: process.env.DATABASE_URL || undefined,
    host: process.env.DATABASE_URL ? undefined : process.env.PG_HOST,
    port: process.env.DATABASE_URL ? undefined : (parseInt(process.env.PG_PORT, 10) || 5432),
    database: process.env.DATABASE_URL ? undefined : process.env.PG_DATABASE,
    user: process.env.DATABASE_URL ? undefined : process.env.PG_USER,
    password: process.env.DATABASE_URL ? undefined : process.env.PG_PASSWORD,
    ssl: process.env.DATABASE_URL ? { rejectUnauthorized: false } : (process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false),
});

async function run() {
    let client;
    try {
        client = await pool.connect();
    } catch (err) {
        console.warn('Could not connect to database:', err.message);
        await pool.end();
        return;
    }
    try {
        // Run schema.sql (may fail on existing databases, that's OK)
        const schemaPath = path.join(__dirname, 'sql', 'schema.sql');
        if (fs.existsSync(schemaPath)) {
            const schema = fs.readFileSync(schemaPath, 'utf8');
            console.log('Running schema.sql...');
            try {
                await client.query(schema);
                console.log('Schema applied.');
            } catch (e) {
                console.log('Schema partially applied (some objects may already exist):', e.message.split('\n')[0]);
            }
        }

        // Run migrations independently (each handles its own errors)
        const migrations = ['001_add_grower_role.sql', '002_add_missing_columns.sql', '011_newsletter_subscribers.sql'];
        for (const m of migrations) {
            const mPath = path.join(__dirname, 'migrations', m);
            if (fs.existsSync(mPath)) {
                const sql = fs.readFileSync(mPath, 'utf8');
                console.log(`Running ${m}...`);
                try {
                    await client.query(sql);
                    console.log(`${m} applied.`);
                } catch (e) {
                    console.log(`${m} partially applied:`, e.message.split('\n')[0]);
                }
            }
        }

        // Run auth fixes (login_attempts, sessions, refresh_tokens, etc.)
        const authFixesPath = path.join(__dirname, 'sql', 'auth-fixes.sql');
        if (fs.existsSync(authFixesPath)) {
            console.log('Running auth-fixes.sql...');
            try {
                await client.query(fs.readFileSync(authFixesPath, 'utf8'));
                console.log('Auth fixes applied.');
            } catch (e) {
                console.log('Auth fixes partially applied:', e.message.split('\n')[0]);
            }
        }

        // Run messaging schema
        const msgSchemaPath = path.join(__dirname, 'sql', 'notifications-messaging.sql');
        if (fs.existsSync(msgSchemaPath)) {
            const msgSchema = fs.readFileSync(msgSchemaPath, 'utf8');
            console.log('Running notifications-messaging.sql...');
            try {
                await client.query(msgSchema);
                console.log('Messaging schema applied.');
            } catch (e) {
                console.log('Messaging schema partially applied:', e.message.split('\n')[0]);
            }
        }

        // Run buyer dashboard schema (profiles, favorites, etc.)
        const buyerSchemaPath = path.join(__dirname, 'sql', 'buyer-dashboard.sql');
        if (fs.existsSync(buyerSchemaPath)) {
            const buyerSchema = fs.readFileSync(buyerSchemaPath, 'utf8');
            console.log('Running buyer-dashboard.sql...');
            try {
                await client.query(buyerSchema);
                console.log('Buyer dashboard schema applied.');
            } catch (e) {
                console.log('Buyer dashboard schema partially applied:', e.message.split('\n')[0]);
            }
        }

        // Run learning extra tables (workshops, live classes, assignments)
        const learningExtraPath = path.join(__dirname, 'sql', 'learning-extra-tables.sql');
        if (fs.existsSync(learningExtraPath)) {
            const learningExtra = fs.readFileSync(learningExtraPath, 'utf8');
            console.log('Running learning-extra-tables.sql...');
            try {
                await client.query(learningExtra);
                console.log('Learning extra tables applied.');
            } catch (e) {
                console.log('Learning extra tables partially applied:', e.message.split('\n')[0]);
            }
        }

        // Run learning system fixes
        const learningFixesPath = path.join(__dirname, 'sql', 'learning-system-fixes.sql');
        if (fs.existsSync(learningFixesPath)) {
            const learningFixes = fs.readFileSync(learningFixesPath, 'utf8');
            console.log('Running learning-system-fixes.sql...');
            try {
                await client.query(learningFixes);
                console.log('Learning system fixes applied.');
            } catch (e) {
                console.log('Learning system fixes partially applied:', e.message.split('\n')[0]);
            }
        }

        // Run learning complete tables (paths, quizzes, discussions, resources, certificates)
        const learningCompletePath = path.join(__dirname, 'sql', 'learning-complete-tables.sql');
        if (fs.existsSync(learningCompletePath)) {
            const learningComplete = fs.readFileSync(learningCompletePath, 'utf8');
            console.log('Running learning-complete-tables.sql...');
            try {
                await client.query(learningComplete);
                console.log('Learning complete tables applied.');
            } catch (e) {
                console.log('Learning complete tables partially applied:', e.message.split('\n')[0]);
            }
        }

        // Run community discussions schema
        const discussionsPath = path.join(__dirname, 'sql', 'discussions.sql');
        if (fs.existsSync(discussionsPath)) {
            const discussions = fs.readFileSync(discussionsPath, 'utf8');
            console.log('Running discussions.sql...');
            try {
                await client.query(discussions);
                console.log('Discussions schema applied.');
            } catch (e) {
                console.log('Discussions schema partially applied:', e.message.split('\n')[0]);
            }
        }

        // Run Q&A system schema
        const qaPath = path.join(__dirname, 'sql', 'qa-system.sql');
        if (fs.existsSync(qaPath)) {
            const qa = fs.readFileSync(qaPath, 'utf8');
            console.log('Running qa-system.sql...');
            try {
                await client.query(qa);
                console.log('QA system schema applied.');
            } catch (e) {
                console.log('QA system schema partially applied:', e.message.split('\n')[0]);
            }
        }

        // Run success stories schema
        const storiesPath = path.join(__dirname, 'sql', 'success-stories.sql');
        if (fs.existsSync(storiesPath)) {
            const stories = fs.readFileSync(storiesPath, 'utf8');
            console.log('Running success-stories.sql...');
            try {
                await client.query(stories);
                console.log('Success stories schema applied.');
            } catch (e) {
                console.log('Success stories schema partially applied:', e.message.split('\n')[0]);
            }
        }

        // Run follows schema
        const followsPath = path.join(__dirname, 'sql', 'follows.sql');
        if (fs.existsSync(followsPath)) {
            const follows = fs.readFileSync(followsPath, 'utf8');
            console.log('Running follows.sql...');
            try {
                await client.query(follows);
                console.log('Follows schema applied.');
            } catch (e) {
                console.log('Follows schema partially applied:', e.message.split('\n')[0]);
            }
        }

        // Run posts enhanced schema
        const postsEnhancedPath = path.join(__dirname, 'sql', 'posts-enhanced.sql');
        if (fs.existsSync(postsEnhancedPath)) {
            const postsEnhanced = fs.readFileSync(postsEnhancedPath, 'utf8');
            console.log('Running posts-enhanced.sql...');
            try {
                await client.query(postsEnhanced);
                console.log('Posts enhanced schema applied.');
            } catch (e) {
                console.log('Posts enhanced schema partially applied:', e.message.split('\n')[0]);
            }
        }

        // Run events enhanced schema
        const eventsEnhancedPath = path.join(__dirname, 'sql', 'events-enhanced.sql');
        if (fs.existsSync(eventsEnhancedPath)) {
            const eventsEnhanced = fs.readFileSync(eventsEnhancedPath, 'utf8');
            console.log('Running events-enhanced.sql...');
            try {
                await client.query(eventsEnhanced);
                console.log('Events enhanced schema applied.');
            } catch (e) {
                console.log('Events enhanced schema partially applied:', e.message.split('\n')[0]);
            }
        }

        // Run instructor applications migration
        const instructorAppsPath = path.join(__dirname, 'migrations', '010_instructor_applications.sql');
        if (fs.existsSync(instructorAppsPath)) {
            const instructorApps = fs.readFileSync(instructorAppsPath, 'utf8');
            console.log('Running 010_instructor_applications.sql...');
            try {
                await client.query(instructorApps);
                console.log('010_instructor_applications.sql applied.');
            } catch (e) {
                console.log('010_instructor_applications.sql partially applied:', e.message.split('\n')[0]);
            }
        }

        // Run flower encyclopedia tables
        const flowerEncPath = path.join(__dirname, 'sql', 'flower-encyclopedia.sql');
        if (fs.existsSync(flowerEncPath)) {
            console.log('Running flower-encyclopedia.sql...');
            try {
                await client.query(fs.readFileSync(flowerEncPath, 'utf8'));
                console.log('flower-encyclopedia.sql applied.');
            } catch (e) {
                console.log('flower-encyclopedia.sql partially applied:', e.message.split('\n')[0]);
            }
        }

        // Run flower meanings tables
        const flowerMeaningsPath = path.join(__dirname, 'sql', 'flower-meanings.sql');
        if (fs.existsSync(flowerMeaningsPath)) {
            console.log('Running flower-meanings.sql...');
            try {
                await client.query(fs.readFileSync(flowerMeaningsPath, 'utf8'));
                console.log('flower-meanings.sql applied.');
            } catch (e) {
                console.log('flower-meanings.sql partially applied:', e.message.split('\n')[0]);
            }
        }

        // Run care guides enhanced tables
        const careGuidesPath = path.join(__dirname, 'sql', 'care-guides-enhanced.sql');
        if (fs.existsSync(careGuidesPath)) {
            console.log('Running care-guides-enhanced.sql...');
            try {
                await client.query(fs.readFileSync(careGuidesPath, 'utf8'));
                console.log('care-guides-enhanced.sql applied.');
            } catch (e) {
                console.log('care-guides-enhanced.sql partially applied:', e.message.split('\n')[0]);
            }
        }

        // Run care guides base tables (care_categories, care_guides, care_tips)
        const careGuidesBasePath = path.join(__dirname, 'sql', 'care-guides.sql');
        if (fs.existsSync(careGuidesBasePath)) {
            console.log('Running care-guides.sql...');
            try {
                await client.query(fs.readFileSync(careGuidesBasePath, 'utf8'));
                console.log('care-guides.sql applied.');
            } catch (e) {
                console.log('care-guides.sql partially applied:', e.message.split('\n')[0]);
            }
        }

        // Sync students_count for all courses from actual enrollment data
        try {
            await client.query(`
                UPDATE learning.courses SET students_count = (
                    SELECT COUNT(*)::int FROM learning.enrollments WHERE course_id = learning.courses.id
                )`);
            console.log('Synced students_count for all courses.');
        } catch (e) {
            console.log('students_count sync skipped:', e.message.split('\n')[0]);
        }

        // Courses are now created by instructors through the course creation wizard.
        // No seed data insertion — only real instructor-created courses appear.

        // Clean up any leftover seed data (one-time migration)
        try {
            await client.query("DELETE FROM learning.live_classes");
            await client.query("DELETE FROM learning.workshops");
            await client.query("DELETE FROM learning.courses WHERE instructor NOT LIKE '%@%'");
            await client.query("DELETE FROM learning.learning_paths");
            await client.query("DELETE FROM learning.quizzes WHERE course_id NOT IN (SELECT id FROM learning.courses)");
            await client.query("DELETE FROM learning.discussions WHERE user_id IS NULL");
            await client.query("DELETE FROM learning.resources");
            console.log('Seed data cleanup complete.');
        } catch (e) {
            console.log('Seed cleanup skipped:', e.message.split('\n')[0]);
        }

        // Learning paths are now created by admins through the admin dashboard.
        // No seed data insertion — only real learning paths appear.

        // Run community feed tables (saves, reactions, shares, poll votes)
        const communityFeedPath = path.join(__dirname, 'sql', 'community-feed-tables.sql');
        if (fs.existsSync(communityFeedPath)) {
            const communityFeed = fs.readFileSync(communityFeedPath, 'utf8');
            console.log('Running community-feed-tables.sql...');
            try {
                await client.query(communityFeed);
                console.log('Community feed tables applied.');
            } catch (e) {
                console.log('Community feed tables partially applied:', e.message.split('\n')[0]);
            }
        }

        // Seed events if table is empty
        try {
            const eventCount = await client.query('SELECT COUNT(*)::int AS c FROM events.events');
            if (eventCount.rows[0].c === 0) {
                console.log('Seeding events...');
                const events = [
                    {
                        title: 'Advanced Flower Arrangement Workshop',
                        description: 'Master the art of professional flower arrangement with hands-on training from industry experts.',
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
                        description: 'Discover the healing properties of common flowers and learn how to create natural remedies.',
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
                        description: 'The largest flower exhibition in West Africa featuring international exhibitors and competitive displays.',
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
                        description: 'Expert tips for planning and executing stunning wedding flower designs on any budget.',
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
                        description: 'Build your own beautiful succulent terrarium to take home. All materials included.',
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
                        description: 'Capture your floral arrangements beautifully with smartphone or DSLR.',
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

                for (const e of events) {
                    const slug = e.title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
                    await client.query(
                        `INSERT INTO events.events (title, slug, description, location, event_date, end_date, event_type, event_category, image_url, max_participants, price, difficulty, is_featured, status)
                         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, 'upcoming')`,
                        [e.title, slug, e.description, e.location, e.event_date, e.end_date, e.event_type, e.event_category, e.image_url, e.max_participants, e.price, e.difficulty, e.is_featured]
                    );
                }
                console.log('Seeded 6 events.');
            }
        } catch (e) {
            console.log('Events seed skipped:', e.message.split('\n')[0]);
        }

        console.log('Database initialized successfully.');
    } catch (err) {
        console.error('DB init error:', err.message);
    } finally {
        client.release();
        await pool.end();
    }
}

run().catch(err => {
    console.warn('DB init skipped:', err.message);
    process.exit(0);
});
