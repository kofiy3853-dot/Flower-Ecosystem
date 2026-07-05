# Seed User Passwords

All users created by the seed script (`scripts/seed-all.js`) use the same default password:

**Default password: `password123`**

## Seeded Users

| Email | Role | Password |
|-------|------|----------|
| jane@example.com | Customer | password123 |
| seller@example.com | Seller | password123 |
| seller1@example.com | Seller | password123 |
| seller2@example.com | Seller | password123 |
| admin@flower.com | Admin | (set during init) |

## Notes

- This file is for development/testing purposes only
- In production, all users should change their passwords after first login
- Never commit real passwords to version control
