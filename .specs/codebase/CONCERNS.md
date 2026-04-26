# Codebase Concerns

**Focus:** Issues that directly block or complicate multi-tenancy implementation.

---

## CRITICAL: No Tenant Isolation in Any Layer

**Severity:** Blocker for multi-tenancy  
**Evidence:** All Prisma queries in `packages/api/src/infrastructure/database/repositories/` have zero tenant filtering. Example: `prisma.appointment.findMany({ where: { barberId, date } })` — returns data from all tenants.

**Affected files:** All `prisma-*.repository.ts` files, `reminder.job.ts`

**Fix approach:** Add `tenantId` FK to all tenant-scoped models. Use a Prisma Client Extension with `$allOperations` to inject `tenantId` into every query automatically. Pass tenant context via Fastify's request lifecycle (decorate request with `tenant`).

---

## CRITICAL: Hardcoded Brand in Notifications

**Severity:** Blocker for multi-client notifications  
**Evidence:** `whatsapp-notification.service.ts` hardcodes `"📍 *Soberano Barbearia*"` and `"💈 Barbeiro:"` in every message template (6+ occurrences).

**Fix approach:** Pass tenant config (business name, provider label) into the notification service. Fetch from the resolved `Tenant` record on each request. Consider a `Tenant.config: Json` field for message template overrides.

---

## CRITICAL: Repositories Instantiated as Module Singletons

**Severity:** Architectural blocker for request-scoped tenant context  
**Evidence:** In every route file (e.g., `booking.routes.ts:13-18`), repositories are instantiated at module load time:
```typescript
const appointmentRepo = new PrismaAppointmentRepository();
```
These instances have no access to per-request tenant context.

**Fix approach:** Either (a) inject `tenantId` as a parameter into each repository method call, or (b) use Fastify's `request.server.prisma` pattern with a Prisma extension that's initialized per-request. Option (b) is cleaner for the long term.

---

## HIGH: No Super-Admin or Platform Admin Role

**Severity:** Missing for SaaS operations  
**Evidence:** JWT payload only contains `barberId`. There is no `role` field, no super-admin concept, no way to manage tenants via API.

**Fix approach:** Add a `PlatformAdmin` model or a `role` field to JWT payload. Create a separate admin panel (or CLI seed scripts) for tenant onboarding.

---

## HIGH: Reminder Job Has No Tenant Context

**Severity:** Will cross-query all tenants once multi-tenancy lands  
**Evidence:** `reminder.job.ts` calls `appointmentRepo.findUpcomingWithoutReminder(60)` — global query with no tenant scope. It then calls `notificationService.sendReminder(appointment)` which uses the hardcoded brand.

**Fix approach:** The reminder job must iterate tenants and scope queries per-tenant, or the Prisma extension auto-scoping approach must extend to the job context too.

---

## HIGH: CORS Allows Only One `BASE_URL`

**Severity:** Multi-frontend deployments need multiple allowed origins  
**Evidence:** `server.ts:24-27`:
```typescript
origin: env.NODE_ENV === 'development' ? true : env.BASE_URL,
```
Single string — only one frontend can access the API in production.

**Fix approach:** Change to an array of allowed origins (one per client frontend URL) or use a dynamic function that checks against the `Tenant.domains` list.

---

## MEDIUM: Rate Limiter Uses In-Process Memory

**Severity:** Will not work correctly once API scales horizontally  
**Evidence:** `@fastify/rate-limit` defaults to in-memory store. No Redis configured.

**Fix approach:** Acceptable at current scale (1 API instance per Coolify stack). When horizontal scaling is needed, add Redis store to `@fastify/rate-limit`.

---

## MEDIUM: No Tenant-Level Feature Flags Mechanism

**Severity:** Required for plan tiers (Site-only vs AI)  
**Evidence:** No feature flag system exists. The MCP server is either deployed or not — there's no per-tenant gating.

**Fix approach:** Add `enabledFeatures: string[]` to `Tenant` model. Check features in middleware or use-case layer before executing feature-gated logic.

---

## LOW: `web-marques` is an Empty Package

**Severity:** Low — placeholder only  
**Evidence:** `packages/web-marques/` contains only `node_modules`, no source files.

**Fix approach:** Define the per-client frontend scaffolding pattern before populating it.

---

## LOW: No Database Indexes for Future Tenant Queries

**Severity:** Performance concern once multi-tenancy lands  
**Evidence:** Current indexes are on `(barberId, date, startTime)` and `(customerId)`. No `tenantId` index.

**Fix approach:** Add `@@index([tenantId])` (or composite indexes like `@@index([tenantId, date])`) as part of the multi-tenancy migration.
