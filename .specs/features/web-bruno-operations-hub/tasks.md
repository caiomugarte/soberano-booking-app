# Web Bruno Operations Hub — Tasks

**Spec**: `.specs/features/web-bruno-operations-hub/spec.md`
**Status**: Draft

**Upstream dependencies**:
- `web-bruno-patient-care-model` must land `birthDate` and active patient profile fields before OPS-17 through OPS-20 can be completed.
- `web-bruno-neuromodulation-protocols` must define protocol-level receivable behavior before due pendencies can fully hide protocol-linked appointment duplicates.
- `web-bruno-agenda-event-management` and `web-bruno-recurring-session-series` are reused from the operations surface instead of being reimplemented here.

---

## Execution Plan

```text
Phase 1 — Shared foundation (parallel OK):
  T1 [P]
  T2 [P]

Phase 2 — Appointments operations surface (sequential after T2):
  T2 → T3 → T4

Phase 3 — Pendency workbench (sequential after T2):
  T2 → T5 → T6

Phase 4 — Dashboard reminder (parallel after patient-care-model dependency):
  web-bruno-patient-care-model complete → T7 [P]

Phase 5 — Verification (sequential):
  T1 + T4 + T6 + T7 → T8
```

---

## Task Breakdown

### T1: Add Saturday to Bruno scheduling constants and screens

**What**: Update the shared weekday constants and their consumers so Saturday appears consistently in the weekly agenda, shift/settings UI, and any other screen that depends on the same day list.
**Where**:
- `packages/web-bruno/src/config/constants.ts`
- `packages/web-bruno/src/components/agenda/WeeklyGrid.tsx`
- `packages/web-bruno/src/pages/SettingsPage.tsx`
- optional weekday-label consumers found during implementation
**Depends on**: None
**Reuses**: Existing `DAYS_OF_WEEK`, `useShifts()`, and `useAbsences()` flow
**Requirement**: OPS-03

**Tools**:

- MCP: `filesystem`
- Skill: `coding-guidelines`, `react-best-practices`

**Done when**:

- [ ] `DAYS_OF_WEEK` includes Saturday (`key = 6`)
- [ ] `WeeklyGrid` mobile and desktop layouts render Saturday as a first-class day
- [ ] The settings shift editor can create, list, and save Saturday shifts
- [ ] Existing Monday-Friday slot and absence behavior stays unchanged
- [ ] `cd packages/web-bruno && npm run build` exits 0

**Commit**: `feat(web-bruno): surface saturday in psychology scheduling`

---

### T2: Extend psychology session query hooks for operations filtering

**What**: Add typed query helpers for the operations hub and small route-side filtering support so appointments and due pendencies can be requested by date/patient, cut off at today, and exclude cancelled rows without piggybacking on the year-scoped financial summary.
**Where**:
- `packages/api/src/http/routes/psychology.routes.ts`
- `packages/web-bruno/src/api/appointments.ts`
- optional light typing updates in `packages/web-bruno/src/schemas/appointment.schema.ts`
**Depends on**: None
**Reuses**: Existing `/api/psychology/sessions` list route, `useDateRangeAppointments()`, and provider-scoped query pattern in `psychology.routes.ts`
**Requirement**: OPS-02, OPS-06, OPS-07, OPS-11

**Tools**:

- MCP: `filesystem`
- Skill: `coding-guidelines`, `security-best-practices`

**Done when**:

- [ ] Session-list filtering supports the date/patient inputs the new appointments page needs
- [ ] A due-pendency helper can request rows whose session date is today or earlier and omit cancelled items
- [ ] `PendingPayments` no longer has to derive due rows from the year-scoped financial summary response
- [ ] Filter helpers stay typed in `api/appointments.ts` instead of building ad-hoc query strings in pages/components
- [ ] The filter boundary is compatible with later exclusion of protocol-level receivables from `web-bruno-neuromodulation-protocols`
- [ ] `cd packages/api && npx tsc --noEmit` exits 0
- [ ] `cd packages/web-bruno && npm run build` exits 0

**Commit**: `refactor(web-bruno): add operations-ready session filters`

---

### T3: Add the `Agendamentos` route and filterable operations page shell

**What**: Create Bruno's dedicated appointment management page and expose it in navigation so appointments can be found outside the weekly grid using date and patient filters.
**Where**:
- `packages/web-bruno/src/config/routes.ts`
- `packages/web-bruno/src/App.tsx`
- `packages/web-bruno/src/components/ui/Sidebar.tsx`
- `packages/web-bruno/src/pages/AppointmentsPage.tsx`
- optional page-local list/filter helpers under `packages/web-bruno/src/components/appointments/`
**Depends on**: T2
**Reuses**: Dashboard page modal-notice pattern, `usePatients()`, typed hooks from T2, `Panel`, and `EmptyState`
**Requirement**: OPS-01, OPS-02, OPS-05

**Tools**:

- MCP: `filesystem`
- Skill: `coding-guidelines`, `react-best-practices`, `frontend-design`

**Done when**:

- [ ] Main navigation shows `Agendamentos` in addition to `Agenda`
- [ ] Router serves a protected `/agendamentos` page
- [ ] The page supports date-range and patient filters
- [ ] Matching appointments render in an explicit list or table with patient, date/time, status, and payment-state context
- [ ] No-match states show a deliberate empty state instead of blank content
- [ ] `cd packages/web-bruno && npm run build` exits 0

**Commit**: `feat(web-bruno): add appointments operations page`

---

### T4: Reuse existing correction flows from the operations page

**What**: Wire list rows into the existing session detail, edit, delete, mark-paid, and recurring-stop flows so the new page becomes a true work surface rather than a read-only list.
**Where**:
- `packages/web-bruno/src/pages/AppointmentsPage.tsx`
- `packages/web-bruno/src/components/agenda/SlotDetail.tsx`
- `packages/web-bruno/src/components/appointments/AppointmentForm.tsx`
- optional row/action helpers under `packages/web-bruno/src/components/appointments/`
**Depends on**: T3
**Reuses**: `SlotDetail`, `AppointmentForm`, `useUpdateAppointment()`, `useDeleteAppointment()`, and `useStopRecurringSeries()`
**Requirement**: OPS-03, OPS-04

**Tools**:

- MCP: `filesystem`
- Skill: `coding-guidelines`, `react-best-practices`

**Done when**:

- [ ] Opening an appointment row surfaces the same detail and correction actions already used from the weekly agenda
- [ ] Edit, delete, payment-correction, and recurring-stop actions refresh the operations list cleanly
- [ ] Saturday appointments are reachable from the operations page as normal rows
- [ ] The page does not fork a second correction implementation away from the agenda flow
- [ ] `cd packages/web-bruno && npm run build` exits 0

**Commit**: `feat(web-bruno): reuse agenda correction flows in appointments hub`

---

### T5: Turn pending payments into a due-only selectable workbench

**What**: Refactor the pending-payments surface so it loads only due items, exposes patient-based filtering and row selection, and keeps the visible selection state consistent as Bruno narrows the list.
**Where**:
- `packages/web-bruno/src/components/financial/PendingPayments.tsx`
- `packages/web-bruno/src/pages/FinancialPage.tsx`
- `packages/web-bruno/src/api/appointments.ts`
**Depends on**: T2
**Reuses**: `Panel`, `EmptyState`, `PaymentMethodDialog`, and the existing payment mutation flow in `FinancialPage`
**Requirement**: OPS-06, OPS-07, OPS-08, OPS-09, OPS-10, OPS-11

**Tools**:

- MCP: `filesystem`
- Skill: `coding-guidelines`, `react-best-practices`

**Done when**:

- [ ] The pendency surface loads only pending rows whose session date is today or earlier
- [ ] Cancelled sessions are not shown
- [ ] The surface includes patient-name filtering so Bruno can narrow visible rows before selecting them
- [ ] Row checkboxes and a live selection count are visible
- [ ] `Selecionar todas as visíveis` selects only the currently filtered rows
- [ ] Changing the filter recomputes the visible selected subset instead of silently leaving hidden rows selected
- [ ] Empty states explain when there are no due pendencies left
- [ ] The implementation leaves a clear adapter point for protocol-sale receivables from `web-bruno-neuromodulation-protocols`
- [ ] `cd packages/web-bruno && npm run build` exits 0

**Commit**: `feat(web-bruno): make pending payments a due-only workbench`

---

### T6: Add bulk reminder sending and per-row result reporting

**What**: Let Bruno send reminders for the currently selected due pendencies and receive a mixed-outcome summary without losing the rows that still need attention.
**Where**:
- `packages/web-bruno/src/api/appointments.ts`
- `packages/web-bruno/src/components/financial/PendingPayments.tsx`
- optional result-summary UI near the same surface
**Depends on**: T5
**Reuses**: Existing `POST /api/psychology/sessions/:id/send-payment-reminder` route and the current provider PIX/template message flow
**Requirement**: OPS-12, OPS-13, OPS-14, OPS-15, OPS-16

**Tools**:

- MCP: `filesystem`
- Skill: `coding-guidelines`, `react-best-practices`

**Done when**:

- [ ] Selecting one or more rows reveals an `Enviar lembrete` bulk action
- [ ] The bulk action sends reminders only for the selected ids
- [ ] Mixed success/failure results are summarized without collapsing to a single generic error
- [ ] No-phone or other backend failures remain attached to the affected rows in human-readable form
- [ ] When all reminders fail, the selected rows remain visible and retryable
- [ ] After completion, Bruno can see how many reminders succeeded and which rows still need manual attention
- [ ] `cd packages/web-bruno && npm run build` exits 0

**Commit**: `feat(web-bruno): add bulk payment reminder workbench`

---

### T7: Add today's birthday reminder to the dashboard

**What**: Surface a lightweight birthday reminder on the dashboard using the patient birth-date fields from the patient-care-model feature, with dismiss-on-visit behavior and support for multiple names.
**Where**:
- `packages/web-bruno/src/pages/DashboardPage.tsx`
- `packages/web-bruno/src/api/patients.ts`
- `packages/web-bruno/src/components/patients/BirthdayReminder.tsx`
- `packages/web-bruno/src/schemas/patient.schema.ts`
**Depends on**: `web-bruno-patient-care-model` delivery of `birthDate` and active-patient profile data
**Reuses**: Dashboard notice pattern, patient hooks, and shared `Panel`/`Button` primitives
**Requirement**: OPS-17, OPS-18, OPS-19, OPS-20

**Tools**:

- MCP: `filesystem`
- Skill: `coding-guidelines`, `react-best-practices`

**Done when**:

- [ ] Dashboard loads today's birthday patients without blocking the weekly agenda
- [ ] Multiple birthdays render in one reminder surface
- [ ] Dismissing the reminder hides it for the current page visit
- [ ] No reminder is rendered when today has no matching patients
- [ ] `cd packages/web-bruno && npm run build` exits 0

**Commit**: `feat(web-bruno): add dashboard birthday reminder`

---

### T8: Verify the operations hub across agenda, financial, and dashboard surfaces

**What**: Run build-level checks and record the manual scenarios that prove the new navigation, Saturday visibility, due-pendency workbench, bulk reminders, and birthday reminder behave together.
**Where**: Verification only
**Depends on**: T1, T2, T4, T6, T7
**Reuses**: Existing Bruno login, agenda, financial, and patient fixtures
**Requirement**: OPS-01, OPS-02, OPS-03, OPS-04, OPS-05, OPS-06, OPS-07, OPS-08, OPS-09, OPS-10, OPS-11, OPS-12, OPS-13, OPS-14, OPS-15, OPS-16, OPS-17, OPS-18, OPS-19, OPS-20

**Tools**:

- MCP: `filesystem`
- Skill: NONE

**Done when**:

- [ ] `cd packages/api && npx tsc --noEmit`
- [ ] `cd packages/web-bruno && npm run build`
- [ ] Manual check: Saturday shift appears in settings and Saturday sessions appear in both the weekly agenda and `Agendamentos`
- [ ] Manual check: filter `Agendamentos` by patient and date range, then open a row and edit/correct it successfully
- [ ] Manual check: create one overdue pending session and one future pending session; only the overdue row appears in the pendency workbench
- [ ] Manual check: select visible pendencies, bulk-send reminders, and confirm per-row mixed result reporting
- [ ] Manual check: a row with no phone shows a row-specific failure and stays retryable
- [ ] Manual check: two patients with today's birthday appear together on the dashboard and stay dismissed until reload

**Commit**: `test(web-bruno): verify operations hub flows`

---

## Parallel Execution Map

```text
Foundation:
  T1 [P]
  T2 [P]

Appointments surface:
  T2 ──→ T3 ──→ T4

Pendency workbench:
  T2 ──→ T5 ──→ T6

Birthday reminder:
  web-bruno-patient-care-model ──→ T7 [P]

Final verification:
  T1 + T4 + T6 + T7 ──→ T8
```

---

## Task Granularity Check

| Task | Scope | Status |
|---|---|---|
| T1: Saturday scheduling support | Shared weekday constant + 2 UI consumers | OK |
| T2: Operations query/filter foundation | 1 route surface + matching hook layer | OK |
| T3: `Agendamentos` route and page shell | Router/nav + 1 page slice | OK |
| T4: Reuse correction flows from list rows | Shared modal/detail integration slice | OK |
| T5: Due-only pendency workbench | 1 financial surface with selection state | OK |
| T6: Bulk reminder execution + reporting | 1 mutation flow + result UI | OK |
| T7: Birthday reminder | 1 dashboard reminder slice | OK |
| T8: Verification plan | Verification only | OK |

---

## Recommended Tools For Execution

- Skills: `coding-guidelines`, `react-best-practices`, `frontend-design`, `security-best-practices`
- Local commands: `cd packages/api && npx tsc --noEmit`, `cd packages/web-bruno && npm run build`
- Manual validation targets: Saturday session visibility, appointment correction from list, due-only pendency selection, bulk reminder mixed outcomes, and dashboard birthdays
