# Multi-Tenancy Implementation

**Tags:** multi-tenancy, architecture, prisma
**Updated:** 2026-04-17 — all blockers from original `multi-tenancy-blockers.md` are now resolved

## How Tenants Are Resolved (HTTP Layer)

Every request (except `/api/platform/`, `/api/internal/`, `/api/auth/refresh`, `/api/auth/logout`) passes through `packages/api/src/http/middleware/tenant.middleware.ts`.

1. Reads `X-Tenant-Slug` header
2. Looks up `prisma.tenant.findUnique({ where: { slug } })`
3. Returns 404 if not found, 403 if inactive
4. Sets `request.tenant` and `request.tenantPrisma = createTenantPrisma(tenant.id)` on the Fastify request

## Prisma Client Extension (Tenant Isolation)

`packages/api/src/config/tenant-prisma.ts:createTenantPrisma(tenantId)` returns a Prisma client extended with `$allOperations`.

For any of these models: `provider`, `providerShift`, `providerAbsence`, `service`, `customer`, `appointment`:
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

## Internal Routes (MCP → API)

Internal routes in `/api/internal/` are excluded from tenant middleware. They authenticate via `X-Internal-Secret` header and resolve tenantId from `barberId` by looking up `prisma.provider.findUnique({ where: { id: barberId } })`. See `mcp-internal-route-pattern.md`.
