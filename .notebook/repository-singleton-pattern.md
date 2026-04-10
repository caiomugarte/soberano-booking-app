# Repository Singleton Pattern (Gotcha)

**Tags:** repositories, architecture, gotcha
**Discovered:** 2026-04-09

## The Pattern

In every route file, repositories are instantiated at module level:

```
packages/api/src/http/routes/booking.routes.ts:13-18
packages/api/src/http/routes/admin.routes.ts:14-19
```

These singletons are created once at startup. They hold no reference to the current request.

## Why This Matters for Multi-Tenancy

Tenant context (resolved from `X-Tenant-Slug` header) lives in the HTTP request. If repos are singletons, they can't access tenant context without receiving it explicitly.

## Options to Fix

**Option A:** Pass `tenantId` explicitly to every repository method.
- Pros: Explicit, visible
- Cons: Invasive — changes every method signature

**Option B:** Use Prisma Client Extension with `$allOperations` hook, initialized per-request.
- The extension wraps all queries and injects `tenantId` from a closure
- Route handlers instantiate a tenant-scoped Prisma client per request
- Repos receive this scoped client in their constructor (or via Fastify request decoration)
- Pros: Less invasive, single injection point
- Cons: Slightly more complex setup

**Option B is preferred** for this codebase given the repo interface pattern already in place.
