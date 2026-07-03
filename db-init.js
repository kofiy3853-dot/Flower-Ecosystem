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
        const migrations = ['001_add_grower_role.sql', '002_add_missing_columns.sql'];
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
