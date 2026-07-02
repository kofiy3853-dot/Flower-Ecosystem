const { Pool } = require('pg');
const bcrypt = require('bcryptjs');
require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });

// Utility script: re-hash a test user's password for debugging auth issues.
// Usage: TEST_EMAIL=test@example.com TEST_PASSWORD=mypassword node fix-hash.js

const pool = new Pool({
    host: process.env.PG_HOST || 'localhost',
    port: parseInt(process.env.PG_PORT || '5432'),
    database: process.env.PG_DATABASE || 'flower_ecosystem',
    user: process.env.PG_USER || 'postgres',
    password: process.env.PG_PASSWORD || '',
});

async function fix() {
    const email = process.env.TEST_EMAIL;
    const password = process.env.TEST_PASSWORD;

    if (!email || !password) {
        console.error('Set TEST_EMAIL and TEST_PASSWORD env vars.\nExample: TEST_EMAIL=test@example.com TEST_PASSWORD=mypassword node fix-hash.js');
        process.exit(1);
    }

    const hash = await bcrypt.hash(password, 12);
    console.log('Generated hash:', hash.substring(0, 20) + '...');
    await pool.query('UPDATE auth.users SET password_hash = $1 WHERE email = $2', [hash, email]);
    const r = await pool.query('SELECT password_hash FROM auth.users WHERE email = $1', [email]);
    if (!r.rows.length) { console.error('User not found:', email); await pool.end(); return; }
    const match = await bcrypt.compare(password, r.rows[0].password_hash);
    console.log('Verify match:', match);
    await pool.end();
}

fix().catch(e => { console.error(e.message); process.exit(1); });
