# Plan 002: Fix broken token blacklist cleanup logic

> **Executor instructions**: Follow this plan step by step. Run every
> verification command and confirm the expected result before moving to the
> next step. If anything in the "STOP conditions" section occurs, stop and
> report — do not improvise. When done, update the status row for this plan
> in `plans/README.md` — unless a reviewer dispatched you and told you they
> maintain the index.
>
> **Drift check (run first)**: `git diff --stat 646504e..HEAD -- routes/middleware.js`
> If any in-scope file changed since this plan was written, compare the
> "Current state" excerpts against the live code before proceeding; on a
> mismatch, treat it as a STOP condition.

## Status

- **Priority**: P2
- **Effort**: S
- **Risk**: LOW
- **Depends on**: none
- **Category**: bug
- **Planned at**: commit `646504e`, 2026-06-27

## Why this matters

The `cleanupBlacklist()` function has a race condition: it deletes ALL entries from the in-memory `Set` synchronously, then asynchronously fetches valid entries from the DB and re-adds them. During the async window (which can be tens of milliseconds or more under load), all previously blacklisted tokens are temporarily valid — an attacker with a revoked token could use it during this window.

## Current state

- `routes/middleware.js:45-58` — the broken `cleanupBlacklist()` function:

```javascript
function cleanupBlacklist() {
    const now = Date.now();
    for (const hash of blacklistedTokens) {
        blacklistedTokens.delete(hash);
    }
    pool.query('DELETE FROM auth.token_blacklist WHERE expires_at < CURRENT_TIMESTAMP').catch(() => {});
    pool.query('SELECT token_hash, expires_at FROM auth.token_blacklist').then(r => {
        for (const row of r.rows) {
            if (new Date(row.expires_at).getTime() > now) {
                blacklistedTokens.add(row.token_hash);
            }
        }
    }).catch(() => {});
}
```

Bug: the `for...of` loop on line 47-49 deletes every entry, then the DB query re-adds valid ones. Between the delete and the re-add, all blacklisted tokens pass the check.

## Commands you will need

| Purpose   | Command                          | Expected on success      |
|-----------|----------------------------------|--------------------------|
| Tests     | `node tests/auth.test.js`        | All pass                 |

## Scope

**In scope**:
- `routes/middleware.js` — rewrite `cleanupBlacklist`

**Out of scope**:
- `routes/auth.js` — callers of `cleanupBlacklist` are unaffected
- DB schema changes
- Client-side code

## Git workflow

- Branch: `advisor/002-fix-blacklist-cleanup`
- Single commit: `fix(auth): fix token blacklist cleanup race condition`

## Steps

### Step 1: Rewrite `cleanupBlacklist` in `routes/middleware.js`

Replace the entire `cleanupBlacklist` function (lines 45-58) with:

```javascript
function cleanupBlacklist() {
    const now = Date.now();
    pool.query('DELETE FROM auth.token_blacklist WHERE expires_at < CURRENT_TIMESTAMP').catch(() => {});
    pool.query('SELECT token_hash, expires_at FROM auth.token_blacklist').then(r => {
        const validHashes = new Set();
        for (const row of r.rows) {
            if (new Date(row.expires_at).getTime() > now) {
                validHashes.add(row.row_token_hash);
            }
        }
        for (const hash of blacklistedTokens) {
            if (!validHashes.has(hash)) {
                blacklistedTokens.delete(hash);
            }
        }
    }).catch(() => {});
}
```

Key changes:
1. Delete expired DB rows first (fire-and-forget, no change to behavior)
2. Fetch ALL valid (non-expired) rows from DB into a temporary `validHashes` Set
3. Only remove from the in-memory `blacklistedTokens` those hashes NOT found in the DB's valid set
4. This eliminates the race condition — tokens are never temporarily un-blacklisted

**Verify**: Open `routes/middleware.js` and confirm:
- `cleanupBlacklist` creates a `validHashes` Set
- The `for...of` loop on `blacklistedTokens` only deletes hashes NOT in `validHashes`
- No full wipe of `blacklistedTokens` occurs

### Step 2: Smoke test

```bash
node tests/auth.test.js
```

Expected: all tests pass.

**Verify**: Exit code 0.

## Test plan

- Existing tests cover auth flow; no new tests needed for this internal logic fix
- Manual verification: blacklisted token should remain rejected even during cleanup cycle

## Done criteria

- [ ] `cleanupBlacklist` in `routes/middleware.js` no longer wipes all entries before re-adding
- [ ] Only expired entries are removed from in-memory Set
- [ ] `node tests/auth.test.js` passes
- [ ] No files outside the in-scope list are modified

## STOP conditions

- `routes/middleware.js` at the cleanupBlacklist location doesn't match the "Current state" excerpt
- `node tests/auth.test.js` fails after changes

## Maintenance notes

- The cleanup function runs every 5 minutes (setInterval in `routes/auth.js:8-13`)
- If a Redis-based blacklist is adopted later, this function becomes unnecessary
- The DB cleanup (`DELETE ... WHERE expires_at < CURRENT_TIMESTAMP`) is already fire-and-forget and doesn't affect correctness
