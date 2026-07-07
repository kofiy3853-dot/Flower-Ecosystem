# Plan 007: Add ownership checks to grower crop PUT and DELETE endpoints

> **Executor instructions**: Follow this plan step by step. Run every
> verification command before moving to the next step. STOP and report on any
> STOP condition. When done, update the status row in `plans/README.md`.
>
> **Drift check (run first)**: `git diff --stat 9d726ad..HEAD -- routes/grower.js`
> Compare "Current state" excerpts against live code. On mismatch, STOP.

## Status

- **Priority**: P1
- **Effort**: S
- **Risk**: LOW
- **Depends on**: none
- **Category**: security
- **Planned at**: commit `9d726ad`, 2026-07-07

## Why this matters

`PUT /api/grower/crops/:id` and `DELETE /api/grower/crops/:id` update/delete
any crop record whose ID matches the URL parameter, without verifying the
caller owns that crop. This is a classic IDOR (Insecure Direct Object
Reference): Grower A can destroy or modify Grower B's crop data by guessing or
brute-forcing a UUID. The crop health POST (`/crops/:id/health`) has the same
gap.

## Current state

**`routes/grower.js`** — the only file to modify.

**Grower profile association** (lines 53–65 — shows how grower_id is resolved):
```js
router.post('/crops', requireAuth, asyncHandler(async (req, res) => {
    ...
    const profile = await pool.query('SELECT id FROM growers.profiles WHERE user_id = $1', [req.user.id]);
    if (!profile.rows.length) return res.status(400).json({ error: 'Create a grower profile first' });
    ...
    const r = await pool.query(
        `INSERT INTO growers.crops (grower_id, ...) VALUES ($1, ...) RETURNING *`,
        [profile.rows[0].id, ...]
    );
```

**Vulnerable PUT handler** (lines 67–82) — no ownership check:
```js
router.put('/crops/:id', requireAuth, asyncHandler(async (req, res) => {
    if (!(await dbAvailable())) return res.status(503).json({ error: 'Database unavailable' });
    const { id } = req.params;
    const { flower_name, ... } = req.body;
    const r = await pool.query(
        `UPDATE growers.crops SET flower_name = COALESCE($1, flower_name), ...
         WHERE id = $12 RETURNING *`,
        [flower_name, ..., id]
    );
    if (!r.rows.length) return res.status(404).json({ error: 'Crop not found' });
    res.json(r.rows[0]);
}));
```

**Vulnerable DELETE handler** (lines 84–89) — no ownership check:
```js
router.delete('/crops/:id', requireAuth, asyncHandler(async (req, res) => {
    if (!(await dbAvailable())) return res.status(503).json({ error: 'Database unavailable' });
    const r = await pool.query('DELETE FROM growers.crops WHERE id = $1 RETURNING id', [req.params.id]);
    if (!r.rows.length) return res.status(404).json({ error: 'Crop not found' });
    res.json({ message: 'Crop deleted' });
}));
```

**Vulnerable crop health POST** (lines 91–99) — no ownership check:
```js
router.post('/crops/:id/health', requireAuth, asyncHandler(async (req, res) => {
    ...
    const r = await pool.query(
        'INSERT INTO growers.crop_health (crop_id, ...) VALUES ($1, ...) RETURNING *',
        [req.params.id, ...]
    );
    res.status(201).json(r.rows[0]);
}));
```

Schema: `growers.crops` has a `grower_id` column (FK to `growers.profiles.id`);
`growers.profiles` has a `user_id` column (FK to `auth.users.id`).

## Commands you will need

| Purpose | Command | Expected |
|---------|---------|----------|
| Syntax check | `node -e "require('./routes/grower')"` | exits 0 |
| All tests | `node tests/run.js` | All pass |

## Scope

**In scope**:
- `routes/grower.js` — PUT `/crops/:id`, DELETE `/crops/:id`, POST `/crops/:id/health`

**Out of scope**:
- `routes/grower.js` — other endpoints (profile CRUD, GET crops) — read-only or create; no ownership risk
- Any schema changes

## Steps

### Step 1: Fix the PUT endpoint ownership check

Replace the `UPDATE` query in the PUT handler so that the WHERE clause restricts
to crops owned by the calling user:

**Replace** the `pool.query(...)` call inside `router.put('/crops/:id', ...)`:
```js
    const r = await pool.query(
        `UPDATE growers.crops SET flower_name = COALESCE($1, flower_name), variety = COALESCE($2, variety),
            quantity = COALESCE($3, quantity), growth_stage = COALESCE($4, growth_stage), status = COALESCE($5, status),
            field_location = COALESCE($6, field_location), planting_date = COALESCE($7, planting_date),
            expected_harvest = COALESCE($8, expected_harvest), price_per_unit = COALESCE($9, price_per_unit),
            quality_grade = COALESCE($10, quality_grade), notes = COALESCE($11, notes), updated_at = CURRENT_TIMESTAMP
         WHERE id = $12
           AND grower_id = (SELECT id FROM growers.profiles WHERE user_id = $13)
         RETURNING *`,
        [flower_name, variety, quantity, growth_stage, status, field_location, planting_date,
         expected_harvest, price_per_unit, quality_grade, notes, id, req.user.id]
    );
```

The `if (!r.rows.length)` check below already returns 404, which now correctly
covers both "not found" and "not owned".

**Verify**: `node -e "require('./routes/grower')"` → exits 0.

### Step 2: Fix the DELETE endpoint ownership check

Replace the `pool.query(...)` call inside `router.delete('/crops/:id', ...)`:
```js
    const r = await pool.query(
        `DELETE FROM growers.crops
         WHERE id = $1
           AND grower_id = (SELECT id FROM growers.profiles WHERE user_id = $2)
         RETURNING id`,
        [req.params.id, req.user.id]
    );
```

**Verify**: `node -e "require('./routes/grower')"` → exits 0.

### Step 3: Fix the crop health POST ownership check

The health POST should verify the crop belongs to the calling user before
inserting. Add a pre-check before the INSERT:

```js
router.post('/crops/:id/health', requireAuth, asyncHandler(async (req, res) => {
    if (!(await dbAvailable())) return res.status(503).json({ error: 'Database unavailable' });
    // Verify ownership
    const own = await pool.query(
        `SELECT 1 FROM growers.crops c
         JOIN growers.profiles p ON p.id = c.grower_id
         WHERE c.id = $1 AND p.user_id = $2`,
        [req.params.id, req.user.id]
    );
    if (!own.rows.length) return res.status(403).json({ error: 'Not authorized' });
    const { health_score, issue, issue_type, treatment } = req.body;
    const r = await pool.query(
        'INSERT INTO growers.crop_health (crop_id, health_score, issue, issue_type, treatment) VALUES ($1, $2, $3, $4, $5) RETURNING *',
        [req.params.id, health_score || 100, issue || null, issue_type || null, treatment || null]
    );
    res.status(201).json(r.rows[0]);
}));
```

**Verify**: `node -e "require('./routes/grower')"` → exits 0.

### Step 4: Run all tests

**Verify**: `node tests/run.js` → all pass.

## Test plan

There are no existing tests for `routes/grower.js`. Create
`tests/grower.test.js` modeled after `tests/products.test.js`:

1. **PUT own crop — succeeds**: Grower A updates their own crop → 200.
2. **PUT another's crop — rejected**: Grower A tries to update Grower B's crop
   ID → 404 (indistinguishable from not found, intentional).
3. **DELETE own crop — succeeds**: Grower A deletes their own crop → 200.
4. **DELETE another's crop — rejected**: Grower A tries to delete Grower B's
   crop → 404.
5. **Health POST own crop — succeeds**: → 201.
6. **Health POST another's crop — rejected**: → 403.

## Done criteria

- [ ] `node -e "require('./routes/grower')"` exits 0
- [ ] `node tests/run.js` exits 0
- [ ] `grep -n "WHERE id = \$" routes/grower.js` — the PUT and DELETE queries now include `AND grower_id = ...`
- [ ] Only `routes/grower.js` and `tests/grower.test.js` modified
- [ ] `plans/README.md` status updated to DONE

## STOP conditions

- `growers.profiles` table doesn't have `user_id` column — schema differs from assumption; STOP.
- `growers.crops` table doesn't have `grower_id` column — STOP.
- After Step 1, a test for a valid update fails with 404 (subquery may return no rows — check that the caller has a grower profile before the UPDATE, or the 404 is expected for non-grower callers).

## Maintenance notes

- If admins need to edit/delete any grower's crops, add an OR condition:
  `AND (grower_id = (SELECT id FROM growers.profiles WHERE user_id = $N) OR EXISTS (SELECT 1 FROM auth.users WHERE id = $N AND role IN ('ADMIN','SUPERADMIN')))`.
  Do not add this proactively — wait for the requirement.
