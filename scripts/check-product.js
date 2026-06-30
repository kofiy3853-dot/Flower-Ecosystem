require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });
const { Pool } = require('pg');
const pool = new Pool({
    host: process.env.PG_HOST || 'localhost',
    port: parseInt(process.env.PG_PORT || '5432'),
    database: process.env.PG_DATABASE || 'flower_ecosystem',
    user: 'postgres',
    password: process.env.PG_PASSWORD || '',
});
async function check() {
    const r = await pool.query("SELECT size, sunlight, water_frequency, features, fragrance, care_level, bloom_season, origin FROM marketplace.products WHERE name = 'Climbing Rose - Light Pink'");
    console.log(JSON.stringify(r.rows[0], null, 2));
    await pool.end();
}
check().catch(e => { console.error(e); process.exit(1); });
