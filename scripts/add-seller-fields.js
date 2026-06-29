const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });
const { Pool } = require('pg');
const pool = new Pool({
    host: process.env.PG_HOST || 'localhost',
    port: parseInt(process.env.PG_PORT || '5432'),
    database: process.env.PG_DATABASE || 'flower_ecosystem',
    user: 'postgres',
    password: process.env.PG_PASSWORD || '',
});
async function run() {
    const cols = [
        'ALTER TABLE auth.users ADD COLUMN IF NOT EXISTS phone VARCHAR(30)',
        'ALTER TABLE auth.users ADD COLUMN IF NOT EXISTS city VARCHAR(100)',
        'ALTER TABLE auth.users ADD COLUMN IF NOT EXISTS state VARCHAR(100)',
        'ALTER TABLE auth.users ADD COLUMN IF NOT EXISTS country VARCHAR(100)',
        'ALTER TABLE auth.users ADD COLUMN IF NOT EXISTS zip_code VARCHAR(20)',
        'ALTER TABLE auth.users ADD COLUMN IF NOT EXISTS cover_image TEXT',
        'ALTER TABLE auth.users ADD COLUMN IF NOT EXISTS business_name VARCHAR(255)',
        'ALTER TABLE auth.users ADD COLUMN IF NOT EXISTS business_type VARCHAR(100)',
        'ALTER TABLE auth.users ADD COLUMN IF NOT EXISTS business_phone VARCHAR(30)',
        'ALTER TABLE auth.users ADD COLUMN IF NOT EXISTS business_email VARCHAR(255)',
        'ALTER TABLE auth.users ADD COLUMN IF NOT EXISTS website VARCHAR(500)',
        'ALTER TABLE auth.users ADD COLUMN IF NOT EXISTS social_instagram VARCHAR(500)',
        'ALTER TABLE auth.users ADD COLUMN IF NOT EXISTS social_facebook VARCHAR(500)',
        'ALTER TABLE auth.users ADD COLUMN IF NOT EXISTS social_twitter VARCHAR(500)',
        'ALTER TABLE auth.users ADD COLUMN IF NOT EXISTS is_verified BOOLEAN DEFAULT FALSE',
    ];
    for (const sql of cols) {
        await pool.query(sql);
    }
    console.log('Added all seller profile columns to auth.users');
    await pool.end();
}
run().catch(e => { console.error(e); process.exit(1); });
