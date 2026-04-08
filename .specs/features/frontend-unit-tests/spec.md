# Frontend Unit Tests — Regression Protection Spec

## Problem Statement

The frontend has two existing test files (`booking.store.test.ts`, `format.test.ts`) but no DOM testing infrastructure and no coverage for components, auth store, or 8 of 12 format functions. Any refactor of the booking wizard, customer step, confirm step, route protection, or date formatting can break the working application silently. This spec locks in the current working behavior as a regression suite.

## Goals

- [ ] 100% coverage of pure logic (stores + all format utilities) — no infra changes needed
- [ ] DOM testing infrastructure in place (jsdom + @testing-library/react)
- [ ] Critical booking flow components tested against current render behavior
- [ ] ProtectedRoute guard behavior verified
- [ ] CI-runnable: `vitest run` passes green with all new tests

## Out of Scope

| Feature | Reason |
|---|---|
| API hook tests (useBarbers, useSlots, etc.) | React Query internals; fetch integration; low regression risk given stable API contract |
| E2E / Playwright tests | Different tool, different scope |
| Admin page tests (DashboardPage, SchedulePage) | High complexity, low current breakage risk |
| Snapshot tests | Brittle; break on any style change; not regression-protective |
| Coverage % thresholds in CI | Not requested; focus is behavioral contracts, not line counts |

---

## User Stories

### P1: Format utility — missing functions ⭐ MVP

**User Story**: As a developer, I want all `format.ts` functions covered so that any change to date/week/calendar logic breaks visibly.

**Why P1**: Zero infra changes. All pure functions. 8 functions completely untested today.

**Acceptance Criteria**:

1. WHEN `formatDateShort('2026-06-15')` is called THEN it SHALL return `'Seg, 15 Jun'`
2. WHEN `formatDateLong('2026-06-15')` is called THEN it SHALL return `'Segunda-feira, 15/06'`
3. WHEN `getWeekDates(0)` is called THEN it SHALL return 7 consecutive Date objects starting from today
4. WHEN `getWeekDates(1)` is called THEN it SHALL return 7 dates starting 7 days from today
5. WHEN `getWeekLabel([date1, ..., date7])` is called THEN it SHALL return `'D1 Mon — D7 Mon'` format
6. WHEN `getAdminWeekDates(0)` is called THEN it SHALL return 7 dates with index 0 = Monday of current week
7. WHEN `getMonthCalendarDays(0)` is called THEN it SHALL return an array whose length is a multiple of 7 (complete weeks)
8. WHEN `getMonthCalendarDays(0)` is called THEN it SHALL return null for padding days before the first of the month
9. WHEN `getMonthLabel(0)` is called THEN it SHALL return `'Abril 2026'` (current month + year, in Portuguese)
10. WHEN `getYearLabel(0)` is called THEN it SHALL return the current year as a number
11. WHEN `getYearLabel(1)` is called THEN it SHALL return current year + 1

**Independent Test**: `vitest run` on `format.test.ts` passes all new cases.

---

### P1: Auth store ⭐ MVP

**User Story**: As a developer, I want auth store behavior tested so that token management and logout can't silently regress.

**Why P1**: Auth store drives `ProtectedRoute`. A broken `initialize()` or `logout()` would lock out all admin users with no test signal.

**Acceptance Criteria**:

1. WHEN store is created THEN `accessToken` SHALL be `null` and `isInitialized` SHALL be `false`
2. WHEN `setAccessToken('tok')` is called THEN `accessToken` SHALL equal `'tok'`
3. WHEN `initialize()` is called and fetch returns `{ accessToken: 'tok' }` with status 200 THEN `accessToken` SHALL equal `'tok'` and `isInitialized` SHALL be `true`
4. WHEN `initialize()` is called and fetch returns non-200 THEN `accessToken` SHALL remain `null` and `isInitialized` SHALL be `true`
5. WHEN `initialize()` is called and fetch throws THEN `accessToken` SHALL remain `null` and `isInitialized` SHALL be `true`
6. WHEN `logout()` is called THEN `accessToken` SHALL be `null` and `isInitialized` SHALL be `true`

**Independent Test**: `vitest run` on `auth.store.test.ts` passes all cases with `vi.stubGlobal('fetch', ...)`.

---

### P1: DOM testing infrastructure ⭐ MVP

**User Story**: As a developer, I want component tests to run in a simulated browser so that UI behavior can be verified without a real browser.

**Why P1**: Blocker for all component tests. Without this, P2 stories cannot be implemented.

**Acceptance Criteria**:

1. WHEN `vitest.config.ts` is updated THEN `environment` SHALL be `'jsdom'` (or `'happy-dom'`)
2. WHEN `@testing-library/react` and `@testing-library/user-event` are installed THEN `npm run test` SHALL still pass all existing tests
3. WHEN a trivial component (`<div>hello</div>`) is rendered with `render()` THEN `screen.getByText('hello')` SHALL resolve without error
4. WHEN `@testing-library/jest-dom` matchers are configured THEN assertions like `toBeInTheDocument()` SHALL be available in all test files

**Independent Test**: Run existing `booking.store.test.ts` and `format.test.ts` — must still pass after infra changes.

---

### P2: StepIndicator component

**User Story**: As a developer, I want StepIndicator render behavior locked in so that step label/state changes are caught.

**Acceptance Criteria**:

1. WHEN rendered with `current={1}` THEN it SHALL display all 5 labels: `Serviço`, `Barbeiro`, `Horário`, `Seus dados`, `Confirmar`
2. WHEN rendered with `current={3}` THEN steps 1 and 2 SHALL show `✓` (completed), step 3 SHALL be active (text-gold), steps 4–5 SHALL be inactive
3. WHEN rendered with `current={1}` THEN no step SHALL show `✓`

**Independent Test**: Render with different `current` values, assert text content.

---

### P2: BookingWizard step rendering

**User Story**: As a developer, I want BookingWizard step routing locked in so that changes to which component renders at which step are caught.

**Acceptance Criteria**:

1. WHEN store is at step 1 THEN `ServiceStep` content area SHALL be present and back button SHALL NOT be visible
2. WHEN store is at step 2 THEN `BarberStep` content area SHALL be present and back button (← Voltar) SHALL be visible
3. WHEN store is at step 5 THEN `ConfirmStep` content area SHALL be present
4. WHEN `handleSuccess` is called with a cancel URL THEN `SuccessScreen` SHALL replace the wizard content

**Independent Test**: Set store to each step, render BookingWizard, assert expected component output.

---

### P2: CustomerStep form validation

**User Story**: As a developer, I want CustomerStep's continue button gating locked in so that validation rule changes are caught.

**Acceptance Criteria**:

1. WHEN name has fewer than 2 characters AND phone has fewer than 10 digits THEN continue button (StickyBar) SHALL NOT be visible
2. WHEN name has 2+ characters AND phone has 10+ digits THEN continue button SHALL be visible
3. WHEN user types a phone number THEN it SHALL be formatted with `formatPhone` mask as they type (e.g., `11999998888` → `(11) 99999-8888`)
4. WHEN continue is clicked THEN `setCustomer` SHALL be called with trimmed name and stripped phone digits
5. WHEN continue is clicked THEN `nextStep` SHALL be called

**Independent Test**: Render CustomerStep, interact via userEvent, assert store state + DOM.

---

### P2: ProtectedRoute guard

**User Story**: As a developer, I want ProtectedRoute redirect behavior locked in so that auth guard changes are immediately caught.

**Acceptance Criteria**:

1. WHEN `accessToken` is `null` in auth store THEN ProtectedRoute SHALL render a `<Navigate>` to `/admin/login`
2. WHEN `accessToken` is a non-empty string THEN ProtectedRoute SHALL render its `children` unchanged

**Independent Test**: Render ProtectedRoute inside MemoryRouter, assert redirect vs children.

---

### P3: ConfirmStep display

**User Story**: As a developer, I want ConfirmStep's summary rows locked in so that label/format changes in the summary are caught.

**Acceptance Criteria**:

1. WHEN store has all selections THEN ConfirmStep SHALL display service name, barber full name (`firstName lastName`), formatted date, slot time, customer name, formatted phone with `+55` prefix, and formatted price
2. WHEN `createBooking` mutation fails THEN error message SHALL be visible on screen
3. WHEN confirm button is clicked and mutation succeeds THEN `onSuccess` SHALL be called with the returned `cancelUrl`

**Independent Test**: Render ConfirmStep with pre-populated store and mocked `useCreateBooking`, assert row values.

---

## Edge Cases

- WHEN `formatDateShort` / `formatDateLong` receives a date at month boundary THEN it SHALL not overflow to adjacent month
- WHEN `getMonthCalendarDays` is called for a month starting on Monday THEN it SHALL have 0 leading nulls
- WHEN `auth.store.initialize()` is called twice concurrently THEN `isInitialized` SHALL be `true` after both resolve (no race documented; test once, accept current behavior)
- WHEN `BookingWizard` is at step 1 and prevStep is called externally THEN step SHALL remain 1 (store clamps at 1)
- WHEN `CustomerStep` phone input receives non-digit characters THEN they SHALL be stripped by `formatPhone`

---

## Requirement Traceability

| Requirement ID | Story | Phase | Status |
|---|---|---|---|
| FUT-01 | P1: format missing functions | Execute | Pending |
| FUT-02 | P1: auth store | Execute | Pending |
| FUT-03 | P1: DOM infra | Execute | Pending |
| FUT-04 | P2: StepIndicator | Execute | Pending |
| FUT-05 | P2: BookingWizard step routing | Execute | Pending |
| FUT-06 | P2: CustomerStep validation | Execute | Pending |
| FUT-07 | P2: ProtectedRoute guard | Execute | Pending |
| FUT-08 | P3: ConfirmStep display | Execute | Pending |

---

## Success Criteria

- [ ] `vitest run` passes green with 0 failures
- [ ] All 12 `format.ts` functions have at least one test
- [ ] Auth store (initialize, logout, setAccessToken) fully tested
- [ ] BookingWizard, CustomerStep, StepIndicator, ProtectedRoute each have component tests
- [ ] No new production code changes — only test files and test config

## Implementation Notes

### Infrastructure changes required
- `vitest.config.ts`: change `environment: 'node'` → `environment: 'jsdom'`
- Install (devDependencies in `packages/web`):
  - `@testing-library/react`
  - `@testing-library/user-event`
  - `@testing-library/jest-dom`
  - `jsdom` (or `happy-dom`)
- Add `setupFiles` in vitest.config pointing to a setup file that imports `@testing-library/jest-dom`

### Test file locations
```
packages/web/src/
  lib/__tests__/
    format.test.ts          ← extend existing file
  stores/__tests__/
    booking.store.test.ts   ← already complete
    auth.store.test.ts      ← new
  components/__tests__/
    StepIndicator.test.tsx  ← new
    BookingWizard.test.tsx  ← new
    CustomerStep.test.tsx   ← new
    ProtectedRoute.test.tsx ← new
    ConfirmStep.test.tsx    ← new (P3)
```

### Mocking strategy
- Auth store: use `vi.stubGlobal('fetch', vi.fn())` per test
- `useCreateBooking` in ConfirmStep: mock with `vi.mock('../../api/use-create-booking.ts')`
- React Router: wrap components in `MemoryRouter` from `react-router-dom`
- TanStack Query: wrap components in `QueryClientProvider` with a fresh client per test
