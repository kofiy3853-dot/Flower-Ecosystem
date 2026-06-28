# Flower Ecosystem — Full Audit Report

**Date**: June 28, 2026  
**Scope**: Full codebase — 20 route modules, 30+ HTML pages, 15 JS modules, 17 SQL files  
**Commits analyzed**: Last 20 (all bug fixes and UI polish on main branch)

---

## Executive Summary

The Flower Ecosystem is a monolithic Express app serving a flower marketplace, learning center, and community platform. While the UI is polished and the feature set is ambitious, the audit reveals several security vulnerabilities, correctness bugs, performance issues, and significant tech debt that should be addressed before scaling.

**Top 3 risks**: Token blacklist broken across restarts (auth bypass), race conditions on stock/events (overselling), and no test coverage for financial/ordering paths.

---

## Finding 1: Token Blacklist Inconsistency (SECURITY/BUG)

**Severity**: HIGH  
**Files**: `routes/middleware.js:42-71, 190`  
**What**: `blacklistUserTokens` stores raw `user:ID` strings in the in-memory Set, but the database stores SHA-256 hashes. After a server restart, the in-memory Set empties and the DB hashes cannot be matched by the raw-string check in `requireAuth`.  
**Impact**: A deactivated or password-changed user retains a valid JWT until the token naturally expires.  
**Fix**: Normalize both layers to use the same hash representation, or rely solely on DB lookups with a cache layer.

---

## Finding 2: CSP Allows Unsafe Inline Scripts (SECURITY)

**Severity**: HIGH  
**File**: `server.js:21-22`  
**What**: Content Security Policy includes `'unsafe-inline'` for both `scriptSrc` and `scriptSrcAttr`.  
**Impact**: Any XSS vector becomes full code execution because the browser will run inline scripts.  
**Fix**: Move all inline JS to bundled files, use per-request nonces, convert onclick handlers to addEventListener.

---

## Finding 3: Race Condition on Stock Decrement (CORRECTNESS)

**Severity**: HIGH  
**File**: `routes/orders.js:28-59`  
**What**: Stock is checked with `FOR UPDATE` then decremented in a separate loop after order item inserts. The deferred UPDATE creates a window for concurrent requests.  
**Impact**: Two buyers purchasing the last unit simultaneously can both pass the stock check.  
**Fix**: Move stock decrement immediately after the `FOR UPDATE` check, within the same loop iteration.

---

## Finding 4: Unauthenticated File Upload Endpoints (SECURITY)

**Severity**: MEDIUM  
**Files**: `routes/openai.js:36, 112`, `routes/misc.js:66`  
**What**: AI flower analysis endpoints accept file uploads without authentication. Multer's fileFilter checks extension/MIME but both are client-spoofable.  
**Impact**: Anyone can write files to the server disk.  
**Fix**: Add `requireAuth` middleware to both endpoints.

---

## Finding 5: XSS in Community Post Update (SECURITY)

**Severity**: MEDIUM  
**File**: `routes/community.js:84`  
**What**: The PUT handler receives raw `title` and `content` from `req.body` without calling `escapeHtml()`, unlike the POST handler at line 73.  
**Impact**: Authenticated users can inject HTML/script payloads into existing posts.  
**Fix**: Apply `escapeHtml()` to the COALESCE arguments, matching the create handler pattern.

---

## Finding 6: Race Condition on Event Registration (CORRECTNESS)

**Severity**: MEDIUM  
**File**: `routes/events.js:229-230`  
**What**: Capacity check uses `SELECT COUNT(*)` then `INSERT` as two separate statements with no transaction or locking.  
**Impact**: Two simultaneous registrations for the last seat both succeed, overbooking the event.  
**Fix**: Wrap in a transaction with `SELECT ... FOR UPDATE` on the event row.

---

## Finding 7: Admin Password Logged to stdout (SECURITY)

**Severity**: MEDIUM  
**File**: `server.js:203`  
**What**: The randomly generated admin password is logged via `console.log` during startup.  
**Impact**: Plaintext password appears in container logs and developer terminal scrollback.  
**Fix**: Remove the log statement or write to a secure file instead.

---

## Finding 8: Test Credentials Committed to Repo (SECURITY)

**Severity**: LOW  
**Files**: `t1.json`, `t2.json`, `t.json`  
**What**: Working test account credentials stored in tracked JSON files not in `.gitignore`.  
**Impact**: Anyone with repo access obtains login credentials.  
**Fix**: Delete the files, add to `.gitignore`, deactivate the accounts if they exist in the database.

---

## Finding 9: Empty Catch Blocks on Database Writes (CORRECTNESS)

**Severity**: MEDIUM  
**Files**: `routes/seller.js:22`, `routes/admin.js:29`, `routes/middleware.js:42, 66`  
**What**: Multiple write operations wrapped in `try {} catch {}` with zero logging.  
**Impact**: Failed writes silently return 200 success. Seller profile changes are lost without notification.  
**Fix**: Add `console.error` with context to each catch block; return 500 on critical write failures.

---

## Finding 10: Cart Silently Downgrades to Empty on DB Failure (CORRECTNESS)

**Severity**: MEDIUM  
**File**: `routes/cart.js:49-53`  
**What**: GET `/api/cart` falls through to return `{ items: [], total: 0 }` when the database query fails.  
**Impact**: Customer sees an empty cart during DB hiccups, may re-add items causing duplicates.  
**Fix**: Return 500 with descriptive error instead of falling through to empty data.

---

## Finding 11: N+1 Query for Product Images (PERFORMANCE)

**Severity**: MEDIUM  
**Files**: `routes/products.js:54, 126, 369`, `routes/orders.js:81, 102`  
**What**: Correlated subquery `(SELECT image_url FROM marketplace.product_images WHERE product_id = p.id ...)` runs once per product/order-item.  
**Impact**: Product listing issues 20+ subqueries per page load. Order history scales linearly with item count.  
**Fix**: Replace with lateral joins or a separate images CTE.

---

## Finding 12: Frontend Silently Returns Stale Data on API Failure (CORRECTNESS)

**Severity**: LOW  
**File**: `js/shared/api.js:1583-1597`  
**What**: `apiFetch` falls through to local JSON fallback on any non-200 response with no logging.  
**Impact**: During DB outages, users see hardcoded seed products instead of errors, potentially ordering non-existent items.  
**Fix**: Log `console.warn('API fallback:', url, res.status)` before trying fallback.

---

## Finding 13: No Test Coverage for Orders, Admin, Community (TESTS)

**Severity**: HIGH  
**File**: `tests/run.js`  
**What**: Only 8 of 20 route modules have tests. Financial checkout, admin actions, and community moderation are untested.  
**Impact**: A bad deploy could silently break order creation or allow privilege escalation with no regression safety net.  
**Fix**: Prioritize integration tests for orders (stock validation), admin (role changes), and community (ownership checks).

---

## Finding 14: Validation Tests Test Wrong Code (TESTS)

**Severity**: LOW  
**File**: `tests/validation.test.js:3-21`  
**What**: Defines standalone `isValidEmail`/`isValidPassword` functions and tests those, not the actual route validation logic.  
**Impact**: Route-level validation bugs pass the test suite undetected.  
**Fix**: Rewrite as HTTP integration tests against actual endpoints with malformed payloads.

---

## Finding 15: HTTP Request Helper Duplicated Across 6 Test Files (TECH DEBT)

**Severity**: LOW  
**Files**: `tests/auth.test.js:4-28`, `tests/cart.test.js:4-22`, and 4 others  
**What**: Each test file contains an identical ~20-line `request()` function with minor inconsistencies (some set CSRF header, some don't).  
**Impact**: Bug fixes must be replicated across all files. Inconsistent header behavior means some tests bypass CSRF protection.  
**Fix**: Extract shared helper into `tests/helpers/request.js`.

---

## Finding 16: Buyer Profile Endpoint Lacks Ownership Check on Crops (SECURITY)

**Severity**: MEDIUM  
**File**: `routes/grower.js:67-82`  
**What**: PUT `/api/grower/crops/:id` updates any crop record without verifying the caller owns it.  
**Impact**: Grower A can modify Grower B's crop data by guessing UUIDs.  
**Fix**: Add WHERE clause joining to the caller's grower profile.

---

## Finding 17: No Linting, Formatting, or Pre-commit Hooks (DX)

**Severity**: LOW  
**What**: No ESLint, Prettier, or Husky configuration exists. No pre-commit hooks enforce code quality.  
**Impact**: Code style inconsistencies accumulate across contributors.  
**Fix**: Add ESLint + Prettier config, set up pre-commit hooks.

---

## Finding 18: No README or Onboarding Docs (DX)

**Severity**: LOW  
**What**: The project has no README.md explaining setup, environment variables, or architecture.  
**Impact**: New contributors cannot onboard without reading source code.  
**Fix**: Create README with setup instructions, env var documentation, and architecture overview.

---

## Finding 19: Schema sprawl with 17 SQL files (TECH DEBT)

**Severity**: LOW  
**What**: Database schema is split across 17 separate SQL files with no migration tooling.  
**Impact**: Difficult to track which migrations have been applied, potential for ordering conflicts.  
**Fix**: Consolidate into a single migration system (e.g., node-pg-migrate) with numbered migration files.

---

## Finding 20: Frontend apiFetchWithBody Fails on Non-JSON Responses (BUG)

**Severity**: LOW  
**File**: `js/shared/api.js:1606-1611`  
**What**: Calls `res.json()` without checking content type first; throws cryptic parse error on HTML error pages.  
**Impact**: Users see meaningless error messages instead of actual server errors.  
**Fix**: Check `res.ok` first, try `res.json()` with fallback, throw with extracted message.

---

## Direction Findings (Future Improvements)

1. **Add TypeScript** — The codebase has grown to 20 route modules with no type safety. TypeScript would catch many of the null/undefined issues found in this audit.

2. **Implement proper migration tooling** — With 17 SQL files and growing, a migration system would prevent schema drift and ordering issues.

3. **Add CI/CD pipeline** — No GitHub Actions or automated testing on push. A basic pipeline running tests + lint on PR would catch regressions.

4. **Consolidate frontend JavaScript** — Multiple pages duplicate similar patterns (search, filters, pagination). A shared component system would reduce maintenance burden.

---

## Summary by Category

| Category | Count | Severity |
|----------|-------|----------|
| Security | 6 | 2 HIGH, 3 MED, 1 LOW |
| Correctness | 5 | 1 HIGH, 3 MED, 1 LOW |
| Performance | 1 | 1 MED |
| Tests | 3 | 1 HIGH, 2 LOW |
| Tech Debt | 3 | 3 LOW |
| DX | 2 | 2 LOW |

## Recommended Priority Order

1. Fix token blacklist consistency (Finding 1) — auth bypass risk
2. Fix stock decrement race condition (Finding 3) — financial loss risk  
3. Add auth to file upload endpoints (Finding 4) — disk abuse risk
4. Fix event registration race (Finding 6) — overbooking risk
5. Add order/admin test coverage (Finding 13) — regression safety
6. Fix CSP unsafe-inline (Finding 2) — XSS amplification
7. Address remaining MEDIUM findings
8. Tackle LOW findings as capacity allows
