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
    // Get the latest reset token
    const r = await pool.query('SELECT token, email, expires_at, used FROM auth.password_resets ORDER BY created_at DESC LIMIT 1');
    if (!r.rows.length) {
        console.log('No reset tokens found');
        await pool.end();
        return;
    }
    const token = r.rows[0];
    console.log('Latest reset token:', JSON.stringify(token, null, 2));

    // Test reset-password endpoint with this token
    const http = require('http');
    const postData = JSON.stringify({ token: token.token, password: 'newpassword123' });
    const options = {
        hostname: 'localhost', port: 3000,
        path: '/api/auth/reset-password', method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-Requested-With': 'XMLHttpRequest', 'Content-Length': Buffer.byteLength(postData) }
    };
    const res = await new Promise((resolve, reject) => {
        const req = http.request(options, res => {
            let data = '';
            res.on('data', chunk => data += chunk);
            res.on('end', () => resolve({ status: res.statusCode, body: JSON.parse(data) }));
        });
        req.on('error', reject);
        req.write(postData);
        req.end();
    });
    console.log('Reset response:', JSON.stringify(res, null, 2));

    // Verify the token is now used
    const r2 = await pool.query('SELECT used FROM auth.password_resets WHERE token = $1', [token.token]);
    console.log('Token used after reset:', r2.rows[0]?.used);

    await pool.end();
}
test().catch(e => { console.error(e); process.exit(1); });
