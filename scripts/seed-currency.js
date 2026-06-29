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
    const r = await pool.query("UPDATE marketplace.products SET currency = 'GHS' WHERE currency IS NULL RETURNING id, name");
    console.log(`Updated ${r.rowCount} products with GHS currency`);
    await pool.end();
}
run().catch(e => { console.error(e); process.exit(1); });
