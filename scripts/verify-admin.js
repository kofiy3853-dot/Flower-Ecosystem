const bcrypt = require('bcryptjs');
const { Pool } = require('pg');
require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });

// Usage: ADMIN_PASSWORD=<password> node scripts/verify-admin.js
// Verifies the stored hash matches the supplied password.
const passwordToCheck = process.env.ADMIN_PASSWORD;
if (!passwordToCheck) {
    console.error('Set ADMIN_PASSWORD env var to verify.\nExample: ADMIN_PASSWORD=MyStr0ngP@ss node scripts/verify-admin.js');
    process.exit(1);
}

const pool = new Pool({
    host: process.env.PG_HOST || 'localhost',
    port: parseInt(process.env.PG_PORT || '5432'),
    database: process.env.PG_DATABASE || 'flower_ecosystem',
    user: process.env.PG_USER || 'postgres',
    password: process.env.PG_PASSWORD || '',
});

pool.query("SELECT password_hash FROM auth.users WHERE email='admin@flower.com'")
    .then(r => {
        if (!r.rows.length) { console.error('Admin user not found'); return pool.end(); }
        const hash = r.rows[0].password_hash;
        const matches = bcrypt.compareSync(passwordToCheck, hash);
        console.log(`Hash found: ${hash.substring(0, 20)}...`);
        console.log(`Password matches: ${matches}`);
        pool.end();
    })
    .catch(e => { console.error(e.message); pool.end(); });
