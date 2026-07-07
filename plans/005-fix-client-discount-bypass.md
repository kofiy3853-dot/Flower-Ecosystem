# Plan 005: Remove client-supplied discount_amount from order creation

> **Executor instructions**: Follow this plan step by step. Run every
> verification command and confirm the expected result before moving to the
> next step. If anything in the "STOP conditions" section occurs, stop and
> report — do not improvise. When done, update the status row for this plan
> in `plans/README.md`.
>
> **Drift check (run first)**: `git diff --stat 9d726ad..HEAD -- routes/orders.js`
> If `routes/orders.js` changed since this plan was written, compare the
> "Current state" excerpts against the live code before proceeding; on a
> mismatch, treat it as a STOP condition.

## Status

- **Priority**: P1
- **Effort**: S
- **Risk**: LOW
- **Depends on**: none
- **Category**: security
- **Planned at**: commit `9d726ad`, 2026-07-07

## Why this matters

`POST /api/orders` currently accepts `discount_amount` from the request body
and subtracts it from the order total without any server-side verification that
a valid coupon was applied. Any authenticated user can POST
`{ "discount_amount": 99999 }` to place an order for free. The coupon
validation endpoint (`/api/products/coupons/validate`) exists but is never
linked server-side to the actual discount applied at checkout.

## Current state

**`routes/orders.js`** — the order-creation endpoint (the only file to change).

Current code at lines 4–22:
```js
router.post('/', requireAuth, rateLimiter(10, 60000), asyncHandler(async (req, res) => {
    const { coupon_id, discount_amount } = req.body || {};
    const cart = await pool.query(
        'SELECT id FROM marketplace.carts WHERE user_id = $1',
        [req.user.id]
    );
    if (!cart.rows.length) return res.status(400).json({ error: 'Cart is empty' });

    const items = await pool.query(
        `SELECT ci.product_id, ci.quantity, p.price, p.seller_id
         FROM marketplace.cart_items ci
         JOIN marketplace.products p ON p.id = ci.product_id
         WHERE ci.cart_id = $1`,
        [cart.rows[0].id]
    );
    if (!items.rows.length) return res.status(400).json({ error: 'Cart is empty' });

    const total = items.rows.reduce((sum, item) => sum + (parseFloat(item.price) * item.quantity), 0);
    const finalTotal = Math.max(0, total - (parseFloat(discount_amount) || 0));
```

The repo's error-handling convention: use `asyncHandler` wrappers (from
`routes/middleware.js`) — every existing route in `orders.js` follows this
pattern. Match it.

## Commands you will need

| Purpose | Command | Expected on success |
|---------|---------|---------------------|
| Start server (smoke test) | `node server.js` | Server starts, DB connects |
| Run order tests | `node tests/orders.test.js` | All pass |
| Run all tests | `node tests/run.js` | All pass |

## Scope

**In scope** (the only files you should modify):
- `routes/orders.js`

**Out of scope** (do NOT touch):
- `routes/products.js` — coupon validate/use endpoints live here; they are
  correct and must not be changed.
- Any HTML/frontend files — the frontend can still pass `coupon_code`; that's
  what we'll read instead of `discount_amount`.

## Steps

### Step 1: Accept `coupon_code` instead of `coupon_id` / `discount_amount`

Replace the destructuring at the top of the POST handler:

**Remove** (lines 4–5):
```js
const { coupon_id, discount_amount } = req.body || {};
```

**Replace with**:
```js
const { coupon_code } = req.body || {};
```

### Step 2: Validate coupon server-side inside the transaction

After the `items` query and before computing `finalTotal`, add server-side
coupon validation. Insert this block immediately after line 19 (`if
(!items.rows.length)...`):

```js
    let discountAmount = 0;
    let couponId = null;
    if (coupon_code && typeof coupon_code === 'string') {
        const couponR = await pool.query(
            `SELECT id, discount_type, discount_value, min_order_amount, max_uses, current_uses
             FROM marketplace.coupons
             WHERE code = $1 AND is_active = true
               AND (expires_at IS NULL OR expires_at > CURRENT_TIMESTAMP)
               AND (max_uses = 0 OR current_uses < max_uses)`,
            [coupon_code.toUpperCase().slice(0, 50)]
        );
        if (!couponR.rows.length) {
            return res.status(400).json({ error: 'Invalid or expired coupon code' });
        }
        const coupon = couponR.rows[0];
        if (total < Number(coupon.min_order_amount)) {
            return res.status(400).json({
                error: `Minimum order amount of ${Number(coupon.min_order_amount).toFixed(2)} required for this coupon`
            });
        }
        if (coupon.discount_type === 'percentage') {
            discountAmount = (total * Number(coupon.discount_value)) / 100;
        } else {
            discountAmount = Number(coupon.discount_value);
        }
        discountAmount = Math.min(discountAmount, total);
        couponId = coupon.id;
    }
```

### Step 3: Replace `discount_amount` with `discountAmount` in total calculation

Replace:
```js
    const finalTotal = Math.max(0, total - (parseFloat(discount_amount) || 0));
```
With:
```js
    const finalTotal = Math.max(0, total - discountAmount);
```

### Step 4: Use `couponId` (server-validated) for usage increment

The existing coupon usage increment block at the bottom of the handler (around
line 61) currently reads:
```js
    if (coupon_id) {
        pool.query('UPDATE marketplace.coupons SET current_uses = current_uses + 1 WHERE id = $1 AND (max_uses = 0 OR current_uses < max_uses)', [coupon_id])
            .catch(err => console.error('Failed to increment coupon usage:', err.message));
    }
```

Replace `coupon_id` with `couponId`:
```js
    if (couponId) {
        pool.query('UPDATE marketplace.coupons SET current_uses = current_uses + 1 WHERE id = $1 AND (max_uses = 0 OR current_uses < max_uses)', [couponId])
            .catch(err => console.error('Failed to increment coupon usage:', err.message));
    }
```

**Verify**: `node -e "const r = require('./routes/orders'); console.log('loaded OK')"` → prints `loaded OK`, no syntax errors.

### Step 5: Run tests

**Verify**: `node tests/orders.test.js` → all tests pass.  
**Verify**: `node tests/run.js` → all tests pass.

## Test plan

Add the following test cases to `tests/orders.test.js` (model the structure
after existing tests in that file):

1. **Happy path — no coupon**: POST `/api/orders` with no coupon fields; order
   total equals cart total.
2. **Happy path — valid coupon_code**: POST with a valid `coupon_code`; order
   total reflects the discount.
3. **Security: `discount_amount` ignored**: POST with
   `{ "discount_amount": 99999 }` and no `coupon_code`; order total must equal
   full cart total (not zero/negative).
4. **Invalid coupon code**: POST with a non-existent `coupon_code`; expect 400.
5. **Expired coupon**: POST with an expired coupon code; expect 400.

## Done criteria

- [ ] `node tests/orders.test.js` exits 0, all existing tests pass plus the 5 new cases
- [ ] `grep -n "discount_amount" routes/orders.js` returns no matches
- [ ] `node tests/run.js` exits 0
- [ ] No files outside `routes/orders.js` and `tests/orders.test.js` are modified
- [ ] `plans/README.md` status row updated to DONE

## STOP conditions

- The code at `routes/orders.js:4–22` doesn't match the excerpts in "Current
  state" (drift — read the drift check output first).
- The coupon schema in `marketplace.coupons` doesn't have the columns
  `discount_type`, `discount_value`, `min_order_amount`, `max_uses`,
  `current_uses`, `expires_at`, `is_active` — if any are missing, STOP.
- Step 5 verification fails after one re-attempt.

## Maintenance notes

- If percentage coupons with a `max_discount` cap are added later, add that
  cap to the validation block in Step 2.
- The frontend checkout page (`js/checkout.js`) currently sends `coupon_id` and
  `discount_amount`. After this plan lands, update the frontend to send
  `coupon_code` instead. This is a separate, non-blocking change — the backend
  will simply ignore unknown fields, and the discount will default to 0 until
  the frontend is updated.
