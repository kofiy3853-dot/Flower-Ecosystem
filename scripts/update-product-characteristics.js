require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });
const { Pool } = require('pg');
const pool = new Pool({
    host: process.env.PG_HOST || 'localhost',
    port: parseInt(process.env.PG_PORT || '5432'),
    database: process.env.PG_DATABASE || 'flower_ecosystem',
    user: 'postgres',
    password: process.env.PG_PASSWORD || '',
});
async function update() {
    await pool.query(
        "UPDATE marketplace.products SET size = 'medium', sunlight = 'full-sun', water_frequency = 'every-2-3-days', features = ARRAY['long-lasting'] WHERE name = 'Climbing Rose - Light Pink'"
    );
    console.log('Product updated with characteristics');
    await pool.end();
}
update().catch(e => { console.error(e); process.exit(1); });
