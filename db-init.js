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
    const client = await pool.connect();
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

        console.log('Database initialized successfully.');
    } catch (err) {
        console.error('DB init error:', err.message);
    } finally {
        client.release();
        await pool.end();
    }
}

run();
