# Psychology API Extension — Tasks

**Design**: `.specs/features/psychology-api/design.md`
**Status**: Draft

---

## Execution Plan

```
Phase 1 (sequential):
  T1 → T2 → T3

Phase 2 (parallel after T3):
  T3 → T4 [P]
  T3 → T5 [P]
  T3 → T6 [P]

Phase 3 (sequential after Phase 2):
  T4+T5+T6 → T7 → T8
```

---

## Task Breakdown

### T1: Extend Prisma schema

**What**: Add psychology columns to `Customer` and `Appointment`; add `SessionReport` and `Document` models with FK back-relations
**Where**: `packages/api/prisma/schema.prisma`
**Depends on**: None
**Requirement**: PSYAPI-01 – PSYAPI-04

**Done when**:
- [ ] `Customer`: `cpf String? @db.VarChar(14)`, `email String? @db.VarChar(255)`, `notes String? @db.Text`
- [ ] `Appointment`: `paymentStatus String @default("pending") @map("payment_status") @db.VarChar(20)`, `paidAt DateTime? @map("paid_at") @db.Timestamptz`, `appointmentNotes String? @map("appointment_notes") @db.Text`
- [ ] `SessionReport` model with all fields, `@@index([appointmentId])`, `@@map("session_reports")`, FK relations to `Tenant`, `Appointment`, `Provider`
- [ ] `Document` model with all fields, `@@index([customerId])`, `@@map("documents")`, FK relations to `Tenant`, `Customer`
- [ ] Back-relations added on `Tenant`, `Appointment`, `Customer`, `Provider`
- [ ] `npx prisma validate` exits 0

**Verify**: `cd packages/api && npx prisma validate`

---

### T2: Generate migration + regenerate Prisma client

**What**: Run `prisma migrate dev` to create the SQL migration; run `prisma generate` to regenerate the typed client
**Where**: `packages/api/prisma/migrations/` (auto-generated)
**Depends on**: T1
**Requirement**: PSYAPI-01 – PSYAPI-04

**Done when**:
- [ ] Migration file created under `prisma/migrations/`
- [ ] `prisma migrate dev` exits 0
- [ ] `prisma generate` exits 0 (new model types available)

**Verify**: `cd packages/api && npx prisma migrate dev --name psychology-vertical && npx prisma generate`

---

### T3: Domain entities + repository interfaces

**What**: Extend existing entities; create two new entity interfaces; extend two existing repo interfaces; create two new repo interfaces
**Where**:
- `src/domain/entities/appointment.ts` — add `paymentStatus`, `paidAt`, `appointmentNotes`
- `src/domain/entities/customer.ts` — add `cpf`, `email`, `notes`
- `src/domain/entities/session-report.ts` — create
- `src/domain/entities/document.ts` — create
- `src/domain/repositories/appointment.repository.ts` — add `updatePaymentStatus`, `getFinancialSummary`, `FinancialSummary` type
- `src/domain/repositories/customer.repository.ts` — add `findById`
- `src/domain/repositories/session-report.repository.ts` — create
- `src/domain/repositories/document.repository.ts` — create
**Depends on**: T1 (Prisma types available after T2, but interfaces are pure TS — can write in parallel with T2)
**Requirement**: PSYAPI-01 – PSYAPI-04

**Done when**:
- [ ] `AppointmentEntity` has the 3 new fields
- [ ] `CustomerEntity` has the 3 new fields
- [ ] `SessionReportEntity` interface matches design
- [ ] `DocumentEntity` interface matches design
- [ ] `AppointmentRepository` interface has `updatePaymentStatus(id, paidAt): Promise<AppointmentWithDetails>` and `getFinancialSummary(providerId, from, to): Promise<FinancialSummary>`
- [ ] `FinancialSummary` type defined: `{ totalSessions, paidCount, pendingCount, revenueCents, appointments: AppointmentWithDetails[] }`
- [ ] `CustomerRepository` interface has `findById(id): Promise<CustomerEntity | null>`
- [ ] `SessionReportRepository` interface has `create`, `findByAppointment`, `findById`, `deleteById`
- [ ] `DocumentRepository` interface has `create`, `findByCustomer`, `findById`, `deleteById`
- [ ] `npx tsc --noEmit` exits 0 (ignoring pre-existing errors in unrelated files)

**Verify**: `cd packages/api && npx tsc --noEmit`

---

### T4: Extend PrismaAppointmentRepository + PrismaCustomerRepository [P]

**What**: Add `updatePaymentStatus`, `getFinancialSummary` to appointment repo; add `findById` to customer repo
**Where**:
- `src/infrastructure/database/repositories/prisma-appointment.repository.ts`
- `src/infrastructure/database/repositories/prisma-customer.repository.ts`
**Depends on**: T3
**Reuses**: `mapAppointment`, `includeRelations` from appointment repo
**Requirement**: PSYAPI-05, PSYAPI-06

**Done when**:
- [ ] `updatePaymentStatus(id, paidAt)` sets `paymentStatus='paid'`, `paidAt`, returns `AppointmentWithDetails` via `mapAppointment`
- [ ] `getFinancialSummary(providerId, from, to)` queries appointments for provider in date range, returns `FinancialSummary` with counts and `revenueCents` from paid appointments only
- [ ] `findById(id)` on customer repo returns `CustomerEntity | null`
- [ ] Both classes satisfy their updated interfaces (no TS errors)

**Verify**: `cd packages/api && npx tsc --noEmit`

---

### T5: Create PrismaSessionReportRepository [P]

**What**: New class implementing `SessionReportRepository`
**Where**: `src/infrastructure/database/repositories/prisma-session-report.repository.ts`
**Depends on**: T3
**Reuses**: `PrismaClientOrExtended` type + constructor pattern from any existing repo
**Requirement**: PSYAPI-07

**Done when**:
- [ ] `create(data)` inserts and returns `SessionReportEntity`
- [ ] `findByAppointment(appointmentId)` returns reports ordered `createdAt DESC`
- [ ] `findById(id)` returns `SessionReportEntity | null`
- [ ] `deleteById(id)` hard-deletes
- [ ] Implements `SessionReportRepository` interface — no TS errors

**Verify**: `cd packages/api && npx tsc --noEmit`

---

### T6: Create PrismaDocumentRepository [P]

**What**: New class implementing `DocumentRepository`
**Where**: `src/infrastructure/database/repositories/prisma-document.repository.ts`
**Depends on**: T3
**Reuses**: Same `PrismaClientOrExtended` constructor pattern
**Requirement**: PSYAPI-08

**Done when**:
- [ ] `create(data)` inserts and returns document without `data` field in response (select explicitly)
- [ ] `findByCustomer(customerId)` returns metadata only (no `data`), ordered `createdAt DESC`
- [ ] `findById(id)` returns full `DocumentEntity` including `data`
- [ ] `deleteById(id)` hard-deletes
- [ ] Implements `DocumentRepository` interface — no TS errors

**Verify**: `cd packages/api && npx tsc --noEmit`

---

### T7: Add pay + financial endpoints to admin.routes.ts; create psychology.routes.ts; register in server.ts

**What**: Two generic endpoints added to the existing `admin.routes.ts`; new `psychology.routes.ts` for reports + documents; register psychology route in `server.ts`
**Where**:
- `src/http/routes/admin.routes.ts` — add 2 endpoints
- `src/http/routes/psychology.routes.ts` — create (8 endpoints)
- `src/server.ts` — add import + `app.register` (2 lines)
**Depends on**: T4, T5, T6
**Reuses**: `authGuard` already hooked on `admin.routes.ts`; `request.tenantPrisma`, `NotFoundError`, `z` — identical pattern throughout
**Requirement**: PSYAPI-05 – PSYAPI-08

**admin.routes.ts additions**:
```
PATCH  /admin/appointments/:id/pay       — mark paid (vertical-agnostic)
GET    /admin/financial?from=&to=        — financial summary (vertical-agnostic)
```

**psychology.routes.ts endpoints**:
```
POST   /psychology/sessions/:sessionId/reports
GET    /psychology/sessions/:sessionId/reports
GET    /psychology/reports/:id
DELETE /psychology/reports/:id
POST   /psychology/patients/:patientId/documents
GET    /psychology/patients/:patientId/documents
GET    /psychology/documents/:id
DELETE /psychology/documents/:id
```

**Done when**:
- [ ] `PATCH /admin/appointments/:id/pay` sets `paymentStatus='paid'`, `paidAt=now()`, returns 409 if already paid
- [ ] `GET /admin/financial` returns `{ totalSessions, paidCount, pendingCount, revenueCents, appointments[] }`, returns 400 if `from`/`to` missing or `from > to`
- [ ] All 8 psychology endpoints implemented and protected by `authGuard`
- [ ] Report and document create endpoints return 413 if file/data > ~6.8M chars
- [ ] `npx tsc --noEmit` exits 0
- [ ] Server starts without errors

**Verify**:
```bash
cd packages/api && npx tsc --noEmit
npm run dev &
curl -H "Authorization: Bearer <token>" \
  "http://localhost:3000/api/admin/financial?from=2026-01-01&to=2026-12-31"
# expect 200 JSON with paidCount, pendingCount, revenueCents
```

---

### T8: Bruno tenant seed script

**What**: New seed script that upserts Bruno's tenant, provider, and 3 services
**Where**: `src/infrastructure/database/seed-bruno.ts`
**Depends on**: T2 (migration must be applied — new `type` field on tenant)
**Requirement**: PSYAPI-09

**Seed data**:
```
tenant:   slug='bruno', name='Bruno Psicólogo', type='psychology'
provider: firstName='Bruno', lastName='[TBD]', email='bruno@[TBD].com', password=hashed
services:
  - slug='individual', name='Sessão Individual', duration=50, priceCents=20000, icon='🧠'
  - slug='casal',      name='Sessão de Casal',   duration=50, priceCents=25000, icon='👫'
  - slug='familiar',   name='Sessão Familiar',   duration=50, priceCents=30000, icon='👨‍👩‍👧'
```

**Done when**:
- [ ] Script runs with `npx tsx src/infrastructure/database/seed-bruno.ts`
- [ ] Running it twice does not create duplicate rows
- [ ] Tenant, provider, and all 3 services exist in DB after run
- [ ] Provider password is properly hashed (uses same `hashPassword` from `password.service.ts`)

**Verify**:
```bash
cd packages/api && npx tsx src/infrastructure/database/seed-bruno.ts
npx tsx src/infrastructure/database/seed-bruno.ts  # run twice
# query DB: SELECT slug FROM tenants WHERE slug='bruno'; — 1 row
# query DB: SELECT name FROM services WHERE tenant_id='...'; — 3 rows
```

---

## Parallel Execution Map

```
T1 ──→ T2 ──→ T3
                ├──→ T4 [P] ─┐
                ├──→ T5 [P] ─┼──→ T7 ──→ T8
                └──→ T6 [P] ─┘
```
