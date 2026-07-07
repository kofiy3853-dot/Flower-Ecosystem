# Plan 012: Fix /api/messages mounted to wrong (notifications) router

> **Executor instructions**: Follow this plan step by step. STOP on any STOP
> condition. Update `plans/README.md` when done.
>
> **Drift check (run first)**: `git diff --stat 9d726ad..HEAD -- server.js routes/notifications.js`
> Compare "Current state" excerpts. On mismatch, STOP.

## Status

- **Priority**: P2
- **Effort**: S
- **Risk**: LOW
- **Depends on**: none
- **Category**: bug
- **Planned at**: commit `9d726ad`, 2026-07-07

## Why this matters

`server.js:321` mounts `/api/messages` to `routes/notifications.js`:
```js
app.use('/api/messages', require('./routes/notifications'));
```
The notifications router was not designed to handle messaging endpoints. The
WebSocket messaging system (`server.js:384–468`) handles real-time delivery,
but there is no REST router for persisted message history or conversation
management. As a result, REST calls to `/api/messages/*` hit notification
endpoints, returning notification data (or 404s) instead of message data.

## Current state

**`server.js` lines 320–322**:
```js
app.use('/api/notifications', require('./routes/notifications'));
app.use('/api/messages', require('./routes/notifications'));   // BUG: same router
```

**`routes/notifications.js`** (6048 bytes) — handles only notification-related
endpoints (`GET /`, `PUT /:id/read`, etc.). No message CRUD.

**`js/messages.html`** and the `messages.html` page exist — the frontend
expects REST endpoints at `/api/messages`.

## Commands you will need

| Purpose | Command | Expected |
|---------|---------|----------|
| Syntax check | `node -e "require('./server')" 2>&1 \| head -5` | No crash |
| All tests | `node tests/run.js` | All pass |

## Scope

**In scope**:
- `server.js` — line 321 only
- `routes/messages.js` — create if it doesn't exist

**Out of scope**:
- `routes/notifications.js` — do not modify
- WebSocket message delivery in `server.js:384–468` — do not modify

## Steps

### Step 1: Check if a messages router exists

Run: `dir routes\messages.js` (Windows) or `ls routes/messages.js`

**If it exists** → skip to Step 3.  
**If it does NOT exist** → proceed to Step 2.

### Step 2: Create a minimal messages router

Create `routes/messages.js` with the following placeholder implementation
(enough to stop 404s and provide a place for future message CRUD):

```js
const router = require('express').Router();
const { pool, asyncHandler, dbAvailable, requireAuth } = require('./middleware');

// GET /api/messages — list conversations for the authenticated user
router.get('/conversations', requireAuth, asyncHandler(async (req, res) => {
    if (!(await dbAvailable())) return res.status(503).json({ error: 'Database unavailable' });
    try {
        // Placeholder: return empty until message persistence schema is built
        const r = await pool.query(
            `SELECT DISTINCT
                CASE WHEN sender_id = $1 THEN recipient_id ELSE sender_id END AS other_user_id,
                MAX(created_at) AS last_message_at
             FROM messages.messages
             WHERE sender_id = $1 OR recipient_id = $1
             GROUP BY other_user_id
             ORDER BY last_message_at DESC`,
            [req.user.id]
        ).catch(() => ({ rows: [] }));
        res.json(r.rows);
    } catch {
        res.json([]);
    }
}));

// GET /api/messages/:userId — get messages between current user and another user
router.get('/:userId', requireAuth, asyncHandler(async (req, res) => {
    if (!(await dbAvailable())) return res.status(503).json({ error: 'Database unavailable' });
    try {
        const r = await pool.query(
            `SELECT * FROM messages.messages
             WHERE (sender_id = $1 AND recipient_id = $2)
                OR (sender_id = $2 AND recipient_id = $1)
             ORDER BY created_at ASC`,
            [req.user.id, req.params.userId]
        ).catch(() => ({ rows: [] }));
        res.json(r.rows);
    } catch {
        res.json([]);
    }
}));

module.exports = router;
```

> **STOP condition**: If `messages.messages` schema does not exist in the DB,
> the `.catch(() => ({ rows: [] }))` fallbacks mean the endpoints return empty
> arrays rather than erroring — this is acceptable for the stub. Do not
> attempt to create the schema in this plan.

**Verify**: `node -e "require('./routes/messages')"` → exits 0.

### Step 3: Update server.js to use the correct router

In `server.js`, change line 321:

**Replace**:
```js
app.use('/api/messages', require('./routes/notifications'));
```

**With**:
```js
app.use('/api/messages', require('./routes/messages'));
```

**Verify**: `node -e "require('./server')" 2>&1 | head -5` → no crash, no
"module not found" errors.

### Step 4: Run all tests

**Verify**: `node tests/run.js` → all pass.

## Done criteria

- [ ] `grep -n "notifications" server.js` — line 321 no longer points to notifications
- [ ] `node -e "require('./routes/messages')"` exits 0
- [ ] `node tests/run.js` exits 0
- [ ] Only `server.js` and `routes/messages.js` modified
- [ ] `plans/README.md` status updated

## STOP conditions

- `routes/messages.js` already exists and contains a full implementation —
  verify it's already wired correctly; if so, only Step 3 is needed.
- The `messages.messages` table doesn't exist and the frontend makes hard
  requests to `/api/messages/conversations` that are now returning empty arrays
  instead of real data — this is expected; log it and proceed. Full message
  persistence is a separate direction-level feature.

## Maintenance notes

- The `routes/messages.js` created here is a stub. Full implementation requires
  a `messages.messages` DB table (schema not in scope here) and CRUD endpoints.
- Real-time delivery is already handled by the WebSocket server — the REST
  endpoints here serve message history on page load.
