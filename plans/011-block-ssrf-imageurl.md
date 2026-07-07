# Plan 011: Block SSRF via client-supplied imageUrl in AI endpoints

> **Executor instructions**: Follow this plan step by step. Run every
> verification command before moving on. STOP on any STOP condition.
> Update `plans/README.md` when done.
>
> **Drift check (run first)**: `git diff --stat 9d726ad..HEAD -- routes/openai.js`
> Compare "Current state" excerpts. On mismatch, STOP.

## Status

- **Priority**: P2
- **Effort**: S
- **Risk**: LOW
- **Depends on**: none
- **Category**: security
- **Planned at**: commit `9d726ad`, 2026-07-07

## Why this matters

`POST /api/openai/analyze-flower` and `POST /api/openai/flower-expert` accept
an `imageUrl` field from the request body. That URL is passed directly to the
OpenRouter API, which fetches the remote resource. An authenticated user can
supply an internal URL such as `http://localhost:3000/api/admin/...` or a cloud
metadata endpoint, causing the server to make an authenticated request to an
internal resource and relay the response. This is a Server-Side Request Forgery
(SSRF) vulnerability.

## Current state

**`routes/openai.js`** — both handlers contain identical logic at lines 142–146
(analyze-flower) and 187–191 (flower-expert):

```js
    } else if (req.body && req.body.imageUrl) {
        imageUrl = req.body.imageUrl;
    } else {
```

The `imageUrl` string is passed directly to `callOpenRouter` as:
```js
{ type: 'image_url', image_url: { url: imageUrl } }
```

OpenRouter then fetches the URL. There is no validation that `imageUrl` is a
legitimate external image URL.

## Commands you will need

| Purpose | Command | Expected |
|---------|---------|----------|
| Syntax check | `node -e "require('./routes/openai')"` | exits 0 |
| All tests | `node tests/run.js` | All pass |

## Scope

**In scope**:
- `routes/openai.js` — `imageUrl` validation in both POST handlers

**Out of scope**:
- `callOpenRouter` function — do not modify it
- Any schema changes

## Steps

### Step 1: Add a URL validation helper at the top of openai.js

After the existing `parseJsonResponse` function (around line 96), add:

```js
// Allowlisted external URL schemes — rejects localhost, internal IPs, metadata endpoints
const SAFE_IMAGE_URL_RE = /^https:\/\//i;
const BLOCKED_HOSTS_RE = /^https?:\/\/(localhost|127\.|0\.|10\.|172\.(1[6-9]|2\d|3[01])\.|192\.168\.|169\.254\.)/i;

function validateImageUrl(url) {
    if (typeof url !== 'string') return false;
    const trimmed = url.trim();
    if (!SAFE_IMAGE_URL_RE.test(trimmed)) return false;   // must be https://
    if (BLOCKED_HOSTS_RE.test(trimmed)) return false;     // block internal ranges
    if (trimmed.length > 2048) return false;              // sane length cap
    return true;
}
```

**Verify**: `node -e "require('./routes/openai')"` → exits 0.

### Step 2: Apply validation in the analyze-flower handler

In the `router.post('/analyze-flower', ...)` handler, find the else-if block
(around line 142):

**Replace**:
```js
    } else if (req.body && req.body.imageUrl) {
        imageUrl = req.body.imageUrl;
    } else {
```

**With**:
```js
    } else if (req.body && req.body.imageUrl) {
        if (!validateImageUrl(req.body.imageUrl)) {
            return res.status(400).json({ error: 'imageUrl must be a valid external https:// URL' });
        }
        imageUrl = req.body.imageUrl;
    } else {
```

**Verify**: `node -e "require('./routes/openai')"` → exits 0.

### Step 3: Apply validation in the flower-expert handler

Identical change in `router.post('/flower-expert', ...)` around line 187:

**Replace**:
```js
    } else if (req.body && req.body.imageUrl) {
        imageUrl = req.body.imageUrl;
    } else {
```

**With**:
```js
    } else if (req.body && req.body.imageUrl) {
        if (!validateImageUrl(req.body.imageUrl)) {
            return res.status(400).json({ error: 'imageUrl must be a valid external https:// URL' });
        }
        imageUrl = req.body.imageUrl;
    } else {
```

**Verify**: `node -e "require('./routes/openai')"` → exits 0.

### Step 4: Run all tests

**Verify**: `node tests/run.js` → all pass.

## Test plan

If `tests/api.test.js` covers openai endpoints, add:

1. **Valid imageUrl accepted**: POST with `imageUrl: "https://res.cloudinary.com/..."` → proceeds to AI call (mock if needed).
2. **Internal URL blocked**: POST with `imageUrl: "http://localhost:3000/api/admin/users"` → 400.
3. **Metadata URL blocked**: POST with `imageUrl: "http://169.254.169.254/latest/meta-data/"` → 400.
4. **Non-https blocked**: POST with `imageUrl: "http://example.com/flower.jpg"` → 400.

## Done criteria

- [ ] `node -e "require('./routes/openai')"` exits 0
- [ ] `grep -n "validateImageUrl" routes/openai.js` returns at least 2 matches (one per handler)
- [ ] `node tests/run.js` exits 0
- [ ] Only `routes/openai.js` and any updated test file modified
- [ ] `plans/README.md` status updated

## STOP conditions

- The regex blocks a legitimate Cloudinary or CDN URL that the frontend uses
  for imageUrl — verify by testing with the actual CDN domain and adjust allowlist.
- The two handler locations don't match the excerpts (code has moved) — reread
  the file and locate the `else if (req.body && req.body.imageUrl)` blocks.

## Maintenance notes

- If a future use case requires fetching images from a new CDN, add the domain
  to an explicit allowlist rather than loosening the regex.
- `callOpenRouter` itself does not validate the URL it receives — this fix must
  stay at the route layer where request data enters.
