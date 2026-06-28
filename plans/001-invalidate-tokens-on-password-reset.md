# Plan 001: Invalidate existing tokens on password reset

> **Executor instructions**: Follow this plan step by step. Run every
> verification command and confirm the expected result before moving to the
> next step. If anything in the "STOP conditions" section occurs, stop and
> report — do not improvise. When done, update the status row for this plan
> in `plans/README.md` — unless a reviewer dispatched you and told you they
> maintain the index.
>
> **Drift check (run first)**: `git diff --stat 646504e..HEAD -- routes/auth.js routes/middleware.js`
> If any in-scope file changed since this plan was written, compare the
> "Current state" excerpts against the live code before proceeding; on a
> mismatch, treat it as a STOP condition.

## Status

- **Priority**: P1
- **Effort**: S
- **Risk**: LOW
- **Depends on**: none
- **Category**: security
- **Planned at**: commit `646504e`, 2026-06-27

## Why this matters

When a user resets their password, their existing JWT remains valid for up to 7 days. An attacker who compromised a token (e.g. via XSS, shared computer, leaked localStorage) retains access even after the legitimate user resets their password. The fix is to blacklist all tokens belonging to that user at reset time.

## Current state

- `routes/auth.js:166-188` — the `reset-password` endpoint updates the password hash and marks the reset token as used, but does nothing about existing JWTs
- `routes/auth.js:56` — JWTs are signed with `{ id, email, role }` and expire in 7d
- `routes/middleware.js:30-43` — `blacklistToken(token)` hashes a token with SHA-256, stores the hash in `blacklistedTokens` Set and in `auth.token_blacklist` table
- `routes/middleware.js:169-182` — `requireAuth` checks `isTokenBlacklisted(token)` after verifying the JWT
- `sql/auth-fixes.sql:6-15` — `auth.token_blacklist` table has `token_hash`, `user_id`, `expires_at`

The current blacklist approach is per-token, not per-user. We need to add a user-level invalidation mechanism.

## Commands you will need

| Purpose   | Command                              | Expected on success          |
|-----------|--------------------------------------|------------------------------|
| Tests     | `node tests/auth.test.js`            | All pass                     |
| Verify    | `node -e "..."` (inline smoke test)  | Exit 0, no errors            |

## Scope

**In scope**:
- `routes/auth.js` — add user-level token invalidation in `reset-password`
- `routes/middleware.js` — add a user-level blacklist function
- `sql/auth-fixes.sql` — add a `password_changed_at` column to `auth.users`

**Out of scope**:
- `js/shared/auth.js` — client-side code stays as-is
- Any change to JWT payload shape or expiration
- Email sending infrastructure (email verification remains unimplemented)

## Git workflow

- Branch: `advisor/001-invalidate-tokens-on-password-reset`
- Single commit for the complete change
- Message: `fix(auth): invalidate all user tokens on password reset`

## Steps

### Step 1: Add `password_changed_at` column to `auth.users`

Edit `sql/auth-fixes.sql`. Add at the end of the file:

```sql
-- Add password_changed_at for user-level token invalidation
ALTER TABLE auth.users ADD COLUMN IF NOT EXISTS password_changed_at TIMESTAMP;
```

This column is `NULL` initially (tokens are valid) and gets set on password reset/change.

**Verify**: Open `sql/auth-fixes.sql` and confirm the new `ALTER TABLE` line exists at the end.

### Step 2: Add user-level token invalidation in `routes/middleware.js`

In `routes/middleware.js`, add a new function `blacklistUserTokens` after the existing `blacklistToken` function (after line 43). This function stores a user-level timestamp that causes all older tokens to be rejected:

```javascript
async function blacklistUserTokens(userId) {
    try {
        const hash = crypto.createHash('sha256').update(`user:${userId}`).digest('hex');
        blacklistedTokens.add(`user:${userId}`);
        await pool.query(
            'INSERT INTO auth.token_blacklist (token_hash, user_id, expires_at) VALUES ($1, $2, CURRENT_TIMESTAMP + INTERVAL \'7 days\') ON CONFLICT DO NOTHING',
            [hash, userId]
        );
    } catch {}
}
```

Then update `requireAuth` (lines 169-182) to also check user-level blacklisting. After the existing `isTokenBlacklisted` check, add:

```javascript
if (blacklistedTokens.has(`user:${decoded.id}`)) {
    return res.status(401).json({ error: 'Token has been revoked' });
}
```

Updated `requireAuth`:

```javascript
function requireAuth(req, res, next) {
    const header = req.headers.authorization;
    if (!header) return res.status(401).json({ error: 'Authorization required' });
    try {
        const token = header.replace('Bearer ', '');
        const decoded = jwt.verify(token, JWT_SECRET);
        req.user = decoded;
        if (isTokenBlacklisted(token) || blacklistedTokens.has(`user:${decoded.id}`)) {
            return res.status(401).json({ error: 'Token has been revoked' });
        }
        next();
    } catch {
        res.status(401).json({ error: 'Invalid or expired token' });
    }
}
```

Export the new function: add `blacklistUserTokens` to the `module.exports` object.

**Verify**: Open `routes/middleware.js` and confirm `blacklistUserTokens` is defined and exported, and `requireAuth` checks `blacklistedTokens.has(\`user:${decoded.id}\`)`.

### Step 3: Call `blacklistUserTokens` in the reset-password endpoint

In `routes/auth.js`, update the `reset-password` endpoint (line 166). Import `blacklistUserTokens` from middleware (add it to the require on line 5):

```javascript
const { pool, JWT_SECRET, upload, rateLimiter, asyncHandler, dbAvailable, requireAuth, blacklistToken, blacklistUserTokens, cleanupBlacklist } = require('./middleware');
```

Then, after the password hash update and before the response (between current lines 186 and 187), add:

```javascript
await blacklistUserTokens(user.id);
```

To get the `user.id`, modify the query on line 177 to also SELECT the user's ID:

```javascript
const r = await pool.query(
    'SELECT email, user_id FROM auth.password_resets WHERE token = $1 AND expires_at > CURRENT_TIMESTAMP AND used = FALSE',
    [token]
);
```

Wait — the `password_resets` table stores `email`, not `user_id`. We need to look up the user by email. After the existing SELECT (line 177-180), add:

```javascript
const userResult = await pool.query('SELECT id FROM auth.users WHERE email = $1', [r.rows[0].email]);
if (userResult.rows.length) {
    await blacklistUserTokens(userResult.rows[0].id);
}
```

Full updated `reset-password` handler:

```javascript
router.post('/reset-password', rateLimiter(5, 60000), asyncHandler(async (req, res) => {
    const { token, password } = req.body;
    if (!token || !password) {
        return res.status(400).json({ error: 'Token and password are required' });
    }
    if (typeof password !== 'string' || password.length < 8) {
        return res.status(400).json({ error: 'Password must be at least 8 characters' });
    }
    if (!(await dbAvailable())) {
        return res.status(503).json({ error: 'Service unavailable' });
    }
    const r = await pool.query(
        'SELECT email FROM auth.password_resets WHERE token = $1 AND expires_at > CURRENT_TIMESTAMP AND used = FALSE',
        [token]
    );
    if (!r.rows.length) {
        return res.status(400).json({ error: 'Invalid or expired token' });
    }
    const hash = await bcrypt.hash(password, 12);
    await pool.query('UPDATE auth.users SET password_hash = $1 WHERE email = $2', [hash, r.rows[0].email]);
    await pool.query('UPDATE auth.password_resets SET used = TRUE WHERE token = $1', [token]);

    // Invalidate all existing tokens for this user
    const userResult = await pool.query('SELECT id FROM auth.users WHERE email = $1', [r.rows[0].email]);
    if (userResult.rows.length) {
        await blacklistUserTokens(userResult.rows[0].id);
    }

    res.json({ message: 'Password reset successfully' });
}));
```

**Verify**: Open `routes/auth.js` and confirm `blacklistUserTokens` is imported and called in `reset-password`.

### Step 4: Also invalidate tokens on password change

In `routes/auth.js`, update the `PUT /password` handler (line 203). After updating the password hash (line 219), add:

```javascript
await blacklistUserTokens(req.user.id);
```

The full handler becomes:

```javascript
router.put('/password', requireAuth, asyncHandler(async (req, res) => {
    if (!(await dbAvailable())) {
        return res.status(503).json({ error: 'Database unavailable' });
    }
    const { current_password, new_password } = req.body;
    if (!current_password || !new_password) {
        return res.status(400).json({ error: 'Current and new password are required' });
    }
    if (new_password.length < 8) {
        return res.status(400).json({ error: 'New password must be at least 8 characters' });
    }
    const r = await pool.query('SELECT password_hash FROM auth.users WHERE id = $1', [req.user.id]);
    if (!r.rows.length) return res.status(404).json({ error: 'User not found' });
    const valid = await bcrypt.compare(current_password, r.rows[0].password_hash);
    if (!valid) return res.status(401).json({ error: 'Current password is incorrect' });
    const hash = await bcrypt.hash(new_password, 12);
    await pool.query('UPDATE auth.users SET password_hash = $1 WHERE id = $2', [hash, req.user.id]);
    await blacklistUserTokens(req.user.id);
    res.json({ message: 'Password updated successfully' });
}));
```

**Verify**: Open `routes/auth.js` and confirm `blacklistUserTokens(req.user.id)` is called in the `PUT /password` handler.

### Step 5: Smoke test

Start the server and run auth tests:

```bash
node tests/auth.test.js
```

Expected: all tests pass.

**Verify**: Exit code 0, output shows all tests passing.

## Test plan

- Existing `tests/auth.test.js` covers register, login, token structure, role registration
- Add a manual smoke test: register, get token, reset password, confirm old token is rejected (this would require a live DB; document as manual verification)
- No new automated tests needed for this plan since it requires DB integration

## Done criteria

- [ ] `sql/auth-fixes.sql` contains `ALTER TABLE auth.users ADD COLUMN IF NOT EXISTS password_changed_at TIMESTAMP`
- [ ] `routes/middleware.js` exports `blacklistUserTokens`
- [ ] `routes/middleware.js` `requireAuth` checks `blacklistedTokens.has(\`user:${decoded.id}\`)`
- [ ] `routes/auth.js` `reset-password` calls `blacklistUserTokens`
- [ ] `routes/auth.js` `PUT /password` calls `blacklistUserTokens`
- [ ] `node tests/auth.test.js` passes
- [ ] No files outside the in-scope list are modified (`git status`)

## STOP conditions

- The code at the locations in "Current state" doesn't match the excerpts
- `node tests/auth.test.js` fails after changes
- The `auth.token_blacklist` table schema doesn't match what's expected (check with `sql/auth-fixes.sql`)

## Maintenance notes

- The `password_changed_at` column is available for future use (e.g. JWT expiry tied to password change time)
- If JWT payload is later changed to include `iat`, it could be used instead of user-level blacklisting for per-token granularity
- The user-level blacklist entry expires after 7 days (matching JWT expiry) — no stale entries accumulate indefinitely
