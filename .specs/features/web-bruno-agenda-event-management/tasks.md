# web-bruno Agenda Event Management — Tasks

**Spec**: `.specs/features/web-bruno-agenda-event-management/spec.md`
**Status**: Draft

---

## Execution Plan

### Phase 1 — Persistence + backend financial foundation (Sequential)

Payment controls and receipt-date financial semantics must exist in the backend before the frontend can safely consume them.

```
T1 → T2
```

### Phase 2 — Frontend API + form foundation (Parallel OK)

Once the backend contract exists, the hook layer and edit form can move in parallel.

```
     ┌→ T3 [P] ─┐
T2 ──┤          ├→ T5 → T6 → T7
     └→ T4 [P] ─┘
```

### Phase 3 — Agenda integration (Sequential)

After the hook layer and edit-capable form are ready, the agenda detail and grid can be wired together.

---

## Parallel Execution Map

```
Phase 1:
  T1  payment contracts + financial backend — persist payment details and report paid revenue by receipt date
   ↓
  T2  psychology.routes.ts — add DELETE /psychology/sessions/:id

Phase 2:
  T2 done, then in parallel:
    ├── T3 [P]  appointment.schema.ts + appointments.ts + financial.ts — align session typing and payment-date hooks
    └── T4 [P]  AppointmentForm.tsx — support edit mode, paid-method/date capture, zero-cost psychotherapy, and scroll-safe price inputs

Phase 3:
  T3 + T4 done → T5  SlotDetail.tsx — add Editar/Excluir flows, paid-method quick action, and button-hierarchy polish
  T5 done       → T6  WeeklyGrid.tsx + DashboardPage.tsx — wire modal lifecycle and refresh
  T3 + T4 done → T7  PendingPayments.tsx + PatientHistory.tsx + Financial surfaces — require paid-method/date and use paidAt for revenue
```

---

## Task Breakdown

### T1: Add payment controls and receipt-date financial backend semantics

**What**: Ensure paid sessions can persist both `paymentMethod` and an independently chosen `paidAt`, then make the shared financial summary report paid revenue by receipt date instead of session date.
**Where**:
- `packages/api/prisma/schema.prisma`
- `packages/api/prisma/migrations/...`
- `packages/api/src/http/routes/psychology.routes.ts`
- `packages/api/src/domain/repositories/appointment.repository.ts`
- `packages/api/src/infrastructure/database/repositories/prisma-appointment.repository.ts`
- `packages/api/src/http/routes/admin.routes.ts`
**Depends on**: None
**Reuses**: Existing psychology session validation, `mapToSession()` mapping, and `/admin/financial` endpoint
**Requirement**: WBAEM-01, WBAEM-03, WBAEM-04, WBAEM-05

**Done when**:
- [ ] Prisma `Appointment` has nullable `paymentMethod`
- [ ] A migration exists for the new appointment column
- [ ] `POST /psychology/sessions`, `POST /psychology/sessions/batch`, and `PATCH /psychology/sessions/:id` can accept `paymentMethod?`
- [ ] `PATCH /psychology/sessions/:id` accepts `patientId?`, `date?`, `startTime?`, `type?`, `value?`, `notes?`, `status?`, `paymentStatus?`, `paymentMethod?`, `paidAt?`
- [ ] Create and update flows can persist a `paidAt` value that differs from the session `date`
- [ ] `type` updates resolve the matching service and update `serviceId`
- [ ] `date`, `startTime`, or `type` changes recompute `endTime`
- [ ] Slot conflicts for the same provider and another non-cancelled session return 409
- [ ] Changing `paymentStatus` to `pending` clears `paidAt`
- [ ] Changing `paymentStatus` to `pending` also clears `paymentMethod`
- [ ] Changing `paymentStatus` to `paid` auto-fills `paidAt` when missing but preserves a client-provided `paidAt`
- [ ] Changing `paymentStatus` to `paid` requires a valid `paymentMethod`
- [ ] Route still returns the normalized session shape through `mapToSession()`
- [ ] The normalized session shape includes `paymentMethod` and `paidAt`
- [ ] `GET /api/admin/financial` returns paid-session rows with `paymentMethod` and `paidAt`
- [ ] Financial ranges include paid sessions whose `paidAt` is inside the requested range even when the session `date` is outside it
- [ ] Financial paid revenue is attributed by `paidAt`, not by session `date`
- [ ] `cd packages/api && npx tsc --noEmit` exits 0

**Commit**: deferred — commit alongside T2

---

### T2: Add DELETE endpoint for psychology sessions

**What**: Add a hard-delete endpoint for mistaken sessions in the psychology flow.
**Where**: `packages/api/src/http/routes/psychology.routes.ts`
**Depends on**: T1
**Reuses**: Existing tenant/provider-scoped appointment lookup patterns in the same route file
**Requirement**: WBAEM-02

**Done when**:
- [ ] `DELETE /psychology/sessions/:id` exists
- [ ] The route returns 204 when the session exists and belongs to the authenticated provider scope
- [ ] The route returns 404 when the session does not exist
- [ ] Deleting a session removes it from the underlying `appointments` table
- [ ] `cd packages/api && npx tsc --noEmit` exits 0

**Commit**: `feat(psychology-api): support receipt-date payment control and agenda corrections`

---

### T3 [P]: Align web-bruno session schemas and hooks with the payment-date contract

**What**: Update the web-bruno session schema and API layer so both agenda and financial screens understand `paymentMethod` plus user-controlled `paidAt`.
**Where**:
- `packages/web-bruno/src/schemas/appointment.schema.ts`
- `packages/web-bruno/src/api/appointments.ts`
- `packages/web-bruno/src/api/financial.ts`
**Depends on**: T2
**Reuses**: Existing `useUpdateAppointment()` mutation and query invalidation pattern
**Requirement**: WBAEM-01, WBAEM-02, WBAEM-03, WBAEM-04, WBAEM-05

**Done when**:
- [ ] `Appointment` typing includes a `paymentMethod` union for `card`, `pix`, `cash`
- [ ] `Appointment` typing preserves optional `paidAt`
- [ ] `useUpdateAppointment()` accepts all editable session fields used by the spec, including `paymentMethod` and `paidAt`
- [ ] `useDeleteAppointment()` calls `DELETE /api/psychology/sessions/:id`
- [ ] Both mutations invalidate the relevant `['appointments']` queries
- [ ] Financial-summary mapping preserves `paymentMethod` and `paidAt`
- [ ] Hook typing remains consistent with `Appointment` from `appointment.schema.ts`
- [ ] `cd packages/web-bruno && npm run build` exits 0

**Commit**: deferred — commit alongside T5/T6

---

### T4 [P]: Make AppointmentForm reusable in edit mode, capture paid method/date, and polish value entry

**What**: Extend the session form so it can open prefilled for an existing session, submit an update instead of only creating new sessions, require `paymentMethod` plus an editable payment date whenever a session is saved as paid, and fix the value-entry UX for free psychotherapy sessions.
**Where**: `packages/web-bruno/src/components/appointments/AppointmentForm.tsx`
**Depends on**: T2
**Reuses**: Existing create-mode modal layout, patient picker, and service/type defaults
**Requirement**: WBAEM-01, WBAEM-03, WBAEM-04, WBAEM-05, WBAEM-06

**Done when**:
- [ ] The component accepts edit-mode props for the selected session and initial values
- [ ] Existing fields are prefilled from the current session
- [ ] Save in edit mode calls the update mutation instead of create/batch create
- [ ] Edit mode allows status selection across `scheduled`, `confirmed`, `completed`, `cancelled`, `no_show`
- [ ] Edit mode allows payment status selection across `pending` and `paid`
- [ ] The form shows a payment-method selector and payment-date field whenever `paymentStatus = paid`
- [ ] The payment-date field is prefilled from the existing session when present and defaults to today when a pending session is switched to paid
- [ ] The form can update patient, date, time, type, value, notes, status, payment status, payment method, and payment date
- [ ] Price inputs in `AppointmentForm` do not change when Bruno scrolls the mouse wheel or trackpad while the input is focused or hovered
- [ ] Non-package psychotherapy create/edit flows allow `value = 0` and submit it through the existing mutations
- [ ] Negative or invalid manual session values remain blocked by client-side validation
- [ ] Package total validation remains `> 0`
- [ ] Create flows that submit already-paid sessions also require `paymentMethod` and `paidAt`
- [ ] Other create-mode behavior remains unchanged aside from zero-cost psychotherapy allowance and scroll protection
- [ ] `cd packages/web-bruno && npm run build` exits 0

**Commit**: deferred — commit alongside T5/T6

---

### T5: Add edit/delete actions to SlotDetail, capture payment details in quick actions, and repaginate the action buttons

**What**: Replace the one-way agenda actions with a detail view that can open edit mode, confirm deletion, collect `paymentMethod` plus payment date before a quick mark-paid mutation, and give the footer actions clearer visual hierarchy.
**Where**: `packages/web-bruno/src/components/agenda/SlotDetail.tsx`
**Depends on**: T3, T4
**Reuses**: Existing modal structure, status badges, and button variants
**Requirement**: WBAEM-01, WBAEM-02, WBAEM-03, WBAEM-04, WBAEM-05, WBAEM-07

**Done when**:
- [ ] `SlotDetail` shows an `Editar` action for existing sessions
- [ ] `SlotDetail` shows an `Excluir` action with confirmation before mutating
- [ ] The quick `Marcar Pago` path asks for `card`, `pix`, or `cash` and an editable payment date before mutating
- [ ] Status/payment quick actions no longer represent the only recovery path
- [ ] Already-paid sessions display the current payment method
- [ ] Already-paid sessions can surface the recorded payment date where relevant
- [ ] `SlotDetail` buttons have clearer visual hierarchy across edit/payment, status, and destructive actions
- [ ] The refreshed layout remains readable on smaller screens while preserving the existing action availability rules
- [ ] Delete failures surface an error message without closing the modal prematurely
- [ ] Edit action delegates cleanly to the parent agenda state
- [ ] `cd packages/web-bruno && npm run build` exits 0

**Commit**: deferred — commit alongside T6

---

### T6: Wire the weekly agenda to the edit modal lifecycle

**What**: Update the weekly agenda page state so an existing slot can launch the shared form in edit mode, close cleanly, and refresh after edit/delete.
**Where**:
- `packages/web-bruno/src/components/agenda/WeeklyGrid.tsx`
- `packages/web-bruno/src/pages/DashboardPage.tsx`
**Depends on**: T5
**Reuses**: Existing `selectedAppointment`, `detailOpen`, and create-modal lifecycle in the dashboard
**Requirement**: WBAEM-01, WBAEM-02, WBAEM-03, WBAEM-05

**Done when**:
- [ ] Clicking `Editar` in `SlotDetail` opens `AppointmentForm` in edit mode with the selected session
- [ ] Saving an edit closes the form and refreshes the agenda data
- [ ] Saving a paid session preserves the selected `paymentMethod` and `paymentDate`
- [ ] Deleting a session closes the detail modal and refreshes the agenda data
- [ ] Existing create-from-empty-slot behavior still works
- [ ] No stale selected-session state remains after close
- [ ] `cd packages/web-bruno && npm run build` exits 0

**Commit**: deferred — commit alongside T7

---

### T7: Require payment details in non-agenda shortcuts and use paidAt in financial reporting UI

**What**: Update the other web-bruno paid-state entry points so Bruno cannot mark a session as paid without choosing `card`, `pix`, or `cash`, then make the financial cards/charts use `paidAt` instead of session date.
**Where**:
- `packages/web-bruno/src/pages/FinancialPage.tsx`
- `packages/web-bruno/src/components/financial/PendingPayments.tsx`
- `packages/web-bruno/src/components/patients/PatientHistory.tsx`
- `packages/web-bruno/src/components/financial/RevenueSummary.tsx`
- `packages/web-bruno/src/components/financial/RevenueChart.tsx`
**Depends on**: T3, T4
**Reuses**: Existing `useUpdateAppointment()` mutation and payment shortcut buttons
**Requirement**: WBAEM-04, WBAEM-05

**Done when**:
- [ ] Pending-payments quick actions collect `paymentMethod` and payment date before calling the update mutation
- [ ] Patient-history quick actions collect `paymentMethod` and payment date before calling the update mutation
- [ ] The shared mutation payload includes `paymentMethod` and `paidAt`
- [ ] Financial summary cards compute paid revenue by `paidAt` rather than session `date`
- [ ] Revenue chart buckets compute paid revenue by `paidAt` rather than session `date`
- [ ] A session paid in a later month appears in that later month's revenue totals
- [ ] Already-paid sessions can display the recorded method where relevant
- [ ] Payment date is visible where Bruno needs to audit received money
- [ ] `cd packages/web-bruno && npm run build` exits 0

**Commit**: `feat(web-bruno): capture paid-session payment details`

---

## Task Granularity Check

| Task | Scope | Status |
|---|---|---|
| T1: Add payment controls + financial backend semantics | Prisma + backend contract/query files | ✅ Cohesive |
| T2: Add DELETE session endpoint | 1 route | ✅ Granular |
| T3: Align schemas + hooks | 3 tightly related frontend contract files | ✅ Cohesive |
| T4: Reuse AppointmentForm in edit mode + value-entry polish | 1 component | ✅ Granular |
| T5: Add SlotDetail edit/delete UX + button polish | 1 component | ✅ Granular |
| T6: Wire agenda modal lifecycle | 2 tightly coupled UI files | ✅ Cohesive |
| T7: Update payment shortcuts + financial UI attribution | 5 tightly related payment UI files | ✅ Cohesive |

---

## Verification Notes

- Backend verification:
  - `cd packages/api && npx tsc --noEmit`
- Frontend verification:
  - `cd packages/web-bruno && npm run build`
- Manual smoke test:
  - Open an existing weekly session
  - Edit date/time/type/value/status/payment
  - Mark a session as paid and confirm the UI requires `card`, `pix`, or `cash` plus a payment date
  - Revert an accidental `paid` back to `pending`
  - Revert an accidental `completed` or `cancelled` back to an active status
  - Scroll over the `AppointmentForm` price input and confirm the value does not change
  - Create or edit a psychotherapy session with `R$ 0,00` and confirm it saves successfully
  - Confirm package total validation still rejects `0`
  - Mark a session as paid from pending-payments and patient-history shortcuts
  - Set a session date in one month and a payment date in a later month, then confirm the amount appears in the later month's revenue
  - Review the refreshed `SlotDetail` action layout on desktop and a narrow/mobile viewport
  - Delete a mistaken session and confirm it disappears from the week grid
