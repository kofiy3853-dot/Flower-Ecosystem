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

function assertArray(val, msg) {
  assert.ok(Array.isArray(val), msg || 'Expected array');
}

function assertStatus(res, expected, msg) {
  assert.strictEqual(res.status, expected, msg || `Expected status ${expected} got ${res.status}`);
}

(async () => {
  let passed = 0, failed = 0;
  const errors = [];

  const ok = await request('GET', '/api/categories').then(() => true).catch(() => false);
  if (!ok) {
    console.error('✗ Server not running on http://localhost:3000');
    process.exit(1);
  }

  // 1. GET /api/categories returns an array
  try {
    const res = await request('GET', '/api/categories');
    assertStatus(res, 200);
    assertArray(res.body);
    passed++;
  } catch (e) { failed++; errors.push(`GET /api/categories: ${e.message}`); }

  // 2. GET /api/products returns an array
  try {
    const res = await request('GET', '/api/products');
    assertStatus(res, 200);
    assertArray(res.body);
    passed++;
  } catch (e) { failed++; errors.push(`GET /api/products: ${e.message}`); }

  // 3. GET /api/products/:id returns a single product
  try {
    const res = await request('GET', '/api/products/p1');
    assertStatus(res, 200);
    assert.ok(typeof res.body === 'object' && !Array.isArray(res.body), 'Expected a single object');
    passed++;
  } catch (e) { failed++; errors.push(`GET /api/products/:id: ${e.message}`); }

  // 4. GET /api/search?q=rose returns results
  try {
    const res = await request('GET', '/api/search?q=rose');
    assertStatus(res, 200);
    assertArray(res.body);
    passed++;
  } catch (e) { failed++; errors.push(`GET /api/search: ${e.message}`); }

  // 5. POST /api/auth/register with missing fields returns 400
  try {
    const res = await request('POST', '/api/auth/register', { name: 'Test' });
    assertStatus(res, 400);
    passed++;
  } catch (e) { failed++; errors.push(`POST /api/auth/register (missing fields): ${e.message}`); }

  // 6. POST /api/auth/login with wrong credentials returns 401
  try {
    const res = await request('POST', '/api/auth/login', { email: 'nonexistent@test.com', password: 'wrongpass123' });
    assert.strictEqual(res.status, 401, 'Expected 401 for wrong credentials');
    passed++;
  } catch (e) { failed++; errors.push(`POST /api/auth/login (wrong credentials): ${e.message}`); }

  // 7. GET /api/events returns an array
  try {
    const res = await request('GET', '/api/events');
    assertStatus(res, 200);
    assertArray(res.body);
    passed++;
  } catch (e) { failed++; errors.push(`GET /api/events: ${e.message}`); }

  // 8. GET /api/courses returns an array
  try {
    const res = await request('GET', '/api/courses');
    assertStatus(res, 200);
    assertArray(res.body);
    passed++;
  } catch (e) { failed++; errors.push(`GET /api/courses: ${e.message}`); }

  // 9. GET /api/florists returns an array
  try {
    const res = await request('GET', '/api/florists');
    assertStatus(res, 200);
    assertArray(res.body);
    passed++;
  } catch (e) { failed++; errors.push(`GET /api/florists: ${e.message}`); }

  // 10. GET /api/identification returns an array
  try {
    const res = await request('GET', '/api/identification');
    assertStatus(res, 200);
    assertArray(res.body);
    passed++;
  } catch (e) { failed++; errors.push(`GET /api/identification: ${e.message}`); }

  // 11. GET /nonexistent returns 404
  try {
    const res = await request('GET', '/nonexistent');
    assertStatus(res, 404);
    passed++;
  } catch (e) { failed++; errors.push(`GET /nonexistent: ${e.message}`); }

  // 12. GET /api/articles returns an array
  try {
    const res = await request('GET', '/api/articles');
    assertStatus(res, 200);
    assertArray(res.body);
    passed++;
  } catch (e) { failed++; errors.push(`GET /api/articles: ${e.message}`); }

  console.log(`  ${passed} passed, ${failed} failed`);
  if (failed > 0) {
    errors.forEach(e => console.error(`    ✗ ${e}`));
    process.exit(1);
  }
})().catch(err => {
  console.error('✗ API tests:', err.message);
  process.exit(1);
});
