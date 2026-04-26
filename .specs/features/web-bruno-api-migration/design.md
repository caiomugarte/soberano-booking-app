# web-bruno API Migration — Design

**Spec**: `.specs/features/web-bruno-api-migration/spec.md`

---

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────┐
│  web-bruno (React + Vite)                                   │
│                                                             │
│  ┌─────────────┐    ┌───────────────────────────────────┐  │
│  │ auth.store  │◄───│ src/api/auth.ts                   │  │
│  │ (Zustand)   │    │ login() / logout() / refresh()    │  │
│  └──────┬──────┘    └───────────────────────────────────┘  │
│         │ token                                             │
│         ▼                                                   │
│  ┌─────────────────────────────────────────────────────┐   │
│  │ src/api/http-client.ts                              │   │
│  │ apiFetch(path, options) →                           │   │
│  │   attach Bearer, retry on 401, throw ApiError       │   │
│  └─────────────────────┬───────────────────────────────┘   │
│                        │                                    │
│  TanStack Query hooks  │                                    │
│  ┌──────────┐ ┌───────┐│┌──────────┐ ┌────────┐ ┌──────┐  │
│  │patients  │ │appts  │││reports   │ │docs    │ │fin   │  │
│  └──────────┘ └───────┘│└──────────┘ └────────┘ └──────┘  │
│              ┌─────────┘                                    │
│              │ settings.ts (composed hooks)                 │
│              │  useProviderProfile, useShifts, useAbsences  │
└──────────────┼──────────────────────────────────────────────┘
               │  HTTP  (VITE_API_URL + /api/...)
               ▼
┌──────────────────────────────────────────────────────────────┐
│  Fastify API  (packages/api)                                 │
│                                                             │
│  auth.routes.ts        POST /api/auth/login|refresh|logout  │
│  admin.routes.ts       GET|PATCH /api/admin/me              │
│                        GET /api/admin/financial             │
│  schedule.routes.ts    GET|PUT shifts / GET|POST|DELETE abs │
│  psychology.routes.ts  /api/psychology/patients    (new)    │
│                        /api/psychology/sessions    (new)    │
│                        /api/psychology/sessions/:id/reports │
│                        /api/psychology/reports/:id (+ PATCH)│
│                        /api/psychology/patients/:id/reports │
│                        /api/psychology/patients/:id/docs    │
│                        /api/psychology/documents/:id        │
│  service.routes.ts     GET /api/services (read-only)        │
└─────────────────────────────────────────────────────────────┘
```

---

## Backend Changes

### 1. Schema migration — providers table

Add two nullable columns to `providers`:

```prisma
pixKey          String?  @map("pix_key") @db.VarChar(255)
messageTemplate String?  @map("message_template") @db.Text
```

Migration: `prisma migrate dev --name add-provider-settings`

`phone` already exists on `Provider` — only needs to be exposed in the API response.

### 2. Extend `GET /api/admin/me` + add `PATCH /api/admin/me`

`admin.routes.ts` changes:

```
GET  /admin/me   response: { id, firstName, lastName, phone, avatarUrl, pixKey, messageTemplate }
PATCH /admin/me  body: { firstName?, lastName?, phone?, pixKey?, messageTemplate? }
                 response: same as GET
```

Validation: all fields optional; at least one must be present. `phone` regex `\d{10,11}` or null to clear.

### 3. Patient CRUD — `psychology.routes.ts`

New block in the existing `psychologyRoutes` function:

```
GET    /psychology/patients               → customerRepo.findAllByTenant(tenantId, search?)
POST   /psychology/patients               → customerRepo.create(...)
GET    /psychology/patients/:id           → customerRepo.findById(id) or 404
PATCH  /psychology/patients/:id           → customerRepo.update(id, partial)
DELETE /psychology/patients/:id           → customerRepo.deleteById(id) or 404
```

Reuses `PrismaCustomerRepository` (already has `findById` from psychology-api T4). Needs: `findAll`, `create`, `update`, `deleteById` — all straightforward Prisma operations, no new repository interface changes beyond adding these methods.

**Customer shape returned**:
```json
{ "id": "uuid", "name": "...", "phone": "...", "email": "...", "cpf": "...", "notes": "...", "createdAt": "..." }
```

### 4. Session CRUD — `psychology.routes.ts`

New block in `psychologyRoutes`. Uses `PrismaAppointmentRepository` for reads + writes.

**Session shape returned**:
```json
{
  "id": "uuid",
  "patientId": "uuid",     ← customerId aliased
  "patientName": "...",
  "date": "YYYY-MM-DD",
  "startTime": "HH:MM",
  "endTime": "HH:MM",
  "type": "individual|couple|family",
  "serviceId": "uuid",
  "value": 20000,          ← priceCents
  "status": "scheduled|confirmed|completed|cancelled|no_show",
  "paymentStatus": "pending|paid",
  "paidAt": "ISO string | null",
  "notes": "..."
}
```

**`POST /psychology/sessions` body**:
```json
{
  "patientId": "uuid",
  "date": "YYYY-MM-DD",
  "startTime": "HH:MM",
  "type": "individual|couple|family",
  "value": 20000,
  "status": "scheduled",
  "paymentStatus": "pending",
  "notes": ""
}
```
Server-side: `endTime = startTime + 50 min`, `serviceId` looked up from `type → service.slug`.

**`POST /psychology/sessions/batch` body**:
```json
{
  "baseData": { "patientId", "startTime", "type", "value", "status", "paymentStatus" },
  "startDate": "YYYY-MM-DD",
  "weeks": 8
}
```
Server iterates `weeks` dates, skips slots where `status != 'cancelled'` appointment exists.
Returns `{ created: Session[], skipped: number }`.

**`PATCH /psychology/sessions/:id` body** — partial, any subset of:
`{ status?, paymentStatus?, paidAt?, notes?, value? }`

**`DELETE` not added** — cancellation is `PATCH … { status: 'cancelled' }` (consistent with existing barbershop pattern).

### 5. Session report additions — `psychology.routes.ts`

```
GET   /psychology/patients/:patientId/reports
      → reportRepo.findByPatient(patientId) ordered createdAt DESC

PATCH /psychology/reports/:id
      body: { content?, fileName?, fileType?, fileData? }
      → reportRepo.updateById(id, partial)
      validates fileData size (≤ 6.8M chars)
```

`PrismaSessionReportRepository` needs two new methods: `findByPatient`, `updateById`.

---

## Frontend Changes

### `src/api/http-client.ts` — new file

```typescript
// Singleton fetch wrapper
export async function apiFetch<T>(
  path: string,
  options?: RequestInit & { skipAuth?: boolean }
): Promise<T>
```

Behaviour:
1. Reads `accessToken` from `useAuthStore.getState().accessToken`
2. Attaches `Authorization: Bearer` unless `skipAuth: true`
3. On 401: calls `POST /api/auth/refresh` once, updates store, retries
4. On refresh failure: calls `useAuthStore.getState().logout()`, throws `ApiError`
5. On non-2xx: reads `{ error, message }` JSON and throws `ApiError(code, message, status)`

> **No React hooks inside** — plain async function. TanStack `queryFn` calls it.

### `src/api/auth.ts` — new file

Plain fetch functions (not hooks), called by `useAuthStore`:

```typescript
export async function apiLogin(email: string, password: string): Promise<{ accessToken: string }>
export async function apiLogout(): Promise<void>
export async function apiRefresh(): Promise<{ accessToken: string }>
```

These use raw `fetch` (no `apiFetch` — no token needed for login/refresh).

### `src/stores/auth.store.ts` — rewrite

```typescript
interface AuthState {
  accessToken: string | null
  user: { id: string; name: string } | null
  isAuthenticated: boolean
  login: (email: string, password: string) => Promise<void>  // throws on failure
  logout: () => void
  setToken: (token: string) => void
}
```

- `login()` calls `apiLogin()`, decodes JWT payload for `user.name`, stores `accessToken`
- `logout()` calls `apiLogout()` (fire-and-forget), clears state
- `setToken()` used by `http-client.ts` after silent refresh

No `localStorage` imports. Token lives in memory only — lost on page reload (acceptable; refresh cookie handles re-auth on next load).

### `LoginForm.tsx` — small update

Wire to the async `login()` from auth store. Show error on thrown error. Loading state during submit.

### `src/api/patients.ts` — rewrite

All hooks delegate to `apiFetch`. Field names: API returns `customerId` → frontend aliases as `id`. API returns camelCase (Prisma naming). No local ID generation.

```typescript
export function usePatients(search?: string): UseQueryResult<Patient[]>
export function usePatient(id: string | undefined): UseQueryResult<Patient | null>
export function useCreatePatient(): UseMutationResult<Patient, ApiError, PatientFormData>
export function useUpdatePatient(): UseMutationResult<Patient, ApiError, { id: string; data: Partial<PatientFormData> }>
export function useDeletePatient(): UseMutationResult<void, ApiError, string>
```

### `src/api/appointments.ts` — rewrite

Maps frontend field names to API field names:
- `patientId` (frontend) → `patientId` in request body (API accepts this alias)
- `value` (frontend, cents) → `value` in body
- `type` (frontend) → `type` in body (`individual` | `couple` | `family`)

Hooks:

```typescript
export function useAppointments(): UseQueryResult<Appointment[]>
export function useWeekAppointments(weekStartDate: Date): UseQueryResult<Appointment[]>
export function usePatientAppointments(patientId: string | undefined): UseQueryResult<Appointment[]>
export function useDateRangeAppointments(from: string, to: string): UseQueryResult<Appointment[]>
export function useCreateAppointment(): UseMutationResult<Appointment, ApiError, CreateSessionBody>
export function useCreateBatchAppointments(): UseMutationResult<BatchResult, ApiError, BatchItem[]>
export function useCreateRecurringAppointments(): UseMutationResult<BatchResult, ApiError, RecurringParams>
export function useUpdateAppointment(): UseMutationResult<Appointment, ApiError, { id: string; data: Partial<Appointment> }>
```

### `src/api/session-reports.ts` — rewrite

`useSessionReport(appointmentId)` gets report list for session, returns first. `usePatientReports(patientId)` uses the new cross-session endpoint.

### `src/api/documents.ts` — rewrite

Straightforward: three hooks, three endpoints.

### `src/api/settings.ts` — rewrite (decomposed)

Replaces the monolithic `useSettings` / `useUpdateSettings` with per-concern hooks:

```typescript
export function useProviderProfile()
export function useUpdateProviderProfile()
export function useShifts()
export function useUpdateShifts()
export function useAbsences()
export function useCreateAbsence()
export function useDeleteAbsence()
export function useServices()  // read-only
```

`SettingsPage` is updated to consume these separate hooks instead of the single `useSettings` blob. The page still presents one form, composed from separate data sources.

### `src/api/financial.ts` — new file

```typescript
export function useFinancialSummary(from: string, to: string): UseQueryResult<FinancialSummary>
```

---

## Data Flow: Auth Lifecycle

```
App loads
    └─ auth.store hydrates from memory (empty — token lost on reload)
    └─ apiFetch calls any protected endpoint
           └─ 401 returned (no token)
           └─ http-client.ts → POST /api/auth/refresh (cookie auto-sent)
                  ├─ 200 → store new accessToken, retry original request ✅
                  └─ 401 → redirect to /login ❌

User logs in
    └─ LoginForm → store.login(email, password)
           └─ POST /api/auth/login → { accessToken }
           └─ store.accessToken = token
           └─ navigate to /

User logs out
    └─ store.logout()
           └─ POST /api/auth/logout (clears cookie server-side)
           └─ store cleared → <ProtectedRoute> redirects to /login
```

---

## Environment Variables

`packages/web-bruno/.env.example`:
```
VITE_API_URL=http://localhost:3000
```

`VITE_API_URL` is required. `http-client.ts` throws at module load if missing.

---

## Files Modified / Created Summary

### Backend (`packages/api`)

| Action | File |
|--------|------|
| Modify | `prisma/schema.prisma` — add `pixKey`, `messageTemplate` to Provider |
| New migration | `prisma/migrations/…add_provider_settings` |
| Modify | `src/domain/repositories/customer.repository.ts` — add `findAll`, `create`, `update`, `deleteById` |
| Modify | `src/infrastructure/database/repositories/prisma-customer.repository.ts` — implement above |
| Modify | `src/domain/repositories/session-report.repository.ts` — add `findByPatient`, `updateById` |
| Modify | `src/infrastructure/database/repositories/prisma-session-report.repository.ts` — implement above |
| Modify | `src/http/routes/admin.routes.ts` — extend GET /admin/me + add PATCH /admin/me |
| Modify | `src/http/routes/psychology.routes.ts` — add patients, sessions, patient-reports, report PATCH |

### Frontend (`packages/web-bruno`)

| Action | File |
|--------|------|
| New | `src/api/http-client.ts` |
| New | `src/api/auth.ts` |
| New | `src/api/financial.ts` |
| Rewrite | `src/api/patients.ts` |
| Rewrite | `src/api/appointments.ts` |
| Rewrite | `src/api/session-reports.ts` |
| Rewrite | `src/api/documents.ts` |
| Rewrite | `src/api/settings.ts` |
| Rewrite | `src/stores/auth.store.ts` |
| Delete | `src/api/local-storage.ts` |
| Modify | `src/schemas/auth.schema.ts` — remove User/UserSchema |
| Modify | `src/config/constants.ts` — remove STORAGE_KEYS |
| Modify | `src/components/auth/LoginForm.tsx` — async submit, error display |
| Modify | `packages/web-bruno/SettingsPage.tsx` — consume decomposed hooks |
| New | `packages/web-bruno/.env.example` |
