# Web Bruno Operations Hub — Tasks

**Spec**: `.specs/features/web-bruno-operations-hub/spec.md`
**Status**: Draft

**Upstream dependencies**:
- `web-bruno-patient-care-model` must land `birthDate` and active patient profile fields before OPS-21 through OPS-24 can be completed.
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

### T2: Verify and preserve the operations session filter contract

**What**: Verify the already-existing overdue-only, cancel-exclusion, and receivable-scope contract across the psychology sessions route and the typed frontend hooks, then patch only the gaps that prevent the Bruno workbenches from relying on that contract cleanly.
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

- [ ] The route-side `dueOnly`, `excludeCancelled`, and `receivableScope` behavior is confirmed as the single source of truth for overdue session receivables
- [ ] The typed frontend helper for due pendencies keeps using that contract instead of re-deriving overdue rows from the year-scoped financial summary
- [ ] Session-list filtering supports the date/patient inputs that the existing `Agendamentos` page needs
- [ ] Any API or hook adjustments stay minimal and avoid expanding the financial rules beyond the existing overdue cutoff
- [ ] The filter boundary remains compatible with later exclusion or special handling of protocol-level receivables from `web-bruno-neuromodulation-protocols`
- [ ] `cd packages/api && npx tsc --noEmit` exits 0
- [ ] `cd packages/web-bruno && npm run build` exits 0

**Commit**: `refactor(web-bruno): harden operations session filters`

---

### T3: Harden the existing `Agendamentos` route and filterable operations page shell

**What**: Finish and verify Bruno's existing appointment management page and navigation entry so appointments can be found outside the weekly grid using stable date and patient filters with explicit empty states.
**Where**:
- `packages/web-bruno/src/config/routes.ts`
- `packages/web-bruno/src/App.tsx`
- `packages/web-bruno/src/components/ui/Sidebar.tsx`
- `packages/web-bruno/src/pages/AppointmentsPage.tsx`
- optional page-local list/filter helpers under `packages/web-bruno/src/components/appointments/`
**Depends on**: T2
**Reuses**: Existing `AppointmentsPage`, `AppointmentsWorkbench`, `usePatients()`, typed hooks from T2, `Panel`, and `EmptyState`
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

**Commit**: `fix(web-bruno): harden appointments operations page`

---

### T4: Verify and finish the shared correction flows from the operations page

**What**: Ensure the existing `Agendamentos` rows keep using the same session detail, edit, delete, mark-paid, and recurring-stop flows as the weekly agenda so the page remains a true work surface rather than a forked implementation.
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

**Commit**: `fix(web-bruno): finish shared appointment correction flows`

---

### T5: Harden pending payments into an overdue receivables workbench

**What**: Tighten the pending-payments surface so the Bruno `Financeiro` receivables bench is explicitly overdue-focused, exposes a patient dropdown plus clear totals, and keeps the visible selection state consistent as Bruno narrows the list.
**Where**:
- `packages/web-bruno/src/components/financial/PendingPayments.tsx`
- `packages/web-bruno/src/pages/FinancialPage.tsx`
- `packages/web-bruno/src/api/appointments.ts`
**Depends on**: T2
**Reuses**: `Panel`, `EmptyState`, `PaymentMethodDialog`, and the existing payment mutation flow in `FinancialPage`
**Requirement**: OPS-06, OPS-07, OPS-08, OPS-09, OPS-10, OPS-11, OPS-12, OPS-13

**Tools**:

- MCP: `filesystem`
- Skill: `coding-guidelines`, `react-best-practices`

**Done when**:

- [ ] The pendency surface loads only pending rows whose session date is today or earlier
- [ ] Cancelled sessions are not shown
- [ ] The workbench uses a patient dropdown in the pendency filters instead of a free-text search field
- [ ] Row checkboxes and a live selection count are visible
- [ ] The workbench shows the visible overdue total for the active filtered set
- [ ] `Selecionar todas as visíveis` selects only the currently filtered rows
- [ ] Changing the filter recomputes the visible selected subset instead of silently leaving hidden rows selected
- [ ] Empty states explain when there are no due pendencies left
- [ ] The implementation leaves a clear adapter point for protocol-sale receivables from `web-bruno-neuromodulation-protocols`
- [ ] `cd packages/web-bruno && npm run build` exits 0

**Commit**: `fix(web-bruno): harden overdue receivables workbench`

---

### T6: Add bulk pay/reminder actions and per-row result reporting

**What**: Let Bruno use the current selection to mark compatible receivables as paid in bulk and send reminders in bulk, while preserving per-row feedback and explicit limitations for rows that follow different receivable flows.
**Where**:
- `packages/web-bruno/src/api/appointments.ts`
- `packages/web-bruno/src/components/financial/PendingPayments.tsx`
- `packages/web-bruno/src/pages/FinancialPage.tsx`
- optional result-summary UI near the same surface
**Depends on**: T5
**Reuses**: Existing `POST /api/psychology/sessions/:id/send-payment-reminder` route and the current provider PIX/template message flow
**Requirement**: OPS-14, OPS-15, OPS-16, OPS-17, OPS-18, OPS-19, OPS-20

**Tools**:

- MCP: `filesystem`
- Skill: `coding-guidelines`, `react-best-practices`

**Done when**:

- [ ] Selecting one or more compatible rows reveals bulk `Marcar pago` and `Enviar lembrete` actions
- [ ] The bulk mark-paid action collects the payment data once and applies it only to the selected compatible rows
- [ ] The bulk reminder action sends reminders only for the selected ids
- [ ] Mixed success/failure results are summarized without collapsing to a single generic error
- [ ] No-phone or other backend failures remain attached to the affected rows in human-readable form
- [ ] The workbench summary shows both batch outcomes and the currently visible overdue total
- [ ] Rows that cannot participate in a bulk appointment action stay explicitly identifiable instead of being silently included
- [ ] When all reminders fail, the selected rows remain visible and retryable
- [ ] After completion, Bruno can see how many reminders succeeded and which rows still need manual attention
- [ ] `cd packages/web-bruno && npm run build` exits 0

**Commit**: `feat(web-bruno): add bulk receivables actions`

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
**Requirement**: OPS-21, OPS-22, OPS-23, OPS-24

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

**What**: Run build-level checks and record the manual scenarios that prove the new navigation, Saturday visibility, overdue receivables workbench, bulk pay/reminder actions, and birthday reminder behave together.
**Where**: Verification only
**Depends on**: T1, T2, T4, T6, T7
**Reuses**: Existing Bruno login, agenda, financial, and patient fixtures
**Requirement**: OPS-01, OPS-02, OPS-03, OPS-04, OPS-05, OPS-06, OPS-07, OPS-08, OPS-09, OPS-10, OPS-11, OPS-12, OPS-13, OPS-14, OPS-15, OPS-16, OPS-17, OPS-18, OPS-19, OPS-20, OPS-21, OPS-22, OPS-23, OPS-24

**Tools**:

- MCP: `filesystem`
- Skill: NONE

**Done when**:

- [ ] `cd packages/api && npx tsc --noEmit`
- [ ] `cd packages/web-bruno && npm run build`
- [ ] Manual check: Saturday shift appears in settings and Saturday sessions appear in both the weekly agenda and `Agendamentos`
- [ ] Manual check: filter `Agendamentos` by patient and date range, then open a row and edit/correct it successfully
- [ ] Manual check: create one overdue pending session and one future pending session; only the overdue row appears in the pendency workbench
- [ ] Manual check: the pendency patient control is a dropdown, and changing it updates the visible count plus visible overdue total
- [ ] Manual check: select visible compatible pendencies, bulk-mark them paid, and confirm only the selected rows change status
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
| T6: Bulk pay/reminder execution + reporting | 1 mutation flow + result UI | OK |
| T7: Birthday reminder | 1 dashboard reminder slice | OK |
| T8: Verification plan | Verification only | OK |

---

## Recommended Tools For Execution

- Skills: `coding-guidelines`, `react-best-practices`, `frontend-design`, `security-best-practices`
- Local commands: `cd packages/api && npx tsc --noEmit`, `cd packages/web-bruno && npm run build`
- Manual validation targets: Saturday session visibility, appointment correction from list, overdue receivables filters/totals, bulk pay/reminder mixed outcomes, and dashboard birthdays
