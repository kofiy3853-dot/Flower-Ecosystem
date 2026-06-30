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
    const r = await pool.query("SELECT column_name FROM information_schema.columns WHERE table_name = 'products' AND table_schema = 'marketplace' ORDER BY ordinal_position");
    console.log('Product columns:');
    r.rows.forEach(c => console.log(' -', c.column_name));
    await pool.end();
}
check().catch(e => { console.error(e); process.exit(1); });
