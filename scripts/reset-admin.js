const bcrypt = require('bcryptjs');
const { Pool } = require('pg');
require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });

// Usage: ADMIN_PASSWORD=<newpassword> node scripts/reset-admin.js
const newPassword = process.env.ADMIN_PASSWORD;
if (!newPassword || newPassword.length < 12) {
    console.error('Set ADMIN_PASSWORD env var (min 12 chars).\nExample: ADMIN_PASSWORD=MyStr0ngP@ss node scripts/reset-admin.js');
    process.exit(1);
}

const pool = new Pool({
    host: process.env.PG_HOST || 'localhost',
    port: parseInt(process.env.PG_PORT || '5432'),
    database: process.env.PG_DATABASE || 'flower_ecosystem',
    user: process.env.PG_USER || 'postgres',
    password: process.env.PG_PASSWORD || '',
});

(async () => {
    const hash = await bcrypt.hash(newPassword, 12);
    const r = await pool.query(
        "UPDATE auth.users SET password_hash=$1 WHERE email='admin@flower.com' RETURNING id",
        [hash]
    );
    if (!r.rows.length) {
        console.error('Admin user not found');
        process.exit(1);
    }
    console.log('Admin password updated successfully for admin@flower.com');
    await pool.end();
})().catch(e => { console.error(e.message); pool.end(); process.exit(1); });
