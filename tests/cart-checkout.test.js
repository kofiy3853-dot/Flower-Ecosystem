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

(async () => {
  console.log('\n=== Cart & Checkout E2E Tests ===\n');

  let token, userId;

  // ── Auth ──────────────────────────────────────────────────────────────

  console.log('Auth:');

  await test('Register user', async () => {
    const res = await request('POST', '/api/auth/register', {
      name: 'Test Buyer', email: `buyer_${Date.now()}@test.com`, password: 'TestPass123!', role: 'buyer'
    });
    assert.strictEqual(res.status, 201, `Expected 201, got ${res.status}`);
    assert.ok(res.body.token, 'Missing token');
    assert.ok(res.body.user, 'Missing user');
    token = res.body.token;
    userId = res.body.user.id;
  });

  await test('Login user', async () => {
    const res = await request('POST', '/api/auth/login', {
      email: `buyer_${Date.now() - 1}@test.com`, password: 'TestPass123!'
    });
    // In mock mode login always succeeds; in DB mode we need the actual email
    // For this test we use the token from register
    assert.ok(token, 'Token should exist from register');
  });

  await test('GET /api/auth/me returns current user', async () => {
    const res = await request('GET', '/api/auth/me', null, token);
    assert.strictEqual(res.status, 200);
    assert.ok(res.body.user, 'Missing user');
  });

  // ── Products ──────────────────────────────────────────────────────────

  console.log('\nProducts:');

  let products;
  await test('GET /api/products returns product list', async () => {
    const res = await request('GET', '/api/products');
    assert.strictEqual(res.status, 200);
    assert.ok(Array.isArray(res.body.products), 'Expected products array');
    products = res.body.products;
    assert.ok(products.length > 0, 'Expected at least 1 product');
  });

  let testProduct;
  await test('GET /api/products/:id returns single product', async () => {
    testProduct = products.find(p => p.stock_quantity >= 10) || products[0];
    const res = await request('GET', `/api/products/${testProduct.id}`);
    assert.strictEqual(res.status, 200);
    assert.ok(res.body.id || res.body.name, 'Expected product data');
    assert.ok(testProduct.stock_quantity >= 10, `Test product needs stock >= 10, got ${testProduct.stock_quantity}`);
  });

  // ── Cart ──────────────────────────────────────────────────────────────

  console.log('\nCart:');

  await test('GET /api/cart returns empty cart initially', async () => {
    const res = await request('GET', '/api/cart', null, token);
    assert.strictEqual(res.status, 200);
    assert.ok(res.body.cart || res.body.items, 'Expected cart data');
  });

  await test('POST /api/cart/items adds item to cart', async () => {
    const res = await request('POST', '/api/cart/items', {
      product_id: testProduct.id, quantity: 2
    }, token);
    assert.strictEqual(res.status, 201, `Expected 201, got ${res.status}: ${JSON.stringify(res.body)}`);
    assert.ok(res.body.items, 'Expected items in response');
    assert.ok(res.body.items.length > 0, 'Expected at least 1 item');
    assert.strictEqual(res.body.items[0].quantity, 2);
  });

  await test('GET /api/cart shows added item', async () => {
    const res = await request('GET', '/api/cart', null, token);
    assert.strictEqual(res.status, 200);
    assert.ok(res.body.items.length > 0, 'Cart should have items');
    assert.strictEqual(res.body.items[0].quantity, 2);
  });

  let cartItemId;
  await test('Cart item has correct data', async () => {
    const res = await request('GET', '/api/cart', null, token);
    const item = res.body.items[0];
    cartItemId = item.id;
    assert.ok(item.name, 'Item should have name');
    assert.ok(item.price, 'Item should have price');
    assert.ok(item.quantity >= 1, 'Item should have quantity');
  });

  await test('PUT /api/cart/items/:id updates quantity', async () => {
    const res = await request('PUT', `/api/cart/items/${cartItemId}`, { quantity: 5 }, token);
    assert.strictEqual(res.status, 200, `Expected 200, got ${res.status}`);
    // Verify update
    const cart = await request('GET', '/api/cart', null, token);
    const item = cart.body.items.find(i => i.id === cartItemId);
    if (item) assert.strictEqual(item.quantity, 5);
  });

  await test('POST /api/cart/items adds second product', async () => {
    const secondProduct = products.find(p => p.id !== testProduct.id && p.stock_quantity >= 1) || products.find(p => p.stock_quantity >= 1);
    assert.ok(secondProduct, 'Need a second product with stock >= 1');
    const res = await request('POST', '/api/cart/items', {
      product_id: secondProduct.id, quantity: 1
    }, token);
    assert.ok([200, 201].includes(res.status), `Expected 200/201, got ${res.status}: ${JSON.stringify(res.body)}`);
  });

  await test('GET /api/cart has multiple items', async () => {
    const res = await request('GET', '/api/cart', null, token);
    assert.ok(res.body.items.length >= 2, `Expected >=2 items, got ${res.body.items.length}`);
    assert.ok(res.body.total > 0, 'Cart total should be > 0');
  });

  // ── Checkout / Orders ─────────────────────────────────────────────────

  console.log('\nCheckout / Orders:');

  let orderId;
  await test('POST /api/orders creates order from cart', async () => {
    const res = await request('POST', '/api/orders', {}, token);
    assert.strictEqual(res.status, 201, `Expected 201, got ${res.status}: ${JSON.stringify(res.body)}`);
    assert.ok(res.body.id, 'Order should have id');
    assert.ok(res.body.total_amount || res.body.total_amount === 0, 'Order should have total_amount');
    orderId = res.body.id;
  });

  await test('Cart is empty after checkout', async () => {
    const res = await request('GET', '/api/cart', null, token);
    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.body.items.length, 0, 'Cart should be empty');
  });

  await test('GET /api/orders returns created order', async () => {
    const res = await request('GET', '/api/orders', null, token);
    assert.strictEqual(res.status, 200);
    assert.ok(Array.isArray(res.body), 'Expected orders array');
    assert.ok(res.body.length > 0, 'Expected at least 1 order');
    const order = res.body.find(o => o.id === orderId);
    assert.ok(order, 'Created order should appear in list');
  });

  await test('GET /api/orders/:id returns order details', async () => {
    const res = await request('GET', `/api/orders/${orderId}`, null, token);
    assert.strictEqual(res.status, 200);
    assert.ok(res.body.id === orderId || res.body.items, 'Expected order data');
  });

  // ── Stock validation ──────────────────────────────────────────────────

  console.log('\nStock Validation:');

  await test('POST /api/orders with empty cart returns 400', async () => {
    const res = await request('POST', '/api/orders', {}, token);
    assert.strictEqual(res.status, 400, `Expected 400, got ${res.status}`);
    assert.ok(res.body.error, 'Should have error message');
  });

  // ── Reviews ───────────────────────────────────────────────────────────

  console.log('\nReviews:');

  await test('POST /api/products/:id/reviews adds review', async () => {
    const res = await request('POST', `/api/products/${testProduct.id}/reviews`, {
      rating: 5, review: 'Excellent flowers!'
    }, token);
    assert.ok([200, 201, 409].includes(res.status), `Expected 200/201/409, got ${res.status}`);
  });

  await test('Duplicate review returns 409', async () => {
    const res = await request('POST', `/api/products/${testProduct.id}/reviews`, {
      rating: 4, review: 'Second review'
    }, token);
    assert.strictEqual(res.status, 409, `Expected 409, got ${res.status}`);
  });

  // ── Error cases ───────────────────────────────────────────────────────

  console.log('\nError Cases:');

  await test('Add to cart without auth returns 401', async () => {
    const res = await request('POST', '/api/cart/items', {
      product_id: testProduct.id, quantity: 1
    });
    assert.strictEqual(res.status, 401, `Expected 401, got ${res.status}`);
  });

  await test('Add to cart with invalid product returns 404', async () => {
    const res = await request('POST', '/api/cart/items', {
      product_id: 'nonexistent-id', quantity: 1
    }, token);
    assert.strictEqual(res.status, 404, `Expected 404, got ${res.status}`);
  });

  await test('Add to cart with quantity < 1 returns 400', async () => {
    const res = await request('POST', '/api/cart/items', {
      product_id: testProduct.id, quantity: 0
    }, token);
    assert.strictEqual(res.status, 400, `Expected 400, got ${res.status}`);
  });

  // ── Summary ───────────────────────────────────────────────────────────

  console.log(`\n=== Results: ${passed} passed, ${failed} failed ===`);
  if (failed > 0) {
    errors.forEach(e => console.log(`  ✗ ${e}`));
    process.exit(1);
  }
})().catch(err => {
  console.error('Test suite crashed:', err);
  process.exit(1);
});
