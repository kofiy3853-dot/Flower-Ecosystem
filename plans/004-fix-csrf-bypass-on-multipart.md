# Plan 004: Fix CSRF bypass on multipart form data

> **Executor instructions**: Follow this plan step by step. Run every
> verification command and confirm the expected result before moving to the
> next step. If anything in the "STOP conditions" section occurs, stop and
> report — do not improvise. When done, update the status row for this plan
> in `plans/README.md` — unless a reviewer dispatched you and told you they
> maintain the index.
>
> **Drift check (run first)**: `git diff --stat 646504e..HEAD -- server.js`
> If any in-scope file changed since this plan was written, compare the
> "Current state" excerpts against the live code before proceeding; on a
> mismatch, treat it as a STOP condition.

## Status

- **Priority**: P2
- **Effort**: S
- **Risk**: MED
- **Depends on**: none
- **Category**: security
- **Planned at**: commit `646504e`, 2026-06-27

## Why this matters

The CSRF protection middleware in `server.js` skips the check entirely when `Content-Type` is `multipart/form-data`. This means any POST/PUT/DELETE with a multipart body (e.g. file upload forms like registration with avatar) bypasses CSRF protection. An attacker could craft a malicious page that submits a multipart form to any API endpoint without requiring the `X-Requested-With` or `Authorization` header.

## Current state

- `server.js:44-55` — the CSRF middleware:

```javascript
app.use((req, res, next) => {
    if (['POST', 'PUT', 'PATCH', 'DELETE'].includes(req.method)) {
        const contentType = req.get('Content-Type') || '';
        if (contentType.includes('multipart/form-data')) return next();  // ← BYPASS
        const xRequestedWith = req.get('X-Requested-With');
        if (xRequestedWith !== 'XMLHttpRequest' && !req.get('Authorization')) {
            return res.status(403).json({ error: 'Missing required header' });
        }
    }
    next();
});
```

Line 48: `multipart/form-data` requests skip the `X-Requested-With` / `Authorization` check entirely. This is a deliberate bypass to allow file uploads from HTML forms without JS, but it also opens a CSRF vector.

The endpoints that accept multipart: `POST /api/auth/register` (avatar upload) via `upload.single('avatar')` middleware.

## Commands you will need

| Purpose   | Command                          | Expected on success      |
|-----------|----------------------------------|--------------------------|
| Tests     | `node tests/auth.test.js`        | All pass                 |

## Scope

**In scope**:
- `server.js` — fix the CSRF bypass for multipart

**Out of scope**:
- `routes/auth.js` — the register endpoint itself
- `routes/middleware.js` — upload config
- Client-side form handling

## Git workflow

- Branch: `advisor/004-fix-csrf-bypass-multipart`
- Single commit: `fix(security): enforce CSRF check on multipart form submissions`

## Steps

### Step 1: Add CSRF token support for multipart requests

The best approach is to add a CSRF token mechanism. Since the app uses `X-Requested-With: XMLHttpRequest` as the CSRF header for JSON requests, for multipart we can use the same header OR a hidden form field.

However, adding a full CSRF token system is heavy for this scope. A simpler, proportional fix: **for multipart requests, require either the `Authorization` header OR an `X-CSRF-Token` header that must be set to the session's CSRF token**.

But the simplest fix that maintains compatibility: **remove the multipart bypass and instead check for `X-Requested-With` OR `Authorization` OR a custom CSRF cookie/header combination**.

Given the existing pattern, the cleanest fix is: **require `X-Requested-With: XMLHttpRequest` on multipart too**, since the registration form already uses `FormData` via `fetch()` and can set this header.

Replace the CSRF middleware (lines 44-55) with:

```javascript
app.use((req, res, next) => {
    if (['POST', 'PUT', 'PATCH', 'DELETE'].includes(req.method)) {
        const xRequestedWith = req.get('X-Requested-With');
        const hasAuth = !!req.get('Authorization');
        if (xRequestedWith !== 'XMLHttpRequest' && !hasAuth) {
            return res.status(403).json({ error: 'Missing required header' });
        }
    }
    next();
});
```

This removes the `multipart/form-data` bypass entirely. The `X-Requested-With` header can be set on `FormData` requests via `fetch()` — the client-side `apiRegister` in `js/shared/auth.js:55-66` already does this:

```javascript
async function apiRegister(formData) {
    const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'X-Requested-With': 'XMLHttpRequest' },
        body: formData
    });
    ...
}
```

So the client already sends `X-Requested-With` on multipart — the bypass was unnecessary.

**Verify**: Open `server.js` and confirm:
- The `contentType.includes('multipart/form-data')` line is removed
- The middleware now only checks `X-Requested-With` and `Authorization` for all POST/PUT/PATCH/DELETE

### Step 2: Verify client-side sends the header

Open `js/shared/auth.js` and confirm the `apiRegister` function includes `'X-Requested-With': 'XMLHttpRequest'` in its fetch headers. If it does, no client change is needed.

**Verify**: `js/shared/auth.js:56-59` shows the header is present.

### Step 3: Smoke test

```bash
node tests/auth.test.js
```

Expected: all tests pass (the test helper sends `X-Requested-With: XMLHttpRequest` — see `tests/auth.test.js:11`).

**Verify**: Exit code 0.

## Test plan

- Existing `tests/auth.test.js` covers register with the header present
- Add a manual verification: try a `curl` POST to `/api/auth/register` without `X-Requested-With` and without `Authorization` — should return 403
- No new automated tests needed

## Done criteria

- [ ] `server.js` CSRF middleware no longer contains `multipart/form-data` bypass
- [ ] All POST/PUT/PATCH/DELETE require `X-Requested-With: XMLHttpRequest` or `Authorization`
- [ ] `js/shared/auth.js` `apiRegister` already sends `X-Requested-With` (no change needed)
- [ ] `node tests/auth.test.js` passes
- [ ] No files outside the in-scope list are modified

## STOP conditions

- `server.js` CSRF middleware doesn't match the "Current state" excerpt
- `js/shared/auth.js` does NOT send `X-Requested-With` on register (would require client fix first)
- `node tests/auth.test.js` fails after changes

## Maintenance notes

- If any future multipart endpoint is added via traditional HTML form (no `fetch()`), it will need to either: use JS to set the header, or use a hidden CSRF token field. Document this requirement.
- Consider migrating to proper CSRF tokens (e.g. `csurf` middleware or double-submit cookie) if the app grows beyond the current `X-Requested-With` pattern.
- The `X-Requested-With` header is automatically stripped by some proxies — check production proxy config if 403 errors appear on multipart after this change.
