const http = require('http');
const assert = require('assert');

const BASE = 'localhost:3000';

function request(method, path, body, token) {
  return new Promise((resolve, reject) => {
    const headers = { 'Content-Type': 'application/json', 'X-Requested-With': 'XMLHttpRequest' };
    if (token) headers['Authorization'] = 'Bearer ' + token;
    const options = { hostname: 'localhost', port: 3000, path, method, headers, timeout: 10000 };
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
    req.on('timeout', () => { req.destroy(); reject(new Error('Timeout')); });
    if (body) req.write(JSON.stringify(body));
    req.end();
  });
}

let passed = 0, failed = 0;
const errors = [];

async function test(name, fn) {
  try {
    await fn();
    passed++;
    console.log(`  ✓ ${name}`);
  } catch (e) {
    failed++;
    errors.push(`${name}: ${e.message}`);
    console.log(`  ✗ ${name}: ${e.message}`);
  }
}

async function run() {
  console.log('\n=== Orders Tests ===\n');

  let token, userId, productId;

  // Setup: register and login
  await test('Setup: register test user', async () => {
    const reg = await request('POST', '/api/auth/register', {
      name: 'Order Tester', email: `order-test-${Date.now()}@test.com`, password: 'testpass123', role: 'customer'
    });
    assert.strictEqual(reg.status, 201);
    token = reg.body.token;
    userId = reg.body.user.id;
  });

  // Get a product to use
  await test('Setup: get test product', async () => {
    const r = await request('GET', '/api/products?limit=1');
    assert.strictEqual(r.status, 200);
    const products = r.body.products || r.body;
    assert(products.length > 0, 'Need at least one product');
    productId = products[0].id;
  });

  // Add item to cart
  await test('Setup: add item to cart', async () => {
    const r = await request('POST', '/api/cart/items', { product_id: productId, quantity: 2 }, token);
    assert(r.status === 201 || r.status === 200, `Expected 200/201, got ${r.status}: ${JSON.stringify(r.body)}`);
  });

  // Test: create order
  await test('Create order from cart', async () => {
    const r = await request('POST', '/api/orders', {}, token);
    assert.strictEqual(r.status, 201);
    assert(r.body.id, 'Order should have an ID');
  });

  // Test: list orders
  await test('List user orders', async () => {
    const r = await request('GET', '/api/orders', null, token);
    assert.strictEqual(r.status, 200);
    assert(Array.isArray(r.body), 'Should return array of orders');
    assert(r.body.length > 0, 'Should have at least one order');
  });

  // Test: order requires auth
  await test('Order creation requires authentication', async () => {
    const r = await request('POST', '/api/orders', {});
    assert.strictEqual(r.status, 401);
  });

  // Test: order with empty cart fails
  await test('Order with empty cart fails', async () => {
    // Cart was emptied by previous order creation
    const r = await request('POST', '/api/orders', {}, token);
    assert.strictEqual(r.status, 400);
    assert(r.body.error.includes('empty') || r.body.error.includes('Cart'), 'Error should mention empty cart');
  });

  // Test: order list returns empty array on error (existing behavior)
  await test('Order list returns empty array when no orders', async () => {
    const reg2 = await request('POST', '/api/auth/register', {
      name: 'Empty Tester', email: `empty-test-${Date.now()}@test.com`, password: 'testpass123', role: 'customer'
    });
    const token2 = reg2.body.token;
    const r = await request('GET', '/api/orders', null, token2);
    assert.strictEqual(r.status, 200);
    assert(Array.isArray(r.body), 'Should return array');
  });

  console.log(`\n=== Results: ${passed} passed, ${failed} failed ===\n`);
  if (errors.length) console.log('Failures:\n' + errors.map(e => '  - ' + e).join('\n'));
  process.exit(failed > 0 ? 1 : 0);
}

run().catch(e => { console.error('Test runner error:', e); process.exit(1); });
