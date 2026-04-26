# web-bruno API Migration — Specification

## Problem Statement

`web-bruno` stores all its data in `localStorage` via adapters in `src/api/`. The shared Fastify backend already has auth, session reports, documents, schedule (shifts + absences), and financial endpoints (delivered by the `psychology-api` spec). However, it is missing: **patient CRUD**, **session CRUD**, **cross-session patient reports**, a **session report update** endpoint, and a **provider profile PATCH** (with `pixKey` + `messageTemplate`).

This spec covers:
1. The backend API gaps that must be closed before `web-bruno` can drop `localStorage`
2. Full replacement of every `src/api/` adapter with real TanStack Query + fetch hooks
3. Auth flow migration from a hardcoded localStorage user to JWT via `POST /api/auth/login`
4. The resulting folder cleanup (delete `local-storage.ts`, `STORAGE_KEYS`, etc.)

---

## Pre-condition

The `psychology-api` spec (T1–T8) is fully implemented. The following already exist and are **not** re-implemented here:

| Endpoint | File |
|----------|------|
| `POST /api/auth/login` | `auth.routes.ts` |
| `POST /api/auth/refresh` | `auth.routes.ts` |
| `POST /api/auth/logout` | `auth.routes.ts` |
| `GET /api/admin/me` (name + avatarUrl only) | `admin.routes.ts` |
| `GET /api/admin/appointments/range` | `admin.routes.ts` |
| `POST /api/admin/appointments/:id/pay` | `admin.routes.ts` |
| `GET /api/admin/financial` | `admin.routes.ts` |
| `GET/PUT /api/admin/schedule/shifts` | `schedule.routes.ts` |
| `GET/POST/DELETE /api/admin/schedule/absences` | `schedule.routes.ts` |
| `POST/GET /api/psychology/sessions/:id/reports` | `psychology.routes.ts` |
| `GET/DELETE /api/psychology/reports/:id` | `psychology.routes.ts` |
| `POST/GET /api/psychology/patients/:id/documents` | `psychology.routes.ts` |
| `GET/DELETE /api/psychology/documents/:id` | `psychology.routes.ts` |

---

## Goals

- [ ] Every page in `web-bruno` reads and writes through the real API — no `localStorage` writes
- [ ] Login issues a real JWT; the app silently refreshes before expiry
- [ ] Patients, sessions, reports, documents, settings, and financial all work end-to-end against the DB
- [ ] `local-storage.ts` and `STORAGE_KEYS` are deleted with no remnants in `src/`
- [ ] All API calls carry `Authorization: Bearer <token>`

## Out of Scope

| Feature | Reason |
|---------|--------|
| Service price editing (sessionDefaults) | Prices set at seed time; settings page shows current prices read-only |
| WhatsApp notifications for psychology sessions | No WA integration for this vertical |
| S3 file storage | base64-in-DB decided in psychology-api spec |
| Patient booking portal | web-bruno is a psychologist-only panel |

---

## Design Decisions

### DD-01: `pixKey` and `messageTemplate` on the `providers` table

The `Settings` schema tracks `pixKey` and `messageTemplate` for the payment message flow. Neither field exists in the API.

**Decision**: Add `pixKey VARCHAR(255) nullable` and `messageTemplate TEXT nullable` directly to the `providers` table. These are per-provider settings; Bruno is the sole provider in his tenant. Accessed and updated via `GET|PATCH /api/admin/me`. No new table.

### DD-02: `phone` already on `providers` — expose it

`Provider.phone` already exists as a nullable field in the schema but is not returned by `GET /api/admin/me`. Extend the response to include it.

### DD-03: Separate psychology session endpoints

The existing `POST /api/admin/appointments` uses the barbershop booking flow (`bookingSchema`, WhatsApp triggers, `customerPhone` lookup). Psychology sessions use `patientId` directly, no WhatsApp.

**Decision**: New endpoints in `psychology.routes.ts` under the `/psychology/sessions` prefix. The underlying `appointments` table is shared; only the validation and response shape differ.

### DD-04: `useUpdateSessionReport` → `PATCH /api/psychology/reports/:id`

The frontend supports editing a saved report. The existing `psychology.routes.ts` has no PATCH. Add `PATCH /api/psychology/reports/:id` (body: `content`, `fileName?`, `fileType?`, `fileData?`).

### DD-05: Settings page uses separate hooks per concern

The current `useSettings()` / `useUpdateSettings()` hide a single blob. The new implementation uses distinct queries (`useProviderProfile`, `useShifts`, `useAbsences`, `useServices`) and the `SettingsPage` component composes them. This avoids a monolithic settings blob that would need complex merge logic across 4 endpoints.

---

## User Stories

### WBAPI-01 — Auth ⭐ MVP

As Bruno, I want to log in with my email + password so that the app authenticates me against the real database.

**Acceptance Criteria**:
1. WHEN `LoginForm` submits THEN `POST /api/auth/login` is called with `{ email, password }`
2. WHEN login succeeds THEN `accessToken` is stored in the auth store (memory only); `refreshToken` is stored as an HttpOnly cookie by the API
3. WHEN login fails (401) THEN the form shows "Email ou senha incorretos"
4. WHEN `accessToken` expires THEN `POST /api/auth/refresh` is called automatically and the new token replaces the old one
5. WHEN logout is triggered THEN `POST /api/auth/logout` is called and the auth store is cleared

### WBAPI-02 — HTTP Client ⭐ MVP

As a developer, I want a shared fetch wrapper so that all API calls attach the JWT and handle 401 auto-refresh.

**Acceptance Criteria**:
1. WHEN any API call is made THEN `Authorization: Bearer <token>` is attached
2. WHEN a response is 401 THEN the client silently refreshes and retries once
3. WHEN refresh also fails THEN the user is redirected to `/login`
4. WHEN a response is non-2xx (not handled above) THEN an `ApiError(code, message, status)` is thrown
5. Base URL is read from `import.meta.env.VITE_API_URL`

### WBAPI-03 — Patients CRUD ⭐ MVP

As Bruno, I want full CRUD for patients backed by the real API.

**Frontend hooks**:
- `usePatients(search?)` → `GET /api/psychology/patients?search=`
- `usePatient(id)` → `GET /api/psychology/patients/:id`
- `useCreatePatient()` → `POST /api/psychology/patients`
- `useUpdatePatient()` → `PATCH /api/psychology/patients/:id`
- `useDeletePatient()` → `DELETE /api/psychology/patients/:id`

**Backend — new endpoints in `psychology.routes.ts`**:

| Method | Path | Body / Query | Response |
|--------|------|--------------|----------|
| GET | `/psychology/patients?search=` | `search` optional | `{ patients: Patient[] }` ordered by name |
| POST | `/psychology/patients` | `{ name, phone?, email?, cpf?, notes? }` | `Patient` 201 |
| GET | `/psychology/patients/:id` | — | `Patient` or 404 |
| PATCH | `/psychology/patients/:id` | partial `{ name?, phone?, email?, cpf?, notes? }` | `Patient` |
| DELETE | `/psychology/patients/:id` | — | 204 |

All endpoints scoped to `request.tenant.id`.

### WBAPI-04 — Sessions CRUD ⭐ MVP

As Bruno, I want to create, view, update, and cancel sessions via the real API.

**Frontend hooks** (replacing current appointments.ts):
- `useWeekAppointments(weekStartDate)` → `GET /api/psychology/sessions?from=&to=`
- `usePatientAppointments(patientId)` → `GET /api/psychology/sessions?patientId=`
- `useDateRangeAppointments(from, to)` → `GET /api/psychology/sessions?from=&to=`
- `useAppointments()` → `GET /api/psychology/sessions` (no filter — dashboard use)
- `useCreateAppointment()` → `POST /api/psychology/sessions`
- `useCreateBatchAppointments()` → `POST /api/psychology/sessions/batch`
- `useCreateRecurringAppointments()` → `POST /api/psychology/sessions/batch` (same endpoint, weeks param)
- `useUpdateAppointment()` → `PATCH /api/psychology/sessions/:id`

**Backend — new endpoints in `psychology.routes.ts`**:

| Method | Path | Body / Query | Response |
|--------|------|--------------|----------|
| GET | `/psychology/sessions` | `from?`, `to?`, `patientId?` | `{ sessions: Session[] }` |
| POST | `/psychology/sessions` | `{ patientId, date, startTime, type, value, status, paymentStatus?, notes? }` | `Session` 201 |
| POST | `/psychology/sessions/batch` | `{ baseData, startDate, weeks }` | `{ created: Session[], skipped: number }` |
| PATCH | `/psychology/sessions/:id` | partial `{ status?, paymentStatus?, paidAt?, notes?, value? }` | `Session` |

- All endpoints scoped to `request.providerId` (JWT-identified provider)
- Batch endpoint performs server-side conflict detection (skip, not error, on slot collision)
- Session shape returned: `{ id, patientId, patientName, date, startTime, endTime, type, value, status, paymentStatus, paidAt?, notes? }`
- `endTime` calculated from `startTime + 50 min` server-side

### WBAPI-05 — Session Reports ⭐ MVP

As Bruno, I want to create, update, and view session reports via the real API.

**Frontend hooks**:
- `useSessionReport(appointmentId)` → `GET /api/psychology/sessions/:sessionId/reports` (take first)
- `usePatientReports(patientId)` → `GET /api/psychology/patients/:patientId/reports` ← **new endpoint**
- `useCreateSessionReport()` → `POST /api/psychology/sessions/:sessionId/reports`
- `useUpdateSessionReport()` → `PATCH /api/psychology/reports/:id` ← **new endpoint**
- `useDeleteSessionReport()` → `DELETE /api/psychology/reports/:id`

**Backend — additions to `psychology.routes.ts`**:

| Method | Path | Body | Response |
|--------|------|------|----------|
| GET | `/psychology/patients/:patientId/reports` | — | `SessionReport[]` ordered `createdAt DESC` |
| PATCH | `/psychology/reports/:id` | `{ content?, fileName?, fileType?, fileData? }` | `SessionReport` |

### WBAPI-06 — Documents ⭐ MVP

As Bruno, I want to upload and manage patient documents via the real API.

**Frontend hooks** (no new backend endpoints needed):
- `usePatientDocuments(patientId)` → `GET /api/psychology/patients/:patientId/documents`
- `useCreateDocument()` → `POST /api/psychology/patients/:patientId/documents`
- `useDeleteDocument()` → `DELETE /api/psychology/documents/:id`

**Acceptance Criteria**:
1. Upload a document → appears in list (no `data` field in list response)
2. `GET /api/psychology/documents/:id` returns full document including `data`
3. Delete removes it from list

### WBAPI-07 — Settings ⭐ MVP

As Bruno, I want my profile, working hours, absences, and payment settings to persist in the API.

**Frontend — replace `settings.ts` with composed hooks**:
- `useProviderProfile()` → `GET /api/admin/me`
- `useUpdateProviderProfile()` → `PATCH /api/admin/me`
- `useShifts()` → `GET /api/admin/schedule/shifts`
- `useUpdateShifts()` → `PUT /api/admin/schedule/shifts`
- `useAbsences()` → `GET /api/admin/schedule/absences`
- `useCreateAbsence()` → `POST /api/admin/schedule/absences`
- `useDeleteAbsence()` → `DELETE /api/admin/schedule/absences/:id`
- `useServices()` → `GET /api/services` (read-only; no price editing in scope)

**Backend — additions**:

| Method | Path | Body | Notes |
|--------|------|------|-------|
| PATCH | `/admin/me` | `{ firstName?, lastName?, phone?, pixKey?, messageTemplate? }` | New endpoint |
| Schema | `providers` | Add `pix_key VARCHAR(255) nullable`, `message_template TEXT nullable` | Migration required |
| GET | `/admin/me` | — | Extend response to include `phone`, `pixKey`, `messageTemplate` |

**Acceptance Criteria**:
1. SettingsPage loads profile from `GET /api/admin/me`; updates via `PATCH /api/admin/me`
2. Working hours load from shifts; saved via `PUT /api/admin/schedule/shifts`
3. Absences load from absence list; added/removed via POST/DELETE
4. Session type prices shown read-only from `GET /api/services`

### WBAPI-08 — Financial Page ⭐ MVP

As Bruno, I want the financial page to show real revenue data.

**Frontend — create `src/api/financial.ts`**:
- `useFinancialSummary(from, to)` → `GET /api/admin/financial?from=&to=`

**Backend**: Endpoint already exists ✅

Response shape: `{ totalSessions, paidCount, pendingCount, revenueCents, appointments[] }`

### WBAPI-09 — Folder Cleanup ⭐ MVP

As a developer, I want the `localStorage` layer fully removed so there is no dual-path code.

**Acceptance Criteria**:
1. `src/api/local-storage.ts` is deleted
2. `STORAGE_KEYS` removed from `src/config/constants.ts`
3. `User` type and `UserSchema` removed from `src/schemas/auth.schema.ts` (only `LoginFormSchema` + `LoginFormData` remain)
4. `src/stores/auth.store.ts` uses real API — no `local-storage` import
5. No `localStorage.getItem` / `localStorage.setItem` calls remain in `src/`
6. `VITE_API_URL` env var documented in a `.env.example` at `packages/web-bruno/`

---

## New `src/api/` File Layout

```
src/api/
├── http-client.ts          # fetch wrapper: JWT attach, 401 refresh, ApiError
├── query-client.ts         # TanStack QueryClient (unchanged)
├── auth.ts                 # login(), logout(), refresh() plain fetch functions
├── patients.ts             # usePatients, usePatient, useCreatePatient, useUpdatePatient, useDeletePatient
├── appointments.ts         # useAppointments, useWeekAppointments, usePatientAppointments,
│                           # useDateRangeAppointments, useCreateAppointment,
│                           # useCreateBatchAppointments, useCreateRecurringAppointments, useUpdateAppointment
├── session-reports.ts      # useSessionReport, usePatientReports, useCreateSessionReport,
│                           # useUpdateSessionReport, useDeleteSessionReport
├── documents.ts            # usePatientDocuments, useCreateDocument, useDeleteDocument
├── settings.ts             # useProviderProfile, useUpdateProviderProfile, useShifts, useUpdateShifts,
│                           # useAbsences, useCreateAbsence, useDeleteAbsence, useServices
└── financial.ts            # useFinancialSummary
```

Deleted: `local-storage.ts`

---

## Requirement Traceability

| ID | Story | Status |
|----|-------|--------|
| WBAPI-01 | Auth (login, JWT, refresh, logout) | Pending |
| WBAPI-02 | HTTP Client | Pending |
| WBAPI-03 | Patients CRUD (backend + frontend) | Pending |
| WBAPI-04 | Sessions CRUD (backend + frontend) | Pending |
| WBAPI-05 | Session Reports (new endpoints + frontend) | Pending |
| WBAPI-06 | Documents (frontend only) | Pending |
| WBAPI-07 | Settings (provider PATCH + frontend) | Pending |
| WBAPI-08 | Financial page (frontend only) | Pending |
| WBAPI-09 | Folder cleanup | Pending |

---

## Success Criteria

- [ ] `tsc --noEmit` exits 0 in both `packages/api` and `packages/web-bruno`
- [ ] Login flow works against real DB (JWT in auth store, cookie set)
- [ ] All pages load real data (verify in browser with network tab)
- [ ] No `localStorage.getItem` calls remain in `packages/web-bruno/src/`
- [ ] `prisma migrate dev` applies cleanly
