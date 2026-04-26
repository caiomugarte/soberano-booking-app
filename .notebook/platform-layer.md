# Platform Layer (Super-Admin)

**Tags:** platform, super-admin, tenant-management, architecture
**Discovered:** 2026-04-17

## Overview

The platform layer allows a super-admin to manage all tenants. It's separate from the regular barber/customer routes.

## API Routes (`/api/platform/`)

File: `packages/api/src/http/routes/platform.routes.ts`

Authentication: `POST /api/platform/auth` (no auth required) → returns a JWT with `{ role: 'super_admin' }` signed with `SUPER_ADMIN_JWT_SECRET`. All other platform routes require this token via `packages/api/src/http/middleware/platform-auth.middleware.ts`.

Credentials: `SUPER_ADMIN_EMAIL` + `SUPER_ADMIN_PASSWORD_HASH` (bcrypt) from env.

| Method | Path | Purpose |
|--------|------|---------|
| POST | `/api/platform/auth` | Super-admin login |
| GET | `/api/platform/tenants` | List all tenants |
| GET | `/api/platform/tenants/:id` | Get single tenant |
| POST | `/api/platform/tenants` | Create tenant |
| PATCH | `/api/platform/tenants/:id` | Update tenant |

Tenant creation requires full `TenantConfig` (businessName, providerLabel, bookingUrl, optional Chatwoot fields).

## Web UI (`packages/web-admin/`)

Stack: React + TanStack Query + Zustand + Tailwind (same as `web`).

Routes:
- `/login` → `LoginPage.tsx`
- `/` → `TenantListPage.tsx` (protected)
- `/tenants/new` → `TenantFormPage.tsx` (protected)
- `/tenants/:id` → `TenantFormPage.tsx` (edit, protected)

Auth state: `packages/web-admin/src/stores/auth.store.ts` — token stored in Zustand (in-memory).

API calls: `packages/web-admin/src/api/platform.ts`.

## Tenant Middleware Bypass

`packages/api/src/server.ts:54-61` — platform routes are explicitly excluded from `tenantMiddleware`:
```typescript
if (request.url.startsWith('/api/platform/')) return;
```
