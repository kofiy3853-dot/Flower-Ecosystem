require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });
const { Pool } = require('pg');
const pool = new Pool({
    host: process.env.PG_HOST || 'localhost',
    port: parseInt(process.env.PG_PORT || '5432'),
    database: process.env.PG_DATABASE || 'flower_ecosystem',
    user: 'postgres',
    password: process.env.PG_PASSWORD || '',
});
async function test() {
    // Check if table exists
    const r = await pool.query("SELECT EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'auth' AND table_name = 'email_verifications')");
    console.log('Table exists:', r.rows[0].exists);

    // Check if column exists
    const r2 = await pool.query("SELECT EXISTS (SELECT FROM information_schema.columns WHERE table_schema = 'auth' AND table_name = 'users' AND column_name = 'email_verified')");
    console.log('Column exists:', r2.rows[0].exists);

    // Check for any verification tokens
    const r3 = await pool.query('SELECT COUNT(*) FROM auth.email_verifications');
    console.log('Verification tokens:', r3.rows[0].count);

    await pool.end();
}
test().catch(e => { console.error(e); process.exit(1); });
