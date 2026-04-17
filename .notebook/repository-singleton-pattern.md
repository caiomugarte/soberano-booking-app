# Repository Per-Request Pattern

**Tags:** repositories, architecture, pattern
**Originally a gotcha (resolved):** per-request injection was Option B, now implemented

## Current Pattern

Route handlers instantiate repositories per-request using `request.tenantPrisma`:

```typescript
// Inside route handler (e.g. booking.routes.ts:34-35)
const appointmentRepo = new PrismaAppointmentRepository(request.tenantPrisma);
const shiftRepo = new PrismaProviderShiftRepository(request.tenantPrisma);
```

`request.tenantPrisma` is a Prisma client extended with a `$allOperations` hook that auto-injects `tenantId` into all queries for tenant-scoped models. Set by `tenant.middleware.ts` on every request.

## Repository Constructor Signature

All Prisma repository constructors accept a `PrismaClientOrExtended` type (typed as `any` to accept both regular and extended clients):

```typescript
constructor(private prisma: PrismaClientOrExtended) {}
```

## Exception: Internal Routes

`packages/api/src/http/routes/internal.routes.ts` bypasses tenant middleware. It uses the global `prisma` (imported as `_prisma as any`) only to resolve `provider.tenantId` from a `barberId`, then creates its own `createTenantPrisma(provider.tenantId)` and passes it to repos.
