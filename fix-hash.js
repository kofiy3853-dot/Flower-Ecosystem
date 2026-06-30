const {Pool} = require('pg');
const bcrypt = require('bcryptjs');

const pool = new Pool({
    host: 'localhost', port: 5432,
    database: 'flower_ecosystem',
    user: 'postgres', password: ''
});

async function fix() {
    const hash = await bcrypt.hash('password123', 12);
    console.log('Generated hash:', hash);
    await pool.query('UPDATE auth.users SET password_hash = $1 WHERE email = $2', [hash, 'test@example.com']);
    const r = await pool.query('SELECT password_hash FROM auth.users WHERE email = $1', ['test@example.com']);
    const match = await bcrypt.compare('password123', r.rows[0].password_hash);
    console.log('Verify match:', match);
    await pool.end();
}

fix().catch(e => { console.error(e.message); process.exit(1); });
