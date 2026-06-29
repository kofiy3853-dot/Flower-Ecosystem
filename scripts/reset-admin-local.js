require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });
const { Pool } = require('pg');
const pool = new Pool({
    host: process.env.PG_HOST || 'localhost',
    port: parseInt(process.env.PG_PORT || '5432'),
    database: process.env.PG_DATABASE || 'flower_ecosystem',
    user: 'postgres',
    password: process.env.PG_PASSWORD || '',
});
const http = require('http');

async function reset() {
    // Get latest token
    const r = await pool.query("SELECT token FROM auth.password_resets WHERE email = 'admin@flower.com' AND used = FALSE ORDER BY created_at DESC LIMIT 1");
    if (!r.rows.length) { console.log('No token found'); await pool.end(); return; }
    const token = r.rows[0].token;

    // Reset password
    const postData = JSON.stringify({ token, password: 'admin12345' });
    const options = { hostname: 'localhost', port: 3000, path: '/api/auth/reset-password', method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-Requested-With': 'XMLHttpRequest', 'Content-Length': Buffer.byteLength(postData) } };
    const res = await new Promise((resolve, reject) => {
        const req = http.request(options, res => {
            let data = ''; res.on('data', c => data += c);
            res.on('end', () => resolve({ status: res.statusCode, body: JSON.parse(data) }));
        });
        req.on('error', reject); req.write(postData); req.end();
    });
    console.log('Reset:', res.status, res.body.message);
    await pool.end();
}
reset().catch(e => { console.error(e); process.exit(1); });
