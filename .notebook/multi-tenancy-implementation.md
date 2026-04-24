# Multi-Tenancy Implementation

**Tags:** multi-tenancy, architecture, prisma
**Updated:** 2026-04-17 — all blockers from original `multi-tenancy-blockers.md` are now resolved

## How Tenants Are Resolved (HTTP Layer)

Every request (except `/api/platform/`, `/api/internal/`, `/api/auth/refresh`, `/api/auth/logout`) passes through `packages/api/src/http/middleware/tenant.middleware.ts`.

1. Reads `X-Tenant-Slug` header
2. Looks up `prisma.tenant.findUnique({ where: { slug } })`
3. Returns 404 if not found, 403 if inactive
4. Sets `request.tenant` and `request.tenantPrisma = createTenantPrisma(tenant.id)` on the Fastify request

The tenant middleware runs as a **root-level `preHandler` hook** in `server.ts`. This means it executes before any plugin-level hooks on every request.

## Prisma Client Extension (Tenant Isolation)

`packages/api/src/config/tenant-prisma.ts:createTenantPrisma(tenantId)` returns a Prisma client extended with `$allOperations`.

**⚠️ Critical:** Model names in `TENANT_SCOPED_MODELS` must be **PascalCase** — matching the schema definition, not the Prisma client accessor. Prisma's `$allModels.$allOperations` callback passes `'Service'`, not `'service'`. A lowercase entry silently disables the tenant filter for that model and leaks cross-tenant data with no error.

```typescript
// Correct
const TENANT_SCOPED_MODELS = new Set([
  'Provider', 'ProviderShift', 'ProviderAbsence', 'Service', 'Customer', 'Appointment',
]);

// Wrong — filter is never applied, all findMany() returns every tenant's rows
const TENANT_SCOPED_MODELS = new Set([
  'provider', 'providerShift', 'providerAbsence', 'service', 'customer', 'appointment',
]);
```

For any model in the set:
- **CREATE/createMany/upsert** → auto-injects `tenantId` into `data`/`create`
- **All other operations** → auto-injects `tenantId` into `where`

Global `prisma` (not tenant-scoped) is used only for: `Tenant` lookups and cross-tenant bootstrap (e.g., internal routes resolving provider's tenantId).

## Repository Pattern (Per-Request)

Route handlers instantiate repositories per-request with the scoped client:
```
const repo = new PrismaXxxRepository(request.tenantPrisma);
```

Never module-level singletons — `request.tenantPrisma` is unique per request.

## Tenant Config (Per-Tenant Settings)

`Tenant.config` is a JSON column typed via `packages/shared/src/tenant-config.schema.ts:TenantConfig`:

```typescript
{
  businessName: string,         // e.g. "Soberano Barbearia"
  providerLabel: string,        // e.g. "Barbeiro", "Psicóloga"
  bookingUrl: string,           // frontend URL for cancel links
  chatwootBaseUrl?: string,
  chatwootApiToken?: string,
  chatwootAccountId?: number,
  chatwootInboxId?: number,
}
```

`WhatsAppNotificationService` constructor receives `TenantConfig` — no hardcoded brand strings.

## CORS

`packages/api/src/server.ts:30` — `origin: env.ALLOWED_ORIGINS` (string split to array). Multiple frontends supported.

## Auth Guard Hook Ordering

**⚠️ Critical:** `authGuard` must always be registered as a `preHandler` hook, never `onRequest`.

`onRequest` fires before `preHandler`. If `authGuard` runs in `onRequest`, the tenant middleware has not yet populated `request.tenant`. The tenantId check inside `authGuard` compares `payload.tenantId` against `request.tenant?.id`, which resolves to `undefined` — every authenticated request returns 401.

```typescript
// Correct — tenant middleware has already run by the time authGuard fires
app.addHook('preHandler', authGuard);

// Wrong — request.tenant is undefined here, all requests get 401
app.addHook('onRequest', authGuard);
```

This applies to every route plugin that uses `authGuard`: `adminRoutes`, `psychologyRoutes`, `scheduleRoutes`, and any future plugin.

## Cross-Tenant Session Isolation (Cookie Naming)

When multiple frontends share the same API host (common in development), refresh token cookies must be tenant-scoped to avoid one frontend's logout clearing another's session.

**Cookie name:** `refreshToken_${tenant.slug}` (e.g., `refreshToken_soberano`, `refreshToken_bruno`)

- **Login** derives the name from `request.tenant.slug` (available because tenant middleware runs for login).
- **Refresh and logout** derive the name from the `X-Tenant-Slug` request header. If the header is absent, the fallback is the generic `refreshToken` (backward compat for callers that predate this convention).

**Every frontend must send `X-Tenant-Slug` on all three auth calls** — login, refresh, and logout — or the cookie name will not resolve correctly. Frontends that omit the header on refresh/logout will look for `refreshToken` and find nothing after the first login.

## Internal Routes (MCP → API)

Internal routes in `/api/internal/` are excluded from tenant middleware. They authenticate via `X-Internal-Secret` header and resolve tenantId from `barberId` by looking up `prisma.provider.findUnique({ where: { id: barberId } })`. See `mcp-internal-route-pattern.md`.
