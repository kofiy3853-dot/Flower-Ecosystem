require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });
const { Pool } = require('pg');
const pool = new Pool({
    host: process.env.PG_HOST || 'localhost',
    port: parseInt(process.env.PG_PORT || '5432'),
    database: process.env.PG_DATABASE || 'flower_ecosystem',
    user: 'postgres',
    password: process.env.PG_PASSWORD || '',
});
async function run() {
    await pool.query("ALTER TABLE marketplace.products ADD COLUMN IF NOT EXISTS currency VARCHAR(10) DEFAULT 'GHS'");
    console.log('Added currency column to marketplace.products');
    await pool.end();
}
run().catch(e => { console.error(e); process.exit(1); });
