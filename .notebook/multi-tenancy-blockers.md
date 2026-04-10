# Multi-Tenancy Blockers

**Tags:** multi-tenancy, architecture, critical
**Discovered:** 2026-04-09 during brownfield mapping

## 4 Critical Blockers

### 1. No tenant isolation in DB queries
All Prisma repository methods return global data. No `tenantId` filter anywhere.
- All files: `packages/api/src/infrastructure/database/repositories/prisma-*.repository.ts`

### 2. Repositories are module-level singletons
Repos are instantiated at module load in route files (e.g., `booking.routes.ts:13-18`). They have no per-request context. Tenant context cannot be injected post-init.
- See: `repository-singleton-pattern.md`

### 3. Brand hardcoded in notification service
`packages/api/src/infrastructure/notifications/whatsapp-notification.service.ts` — "Soberano Barbearia" and "Barbeiro" appear in 6+ message templates.

### 4. CORS allows single origin only
`packages/api/src/server.ts:26` — `origin: env.BASE_URL` is a single string. Multi-frontend requires array or dynamic function.

## Reminder job also affected
`packages/api/src/infrastructure/jobs/reminder.job.ts` — global queries, hardcoded brand in messages. Must be tenant-aware.
