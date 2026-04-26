# Psychology API Extension — Specification

## Problem Statement

The shared API needs a small set of database and API additions to support the psychology vertical (Bruno Psicólogo). The frontend wiring (`web-bruno`) happens separately — this spec covers only the backend work: schema migrations, two new tables, payment endpoints, financial summary, and the Bruno tenant seed.

## Goals

- [ ] Schema migrations add psychology columns to `customers` and `appointments` without breaking barbershop tenants
- [ ] `session_reports` table exists with full CRUD endpoints
- [ ] `documents` table exists with full CRUD endpoints
- [ ] Appointments can be marked as paid and financial summary can be queried by date range
- [ ] Bruno tenant is seeded and ready to use (1 provider, 3 services)

## Out of Scope

| Feature | Reason |
|---------|--------|
| Full patients CRUD endpoints | Covered when web-bruno is wired to real API |
| Sessions CRUD endpoints | Existing booking endpoints handle scheduling; only payment is new |
| Frontend wiring (web-bruno) | Separate task |
| S3 / cloud storage for files | Deferred — base64-in-DB for MVP (see decision below) |
| WhatsApp notifications for psychology | No WA integration for this vertical |

---

## File Storage Decision

**Choice: base64 in the `data TEXT` column** for both `session_reports.file_url` (optional attachment) and `documents.data`.

**Rationale**: Simpler to operate at this scale — no bucket config, no presigned URLs, no IAM. A single API call handles upload and retrieval. The tradeoff is DB size: a typical scanned document (PDF ~200KB) is ~270KB base64. At Bruno's scale (<500 documents/year) this is negligible. The column name (`file_url` on session_reports) is intentionally kept generic so a future migration to S3 URLs is non-breaking.

**Migration path when scale demands it**: store S3 URL in `file_url` / `data`, run a background job to move existing blobs to S3.

---

## User Stories

### P1: Schema Migrations ⭐ MVP

**User Story**: As a developer, I want nullable psychology columns added to existing tables and two new tables created so that the DB supports the psychology vertical without affecting barbershop rows.

**Acceptance Criteria**:

1. WHEN migration runs THEN `customers` SHALL gain `cpf VARCHAR(14)` nullable, `email VARCHAR(255)` nullable, `notes TEXT` nullable
2. WHEN migration runs THEN `appointments` SHALL gain `payment_status VARCHAR(20) DEFAULT 'pending'`, `paid_at TIMESTAMPTZ` nullable, `appointment_notes TEXT` nullable
3. WHEN migration runs THEN `session_reports` table SHALL exist (see data model below)
4. WHEN migration runs THEN `documents` table SHALL exist (see data model below)
5. WHEN existing barbershop appointments are read THEN `payment_status` SHALL equal `'pending'` and no existing columns change

**Independent Test**: `prisma migrate dev` applies cleanly; existing appointment queries return same data + `payment_status='pending'`.

---

### P1: Mark Appointment as Paid ⭐ MVP

**User Story**: As a provider, I want to mark an appointment as paid so that I can track received payments regardless of vertical.

**Acceptance Criteria**:

1. WHEN `PATCH /api/admin/appointments/:id/pay` is called with valid JWT THEN system SHALL set `payment_status='paid'` and `paid_at=now()` and return the updated appointment
2. WHEN the appointment is already paid THEN system SHALL return 409 with `ALREADY_PAID`
3. WHEN the appointment does not belong to the auth tenant THEN system SHALL return 404
4. WHEN called without a valid JWT THEN system SHALL return 401

**Note**: Implemented in the existing `admin.routes.ts` — no new route file needed for this endpoint.

**Independent Test**: Create appointment via existing booking flow → PATCH pay → fetch appointment → `payment_status='paid'`, `paid_at` set.

---

### P1: Financial Summary by Date Range ⭐ MVP

**User Story**: As a provider, I want a financial summary for a date range so that I can see revenue and pending payments regardless of vertical.

**Acceptance Criteria**:

1. WHEN `GET /api/admin/financial?from=YYYY-MM-DD&to=YYYY-MM-DD` is called with valid JWT THEN system SHALL return: total sessions, paid count, pending count, total revenue in cents (paid only), list of appointments with `payment_status`, `paid_at`, customer name, service name, date, price
2. WHEN `from` or `to` is missing THEN system SHALL return 400
3. WHEN `from > to` THEN system SHALL return 400
4. Results SHALL be scoped to `request.providerId` (provider's own appointments only)

**Note**: Implemented in the existing `admin.routes.ts` alongside the other admin endpoints.

**Independent Test**: Create 2 sessions, mark 1 paid → GET financial for range → `paidCount=1`, `pendingCount=1`, `revenueCents` = price of paid session.

---

### P1: Session Reports CRUD ⭐ MVP

**User Story**: As Bruno, I want to create, list, and delete clinical notes for a session so that session outcomes are recorded.

**Acceptance Criteria**:

1. WHEN `POST /api/psychology/sessions/:sessionId/reports` with `{ content, fileData?, fileName?, fileType? }` THEN system SHALL create report and return it
2. WHEN `GET /api/psychology/sessions/:sessionId/reports` THEN system SHALL return all reports for that session ordered by `created_at DESC`
3. WHEN `GET /api/psychology/reports/:id` THEN system SHALL return the report or 404
4. WHEN `DELETE /api/psychology/reports/:id` THEN system SHALL delete and return 204
5. WHEN `content` is empty THEN system SHALL return 400
6. WHEN `sessionId` does not belong to the auth tenant THEN system SHALL return 404
7. WHEN `fileData` base64 string exceeds ~6.8M chars (~5MB decoded) THEN system SHALL return 413

**Independent Test**: Create report with file → GET list (appears) → GET by id (file data present) → DELETE → GET list (empty).

---

### P1: Documents CRUD ⭐ MVP

**User Story**: As Bruno, I want to upload and manage patient documents so that administrative files are stored alongside the patient record.

**Acceptance Criteria**:

1. WHEN `POST /api/psychology/patients/:patientId/documents` with `{ name, type, data }` THEN system SHALL store and return the document (without `data` field in response)
2. WHEN `GET /api/psychology/patients/:patientId/documents` THEN system SHALL return document list without `data` field (metadata only)
3. WHEN `GET /api/psychology/documents/:id` THEN system SHALL return full document including `data`
4. WHEN `DELETE /api/psychology/documents/:id` THEN system SHALL delete and return 204
5. WHEN `patientId` does not belong to the auth tenant THEN system SHALL return 404
6. WHEN `data` exceeds ~6.8M chars THEN system SHALL return 413

**Independent Test**: Upload document → list (no data) → GET by id (data present) → DELETE → list (empty).

---

### P1: Bruno Tenant Seed ⭐ MVP

**User Story**: As a developer, I want a seed script for Bruno's tenant so that the psychology vertical is ready to use after deployment.

**Acceptance Criteria**:

1. WHEN seed script runs THEN a tenant with `slug='bruno'`, `type='psychology'` SHALL exist (upsert — safe to re-run)
2. WHEN seed runs THEN 1 provider (Bruno) with email + hashed password SHALL exist under that tenant
3. WHEN seed runs THEN 3 services SHALL exist: "Sessão Individual" (50 min, price TBD), "Sessão de Casal" (50 min), "Sessão Familiar" (50 min)
4. WHEN seed is re-run THEN no duplicate rows SHALL be created

**Independent Test**: Run seed twice → query DB → exactly 1 tenant, 1 provider, 3 services for slug `'bruno'`.

---

## Data Models

### session_reports

```prisma
model SessionReport {
  id            String   @id @default(uuid()) @db.Uuid
  tenantId      String   @map("tenant_id") @db.Uuid
  appointmentId String   @map("appointment_id") @db.Uuid
  providerId    String   @map("provider_id") @db.Uuid
  content       String   @db.Text
  fileName      String?  @map("file_name") @db.VarChar(200)
  fileType      String?  @map("file_type") @db.VarChar(100)
  fileData      String?  @map("file_data") @db.Text  // base64
  createdAt     DateTime @default(now()) @map("created_at") @db.Timestamptz
  updatedAt     DateTime @default(now()) @updatedAt @map("updated_at") @db.Timestamptz

  tenant      Tenant      @relation(...)
  appointment Appointment @relation(...)
  provider    Provider    @relation(...)

  @@index([appointmentId])
  @@map("session_reports")
}
```

### documents

```prisma
model Document {
  id         String   @id @default(uuid()) @db.Uuid
  tenantId   String   @map("tenant_id") @db.Uuid
  customerId String   @map("customer_id") @db.Uuid
  name       String   @db.VarChar(200)
  type       String   @db.VarChar(50)
  data       String   @db.Text  // base64
  createdAt  DateTime @default(now()) @map("created_at") @db.Timestamptz

  tenant   Tenant   @relation(...)
  customer Customer @relation(...)

  @@index([customerId])
  @@map("documents")
}
```

---

## Requirement Traceability

| ID | Story | Status |
|----|-------|--------|
| PSYAPI-01 | Schema: customers columns | Pending |
| PSYAPI-02 | Schema: appointments columns | Pending |
| PSYAPI-03 | Schema: session_reports table | Pending |
| PSYAPI-04 | Schema: documents table | Pending |
| PSYAPI-05 | Mark appointment as paid | Pending |
| PSYAPI-06 | Financial summary | Pending |
| PSYAPI-07 | Session reports CRUD | Pending |
| PSYAPI-08 | Documents CRUD | Pending |
| PSYAPI-09 | Bruno tenant seed | Pending |

---

## Success Criteria

- [ ] `prisma migrate dev` applies cleanly with no data loss on existing barbershop rows
- [ ] All new endpoints return correct responses verified via curl/Insomnia
- [ ] Seed script is idempotent (safe to re-run)
- [ ] `tsc --noEmit` exits 0
