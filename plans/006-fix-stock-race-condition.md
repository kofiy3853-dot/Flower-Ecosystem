# Plan 006: Fix stock decrement race condition in order creation

> **Executor instructions**: Follow this plan step by step. Run every
> verification command and confirm the expected result before moving to the
> next step. If anything in the "STOP conditions" section occurs, stop and
> report — do not improvise. When done, update the status row for this plan
> in `plans/README.md`.
>
> **Drift check (run first)**: `git diff --stat 9d726ad..HEAD -- routes/orders.js`
> If `routes/orders.js` changed since this plan was written, compare the
> "Current state" excerpts against the live code before proceeding.

## Status

- **Priority**: P1
- **Effort**: S
- **Risk**: LOW
- **Depends on**: none (independent of plan 005, but both touch `routes/orders.js` — execute 005 first if doing both)
- **Category**: bug
- **Planned at**: commit `9d726ad`, 2026-07-07

## Why this matters

Two buyers who simultaneously purchase the last unit of a product can both
succeed because stock validation (`FOR UPDATE` + quantity check) happens inside
a loop, but the stock decrement (`UPDATE ... SET stock_quantity - $1`) is a
separate statement executed after all the `FOR UPDATE` reads. Between the read
and the decrement, a second request can acquire its own read and pass the same
check. The fix is to collapse the read and decrement into a single atomic SQL
operation inside the same loop iteration.

## Current state

**`routes/orders.js`** — the only file to modify. The relevant block is the
transaction loop at lines 24–72:

```js
    const client = await pool.connect();
    try {
        await client.query('BEGIN');

        for (const item of items.rows) {
            const stock = await client.query(
                'SELECT stock_quantity FROM marketplace.products WHERE id = $1 FOR UPDATE',
                [item.product_id]
            );
            if (!stock.rows.length || stock.rows[0].stock_quantity < item.quantity) {
                await client.query('ROLLBACK');
                return res.status(400).json({ error: 'Insufficient stock for product' });
            }
            await client.query(
                'UPDATE marketplace.products SET stock_quantity = stock_quantity - $1 WHERE id = $2',
                [item.quantity, item.product_id]
            );
        }
        const order = await client.query(
            `INSERT INTO marketplace.orders (user_id, total_amount)
             VALUES ($1, $2) RETURNING *`,
            [req.user.id, finalTotal]
        );
```

The `FOR UPDATE` lock is correct, but the window between the SELECT and the
UPDATE allows the race. The fix: combine them into a single conditional UPDATE
and check rows affected.

Convention: all routes use `asyncHandler` from `routes/middleware.js`; the
transaction pattern (BEGIN / ROLLBACK / COMMIT / finally release) used here is
already correct — only the inner loop changes.

## Commands you will need

| Purpose | Command | Expected on success |
|---------|---------|---------------------|
| Syntax check | `node -e "require('./routes/orders')"` | exits 0, no output |
| Run order tests | `node tests/orders.test.js` | All pass |
| Run all tests | `node tests/run.js` | All pass |

## Scope

**In scope**:
- `routes/orders.js` — only the transaction loop (approx. lines 28–41)

**Out of scope**:
- `routes/cart.js` — cart stock check is a read-only guard, not transactional; acceptable to leave as-is
- Any schema changes — no DDL needed

## Steps

### Step 1: Replace the two-query lock+decrement with a single atomic UPDATE

Inside the `for (const item of items.rows)` loop, replace the existing two
queries (the SELECT … FOR UPDATE, then the UPDATE) with a single conditional
UPDATE that returns the new stock value:

**Remove** (the current loop body):
```js
            const stock = await client.query(
                'SELECT stock_quantity FROM marketplace.products WHERE id = $1 FOR UPDATE',
                [item.product_id]
            );
            if (!stock.rows.length || stock.rows[0].stock_quantity < item.quantity) {
                await client.query('ROLLBACK');
                return res.status(400).json({ error: 'Insufficient stock for product' });
            }
            await client.query(
                'UPDATE marketplace.products SET stock_quantity = stock_quantity - $1 WHERE id = $2',
                [item.quantity, item.product_id]
            );
```

**Replace with**:
```js
            const stockUpdate = await client.query(
                `UPDATE marketplace.products
                 SET stock_quantity = stock_quantity - $1
                 WHERE id = $2 AND stock_quantity >= $1
                 RETURNING stock_quantity`,
                [item.quantity, item.product_id]
            );
            if (!stockUpdate.rows.length) {
                await client.query('ROLLBACK');
                return res.status(400).json({ error: 'Insufficient stock for product' });
            }
```

This is atomic: the condition `stock_quantity >= $1` and the decrement happen
in a single statement under PostgreSQL's MVCC. If two transactions race, only
one will update the row and get a result; the other gets zero rows and rolls back.

**Verify**: `node -e "require('./routes/orders')"` → exits 0.

### Step 2: Run tests

**Verify**: `node tests/orders.test.js` → all pass.  
**Verify**: `node tests/run.js` → all pass.

## Test plan

Add to `tests/orders.test.js`:

1. **Concurrent order simulation**: Create a product with `stock_quantity = 1`.
   Fire two near-simultaneous POST `/api/orders` requests. Assert exactly one
   succeeds (201) and one fails (400 "Insufficient stock"). (If the test
   environment can't simulate true concurrency, at minimum verify the single
   unit is decremented to 0 after one successful order.)
2. **Zero stock rejection**: Cart with a product at `stock_quantity = 0`; POST
   `/api/orders` → 400.
3. **Exact stock consumed**: Cart with quantity 3 on a product with 5 stock;
   POST succeeds; verify `stock_quantity` is now 2 in DB.

## Done criteria

- [ ] `node -e "require('./routes/orders')"` exits 0
- [ ] `node tests/orders.test.js` exits 0, includes concurrency / zero-stock / consumed tests
- [ ] `node tests/run.js` exits 0
- [ ] `grep -n "FOR UPDATE" routes/orders.js` returns no matches (the old lock-then-update pattern is gone)
- [ ] Only `routes/orders.js` and `tests/orders.test.js` modified
- [ ] `plans/README.md` status row updated to DONE

## STOP conditions

- Code at `routes/orders.js` transaction loop doesn't match "Current state" excerpt above (drift).
- The `marketplace.products` table doesn't have a `stock_quantity` column — STOP, schema differs from assumption.
- After the change, a test shows that a valid order fails with "Insufficient stock" when stock should be sufficient — the WHERE condition may have a bug; STOP and report.

## Maintenance notes

- This pattern (conditional UPDATE returning rows) is the idiomatic PostgreSQL
  approach for atomic check-and-decrement. If stock is ever managed via a
  separate inventory table in future, the same pattern applies there.
- The `cart.js` stock check (`product.rows[0].stock_quantity < quantity`) is a
  UX guard, not a financial guard — it's fine to leave as a non-transactional
  read. Don't remove it; it gives users earlier feedback.
