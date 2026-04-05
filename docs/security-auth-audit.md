# Auth Security Audit

> Last reviewed: 2026-04-04
> Scope: Authentication and authorization across `packages/api` and `packages/web`

---

## Summary Table

| # | Concern | Status | Priority |
|---|---------|--------|----------|
| 1 | JWT storage | Secure | — |
| 2 | JWT secret strength | Issue | Critical |
| 3 | Refresh token rotation | Secure | — |
| 4 | Account lockout | Issue | High |
| 5 | Auth middleware consistency | Issue | High |
| 6 | Login error messages | Secure | — |
| 7 | Password reset token expiry | N/A | — |
| 8 | OAuth redirect_uri validation | N/A | — |
| 9 | Email verification on signup | N/A | — |
| 10 | Server-side session invalidation | Issue | Medium |
| 11 | Password hashing | Secure | — |
| 12 | HTTPS enforcement | Issue | Medium |
| 13 | Client-side vs server-side role checks | Issue | Medium |
| 14 | 2FA on admin routes | Issue | Medium |
| 15 | Test credentials in production | Secure | — |

---

## Secure (No Action Needed)

### 1. JWT Storage
Access token lives in Zustand state (in-memory, not persisted). Refresh token is stored in an `httpOnly`, `secure` cookie.

- `packages/api/src/http/routes/auth.routes.ts` — `REFRESH_COOKIE_OPTIONS` with `httpOnly: true`
- `packages/web/src/stores/auth.store.ts` — `accessToken` stored in memory only
- `packages/web/src/api/auth-request.ts` — uses `credentials: 'include'` for cookie transmission

### 3. Refresh Token Rotation
A new refresh token is issued on every `/auth/refresh` call, invalidating the previous one.

- `packages/api/src/http/routes/auth.routes.ts` — `generateRefreshToken()` called on every refresh
- Access token expiry: 18h. Refresh token expiry: 7 days.

### 6. Login Error Messages
Both wrong email and wrong password return the same message, preventing user enumeration.

- `packages/api/src/application/use-cases/barber/authenticate-barber.ts` — returns `'Email ou senha incorretos.'` in both cases

### 11. Password Hashing
Passwords are hashed with bcryptjs using 10 salt rounds (industry standard).

- `packages/api/src/infrastructure/auth/password.service.ts`
- `packages/api/src/infrastructure/database/seed.ts` — passwords hashed before storage

### 15. Test Credentials
Test secrets exist only in `vitest.config.ts` and are not present in production `.env` files.

---

## Issues Found

### [CRITICAL] #2 — Static JWT Secrets in `.env`

**Problem:** Both `JWT_SECRET` and `JWT_REFRESH_SECRET` are hardcoded static strings. A leaked `.env` file allows an attacker to forge arbitrary valid tokens.

**Location:** `packages/api/.env` lines 5–6

**Fix:** Regenerate both secrets with cryptographically random values before any production deployment:
```bash
node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
```
Run twice, assign one to `JWT_SECRET` and one to `JWT_REFRESH_SECRET`. Rotate secrets any time the `.env` file may have been exposed.

---

### [HIGH] #4 — No Account Lockout After Failed Logins

**Problem:** No failed-attempt tracking exists. Rate limiting is applied at the endpoint level (10 req/min) but a distributed brute force bypasses it entirely.

**Location:**
- `packages/api/src/application/use-cases/barber/authenticate-barber.ts` — no attempt tracking
- `packages/api/prisma/schema.prisma` — `Barber` model has no `failedLoginAttempts` or `lockedUntil` fields

**Fix:**
1. Add `failedLoginAttempts Int @default(0)` and `lockedUntil DateTime?` to the `Barber` schema
2. On each failed login, increment the counter
3. Lock the account for 15 minutes after 5 failed attempts
4. Reset the counter on successful login

---

### [HIGH] #5 — Authorization Bypass on Appointment Delete

**Problem:** Any authenticated barber can delete another barber's appointment. The delete endpoint verifies the appointment exists but not that it belongs to the requesting barber.

**Location:** `packages/api/src/http/routes/admin.routes.ts` lines 43–49

**Fix:** After fetching the appointment, add an ownership check:
```typescript
if (appointment.barberId !== request.barberId) {
  return reply.status(403).send({ message: 'Forbidden' })
}
```
Apply the same pattern to any other update/modify endpoints that operate on barber-owned resources.

---

### [MEDIUM] #10 — No Server-Side Session Invalidation on Logout

**Problem:** Logout clears the refresh token cookie on the client, but there is no server-side token blacklist. A stolen refresh token remains valid for up to 7 days.

**Location:** `packages/api/src/http/routes/auth.routes.ts` lines 29–32

**Fix (minimal):** Store issued refresh tokens in a DB table with a `revokedAt` field. On each `/auth/refresh` call, verify the token is not in the revoked list. On logout, mark the token as revoked.

**Fix (simpler alternative):** Shorten the refresh token TTL to 1–2 days to reduce the exposure window.

---

### [MEDIUM] #12 — HTTPS Not Enforced at App Level

**Problem:** The app itself does not redirect HTTP to HTTPS or set HSTS headers. Enforcement depends entirely on the reverse proxy (nginx/docker) being correctly configured.

**Location:** Cookie `secure` flag is correctly set to `NODE_ENV === 'production'`, but no HSTS header exists.

**Fix:** Add HSTS via nginx config or in-app middleware:
```
Strict-Transport-Security: max-age=31536000; includeSubDomains
```
Confirm the reverse proxy forces HTTPS before the request reaches the app.

---

### [MEDIUM] #13 — No Per-Barber Authorization in JWT

**Problem:** The JWT payload only contains `barberId` with no role or permission field. All authenticated barbers have identical access to all admin endpoints. The delete bypass in #5 is a direct consequence.

**Location:** `packages/api/src/infrastructure/auth/jwt.service.ts` lines 4–6

**Fix:**
1. Add a `role` field to the `Barber` model (`ADMIN`, `BARBER`)
2. Include `role` in the JWT payload
3. Add a role-check guard to sensitive endpoints (e.g., only `ADMIN` can delete appointments from other barbers)

---

### [MEDIUM] #14 — No 2FA on Admin Routes

**Problem:** Admin access is protected by a single password. A compromised credential grants full access.

**Fix:** Implement TOTP (e.g., via `otplib`) on the admin login flow:
1. After successful password check, require a TOTP code
2. Store the TOTP secret per barber (encrypted at rest)
3. Provide a setup flow (QR code) on first login

Minimum viable alternative: enforce 2FA only for the barber(s) with the most sensitive access.

---

## Low Priority / Notes

### #7 — No Password Reset Feature
There is no self-service password recovery. Passwords can only be changed by re-running the seed script. If a barber loses access, an admin must intervene manually.

**Recommendation:** Implement a reset flow with a short-lived token (15–60 minutes) sent to the barber's registered email.

### #15 (minor) — Seed Script Prints Credentials to Console
`packages/api/src/infrastructure/database/seed.ts` line 81 logs generated passwords to stdout. This is not a production vulnerability but credentials appearing in server logs is poor practice.

**Recommendation:** Display credentials only on first-time creation, or use a one-time secure link instead.

---

## Action Backlog

| Priority | Action | File |
|----------|--------|------|
| Critical | Rotate JWT secrets with `crypto.randomBytes(64)` | `.env` |
| High | Add ownership check to delete/update endpoints | `admin.routes.ts` |
| High | Add `failedLoginAttempts` + lockout logic | `authenticate-barber.ts`, `schema.prisma` |
| Medium | Add refresh token blacklist table | new migration |
| Medium | Add HSTS header in nginx or app middleware | nginx config |
| Medium | Add `role` to JWT payload and enforce per-endpoint | `jwt.service.ts`, `admin.routes.ts` |
| Medium | Implement TOTP 2FA for admin login | new feature |
| Low | Add self-service password reset with expiring tokens | new feature |
| Low | Stop printing credentials in seed output | `seed.ts` |

Here's the FULL BREAKDOWN

1/ storing JWTs in localStorage
> XSS attack = every token on the page stolen                                                                                                                                                                                           
> localStorage is readable by any script on your site                                                                                                                                                                                   
> use httpOnly cookies instead

2/ JWT signed with a weak or default secret
> "secret" and "your_jwt_secret_here" are tested first by attackers                                                                                                                                                                     
> if its from a tutorial, assume its already compromised                                                                                                                                                                                
> generate a proper 256-bit random secret

3/ no refresh token rotation
> stolen refresh token works forever without rotation                                                                                                                                                                                   
> rotate on every use, invalidate the old one immediately                                                                                                                                                                               
> one-line config in most auth libraries

4/ no account lockout after failed logins
> brute force has zero friction without it                                                                                                                                                                                              
> 10 failed attempts should lock the account                                                                                                                                                                                            
> add lockout + exponential backoff

5/ auth middleware applied inconsistently
> AI generates middleware for some routes and skips others                                                                                                                                                                              
> the skipped ones are completley open                                                                                                                                                                                                  
> audit every endpoint manually, assume nothing is protected

6/ different error messages for wrong email vs wrong password
> "user not found" vs "wrong password" tells attackers which emails exist                                                                                                                                                               
> return the same generic message for both cases                                                                                                                                                                                        
> never confirm or deny account existence

7/ forgot-password tokens that never expire
> a reset link from 3 months ago should be invalid                                                                                                                                                                                      
> yours probably isnt                                                                                                                                                                                                                   
> set a short expiry, 15 to 60 minutes max

8/ OAuth redirect_uri not validated
> exploited to redirect auth codes to attacker-> controlled URLs                                                                                                                                                                        
> whitelist every valid redirect URI explicitly                                                                                                                                                                                         
> never allow open redirects in your OAuth flow

9/ no email verification on signup
> fake accounts and spam at zero friction                                                                                                                                                                                               
> verify before granting full access                                                                                                                                                                                                    
> a verification link, not just a welcome email

10/ sessions not invalidated server-side on logout
> cookie is cleared client-side but server-side session still works                                                                                                                                                                     
> invalidate the session record in your DB on logout                                                                                                                                                                                    
> client-side clearing alone is not enough

11/ passwords stored without bcrypt or argon2
> MD5, SHA256 without salt, plain text                                                                                                                                                                                                  
> all of these show up in breach headlines                                                                                                                                                                                              
> bcrypt or argon2 only, no exceptions

12/ auth endpoints not enforcing HTTPS
> credentials over HTTP are visible on any network                                                                                                                                                                                      
> enforce HTTPS at the infrastructure level                                                                                                                                                                                             
> no HTTP fallback for any auth route

13/ client-side role checks instead of server-side
> you can't trust what the frontend says about who the user is                                                                                                                                                                          
> validate roles and permissions on every server request                                                                                                                                                                                
> the frontend is UI, not security

14/ no 2FA on admin or sensitive routes
> one breached password = full access to everything                                                                                                                                                                                     
> add TOTP or magic link 2FA on admin routes minimum                                                                                                                                                                                    
> non-negotiable for anything handling user data

15/ test credentials left in production
> admin:admin or test@test.com:password123 are real entry points, not conveniences                                                                                                                                                      
> audit and remove every test account before you ship     