# Plan 008: Prevent ordering of inactive products at checkout

> **Executor instructions**: Follow this plan step by step. Run every
> verification command before moving to the next step. STOP on any STOP
> condition. Update `plans/README.md` when done.
>
> **Drift check (run first)**: `git diff --stat 9d726ad..HEAD -- routes/orders.js`
> Compare "Current state" excerpts. On mismatch, STOP.

## Status

- **Priority**: P2
- **Effort**: S
- **Risk**: LOW
- **Depends on**: 005 (if 005 is done first, integrate with its version of orders.js)
- **Category**: bug
- **Planned at**: commit `9d726ad`, 2026-07-07

## Why this matters

When a user adds a product to their cart and a seller later soft-deletes it
(`is_active = false`), the product remains in the cart. The order creation
query at `routes/orders.js:12–18` JOINs `cart_items` to `marketplace.products`
without filtering `p.is_active = true`, so checkout succeeds with a deleted
product. This produces an order referencing an invisible product — no stock was
reserved correctly (stock decrement plan 006 would still run, potentially on a
product with `stock_quantity = 0` due to deletion), and the customer receives
an order for something no longer for sale.

## Current state

**`routes/orders.js`** — items query at lines 12–18:
```js
    const items = await pool.query(
        `SELECT ci.product_id, ci.quantity, p.price, p.seller_id
         FROM marketplace.cart_items ci
         JOIN marketplace.products p ON p.id = ci.product_id
         WHERE ci.cart_id = $1`,
        [cart.rows[0].id]
    );
```

No `AND p.is_active = true` filter.

## Commands you will need

| Purpose | Command | Expected |
|---------|---------|----------|
| Syntax check | `node -e "require('./routes/orders')"` | exits 0 |
| Order tests | `node tests/orders.test.js` | All pass |
| All tests | `node tests/run.js` | All pass |

## Scope

**In scope**:
- `routes/orders.js` — items query only

**Out of scope**:
- Cart endpoints (`routes/cart.js`) — the UX guard there is already `AND is_active = true`; leave it
- Any schema changes

## Steps

### Step 1: Add `is_active` filter to items JOIN

In `routes/orders.js`, in the items query, add `AND p.is_active = true`:

**Replace**:
```js
        `SELECT ci.product_id, ci.quantity, p.price, p.seller_id
         FROM marketplace.cart_items ci
         JOIN marketplace.products p ON p.id = ci.product_id
         WHERE ci.cart_id = $1`,
```
**With**:
```js
        `SELECT ci.product_id, ci.quantity, p.price, p.seller_id
         FROM marketplace.cart_items ci
         JOIN marketplace.products p ON p.id = ci.product_id AND p.is_active = true
         WHERE ci.cart_id = $1`,
```

(Using a JOIN condition rather than WHERE keeps the semantics clear: inactive
products simply don't join, making `items.rows` shorter without affecting the
cart query.)

**Verify**: `node -e "require('./routes/orders')"` → exits 0.

### Step 2: Improve the empty-cart message for this case

After the filter is added, a cart containing only inactive products will return
`items.rows.length === 0`. The existing check at line 19 returns:
```js
    if (!items.rows.length) return res.status(400).json({ error: 'Cart is empty' });
```

This is acceptable — the message is slightly misleading but not incorrect. If
you want a more helpful message, change it to:
```js
    if (!items.rows.length) return res.status(400).json({ error: 'Cart is empty or all items are no longer available' });
```

This is optional; do it only if it doesn't break existing test assertions on
the exact error string.

**Verify**: `node tests/orders.test.js` → all pass.  
**Verify**: `node tests/run.js` → all pass.

## Test plan

Add to `tests/orders.test.js`:

1. **Inactive product in cart**: Create a product, add to cart, soft-delete the
   product (`is_active = false`), POST `/api/orders` → expect 400 ("Cart is
   empty" or "no longer available").
2. **Mixed cart (one active, one inactive)**: Two products in cart; deactivate
   one; POST `/api/orders` → succeeds with only the active product in the order.

## Done criteria

- [ ] `node -e "require('./routes/orders')"` exits 0
- [ ] `grep -n "is_active" routes/orders.js` contains at least one match in the items query
- [ ] `node tests/orders.test.js` exits 0, includes the inactive-product tests
- [ ] `node tests/run.js` exits 0
- [ ] Only `routes/orders.js` and `tests/orders.test.js` modified
- [ ] `plans/README.md` status updated

## STOP conditions

- After adding the filter, all items disappear from orders in an environment
  where products exist — check that `is_active` column exists in `marketplace.products`.
- Existing order tests fail because the exact error message changed.

## Maintenance notes

- If a "notify buyer when cart item becomes unavailable" feature is added, this
  filter is the right hook point: run a background job that queries
  `cart_items JOIN products WHERE is_active = false` and emails the buyer.
