# Multi-Tenancy Blockers — RESOLVED

**Tags:** multi-tenancy, architecture
**Originally discovered:** 2026-04-09 | **Resolved:** by 2026-04-17

All 4 blockers documented here have been resolved. See `multi-tenancy-implementation.md` for the current architecture.

## Summary of Resolutions

1. **No tenant isolation** → `createTenantPrisma()` Prisma extension auto-injects `tenantId` in all queries.
2. **Singleton repos** → Repos instantiated per-request with `request.tenantPrisma`. No more module-level singletons.
3. **Hardcoded brand** → `WhatsAppNotificationService` takes `TenantConfig` in constructor. Brand from `Tenant.config` JSON column.
4. **CORS single origin** → `env.ALLOWED_ORIGINS` is split to array, supports multiple frontends.
