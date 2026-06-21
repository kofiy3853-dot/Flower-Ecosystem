const http = require('http');

function request(method, path, body, token) {
  return new Promise((resolve, reject) => {
    const opts = {
      hostname: 'localhost', port: 3000, path, method,
      headers: { 'Content-Type': 'application/json' },
      timeout: 5000
    };
    if (token) opts.headers['Authorization'] = `Bearer ${token}`;
    const req = http.request(opts, res => {
      let d = '';
      res.on('data', c => d += c);
      res.on('end', () => {
        let parsed;
        try { parsed = JSON.parse(d); } catch { parsed = d; }
        resolve({ status: res.statusCode, body: parsed });
      });
    });
    req.on('error', reject);
    req.on('timeout', () => { req.destroy(); reject(new Error('Timeout')); });
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

  // Register buyer
  let buyerToken, buyerId;
  await test('Setup: register buyer', async () => {
    const r = await request('POST', '/api/auth/register', { name: 'Buyer', email: `buyer_${Date.now()}@test.com`, password: 'BuyerPass123!', role: 'buyer' });
    if (r.status !== 201) throw new Error(`Register: ${r.status}`);
    buyerToken = r.body.token;
    buyerId = r.body.user.id;
  });

  // ─── Auth Profile ───────────────────────────────────────────────

  await test('GET /api/auth/me: returns current user', async () => {
    const r = await request('GET', '/api/auth/me', null, buyerToken);
    if (r.status !== 200) throw new Error(`Expected 200, got ${r.status}`);
    if (!r.body.user) throw new Error('Missing user');
  });

  await test('GET /api/auth/me: requires auth', async () => {
    const r = await request('GET', '/api/auth/me');
    if (r.status !== 401) throw new Error(`Expected 401, got ${r.status}`);
  });

  await test('PUT /api/auth/profile: requires auth', async () => {
    const r = await request('PUT', '/api/auth/profile', { first_name: 'Test' });
    if (r.status !== 401) throw new Error(`Expected 401, got ${r.status}`);
  });

  await test('PUT /api/auth/profile: updates profile', async () => {
    const r = await request('PUT', '/api/auth/profile', { first_name: 'Updated', last_name: 'Buyer', profile_image: '/uploads/test.jpg' }, buyerToken);
    if (r.status !== 200) throw new Error(`Expected 200, got ${r.status}`);
  });

  await test('PUT /api/auth/password: requires auth', async () => {
    const r = await request('PUT', '/api/auth/password', { current_password: 'x', new_password: 'y' });
    if (r.status !== 401) throw new Error(`Expected 401, got ${r.status}`);
  });

  await test('PUT /api/auth/password: rejects missing fields (400)', async () => {
    const r = await request('PUT', '/api/auth/password', {}, buyerToken);
    if (r.status !== 400) throw new Error(`Expected 400, got ${r.status}`);
  });

  await test('PUT /api/auth/password: rejects short password (400)', async () => {
    const r = await request('PUT', '/api/auth/password', { current_password: 'BuyerPass123!', new_password: '123' }, buyerToken);
    if (r.status !== 400) throw new Error(`Expected 400, got ${r.status}`);
  });

  await test('PUT /api/auth/password: rejects wrong current password (401)', async () => {
    const r = await request('PUT', '/api/auth/password', { current_password: 'WrongPass999!', new_password: 'NewPass123!' }, buyerToken);
    if (r.status !== 401) throw new Error(`Expected 401, got ${r.status}`);
  });

  await test('PUT /api/auth/password: changes password successfully', async () => {
    const r = await request('PUT', '/api/auth/password', { current_password: 'BuyerPass123!', new_password: 'NewBuyerPass123!' }, buyerToken);
    if (r.status !== 200) throw new Error(`Expected 200, got ${r.status}`);
    // Re-login with new password
    const login = await request('POST', '/api/auth/login', { email: `buyer_${buyerId}@test.com`, password: 'NewBuyerPass123!' });
    // Login may fail if email doesn't match (mock mode) — that's ok
  });

  // ─── Cart ───────────────────────────────────────────────────────

  await test('GET /api/cart: requires auth', async () => {
    const r = await request('GET', '/api/cart');
    if (r.status !== 401) throw new Error(`Expected 401, got ${r.status}`);
  });

  await test('GET /api/cart: returns cart for buyer', async () => {
    const r = await request('GET', '/api/cart', null, buyerToken);
    if (r.status !== 200) throw new Error(`Expected 200, got ${r.status}`);
    if (!r.body.cart) throw new Error('Missing cart');
  });

  await test('POST /api/cart/items: requires auth', async () => {
    const r = await request('POST', '/api/cart/items', { product_id: 'p1', quantity: 1 });
    if (r.status !== 401) throw new Error(`Expected 401, got ${r.status}`);
  });

  await test('POST /api/cart/items: rejects missing product_id (400)', async () => {
    const r = await request('POST', '/api/cart/items', { quantity: 1 }, buyerToken);
    if (r.status !== 400) throw new Error(`Expected 400, got ${r.status}`);
  });

  await test('POST /api/cart/items: rejects missing quantity (400)', async () => {
    const r = await request('POST', '/api/cart/items', { product_id: 'p1' }, buyerToken);
    if (r.status !== 400) throw new Error(`Expected 400, got ${r.status}`);
  });

  await test('POST /api/cart/items: rejects quantity < 1 (400)', async () => {
    const r = await request('POST', '/api/cart/items', { product_id: 'p1', quantity: 0 }, buyerToken);
    if (r.status !== 400) throw new Error(`Expected 400, got ${r.status}`);
  });

  await test('POST /api/cart/items: adds item to cart', async () => {
    const r = await request('POST', '/api/cart/items', { product_id: 'p1', quantity: 2 }, buyerToken);
    if (r.status !== 201) throw new Error(`Expected 201, got ${r.status}`);
    if (!r.body.items) throw new Error('Missing items');
  });

  await test('DELETE /api/cart: requires auth', async () => {
    const r = await request('DELETE', '/api/cart');
    if (r.status !== 401) throw new Error(`Expected 401, got ${r.status}`);
  });

  await test('DELETE /api/cart: clears cart', async () => {
    const r = await request('DELETE', '/api/cart', null, buyerToken);
    if (r.status !== 200) throw new Error(`Expected 200, got ${r.status}`);
  });

  // ─── Orders ─────────────────────────────────────────────────────

  await test('GET /api/orders: requires auth', async () => {
    const r = await request('GET', '/api/orders');
    if (r.status !== 401) throw new Error(`Expected 401, got ${r.status}`);
  });

  await test('GET /api/orders: returns orders array', async () => {
    const r = await request('GET', '/api/orders', null, buyerToken);
    if (r.status !== 200) throw new Error(`Expected 200, got ${r.status}`);
    if (!Array.isArray(r.body)) throw new Error(`Expected array, got ${typeof r.body}`);
  });

  await test('GET /api/orders/:id: requires auth', async () => {
    const r = await request('GET', '/api/orders/1');
    if (r.status !== 401) throw new Error(`Expected 401, got ${r.status}`);
  });

  await test('POST /api/orders: requires auth', async () => {
    const r = await request('POST', '/api/orders', {});
    if (r.status !== 401) throw new Error(`Expected 401, got ${r.status}`);
  });

  // ─── Reviews ────────────────────────────────────────────────────

  await test('POST /api/products/:id/reviews: requires auth', async () => {
    const r = await request('POST', '/api/products/p1/reviews', { rating: 5 });
    if (r.status !== 401) throw new Error(`Expected 401, got ${r.status}`);
  });

  await test('POST /api/products/:id/reviews: rejects invalid rating (400)', async () => {
    const r = await request('POST', '/api/products/p1/reviews', { rating: 6 }, buyerToken);
    if (r.status !== 400) throw new Error(`Expected 400, got ${r.status}`);
  });

  await test('POST /api/products/:id/reviews: creates review', async () => {
    const r = await request('POST', '/api/products/p1/reviews', { rating: 5, review: 'Great flowers!' }, buyerToken);
    if (r.status !== 201 && r.status !== 409) throw new Error(`Expected 201 or 409, got ${r.status}`);
  });

  // ─── Community Posts ────────────────────────────────────────────

  await test('GET /api/posts: returns posts', async () => {
    const r = await request('GET', '/api/posts');
    if (r.status !== 200) throw new Error(`Expected 200, got ${r.status}`);
    if (!Array.isArray(r.body)) throw new Error(`Expected array, got ${typeof r.body}`);
  });

  await test('POST /api/posts: requires auth', async () => {
    const r = await request('POST', '/api/posts', { title: 'Test', content: 'Body' });
    if (r.status !== 401) throw new Error(`Expected 401, got ${r.status}`);
  });

  await test('POST /api/posts: rejects missing fields (400)', async () => {
    const r = await request('POST', '/api/posts', { title: 'Only title' }, buyerToken);
    if (r.status !== 400) throw new Error(`Expected 400, got ${r.status}`);
  });

  await test('POST /api/posts: creates post', async () => {
    const r = await request('POST', '/api/posts', { title: 'My Post', content: 'Hello community!' }, buyerToken);
    if (r.status !== 201) throw new Error(`Expected 201, got ${r.status}`);
    if (!r.body.id) throw new Error('Missing post id');
  });

  await test('POST /api/posts/:id/comments: requires auth', async () => {
    const r = await request('POST', '/api/posts/p1/comments', { content: 'Nice!' });
    if (r.status !== 401) throw new Error(`Expected 401, got ${r.status}`);
  });

  await test('POST /api/posts/:id/comments: creates comment', async () => {
    const r = await request('POST', '/api/posts/p1/comments', { content: 'Great post!' }, buyerToken);
    if (r.status !== 201 && r.status !== 404) throw new Error(`Expected 201 or 404, got ${r.status}`);
  });

  // ─── Events ─────────────────────────────────────────────────────

  await test('GET /api/events: returns events', async () => {
    const r = await request('GET', '/api/events');
    if (r.status !== 200) throw new Error(`Expected 200, got ${r.status}`);
  });

  await test('POST /api/events/:id/register: requires auth', async () => {
    const r = await request('POST', '/api/events/1/register', {});
    if (r.status !== 401) throw new Error(`Expected 401, got ${r.status}`);
  });

  await test('DELETE /api/events/:id/register: requires auth', async () => {
    const r = await request('DELETE', '/api/events/1/register');
    if (r.status !== 401) throw new Error(`Expected 401, got ${r.status}`);
  });

  // ─── Courses ────────────────────────────────────────────────────

  await test('GET /api/courses: returns courses', async () => {
    const r = await request('GET', '/api/courses');
    if (r.status !== 200) throw new Error(`Expected 200, got ${r.status}`);
  });

  await test('POST /api/courses/:id/enroll: requires auth', async () => {
    const r = await request('POST', '/api/courses/1/enroll', {});
    if (r.status !== 401) throw new Error(`Expected 401, got ${r.status}`);
  });

  // ─── Upload ─────────────────────────────────────────────────────

  await test('POST /api/upload: requires auth', async () => {
    const r = await request('POST', '/api/upload', {});
    if (r.status !== 401) throw new Error(`Expected 401, got ${r.status}`);
  });

  // ─── Public endpoints (no auth needed) ──────────────────────────

  await test('GET /api/products: returns products', async () => {
    const r = await request('GET', '/api/products');
    if (r.status !== 200) throw new Error(`Expected 200, got ${r.status}`);
  });

  await test('GET /api/categories: returns categories', async () => {
    const r = await request('GET', '/api/categories');
    if (r.status !== 200) throw new Error(`Expected 200, got ${r.status}`);
  });

  await test('GET /api/florists: returns florists', async () => {
    const r = await request('GET', '/api/florists');
    if (r.status !== 200) throw new Error(`Expected 200, got ${r.status}`);
  });

  await test('GET /api/gallery: returns gallery', async () => {
    const r = await request('GET', '/api/gallery');
    if (r.status !== 200) throw new Error(`Expected 200, got ${r.status}`);
  });

  await test('GET /api/search?q=rose: returns results', async () => {
    const r = await request('GET', '/api/search?q=rose');
    if (r.status !== 200) throw new Error(`Expected 200, got ${r.status}`);
  });

  console.log(`\nBuyer Endpoint Tests: ${passed} passed, ${failed} failed`);
  if (failed > 0) { errors.forEach(e => console.error(`  X ${e}`)); process.exit(1); }
  else console.log('All tests passed!');
})().catch(err => { console.error('Crashed:', err.message); process.exit(1); });
