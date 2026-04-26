# web-bruno API Migration — Tasks

**Spec**: `.specs/features/web-bruno-api-migration/spec.md`
**Design**: `.specs/features/web-bruno-api-migration/design.md`
**Status**: Ready to execute

---

## Execution Plan

```
Phase 1 — Backend schema + repo (sequential):
  T1 → T2 → T3

Phase 2 — Backend routes + frontend foundation (T3 unlocks all, T4–T6 parallel):
  T3 → T4 [P]   admin.routes.ts + schedule
  T3 → T5 [P]   psychology.routes.ts (patients + sessions)
  T3 → T6 [P]   http-client + auth (frontend foundation)

Phase 3 — Frontend domain hooks (T6 unlocks all, parallel):
  T6 → T7 [P]   patients.ts
  T6 → T8 [P]   appointments.ts
  T6 → T9 [P]   session-reports.ts
  T6 → T10 [P]  documents.ts
  T6 → T11 [P]  settings.ts (also needs T4)
  T6 → T12 [P]  financial.ts

Phase 4 — Cleanup (all T7–T12 done):
  T7+T8+T9+T10+T11+T12 → T13
```

Full dependency graph:
```
T1 → T2 → T3
              ├→ T4 [P] ──────────────────────────────────────────────────┐
              ├→ T5 [P] ────────────────────────────────────────────────┐ │
              └→ T6 [P]                                                 │ │
                    ├→ T7 [P]  ─────────────────────────────────────┐  │ │
                    ├→ T8 [P]  ──────────────────────────────────┐  │  │ │
                    ├→ T9 [P]  ───────────────────────────────┐  │  │  │ │
                    ├→ T10 [P] ────────────────────────────┐  │  │  │  │ │
                    ├→ T11 [P] (also needs T4) ──────────┐ │  │  │  │  │ │
                    └→ T12 [P] ────────────────────────┐ │ │  │  │  │  │ │
                                                       └─┴─┴──┴──┴──┴──┴─┴→ T13
```

---

## Task Breakdown

---

### T1 — Schema migration: add `pixKey` + `messageTemplate` to providers

**What**: Two nullable columns on the `providers` table. No other schema changes needed (all psychology tables added by the psychology-api spec).
**Where**: `packages/api/prisma/schema.prisma`
**Depends on**: None
**Requirement**: WBAPI-07 (DD-01)

**Changes**:
```prisma
model Provider {
  // ... existing fields ...
  pixKey          String?  @map("pix_key") @db.VarChar(255)
  messageTemplate String?  @map("message_template") @db.Text
}
```

**Done when**:
- [ ] `pixKey` and `messageTemplate` fields added to `Provider` model
- [ ] `npx prisma validate` exits 0

**Verify**: `cd packages/api && npx prisma validate`

---

### T2 — Generate migration + regenerate Prisma client

**What**: Apply schema changes to DB; regenerate typed client.
**Where**: `packages/api/prisma/migrations/` (auto-generated)
**Depends on**: T1
**Requirement**: WBAPI-07

**Done when**:
- [ ] `prisma migrate dev --name add-provider-settings` creates a migration file
- [ ] `prisma generate` exits 0 — `Provider` type now includes `pixKey?` and `messageTemplate?`

**Verify**: `cd packages/api && npx prisma migrate dev --name add-provider-settings && npx prisma generate`

---

### T3 — Repository interface additions

**What**: Extend customer and session-report repository interfaces with new methods needed by the new routes.
**Where**:
- `src/domain/repositories/customer.repository.ts` — add `findAll`, `create`, `update`, `deleteById`
- `src/domain/repositories/session-report.repository.ts` — add `findByPatient`, `updateById`
**Depends on**: T1 (Prisma types available after T2, but interfaces are pure TS — write in parallel with T2)
**Requirement**: WBAPI-03, WBAPI-05

**`CustomerRepository` additions**:
```typescript
findAll(tenantId: string, search?: string): Promise<CustomerEntity[]>
create(data: { tenantId: string; name: string; phone?: string; email?: string; cpf?: string; notes?: string }): Promise<CustomerEntity>
update(id: string, partial: Partial<Omit<CustomerEntity, 'id' | 'createdAt'>>): Promise<CustomerEntity>
deleteById(id: string): Promise<void>
```

**`SessionReportRepository` additions**:
```typescript
findByPatient(patientId: string): Promise<SessionReportEntity[]>  // ordered createdAt DESC
updateById(id: string, partial: { content?: string; fileName?: string | null; fileType?: string | null; fileData?: string | null }): Promise<SessionReportEntity>
```

**Done when**:
- [ ] Both interface files compile with `npx tsc --noEmit`

**Verify**: `cd packages/api && npx tsc --noEmit`

---

### T4 — Backend: extend admin.routes.ts + implement new repo methods [P]

**What**:
1. Extend `GET /admin/me` to include `phone`, `pixKey`, `messageTemplate`
2. Add `PATCH /admin/me` endpoint
3. Implement `findAll`, `create`, `update`, `deleteById` on `PrismaCustomerRepository`
4. Implement `findByPatient`, `updateById` on `PrismaSessionReportRepository`
**Where**:
- `src/http/routes/admin.routes.ts`
- `src/infrastructure/database/repositories/prisma-customer.repository.ts`
- `src/infrastructure/database/repositories/prisma-session-report.repository.ts`
**Depends on**: T3 (interfaces defined)
**Requirement**: WBAPI-07, WBAPI-03, WBAPI-05

**`GET /admin/me` extended response**:
```json
{ "id", "firstName", "lastName", "phone", "avatarUrl", "pixKey", "messageTemplate" }
```

**`PATCH /admin/me` validation**:
- All fields optional; at least one must be present
- `phone`: `\d{10,11}` or `null` to clear
- `pixKey`: max 255 chars
- `messageTemplate`: max 2000 chars
- Returns same shape as GET

**`PrismaCustomerRepository`**:
- `findAll(tenantId, search?)`: `prisma.customer.findMany` where `tenantId`, optional `OR` on name/phone/email/cpf LIKE `%search%`, ordered `name ASC`
- `create(data)`: `prisma.customer.create`
- `update(id, partial)`: `prisma.customer.update`
- `deleteById(id)`: `prisma.customer.delete`

**`PrismaSessionReportRepository`**:
- `findByPatient(patientId)`: join via `appointment.customerId = patientId`, ordered `createdAt DESC`
- `updateById(id, partial)`: `prisma.sessionReport.update`

**Done when**:
- [ ] `GET /admin/me` returns `phone`, `pixKey`, `messageTemplate`
- [ ] `PATCH /admin/me` updates fields and returns updated profile
- [ ] `PATCH /admin/me` returns 400 if no fields sent
- [ ] `PrismaCustomerRepository` satisfies updated `CustomerRepository` interface
- [ ] `PrismaSessionReportRepository` satisfies updated interface
- [ ] `npx tsc --noEmit` exits 0

**Verify**: `cd packages/api && npx tsc --noEmit`

---

### T5 — Backend: patient CRUD + session CRUD in psychology.routes.ts [P]

**What**: Add patient CRUD and session CRUD blocks to the existing `psychologyRoutes` function.
**Where**: `src/http/routes/psychology.routes.ts`
**Depends on**: T3
**Requirement**: WBAPI-03, WBAPI-04

**Patient endpoints** (5):
```
GET    /psychology/patients?search=
POST   /psychology/patients
GET    /psychology/patients/:id
PATCH  /psychology/patients/:id
DELETE /psychology/patients/:id
```

**Session endpoints** (4):
```
GET    /psychology/sessions?from=&to=&patientId=
POST   /psychology/sessions
POST   /psychology/sessions/batch
PATCH  /psychology/sessions/:id
```

**Session endpoint implementation notes**:
- `GET /psychology/sessions`: queries `appointments` where `providerId = request.providerId`, applies `from`/`to` date filter (both optional), `patientId` filter (optional). Returns array shaped as `Session` (map `customerId → patientId`, `priceCents → value`, `appointmentNotes → notes`).
- `POST /psychology/sessions`: validate `patientId` belongs to tenant. Look up `serviceId` from `type` slug (e.g. `individual` → service with `slug='individual'`). Compute `endTime = startTime + 50 min`. Insert via `prisma.appointment.create`.
- `POST /psychology/sessions/batch`: iterate `weeks` dates starting from `startDate`. For each, check existing non-cancelled appointment at same time for provider. Skip if conflict. Insert non-conflicting ones. Return `{ created, skipped }`.
- `PATCH /psychology/sessions/:id`: partial update — map `value → priceCents`, `notes → appointmentNotes`, pass through `status`, `paymentStatus`, `paidAt`.

**Done when**:
- [ ] All 5 patient endpoints respond correctly (201/200/204/404)
- [ ] Patient list filters by `search` across name, phone, email, cpf
- [ ] All 4 session endpoints respond correctly
- [ ] Batch endpoint skips conflicting slots and reports `skipped` count
- [ ] All routes return 401 without JWT
- [ ] `npx tsc --noEmit` exits 0

**Verify**:
```bash
cd packages/api && npx tsc --noEmit
# Manual smoke test after server starts:
# POST /api/psychology/patients → 201
# GET /api/psychology/patients → list with new patient
# POST /api/psychology/sessions → 201
# GET /api/psychology/sessions?from=2026-01-01&to=2026-12-31 → list
```

---

### T6 — Frontend: HTTP client + auth migration [P]

**What**: Create `http-client.ts` and `auth.ts`; rewrite `auth.store.ts`; update `LoginForm.tsx`; add `.env.example`.
**Where**:
- `packages/web-bruno/src/api/http-client.ts` — new
- `packages/web-bruno/src/api/auth.ts` — new
- `packages/web-bruno/src/stores/auth.store.ts` — rewrite
- `packages/web-bruno/src/components/auth/LoginForm.tsx` — update
- `packages/web-bruno/.env.example` — new
**Depends on**: T3 (no hard dep, but backend login must work — use T2+ as pre-condition)
**Requirement**: WBAPI-01, WBAPI-02

**`http-client.ts`**:
```typescript
export class ApiError extends Error {
  constructor(public code: string, message: string, public status: number) { super(message) }
}

export async function apiFetch<T>(path: string, options?: RequestInit): Promise<T> {
  // 1. attach Authorization header from auth store
  // 2. fetch VITE_API_URL + path
  // 3. if 401: POST /api/auth/refresh → update store token → retry once
  // 4. if retry 401: store.logout()
  // 5. if !response.ok: read { error, message }, throw ApiError
  // 6. return response.json()
}
```

**`auth.store.ts`** new shape:
```typescript
{
  accessToken: string | null
  user: { id: string; name: string } | null
  isAuthenticated: boolean
  login(email, password): Promise<void>   // throws ApiError on failure
  logout(): void
  setToken(token): void
}
```

`login()` calls `apiLogin()`, JWT-decodes payload (`providerId`, `tenantId`), stores token. User name fetched via `GET /api/admin/me` after login.

**`LoginForm.tsx` changes** (minimal):
- `onSubmit` becomes `async`
- Calls `await store.login(email, password)`
- Catches `ApiError` → sets error state → displays "Email ou senha incorretos"
- Shows loading spinner during submit

**Done when**:
- [ ] `http-client.ts` exports `apiFetch` and `ApiError`
- [ ] `apiFetch` throws `ApiError` on non-2xx
- [ ] `apiFetch` retries once on 401 after refresh
- [ ] `auth.store.ts` has no `localStorage` imports
- [ ] Login with valid credentials succeeds and redirects to `/`
- [ ] Login with invalid credentials shows error message
- [ ] `npx tsc --noEmit` exits 0 in `packages/web-bruno`

**Verify**:
```bash
cd packages/web-bruno && npx tsc --noEmit
# Start dev server, navigate to /login, try login with real credentials
```

---

### T7 — Frontend: rewrite `patients.ts` [P]

**What**: Replace local-storage hooks with `apiFetch` calls.
**Where**: `packages/web-bruno/src/api/patients.ts`
**Depends on**: T6 (apiFetch available), T5 (patient endpoints live)
**Requirement**: WBAPI-03

**Hooks** (same names, same signatures — no caller changes needed):
```typescript
usePatients(search?: string)       → GET /api/psychology/patients?search=
usePatient(id)                     → GET /api/psychology/patients/:id
useCreatePatient()                 → POST /api/psychology/patients
useUpdatePatient()                 → PATCH /api/psychology/patients/:id
useDeletePatient()                 → DELETE /api/psychology/patients/:id
```

Query key shape:
```typescript
['patients', { search }]   // list
['patients', id]           // single
```

**Done when**:
- [ ] No `local-storage` import
- [ ] `usePatients` returns data from real API in `PatientsPage`
- [ ] Create/update/delete invalidates `['patients']`
- [ ] `npx tsc --noEmit` exits 0

---

### T8 — Frontend: rewrite `appointments.ts` [P]

**What**: Replace local-storage hooks with `apiFetch` calls.
**Where**: `packages/web-bruno/src/api/appointments.ts`
**Depends on**: T6, T5
**Requirement**: WBAPI-04

**Hooks** (same names):
```typescript
useAppointments()                       → GET /api/psychology/sessions
useWeekAppointments(weekStartDate)      → GET /api/psychology/sessions?from=&to=
usePatientAppointments(patientId)       → GET /api/psychology/sessions?patientId=
useDateRangeAppointments(from, to)      → GET /api/psychology/sessions?from=&to=
useCreateAppointment()                  → POST /api/psychology/sessions
useCreateBatchAppointments()            → POST /api/psychology/sessions/batch
useCreateRecurringAppointments()        → POST /api/psychology/sessions/batch
useUpdateAppointment()                  → PATCH /api/psychology/sessions/:id
```

**Field mapping** (local → API request body):
- `patientId` → `patientId`
- `value` (number) → `value`
- `type` → `type`
- `notes` → `notes`

`endTime` is now computed server-side — remove `getEndTime` import from this file.

**Done when**:
- [ ] No `local-storage` import, no `getEndTime` import
- [ ] Week agenda loads real sessions
- [ ] Create appointment calls API, invalidates queries
- [ ] `npx tsc --noEmit` exits 0

---

### T9 — Frontend: rewrite `session-reports.ts` [P]

**What**: Replace local-storage hooks with `apiFetch` calls.
**Where**: `packages/web-bruno/src/api/session-reports.ts`
**Depends on**: T6, T4 (patient reports endpoint + report PATCH)
**Requirement**: WBAPI-05

**Hooks**:
```typescript
useSessionReport(appointmentId)     → GET /api/psychology/sessions/:sessionId/reports (first)
usePatientReports(patientId)        → GET /api/psychology/patients/:patientId/reports
useCreateSessionReport()            → POST /api/psychology/sessions/:sessionId/reports
useUpdateSessionReport()            → PATCH /api/psychology/reports/:id
useDeleteSessionReport()            → DELETE /api/psychology/reports/:id
```

**Done when**:
- [ ] No `local-storage` import
- [ ] `useSessionReport` returns report from API (null if none)
- [ ] `usePatientReports` returns all patient reports across sessions
- [ ] `npx tsc --noEmit` exits 0

---

### T10 — Frontend: rewrite `documents.ts` [P]

**What**: Replace local-storage hooks with `apiFetch` calls.
**Where**: `packages/web-bruno/src/api/documents.ts`
**Depends on**: T6
**Requirement**: WBAPI-06

**Hooks**:
```typescript
usePatientDocuments(patientId)   → GET /api/psychology/patients/:patientId/documents
useCreateDocument()              → POST /api/psychology/patients/:patientId/documents
useDeleteDocument()              → DELETE /api/psychology/documents/:id
```

Note: `useCreateDocument` body: `{ name, type, data }` (matches API). Remove `patientId` from flat body — use as path param.

**Done when**:
- [ ] No `local-storage` import
- [ ] Documents list and upload work via real API
- [ ] `npx tsc --noEmit` exits 0

---

### T11 — Frontend: rewrite `settings.ts` [P]

**What**: Replace single-blob settings with per-concern hooks. Update `SettingsPage.tsx` to consume decomposed hooks.
**Where**:
- `packages/web-bruno/src/api/settings.ts` — rewrite
- `packages/web-bruno/src/pages/SettingsPage.tsx` — update hook usage
**Depends on**: T6, T4 (PATCH /admin/me exists)
**Requirement**: WBAPI-07

**New hooks exported from `settings.ts`**:
```typescript
useProviderProfile()          → GET /api/admin/me
useUpdateProviderProfile()    → PATCH /api/admin/me
useShifts()                   → GET /api/admin/schedule/shifts
useUpdateShifts()             → PUT /api/admin/schedule/shifts
useAbsences()                 → GET /api/admin/schedule/absences
useCreateAbsence()            → POST /api/admin/schedule/absences
useDeleteAbsence()            → DELETE /api/admin/schedule/absences/:id
useServices()                 → GET /api/services
```

**`SettingsPage.tsx` update**:
- Replace `useSettings()` / `useUpdateSettings()` calls with the decomposed hooks
- Profile section: `useProviderProfile()` + `useUpdateProviderProfile()`
- Hours section: `useShifts()` + `useUpdateShifts()`
- Absences section: `useAbsences()` + `useCreateAbsence()` + `useDeleteAbsence()`
- Session defaults section: `useServices()` (read-only display)

**Done when**:
- [ ] No `local-storage` import in settings.ts
- [ ] Profile fields (name, phone, pixKey, messageTemplate) load and save via API
- [ ] Working hours load from shifts and save via PUT
- [ ] Absences load, add, and delete correctly
- [ ] Session type prices show from services list (read-only)
- [ ] `npx tsc --noEmit` exits 0

---

### T12 — Frontend: create `financial.ts` [P]

**What**: New hook for financial summary.
**Where**: `packages/web-bruno/src/api/financial.ts` — new file
**Depends on**: T6
**Requirement**: WBAPI-08

```typescript
export function useFinancialSummary(from: string, to: string) {
  return useQuery({
    queryKey: ['financial', from, to],
    queryFn: () => apiFetch<FinancialSummary>(`/api/admin/financial?from=${from}&to=${to}`),
    enabled: !!from && !!to,
  })
}

export interface FinancialSummary {
  totalSessions: number
  paidCount: number
  pendingCount: number
  revenueCents: number
  appointments: FinancialAppointment[]
}
```

Update `FinancialPage.tsx` to use `useFinancialSummary` instead of any previous approach.

**Done when**:
- [ ] `FinancialPage` loads real data
- [ ] `npx tsc --noEmit` exits 0

---

### T13 — Cleanup: delete localStorage layer

**What**: Remove all localStorage infrastructure. Fix any remaining type errors introduced by prior removals.
**Where**: Multiple files
**Depends on**: T7, T8, T9, T10, T11, T12
**Requirement**: WBAPI-09

**Steps**:
1. Delete `packages/web-bruno/src/api/local-storage.ts`
2. Remove `STORAGE_KEYS` from `packages/web-bruno/src/config/constants.ts`
3. Remove `User` and `UserSchema` from `packages/web-bruno/src/schemas/auth.schema.ts` — keep `LoginFormSchema` and `LoginFormData`
4. Verify no remaining `localStorage` usage: `grep -r "localStorage" packages/web-bruno/src/`
5. Create `packages/web-bruno/.env.example` with `VITE_API_URL=http://localhost:3000`

**Done when**:
- [ ] `local-storage.ts` does not exist
- [ ] `grep -r "STORAGE_KEYS" packages/web-bruno/src/` returns nothing
- [ ] `grep -r "localStorage" packages/web-bruno/src/` returns nothing
- [ ] `npx tsc --noEmit` exits 0 in `packages/web-bruno`
- [ ] `.env.example` exists at `packages/web-bruno/.env.example`

**Verify**:
```bash
cd packages/web-bruno && npx tsc --noEmit
grep -r "localStorage" src/
# expect: no output
grep -r "local-storage" src/
# expect: no output
```

---

## Parallel Execution Map

```
T1 → T2 → T3
              ├→ T4 [P] ─────────────────────────────────────────────────────────┐
              ├→ T5 [P] ──────────────────────────────────────────────────────┐  │
              └→ T6 [P]                                                       │  │
                    ├→ T7  [P] ───────────────────────────────────────────┐   │  │
                    ├→ T8  [P] ────────────────────────────────────────┐  │   │  │
                    ├→ T9  [P] (needs T4) ─────────────────────────┐   │  │   │  │
                    ├→ T10 [P] ────────────────────────────────┐   │   │  │   │  │
                    ├→ T11 [P] (needs T4) ──────────────────┐  │   │   │  │   │  │
                    └→ T12 [P] ─────────────────────────┐   │  │   │   │  │   │  │
                                                        └───┴──┴───┴───┴──┴───┴──┴→ T13
```
