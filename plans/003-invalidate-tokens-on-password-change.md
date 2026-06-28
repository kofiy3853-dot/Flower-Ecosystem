# Plan 003: Invalidate tokens on password change (covered by Plan 001)

> **NOTE**: This finding (no logout/invalidation on password change) is addressed
> as part of Plan 001 (`001-invalidate-tokens-on-password-reset.md`), which adds
> `blacklistUserTokens` calls to both the reset-password AND password-change
> endpoints. **No separate plan is needed.**
>
> If Plan 001 is executed, finding #6 is fully resolved. This file exists only
> as a reference placeholder for tracking purposes.

## Status

- **Priority**: P1
- **Effort**: — (covered by 001)
- **Risk**: —
- **Depends on**: 001
- **Category**: security
- **Planned at**: commit `646504e`, 2026-06-27

## Covered by

Plan 001, Step 4 — adds `blacklistUserTokens(req.user.id)` to the `PUT /password` handler in `routes/auth.js`.

## Verification

After Plan 001 is executed, confirm in `routes/auth.js`:
- The `PUT /password` handler calls `await blacklistUserTokens(req.user.id)` after the hash update
- All existing tokens for that user are rejected on subsequent requests
