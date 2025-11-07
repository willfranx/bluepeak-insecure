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

### Update, things done on Nov 2, 2025

I ran local curl tests to show how our insecure controllers behave compared to the secure ones. The goal was to reproduce five common web vulnerabilities so Far:

**1. SQL Injection (SQLi)**
Definition: Attackers stick SQL code into user inputs so the app runs unintended database queries.
Why it’s harmful for banking: An attacker can read or change account balances, steal user data, or create fake transactions. Basically escalated privileges for threat actors, and for a bank app that’s basically handing over funds and user records to Threat Actors.

**2. Insecure Direct Object Reference (IDOR)**
Definition: The app lets clients request objects (like /accounts/123) without checking if the caller actually owns them.
Why it’s harmful for banking: Anyone can view or modify other people’s accounts, transfers, or statements just by guessing IDs. Essentially you change the number in the URL and see someone else’s account, and for a banking app that means anyone could enumerate accounts, check balances, move money or see private transaction history which is a huge privacy and fraud risk.

**3. Password Exposure / Data Leak**
Definition: The app returns or stores passwords (or other secrets) in plaintext or otherwise exposes sensitive fields.
Why it’s harmful for banking: On a bank site that’s hamful because people reuse passwords, attackers can break into real accounts, clean out funds or do identity theft. Also leaked personal data can destroys user trust and can lead to big legal troubles for the financial insitutions that oversee the funds.

**4. Stored Cross-Site Scripting (XSS)**
Definition: The app saves attacker-controlled HTML/JS (like <script>) and later serves it to other users unescaped.
Why it’s harmful for banking: Malicious scripts can steal session cookies, perform actions as users, or show fake UIs to trick users into giving credentials or approvals.

**5. Cross-Site Request Forgery (CSRF)**
Definition: A logged-in user’s browser is tricked into sending a state-changing request (like transfer money) from an attacker-controlled page.
Why it’s harmful for banking: If the site trusts cookies and the user views a page, the malicious script runs in their browser. Then an attacker can make a unknowing victim transfer funds, change settings, or authorize payments. For a bank site, that could mean stealing session tokens, auto-initiate transfers, or show fake UI to trick people into giving up 2FA codes, which is a nightmare for everyone involved.

Things done: I updated the insecure controllers in `backend/controllers/insecure/*` so they match our current schema (users table plus passwords table). Secure endpoints were left alone and correctly rejected bad input.

Findings: 
1. The insecure controllers intentionally reproduce SQLi, IDOR, data leaks, and stored XSS.
2. The secure controllers enforce auth, validation, and sanitized responses as Eexpected.
3. Insecure tests now align with the current schema (users + passwords tables).

Next, We'll take a look at some curls and their effects on insecure and secure versions of our endpoints, We'll talk about the expected and actual behavior along with the impact.

NOTE: in this instance `**<BASE>**` == http://localhost:8000, but this may change depending on how you run the app
## SQL Injection (Auth Bypass)

**Insecure (vulnerable)**  
curl -i -X POST "`**<BASE>**`/api/auth/insecure/login" \
  -H "Content-Type: application/json" \
  --data-raw '{"username":"x'\'' OR '\''1'\''='\''1'--","password":"whatever"}'

**Expected (insecure):** 200 OK + user object returned (auth bypass)  
**Actual (insecure):** 200 OK, logged in as the first user `ahmed@example.com` even with invalid credentials. This proves the query was concatenated and injectable.

**Secure version**  
curl -i -X POST "`**<BASE>**`/api/auth/login" \
  -H "Content-Type: application/json" \
  -d '{"email":"x'\'' OR '\''1'\''='\''1","password":"whatever"}'

**Expected (secure):** 400 or 401 Invalid credentials, no injection, no bypass.  
**Root cause:** User input is mixed straight into the SQL query instead of using parameters.

## IDOR (account exposures)

**Insecure (no auth)**  
curl -i "`**<BASE>**`/api/accounts/insecure/1"

**Expected (insecure):** 200 OK with full account data for user 1  
**Actual:** as expected, account data returned with no auth or ownership check

**Secure (token required)**  
curl -i "`**<BASE>**`/api/accounts/1"

**Actual:** 401 Unauthorized, access blocked because no valid token was provided

## Password exposure (insecure listing)

**Insecure**  
curl -s "`**<BASE>**`/api/auth/insecure/users" | jq .

**Result:** returns user records including password or hash. Some are bcrypt hashes from seed data, others are plaintext from insecure registration.

**Secure listing**  
curl -s "`**<BASE>**`/api/users" | jq .

**Result:** returns only `{ userid, name, email, created }`. No password or hash field is exposed.

**Impact:** critical information disclosure, breaks basic security requirements

## Stored XSS (user name field)

**Insecure registration**  
curl -i -X POST "`**<BASE>**`/api/auth/insecure/register" \
  -H "Content-Type: application/json" \
  -d '{"name":"<script>alert(1)</script>","email":"xss@test.local","password":"Password123!"}'

Then:  
curl -s "`**<BASE>**`/api/auth/insecure/users" | jq .

**Result:** the stored name contains `<script>alert(1)</script>` raw. If rendered on a frontend, it executes.

**Secure registration**  
curl -i -X POST "`**<BASE>**`/api/auth/register" \
  -H "Content-Type: application/json" \
  -d '{"name":"<script>alert(1)</script>","email":"xss2@test.local","password":"Password123!"}'

**Result:** input is rejected or sanitized, no raw script is returned

## CSRF (cookie based requests)

**Insecure PoC (attacker page)**

`<form method="POST" action="`**<BASE>**`/api/transactions/deposit">`
  `<input type="hidden" name="accountid" value="3" />`
  `<input type="hidden" name="amount" value="1000" />`
  `<input type="submit" value="Pay" />`
`</form>`

**Expected (insecure):** if the victim is logged in, the deposit will succeed automatically.  
**Secure version:** requiring a CSRF token or Authorization header causes the submission to fail with 403.


---

### Short summary of what this shows

The insecure controllers reproduce real vulnerabilities: SQLi, IDOR, password leaks, and stored XSS. Secure controllers correctly enforce auth and sanitize or reject dangerous input. I aligned the insecure demos with our current DB so the curl tests reproduce the expected insecure behavior for demos and grading.


**Next steps:**
A. Task: Implement fixes for remaining vulnerabilities and test mitigations
1) Insecure deserialization  
   Testing (Insecure): Try hitting /api/insecure/deserialize with something suspicious like `{"__proto__":{...}}` and see if it accepts it.  
   Fix (Secure): validating the JSON with Joi or zod, strip out weird keys, and reject anything off-script.

2) Broken auth / brute force  
   Testing (Insecure): Spam bad logins on /api/auth/insecure/login and show there’s no limit.  
   Fix (Secure):Then fix it by adding bcrypt, express-rate-limit, and a small lockout counter. Also make sure cookies are secure and SameSite.

3) Outdated dependencies  
   Testing (Insecure): Run `npm audit` and flex those high severity warnings for the demo.  
   Fix (Secure): Fix it by running `npm audit fix`, updating versions, and maybe toss in Dependabot to keep it clean.

4) XXE / XML parser stuff  
   Testing (Insecure): Post some XML with an external entity to /api/insecure/upload-xml, show that it leaks or reads a file.  
   Fix (Secure): Fix it by turning off external entities or just ban XML entirely and stick to JSON.

5) Weak logging / no monitoring  
   Testing (Insecure): Fail a few logins and check if anything shows in the logs — probably nothing.  
   Fix (Secure): Fix it by adding a logger, redact passwords, and log IPs and timestamps. Maybe even add a basic alert for repeat fails.

6) Security misconfig  
   Testing (Insecure): Hit /insecure/* and look for `Access-Control-Allow-Origin: *` or debug info.  
   Fix (Secure): Fix that by blocking /insecure/* unless it’s local dev, add helmet, and tighten CORS.

B) Task: Add request logging and monitoring
  - Add a logger like winston/pino, hide sensitive fields, log auth.fail with an ip and timestamp, add simple alert rule for repeated failures, capture sample logs for demo
C) Task: Collaborate with Keegan to verify secure DB integration
  - Walk through DB queries together, confirm parameterized queries on auth and accounts, verify no password fields in responses, run integration curl tests and sign off

Quick run plan  
- Separate Secure and Insecure setup: One for showing the hacks and the other is a clean version that shows mitigation.  
- Run the curl on insecure, then switch to secure, run it again, take screenshots.  
- Add short test files under `tests/` so CI (Continuous Integration: automated system that runs tests on new code changes) can check it later.





