# Spec: Cross-Tenant Authentication & Data Isolation Fix

## Problem Statement

Two frontends (`web` / soberano tenant, `web-bruno` / bruno tenant) share one API at the same origin. Three structural bugs allow cross-tenant session bleed:

1. `authGuard` runs before `tenantMiddleware` → JWT `tenantId` can never be validated against the resolved tenant.
2. `/api/auth/refresh` skips `tenantMiddleware` → a refresh token from tenant A produces a valid access token usable on tenant B.
3. `web-bruno`'s `initialize()` calls refresh with no `x-tenant-slug` → even if the backend validates, the request arrives without tenant context.

**Observed symptoms:**
- A soberano barber can open `web-bruno` and appear "logged in" (refresh cookie from soberano works transparently in bruno).
- `web-bruno` financial page shows data from the wrong provider / tenant context.
- `web` shows psychology services that belong to the bruno tenant (data contamination in DB).

---

## Requirements

### AUTH-1 — Middleware execution order
`authGuard` MUST run after `tenantMiddleware` so that `request.tenant` is available when the JWT `tenantId` is checked.

**Acceptance:** Swapping `authGuard` to `preHandler` (or using an inline hook registered after tenant resolution) does not break any existing authenticated route.

---

### AUTH-2 — JWT tenant validation
When `authGuard` validates a JWT, it MUST verify that `payload.tenantId === request.tenant.id`. If they differ, respond `401 UNAUTHORIZED`.

**Acceptance:**
- A valid soberano JWT sent with `x-tenant-slug: bruno` returns 401.
- A valid bruno JWT sent with `x-tenant-slug: bruno` succeeds as before.

---

### AUTH-3 — Tenant-scoped refresh
`/api/auth/refresh` MUST apply `tenantMiddleware` (receive and resolve `x-tenant-slug`), then reject refresh tokens whose embedded `tenantId` does not match the resolved tenant.

**Acceptance:**
- Refresh with soberano cookie + `x-tenant-slug: soberano` → succeeds, returns soberano access token.
- Refresh with soberano cookie + `x-tenant-slug: bruno` → returns `401 UNAUTHORIZED`.
- Refresh with no `x-tenant-slug` → returns `404 TENANT_NOT_FOUND` (tenant middleware rejects it).

---

### AUTH-4 — `web-bruno` initialize sends tenant header
`web-bruno/src/stores/auth.store.ts` `initialize()` MUST send `x-tenant-slug: <VITE_TENANT_SLUG>` on the refresh call so AUTH-3 can validate it.

**Acceptance:** On app load, `web-bruno` only restores a session that belongs to the `bruno` tenant. A soberano cookie in the browser does not produce an authenticated state in `web-bruno`.

---

### AUTH-5 — Verify services isolation after auth fixes
After AUTH-1 through AUTH-4 are applied, confirm that `GET /api/services` with `x-tenant-slug: soberano` returns only barbershop services.

**Context:** DB data is clean — psychology services (`492aed0f` tenant) and barbershop services (`c79d1b7e` tenant) are correctly separated. The symptom of psychology services appearing in `web` is expected to be a side-effect of the cross-tenant auth bugs (a bruno token resolving provider context for soberano requests). No data fix needed.

**Acceptance:** After fixing AUTH-1–4, `GET /api/services` scoped to soberano returns only barbershop slugs. No psychology slugs present.

---

## Out of scope
- Changing the JWT signing algorithm or adding tenant to the cookie itself.
- Multi-tenant support changes in the booking flow (`web`).
- Any UI changes beyond the `initialize()` fix.
