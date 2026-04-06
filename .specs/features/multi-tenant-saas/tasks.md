# Multi-Tenant SaaS Tasks

**Design**: `.specs/features/multi-tenant-saas/design.md`  
**Status**: Approved

---

## Execution Plan

```
Phase 1 (Sequential — DB foundation everything depends on this):
  T01 → T02 → T03 → T04

Phase 2 (Parallel — domain types, can start alongside Phase 1):
  T05 [P]
  T06 [P]
  T07 [P]

Phase 3 (After T05):
  T05 → T08 → T09
         ↘ T10 (after T08)

Phase 4 (Parallel — after T02):
  T02 complete, then:
  ├── T11 [P]
  ├── T12 [P]
  ├── T13 [P]
  └── T14 [P]

Phase 5 (Notification refactor — after T07):
  T07 → T15 → T16 → T17
                ↘ T17 (after T15+T16)

Phase 6 (Use-case updates — after T11–T14 + T16):
  T18 [P]
  T19 [P]
  T20 [P]

Phase 7 (Routes — after T09 + T10 + T18–T20):
  T21 (server.ts — first)
  then parallel:
  ├── T22 [P]
  ├── T23 [P]
  ├── T24 [P]
  ├── T25 [P]
  ├── T26 [P]
  └── T27 [P] → T28

Phase 8 (Frontend — can start after T27 is done):
  T29 → T30 → T31 → T32 → T33 → T34 → T35 → T36

Phase 9 — P2 Super-Admin (independent, after T08):
  T37 → T38 → T39
```

---

## Task Breakdown

---

### T01: Add `Client` model to Prisma schema

**What**: Define the `Client` model in `schema.prisma` as shown in design.md  
**Where**: `packages/api/prisma/schema.prisma`  
**Depends on**: None  
**Reuses**: Existing model conventions (uuid pk, snake_case map, Timestamptz)  
**Requirement**: MTS-01

**Done when**:
- [ ] `Client` model added with all fields: `id`, `slug`, `name`, `customDomain`, `enabledFeatures`, `theme` (Json), `baseUrl`, `timezone`, `isActive`, per-client Chatwoot fields, timestamps
- [ ] `Client` has relations to `Barber[]`, `Service[]`, `Customer[]`, `Appointment[]` (defined ahead — Prisma will validate on migrate)
- [ ] `@@map("clients")` applied
- [ ] `prisma validate` passes (or equivalent TypeScript check)

**Verify**: `npx prisma validate` in `packages/api/` — no errors

**Commit**: `feat(db): add Client model to prisma schema`

---

### T02: Add `clientId` FK to Barber, Service, Customer, Appointment

**What**: Add `clientId` field + relation to all four models; update unique constraints to be tenant-scoped  
**Where**: `packages/api/prisma/schema.prisma`  
**Depends on**: T01  
**Reuses**: Existing FK pattern (see `barberId` on `BarberShift`)  
**Requirement**: MTS-01

**Changes per model**:

```prisma
// Barber: add clientId, update @@unique
clientId  String @map("client_id") @db.Uuid
client    Client @relation(fields: [clientId], references: [id])
// Remove: slug @unique, email @unique
// Add:   @@unique([clientId, slug])  @@unique([clientId, email])

// Service: add clientId, update @@unique
clientId  String @map("client_id") @db.Uuid
client    Client @relation(fields: [clientId], references: [id])
// Remove: slug @unique
// Add:   @@unique([clientId, slug])

// Customer: add clientId, update @@unique
clientId  String @map("client_id") @db.Uuid
client    Client @relation(fields: [clientId], references: [id])
// Remove: phone @unique
// Add:   @@unique([clientId, phone])

// Appointment: add clientId
clientId  String @map("client_id") @db.Uuid
client    Client @relation(fields: [clientId], references: [id])
@@index([clientId, date])
```

**Done when**:
- [ ] All four models have `clientId String @map("client_id") @db.Uuid`
- [ ] All four models have `client Client @relation(...)` 
- [ ] `Barber`: `@@unique([clientId, slug])` and `@@unique([clientId, email])` replace field-level `@unique`
- [ ] `Service`: `@@unique([clientId, slug])` replaces field-level `@unique`
- [ ] `Customer`: `@@unique([clientId, phone])` replaces field-level `@unique`
- [ ] `Appointment`: `@@index([clientId, date])` added
- [ ] `prisma validate` passes

**Verify**: `npx prisma validate` — no errors

**Commit**: `feat(db): add clientId FK to barber, service, customer, appointment models`

---

### T03: Generate Prisma migration

**What**: Generate the SQL migration from the schema changes; migration uses nullable-first strategy to support backfill  
**Where**: `packages/api/prisma/migrations/`  
**Depends on**: T01, T02  
**Requirement**: MTS-01, MTS-05

**Strategy** — two-step migration to allow safe backfill:
1. First migration: add all `clientId` columns as **nullable** (even though final schema is non-null) + add `clients` table
2. Backfill script (T04) runs
3. Second migration (part of T04): make `clientId` NOT NULL + add indexes + drop old unique constraints + add new compound ones

For the initial migration, temporarily mark `clientId` as optional in schema (`String?`) to generate a nullable column, then after T04 backfills data, update schema back to `String` (non-null) and generate the second migration.

**Done when**:
- [ ] `npx prisma migrate dev --name add_clients_table` runs successfully in `packages/api/`
- [ ] Migration SQL file created in `packages/api/prisma/migrations/`
- [ ] `npx prisma generate` runs without errors
- [ ] Prisma Client types include `Client`, `clientId` on all four models

**Verify**: `npx prisma migrate dev --name add_clients_table` — exits 0; `packages/api/prisma/migrations/` has new folder

**Commit**: `feat(db): migration — add clients table with nullable clientId FKs`

---

### T04: Create Soberano tenant backfill script

**What**: Script that creates the Soberano `Client` record and backfills `clientId` on all existing rows in a single transaction  
**Where**: `packages/api/src/infrastructure/database/seed-tenant-soberano.ts`  
**Depends on**: T03  
**Requirement**: MTS-05

**Script logic**:
```typescript
// Inside prisma.$transaction([...]):
// 1. prisma.client.create({ data: { slug: 'soberano', name: 'Soberano Barbearia', ... }})
// 2. prisma.barber.updateMany({ where: { clientId: null }, data: { clientId: soberano.id } })
// 3. prisma.service.updateMany({ where: { clientId: null }, data: { clientId: soberano.id } })
// 4. prisma.customer.updateMany({ where: { clientId: null }, data: { clientId: soberano.id } })
// 5. prisma.appointment.updateMany({ where: { clientId: null }, data: { clientId: soberano.id } })
```

Soberano `Client` data:
- `slug`: `"soberano"`
- `name`: `"Soberano Barbearia"`
- `baseUrl`: reads from `env.BASE_URL` (or hardcoded `"https://soberano.altion.com.br"` as fallback)
- `timezone`: `"America/Campo_Grande"`
- `enabledFeatures`: all features (AI plan)
- `theme`: `{ "primaryColor": "#1a1a2e", "primaryColorHover": "#16213e", "logoUrl": null }` (placeholder — update in DB later)
- Chatwoot fields: copied from current `env.CHATWOOT_*` values (or nullable if absent)

After backfill, generate second migration making `clientId` NOT NULL:
- Update schema: `clientId String?` → `clientId String`
- Run `npx prisma migrate dev --name make_clientId_required`

**Done when**:
- [ ] Script runs without error: `npx ts-node src/infrastructure/database/seed-tenant-soberano.ts`
- [ ] `prisma.client.count()` returns 1 (Soberano)
- [ ] `prisma.barber.findFirst({ where: { clientId: null } })` returns null
- [ ] `prisma.service.findFirst({ where: { clientId: null } })` returns null
- [ ] `prisma.customer.findFirst({ where: { clientId: null } })` returns null
- [ ] `prisma.appointment.findFirst({ where: { clientId: null } })` returns null
- [ ] Second migration (NOT NULL) runs successfully

**Verify**: Run script on dev DB; verify all counts match pre-migration totals

**Commit**: `feat(db): backfill Soberano tenant + make clientId required`

---

### T05: Create `ClientEntity` type + `ClientRepository` interface

**What**: Domain types for the `Client` entity and its repository interface  
**Where**: 
- `packages/api/src/domain/entities/client.ts`
- `packages/api/src/domain/repositories/client.repository.ts`  
**Depends on**: None (can write before migration)  
**Requirement**: MTS-01, MTS-03

```typescript
// client.ts
export interface ClientEntity {
  id: string
  slug: string
  name: string
  customDomain: string | null
  enabledFeatures: string[]
  theme: { primaryColor: string; primaryColorHover: string; logoUrl: string | null }
  baseUrl: string
  timezone: string
  isActive: boolean
  chatwootBaseUrl?: string | null
  chatwootToken?: string | null
  chatwootAccountId?: number | null
  chatwootInboxId?: number | null
}

// client.repository.ts
export interface ClientRepository {
  findBySlug(slug: string): Promise<ClientEntity | null>
  findByCustomDomain(domain: string): Promise<ClientEntity | null>
  findAll(): Promise<ClientEntity[]>
  create(data: CreateClientData): Promise<ClientEntity>
  updateFeatures(id: string, features: string[]): Promise<void>
}
```

**Done when**:
- [ ] `ClientEntity` interface exported from `domain/entities/client.ts`
- [ ] `ClientRepository` interface exported from `domain/repositories/client.repository.ts`
- [ ] `CreateClientData` type defined (all required fields except `id`, `createdAt`, `updatedAt`)
- [ ] No TypeScript errors

**Commit**: `feat(domain): add ClientEntity type and ClientRepository interface`

---

### T06: Create `FeatureKey` registry + `requireFeature` middleware

**What**: Central feature registry, plan presets, and the Fastify `preHandler` hook that gates routes by feature flag  
**Where**:
- `packages/api/src/shared/features.ts` (registry + plan presets)
- `packages/api/src/http/middleware/feature.middleware.ts` (requireFeature hook)  
**Depends on**: None  
**Requirement**: MTS-03

```typescript
// features.ts
export const FEATURES = {
  BOOKING: 'booking',
  ADMIN_DASHBOARD: 'admin-dashboard',
  SCHEDULE_MANAGEMENT: 'schedule-management',
  WHATSAPP_NOTIFICATIONS: 'whatsapp-notifications',
  MANUAL_BOOKING: 'manual-booking',
  WHATSAPP_AI_CHATBOT: 'whatsapp-ai-chatbot',
  AI_FEATURES: 'ai-features',
} as const

export type FeatureKey = typeof FEATURES[keyof typeof FEATURES]

export const PLAN_FEATURES: Record<'site-only' | 'ai', FeatureKey[]> = { ... }

// feature.middleware.ts
export function requireFeature(feature: FeatureKey) {
  return async (request: FastifyRequest & { client: ClientEntity }, reply: FastifyReply) => {
    if (!request.client.enabledFeatures.includes(feature)) {
      return reply.status(403).send({ error: 'FEATURE_NOT_ENABLED', message: 'Funcionalidade não disponível neste plano.' })
    }
  }
}
```

**Done when**:
- [ ] All 7 feature keys defined in `FEATURES` const
- [ ] `FeatureKey` type exported
- [ ] `PLAN_FEATURES['site-only']` and `PLAN_FEATURES['ai']` arrays defined
- [ ] `requireFeature` returns an async Fastify `preHandler` function
- [ ] Returns `403 FEATURE_NOT_ENABLED` when feature not in `request.client.enabledFeatures`
- [ ] No TypeScript errors

**Commit**: `feat(api): add feature registry and requireFeature middleware`

---

### T07: Update `env.ts` — remove per-client config vars

**What**: Remove `CHATWOOT_*` and `BASE_URL` from the global env schema (these move to `Client` DB record); keep only truly shared vars  
**Where**: `packages/api/src/config/env.ts`  
**Depends on**: None  
**Requirement**: MTS-07

**Remove from schema**: `CHATWOOT_BASE_URL`, `CHATWOOT_API_TOKEN`, `CHATWOOT_ACCOUNT_ID`, `CHATWOOT_INBOX_ID`, `BASE_URL`  
**Keep**: `NODE_ENV`, `PORT`, `DATABASE_URL`, `JWT_SECRET`, `JWT_REFRESH_SECRET`

**Done when**:
- [ ] All 5 Chatwoot + BASE_URL vars removed from Zod schema
- [ ] `process.exit(1)` still fires if remaining required vars are absent
- [ ] No TypeScript errors (`env.BASE_URL` references will fail — these are fixed in T16, T18, T23–T26)
- [ ] `env.ts` exports only the 5 shared vars

**Note**: This task will cause TypeScript errors in files that reference removed `env.*` vars. That's expected — those are fixed in downstream tasks (T16, T18, routes).

**Commit**: `refactor(config): remove per-client env vars (moved to Client DB record)`

---

### T08: Implement `PrismaClientRepository`

**What**: Prisma implementation of `ClientRepository` interface  
**Where**: `packages/api/src/infrastructure/database/repositories/prisma-client.repository.ts`  
**Depends on**: T05 (interface), T03 (migration — Prisma client must have `Client` model)  
**Reuses**: Pattern from `PrismaBarberRepository`  
**Requirement**: MTS-01, MTS-02

**Methods**:
- `findBySlug(slug)` → `prisma.client.findUnique({ where: { slug } })`
- `findByCustomDomain(domain)` → `prisma.client.findUnique({ where: { customDomain: domain } })`
- `findAll()` → `prisma.client.findMany({ orderBy: { name: 'asc' } })`
- `create(data)` → `prisma.client.create({ data })`
- `updateFeatures(id, features)` → `prisma.client.update({ where: { id }, data: { enabledFeatures: features } })`

**Done when**:
- [ ] Implements all 5 methods from `ClientRepository` interface
- [ ] `findBySlug` and `findByCustomDomain` return `null` when not found
- [ ] No TypeScript errors
- [ ] `implements ClientRepository` declared on class

**Commit**: `feat(infra): implement PrismaClientRepository`

---

### T09: Create `TenantPlugin` Fastify plugin

**What**: Fastify plugin that resolves the `Client` from the `Host` header on every request; attaches to `request.client`; uses in-memory cache  
**Where**: `packages/api/src/http/plugins/tenant.plugin.ts`  
**Depends on**: T08 (PrismaClientRepository)  
**Requirement**: MTS-02

**Logic**:
```typescript
const cache = new Map<string, ClientEntity>()

async function resolveTenant(request, reply) {
  // Skip health check
  if (request.url === '/api/health') return

  const host = request.headers.host?.split(':')[0] ?? ''

  if (cache.has(host)) {
    request.client = cache.get(host)!
    return
  }

  // 1. Try customDomain
  let client = await clientRepo.findByCustomDomain(host)

  // 2. Fall back to subdomain: soberano.altion.com.br → soberano
  if (!client) {
    const slug = host.split('.')[0]
    client = await clientRepo.findBySlug(slug)
  }

  if (!client || !client.isActive) {
    return reply.status(503).send({ error: 'CLIENT_NOT_FOUND', message: 'Cliente não encontrado.' })
  }

  cache.set(host, client)
  request.client = client
}

// Fastify type augmentation in types.d.ts
declare module 'fastify' {
  interface FastifyRequest {
    client: ClientEntity
  }
}
```

**Done when**:
- [ ] `request.client` is typed via Fastify module augmentation (new `packages/api/src/types.d.ts`)
- [ ] Plugin checks `customDomain` first, then falls back to subdomain slug
- [ ] `/api/health` is exempt (no tenant resolution)
- [ ] Returns `503 CLIENT_NOT_FOUND` for unknown hosts
- [ ] Returns `503 CLIENT_NOT_FOUND` for inactive clients
- [ ] Resolved client is cached in-memory by host string
- [ ] Plugin exported as a Fastify plugin (or as an `onRequest` hook function)

**Verify**: 
```
curl -H "Host: soberano.altion.com.br" http://localhost:3000/api/services
# → 200 with services
curl -H "Host: unknown.altion.com.br" http://localhost:3000/api/services
# → 503 CLIENT_NOT_FOUND
```

**Commit**: `feat(api): add TenantPlugin for Host-header tenant resolution`

---

### T10: Update `authGuard` — add tenant verification

**What**: After JWT validation, verify that the decoded `barberId` belongs to the resolved `request.client`  
**Where**: `packages/api/src/http/middleware/auth.middleware.ts`  
**Depends on**: T09 (request.client available), T11 (barber repo must support clientId lookup)  
**Reuses**: Existing `authGuard` function — modify it  
**Requirement**: MTS-02

**Change**:
```typescript
const payload = verifyAccessToken(token)
const barber = await barberRepo.findById(payload.barberId, request.client.id)
if (!barber) {
  return reply.status(403).send({ error: 'TENANT_MISMATCH', message: 'Acesso não autorizado.' })
}
(request as FastifyRequest & { barberId: string }).barberId = payload.barberId
```

**Done when**:
- [ ] After JWT decode, barber is fetched with `clientId` scope
- [ ] Returns `403 TENANT_MISMATCH` if barber not found in that client
- [ ] `barberId` still attached to request on success
- [ ] Existing auth behavior unchanged for valid same-tenant tokens

**Commit**: `feat(auth): add tenant mismatch verification to authGuard`

---

### T11: Update `BarberRepository` + `PrismaBarberRepository` [P]

**What**: Add `clientId` parameter to all methods that query tenant-owned barbers  
**Where**:
- `packages/api/src/domain/repositories/barber.repository.ts`
- `packages/api/src/infrastructure/database/repositories/prisma-barber.repository.ts`  
**Depends on**: T02 (schema has clientId)  
**Requirement**: MTS-01

**Interface changes**:
```typescript
findAllActive(clientId: string): Promise<BarberEntity[]>
findById(id: string, clientId: string): Promise<BarberEntity | null>
findByEmail(email: string, clientId: string): Promise<BarberEntity | null>
```

**Prisma changes** (add `clientId` to every `where`):
```typescript
findAllActive(clientId: string) {
  return prisma.barber.findMany({ where: { isActive: true, clientId } })
}
findById(id: string, clientId: string) {
  return prisma.barber.findFirst({ where: { id, clientId } })
}
findByEmail(email: string, clientId: string) {
  return prisma.barber.findFirst({ where: { email, clientId } })
  // Note: findFirst instead of findUnique because unique constraint is now compound
}
```

**Done when**:
- [ ] All 3 interface method signatures updated with `clientId` param
- [ ] All 3 Prisma implementations filter by `clientId`
- [ ] `findByEmail` uses `findFirst` with compound filter (not `findUnique`)
- [ ] No TypeScript errors in repository file

**Commit**: `feat(repo): scope BarberRepository queries by clientId`

---

### T12: Update `ServiceRepository` + `PrismaServiceRepository` [P]

**What**: Add `clientId` parameter to service queries  
**Where**:
- `packages/api/src/domain/repositories/service.repository.ts`
- `packages/api/src/infrastructure/database/repositories/prisma-service.repository.ts`  
**Depends on**: T02  
**Requirement**: MTS-01

**Interface changes**:
```typescript
findAllActive(clientId: string): Promise<ServiceEntity[]>
findById(id: string, clientId: string): Promise<ServiceEntity | null>
```

**Prisma changes**: add `clientId` to `where` in both methods

**Done when**:
- [ ] Both methods updated with `clientId` param and filter
- [ ] No TypeScript errors

**Commit**: `feat(repo): scope ServiceRepository queries by clientId`

---

### T13: Update `CustomerRepository` + `PrismaCustomerRepository` [P]

**What**: Add `clientId` to all customer queries; update `upsertByPhone` to use compound unique key  
**Where**:
- `packages/api/src/domain/repositories/customer.repository.ts`
- `packages/api/src/infrastructure/database/repositories/prisma-customer.repository.ts`  
**Depends on**: T02  
**Requirement**: MTS-01

**Interface changes**:
```typescript
findByPhone(phone: string, clientId: string): Promise<CustomerEntity | null>
upsertByPhone(phone: string, name: string, clientId: string): Promise<CustomerEntity>
createWalkin(name: string, clientId: string): Promise<CustomerEntity>
```

**Prisma changes** — critical: `phone` is no longer globally unique, so `findUnique({ where: { phone } })` must become `findFirst({ where: { phone, clientId } })`. Same for `upsert`:
```typescript
upsertByPhone(phone, name, clientId) {
  return prisma.customer.upsert({
    where: { clientId_phone: { clientId, phone } },
    update: { name },
    create: { phone, name, clientId },
  })
}
```
(Prisma generates the compound unique key name as `clientId_phone` based on field names in `@@unique([clientId, phone])`)

**Done when**:
- [ ] All 3 methods take `clientId` param
- [ ] `findByPhone` uses `findFirst` (not `findUnique`)
- [ ] `upsertByPhone` uses compound unique key `clientId_phone`
- [ ] `createWalkin` includes `clientId` in create data
- [ ] No TypeScript errors

**Commit**: `feat(repo): scope CustomerRepository queries by clientId`

---

### T14: Update `AppointmentRepository` + `PrismaAppointmentRepository` [P]

**What**: Add `clientId` to scoped appointment queries; add `clientId` to `create` data  
**Where**:
- `packages/api/src/domain/repositories/appointment.repository.ts`
- `packages/api/src/infrastructure/database/repositories/prisma-appointment.repository.ts`  
**Depends on**: T02  
**Requirement**: MTS-01

**Changes**:
- `CreateAppointmentData` interface: add `clientId: string`
- `create(data)` — `data` already includes `clientId`
- `findByCancelToken(token)` — add cross-tenant guard: after fetching, verify `appointment.clientId === clientId` parameter; add `clientId` param
- `findByBarberAndDate(barberId, date, clientId)` — add `clientId` to `where`
- `findById(id, clientId)` — add `clientId` to `where`
- `findBookedSlots(barberId, date, clientId)` — add `clientId` to `where`
- `findByBarberAndDateRange(barberId, from, to, clientId)` — add `clientId`
- `getStatsByDateRange(barberId, from, to, clientId)` — add `clientId`
- `findUpcomingWithoutReminder()` and `findUpcomingWithoutBarberReminder()` — add `include: { client: true }` (no clientId filter — reminder job is cross-tenant)

**Done when**:
- [ ] `CreateAppointmentData` has `clientId`
- [ ] All scoped `findMany`/`findUnique` include `clientId` in `where`
- [ ] `findByCancelToken` verifies `appointment.clientId === clientId` (throws `NotFoundError` if mismatch)
- [ ] Reminder queries include `client` in Prisma `include`
- [ ] No TypeScript errors

**Commit**: `feat(repo): scope AppointmentRepository queries by clientId`

---

### T15: Refactor `ChatwootClient` — accept config in constructor

**What**: Remove global `env` reads from `ChatwootClient`; accept credentials via constructor  
**Where**: `packages/api/src/infrastructure/notifications/chatwoot.client.ts`  
**Depends on**: T07 (env.ts no longer has Chatwoot vars)  
**Requirement**: MTS-07

**Change**:
```typescript
interface ChatwootConfig {
  baseUrl: string
  apiToken: string
  accountId: number
  inboxId: number
}

export class ChatwootClient {
  constructor(private config: ChatwootConfig | null) {}
  isEnabled(): boolean { return this.config !== null }
  // ... sendToPhone uses this.config instead of env.*
}
```

**Done when**:
- [ ] Constructor accepts `ChatwootConfig | null`
- [ ] `isEnabled()` returns `false` when config is `null` (graceful degrade preserved)
- [ ] All `env.CHATWOOT_*` references removed
- [ ] No TypeScript errors

**Commit**: `refactor(notifications): ChatwootClient accepts config in constructor`

---

### T16: Refactor `WhatsAppNotificationService` — per-client config

**What**: Remove global `env` reads; accept `ClientNotificationConfig` in constructor; replace hardcoded `Soberano Barbearia` strings  
**Where**: `packages/api/src/infrastructure/notifications/whatsapp-notification.service.ts`  
**Depends on**: T15  
**Requirement**: MTS-07

**Changes**:
```typescript
export interface ClientNotificationConfig {
  shopName: string
  baseUrl: string
  chatwoot: ChatwootConfig | null
}

export function createNotificationService(client: ClientEntity): WhatsAppNotificationService {
  const chatwootConfig = client.chatwootBaseUrl && client.chatwootToken
    ? { baseUrl: client.chatwootBaseUrl, apiToken: client.chatwootToken, accountId: client.chatwootAccountId!, inboxId: client.chatwootInboxId! }
    : null
  return new WhatsAppNotificationService({ shopName: client.name, baseUrl: client.baseUrl, chatwoot: chatwootConfig })
}

export class WhatsAppNotificationService {
  private client: ChatwootClient
  constructor(private config: ClientNotificationConfig) {
    this.client = new ChatwootClient(config.chatwoot)
  }
}
```

Replace all occurrences of:
- `Soberano Barbearia` → `this.config.shopName`
- `env.BASE_URL` → `this.config.baseUrl`

**Done when**:
- [ ] Constructor accepts `ClientNotificationConfig`
- [ ] `createNotificationService(client)` factory exported
- [ ] All 6 hardcoded `Soberano Barbearia` strings replaced with `this.config.shopName`
- [ ] All `env.BASE_URL` references replaced with `this.config.baseUrl`
- [ ] `ChatwootClient` receives config from constructor
- [ ] No TypeScript errors

**Commit**: `refactor(notifications): WhatsAppNotificationService accepts per-client config`

---

### T17: Update `ReminderJob` — per-tenant notification service

**What**: Update reminder cron job to use per-client notification config for each appointment  
**Where**: `packages/api/src/infrastructure/jobs/reminder.job.ts`  
**Depends on**: T16 (`createNotificationService`), T14 (`client` included in reminder query results)  
**Requirement**: MTS-07

**Change**:
```typescript
// For each appointment, create the right notification service:
const notificationSvc = createNotificationService(appointment.client)
await notificationSvc.sendReminder(appointment)
```

`appointment.client` is available because T14 added `include: { client: true }` to reminder queries.

**Done when**:
- [ ] `createNotificationService` imported and used per appointment in both reminder loops
- [ ] No module-level `new WhatsAppNotificationService()` singleton
- [ ] No `env.*` references remain in this file
- [ ] No TypeScript errors

**Commit**: `feat(jobs): reminder job uses per-tenant notification service`

---

### T18: Update `CreateAppointment` use-case [P]

**What**: Add `clientId` to input + appointment creation; remove direct `env` import; build cancel URL from input  
**Where**: `packages/api/src/application/use-cases/booking/create-appointment.ts`  
**Depends on**: T11, T12, T13, T14, T16  
**Requirement**: MTS-01

**Changes**:
- Add `clientId: string` to `CreateAppointmentInput`
- Pass `clientId` to `serviceRepo.findById`, `barberRepo.findById`, `customerRepo.upsertByPhone`, `appointmentRepo.create`
- Remove `import { env }` — remove `cancelUrl` construction from this use-case
- Return only `{ appointment }` (route handler builds `cancelUrl` using `request.client.baseUrl`)
- Constructor accepts pre-built `WhatsAppNotificationService` (no change — already injected)

**Done when**:
- [ ] `clientId` in `CreateAppointmentInput` and passed to all repo calls
- [ ] `import { env }` removed
- [ ] `cancelUrl` removed from return value (route handles this)
- [ ] No TypeScript errors

**Commit**: `feat(use-case): CreateAppointment passes clientId to repos`

---

### T19: Update `CancelAppointment` + `ChangeAppointment` use-cases [P]

**What**: Pass `clientId` to appointment repo lookups; remove `env` references  
**Where**:
- `packages/api/src/application/use-cases/booking/cancel-appointment.ts`
- `packages/api/src/application/use-cases/booking/change-appointment.ts`  
**Depends on**: T14, T16  
**Requirement**: MTS-01

**Changes**: Add `clientId` parameter to `execute(token, phoneLastFour, clientId)` and pass to `appointmentRepo.findByCancelToken(token, clientId)`. Any `env.BASE_URL` usage → remove or move to route handler.

**Done when**:
- [ ] Both `execute` methods accept `clientId`
- [ ] `findByCancelToken` called with `clientId`
- [ ] No `env.*` references
- [ ] No TypeScript errors

**Commit**: `feat(use-case): CancelAppointment and ChangeAppointment pass clientId`

---

### T20: Update `AdminCreateAppointment` use-case [P]

**What**: Pass `clientId` to all repo calls  
**Where**: `packages/api/src/application/use-cases/booking/admin-create-appointment.ts`  
**Depends on**: T11, T12, T13, T14, T16  
**Requirement**: MTS-01

Same pattern as T18: add `clientId` to input, pass to all repos, remove `env` references.

**Done when**:
- [ ] `clientId` in input interface and passed to all repo calls
- [ ] No `env.*` references
- [ ] No TypeScript errors

**Commit**: `feat(use-case): AdminCreateAppointment passes clientId`

---

### T21: Register `TenantPlugin` in `server.ts` + update CORS

**What**: Register `TenantPlugin` as a global `onRequest` hook before all routes; update CORS to allow multiple origins  
**Where**: `packages/api/src/server.ts`  
**Depends on**: T09  
**Requirement**: MTS-02

**Changes**:
```typescript
// Register tenant resolution before routes
app.addHook('onRequest', tenantMiddleware)

// CORS: allow *.altion.com.br and localhost for dev
await app.register(cors, {
  origin: (origin, cb) => {
    if (!origin || /\.altion\.com\.br$/.test(origin) || /^http:\/\/localhost/.test(origin)) {
      cb(null, true)
    } else {
      cb(new Error('Not allowed'), false)
    }
  },
  credentials: true,
})
```

**Done when**:
- [ ] `tenantMiddleware` registered via `app.addHook('onRequest', ...)` before route registrations
- [ ] CORS allows `*.altion.com.br` origins
- [ ] CORS allows `localhost:*` for development
- [ ] Health check `GET /api/health` still works without a valid tenant

**Commit**: `feat(server): register TenantPlugin and update CORS for multi-tenant`

---

### T22: Update `service.routes.ts` + `barber.routes.ts` [P]

**What**: Pass `request.client.id` to repo calls in both route files  
**Where**:
- `packages/api/src/http/routes/service.routes.ts`
- `packages/api/src/http/routes/barber.routes.ts`  
**Depends on**: T09, T11, T12  
**Requirement**: MTS-01

**Changes**: In route handlers, pass `request.client.id` as `clientId` argument to `findAllActive()`, `findById()`, etc.

**Done when**:
- [ ] `service.routes.ts`: `serviceRepo.findAllActive(request.client.id)`
- [ ] `barber.routes.ts`: `barberRepo.findAllActive(request.client.id)` and `findById(..., request.client.id)`
- [ ] No TypeScript errors

**Commit**: `feat(routes): pass clientId to service and barber routes`

---

### T23: Update `booking.routes.ts` [P]

**What**: Pass `request.client` to repos and use-case in booking routes; build `cancelUrl` in route handler  
**Where**: `packages/api/src/http/routes/booking.routes.ts`  
**Depends on**: T09, T13, T14, T16, T18  
**Requirement**: MTS-01

**Changes**:
- Replace module-level `const notificationService = new WhatsAppNotificationService()` with per-request `createNotificationService(request.client)` inside handler body
- Pass `clientId: request.client.id` in use-case input
- Build `cancelUrl` in route handler: `` `${request.client.baseUrl}/agendamento/${result.appointment.cancelToken}` ``
- `customerRepo.findByPhone(phone, request.client.id)` in customer lookup route

**Done when**:
- [ ] No module-level `WhatsAppNotificationService` singleton
- [ ] `cancelUrl` built in route handler using `request.client.baseUrl`
- [ ] All repo calls include `request.client.id`
- [ ] No TypeScript errors

**Commit**: `feat(routes): pass clientId to booking routes`

---

### T24: Update `appointment.routes.ts` [P]

**What**: Pass `request.client.id` and per-client notification service to appointment routes  
**Where**: `packages/api/src/http/routes/appointment.routes.ts`  
**Depends on**: T09, T14, T16, T19  
**Requirement**: MTS-01

**Changes**:
- Replace module-level `notificationService` singleton with per-request `createNotificationService(request.client)`
- Pass `clientId: request.client.id` to use-case `execute` calls
- `appointmentRepo.findByCancelToken(token, request.client.id)` for the view endpoint

**Done when**:
- [ ] No module-level notification singleton
- [ ] Both cancel and change use-cases receive `clientId`
- [ ] Token view route passes `clientId` to prevent cross-tenant token access
- [ ] No TypeScript errors

**Commit**: `feat(routes): pass clientId to appointment routes`

---

### T25: Update `admin.routes.ts` [P]

**What**: Pass `request.client.id` to all repo and use-case calls in admin routes  
**Where**: `packages/api/src/http/routes/admin.routes.ts`  
**Depends on**: T09, T10, T11, T13, T14, T16, T20  
**Requirement**: MTS-01

**Changes**:
- Replace module-level `notificationService` with `createNotificationService(request.client)` per-request
- All `barberRepo`, `appointmentRepo`, `customerRepo`, `serviceRepo` calls receive `request.client.id`
- `AdminCreateAppointment` use-case input includes `clientId: request.client.id`

**Done when**:
- [ ] All repo calls in admin routes include `clientId`
- [ ] No module-level notification singleton
- [ ] `AdminCreateAppointment` receives `clientId`
- [ ] No TypeScript errors

**Commit**: `feat(routes): pass clientId to admin routes`

---

### T26: Update `auth.routes.ts` [P]

**What**: Pass `request.client.id` to barber lookup so auth is tenant-scoped  
**Where**: `packages/api/src/http/routes/auth.routes.ts`  
**Depends on**: T09, T11  
**Requirement**: MTS-01, MTS-02

**Change**: `barberRepo.findByEmail(email, request.client.id)` for login lookup.

**Done when**:
- [ ] Login handler passes `request.client.id` to `findByEmail`
- [ ] A barber from Client A cannot log in via Client B's domain
- [ ] No TypeScript errors

**Commit**: `feat(routes): scope auth to tenant in auth.routes`

---

### T27: Create `client.routes.ts` — public config endpoint

**What**: New route that returns the resolved client's theme + features (no auth required)  
**Where**: `packages/api/src/http/routes/client.routes.ts`  
**Depends on**: T09  
**Requirement**: MTS-04

```typescript
// GET /api/client/config
app.get('/client/config', async (request) => {
  const { name, timezone, enabledFeatures, theme } = request.client
  return { name, timezone, enabledFeatures, theme }
})
```

**Done when**:
- [ ] `GET /api/client/config` returns `{ name, timezone, enabledFeatures, theme }`
- [ ] No auth required (no `authGuard`)
- [ ] Response contains no sensitive data (no Chatwoot tokens, no DB IDs)
- [ ] TypeScript types correct

**Verify**: `curl -H "Host: soberano.altion.com.br" http://localhost:3000/api/client/config` → `{ name: "Soberano Barbearia", ... }`

**Commit**: `feat(routes): add GET /api/client/config public endpoint`

---

### T28: Register `client.routes.ts` in `server.ts`

**What**: Import and register `clientRoutes` in `server.ts`  
**Where**: `packages/api/src/server.ts`  
**Depends on**: T27  

**Done when**:
- [ ] `await app.register(clientRoutes, { prefix: '/api' })` added to server.ts
- [ ] Route is accessible after server start

**Commit**: `feat(server): register client config route`

---

### T29: Create `packages/ui` scaffold

**What**: Initialize the `@soberano/ui` package with `package.json`, `tsconfig.json`, and build config  
**Where**: `packages/ui/`  
**Depends on**: None (can be done in parallel with anything)  
**Requirement**: MTS-04

**Files to create**:
- `packages/ui/package.json` — name `@soberano/ui`, peer deps: `react`, `react-dom`
- `packages/ui/tsconfig.json` — extends `../../tsconfig.base.json`
- `packages/ui/src/index.ts` — barrel export (empty initially)
- Update root `package.json` workspaces: `"packages/*"` already covers this (no change needed — npm workspaces glob)

**Done when**:
- [ ] `packages/ui/package.json` created with `name: "@soberano/ui"`
- [ ] `packages/ui/tsconfig.json` created
- [ ] `packages/ui/src/index.ts` created (empty barrel)
- [ ] `npm install` from root resolves `@soberano/ui` as a workspace

**Commit**: `feat(ui): scaffold @soberano/ui package`

---

### T30: Move UI components to `packages/ui`

**What**: Move all files from `packages/web/src/components/ui/` to `packages/ui/src/components/`; update exports  
**Where**: 
- Source: `packages/web/src/components/ui/` (Button, Input, Panel, Spinner, StepIndicator, StickyBar, Footer)
- Destination: `packages/ui/src/components/`  
**Depends on**: T29  
**Requirement**: MTS-04

**Done when**:
- [ ] All 7 component files exist in `packages/ui/src/components/`
- [ ] Each component exported from `packages/ui/src/index.ts`
- [ ] `packages/web/src/components/ui/` is empty (or removed)
- [ ] No TypeScript errors in `packages/ui`

**Note**: Don't update `packages/web` imports yet — that's T36.

**Commit**: `feat(ui): move UI components from web to @soberano/ui`

---

### T31: Create `ClientTheme` types + `ThemeProvider`

**What**: Define theme types and a `ThemeProvider` component that applies CSS custom properties at runtime  
**Where**: 
- `packages/ui/src/theme/types.ts`
- `packages/ui/src/theme/ThemeProvider.tsx`  
**Depends on**: T29  
**Requirement**: MTS-04

```typescript
// types.ts
export interface ClientTheme { primaryColor: string; primaryColorHover: string; logoUrl: string | null }
export interface ClientConfig { name: string; timezone: string; enabledFeatures: string[]; theme: ClientTheme }

// ThemeProvider.tsx — sets CSS vars on :root
// --color-primary, --color-primary-hover
// Renders children once CSS vars are applied
```

**Done when**:
- [ ] `ClientTheme` and `ClientConfig` interfaces exported from `types.ts`
- [ ] `ThemeProvider` accepts `theme: ClientTheme` prop and sets `--color-primary` + `--color-primary-hover` on `:root` via `style` injection
- [ ] No TypeScript errors

**Commit**: `feat(ui): add ClientTheme types and ThemeProvider`

---

### T32: Create `ClientConfigProvider` + `useClientConfig` hook

**What**: React context that fetches `/api/client/config` on mount and provides it to the whole app  
**Where**: `packages/ui/src/theme/ClientConfigProvider.tsx`  
**Depends on**: T31  
**Requirement**: MTS-04

```typescript
// Fetches GET /api/client/config (same-origin)
// Provides ClientConfig via context
// Wraps children in ThemeProvider with fetched theme
// Shows loading state while fetching (or null — children decide)
export function ClientConfigProvider({ children }: { children: ReactNode })
export function useClientConfig(): ClientConfig  // throws if used outside provider
```

**Done when**:
- [ ] `ClientConfigProvider` fetches `/api/client/config` on mount
- [ ] `useClientConfig()` hook returns `ClientConfig`
- [ ] `ThemeProvider` is rendered inside with fetched theme
- [ ] Error boundary / error state handled (logs, shows fallback)
- [ ] No TypeScript errors

**Commit**: `feat(ui): add ClientConfigProvider and useClientConfig hook`

---

### T33: Create `useFeature` hook

**What**: Hook that returns whether a given feature is enabled for the current client  
**Where**: `packages/ui/src/hooks/useFeature.ts`  
**Depends on**: T32  
**Requirement**: MTS-03

```typescript
export function useFeature(feature: string): boolean {
  const { enabledFeatures } = useClientConfig()
  return enabledFeatures.includes(feature)
}
```

**Done when**:
- [ ] `useFeature('whatsapp-ai-chatbot')` returns `true`/`false` based on `ClientConfig.enabledFeatures`
- [ ] Exported from `packages/ui/src/index.ts`
- [ ] No TypeScript errors

**Commit**: `feat(ui): add useFeature hook`

---

### T34: Export all from `packages/ui/src/index.ts`

**What**: Barrel export of all components, hooks, providers, and types from `packages/ui`  
**Where**: `packages/ui/src/index.ts`  
**Depends on**: T30, T31, T32, T33  

**Done when**:
- [ ] All 7 UI components exported
- [ ] `ClientConfigProvider`, `useClientConfig`, `useFeature`, `ThemeProvider` exported
- [ ] `ClientTheme`, `ClientConfig` types exported
- [ ] `npx tsc --noEmit` passes in `packages/ui`

**Commit**: `feat(ui): export all from @soberano/ui index`

---

### T35: Add `@soberano/ui` dependency to `packages/web` + update component imports

**What**: Add `@soberano/ui` as a dependency in `packages/web`; update all component imports from local `./ui/` to `@soberano/ui`  
**Where**: 
- `packages/web/package.json`
- All files in `packages/web/src` that import from `../components/ui/` or `./ui/`  
**Depends on**: T34  
**Requirement**: MTS-04

**Done when**:
- [ ] `"@soberano/ui": "*"` in `packages/web/package.json` dependencies
- [ ] All `import ... from '../components/ui/Button'` (and similar) replaced with `import ... from '@soberano/ui'`
- [ ] No TypeScript errors in `packages/web`
- [ ] `npm run dev:web` starts successfully

**Commit**: `feat(web): import UI components from @soberano/ui`

---

### T36: Wrap `packages/web/src/App.tsx` in `ClientConfigProvider`

**What**: Wrap the app in `ClientConfigProvider` so theme is applied and features are available globally  
**Where**: `packages/web/src/App.tsx` (or `main.tsx`)  
**Depends on**: T35  
**Requirement**: MTS-04

**Change**:
```tsx
import { ClientConfigProvider } from '@soberano/ui'

function App() {
  return (
    <ClientConfigProvider>
      <RouterProvider router={router} />
    </ClientConfigProvider>
  )
}
```

Also update `index.css` (or Tailwind config) to use `var(--color-primary)` wherever hardcoded brand colors exist.

**Done when**:
- [ ] App wrapped in `ClientConfigProvider`
- [ ] `/api/client/config` is fetched on app load (verify in Network tab)
- [ ] CSS `--color-primary` applied to `:root`
- [ ] `npm run build:web` completes without errors

**Commit**: `feat(web): wrap app in ClientConfigProvider for runtime theming`

---

### T37: Add `SuperAdmin` model to Prisma schema + migration [P2]

**What**: Add `SuperAdmin` model (email, password, separate from `Barber`) + generate migration  
**Where**: `packages/api/prisma/schema.prisma`  
**Depends on**: T03  
**Requirement**: MTS-06

```prisma
model SuperAdmin {
  id        String   @id @default(uuid()) @db.Uuid
  email     String   @unique @db.VarChar(255)
  password  String   @db.VarChar(255)
  createdAt DateTime @default(now()) @map("created_at") @db.Timestamptz
  @@map("super_admins")
}
```

**Done when**:
- [ ] Model added and migration generated: `npx prisma migrate dev --name add_super_admin`
- [ ] Seed script adds one super-admin record (Caio's email)
- [ ] No TypeScript errors

**Commit**: `feat(db): add SuperAdmin model`

---

### T38: Create super-admin auth middleware + login route [P2]

**What**: Separate JWT auth for super-admin; `POST /api/super-admin/login` endpoint  
**Where**: 
- `packages/api/src/http/middleware/super-admin-auth.middleware.ts`
- `packages/api/src/http/routes/super-admin.routes.ts` (login section)  
**Depends on**: T37  
**Requirement**: MTS-06

Uses a **separate JWT secret** (`SUPER_ADMIN_JWT_SECRET` env var) so super-admin tokens can't be used as barber tokens and vice versa. Super-admin routes are **exempt from `TenantPlugin`** (added to the exempt list in T09).

**Done when**:
- [ ] `POST /api/super-admin/login` accepts email + password, returns JWT
- [ ] `superAdminAuthGuard` middleware validates super-admin JWT
- [ ] Super-admin routes are not tenant-scoped
- [ ] No TypeScript errors

**Commit**: `feat(api): add super-admin auth and login route`

---

### T39: Create super-admin client management routes [P2]

**What**: CRUD routes for managing clients (list, create, update features)  
**Where**: `packages/api/src/http/routes/super-admin.routes.ts`  
**Depends on**: T38, T08  
**Requirement**: MTS-06

**Endpoints**:
```
GET  /api/super-admin/clients              → list all clients
POST /api/super-admin/clients              → create new client
PATCH /api/super-admin/clients/:id/features → update enabledFeatures
```

**Done when**:
- [ ] All 3 endpoints require `superAdminAuthGuard`
- [ ] `POST /api/super-admin/clients` validates required fields (slug, name, baseUrl, plan)
- [ ] Plan param maps to `PLAN_FEATURES` presets (from T06)
- [ ] `PATCH .../features` invalidates the `TenantPlugin` in-memory cache for that client (or restarts cache entry)
- [ ] No TypeScript errors

**Commit**: `feat(api): add super-admin client management routes`

---

## Parallel Execution Map

```
Phase 1 (Schema — must go first):
  T01 → T02 → T03 → T04

Phase 2 (Domain + env — parallel with Phase 1 from T01):
  T05 [P]   (no DB needed)
  T06 [P]   (no DB needed)
  T07 [P]   (no DB needed)

Phase 3 (Infra — after T05 + T03):
  T05+T03 → T08 → T09
                 ↘ T10 (needs T09 + T11)

Phase 4 (Repos — parallel after T02):
  T02 →  T11 [P]
      ↘  T12 [P]
      ↘  T13 [P]
      ↘  T14 [P]

Phase 5 (Notifications — after T07):
  T07 → T15 → T16 → T17 (also needs T14)

Phase 6 (Use cases — after repos + notifications):
  T11+T12+T13+T14+T16 → T18 [P]
                       ↘ T19 [P]
                       ↘ T20 [P]

Phase 7 (Routes — after T09 + T10 + use-cases):
  T21 (first — server.ts)
  then:
  T21 → T22 [P]
       T23 [P]
       T24 [P]
       T25 [P]
       T26 [P]
       T27 [P] → T28

Phase 8 (Frontend — after T27):
  T29 → T30 → T31 [P]
            ↘ T32 → T33 → T34
  T34 → T35 → T36

Phase 9 P2 (independent after T08):
  T08 → T37 → T38 → T39
```

---

## Granularity Check

| Task | Scope | Status |
|------|-------|--------|
| T01 | 1 model in schema.prisma | ✅ |
| T02 | 4 model updates in schema.prisma | ✅ (cohesive, 1 file) |
| T03 | 1 CLI command + generated migration | ✅ |
| T04 | 1 script file | ✅ |
| T05 | 2 interface files | ✅ |
| T06 | 2 files (registry + middleware) | ✅ |
| T07 | 1 file change | ✅ |
| T08 | 1 class | ✅ |
| T09 | 1 plugin file + type augmentation | ✅ |
| T10 | 1 function modification | ✅ |
| T11–T14 | 2 files each (interface + impl) | ✅ |
| T15–T16 | 1 class each | ✅ |
| T17 | 1 function (loop body change) | ✅ |
| T18–T20 | 1 use-case each | ✅ |
| T21 | server.ts (2 changes) | ✅ (cohesive) |
| T22 | 2 route files (small, similar change) | ✅ |
| T23–T26 | 1 route file each | ✅ |
| T27–T28 | 1 new route + 1 line in server.ts | ✅ |
| T29–T36 | 1 file each | ✅ |
| T37–T39 | 1 deliverable each | ✅ |

**Total: 39 tasks** — 28 P1 (MVP), 3 P2 (super-admin)
