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
    const cols = [
        "ALTER TABLE marketplace.products ADD COLUMN IF NOT EXISTS size VARCHAR(50)",
        "ALTER TABLE marketplace.products ADD COLUMN IF NOT EXISTS fragrance VARCHAR(50)",
        "ALTER TABLE marketplace.products ADD COLUMN IF NOT EXISTS care_level VARCHAR(50)",
        "ALTER TABLE marketplace.products ADD COLUMN IF NOT EXISTS sunlight VARCHAR(50)",
        "ALTER TABLE marketplace.products ADD COLUMN IF NOT EXISTS water_frequency VARCHAR(50)",
        "ALTER TABLE marketplace.products ADD COLUMN IF NOT EXISTS bloom_season VARCHAR(50)",
        "ALTER TABLE marketplace.products ADD COLUMN IF NOT EXISTS features TEXT[] DEFAULT '{}'",
        "ALTER TABLE marketplace.products ADD COLUMN IF NOT EXISTS origin VARCHAR(255)",
    ];
    for (const sql of cols) {
        await pool.query(sql);
    }
    console.log('Added all product characteristic columns');
    await pool.end();
}
run().catch(e => { console.error(e); process.exit(1); });
