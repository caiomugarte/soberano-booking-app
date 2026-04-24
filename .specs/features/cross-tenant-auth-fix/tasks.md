# Tasks: Cross-Tenant Authentication & Data Isolation Fix

## Dependency order
T1 → T2 → T3 → T4 (backend must be fixed before frontend)
T5 is independent (data fix).

---

## T1 — Remove /api/auth/refresh from the tenant middleware exclusion list
**Req:** AUTH-3
**File:** `packages/api/src/server.ts`
**Change:** Delete the line `if (request.url === '/api/auth/refresh') return;` from the `preHandler` hook.
**Verify:** `tenantMiddleware` now runs for refresh requests. A refresh call with no `x-tenant-slug` returns 404.

---

## T2 — Validate tenantId in the refresh handler
**Req:** AUTH-3
**File:** `packages/api/src/http/routes/auth.routes.ts`
**Change:** After `verifyRefreshToken(token)`, add:
```
if (payload.tenantId !== request.tenant.id) → return 401 UNAUTHORIZED
```
**Verify:** Refresh with mismatched tenant returns 401. Same-tenant refresh still works.

---

## T3 — Move authGuard to preHandler and add tenantId check
**Req:** AUTH-1, AUTH-2
**File:** `packages/api/src/http/middleware/auth.middleware.ts` + `packages/api/src/http/routes/admin.routes.ts` + `packages/api/src/http/routes/psychology.routes.ts`
**Change:**
- In `auth.middleware.ts`: after extracting `payload`, add check `payload.tenantId !== request.tenant?.id → 401`.
- In `admin.routes.ts` and `psychology.routes.ts`: change `app.addHook('onRequest', authGuard)` → `app.addHook('preHandler', authGuard)`.
**Verify:** Soberano JWT + `x-tenant-slug: bruno` → 401. Bruno JWT + `x-tenant-slug: bruno` → passes through.

---

## T4 — Fix `web-bruno` initialize() to include x-tenant-slug
**Req:** AUTH-4
**File:** `packages/web-bruno/src/stores/auth.store.ts`
**Change:** Replace the raw `fetch(${API_URL}/api/auth/refresh, ...)` call with `apiFetch('/api/auth/refresh', { method: 'POST' })` (which already injects `x-tenant-slug: bruno` via the configured `http-client`), or manually add the header to the existing fetch call.
**Verify:** On `web-bruno` app load, if only a soberano cookie exists, `isAuthenticated` stays `false`.

---

## T5 — Verify services isolation after auth fixes
**Req:** AUTH-5
**File:** N/A (verification only)
**Change:** After T1–T4 are deployed, test `GET /api/services` with `x-tenant-slug: soberano`. DB data is confirmed clean — no data delete needed.
**Verify:** Response contains only barbershop slugs (cabelo, barba, etc.). No psychology slugs (individual, casal, familiar) present.
