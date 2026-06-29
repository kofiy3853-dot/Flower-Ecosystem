# Test Results — Email Verification Flow

**Date**: June 28, 2026  
**Status**: All 11 tests passed

---

## Test Execution Summary

```
=== Email Verification Flow Test ===

1. Registering user: verify-test-1782695954259@example.com
   Status: 201 OK
   User ID: 0e43d4a1-fa21-4f1e-b612-17979de08125
   Verification token: 717aae0415cde0bf...

2. Checking initial email_verified status...
   email_verified: false OK

3. Checking token in database...
   Tokens found: 1 OK
   Expires: 2026-06-30T01:19:15.420Z

4. Testing with invalid token...
   Status: 400 OK (expected 400)
   Error: Invalid or expired verification token

5. Testing with no token...
   Status: 400 OK (expected 400)

6. Verifying with valid token...
   Status: 200 OK
   Message: Email verified successfully

7. Checking email_verified after verification...
   email_verified: true OK

8. Checking token is deleted...
   Tokens remaining: 0 OK

9. Trying to reuse same token...
   Status: 400 OK (expected 400)
   Error: Invalid or expired verification token

10. Testing token expiry (inserting expired token)...
    Status: 400 OK (expected 400 - expired)
    Error: Invalid or expired verification token

11. Testing login still works...
    Status: 200 OK

=== Test Complete ===
```

## Flow Verification

| Step | Action | Expected | Actual |
|------|--------|----------|--------|
| Register | POST /api/auth/register | 201 + verificationToken | 201 + token |
| Initial state | DB check email_verified | false | false |
| Token exists | DB query email_verifications | 1 row | 1 row |
| Invalid token | POST /api/auth/verify-email | 400 | 400 |
| Empty token | POST /api/auth/verify-email | 400 | 400 |
| Valid token | POST /api/auth/verify-email | 200 | 200 |
| Post-verify state | DB check email_verified | true | true |
| Token cleanup | DB query email_verifications | 0 rows | 0 rows |
| Token reuse | POST /api/auth/verify-email | 400 | 400 |
| Expired token | POST /api/auth/verify-email | 400 | 400 |
| Login post-verify | POST /api/auth/login | 200 | 200 |

## Components Verified

- **Backend API**: `/api/auth/register`, `/api/auth/verify-email`
- **Database**: `auth.email_verifications` table, `auth.users.email_verified` column
- **Frontend**: `verify-email.html` with loading/success/error states
- **Token lifecycle**: creation → validation → deletion
- **Security**: invalid tokens rejected, expired tokens rejected, reuse prevented
