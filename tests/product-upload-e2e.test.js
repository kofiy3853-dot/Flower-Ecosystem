const http = require('http');
const assert = require('assert');

function request(method, path, body, token) {
  return new Promise((resolve, reject) => {
    const headers = { 'Content-Type': 'application/json', 'X-Requested-With': 'XMLHttpRequest' };
    if (token) headers['Authorization'] = 'Bearer ' + token;
    const req = http.request({ hostname: 'localhost', port: 3000, path, method, headers, timeout: 10000 }, res => {
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

const SELLER_EMAIL = `seller_e2e_${Date.now()}@test.com`;
const PASS = 'TestPass123!';

(async () => {
  let passed = 0, failed = 0;
  const errors = [];

  function test(name, fn) {
    return fn().then(() => { passed++; console.log(`  \x1b[32m✓\x1b[0m ${name}`); })
               .catch(e => { failed++; errors.push(`${name}: ${e.message}`); console.log(`  \x1b[31m✗\x1b[0m ${name}: ${e.message}`); });
  }

  console.log('\n=== Product Upload E2E Tests ===\n');

  // ── Setup: register seller ──
  let sellerToken;
  let sellerId;

  await test('Setup: register seller user', async () => {
    const res = await request('POST', '/api/auth/register', {
      name: 'E2E Seller', email: SELLER_EMAIL, password: PASS, role: 'seller'
    });
    assert.strictEqual(res.status, 201, `Expected 201, got ${res.status}: ${JSON.stringify(res.body)}`);
    assert.ok(res.body.token, 'Expected token');
    sellerToken = res.body.token;
    const payload = JSON.parse(Buffer.from(sellerToken.split('.')[1], 'base64').toString());
    sellerId = payload.id;
  });

  // ── 1. Create product via POST /api/products ──
  let productId;

  await test('POST /api/products → creates product with all fields', async () => {
    const res = await request('POST', '/api/products', {
      name: 'E2E Test Roses',
      description: 'Beautiful test roses for E2E testing',
      price: 49.99,
      stock_quantity: 25,
      category: 'Roses',
      flower_cond: 'NATURAL',
      images: ['https://example.com/roses1.jpg', 'https://example.com/roses2.jpg'],
      video_url: 'https://youtube.com/watch?v=test',
      badge: 'New',
      occasion: 'Wedding',
      color: 'Red',
      fresh: true,
      featured: true,
      best_seller: false,
      new_arrival: true,
      harvest_date: '2026-06-20',
      shelf_life_days: 10
    }, sellerToken);
    assert.strictEqual(res.status, 201, `Expected 201, got ${res.status}: ${JSON.stringify(res.body)}`);
    assert.ok(res.body.id, 'Expected product id');
    assert.strictEqual(res.body.name, 'E2E Test Roses');
    assert.strictEqual(Number(res.body.price), 49.99);
    assert.strictEqual(res.body.stock_quantity, 25);
    assert.strictEqual(res.body.flower_cond, 'NATURAL');
    assert.strictEqual(res.body.badge, 'New');
    assert.strictEqual(res.body.occasion, 'Wedding');
    assert.strictEqual(res.body.color, 'Red');
    assert.strictEqual(res.body.fresh, true);
    assert.strictEqual(res.body.featured, true);
    assert.strictEqual(res.body.new_arrival, true);
    assert.strictEqual(res.body.image_url, 'https://example.com/roses1.jpg');
    productId = res.body.id;
  });

  // ── 2. Product appears in listing ──
  await test('GET /api/products → new product appears in listing', async () => {
    const res = await request('GET', `/api/products?search=E2E+Test+Roses`);
    assert.strictEqual(res.status, 200);
    const found = res.body.products.find(p => p.id === productId);
    assert.ok(found, 'Product not found in listing');
    assert.strictEqual(found.name, 'E2E Test Roses');
  });

  // ── 3. Get single product ──
  await test('GET /api/products/:id → returns full product with images and reviews', async () => {
    const res = await request('GET', `/api/products/${productId}`);
    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.body.id, productId);
    assert.strictEqual(res.body.name, 'E2E Test Roses');
    assert.ok(Array.isArray(res.body.images), 'Expected images array');
    assert.ok(Array.isArray(res.body.reviews), 'Expected reviews array');
  });

  // ── 4. Update product via PUT /api/products/:id ──
  await test('PUT /api/products/:id → updates product fields', async () => {
    const res = await request('PUT', `/api/products/${productId}`, {
      name: 'E2E Test Roses - Updated',
      price: 59.99,
      stock_quantity: 30,
      color: 'Pink',
      occasion: 'Birthday',
      flower_cond: 'PRESERVED',
      images: ['https://example.com/roses-updated.jpg']
    }, sellerToken);
    assert.strictEqual(res.status, 200, `Expected 200, got ${res.status}: ${JSON.stringify(res.body)}`);
    assert.strictEqual(res.body.name, 'E2E Test Roses - Updated');
    assert.strictEqual(Number(res.body.price), 59.99);
    assert.strictEqual(res.body.stock_quantity, 30);
    assert.strictEqual(res.body.color, 'Pink');
    assert.strictEqual(res.body.occasion, 'Birthday');
    assert.strictEqual(res.body.flower_cond, 'PRESERVED');
    assert.strictEqual(res.body.image_url, 'https://example.com/roses-updated.jpg');
  });

  // ── 5. Verify update persists ──
  await test('GET /api/products/:id → reflects updates', async () => {
    const res = await request('GET', `/api/products/${productId}`);
    assert.strictEqual(res.body.name, 'E2E Test Roses - Updated');
    assert.strictEqual(Number(res.body.price), 59.99);
  });

  // ── 6. Category name resolution ──
  await test('POST /api/products with category name → resolves to category_id', async () => {
    const res = await request('POST', '/api/products', {
      name: 'Category Test Bouquet',
      price: 35.00,
      category: 'Bouquets',
      flower_cond: 'ARTIFICIAL'
    }, sellerToken);
    assert.strictEqual(res.status, 201);
    assert.ok(res.body.category_id, 'Expected category_id to be resolved');
  });

  // ── 7. Duplicate endpoint returns 308 ──
  await test('POST /api/seller/products → returns 308 redirect', async () => {
    const res = await request('POST', '/api/seller/products', {
      name: 'Should Not Create',
      price: 10.00
    }, sellerToken);
    assert.strictEqual(res.status, 308);
    assert.ok(res.body.error.includes('/api/products'));
  });

  await test('PUT /api/seller/products/:id → returns 308 redirect', async () => {
    const res = await request('PUT', `/api/seller/products/${productId}`, {
      name: 'Should Not Update'
    }, sellerToken);
    assert.strictEqual(res.status, 308);
    assert.ok(res.body.error.includes('/api/products'));
  });

  // ── 8. Validation: missing name ──
  await test('POST /api/products without name → 400', async () => {
    const res = await request('POST', '/api/products', { price: 10 }, sellerToken);
    assert.strictEqual(res.status, 400);
    assert.ok(res.body.error.includes('Name and price'));
  });

  // ── 9. Validation: missing price ──
  await test('POST /api/products without price → 400', async () => {
    const res = await request('POST', '/api/products', { name: 'No Price' }, sellerToken);
    assert.strictEqual(res.status, 400);
  });

  // ── 10. Validation: negative price ──
  await test('POST /api/products with negative price → 400', async () => {
    const res = await request('POST', '/api/products', { name: 'Bad Price', price: -5 }, sellerToken);
    assert.strictEqual(res.status, 400);
    assert.ok(res.body.error.includes('non-negative'));
  });

  // ── 11. Validation: invalid flower_cond ──
  await test('POST /api/products with invalid flower_cond → 400', async () => {
    const res = await request('POST', '/api/products', { name: 'Bad Cond', price: 10, flower_cond: 'FAKE' }, sellerToken);
    assert.strictEqual(res.status, 400);
    assert.ok(res.body.error.includes('Invalid flower condition'));
  });

  // ── 12. Unauthorized: no token ──
  await test('POST /api/products without auth → 401', async () => {
    const res = await request('POST', '/api/products', { name: 'No Auth', price: 10 });
    assert.strictEqual(res.status, 401);
  });

  // ── 13. Unauthorized: buyer role ──
  await test('POST /api/products as buyer → 403', async () => {
    const buyerRes = await request('POST', '/api/auth/register', {
      name: 'E2E Buyer', email: `buyer_e2e_${Date.now()}@test.com`, password: PASS, role: 'buyer'
    });
    assert.strictEqual(buyerRes.status, 201);
    const res = await request('POST', '/api/products', { name: 'Buyer Product', price: 10 }, buyerRes.body.token);
    assert.strictEqual(res.status, 403);
  });

  // ── 14. Delete product (soft delete) ──
  await test('DELETE /api/products/:id → soft deletes product', async () => {
    const res = await request('DELETE', `/api/products/${productId}`, null, sellerToken);
    assert.strictEqual(res.status, 200);
    assert.ok(res.body.message);
  });

  // ── 15. Deleted product not in active listing ──
  await test('GET /api/products → deleted product not in active listing', async () => {
    const res = await request('GET', `/api/products?search=E2E+Test+Roses`);
    const found = res.body.products.find(p => p.id === productId);
    assert.ok(!found, 'Deleted product should not appear in active listing');
  });

  // ── 16. Delete non-existent → 404 ──
  await test('DELETE /api/products/nonexistent → 404', async () => {
    const res = await request('DELETE', '/api/products/00000000-0000-0000-0000-000000000000', null, sellerToken);
    assert.strictEqual(res.status, 404);
  });

  // ── 17. Unauthorized delete by different seller ──
  await test('DELETE /api/products/:id by wrong seller → 403', async () => {
    const otherRes = await request('POST', '/api/auth/register', {
      name: 'Other Seller', email: `other_seller_${Date.now()}@test.com`, password: PASS, role: 'seller'
    });
    assert.strictEqual(otherRes.status, 201);
    // Create a product as the other seller
    const createRes = await request('POST', '/api/products', {
      name: 'Other Seller Product', price: 20
    }, otherRes.body.token);
    assert.strictEqual(createRes.status, 201);
    // Try to delete it as the original seller
    const res = await request('DELETE', `/api/products/${createRes.body.id}`, null, sellerToken);
    assert.strictEqual(res.status, 403);
  });

  // ── 18. Seller dashboard GET still works ──
  await test('GET /api/seller/products → returns seller products', async () => {
    const res = await request('GET', '/api/seller/products', null, sellerToken);
    assert.strictEqual(res.status, 200);
    assert.ok(Array.isArray(res.body), 'Expected array');
  });

  // ── 19. Categories list endpoint ──
  await test('GET /api/products/list/categories → returns categories', async () => {
    const res = await request('GET', '/api/products/list/categories');
    assert.strictEqual(res.status, 200);
    assert.ok(Array.isArray(res.body), 'Expected categories array');
    assert.ok(res.body.length > 0, 'Expected at least one category');
    assert.ok(res.body[0].id, 'Expected category id');
    assert.ok(res.body[0].name, 'Expected category name');
  });

  // ── 20. Full roundtrip: create → update → verify → delete ──
  await test('Full roundtrip: create → update → verify → delete', async () => {
    // Create
    const c = await request('POST', '/api/products', {
      name: 'Roundtrip Flower', price: 25.00, category: 'Wildflowers',
      flower_cond: 'DRIED', color: 'Purple'
    }, sellerToken);
    assert.strictEqual(c.status, 201);
    const id = c.body.id;

    // Update
    const u = await request('PUT', `/api/products/${id}`, {
      name: 'Roundtrip Flower Updated', price: 30.00
    }, sellerToken);
    assert.strictEqual(u.status, 200);
    assert.strictEqual(u.body.name, 'Roundtrip Flower Updated');

    // Verify
    const g = await request('GET', `/api/products/${id}`);
    assert.strictEqual(g.status, 200);
    assert.strictEqual(g.body.name, 'Roundtrip Flower Updated');
    assert.strictEqual(Number(g.body.price), 30.00);

    // Delete
    const d = await request('DELETE', `/api/products/${id}`, null, sellerToken);
    assert.strictEqual(d.status, 200);

    // Verify gone
    const g2 = await request('GET', `/api/products?search=Roundtrip+Flower+Updated`);
    assert.ok(!g2.body.products.find(p => p.id === id), 'Should be gone from active listing');
  });

  // ── Summary ──
  console.log(`\n=== Results: ${passed} passed, ${failed} failed ===`);
  if (failed > 0) {
    errors.forEach(e => console.error(`  \x1b[31m✗ ${e}\x1b[0m`));
    process.exit(1);
  }
})().catch(err => {
  console.error('Test suite crashed:', err.message);
  process.exit(1);
});
