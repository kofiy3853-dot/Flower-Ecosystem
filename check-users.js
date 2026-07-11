require('dotenv').config();
const { Pool } = require('pg');
const pool = new Pool({
    host: process.env.PG_HOST || 'localhost',
    port: parseInt(process.env.PG_PORT, 10) || 5432,
    database: process.env.PG_DATABASE || 'flower_ecosystem',
    user: process.env.PG_USER || 'postgres',
    password: process.env.PG_PASSWORD || ''
});

async function check() {
    // Check all users and their roles
    const users = await pool.query('SELECT id, email, role, is_active, email_verified FROM auth.users ORDER BY created_at');
    console.log('=== USERS ===');
    for (const u of users.rows) {
        console.log(`  ${u.email} | role: ${u.role} | active: ${u.is_active} | verified: ${u.email_verified}`);
    }

    // Check locked accounts
    const locked = await pool.query('SELECT email, failed_attempts, locked_until FROM auth.login_attempts WHERE locked_until > NOW()');
    console.log('\n=== LOCKED ACCOUNTS ===');
    if (locked.rows.length) {
        for (const l of locked.rows) {
            console.log(`  ${l.email} | attempts: ${l.failed_attempts} | locked until: ${l.locked_until}`);
        }
    } else {
        console.log('  None');
    }

    // Check all login attempts
    const attempts = await pool.query('SELECT email, failed_attempts, locked_until FROM auth.login_attempts');
    console.log('\n=== LOGIN ATTEMPTS ===');
    if (attempts.rows.length) {
        for (const a of attempts.rows) {
            console.log(`  ${a.email} | attempts: ${a.failed_attempts} | locked: ${a.locked_until || 'no'}`);
        }
    } else {
        console.log('  None');
    }

    await pool.end();
}
check().catch(e => { console.error(e.message); pool.end(); });
