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
        const schemaPath = path.join(__dirname, 'sql', 'schema.sql');
        if (fs.existsSync(schemaPath)) {
            const schema = fs.readFileSync(schemaPath, 'utf8');
            console.log('Running schema.sql...');
            await client.query(schema);
            console.log('Schema applied.');
        }

        const migrationPath = path.join(__dirname, 'migrations', '001_add_grower_role.sql');
        if (fs.existsSync(migrationPath)) {
            const migration = fs.readFileSync(migrationPath, 'utf8');
            console.log('Running migration 001...');
            await client.query(migration);
            console.log('Migration 001 applied.');
        }

        const migration2Path = path.join(__dirname, 'migrations', '002_add_missing_columns.sql');
        if (fs.existsSync(migration2Path)) {
            const migration2 = fs.readFileSync(migration2Path, 'utf8');
            console.log('Running migration 002...');
            await client.query(migration2);
            console.log('Migration 002 applied.');
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
