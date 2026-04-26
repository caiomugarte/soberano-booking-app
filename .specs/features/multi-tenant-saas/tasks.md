# Multi-Tenant SaaS — Tasks

**Design:** `.specs/features/multi-tenant-saas/design.md`
**Status:** Approved

---

## Execution Plan

```
Phase 1 — DB Schema (sequential)
  T1 → T2 → T3 → T4

Phase 2 — API Foundation (parallel after T1)
  T1 complete, then:
    ├── T5  (error classes)
    ├── T6  (tenant-prisma factory)
    ├── T7  (Fastify type augmentation)
    └── T9  (env.ts update)
  T5+T6+T7 complete → T8 (tenant middleware)
  T9 complete → T18 (server.ts CORS + middleware registration)

Phase 3 — Repository Refactor (parallel, after T6)
  T6 complete, then:
    ├── T10  (appointment repo)
    ├── T11  (provider repo)
    ├── T12  (service repo)
    ├── T13  (customer repo)
    └── T14  (provider-shift repo)

Phase 4 — JWT + Auth (sequential)
  T15 → T16, T17 (parallel)

Phase 5 — Route Updates (parallel, after Phase 3 + 4)
  T10–T14 + T15–T17 complete, then:
    ├── T19  (booking.routes)
    ├── T20  (admin.routes)
    ├── T21  (barber.routes)
    ├── T22  (service.routes)
    ├── T23  (schedule.routes)
    ├── T24  (appointment.routes)
    └── T25  (auth.routes)

Phase 6 — Notifications (parallel, after T1)
  T28 → T26, T27 (parallel)

Phase 7 — Reminder Job (after Phase 3 + Phase 6)
  T10 + T26 + T27 complete → T29

Phase 8 — Web Frontend: packages/web (parallel, after T8)
  T30 → T31, T32 (parallel)

Phase 9 — Super-Admin API Routes (parallel, after T8 + T9)
  T35 → T33, T34 (parallel)

Phase 10 — packages/web-admin (sequential then parallel)
  T36 → T37 → T38, T39, T40 (parallel) → T41

Phase 11 — Deployment Files (all parallel, independent)
  T42, T43, T44, T45

Phase 12 — Tests (after Phase 5 + 8)
  T46, T47, T48 (parallel)
```

---

## Task Breakdown

### Phase 1 — DB Schema

---

### T1: Update Prisma schema

**What:** Add `Tenant` model, rename `Barber` → `Provider` (+ shifts/absences), add `tenantId` FK to all tenant-scoped models, update unique constraints to be per-tenant.
**Where:** `packages/api/prisma/schema.prisma`
**Depends on:** None
**Requirement:** TENANT-01, TENANT-02

**Skills:** `/coding-guidelines`

**Done when:**
- [ ] `Tenant` model exists with: `id`, `slug` (unique), `name`, `type`, `config Json`, `isActive`, `createdAt`
- [ ] `Barber` model renamed to `Provider`, `@@map("providers")`
- [ ] `BarberShift` → `ProviderShift`, `@@map("provider_shifts")`, `barber_id` → `provider_id`
- [ ] `BarberAbsence` → `ProviderAbsence`, `@@map("provider_absences")`, `barber_id` → `provider_id`
- [ ] `tenantId` FK added to: `Provider`, `ProviderShift`, `ProviderAbsence`, `Service`, `Customer`, `Appointment`
- [ ] `Provider.slug` changed from `@unique` to `@@unique([tenantId, slug])`
- [ ] `Provider.email` changed from `@unique` to `@@unique([tenantId, email])`
- [ ] `Service.slug` changed from `@unique` to `@@unique([tenantId, slug])`
- [ ] `Customer.phone` changed from `@unique` to `@@unique([tenantId, phone])`
- [ ] `npx prisma validate` passes with no errors

**Verify:**
```bash
cd packages/api && npx prisma validate
```

**Commit:** `feat(db): add Tenant model, rename Barber→Provider, add tenantId FK`

---

### T2: Write Migration 1 — Add tenants table + nullable tenantId + seed Soberano

**What:** Generate the Prisma migration for the schema changes in T1 and manually append the data migration SQL that inserts the Soberano tenant and assigns all existing rows.
**Where:** `packages/api/prisma/migrations/<timestamp>_add_tenants_nullable/migration.sql`
**Depends on:** T1
**Requirement:** TENANT-01

**Skills:** `/coding-guidelines`

**Done when:**
- [ ] Migration generated via `prisma migrate dev --name add_tenants_nullable --create-only`
- [ ] Migration SQL manually appended with:
  ```sql
  INSERT INTO tenants (id, slug, name, type, config, is_active, created_at)
  VALUES (gen_random_uuid(), 'soberano', 'Soberano Barbearia', 'barbershop',
    '{"businessName":"Soberano Barbearia","providerLabel":"Barbeiro","bookingUrl":"https://soberano.altion.com.br"}',
    true, NOW());

  UPDATE providers     SET tenant_id = (SELECT id FROM tenants WHERE slug = 'soberano');
  UPDATE provider_shifts SET tenant_id = (SELECT id FROM tenants WHERE slug = 'soberano');
  UPDATE provider_absences SET tenant_id = (SELECT id FROM tenants WHERE slug = 'soberano');
  UPDATE services      SET tenant_id = (SELECT id FROM tenants WHERE slug = 'soberano');
  UPDATE customers     SET tenant_id = (SELECT id FROM tenants WHERE slug = 'soberano');
  UPDATE appointments  SET tenant_id = (SELECT id FROM tenants WHERE slug = 'soberano');
  ```
- [ ] `prisma migrate deploy` applies cleanly on a fresh DB
- [ ] All existing rows have `tenant_id` set after migration

**Verify:**
```bash
cd packages/api && npx prisma migrate deploy
npx prisma studio  # inspect: all rows have tenant_id
```

**Commit:** `feat(db): migration 1 — add tenants, assign existing rows to soberano`

---

### T3: Write Migration 2 — NOT NULL + indexes

**What:** Generate migration that makes `tenantId` NOT NULL on all tables and adds performance indexes.
**Where:** `packages/api/prisma/migrations/<timestamp>_tenant_id_not_null/migration.sql`
**Depends on:** T2
**Requirement:** TENANT-01

**Skills:** `/coding-guidelines`

**Done when:**
- [ ] `tenant_id` column is NOT NULL on: `providers`, `provider_shifts`, `provider_absences`, `services`, `customers`, `appointments`
- [ ] Indexes added: `appointments(tenant_id, date)`, `providers(tenant_id)`, `customers(tenant_id)`
- [ ] Migration applies cleanly after T2 on a DB with existing data

**Verify:**
```bash
npx prisma migrate deploy
# Verify via psql or studio: tenant_id column is NOT NULL
```

**Commit:** `feat(db): migration 2 — tenant_id NOT NULL + indexes`

---

### T4: Write Migration 3 — Rename barbers → providers

**What:** Generate migration that renames `barbers` → `providers`, `barber_shifts` → `provider_shifts`, `barber_absences` → `provider_absences`, and all `barber_id` FK columns to `provider_id`.
**Where:** `packages/api/prisma/migrations/<timestamp>_rename_barbers_to_providers/migration.sql`
**Depends on:** T3
**Requirement:** TENANT-02

**Skills:** `/coding-guidelines`

**Done when:**
- [ ] `barbers` table renamed to `providers`
- [ ] `barber_shifts` renamed to `provider_shifts`
- [ ] `barber_absences` renamed to `provider_absences`
- [ ] All `barber_id` FK columns renamed to `provider_id`
- [ ] Prisma client regenerated: `npx prisma generate`
- [ ] `npm -w @soberano/api run build` compiles with no errors

**Verify:**
```bash
npx prisma migrate deploy && npx prisma generate
npm -w @soberano/api run build
```

**Commit:** `feat(db): migration 3 — rename barbers→providers tables`

---

### Phase 2 — API Foundation

---

### T5: Add TenantNotFoundError and TenantInactiveError

**What:** Add two new error classes to the existing `AppError` hierarchy.
**Where:** `packages/api/src/shared/errors.ts`
**Depends on:** None
**Requirement:** TENANT-03

**Skills:** `/coding-guidelines`

**Done when:**
- [ ] `TenantNotFoundError` extends `AppError` with `statusCode: 404`, `code: 'TENANT_NOT_FOUND'`
- [ ] `TenantInactiveError` extends `AppError` with `statusCode: 403`, `code: 'TENANT_INACTIVE'`
- [ ] Both exported from `errors.ts`
- [ ] `npm -w @soberano/api run build` passes

**Commit:** `feat(api): add TenantNotFoundError and TenantInactiveError`

---

### T6: Create `createTenantPrisma` factory

**What:** Create the Prisma Client Extension factory that auto-scopes all queries to a tenantId.
**Where:** `packages/api/src/config/tenant-prisma.ts`
**Depends on:** T4 (Prisma client generated with Provider model)
**Requirement:** TENANT-04

**Skills:** `/coding-guidelines`, `/security-best-practices`

**Done when:**
- [ ] `createTenantPrisma(tenantId: string)` function exported
- [ ] Extension uses `$allOperations` to intercept all queries on tenant-scoped models: `provider`, `providershift`, `providerabsence`, `service`, `customer`, `appointment`
- [ ] `create`/`createMany` operations inject `tenantId` into `data`
- [ ] `find*`, `update*`, `delete*`, `count`, `aggregate`, `groupBy`, `upsert` inject `tenantId` into `where`
- [ ] `Tenant` model is NOT in the scoped models list
- [ ] TypeScript compiles with no errors

**Verify:**
```bash
npm -w @soberano/api run build
```

**Commit:** `feat(api): add createTenantPrisma client extension factory`

---

### T7: Add Fastify type augmentation

**What:** Extend Fastify's `FastifyRequest` interface to include `tenant`, `tenantPrisma`, and `providerId`.
**Where:** `packages/api/src/types/fastify.d.ts` (new file)
**Depends on:** T4
**Requirement:** TENANT-03, TENANT-04

**Skills:** `/coding-guidelines`

**Done when:**
- [ ] `FastifyRequest` augmented with `tenant: Tenant`, `tenantPrisma: ReturnType<typeof createTenantPrisma>`, `providerId?: string`
- [ ] File referenced in `tsconfig.json` `include` or auto-picked up
- [ ] `npm -w @soberano/api run build` passes with no type errors on request access

**Commit:** `feat(api): add Fastify request type augmentation for tenant context`

---

### T8: Create tenant middleware

**What:** Create the Fastify preHandler hook that resolves the tenant from `X-Tenant-Slug` header and attaches `tenant` + `tenantPrisma` to the request.
**Where:** `packages/api/src/http/middleware/tenant.middleware.ts`
**Depends on:** T5, T6, T7
**Requirement:** TENANT-03

**Skills:** `/coding-guidelines`, `/security-best-practices`

**Done when:**
- [ ] Reads `X-Tenant-Slug` from `request.headers`
- [ ] Returns `404 TENANT_NOT_FOUND` if header missing or slug unknown
- [ ] Returns `403 TENANT_INACTIVE` if `tenant.isActive === false`
- [ ] Attaches `request.tenant` and `request.tenantPrisma` on success
- [ ] Uses the global `prisma` singleton (not scoped) to resolve the tenant row
- [ ] Unit test: missing header → 404, unknown slug → 404, inactive → 403, valid → passes

**Verify:**
```bash
npm -w @soberano/api run test
```

**Commit:** `feat(api): add tenant resolution middleware`

---

### T9: Update `env.ts`

**What:** Add `ALLOWED_ORIGINS`, `SUPER_ADMIN_JWT_SECRET`, `SUPER_ADMIN_EMAIL`, `SUPER_ADMIN_PASSWORD_HASH` to the Zod env schema. Remove `CHATWOOT_*` variables.
**Where:** `packages/api/src/config/env.ts`
**Depends on:** None
**Requirement:** TENANT-07, TENANT-09

**Skills:** `/coding-guidelines`

**Done when:**
- [ ] `ALLOWED_ORIGINS` added as `z.string()` (comma-separated, parsed to `string[]` via `.transform`)
- [ ] `SUPER_ADMIN_JWT_SECRET` added as `z.string().min(32)`
- [ ] `SUPER_ADMIN_EMAIL` added as `z.string().email()`
- [ ] `SUPER_ADMIN_PASSWORD_HASH` added as `z.string()`
- [ ] All 4 `CHATWOOT_*` variables removed
- [ ] `BASE_URL` removed (replaced by per-tenant `bookingUrl` in config)
- [ ] `npm -w @soberano/api run build` passes

**Commit:** `feat(api): update env schema for multi-tenant (origins, super-admin, remove chatwoot)`

---

### T18: Update `server.ts` — register tenant middleware + CORS

**What:** Register the tenant middleware as a global `preHandler` on all routes except `/api/platform/*`, and update CORS to use `ALLOWED_ORIGINS` array.
**Where:** `packages/api/src/server.ts`
**Depends on:** T8, T9
**Requirement:** TENANT-03, TENANT-07

**Skills:** `/coding-guidelines`

**Done when:**
- [ ] `cors` plugin updated: `origin: env.ALLOWED_ORIGINS` (array in prod, `true` in dev)
- [ ] `tenantMiddleware` registered as global `preHandler` hook
- [ ] Platform routes (`/api/platform/*`) excluded from tenant middleware via route config or prefix check
- [ ] `npm -w @soberano/api run build` passes

**Commit:** `feat(api): register tenant middleware globally, update CORS to multi-origin`

---

### Phase 3 — Repository Refactor

> All T10–T14 can run in parallel after T6.

---

### T10: Refactor `PrismaAppointmentRepository`

**What:** Change constructor to accept a Prisma client parameter instead of importing the singleton.
**Where:** `packages/api/src/infrastructure/database/repositories/prisma-appointment.repository.ts`
**Depends on:** T6
**Requirement:** TENANT-04

**Skills:** `/coding-guidelines`

**Done when:**
- [ ] Constructor: `constructor(private db: PrismaClientOrExtended) {}`
- [ ] All `prisma.appointment.*` calls changed to `this.db.appointment.*`
- [ ] Existing unit tests still pass (tests inject a mock)
- [ ] No import of global `prisma` singleton remains

**Verify:** `npm -w @soberano/api run test`

**Commit:** `refactor(api): inject prisma client into AppointmentRepository`

---

### T11: Refactor `PrismaBarberRepository` → `PrismaProviderRepository`

**What:** Rename file and class, update all internal references from `barber` to `provider`, inject Prisma client.
**Where:** `packages/api/src/infrastructure/database/repositories/prisma-provider.repository.ts` (renamed)
**Depends on:** T6
**Requirement:** TENANT-02, TENANT-04

**Skills:** `/coding-guidelines`

**Done when:**
- [ ] File renamed to `prisma-provider.repository.ts`
- [ ] Class renamed to `PrismaProviderRepository`
- [ ] All `prisma.barber.*` calls changed to `this.db.provider.*`
- [ ] Constructor accepts `db` parameter
- [ ] Old file deleted
- [ ] All imports updated across codebase

**Verify:** `npm -w @soberano/api run build`

**Commit:** `refactor(api): rename BarberRepository→ProviderRepository, inject prisma client`

---

### T12: Refactor `PrismaServiceRepository` [P]

**What:** Inject Prisma client into constructor.
**Where:** `packages/api/src/infrastructure/database/repositories/prisma-service.repository.ts`
**Depends on:** T6
**Requirement:** TENANT-04

**Skills:** `/coding-guidelines`

**Done when:**
- [ ] Constructor accepts `db` parameter
- [ ] All `prisma.service.*` calls use `this.db.service.*`
- [ ] Build passes

**Commit:** `refactor(api): inject prisma client into ServiceRepository`

---

### T13: Refactor `PrismaCustomerRepository` [P]

**What:** Inject Prisma client into constructor.
**Where:** `packages/api/src/infrastructure/database/repositories/prisma-customer.repository.ts`
**Depends on:** T6
**Requirement:** TENANT-04

**Skills:** `/coding-guidelines`

**Done when:**
- [ ] Constructor accepts `db` parameter
- [ ] All `prisma.customer.*` calls use `this.db.customer.*`
- [ ] Build passes

**Commit:** `refactor(api): inject prisma client into CustomerRepository`

---

### T14: Refactor `PrismaProviderShiftRepository` [P]

**What:** Rename from `PrismaBarberShiftRepository`, inject Prisma client.
**Where:** `packages/api/src/infrastructure/database/repositories/prisma-provider-shift.repository.ts` (renamed)
**Depends on:** T6
**Requirement:** TENANT-02, TENANT-04

**Skills:** `/coding-guidelines`

**Done when:**
- [ ] File renamed to `prisma-provider-shift.repository.ts`
- [ ] Class renamed to `PrismaProviderShiftRepository`
- [ ] Constructor accepts `db` parameter
- [ ] All `prisma.providerShift.*` calls use `this.db.providerShift.*`
- [ ] Old file deleted, imports updated
- [ ] Build passes

**Commit:** `refactor(api): rename BarberShiftRepository→ProviderShiftRepository, inject prisma client`

---

### Phase 4 — JWT + Auth

---

### T15: Update `jwt.service.ts`

**What:** Add `tenantId` to `TokenPayload`, rename `barberId` → `providerId`.
**Where:** `packages/api/src/infrastructure/auth/jwt.service.ts`
**Depends on:** None
**Requirement:** TENANT-03

**Skills:** `/coding-guidelines`, `/security-best-practices`

**Done when:**
- [ ] `TokenPayload` has `{ providerId: string; tenantId: string }`
- [ ] `generateAccessToken(providerId, tenantId)` signature updated
- [ ] `generateRefreshToken(providerId, tenantId)` signature updated
- [ ] `verifyAccessToken` and `verifyRefreshToken` return updated payload type
- [ ] Existing JWT tests updated and passing

**Verify:** `npm -w @soberano/api run test`

**Commit:** `feat(api): add tenantId to JWT payload, rename barberId→providerId`

---

### T16: Update `auth.middleware.ts` [P]

**What:** Attach `request.providerId` and `request.tenantId` from the decoded token.
**Where:** `packages/api/src/http/middleware/auth.middleware.ts`
**Depends on:** T15
**Requirement:** TENANT-03

**Skills:** `/coding-guidelines`

**Done when:**
- [ ] `request.providerId` set from `payload.providerId`
- [ ] `request.tenantId` available (from token — not re-resolved from header inside auth guard)
- [ ] Old `request.barberId` reference removed

**Commit:** `feat(api): update authGuard to attach providerId and tenantId from JWT`

---

### T17: Update `authenticate-barber` use case [P]

**What:** Pass `tenantId` when generating tokens so barbers are scoped to their tenant.
**Where:** `packages/api/src/application/use-cases/barber/authenticate-barber.ts`
**Depends on:** T15
**Requirement:** TENANT-03

**Skills:** `/coding-guidelines`

**Done when:**
- [ ] `execute()` fetches `provider.tenantId` after authentication
- [ ] Calls `generateAccessToken(provider.id, provider.tenantId)`
- [ ] Calls `generateRefreshToken(provider.id, provider.tenantId)`
- [ ] Unit test updated: token payload includes `tenantId`

**Verify:** `npm -w @soberano/api run test`

**Commit:** `feat(api): include tenantId in JWT on barber authentication`

---

### Phase 5 — Route Updates

> All T19–T25 can run in parallel after Phase 3 + Phase 4.

---

### T19: Update `booking.routes.ts`

**What:** Instantiate all repositories per-request using `request.tenantPrisma`.
**Where:** `packages/api/src/http/routes/booking.routes.ts`
**Depends on:** T10, T12, T13, T14
**Requirement:** TENANT-04

**Skills:** `/coding-guidelines`

**Done when:**
- [ ] Module-level singleton repos removed
- [ ] Each route handler creates repos with `new PrismaXRepository(request.tenantPrisma)`
- [ ] `WhatsAppNotificationService` instantiated with `request.tenant.config`
- [ ] Build passes, existing booking tests pass

**Commit:** `feat(api): per-request tenant-scoped repos in booking routes`

---

### T20: Update `admin.routes.ts`

**What:** Instantiate repositories per-request, replace `request.barberId` with `request.providerId`.
**Where:** `packages/api/src/http/routes/admin.routes.ts`
**Depends on:** T10, T11, T12, T13, T16
**Requirement:** TENANT-04

**Skills:** `/coding-guidelines`

**Done when:**
- [ ] Module-level singleton repos removed
- [ ] All `request.barberId` references updated to `request.providerId`
- [ ] Repos instantiated per-request with `request.tenantPrisma`
- [ ] `WhatsAppNotificationService` instantiated with `request.tenant.config`
- [ ] Build passes

**Commit:** `feat(api): per-request tenant-scoped repos in admin routes`

---

### T21: Update `barber.routes.ts` [P]

**What:** Instantiate repos per-request, keep route path `/api/barbers` unchanged.
**Where:** `packages/api/src/http/routes/barber.routes.ts`
**Depends on:** T11, T14
**Requirement:** TENANT-04

**Skills:** `/coding-guidelines`

**Done when:**
- [ ] Module-level singletons removed
- [ ] Repos instantiated per-request with `request.tenantPrisma`
- [ ] Route paths (`/barbers`) unchanged — backwards compatible
- [ ] Response shape (`{ barbers: [...] }`) unchanged

**Commit:** `feat(api): per-request tenant-scoped repos in barber routes`

---

### T22: Update `service.routes.ts` [P]

**What:** Instantiate repos per-request.
**Where:** `packages/api/src/http/routes/service.routes.ts`
**Depends on:** T12
**Requirement:** TENANT-04

**Skills:** `/coding-guidelines`

**Done when:**
- [ ] Module-level singletons removed
- [ ] Repos instantiated per-request with `request.tenantPrisma`
- [ ] Build passes

**Commit:** `feat(api): per-request tenant-scoped repos in service routes`

---

### T23: Update `schedule.routes.ts` [P]

**What:** Instantiate repos per-request.
**Where:** `packages/api/src/http/routes/schedule.routes.ts`
**Depends on:** T11, T14
**Requirement:** TENANT-04

**Skills:** `/coding-guidelines`

**Done when:**
- [ ] Module-level singletons removed
- [ ] Repos instantiated per-request with `request.tenantPrisma`
- [ ] Build passes

**Commit:** `feat(api): per-request tenant-scoped repos in schedule routes`

---

### T24: Update `appointment.routes.ts` [P]

**What:** Instantiate repos per-request.
**Where:** `packages/api/src/http/routes/appointment.routes.ts`
**Depends on:** T10, T13
**Requirement:** TENANT-04

**Skills:** `/coding-guidelines`

**Done when:**
- [ ] Module-level singletons removed
- [ ] Repos instantiated per-request with `request.tenantPrisma`
- [ ] Build passes

**Commit:** `feat(api): per-request tenant-scoped repos in appointment routes`

---

### T25: Update `auth.routes.ts` [P]

**What:** Instantiate provider repo per-request. Note: auth routes need a non-scoped provider lookup (login doesn't have a token yet — use global prisma + manual tenantId resolution from header).
**Where:** `packages/api/src/http/routes/auth.routes.ts`
**Depends on:** T11, T17
**Requirement:** TENANT-03

**Skills:** `/coding-guidelines`, `/security-best-practices`

**Done when:**
- [ ] Login route resolves tenant from `X-Tenant-Slug` header (via `request.tenant` set by tenant middleware)
- [ ] `PrismaProviderRepository` instantiated with `request.tenantPrisma`
- [ ] `authenticate-barber` use case receives `tenantId` context
- [ ] Build passes

**Commit:** `feat(api): update auth routes for tenant-scoped provider login`

---

### Phase 6 — Notifications

---

### T28: Add `tenantConfigSchema` to `packages/shared`

**What:** Define and export the Zod schema for `Tenant.config` JSON.
**Where:** `packages/shared/src/index.ts` (or new `packages/shared/src/tenant-config.schema.ts`)
**Depends on:** None
**Requirement:** TENANT-05

**Skills:** `/coding-guidelines`

**Done when:**
- [ ] `tenantConfigSchema` exported with: `businessName`, `providerLabel`, `bookingUrl` (required); `chatwootBaseUrl`, `chatwootApiToken`, `chatwootAccountId`, `chatwootInboxId` (optional)
- [ ] `TenantConfig` TypeScript type inferred and exported
- [ ] `npm -w @soberano/shared run build` passes

**Commit:** `feat(shared): add tenantConfigSchema for tenant notification config`

---

### T26: Update `ChatwootClient` to accept per-tenant config [P]

**What:** Remove global env var dependency, accept Chatwoot credentials in constructor.
**Where:** `packages/api/src/infrastructure/notifications/chatwoot.client.ts`
**Depends on:** T28
**Requirement:** TENANT-05

**Skills:** `/coding-guidelines`, `/security-best-practices`

**Done when:**
- [ ] Constructor accepts `{ chatwootBaseUrl, chatwootApiToken, chatwootAccountId, chatwootInboxId }` config object
- [ ] `isEnabled()` returns `false` when config fields are absent
- [ ] No reference to `env.CHATWOOT_*` remains
- [ ] Build passes

**Commit:** `feat(api): make ChatwootClient accept per-tenant config`

---

### T27: Update `WhatsAppNotificationService` [P]

**What:** Accept `TenantNotificationConfig` in constructor, replace all hardcoded "Soberano Barbearia" / "Barbeiro" strings with config values.
**Where:** `packages/api/src/infrastructure/notifications/whatsapp-notification.service.ts`
**Depends on:** T26, T28
**Requirement:** TENANT-05

**Skills:** `/coding-guidelines`

**Done when:**
- [ ] Constructor: `constructor(private config: TenantConfig, private client: ChatwootClient) {}`
- [ ] All 6 message methods use `this.config.businessName`, `this.config.providerLabel`, `this.config.bookingUrl`
- [ ] No hardcoded "Soberano Barbearia" or "Barbeiro" strings remain
- [ ] Falls back to sensible defaults when config fields missing
- [ ] Build passes

**Commit:** `feat(api): make WhatsAppNotificationService tenant-aware`

---

### Phase 7 — Reminder Job

---

### T29: Update `reminder.job.ts` for multi-tenant

**What:** Refactor cron job to iterate active tenants and send reminders with per-tenant scoped repos and notification config.
**Where:** `packages/api/src/infrastructure/jobs/reminder.job.ts`
**Depends on:** T10, T26, T27
**Requirement:** TENANT-11

**Skills:** `/coding-guidelines`

**Done when:**
- [ ] Job queries all active tenants from global `prisma`
- [ ] For each tenant: creates `tenantPrisma = createTenantPrisma(tenant.id)`
- [ ] `PrismaAppointmentRepository` instantiated with `tenantPrisma`
- [ ] `ChatwootClient` instantiated with `tenant.config`
- [ ] `WhatsAppNotificationService` instantiated with `tenant.config` + chatwoot client
- [ ] Reminder logic per tenant is identical to existing logic
- [ ] If tenant has no Chatwoot config, reminders silently skipped for that tenant

**Commit:** `feat(api): tenant-aware reminder job — iterate tenants, scoped repos`

---

### Phase 8 — Web Frontend (`packages/web`)

---

### T30: Add `VITE_TENANT_SLUG` env validation

**What:** Create a frontend env config file that validates `VITE_TENANT_SLUG` at runtime and throws if missing.
**Where:** `packages/web/src/config/env.ts` (new file)
**Depends on:** None
**Requirement:** TENANT-06

**Skills:** `/coding-guidelines`

**Done when:**
- [ ] File exports `TENANT_SLUG` constant read from `import.meta.env.VITE_TENANT_SLUG`
- [ ] Throws a clear error if `VITE_TENANT_SLUG` is not set
- [ ] `packages/web/src/config/api.ts` and `auth-request.ts` import from this file

**Commit:** `feat(web): add VITE_TENANT_SLUG env validation`

---

### T31: Inject `X-Tenant-Slug` header in `api.ts` [P]

**What:** Add the `X-Tenant-Slug` header to all public API requests.
**Where:** `packages/web/src/config/api.ts`
**Depends on:** T30
**Requirement:** TENANT-06

**Skills:** `/coding-guidelines`

**Done when:**
- [ ] `'X-Tenant-Slug': TENANT_SLUG` added to every `request()` call headers
- [ ] No other behavior changes
- [ ] Existing web tests pass

**Verify:** `npm -w @soberano/web run test`

**Commit:** `feat(web): inject X-Tenant-Slug header on all public API requests`

---

### T32: Inject `X-Tenant-Slug` header in `auth-request.ts` [P]

**What:** Add the `X-Tenant-Slug` header to all authenticated admin API requests.
**Where:** `packages/web/src/api/auth-request.ts`
**Depends on:** T30
**Requirement:** TENANT-06

**Skills:** `/coding-guidelines`

**Done when:**
- [ ] `'X-Tenant-Slug': TENANT_SLUG` added to headers in `makeRequest`
- [ ] Header present on both initial request and retry after token refresh
- [ ] Existing web tests pass

**Commit:** `feat(web): inject X-Tenant-Slug header on all admin API requests`

---

### Phase 9 — Super-Admin API Routes

---

### T35: Create platform auth middleware

**What:** Create a Fastify preHandler that validates the super-admin JWT (signed with `SUPER_ADMIN_JWT_SECRET`).
**Where:** `packages/api/src/http/middleware/platform-auth.middleware.ts`
**Depends on:** T9
**Requirement:** TENANT-09

**Skills:** `/coding-guidelines`, `/security-best-practices`

**Done when:**
- [ ] Reads `Authorization: Bearer <token>` header
- [ ] Verifies token with `env.SUPER_ADMIN_JWT_SECRET`
- [ ] Returns `401` if token missing, invalid, or expired
- [ ] Does NOT use `tenantMiddleware` — platform routes bypass tenant resolution

**Commit:** `feat(api): add platform admin auth middleware`

---

### T33: Create platform auth route [P]

**What:** `POST /api/platform/auth` — validates email + bcrypt password against env vars, returns a signed JWT.
**Where:** `packages/api/src/http/routes/platform.routes.ts`
**Depends on:** T35
**Requirement:** TENANT-09

**Skills:** `/coding-guidelines`, `/security-best-practices`

**Done when:**
- [ ] Route accepts `{ email, password }`
- [ ] Compares email against `env.SUPER_ADMIN_EMAIL`
- [ ] Compares password against `env.SUPER_ADMIN_PASSWORD_HASH` with bcrypt
- [ ] Returns JWT signed with `env.SUPER_ADMIN_JWT_SECRET` (expires 8h)
- [ ] Returns `401` on wrong credentials (no hint which field is wrong)
- [ ] Rate limited: 5 attempts per minute

**Commit:** `feat(api): add platform admin login route`

---

### T34: Create platform tenant CRUD routes [P]

**What:** `GET/POST /api/platform/tenants` and `PATCH /api/platform/tenants/:id` — list, create, and update tenants.
**Where:** `packages/api/src/http/routes/platform.routes.ts` (extend T33's file)
**Depends on:** T35
**Requirement:** TENANT-10

**Skills:** `/coding-guidelines`, `/security-best-practices`

**Done when:**
- [ ] `GET /api/platform/tenants` — returns all tenants (id, slug, name, type, isActive, config)
- [ ] `POST /api/platform/tenants` — creates tenant; validates slug uniqueness; returns `409` on conflict
- [ ] `GET /api/platform/tenants/:id` — returns single tenant
- [ ] `PATCH /api/platform/tenants/:id` — updates name, type, config, isActive
- [ ] All routes protected by `platformAuthMiddleware`
- [ ] Input validated with Zod
- [ ] Uses global `prisma` (not tenant-scoped)

**Commit:** `feat(api): add platform tenant CRUD routes`

---

### Phase 10 — `packages/web-admin`

---

### T36: Scaffold `packages/web-admin`

**What:** Create the package with `package.json`, `vite.config.ts`, `tsconfig.json`, `Dockerfile`, and `nginx.conf` — identical stack to `packages/web`.
**Where:** `packages/web-admin/`
**Depends on:** None
**Requirement:** TENANT-09, TENANT-10

**Skills:** `/coding-guidelines`

**Done when:**
- [ ] `package.json` with name `@soberano/web-admin`, same deps as `packages/web`
- [ ] `vite.config.ts`, `tsconfig.json` match `packages/web` patterns
- [ ] `Dockerfile` copied from `packages/web/Dockerfile` with path adjusted
- [ ] `nginx.conf` copied from `packages/web/nginx.conf`
- [ ] `src/main.tsx` and `index.html` entry points exist
- [ ] `npm -w @soberano/web-admin run build` passes (empty app)

**Commit:** `feat(web-admin): scaffold packages/web-admin`

---

### T37: Create admin API client + auth hooks

**What:** API client for `/api/platform/*` routes with auth token management (localStorage — admin panel is operator-only, not customer-facing).
**Where:** `packages/web-admin/src/api/` and `packages/web-admin/src/stores/auth.store.ts`
**Depends on:** T36
**Requirement:** TENANT-09

**Skills:** `/coding-guidelines`, `/react-best-practices`

**Done when:**
- [ ] `platformRequest(path, options)` function — attaches `Authorization: Bearer` from store
- [ ] `usePlatformAuth()` hook — `login(email, password)`, `logout()`, `isAuthenticated`
- [ ] Auth token stored in Zustand (in-memory) — NOT localStorage
- [ ] `useLogin` mutation hook using TanStack Query

**Commit:** `feat(web-admin): add platform API client and auth store`

---

### T38: Create `LoginPage` [P]

**What:** Login form for the super-admin panel.
**Where:** `packages/web-admin/src/pages/LoginPage.tsx`
**Depends on:** T37
**Requirement:** TENANT-09

**Skills:** `/coding-guidelines`, `/react-best-practices`, `/frontend-design`

**Done when:**
- [ ] Email + password form using existing `Input` + `Button` patterns
- [ ] Calls `useLogin` mutation on submit
- [ ] Shows loading state during request
- [ ] Shows error message on `401`
- [ ] Redirects to `/` on success

**Commit:** `feat(web-admin): add LoginPage`

---

### T39: Create `TenantListPage` [P]

**What:** Table listing all tenants with slug, name, type, and active status.
**Where:** `packages/web-admin/src/pages/TenantListPage.tsx`
**Depends on:** T37
**Requirement:** TENANT-10

**Skills:** `/coding-guidelines`, `/react-best-practices`, `/frontend-design`

**Done when:**
- [ ] Fetches tenants via TanStack Query (`GET /api/platform/tenants`)
- [ ] Table columns: slug, name, type, active badge, "Edit" link
- [ ] "New Tenant" button navigates to `/tenants/new`
- [ ] Loading and empty states handled

**Commit:** `feat(web-admin): add TenantListPage`

---

### T40: Create `TenantFormPage` [P]

**What:** Create/edit form for a tenant — covers both `/tenants/new` and `/tenants/:id`.
**Where:** `packages/web-admin/src/pages/TenantFormPage.tsx`
**Depends on:** T37
**Requirement:** TENANT-10

**Skills:** `/coding-guidelines`, `/react-best-practices`, `/frontend-design`

**Done when:**
- [ ] Fields: name, slug (create only), type select, businessName, providerLabel, bookingUrl, Chatwoot credentials (all 4), isActive toggle
- [ ] On create: `POST /api/platform/tenants` — shows `409` error inline if slug taken
- [ ] On edit: `PATCH /api/platform/tenants/:id` — pre-fills form from existing tenant
- [ ] Validates required fields client-side with Zod (`tenantConfigSchema` from shared)
- [ ] Success → redirect to tenant list

**Commit:** `feat(web-admin): add TenantFormPage (create + edit)`

---

### T41: Create router + `ProtectedRoute`

**What:** Set up React Router with auth protection for all routes except `/login`.
**Where:** `packages/web-admin/src/App.tsx`
**Depends on:** T38, T39, T40
**Requirement:** TENANT-09

**Skills:** `/coding-guidelines`, `/react-best-practices`

**Done when:**
- [ ] Routes: `/login`, `/` (tenant list), `/tenants/new`, `/tenants/:id`
- [ ] `ProtectedRoute` redirects to `/login` if not authenticated
- [ ] App initializes auth state on load

**Commit:** `feat(web-admin): add router and ProtectedRoute`

---

### Phase 11 — Deployment Files

> All T42–T45 are independent and can be created in parallel.

---

### T42: Create `docker-compose.infra.yaml` [P]

**What:** New compose file for the shared API + MCP stack (replaces current `docker-compose.yaml` for the infra).
**Where:** `docker-compose.infra.yaml`
**Depends on:** None
**Requirement:** TENANT-08

**Done when:**
- [ ] `api` and `mcp` services defined
- [ ] `CHATWOOT_*` env vars removed from `api` service
- [ ] `ALLOWED_ORIGINS`, `SUPER_ADMIN_*` env vars added
- [ ] Both services on `coolify` external network

**Commit:** `feat(deploy): add docker-compose.infra.yaml`

---

### T43: Create `docker-compose.web.yaml` [P]

**What:** Per-client web compose file parameterised by `VITE_API_URL` and `VITE_TENANT_SLUG`.
**Where:** `docker-compose.web.yaml`
**Depends on:** None
**Requirement:** TENANT-08

**Done when:**
- [ ] Single `web` service with `build.args`: `VITE_API_URL`, `VITE_TENANT_SLUG`
- [ ] On `coolify` external network
- [ ] Dockerfile path: `packages/web/Dockerfile` (default, overridden per client)

**Commit:** `feat(deploy): add docker-compose.web.yaml for per-client frontends`

---

### T44: Create `docker-compose.admin.yaml` [P]

**What:** Compose file for the super-admin panel.
**Where:** `docker-compose.admin.yaml`
**Depends on:** T36
**Requirement:** TENANT-09

**Done when:**
- [ ] Single `web-admin` service
- [ ] Build arg: `VITE_API_URL`
- [ ] Dockerfile: `packages/web-admin/Dockerfile`
- [ ] On `coolify` external network

**Commit:** `feat(deploy): add docker-compose.admin.yaml`

---

### T45: Update root `package.json` workspace + scripts [P]

**What:** Add `web-admin` to workspaces, add dev/build scripts for the new package.
**Where:** `package.json`
**Depends on:** T36
**Requirement:** TENANT-09

**Done when:**
- [ ] `packages/web-admin` in `workspaces` array
- [ ] `dev:admin`, `build:admin` scripts added
- [ ] `npm install` from root resolves web-admin deps

**Commit:** `chore: add web-admin to workspace and root scripts`

---

### Phase 12 — Tests

---

### T46: Update existing API unit tests for tenantId [P]

**What:** Add `tenantId` to all test fixtures that create `Provider`, `Service`, `Customer`, or `Appointment` objects.
**Where:** `packages/api/src/application/use-cases/booking/__tests__/*.test.ts`
**Depends on:** T10–T14
**Requirement:** TENANT-01

**Skills:** `/coding-guidelines`

**Done when:**
- [ ] All test fixtures include a `tenantId` field
- [ ] All tests pass: `npm -w @soberano/api run test`

**Commit:** `test(api): update fixtures with tenantId for multi-tenancy`

---

### T47: Add tenant isolation integration test [P]

**What:** Test that data from tenant A cannot be returned when querying as tenant B.
**Where:** `packages/api/src/application/use-cases/booking/__tests__/tenant-isolation.test.ts`
**Depends on:** T6, T10–T14
**Requirement:** TENANT-04

**Skills:** `/coding-guidelines`, `/security-best-practices`

**Done when:**
- [ ] Two mock tenants created in test setup
- [ ] Appointment created for tenant A
- [ ] Query via tenant B's scoped client returns empty result
- [ ] Test passes: `npm -w @soberano/api run test`

**Commit:** `test(api): add tenant isolation test`

---

### T48: Update web tests for X-Tenant-Slug header [P]

**What:** Mock `VITE_TENANT_SLUG` env var in web tests so header injection doesn't break existing test setup.
**Where:** `packages/web/src/components/__tests__/*.test.tsx`, `vitest.config` or `vitest.setup.ts`
**Depends on:** T31, T32
**Requirement:** TENANT-06

**Skills:** `/coding-guidelines`, `/react-best-practices`

**Done when:**
- [ ] `VITE_TENANT_SLUG` env var mocked in test setup (`import.meta.env.VITE_TENANT_SLUG = 'test'`)
- [ ] All existing web tests pass: `npm -w @soberano/web run test`

**Commit:** `test(web): mock VITE_TENANT_SLUG in test setup`

---

## Parallel Execution Map

```
Phase 1 — DB (sequential):
  T1 → T2 → T3 → T4

Phase 2 — API Foundation:
  T4 complete, then parallel:
    ├── T5
    ├── T6
    ├── T7
    └── T9
  T5+T6+T7 → T8
  T9+T8 → T18

Phase 3 — Repos (parallel after T6):
  T6 complete → T10 | T11 | T12 | T13 | T14

Phase 4 — JWT (sequential then parallel):
  T15 → T16 | T17

Phase 5 — Routes (parallel after Phase 3+4):
  T10-T14 + T16-T17 complete → T19 | T20 | T21 | T22 | T23 | T24 | T25

Phase 6 — Notifications:
  T28 → T26 | T27

Phase 7 — Reminder:
  T10 + T26 + T27 → T29

Phase 8 — Web frontend:
  T30 → T31 | T32

Phase 9 — Platform API:
  T8+T9 complete → T35 → T33 | T34

Phase 10 — web-admin:
  T36 → T37 → T38 | T39 | T40 → T41

Phase 11 — Deployment (all parallel, independent):
  T42 | T43 | T44 | T45

Phase 12 — Tests (after Phase 5 + 8):
  T46 | T47 | T48
```

---

## Requirement Traceability

| Requirement | Tasks |
|-------------|-------|
| TENANT-01 | T1, T2, T3, T46 |
| TENANT-02 | T1, T4, T11, T14 |
| TENANT-03 | T5, T7, T8, T15, T16, T17, T25 |
| TENANT-04 | T6, T7, T8, T10–T14, T19–T25, T47 |
| TENANT-05 | T26, T27, T28 |
| TENANT-06 | T30, T31, T32, T48 |
| TENANT-07 | T9, T18 |
| TENANT-08 | T42, T43 |
| TENANT-09 | T33, T35, T36, T37, T38, T41, T44, T45 |
| TENANT-10 | T34, T39, T40 |
| TENANT-11 | T29 |
