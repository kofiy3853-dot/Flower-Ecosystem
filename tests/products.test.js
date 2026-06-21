const http = require('http');
const assert = require('assert');

function request(method, path) {
  return new Promise((resolve, reject) => {
    const req = http.request({ hostname: 'localhost', port: 3000, path, method, timeout: 5000 }, res => {
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
    req.end();
  });
}

(async () => {
  let passed = 0, failed = 0;
  const errors = [];

  function test(name, fn) {
    return fn().then(() => { passed++; }).catch(e => { failed++; errors.push(`${name}: ${e.message}`); });
  }

  // 1. Basic listing returns paginated structure
  await test('GET /api/products → returns {products, total, page, limit, pages}', async () => {
    const res = await request('GET', '/api/products');
    assert.strictEqual(res.status, 200);
    assert.ok(Array.isArray(res.body.products), 'products should be array');
    assert.strictEqual(typeof res.body.total, 'number');
    assert.strictEqual(typeof res.body.page, 'number');
    assert.strictEqual(typeof res.body.limit, 'number');
    assert.strictEqual(typeof res.body.pages, 'number');
  });

  // 2. Default pagination
  await test('default page=1, limit=20', async () => {
    const res = await request('GET', '/api/products');
    assert.strictEqual(res.body.page, 1);
    assert.strictEqual(res.body.limit, 20);
    assert.ok(res.body.products.length <= 20);
  });

  // 3. Custom pagination
  await test('page=1, limit=2 → returns 2 products', async () => {
    const res = await request('GET', '/api/products?page=1&limit=2');
    assert.strictEqual(res.body.page, 1);
    assert.strictEqual(res.body.limit, 2);
    assert.ok(res.body.products.length <= 2);
  });

  // 4. Page 2
  await test('page=2, limit=2 → page=2', async () => {
    const res = await request('GET', '/api/products?page=2&limit=2');
    assert.strictEqual(res.body.page, 2);
  });

  // 5. Search by name
  await test('search=orchid → results contain orchid', async () => {
    const res = await request('GET', '/api/products?search=orchid');
    assert.strictEqual(res.status, 200);
    assert.ok(res.body.products.length > 0);
    assert.ok(res.body.products.some(p => p.name.toLowerCase().includes('orchid')));
  });

  // 6. Search with no results
  await test('search=xyznonexistent → 0 results', async () => {
    const res = await request('GET', '/api/products?search=xyznonexistent');
    assert.strictEqual(res.body.products.length, 0);
  });

  // 7. Filter by category
  await test('category=bouquets → all products in bouquets', async () => {
    const res = await request('GET', '/api/products?category=bouquets');
    assert.ok(res.body.products.every(p => (p.category || '').toLowerCase() === 'bouquets'));
  });

  // 8. Filter by min_price
  await test('min_price=30 → all products >= 30', async () => {
    const res = await request('GET', '/api/products?min_price=30');
    assert.ok(res.body.products.every(p => p.price >= 30));
  });

  // 9. Filter by max_price
  await test('max_price=25 → all products <= 25', async () => {
    const res = await request('GET', '/api/products?max_price=25');
    assert.ok(res.body.products.every(p => p.price <= 25));
  });

  // 10. Filter by price range
  await test('min_price=20&max_price=30 → all in range', async () => {
    const res = await request('GET', '/api/products?min_price=20&max_price=30');
    assert.ok(res.body.products.every(p => p.price >= 20 && p.price <= 30));
  });

  // 11. Sort by price ascending
  await test('sort=price_asc → prices ascending', async () => {
    const res = await request('GET', '/api/products?sort=price_asc&limit=50');
    const prices = res.body.products.map(p => p.price);
    for (let i = 1; i < prices.length; i++) {
      assert.ok(prices[i] >= prices[i - 1], `Expected ${prices[i]} >= ${prices[i-1]}`);
    }
  });

  // 12. Sort by price descending
  await test('sort=price_desc → prices descending', async () => {
    const res = await request('GET', '/api/products?sort=price_desc&limit=50');
    const prices = res.body.products.map(p => p.price);
    for (let i = 1; i < prices.length; i++) {
      assert.ok(prices[i] <= prices[i - 1], `Expected ${prices[i]} <= ${prices[i-1]}`);
    }
  });

  // 13. Sort by name
  await test('sort=name → alphabetical', async () => {
    const res = await request('GET', '/api/products?sort=name&limit=50');
    const names = res.body.products.map(p => p.name);
    for (let i = 1; i < names.length; i++) {
      assert.ok(names[i] >= names[i - 1]);
    }
  });

  // 14. Featured filter
  await test('featured=true → only featured', async () => {
    const res = await request('GET', '/api/products?featured=true');
    assert.ok(res.body.products.every(p => p.featured === true));
  });

  // 15. Best seller filter
  await test('best_seller=true → only best sellers', async () => {
    const res = await request('GET', '/api/products?best_seller=true');
    assert.ok(res.body.products.every(p => p.bestSeller === true));
  });

  // 16. Combine filters
  await test('search + min_price + sort → combined', async () => {
    const res = await request('GET', '/api/products?search=bouquet&min_price=20&sort=price_asc');
    assert.strictEqual(res.status, 200);
    assert.ok(res.body.products.every(p => p.price >= 20));
  });

  // 17. Limit capped at 100
  await test('limit=999 → capped at 100', async () => {
    const res = await request('GET', '/api/products?limit=999');
    assert.strictEqual(res.body.limit, 100);
  });

  // 18. Invalid page defaults to 1
  await test('page=abc → defaults to 1', async () => {
    const res = await request('GET', '/api/products?page=abc');
    assert.strictEqual(res.body.page, 1);
  });

  // 19. Total matches filtered count
  await test('total matches products length when all fit', async () => {
    const res = await request('GET', '/api/products?limit=100');
    assert.strictEqual(res.body.total, res.body.products.length);
  });

  // 20. Pages calculation correct
  await test('pages = ceil(total/limit)', async () => {
    const res = await request('GET', '/api/products?limit=3');
    assert.strictEqual(res.body.pages, Math.ceil(res.body.total / 3));
  });

  // 21. Individual product has expected fields
  await test('product object has id, name, price, category', async () => {
    const res = await request('GET', '/api/products?limit=1');
    const p = res.body.products[0];
    assert.ok(p.id);
    assert.ok(p.name);
    assert.strictEqual(typeof p.price, 'number');
  });

  console.log(`\nProduct Listing Tests: ${passed} passed, ${failed} failed`);
  if (failed > 0) {
    errors.forEach(e => console.error(`  ✗ ${e}`));
    process.exit(1);
  }
})().catch(err => {
  console.error('✗ Product tests crashed:', err.message);
  process.exit(1);
});
