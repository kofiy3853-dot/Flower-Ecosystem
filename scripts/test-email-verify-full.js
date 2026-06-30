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
    console.log('   Status:', reg.status, reg.status === 201 ? 'OK' : 'FAIL');
    console.log('   User ID:', reg.body.user?.id);
    console.log('   Verification token:', reg.body.verificationToken ? reg.body.verificationToken.substring(0, 16) + '...' : 'MISSING');
    if (reg.status !== 201 || !reg.body.verificationToken) return;

    const verifyToken = reg.body.verificationToken;

    // Step 2: Check email_verified is false initially
    console.log('\n2. Checking initial email_verified status...');
    const userCheck = await pool.query('SELECT email_verified FROM auth.users WHERE id = $1', [reg.body.user.id]);
    console.log('   email_verified:', userCheck.rows[0]?.email_verified, userCheck.rows[0]?.email_verified === false ? 'OK' : 'FAIL');

    // Step 3: Verify token exists in database
    console.log('\n3. Checking token in database...');
    const tokenRow = await pool.query('SELECT token, expires_at FROM auth.email_verifications WHERE user_id = $1', [reg.body.user.id]);
    console.log('   Tokens found:', tokenRow.rows.length, tokenRow.rows.length === 1 ? 'OK' : 'FAIL');
    console.log('   Expires:', tokenRow.rows[0]?.expires_at);

    // Step 4: Try verify with invalid token
    console.log('\n4. Testing with invalid token...');
    const invalidRes = await apiCall('POST', '/api/auth/verify-email', { token: 'invalid-token-123' });
    console.log('   Status:', invalidRes.status, invalidRes.status === 400 ? 'OK (expected 400)' : 'UNEXPECTED');
    console.log('   Error:', invalidRes.body.error);

    // Step 5: Try verify with no token
    console.log('\n5. Testing with no token...');
    const noTokenRes = await apiCall('POST', '/api/auth/verify-email', {});
    console.log('   Status:', noTokenRes.status, noTokenRes.status === 400 ? 'OK (expected 400)' : 'UNEXPECTED');

    // Step 6: Verify with valid token
    console.log('\n6. Verifying with valid token...');
    const verifyRes = await apiCall('POST', '/api/auth/verify-email', { token: verifyToken });
    console.log('   Status:', verifyRes.status, verifyRes.status === 200 ? 'OK' : 'FAIL');
    console.log('   Message:', verifyRes.body.message);

    // Step 7: Check email_verified is now true
    console.log('\n7. Checking email_verified after verification...');
    const userCheck2 = await pool.query('SELECT email_verified FROM auth.users WHERE id = $1', [reg.body.user.id]);
    console.log('   email_verified:', userCheck2.rows[0]?.email_verified, userCheck2.rows[0]?.email_verified === true ? 'OK' : 'FAIL');

    // Step 8: Check token is deleted from database
    console.log('\n8. Checking token is deleted...');
    const tokenCheck2 = await pool.query('SELECT COUNT(*) as count FROM auth.email_verifications WHERE user_id = $1', [reg.body.user.id]);
    console.log('   Tokens remaining:', tokenCheck2.rows[0]?.count, tokenCheck2.rows[0]?.count === 0 ? 'OK' : 'FAIL');

    // Step 9: Try to reuse the same token (should fail)
    console.log('\n9. Trying to reuse same token...');
    const reuseRes = await apiCall('POST', '/api/auth/verify-email', { token: verifyToken });
    console.log('   Status:', reuseRes.status, reuseRes.status === 400 ? 'OK (expected 400)' : 'UNEXPECTED');
    console.log('   Error:', reuseRes.body.error);

    // Step 10: Register another user and test expired token (simulated)
    console.log('\n10. Testing token expiry (inserting expired token)...');
    const email2 = `verify-expired-${Date.now()}@example.com`;
    const reg2 = await apiCall('POST', '/api/auth/register', {
        name: 'Expired Tester', email: email2, password: 'testpass123', role: 'customer'
    });
    // Manually set the token to expired
    await pool.query(
        "UPDATE auth.email_verifications SET expires_at = CURRENT_TIMESTAMP - INTERVAL '1 hour' WHERE user_id = $1",
        [reg2.body.user.id]
    );
    const expiredRes = await apiCall('POST', '/api/auth/verify-email', { token: reg2.body.verificationToken });
    console.log('   Status:', expiredRes.status, expiredRes.status === 400 ? 'OK (expected 400 - expired)' : 'UNEXPECTED');
    console.log('   Error:', expiredRes.body.error);

    // Step 11: Verify user can still login (email_verified doesn't block login)
    console.log('\n11. Testing login still works...');
    const loginRes = await apiCall('POST', '/api/auth/login', { email, password: 'testpass123' });
    console.log('   Status:', loginRes.status, loginRes.status === 200 ? 'OK' : 'FAIL');

    console.log('\n=== Test Complete ===');
    await pool.end();
}

test().catch(e => { console.error(e); process.exit(1); });
