# Plan 009: Fix cart split-brain between mock store and database

> **Executor instructions**: Follow this plan step by step. Run every
> verification command before proceeding. STOP on any STOP condition.
> Update `plans/README.md` when done.
>
> **Drift check (run first)**: `git diff --stat 9d726ad..HEAD -- routes/cart.js`
> Compare "Current state" excerpts. On mismatch, STOP.

## Status

- **Priority**: P2
- **Effort**: S
- **Risk**: LOW
- **Depends on**: none
- **Category**: bug
- **Planned at**: commit `9d726ad`, 2026-07-07

## Why this matters

`routes/cart.js` maintains an in-memory `mockCarts` Map as a fallback when the
database is unavailable. The problem is that the GET handler checks the in-memory
cart **first** (line 24–29), before even trying the DB. If a user adds items
while the DB is down (stored in memory), then the DB recovers, the GET still
returns the in-memory state while POST `/items` writes to the DB — creating two
separate carts. The user sees stale data, and items added in "online mode" are
invisible until the server restarts. At checkout, the DB cart is used, which
may be empty.

## Current state

**`routes/cart.js`** — the GET handler, lines 24–54:

```js
router.get('/', requireAuth, asyncHandler(async (req, res) => {
    const mockCart = getMockCart(req.user.id);
    if (mockCart.items.length > 0) {
        const items = getMockCartProducts(mockCart);
        return res.json({ cart: { id: mockCart.id, user_id: mockCart.user_id }, items, total: cartTotal(items) });
    }

    if (await dbAvailable()) {
        try {
            let cart = await pool.query('SELECT id FROM marketplace.carts WHERE user_id = $1', [req.user.id]);
            if (!cart.rows.length) {
                cart = await pool.query('INSERT INTO marketplace.carts (user_id) VALUES ($1) RETURNING *', [req.user.id]);
            }
            const items = await pool.query(...);
            ...
            return res.json({ cart: cart.rows[0], items: items.rows, total });
        } catch (err) {
            console.error('Cart query error:', err.message);
        }
    }
    res.json({ cart: { id: mockCart.id, user_id: mockCart.user_id }, items: [], total: 0 });
}));
```

The `if (mockCart.items.length > 0)` early return at lines 25–29 causes the
split-brain. The `mockCarts` Map and `getMockCart` / `getMockCartProducts` /
`cartTotal` helper functions at lines 5–22 are all fine to keep for the
fallback case.

## Commands you will need

| Purpose | Command | Expected |
|---------|---------|----------|
| Syntax check | `node -e "require('./routes/cart')"` | exits 0 |
| Cart tests | `node tests/cart.test.js` | All pass |
| All tests | `node tests/run.js` | All pass |

## Scope

**In scope**:
- `routes/cart.js` — GET handler only (lines ~24–54)

**Out of scope**:
- POST, PUT, DELETE cart handlers — they already prioritize DB correctly
- The mock helper functions (lines 5–22) — keep them for genuine DB-down fallback

## Steps

### Step 1: Remove the mock-first early return from the GET handler

In `router.get('/')`, delete the early-return block that checks in-memory
cart before DB:

**Remove** (lines 25–29):
```js
    const mockCart = getMockCart(req.user.id);
    if (mockCart.items.length > 0) {
        const items = getMockCartProducts(mockCart);
        return res.json({ cart: { id: mockCart.id, user_id: mockCart.user_id }, items, total: cartTotal(items) });
    }
```

The GET handler should now read as:
```js
router.get('/', requireAuth, asyncHandler(async (req, res) => {
    if (await dbAvailable()) {
        try {
            let cart = await pool.query('SELECT id FROM marketplace.carts WHERE user_id = $1', [req.user.id]);
            if (!cart.rows.length) {
                cart = await pool.query('INSERT INTO marketplace.carts (user_id) VALUES ($1) RETURNING *', [req.user.id]);
            }
            const items = await pool.query(
                `SELECT ci.*, p.name, p.price, p.flower_cond, p.stock_quantity,
                        COALESCE(json_agg(pi.image_url) FILTER (WHERE pi.image_url IS NOT NULL), '[]') AS images
                 FROM marketplace.cart_items ci
                 JOIN marketplace.products p ON p.id = ci.product_id
                 LEFT JOIN marketplace.product_images pi ON pi.product_id = p.id
                 WHERE ci.cart_id = $1
                 GROUP BY ci.id, p.name, p.price, p.flower_cond, p.stock_quantity`,
                [cart.rows[0].id]
            );
            const total = cartTotal(items.rows);
            return res.json({ cart: cart.rows[0], items: items.rows, total });
        } catch (err) {
            console.error('Cart query error:', err.message);
        }
    }
    // Genuine DB-down fallback: use in-memory mock
    const mockCart = getMockCart(req.user.id);
    const items = getMockCartProducts(mockCart);
    res.json({ cart: { id: mockCart.id, user_id: mockCart.user_id }, items, total: cartTotal(items) });
}));
```

Note: The fallback at the end now shows the mock cart when DB is truly
unavailable — correct behavior. When DB is available, mock is never consulted.

**Verify**: `node -e "require('./routes/cart')"` → exits 0.

### Step 2: Run all tests

**Verify**: `node tests/cart.test.js` → all pass.  
**Verify**: `node tests/run.js` → all pass.

## Test plan

Add to `tests/cart.test.js`:

1. **DB-available GET**: GET `/api/cart` when DB is connected; returns DB cart
   (not mock state).
2. **DB-down GET**: Simulate DB unavailability; GET `/api/cart` returns mock/empty
   cart rather than an error.
3. **No split-brain**: Add item via POST (DB up), verify GET returns that item
   from DB (not a stale mock).

## Done criteria

- [ ] `node -e "require('./routes/cart')"` exits 0
- [ ] `grep -n "mockCart.items.length > 0" routes/cart.js` returns no matches
- [ ] `node tests/cart.test.js` exits 0
- [ ] `node tests/run.js` exits 0
- [ ] Only `routes/cart.js` and `tests/cart.test.js` modified
- [ ] `plans/README.md` status updated

## STOP conditions

- Existing cart tests fail after the change — check if tests relied on mock state.
- The DB-fallback at the bottom of the handler now never returns the mock state
  even when DB is down — ensure the `dbAvailable()` guard is still there.

## Maintenance notes

- The `mockCarts` Map and its helpers can be removed entirely once you're
  confident the app always runs with a DB. Keep them for now as the genuine
  DB-down fallback.
- If Redis-backed session carts are added in future, the `getMockCart` fallback
  becomes the Redis fallback — same pattern applies.
