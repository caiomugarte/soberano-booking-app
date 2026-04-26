# API Integration Tasks

**Spec**: `.specs/features/api-integration/spec.md`
**Status**: Approved

---

## Execution Plan

### Phase 1 — Foundation (Parallel OK)

No cross-dependencies. All can start simultaneously.

```
T1  (vite.config.js)
T2  (.env.example)
T3  (.env)
T4  (env.js)
T6  (package.json)
T8  (App.jsx state shape)
```

### Phase 2 — Config Layer (Sequential within each chain)

```
T4 → T5  (api.js depends on env.js)
T6 → T7  (QueryClientProvider depends on package install)
```

### Phase 3 — Components (Parallel after T5 + T7 complete)

```
T5, T7 done →
  ├── T9  [P]  StepService
  ├── T10 [P]  StepBarber
```

### Phase 4 — Time Step (depends on T8 + T5 + T7)

```
T5, T7, T8 done → T11  StepTime
```

### Phase 5 — Integration (Sequential)

```
T8 → T12  StepConfirm
T5, T7, T8 → T13 → T14
```

---

## Task Breakdown

### T1: Update vite.config.js — port 5175 + /api proxy

**What**: Set `server.port = 5175` and add proxy for `/api` to `VITE_API_URL`.
**Where**: `packages/web-marques/vite.config.js`
**Depends on**: None
**Requirement**: REQ-01

**Done when**:
- [ ] `server: { port: 5175 }` is set
- [ ] `proxy: { '/api': { target: 'http://localhost:3000', changeOrigin: true } }` is set
- [ ] `npm run dev` starts on port 5175

---

### T2: Create .env.example [P]

**What**: Committed template file with the two required env vars.
**Where**: `packages/web-marques/.env.example`
**Depends on**: None
**Requirement**: REQ-02

**Done when**:
- [ ] File exists with `VITE_API_URL=http://localhost:3000`
- [ ] File contains `VITE_TENANT_SLUG=your-tenant-slug`

---

### T3: Create .env [P]

**What**: Local env file (gitignored) with real values for dev.
**Where**: `packages/web-marques/.env`
**Depends on**: None
**Requirement**: REQ-02

**Done when**:
- [ ] File exists with `VITE_API_URL=http://localhost:3000`
- [ ] File contains `VITE_TENANT_SLUG=marques`
- [ ] `.env` is present in `.gitignore` (add if missing)

---

### T4: Create src/config/env.js [P]

**What**: Reads and validates `VITE_TENANT_SLUG` at startup; exports `TENANT_SLUG`.
**Where**: `packages/web-marques/src/config/env.js`
**Depends on**: None
**Reuses**: `packages/web/src/config/env.ts` pattern
**Requirement**: REQ-03

**Done when**:
- [ ] Reads `import.meta.env.VITE_TENANT_SLUG`
- [ ] Throws `Error('VITE_TENANT_SLUG environment variable is required')` if missing
- [ ] Exports `TENANT_SLUG`

---

### T5: Create src/config/api.js

**What**: Plain JS fetch wrapper with `get` and `post` methods, tenant header on every request.
**Where**: `packages/web-marques/src/config/api.js`
**Depends on**: T4
**Reuses**: `packages/web/src/config/api.ts` pattern
**Requirement**: REQ-03

**Done when**:
- [ ] Base URL is `${import.meta.env.VITE_API_URL ?? ''}/api`
- [ ] Every request sends `Content-Type: application/json` and `X-Tenant-Slug: TENANT_SLUG`
- [ ] Throws `Error(body.message ?? 'Erro inesperado.')` on non-ok responses
- [ ] Exports `api` with `get(path)` and `post(path, body)` methods

---

### T6: Add @tanstack/react-query to package.json [P]

**What**: Install the package and record it as a dependency.
**Where**: `packages/web-marques/package.json`
**Depends on**: None
**Requirement**: REQ-04

**Done when**:
- [ ] `@tanstack/react-query` appears in `dependencies` in `package.json`
- [ ] `node_modules/@tanstack/react-query` exists after `npm install`

---

### T7: Wrap App in QueryClientProvider in src/main.jsx

**What**: Instantiate `QueryClient` and wrap `<App />` with `<QueryClientProvider>`.
**Where**: `packages/web-marques/src/main.jsx`
**Depends on**: T6
**Requirement**: REQ-04

**Done when**:
- [ ] `QueryClient` and `QueryClientProvider` imported from `@tanstack/react-query`
- [ ] `const queryClient = new QueryClient()` instantiated outside render
- [ ] `<App />` wrapped with `<QueryClientProvider client={queryClient}>`

---

### T8: Update selections state shape in App.jsx [P]

**What**: Change `date` to `{ label, iso }` and ensure `service`/`barber` carry API fields.
**Where**: `packages/web-marques/src/App.jsx`
**Depends on**: None
**Requirement**: REQ-09

**Done when**:
- [ ] Initial state: `date: null` (will receive `{ label: string, iso: 'YYYY-MM-DD' }`)
- [ ] `canProceed` step 3 checks `!!selections.date?.iso && !!selections.time`
- [ ] `StepTime` receives `barber={selections.barber}` as a prop (for workDays filtering)
- [ ] No runtime errors with null `date`

---

### T9: Unmock StepService.jsx — useQuery → GET /api/services [P]

**What**: Replace hardcoded array with real API data.
**Where**: `packages/web-marques/src/components/StepService.jsx`
**Depends on**: T5, T7
**Requirement**: REQ-05

**Done when**:
- [ ] Hardcoded `services` array removed
- [ ] `useQuery({ queryKey: ['services'], queryFn: () => api.get('/services').then(r => r.services), staleTime: Infinity })` added
- [ ] `priceCents` formatted as `R$ XX,00` (divide by 100, e.g. `4000 → "R$ 40,00"`)
- [ ] `duration` (minutes) formatted: `< 60 → "X min"`, `>= 60 → "Xh Ymin"` (omit "0min")
- [ ] `service.icon` rendered as text/emoji in place of lucide icon
- [ ] Loading skeleton shown while `isLoading`
- [ ] Error message shown when `isError`

---

### T10: Unmock StepBarber.jsx — useQuery → GET /api/barbers [P]

**What**: Replace hardcoded array with real API data.
**Where**: `packages/web-marques/src/components/StepBarber.jsx`
**Depends on**: T5, T7
**Requirement**: REQ-06

**Done when**:
- [ ] Hardcoded `barbers` array removed
- [ ] `useQuery({ queryKey: ['barbers'], queryFn: () => api.get('/barbers').then(r => r.barbers), staleTime: Infinity })` added
- [ ] Display name is `barber.firstName + ' ' + barber.lastName`
- [ ] Photo uses `barber.avatarUrl`; falls back to a placeholder `div` with initials if null
- [ ] Full barber object (including `id` and `workDays`) passed via `onSelect`
- [ ] Loading skeleton shown while `isLoading`
- [ ] Error message shown when `isError`

---

### T11: Unmock StepTime.jsx — dynamic dates + slots query

**What**: Replace hardcoded dates/times with real data from barber workDays and the slots API.
**Where**: `packages/web-marques/src/components/StepTime.jsx`
**Depends on**: T5, T7, T8
**Requirement**: REQ-07

**Done when**:
- [ ] Accepts `barber` prop (with `workDays: number[]`)
- [ ] Generates next 14 calendar days; filters by `barber.workDays` (0=Sun…6=Sat); shows first 7 matches
- [ ] Each date option carries `{ label: 'Segunda, 13 de Abril', iso: 'YYYY-MM-DD' }`
- [ ] On date select, calls `onSelectDate({ label, iso })` — parent stores the full object
- [ ] `useQuery` fetches `GET /api/slots?barberId=<barber.id>&date=<iso>` when date selected; enabled only when both `barber` and `date` are set
- [ ] Only slots where `available === true` are rendered
- [ ] Loading state shown while fetching slots
- [ ] "Nenhum horário disponível" shown when all slots are occupied

---

### T12: Update StepConfirm.jsx — handle new date.label format

**What**: Replace `selections.date.dayNum + " de Maio"` with `selections.date.label`.
**Where**: `packages/web-marques/src/components/StepConfirm.jsx`
**Depends on**: T8
**Requirement**: REQ-09

**Done when**:
- [ ] Date display uses `selections.date?.label` instead of `selections.date?.dayNum + " de Maio"`
- [ ] Barber name uses `selections.barber?.firstName + ' ' + selections.barber?.lastName` (or whatever display field the API returns — use what T10 established)

---

### T13: Replace handleConfirm with POST /api/book mutation in App.jsx

**What**: Remove WhatsApp redirect; call `POST /api/book` with the booking payload.
**Where**: `packages/web-marques/src/App.jsx`
**Depends on**: T5, T7, T8
**Requirement**: REQ-08

**Done when**:
- [ ] `window.open` WhatsApp redirect removed
- [ ] `useMutation` from `@tanstack/react-query` used
- [ ] Payload matches `BookingRequest`: `{ serviceId, barberId, date (iso), startTime, customerName, customerPhone (digits only — strip non-digits) }`
- [ ] On success: advances to step 6
- [ ] On error: sets an `bookingError` state string; BottomBar or StepConfirm renders it inline
- [ ] Confirm button shows loading state while mutation is in-flight

---

### T14: Add step 6 "Agendamento Confirmado" view in App.jsx

**What**: New final step displayed after successful booking.
**Where**: `packages/web-marques/src/App.jsx` (inline JSX or new `StepSuccess.jsx`)
**Depends on**: T13
**Requirement**: REQ-08

**Done when**:
- [ ] Step 6 renders when `currentStep === 6`
- [ ] Shows barber name, service name, `date.label`, and `time`
- [ ] No "Próximo" / "Confirmar" button shown on step 6
- [ ] BottomBar hidden or shows only a "Novo agendamento" reset button on step 6

---

## Parallel Execution Map

```
Phase 1 (all parallel):
  T1, T2, T3, T4, T6, T8

Phase 2 (sequential per chain):
  T4 → T5
  T6 → T7

Phase 3 (parallel after T5 + T7):
  T5, T7 → T9 [P]
  T5, T7 → T10 [P]

Phase 4 (after T5 + T7 + T8):
  T5, T7, T8 → T11

Phase 5 (sequential):
  T8 → T12
  T5, T7, T8 → T13 → T14
```

---

## Granularity Check

| Task | Scope | Status |
|------|-------|--------|
| T1: vite.config.js | 1 file, 2 config lines | ✅ |
| T2: .env.example | 1 file | ✅ |
| T3: .env | 1 file | ✅ |
| T4: env.js | 1 file, ~8 lines | ✅ |
| T5: api.js | 1 file, ~25 lines | ✅ |
| T6: package.json install | 1 command | ✅ |
| T7: main.jsx | 1 file, +3 lines | ✅ |
| T8: App.jsx state shape | 1 file, state + props | ✅ |
| T9: StepService.jsx | 1 component | ✅ |
| T10: StepBarber.jsx | 1 component | ✅ |
| T11: StepTime.jsx | 1 component | ✅ |
| T12: StepConfirm.jsx | 1 component, 2 lines | ✅ |
| T13: handleConfirm mutation | 1 concern in App.jsx | ✅ |
| T14: step 6 success view | 1 view | ✅ |
