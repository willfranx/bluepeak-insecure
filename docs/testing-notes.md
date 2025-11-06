# Testing Notes - Chris Daniels
Test: DB connected and route returns data
Command: GET `**<BASE>**`/api/users
Observed: 200 OK, JSON list of 5 seeded users
Risk: n/a
Fix: n/a

Test: Password exposure in API response
Command: GET `**<BASE>**`/api/users
Observed: Each user object includes plaintext "password" (from seed and DB)
Risk: High (sensitive data in responses)
Fix: Select explicit columns (userid, name, created_at), never return password fields

Test: Create user works
Command: POST `**<BASE>**`/api/users {"name":"alice","password":"Password123!"}
Observed: 201 Created; (note if response includes pwd)
Risk: High if pwd is visible
Fix: Sanitize response, hash password on insert/update

Test: IDOR potential - get USER by ID
Command: GET `**<BASE>**`/api/users/1 (no auth)
Observed: 200 returns user 1 without ownership check
Risk: High (IDOR)
Fix: ensureAuthenticated + ensureOwnerOr

# Base URL (choose one depending on your environment)
> NOTE: Replace `**<BASE>**` in the commands below with whichever URL applies to you.
### Commands used (examples)
# List users (check DB-backed response)
curl -i `**<BASE>**`/api/users

# Create test user
curl -i -X POST `**<BASE>**`/api/users \
  -H "Content-Type: application/json" \
  -d '{"name":"alice","password":"Password123!"}'

# Get user by id (IDOR check)
curl -i `**<BASE>**`/api/users/1

# Simple SQLi attempt (should be blocked by parameterized queries)
curl -i "`**<BASE>**`/api/users/1' OR '1'='1"

# XSS test (inserting a script as a name to see if reflected)
curl -i -X POST `**<BASE>**`/api/users \
  -H "Content-Type: application/json" \
  -d '{"name":"<script>alert(1)</script>","password":"PwD!23"}'

## Summary
Basic functionality verified using curl. Routes respond successfully, confirming backend–DB connectivity.  
Several high-risk findings identified:
- Passwords returned in plaintext  
- No authorization checks on `/api/users/:id`  
- Lack of input validation on POST requests  

## Things to do next
- Add **bcrypt** password hashing in `userController.js`  
- Implement authentication middleware for sensitive routes  
- Continue testing for SQLi, XSS, and CSRF vulnerabilities  


### Update, things done on Oct 27, 2025  
**Fix:** Removed password field from `/api/users` responses ( used to expose hashed passwords).  
**Why:** prevent data exposure in API outputs.  
**Tested:** Verified locally in  Docker Compose. I Confirmed that API still works correctly and returns safe fields only like userid, name,email, and created_at.  
**Status:** Deployed a branch `fix/remove-password-response` and PR #12 opened for review.
