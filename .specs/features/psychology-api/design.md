# Psychology API Extension — Design

**Spec**: `.specs/features/psychology-api/spec.md`
**Status**: Draft

---

## Architecture Overview

No new patterns. Every component follows the existing layered structure:

```
psychology.routes.ts
  └─ authGuard (existing middleware — reused as-is)
  └─ request.tenantPrisma (injected by existing tenant.middleware.ts)
       ├─ PrismaAppointmentRepository  (extend with pay + financial methods)
       ├─ PrismaSessionReportRepository (new)
       └─ PrismaDocumentRepository      (new)
```

One new route file, two new repository classes, extensions on two existing models and two existing repositories.

---

## Code Reuse

| Existing component | Location | How |
|---|---|---|
| `authGuard` | `src/http/middleware/auth.middleware.ts` | `app.addHook('onRequest', authGuard)` — identical to `admin.routes.ts` |
| `request.tenantPrisma` | Injected by `tenant.middleware.ts` | All repos receive it as constructor arg |
| `PrismaAppointmentRepository` | `…/prisma-appointment.repository.ts` | Add 2 methods: `updatePaymentStatus`, `getFinancialSummary` |
| `PrismaCustomerRepository` | `…/prisma-customer.repository.ts` | Add `findById` (needed by documents route to verify tenant ownership) |
| `NotFoundError`, `ValidationError` | `src/shared/errors.ts` | Throw as-is |
| Existing `mapAppointment` | `prisma-appointment.repository.ts` | Reuse in new methods |

---

## Components

### 1. Prisma schema changes

**File**: `packages/api/prisma/schema.prisma`

- `Customer` model: add `cpf String?`, `email String?`, `notes String?`
- `Appointment` model: add `paymentStatus String @default("pending")`, `paidAt DateTime?`, `appointmentNotes String?`
- New `SessionReport` model (see spec for full definition)
- New `Document` model (see spec for full definition)
- Back-relations added to `Tenant`, `Appointment`, `Customer`, `Provider`

### 2. New domain entities

**Files** (create):
- `src/domain/entities/session-report.ts`
- `src/domain/entities/document.ts`

```typescript
// session-report.ts
export interface SessionReportEntity {
  id: string;
  tenantId: string;
  appointmentId: string;
  providerId: string;
  content: string;
  fileName: string | null;
  fileType: string | null;
  fileData: string | null;
  createdAt: Date;
  updatedAt: Date;
}

// document.ts
export interface DocumentEntity {
  id: string;
  tenantId: string;
  customerId: string;
  name: string;
  type: string;
  data: string;
  createdAt: Date;
}
```

`AppointmentEntity` extended with: `paymentStatus: string`, `paidAt: Date | null`, `appointmentNotes: string | null`

### 3. New / extended repository interfaces

**Extend** `src/domain/repositories/appointment.repository.ts`:
```typescript
updatePaymentStatus(id: string, paidAt: Date): Promise<AppointmentWithDetails>;
getFinancialSummary(providerId: string, from: Date, to: Date): Promise<FinancialSummary>;
```

**Extend** `src/domain/repositories/customer.repository.ts`:
```typescript
findById(id: string): Promise<CustomerEntity | null>;
```

**Create** `src/domain/repositories/session-report.repository.ts`:
```typescript
create(data: CreateSessionReportData): Promise<SessionReportEntity>;
findByAppointment(appointmentId: string): Promise<SessionReportEntity[]>;
findById(id: string): Promise<SessionReportEntity | null>;
deleteById(id: string): Promise<void>;
```

**Create** `src/domain/repositories/document.repository.ts`:
```typescript
create(data: CreateDocumentData): Promise<DocumentEntity>;
findByCustomer(customerId: string): Promise<Omit<DocumentEntity, 'data'>[]>;
findById(id: string): Promise<DocumentEntity | null>;
deleteById(id: string): Promise<void>;
```

### 4. Repository implementations

**Extend** `PrismaAppointmentRepository`:
- `updatePaymentStatus(id, paidAt)` — sets `paymentStatus='paid'`, `paidAt`, returns updated appointment via `mapAppointment`
- `getFinancialSummary(providerId, from, to)` — single `findMany` scoped to `providerId` + date range, aggregates paid/pending counts and revenue in JS (simpler than groupBy for this shape)

**Extend** `PrismaCustomerRepository`:
- `findById(id)` — `customer.findUnique({ where: { id } })`

**Create** `PrismaSessionReportRepository`:
- Standard CRUD, `findByAppointment` orders by `createdAt DESC`

**Create** `PrismaDocumentRepository`:
- `findByCustomer` uses `select` to exclude `data` field
- `findById` returns full record including `data`

### 5. admin.routes.ts — two new endpoints

**File**: `src/http/routes/admin.routes.ts` (extend existing)

```
PATCH  /api/admin/appointments/:id/pay
GET    /api/admin/financial?from=&to=
```

Both are vertical-agnostic (any tenant can use them) and already behind `authGuard` via the existing hook on that file. No new route file needed.

### 6. psychology.routes.ts — reports + documents

**File**: `src/http/routes/psychology.routes.ts` (create)
**Registered in**: `server.ts` under prefix `/api`

```
POST   /api/psychology/sessions/:sessionId/reports
GET    /api/psychology/sessions/:sessionId/reports
GET    /api/psychology/reports/:id
DELETE /api/psychology/reports/:id

POST   /api/psychology/patients/:patientId/documents
GET    /api/psychology/patients/:patientId/documents
GET    /api/psychology/documents/:id
DELETE /api/psychology/documents/:id
```

8 endpoints total. All behind `authGuard`.

### 6. Bruno seed script

**File**: `src/infrastructure/database/seed-bruno.ts`

Upsert pattern (safe to re-run):
1. Upsert tenant `slug='bruno'`, `type='psychology'`
2. Upsert provider (Bruno) under that tenant
3. Upsert 3 services: Sessão Individual / Sessão de Casal / Sessão Familiar (50 min each)

Uses `prisma.tenant.upsert`, `prisma.provider.upsert`, `prisma.service.upsert` on unique constraints.

---

## Error Handling

| Scenario | Status | Code |
|---|---|---|
| Missing/invalid JWT | 401 | `UNAUTHORIZED` |
| Resource not found or wrong tenant | 404 | `NOT_FOUND` |
| Validation failure | 400 | `VALIDATION_ERROR` |
| Already paid | 409 | `ALREADY_PAID` |
| File data > ~6.8M chars | 413 | `PAYLOAD_TOO_LARGE` |
| Missing from/to on financial | 400 | `BAD_REQUEST` |

---

## Tech Decisions

| Decision | Choice | Rationale |
|---|---|---|
| File storage | base64 TEXT column | MVP simplicity; migration path to S3 is non-breaking (swap blob → URL in same column) |
| Financial aggregation | JS-side after `findMany` | Shape doesn't match `groupBy` well; at Bruno's scale (<100 sessions/month) this is fine |
| Document `data` in list response | Excluded via Prisma `select` | Avoids sending large blobs on list calls |
| Patient ownership check for documents | `findById` then compare `tenantId` via `tenantPrisma` (already scoped) | `tenantPrisma` scopes all queries to the tenant automatically — no explicit check needed |
