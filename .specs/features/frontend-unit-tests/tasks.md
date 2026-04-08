# Frontend Unit Tests — Tasks

**Spec**: `.specs/features/frontend-unit-tests/spec.md`
**Status**: Approved

---

## Execution Plan

### Phase 1: Infrastructure (Sequential)

Must complete before any component test can be written.

```
T1 → T2
```

### Phase 2: Pure Logic Tests (Parallel — no DOM needed)

Can start after T1 is done (T2 not required). These run in `node` or `jsdom` equally.

```
T1 complete, then in parallel:
  ├── T3 [P]  format.ts missing functions
  └── T4 [P]  auth.store tests
```

### Phase 3: Component Tests (Parallel — requires T2)

All component tests are independent of each other.

```
T2 complete, then in parallel:
  ├── T5 [P]  StepIndicator
  ├── T6 [P]  ProtectedRoute
  ├── T7 [P]  BookingWizard
  └── T8 [P]  CustomerStep
```

### Phase 4: P3 (Sequential — requires T2 + T7 done first as reference)

```
T7 complete, then:
  T9  ConfirmStep
```

---

## Task Breakdown

### T1: Update vitest config to jsdom environment

**What**: Change `environment: 'node'` to `environment: 'jsdom'` in `vitest.config.ts` and add a `setupFiles` entry pointing to a new test setup file.
**Where**: `packages/web/vitest.config.ts` (modify) + `packages/web/src/test-setup.ts` (create)
**Depends on**: None
**Requirement**: FUT-03

**What to do**:
- Set `test.environment` to `'jsdom'`
- Add `test.setupFiles: ['./src/test-setup.ts']`
- Create `src/test-setup.ts` with a single import: `import '@testing-library/jest-dom'`

**Done when**:
- [ ] `vitest.config.ts` has `environment: 'jsdom'`
- [ ] `src/test-setup.ts` exists and imports `@testing-library/jest-dom`
- [ ] Existing tests still pass: `cd packages/web && npm run test` — all green

**Verify**:
```
cd packages/web && npm run test
```
Expected: all existing tests (booking.store, format) pass with 0 failures.

**Commit**: `test(web): set up jsdom environment and jest-dom matchers`

---

### T2: Install DOM testing dependencies

**What**: Add `@testing-library/react`, `@testing-library/user-event`, `@testing-library/jest-dom`, and `jsdom` as devDependencies in `packages/web`.
**Where**: `packages/web/package.json` (modified by npm install)
**Depends on**: T1
**Requirement**: FUT-03

**What to do**:
```bash
cd packages/web && npm install -D @testing-library/react @testing-library/user-event @testing-library/jest-dom jsdom
```
Also add types if needed: `@types/jsdom` is not required when using vitest's built-in jsdom.

**Done when**:
- [ ] All 4 packages appear in `package.json` devDependencies
- [ ] `npm run test` still passes all existing tests (no TS errors, no resolution errors)
- [ ] `import { render, screen } from '@testing-library/react'` resolves without error in a test file

**Verify**:
```
cd packages/web && npm run test
```
Expected: green, same as T1.

**Commit**: `chore(web): install @testing-library/react and jsdom for component tests`

---

### T3: Extend format.test.ts — missing functions [P]

**What**: Add test cases for the 8 untested functions in `format.ts`: `formatDateShort`, `formatDateLong`, `getWeekDates`, `getWeekLabel`, `getAdminWeekDates`, `getMonthCalendarDays`, `getMonthLabel`, `getYearLabel`.
**Where**: `packages/web/src/lib/__tests__/format.test.ts` (extend existing file)
**Depends on**: T1
**Requirement**: FUT-01

**Test cases to add**:

`formatDateShort`:
- `'2026-06-15'` → `'Seg, 15 Jun'`
- `'2026-01-01'` → `'Qui, 1 Jan'`

`formatDateLong`:
- `'2026-06-15'` → `'Segunda-feira, 15/06'`
- `'2026-12-25'` → `'Sexta-feira, 25/12'`

`getWeekDates(offset)`:
- `getWeekDates(0)` returns array of length 7
- Each element is a Date
- `getWeekDates(1)` first element is 7 days after `getWeekDates(0)` first element

`getWeekLabel(dates)`:
- Given 7 dates starting Apr 6, returns `'6 Abr — 12 Abr'`

`getAdminWeekDates(0)`:
- Returns array of length 7
- Index 0 is Monday (`.getDay() === 1`)

`getMonthCalendarDays(0)`:
- Returns array whose `length % 7 === 0`
- First non-null day is a `Date` object for the 1st of the current month
- Null entries at the start count = `(firstDay.getDay() + 6) % 7`

`getMonthLabel(0)`:
- Returns `'Abril 2026'` (when run in April 2026)
- `getMonthLabel(1)` returns `'Maio 2026'`

`getYearLabel(0)`:
- Returns `2026` (current year, as a number)
- `getYearLabel(-1)` returns `2025`

**Done when**:
- [ ] All 8 functions have at least one describe block
- [ ] `npm run test` passes all cases in format.test.ts

**Verify**:
```
cd packages/web && npm run test -- --reporter=verbose
```
Expected: all format test cases listed and passing.

**Commit**: `test(web): add missing format.ts function tests`

---

### T4: Create auth.store.test.ts [P]

**What**: New test file for `auth.store.ts` covering initial state, `setAccessToken`, `initialize` (success/failure/throw), and `logout`.
**Where**: `packages/web/src/stores/__tests__/auth.store.test.ts` (create)
**Depends on**: T1
**Requirement**: FUT-02

**Mocking strategy**: Use `vi.stubGlobal('fetch', vi.fn())` in `beforeEach` and restore in `afterEach`. Reset store state between tests by calling the store's setters directly or by re-importing with `vi.resetModules()` — prefer resetting via actions since Zustand persists across tests.

**Test cases**:

`initial state`:
- `accessToken` is `null`
- `isInitialized` is `false`

`setAccessToken`:
- After `setAccessToken('tok')`, `accessToken === 'tok'`

`initialize — 200 response`:
- Stub fetch to return `{ ok: true, json: async () => ({ accessToken: 'abc' }) }`
- After `await initialize()`: `accessToken === 'abc'`, `isInitialized === true`

`initialize — non-200 response`:
- Stub fetch to return `{ ok: false }`
- After `await initialize()`: `accessToken === null`, `isInitialized === true`

`initialize — fetch throws`:
- Stub fetch to throw `new Error('network')`
- After `await initialize()`: `accessToken === null`, `isInitialized === true`

`logout`:
- Stub fetch (any response)
- Set `accessToken` to `'tok'` first
- After `await logout()`: `accessToken === null`, `isInitialized === true`

**Done when**:
- [ ] File created with all 6 test cases
- [ ] `npm run test` passes all auth.store tests

**Verify**:
```
cd packages/web && npm run test -- --reporter=verbose
```

**Commit**: `test(web): add auth store tests`

---

### T5: Create StepIndicator.test.tsx [P]

**What**: Component test for `StepIndicator` verifying label rendering and active/completed state.
**Where**: `packages/web/src/components/__tests__/StepIndicator.test.tsx` (create)
**Depends on**: T2
**Requirement**: FUT-04

**Test cases**:

`current={1}`:
- All 5 labels rendered: `Serviço`, `Barbeiro`, `Horário`, `Seus dados`, `Confirmar`
- No `✓` present in the DOM

`current={3}`:
- Steps 1 and 2 show `✓`
- Step 3 text is visible and active (assert step number `3` is present, not `✓`)
- Steps 4 and 5 show their numbers (`4`, `5`), not `✓`

`current={5}`:
- Steps 1–4 show `✓`
- Step 5 shows `5` (not `✓`, since it's active not completed)

**Note on CSS assertions**: Do NOT assert Tailwind class names — they are implementation details. Assert DOM content (`✓` vs number) only.

**Done when**:
- [ ] File created with 3 describe/it groups
- [ ] `npm run test` passes all StepIndicator cases

**Verify**:
```
cd packages/web && npm run test -- --reporter=verbose
```

**Commit**: `test(web): add StepIndicator component tests`

---

### T6: Create ProtectedRoute.test.tsx [P]

**What**: Component test for `ProtectedRoute` verifying redirect when unauthenticated and children render when authenticated.
**Where**: `packages/web/src/components/__tests__/ProtectedRoute.test.tsx` (create)
**Depends on**: T2
**Requirement**: FUT-07

**Mocking strategy**:
- Wrap in `MemoryRouter` from `react-router-dom` (needed for `Navigate`)
- To set auth store state before render: call `useAuthStore.setState({ accessToken: null })` or `useAuthStore.setState({ accessToken: 'tok' })`
- Reset store in `beforeEach` with `useAuthStore.setState({ accessToken: null, isInitialized: false })`

**Test cases**:

`unauthenticated (accessToken null)`:
- Render `<ProtectedRoute><p>secret</p></ProtectedRoute>` in MemoryRouter
- `screen.queryByText('secret')` SHALL be null (redirect happened)

`authenticated (accessToken set)`:
- Set auth store `accessToken` to `'tok'`
- Render same component
- `screen.getByText('secret')` SHALL be in the document

**Done when**:
- [ ] File created with 2 test cases
- [ ] `npm run test` passes all ProtectedRoute cases

**Verify**:
```
cd packages/web && npm run test -- --reporter=verbose
```

**Commit**: `test(web): add ProtectedRoute guard tests`

---

### T7: Create BookingWizard.test.tsx [P]

**What**: Component test for `BookingWizard` verifying which step component renders at each store step and back button visibility.
**Where**: `packages/web/src/components/__tests__/BookingWizard.test.tsx` (create)
**Depends on**: T2
**Requirement**: FUT-05

**Mocking strategy**:
- Each step sub-component (ServiceStep, BarberStep, etc.) makes API calls — mock them:
  ```ts
  vi.mock('../booking/ServiceStep', () => ({ ServiceStep: () => <div>mock-service-step</div> }))
  // repeat for BarberStep, TimeStep, CustomerStep, ConfirmStep, SuccessScreen
  ```
- Wrap in `QueryClientProvider` + `MemoryRouter`
- Reset booking store in `beforeEach`: `useBookingStore.getState().reset()`

**Test cases**:

`step 1`:
- `screen.getByText('mock-service-step')` is in document
- `screen.queryByText('Voltar')` is null (no back button)

`step 2`:
- Set store to step 2: `useBookingStore.getState().goToStep(2)`
- `screen.getByText('mock-barber-step')` in document
- `screen.getByText('Voltar')` is in document

`step 5`:
- Set store to step 5
- `screen.getByText('mock-confirm-step')` in document

`success screen`:
- Render BookingWizard, programmatically trigger success state by calling `handleSuccess` — achieved by having `ConfirmStep` mock call `onSuccess` via props. Simplest: render at step 5, have mock ConfirmStep call `onSuccess('http://cancel')` on mount.
- After: `screen.getByText('mock-success-screen')` in document

**Done when**:
- [ ] File created with 4 test cases
- [ ] `npm run test` passes all BookingWizard cases

**Verify**:
```
cd packages/web && npm run test -- --reporter=verbose
```

**Commit**: `test(web): add BookingWizard step routing tests`

---

### T8: Create CustomerStep.test.tsx [P]

**What**: Component test for `CustomerStep` verifying form validation gating, phone masking, and store update on submit.
**Where**: `packages/web/src/components/__tests__/CustomerStep.test.tsx` (create)
**Depends on**: T2
**Requirement**: FUT-06

**Mocking strategy**:
- Wrap in `MemoryRouter` (Link to `/privacidade` inside component)
- Mock `StickyBar` to expose `visible` prop as a data attribute: `vi.mock('../ui/StickyBar', () => ({ StickyBar: ({ visible, onNext }: any) => <button data-visible={visible} onClick={onNext}>Continuar</button> }))`
- Reset booking store in `beforeEach`

**Test cases**:

`continue button hidden when form incomplete`:
- Render with empty store
- `screen.getByRole('button', { name: 'Continuar' })` has `data-visible="false"`

`continue button visible when name ≥ 2 chars and phone ≥ 10 digits`:
- Type `'João'` into name input
- Type `'11999998888'` into phone input
- Button has `data-visible="true"`

`phone input applies formatPhone mask`:
- Type `'11999998888'` into phone input
- Input value SHALL be `'(11) 99999-8888'`

`continue click calls setCustomer and nextStep`:
- Spy on `useBookingStore.getState().setCustomer` and `nextStep`
- Type valid name + phone, click Continuar
- `setCustomer` called with `('João', '11999998888')`
- `nextStep` called once

**Done when**:
- [ ] File created with 4 test cases
- [ ] `npm run test` passes all CustomerStep cases

**Verify**:
```
cd packages/web && npm run test -- --reporter=verbose
```

**Commit**: `test(web): add CustomerStep form validation tests`

---

### T9: Create ConfirmStep.test.tsx

**What**: Component test for `ConfirmStep` verifying summary row display, error state, and `onSuccess` callback on mutation success.
**Where**: `packages/web/src/components/__tests__/ConfirmStep.test.tsx` (create)
**Depends on**: T2, T7 (use same mock/wrapper patterns established there)
**Requirement**: FUT-08

**Mocking strategy**:
- Mock `useCreateBooking`:
  ```ts
  const mockMutateAsync = vi.fn()
  vi.mock('../../api/use-create-booking', () => ({
    useCreateBooking: () => ({ mutateAsync: mockMutateAsync, isPending: false, isError: false, error: null })
  }))
  ```
- Pre-populate booking store with all fields before render
- Wrap in `QueryClientProvider` + `MemoryRouter`
- Mock `StickyBar` same as T8 pattern

**Test cases**:

`displays all summary rows`:
- Pre-populate store: service `{ name: 'Corte', priceCents: 3500 }`, barber `{ firstName: 'João', lastName: 'Silva' }`, date `'2026-06-15'`, slot `'10:00'`, customerName `'Maria'`, customerPhone `'11999998888'`
- Assert text content present: `'Corte'`, `'João Silva'`, `'10:00'`, `'Maria'`, `'+55 11999998888'`, `'R$ 35,00'`

`shows error message on mutation failure`:
- Mock `useCreateBooking` to return `{ isError: true, error: new Error('Horário indisponível'), isPending: false, mutateAsync: vi.fn() }`
- `screen.getByText('Horário indisponível')` SHALL be in document

`calls onSuccess with cancelUrl on mutation success`:
- `mockMutateAsync.mockResolvedValue({ cancelUrl: 'http://cancel/abc' })`
- Click confirm button
- `onSuccess` spy SHALL be called with `'http://cancel/abc'`

**Done when**:
- [ ] File created with 3 test cases
- [ ] `npm run test` passes all ConfirmStep cases

**Verify**:
```
cd packages/web && npm run test -- --reporter=verbose
```

**Commit**: `test(web): add ConfirmStep display and mutation tests`

---

## Parallel Execution Map

```
Phase 1 (Sequential — infra):
  T1 ──→ T2

Phase 2 (Parallel — pure logic, after T1):
  T1 done:
    ├── T3 [P]  format.ts missing functions
    └── T4 [P]  auth.store

Phase 3 (Parallel — components, after T2):
  T2 done:
    ├── T5 [P]  StepIndicator
    ├── T6 [P]  ProtectedRoute
    ├── T7 [P]  BookingWizard
    └── T8 [P]  CustomerStep

Phase 4 (after T2 + T7 as reference):
  T9  ConfirmStep
```

---

## Task Granularity Check

| Task | Scope | Status |
|---|---|---|
| T1: vitest.config.ts + setup file | 2 files, 1 config change | ✅ Granular |
| T2: npm install 4 packages | 1 operation | ✅ Granular |
| T3: format.test.ts extensions | 1 file, 8 new describe blocks | ✅ Granular |
| T4: auth.store.test.ts | 1 new file, 6 test cases | ✅ Granular |
| T5: StepIndicator.test.tsx | 1 component, 3 cases | ✅ Granular |
| T6: ProtectedRoute.test.tsx | 1 component, 2 cases | ✅ Granular |
| T7: BookingWizard.test.tsx | 1 component, 4 cases | ✅ Granular |
| T8: CustomerStep.test.tsx | 1 component, 4 cases | ✅ Granular |
| T9: ConfirmStep.test.tsx | 1 component, 3 cases | ✅ Granular |

## Requirement Coverage

| Requirement ID | Covered by |
|---|---|
| FUT-01 | T3 |
| FUT-02 | T4 |
| FUT-03 | T1, T2 |
| FUT-04 | T5 |
| FUT-05 | T7 |
| FUT-06 | T8 |
| FUT-07 | T6 |
| FUT-08 | T9 |
