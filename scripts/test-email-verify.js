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

function apiCall(method, path, body) {
    return new Promise((resolve, reject) => {
        const postData = body ? JSON.stringify(body) : null;
        const headers = { 'Content-Type': 'application/json', 'X-Requested-With': 'XMLHttpRequest' };
        if (postData) headers['Content-Length'] = Buffer.byteLength(postData);
        const options = { hostname: 'localhost', port: 3000, path, method, headers };
        const req = http.request(options, res => {
            let data = '';
            res.on('data', chunk => data += chunk);
            res.on('end', () => {
                let parsed;
                try { parsed = JSON.parse(data); } catch { parsed = data; }
                resolve({ status: res.statusCode, body: parsed });
            });
        });
        req.on('error', reject);
        if (postData) req.write(postData);
        req.end();
    });
}

async function test() {
    console.log('=== Email Verification Flow Test ===\n');

    // Step 1: Register a new user
    const email = `verify-test-${Date.now()}@example.com`;
    console.log('1. Registering user:', email);
    const reg = await apiCall('POST', '/api/auth/register', {
        name: 'Verify Tester', email, password: 'testpass123', role: 'customer'
    });
    console.log('   Status:', reg.status);
    console.log('   User ID:', reg.body.user?.id);
    if (reg.status !== 201) { console.log('   FAILED: Registration'); return; }

    // Step 2: Check email_verified is false initially
    console.log('\n2. Checking initial email_verified status...');
    const userCheck = await pool.query('SELECT email_verified FROM auth.users WHERE id = $1', [reg.body.user.id]);
    console.log('   email_verified:', userCheck.rows[0]?.email_verified);
    if (userCheck.rows[0]?.email_verified !== false) {
        console.log('   WARNING: email_verified should be false initially');
    }

    // Step 3: Get the verification token from database
    console.log('\n3. Getting verification token from database...');
    const tokenCheck = await pool.query('SELECT token FROM auth.email_verifications WHERE user_id = $1', [reg.body.user.id]);
    if (!tokenCheck.rows.length) {
        console.log('   FAILED: No verification token found');
        return;
    }
    const verifyToken = tokenCheck.rows[0].token;
    console.log('   Token found:', verifyToken.substring(0, 16) + '...');

    // Step 4: Try to verify with invalid token
    console.log('\n4. Testing with invalid token...');
    const invalidRes = await apiCall('POST', '/api/auth/verify-email', { token: 'invalid-token-123' });
    console.log('   Status:', invalidRes.status, '(expected 400)');
    console.log('   Error:', invalidRes.body.error);

    // Step 5: Verify with valid token
    console.log('\n5. Verifying with valid token...');
    const verifyRes = await apiCall('POST', '/api/auth/verify-email', { token: verifyToken });
    console.log('   Status:', verifyRes.status, '(expected 200)');
    console.log('   Message:', verifyRes.body.message);

    // Step 6: Check email_verified is now true
    console.log('\n6. Checking email_verified after verification...');
    const userCheck2 = await pool.query('SELECT email_verified FROM auth.users WHERE id = $1', [reg.body.user.id]);
    console.log('   email_verified:', userCheck2.rows[0]?.email_verified);

    // Step 7: Check token is deleted
    console.log('\n7. Checking token is deleted...');
    const tokenCheck2 = await pool.query('SELECT COUNT(*) as count FROM auth.email_verifications WHERE user_id = $1', [reg.body.user.id]);
    console.log('   Tokens remaining:', tokenCheck2.rows[0]?.count);

    // Step 8: Try to verify again (token should be gone)
    console.log('\n8. Testing reuse of same token...');
    const reuseRes = await apiCall('POST', '/api/auth/verify-email', { token: verifyToken });
    console.log('   Status:', reuseRes.status, '(expected 400)');
    console.log('   Error:', reuseRes.body.error);

    console.log('\n=== Test Complete ===');
    await pool.end();
}

test().catch(e => { console.error(e); process.exit(1); });
