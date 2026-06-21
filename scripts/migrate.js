const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');

require('dotenv').config();

const pool = new Pool({
    host: process.env.PG_HOST || 'localhost',
    port: process.env.PG_PORT || 5432,
    database: process.env.PG_DATABASE || 'flower_ecosystem',
    user: process.env.PG_USER || 'postgres',
    password: process.env.PG_PASSWORD || '',
});

const MIGRATIONS_DIR = path.join(__dirname, '..', 'migrations');

async function ensureMigrationTable() {
    await pool.query(`
        CREATE TABLE IF NOT EXISTS schema_migrations (
            id SERIAL PRIMARY KEY,
            filename VARCHAR(255) NOT NULL UNIQUE,
            applied_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
        )
    `);
}

async function getAppliedMigrations() {
    const result = await pool.query('SELECT filename FROM schema_migrations ORDER BY id');
    return new Set(result.rows.map(r => r.filename));
}

async function applyMigration(filename, sql) {
    const client = await pool.connect();
    try {
        await client.query('BEGIN');
        await client.query(sql);
        await client.query('INSERT INTO schema_migrations (filename) VALUES ($1)', [filename]);
        await client.query('COMMIT');
        console.log(`✓ Applied: ${filename}`);
    } catch (err) {
        await client.query('ROLLBACK');
        console.error(`✗ Failed: ${filename}`);
        throw err;
    } finally {
        client.release();
    }
}

async function runMigrations() {
    console.log('Running database migrations...\n');
    
    await ensureMigrationTable();
    const applied = await getAppliedMigrations();
    
    const files = fs.readdirSync(MIGRATIONS_DIR)
        .filter(f => f.endsWith('.sql'))
        .sort();
    
    let appliedCount = 0;
    for (const file of files) {
        if (applied.has(file)) {
            console.log(`⊘ Skipped (already applied): ${file}`);
            continue;
        }
        
        const sql = fs.readFileSync(path.join(MIGRATIONS_DIR, file), 'utf-8');
        await applyMigration(file, sql);
        appliedCount++;
    }
    
    console.log(`\n${appliedCount} migration(s) applied.`);
    await pool.end();
}

runMigrations().catch(err => {
    console.error('Migration failed:', err);
    process.exit(1);
});