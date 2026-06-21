const http = require('http');
const assert = require('assert');

function request(method, path, body) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'localhost',
      port: 3000,
      path,
      method,
      headers: { 'Content-Type': 'application/json' },
      timeout: 5000,
    };
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
    req.on('timeout', () => { req.destroy(); reject(new Error('Request timeout')); });
    if (body) req.write(JSON.stringify(body));
    req.end();
  });
}

const TEST_EMAIL = `testuser_${Date.now()}@example.com`;
const TEST_PASS = 'TestPass123!';

(async () => {
  let passed = 0, failed = 0;
  const errors = [];

  function test(name, fn) {
    return fn().then(() => { passed++; }).catch(e => { failed++; errors.push(`${name}: ${e.message}`); });
  }

  // 1. Register - missing fields
  await test('register: missing fields → 400', async () => {
    const res = await request('POST', '/api/auth/register', { name: 'Only Name' });
    assert.strictEqual(res.status, 400);
    assert.ok(res.body.error);
  });

  // 2. Register - short password
  await test('register: short password → 400', async () => {
    const res = await request('POST', '/api/auth/register', { name: 'Test', email: TEST_EMAIL, password: '123' });
    assert.strictEqual(res.status, 400);
    assert.ok(res.body.error.includes('8 characters'));
  });

  // 3. Register - missing name
  await test('register: missing name → 400', async () => {
    const res = await request('POST', '/api/auth/register', { email: TEST_EMAIL, password: TEST_PASS });
    assert.strictEqual(res.status, 400);
  });

  // 4. Register - success (mock mode returns 201 + token)
  let registerResult;
  await test('register: success → 201 + token + user', async () => {
    registerResult = await request('POST', '/api/auth/register', {
      name: 'Test User', email: TEST_EMAIL, password: TEST_PASS, role: 'buyer'
    });
    assert.strictEqual(registerResult.status, 201);
    assert.ok(registerResult.body.token, 'Expected token in response');
    assert.ok(registerResult.body.user, 'Expected user in response');
    assert.strictEqual(registerResult.body.user.email, TEST_EMAIL);
  });

  // 5. Register - duplicate email → 409 (or 201 in mock mode)
  await test('register: duplicate email', async () => {
    const res = await request('POST', '/api/auth/register', {
      name: 'Test User', email: TEST_EMAIL, password: TEST_PASS, role: 'buyer'
    });
    // In mock mode, duplicates are allowed; in DB mode, expect 409
    assert.ok([201, 409].includes(res.status), `Expected 201 or 409, got ${res.status}`);
  });

  // 6. Login - missing fields
  await test('login: missing fields → 400', async () => {
    const res = await request('POST', '/api/auth/login', { email: TEST_EMAIL });
    assert.strictEqual(res.status, 400);
  });

  // 7. Login - success (mock mode always succeeds)
  await test('login: success → 200 + token + user', async () => {
    const res = await request('POST', '/api/auth/login', { email: TEST_EMAIL, password: TEST_PASS });
    assert.strictEqual(res.status, 200);
    assert.ok(res.body.token, 'Expected token');
    assert.ok(res.body.user, 'Expected user');
  });

  // 8. Token is valid JWT structure
  await test('token: valid JWT structure', async () => {
    const parts = registerResult.body.token.split('.');
    assert.strictEqual(parts.length, 3, 'JWT should have 3 parts');
    const payload = JSON.parse(Buffer.from(parts[1], 'base64').toString());
    assert.ok(payload.email || payload.id, 'JWT payload should have email or id');
  });

  // 9. Register with different roles
  for (const role of ['buyer', 'seller', 'grower', 'instructor']) {
    await test(`register: role "${role}" → 201`, async () => {
      const res = await request('POST', '/api/auth/register', {
        name: `${role} User`, email: `${role}_${Date.now()}@test.com`, password: TEST_PASS, role
      });
      assert.strictEqual(res.status, 201);
    });
  }

  // 10. Login with empty password
  await test('login: empty password → 400', async () => {
    const res = await request('POST', '/api/auth/login', { email: TEST_EMAIL, password: '' });
    assert.strictEqual(res.status, 400);
  });

  console.log(`\nAuth Tests: ${passed} passed, ${failed} failed`);
  if (failed > 0) {
    errors.forEach(e => console.error(`  ✗ ${e}`));
    process.exit(1);
  }
})().catch(err => {
  console.error('✗ Auth tests crashed:', err.message);
  process.exit(1);
});
