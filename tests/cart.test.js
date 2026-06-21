const http = require('http');
const assert = require('assert');

function request(method, path, body, token) {
  return new Promise((resolve, reject) => {
    const headers = { 'Content-Type': 'application/json', 'x-test-bypass': '1' };
    if (token) headers['Authorization'] = `Bearer ${token}`;
    const req = http.request({ hostname: 'localhost', port: 3000, path, method, headers, timeout: 5000 }, res => {
      let data = '';
      res.on('data', c => data += c);
      res.on('end', () => {
        let parsed;
        try { parsed = JSON.parse(data); } catch { parsed = data; }
        resolve({ status: res.statusCode, body: parsed });
      });
    });
    req.on('error', reject);
    req.on('timeout', () => { req.destroy(); reject(new Error('timeout')); });
    if (body) req.write(JSON.stringify(body));
    req.end();
  });
}

(async () => {
  let passed = 0, failed = 0;
  const errors = [];

  function test(name, fn) {
    return fn().then(() => { passed++; }).catch(e => { failed++; errors.push(`${name}: ${e.message}`); });
  }

  // Setup: get auth token (login in mock mode always succeeds)
  let token;
  await test('setup: login user', async () => {
    const res = await request('POST', '/api/auth/login', {
      email: `cart_test_${Date.now()}@test.com`, password: 'TestPass123!'
    });
    assert.strictEqual(res.status, 200);
    token = res.body.token;
    assert.ok(token);
  });

  await test('setup: clear cart', async () => {
    await request('DELETE', '/api/cart', null, token);
  });

  // 1. Empty cart
  await test('GET /api/cart → empty cart', async () => {
    const res = await request('GET', '/api/cart', null, token);
    assert.strictEqual(res.status, 200);
    assert.ok(Array.isArray(res.body.items));
    assert.strictEqual(res.body.items.length, 0);
    assert.strictEqual(res.body.total, 0);
  });

  // 2. Add item
  let addedItemId;
  await test('POST /api/cart/items → adds item', async () => {
    const res = await request('POST', '/api/cart/items', { product_id: 'p1', quantity: 2 }, token);
    assert.strictEqual(res.status, 201);
    assert.ok(Array.isArray(res.body.items));
    assert.ok(res.body.items.length > 0);
    assert.ok(res.body.total > 0);
    addedItemId = res.body.items[0].id;
  });

  // 3. Cart now has item
  await test('GET /api/cart → has 1 item', async () => {
    const res = await request('GET', '/api/cart', null, token);
    assert.strictEqual(res.body.items.length, 1);
    assert.strictEqual(res.body.items[0].product_id, 'p1');
    assert.strictEqual(res.body.items[0].quantity, 2);
  });

  // 4. Add same item again (merges quantity)
  await test('POST /api/cart/items → merges same product', async () => {
    const res = await request('POST', '/api/cart/items', { product_id: 'p1', quantity: 3 }, token);
    assert.strictEqual(res.status, 201);
    const item = res.body.items.find(i => i.product_id === 'p1');
    assert.strictEqual(item.quantity, 5);
  });

  // 5. Add different item
  await test('POST /api/cart/items → adds different product', async () => {
    const res = await request('POST', '/api/cart/items', { product_id: 'p2', quantity: 1 }, token);
    assert.strictEqual(res.status, 201);
    assert.strictEqual(res.body.items.length, 2);
  });

  // 6. Total reflects both items
  await test('total = sum of all item prices * quantities', async () => {
    const res = await request('GET', '/api/cart', null, token);
    const expected = res.body.items.reduce((sum, i) => sum + i.price * i.quantity, 0);
    assert.strictEqual(res.body.total, expected);
  });

  // 7. Update quantity
  await test('PUT /api/cart/items/:id → updates quantity', async () => {
    const res = await request('PUT', `/api/cart/items/${addedItemId}`, { quantity: 10 }, token);
    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.body.quantity, 10);
  });

  // 8. Update with invalid quantity
  await test('PUT /api/cart/items/:id → quantity < 1 returns 400', async () => {
    const res = await request('PUT', `/api/cart/items/${addedItemId}`, { quantity: 0 }, token);
    assert.strictEqual(res.status, 400);
  });

  // 9. Remove item
  await test('DELETE /api/cart/items/:id → removes item', async () => {
    const res = await request('DELETE', `/api/cart/items/${addedItemId}`, null, token);
    assert.strictEqual(res.status, 200);
    assert.ok(res.body.message);
  });

  // 10. Cart now has 1 item
  await test('GET /api/cart → has 1 item after removal', async () => {
    const res = await request('GET', '/api/cart', null, token);
    assert.strictEqual(res.body.items.length, 1);
    assert.notStrictEqual(res.body.items[0].id, addedItemId);
  });

  // 11. Remove nonexistent item
  await test('DELETE /api/cart/items/fake → 404', async () => {
    const res = await request('DELETE', '/api/cart/items/fake_id', null, token);
    assert.strictEqual(res.status, 404);
  });

  // 12. Clear cart
  await test('DELETE /api/cart → clears all items', async () => {
    const res = await request('DELETE', '/api/cart', null, token);
    assert.strictEqual(res.status, 200);
    assert.ok(res.body.message);
  });

  // 13. Cart is now empty
  await test('GET /api/cart → empty after clear', async () => {
    const res = await request('GET', '/api/cart', null, token);
    assert.strictEqual(res.body.items.length, 0);
    assert.strictEqual(res.body.total, 0);
  });

  // 14. Add item without auth
  await test('POST /api/cart/items → 401 without token', async () => {
    const res = await request('POST', '/api/cart/items', { product_id: 'p1', quantity: 1 });
    assert.strictEqual(res.status, 401);
  });

  // 15. Add item with missing product_id
  await test('POST /api/cart/items → 400 missing product_id', async () => {
    const res = await request('POST', '/api/cart/items', { quantity: 1 }, token);
    assert.strictEqual(res.status, 400);
  });

  // 16. Add nonexistent product
  await test('POST /api/cart/items → 404 nonexistent product', async () => {
    const res = await request('POST', '/api/cart/items', { product_id: 'nonexistent', quantity: 1 }, token);
    assert.strictEqual(res.status, 404);
  });

  // 17. Cart item has name and price
  await test('cart item includes product name and price', async () => {
    await request('POST', '/api/cart/items', { product_id: 'p3', quantity: 1 }, token);
    const res = await request('GET', '/api/cart', null, token);
    const item = res.body.items[0];
    assert.ok(item.name, 'Expected item to have name');
    assert.strictEqual(typeof item.price, 'number');
  });

  console.log(`\nCart Tests: ${passed} passed, ${failed} failed`);
  if (failed > 0) {
    errors.forEach(e => console.error(`  ✗ ${e}`));
    process.exit(1);
  }
})().catch(err => {
  console.error('✗ Cart tests crashed:', err.message);
  process.exit(1);
});
