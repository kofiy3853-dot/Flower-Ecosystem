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

function apiCall(method, path, body, token) {
    return new Promise((resolve, reject) => {
        const postData = body ? JSON.stringify(body) : null;
        const headers = { 'Content-Type': 'application/json', 'X-Requested-With': 'XMLHttpRequest' };
        if (token) headers['Authorization'] = 'Bearer ' + token;
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
    console.log('=== Password Reset Flow Test ===\n');

    // Step 1: Register a test user
    const email = `reset-test-${Date.now()}@example.com`;
    console.log('1. Registering user:', email);
    const reg = await apiCall('POST', '/api/auth/register', {
        name: 'Reset Tester', email, password: 'oldpassword123', role: 'customer'
    });
    console.log('   Status:', reg.status, reg.status === 201 ? 'OK' : 'FAIL');
    if (reg.status !== 201) return;

    // Step 2: Verify login with old password
    console.log('\n2. Login with old password...');
    const login1 = await apiCall('POST', '/api/auth/login', { email, password: 'oldpassword123' });
    console.log('   Status:', login1.status, login1.status === 200 ? 'OK' : 'FAIL');

    // Step 3: Request password reset
    console.log('\n3. Requesting password reset...');
    const forgot = await apiCall('POST', '/api/auth/forgot-password', { email });
    console.log('   Status:', forgot.status, forgot.status === 200 ? 'OK' : 'FAIL');
    console.log('   Message:', forgot.body.message);

    // Step 4: Get the reset token from database
    console.log('\n4. Getting reset token from database...');
    const tokenRow = await pool.query(
        'SELECT token FROM auth.password_resets WHERE email = $1 AND used = FALSE ORDER BY created_at DESC LIMIT 1',
        [email]
    );
    if (!tokenRow.rows.length) {
        console.log('   FAIL: No reset token found');
        return;
    }
    const resetToken = tokenRow.rows[0].token;
    console.log('   Token:', resetToken.substring(0, 16) + '...');

    // Step 5: Try reset with invalid token
    console.log('\n5. Testing with invalid token...');
    const invalidReset = await apiCall('POST', '/api/auth/reset-password', { token: 'bad-token', password: 'newpassword123' });
    console.log('   Status:', invalidReset.status, invalidReset.status === 400 ? 'OK (expected 400)' : 'UNEXPECTED');

    // Step 6: Try reset with short password
    console.log('\n6. Testing with short password...');
    const shortPw = await apiCall('POST', '/api/auth/reset-password', { token: resetToken, password: '123' });
    console.log('   Status:', shortPw.status, shortPw.status === 400 ? 'OK (expected 400)' : 'UNEXPECTED');
    console.log('   Error:', shortPw.body.error);

    // Step 7: Reset with valid token and new password
    console.log('\n7. Resetting password with valid token...');
    const reset = await apiCall('POST', '/api/auth/reset-password', { token: resetToken, password: 'newpassword123' });
    console.log('   Status:', reset.status, reset.status === 200 ? 'OK' : 'FAIL');
    console.log('   Message:', reset.body.message);

    // Step 8: Verify token is marked as used
    console.log('\n8. Checking token is used...');
    const tokenCheck = await pool.query('SELECT used FROM auth.password_resets WHERE token = $1', [resetToken]);
    console.log('   Token used:', tokenCheck.rows[0]?.used, tokenCheck.rows[0]?.used === true ? 'OK' : 'FAIL');

    // Step 9: Try login with old password (should fail)
    console.log('\n9. Login with old password (should fail)...');
    const login2 = await apiCall('POST', '/api/auth/login', { email, password: 'oldpassword123' });
    console.log('   Status:', login2.status, login2.status === 401 ? 'OK (expected 401)' : 'UNEXPECTED');

    // Step 10: Login with new password (should succeed)
    console.log('\n10. Login with new password...');
    const login3 = await apiCall('POST', '/api/auth/login', { email, password: 'newpassword123' });
    console.log('   Status:', login3.status, login3.status === 200 ? 'OK' : 'FAIL');

    // Step 11: Try to reuse the reset token (should fail)
    console.log('\n11. Trying to reuse reset token...');
    const reuse = await apiCall('POST', '/api/auth/reset-password', { token: resetToken, password: 'anotherpassword123' });
    console.log('   Status:', reuse.status, reuse.status === 400 ? 'OK (expected 400)' : 'UNEXPECTED');

    console.log('\n=== Test Complete ===');
    await pool.end();
}

test().catch(e => { console.error(e); process.exit(1); });
