const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');

const pool = new Pool({
    host: process.env.PG_HOST,
    port: parseInt(process.env.PG_PORT, 10) || 5432,
    database: process.env.PG_DATABASE,
    user: process.env.PG_USER,
    password: process.env.PG_PASSWORD,
    ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
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

        console.log('Database initialized successfully.');
    } catch (err) {
        console.error('DB init error:', err.message);
    } finally {
        client.release();
        await pool.end();
    }
}

run();
