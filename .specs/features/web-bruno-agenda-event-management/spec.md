# web-bruno Agenda Event Management — Specification

## Problem Statement

The weekly agenda in `web-bruno` lets Bruno view a session and apply one-way actions such as `Realizado`, `Falta`, `Desmarcado`, and `Pago`. However:

1. There is no way to edit an existing session directly from the agenda.
2. There is no way to delete a mistaken session.
3. If a session is marked as `realizado` or `pago` by accident, the UI provides no recovery path.

This traps incorrect data in the weekly agenda and forces manual workarounds in the database.

4. There is no way to record how a paid session was settled (`card`, `pix`, or `cash`), so the agenda and financial flows lose an important control detail.
5. There is no way to record a payment date independently from the session date, so late or end-of-month payments are booked into the wrong financial month.
6. The appointment price inputs can be changed accidentally by mouse-wheel or trackpad scroll while Bruno is filling the form, which silently alters the intended charge.
7. The frontend still rejects `value = 0` even though the psychology session API already accepts it, so Bruno cannot register legitimate free psychotherapy sessions.
8. The session-detail action buttons have weak visual hierarchy, making corrective and destructive actions harder to scan quickly.

## Scope Decision

This change should use `tlc-spec-driven` in **medium scope**.

Why:
- It now touches `packages/web-bruno`, `packages/api`, and the Prisma appointment schema
- It touches **both** `packages/web-bruno` and `packages/api`
- It introduces user-facing behavior changes for destructive and corrective actions
- It changes financial reporting semantics from session date to receipt date
- It needs clear acceptance criteria for status/payment reversal, payment-method capture, receipt-date control, and session rescheduling

It still does **not** need a separate design document because the change stays local to the existing psychology session and financial flows, but it now benefits from a tasks breakdown because receipt-date control touches multiple frontend entry points plus shared financial aggregation.

## Goals

- [ ] Bruno can edit an existing agenda event from the weekly agenda
- [ ] Bruno can delete a mistaken agenda event with confirmation
- [ ] Bruno can recover from accidental `realizado`, `falta`, `desmarcado`, or `pago`
- [ ] Bruno can record the payment method whenever a session is marked as paid
- [ ] Bruno can record the payment date independently from the session date whenever money is received later
- [ ] The recorded payment method is available in the agenda and financial flows for later control
- [ ] Paid revenue is attributed to the month/week/year of `paidAt`, not the session date
- [ ] Agenda edits remain conflict-safe and scoped to the authenticated provider
- [ ] Bruno can create or edit a free psychotherapy session without frontend validation rejecting `0`
- [ ] Appointment price inputs in the booking form do not change accidentally on mouse-wheel or trackpad scroll
- [ ] Session-detail actions have clearer visual hierarchy without changing their existing availability rules

## Out of Scope

| Feature | Reason |
|---|---|
| Audit log for edits/deletes | Not requested |
| Undo after delete | Confirmation is sufficient for now |
| Bulk edit/delete | Not requested |
| Changes to patient CRUD outside the session editor | Separate flow |
| WhatsApp notifications for psychology session changes | Out of scope for this vertical |
| Backfilling historical paid sessions with a payment method | Existing rows can remain without backfill for now |
| Bulk backfill or migration of historical payment dates | Existing `paidAt` values remain as-is unless Bruno edits the session manually |
| Revenue dashboards split by payment method | Can be added later once capture is stable |
| Receivables aging / overdue buckets | Separate financial follow-up |
| Zero-cost package totals or protocol pricing policy changes | This polish only covers free psychotherapy session entry in `AppointmentForm` |
| Full weekly-agenda visual redesign | This scope only repaginates the action buttons inside `SlotDetail` |

## User Stories

### WBAEM-01 — Edit a session from the weekly agenda

**User Story**: As Bruno, I want to edit an existing session from the agenda so I can correct the patient, day, time, type, value, notes, status, or payment state without recreating the event.

**Acceptance Criteria**:

1. WHEN Bruno opens a session in `SlotDetail` THEN the UI SHALL show an `Editar` action
2. WHEN Bruno clicks `Editar` THEN the system SHALL open a prefilled session form using the current session data
3. WHEN Bruno saves changes THEN the frontend SHALL call `PATCH /api/psychology/sessions/:id`
4. WHEN the edit changes `date`, `startTime`, or `type` THEN the backend SHALL recompute `endTime`
5. WHEN the edit moves the session into a slot already occupied by another non-cancelled session for the same provider THEN the backend SHALL return 409 and the UI SHALL keep the modal open with the error message
6. WHEN the edit changes `paymentStatus` to `pending` THEN the backend SHALL clear `paidAt`
7. WHEN the edit succeeds THEN the agenda query SHALL refresh and show the updated session in the correct slot

### WBAEM-02 — Delete a mistaken session

**User Story**: As Bruno, I want to delete a mistaken session so I can remove duplicate or incorrectly created events from the agenda.

**Acceptance Criteria**:

1. WHEN Bruno opens a session in `SlotDetail` THEN the UI SHALL show an `Excluir` action
2. WHEN Bruno clicks `Excluir` THEN the UI SHALL ask for confirmation before proceeding
3. WHEN the deletion is confirmed THEN the frontend SHALL call `DELETE /api/psychology/sessions/:id`
4. WHEN the delete succeeds THEN the session SHALL disappear from the agenda after query invalidation
5. WHEN the delete request targets a missing session THEN the backend SHALL return 404
6. WHEN the delete request fails THEN the UI SHALL surface the error and keep the agenda unchanged

### WBAEM-03 — Recover from accidental status or payment changes

**User Story**: As Bruno, I want to reverse accidental `realizado`, `falta`, `desmarcado`, or `pago` actions so I am not stuck with wrong financial or clinical state.

**Acceptance Criteria**:

1. WHEN Bruno edits a session THEN the form SHALL allow selecting any valid session status: `scheduled`, `confirmed`, `completed`, `cancelled`, `no_show`
2. WHEN Bruno edits a session THEN the form SHALL allow selecting `paymentStatus` as `pending` or `paid`
3. WHEN a session is accidentally marked `paid` THEN Bruno SHALL be able to switch it back to `pending`
4. WHEN a session is accidentally marked `completed`, `no_show`, or `cancelled` THEN Bruno SHALL be able to restore it to an active state through the edit flow
5. WHEN `paymentStatus` is `paid` and no `paidAt` is provided by the client THEN the backend SHALL set `paidAt` automatically if missing
6. WHEN `paymentStatus` is changed from `paid` to `pending` THEN the backend SHALL set `paidAt` to `null`

### WBAEM-04 — Record the payment method for paid sessions

**User Story**: As Bruno, I want to record whether a paid session was settled by `card`, `pix`, or `cash` so I can keep reliable payment control.

**Acceptance Criteria**:

1. WHEN Bruno changes a session `paymentStatus` to `paid` THEN the UI SHALL require a `paymentMethod` selection with the values `card`, `pix`, or `cash`
2. WHEN Bruno uses a quick `Marcar Pago` action from the agenda, patient history, or pending-payments list THEN the UI SHALL collect the `paymentMethod` before persisting the change
3. WHEN the frontend submits a session with `paymentStatus = paid` THEN it SHALL send both `paymentMethod` and `paidAt`
4. WHEN Bruno opens an already-paid session in the detail or edit flow THEN the recorded `paymentMethod` SHALL be shown
5. WHEN a session is switched from `paid` back to `pending` THEN the backend SHALL clear both `paidAt` and `paymentMethod`
6. WHEN a session remains `pending` THEN `paymentMethod` SHALL stay empty and SHALL NOT be required
7. WHEN a create flow stores a session as already paid THEN it SHALL also capture `paymentMethod` before save so new paid sessions do not lose this detail
8. WHEN paid sessions are returned by the session or financial endpoints THEN the payload SHALL include `paymentMethod` so the frontend can display or audit it

### WBAEM-05 — Record payment date independently from session date

**User Story**: As Bruno, I want to record the date when the payment actually arrived, even if it happened days or weeks after the session, so my monthly financial totals reflect the real cash-in date.

**Acceptance Criteria**:

1. WHEN Bruno marks a session as `paid` from the agenda, patient history, pending-payments list, or edit form THEN the UI SHALL allow informing a `paymentDate` independently from the session `date`
2. WHEN Bruno uses a quick `Marcar Pago` action THEN the payment dialog SHALL prefill `paymentDate` with today and SHALL still allow Bruno to override it before saving
3. WHEN the frontend submits a paid session THEN it SHALL send `paidAt` derived from the chosen `paymentDate`, even when the session happened in a different month
4. WHEN a paid session is edited and remains `paid` THEN Bruno SHALL be able to correct the recorded `paymentDate`
5. WHEN `GET /api/admin/financial` receives a date range THEN the backend SHALL include paid sessions whose `paidAt` falls inside the requested range even if the session `date` falls outside it
6. WHEN the financial page computes weekly, monthly, or annual paid revenue THEN it SHALL use `paidAt` instead of the session `date`
7. WHEN a session happened on `2026-01-01` and was paid on `2026-02-15` THEN the amount SHALL count toward February 2026 revenue, not January 2026 revenue
8. WHEN a session is switched from `paid` back to `pending` THEN its amount SHALL be removed from paid totals for every financial period

### WBAEM-06 — Protect appointment price entry and allow free psychotherapy sessions

**User Story**: As Bruno, I want the booking form to preserve the intended price value and allow free psychotherapy entries so I can book courtesy sessions without accidental or blocked pricing.

**Acceptance Criteria**:

1. WHEN Bruno scrolls the page while a price input in `AppointmentForm` is focused or hovered THEN the UI SHALL NOT change the current numeric value
2. WHEN Bruno creates or edits a non-package psychotherapy session with `value = 0` THEN the frontend SHALL allow submission and send `0` to the existing psychology session endpoints
3. WHEN Bruno saves a free psychotherapy session THEN the agenda and detail flows SHALL treat it as a valid zero-cost session without client-side validation errors
4. WHEN Bruno enters a negative or invalid manual session value THEN the frontend SHALL still block submission with a validation error
5. WHEN Bruno creates or edits package totals THEN the existing `> 0` package validation SHALL remain unchanged

### WBAEM-07 — Repaginate session-detail action buttons

**User Story**: As Bruno, I want the session-detail actions to look clearer so I can understand the safest and most relevant action at a glance.

**Acceptance Criteria**:

1. WHEN Bruno opens `SlotDetail` THEN the footer SHALL present clearer visual separation between edit/payment actions, status shortcuts, and destructive actions
2. WHEN an action is destructive THEN the refreshed styling SHALL keep it visually distinct from non-destructive actions
3. WHEN the actions wrap on smaller screens THEN the refreshed layout SHALL remain readable and tappable
4. WHEN the visual polish is applied THEN the existing action availability rules from WBAEM-01 through WBAEM-05 SHALL remain unchanged

## Implementation Notes

### API

- Extend the Prisma `Appointment` model with nullable `paymentMethod`
- Extend `PATCH /api/psychology/sessions/:id` in [packages/api/src/http/routes/psychology.routes.ts](/Users/caio.mugarte/Documents/projetos/soberano/packages/api/src/http/routes/psychology.routes.ts) to accept:
  - `patientId?`
  - `date?`
  - `startTime?`
  - `type?`
  - `value?`
  - `notes?`
  - `status?`
  - `paymentStatus?`
  - `paymentMethod?`
  - `paidAt?`
- Extend the create session endpoints in the same route file so `paymentMethod` and a user-chosen `paidAt` can be accepted when a session is created as paid
- On schedule/type changes:
  - resolve the mapped `serviceId`
  - recompute `endTime`
  - reject occupied slots for the same provider when another non-cancelled session already exists
- On payment changes:
  - require `paymentMethod` whenever `paymentStatus = paid`
  - treat `paidAt` as the authoritative receipt timestamp for paid sessions
  - clear `paymentMethod` whenever `paymentStatus = pending`
  - include `paymentMethod` in `mapToSession()`
- Extend `GET /api/admin/financial` and its repository query so paid-session rows expose both `paymentMethod` and `paidAt`
- In financial ranges, include paid sessions by `paidAt` even when the session date falls outside the requested range
- Add `DELETE /api/psychology/sessions/:id`

### Frontend

- Extend [packages/web-bruno/src/schemas/appointment.schema.ts](/Users/caio.mugarte/Documents/projetos/soberano/packages/web-bruno/src/schemas/appointment.schema.ts):
  - add `PaymentMethodSchema`
  - add `paymentMethod` and editable `paidAt` handling to `Appointment` and payload typing
- Extend [packages/web-bruno/src/api/appointments.ts](/Users/caio.mugarte/Documents/projetos/soberano/packages/web-bruno/src/api/appointments.ts):
  - broaden `useUpdateAppointment()` input to match editable fields, including `paymentMethod` and user-controlled `paidAt`
  - add `useDeleteAppointment()`
- Extend [packages/web-bruno/src/api/financial.ts](/Users/caio.mugarte/Documents/projetos/soberano/packages/web-bruno/src/api/financial.ts) so the financial view preserves `paymentMethod`, `paidAt`, and can attribute paid revenue by receipt date
- Update [packages/web-bruno/src/components/agenda/SlotDetail.tsx](/Users/caio.mugarte/Documents/projetos/soberano/packages/web-bruno/src/components/agenda/SlotDetail.tsx):
  - add `Editar`
  - add `Excluir`
  - stop treating status/payment actions as one-way only
  - require payment-method and payment-date capture before quick mark-paid
- Update [packages/web-bruno/src/components/agenda/WeeklyGrid.tsx](/Users/caio.mugarte/Documents/projetos/soberano/packages/web-bruno/src/components/agenda/WeeklyGrid.tsx):
  - wire edit/delete flows
  - refresh the weekly query after mutations
- Reuse or extend [packages/web-bruno/src/components/appointments/AppointmentForm.tsx](/Users/caio.mugarte/Documents/projetos/soberano/packages/web-bruno/src/components/appointments/AppointmentForm.tsx) so it can work in edit mode with initial values and an explicit payment-date field whenever the session is paid
- Update `AppointmentForm` price inputs so mouse-wheel and trackpad scroll do not mutate their values while the modal is open
- Align `AppointmentForm` validation with the existing psychology session API contract for non-package psychotherapy sessions so `value = 0` is allowed, while negative values remain blocked and package totals still require `> 0`
- Update the other quick payment surfaces so they cannot mark a session as paid without a `paymentMethod` and `paymentDate`:
  - [packages/web-bruno/src/components/financial/PendingPayments.tsx](/Users/caio.mugarte/Documents/projetos/soberano/packages/web-bruno/src/components/financial/PendingPayments.tsx)
  - [packages/web-bruno/src/components/patients/PatientHistory.tsx](/Users/caio.mugarte/Documents/projetos/soberano/packages/web-bruno/src/components/patients/PatientHistory.tsx)
- Update the financial surfaces so paid totals and charts use `paidAt`:
  - [packages/web-bruno/src/pages/FinancialPage.tsx](/Users/caio.mugarte/Documents/projetos/soberano/packages/web-bruno/src/pages/FinancialPage.tsx)
  - [packages/web-bruno/src/components/financial/RevenueSummary.tsx](/Users/caio.mugarte/Documents/projetos/soberano/packages/web-bruno/src/components/financial/RevenueSummary.tsx)
  - [packages/web-bruno/src/components/financial/RevenueChart.tsx](/Users/caio.mugarte/Documents/projetos/soberano/packages/web-bruno/src/components/financial/RevenueChart.tsx)
- Refresh [packages/web-bruno/src/components/agenda/SlotDetail.tsx](/Users/caio.mugarte/Documents/projetos/soberano/packages/web-bruno/src/components/agenda/SlotDetail.tsx) button styling/layout to create clearer hierarchy between edit/payment actions, status shortcuts, and destructive actions without changing the action rules
- No backend contract change is required for zero-cost manual sessions because the psychology session create/update routes already accept `value >= 0`; this polish closes the frontend-only validation mismatch

## Open Questions

1. For a restored active session, should the preferred status default be `scheduled` or `confirmed`, or is direct manual selection enough?
2. In the financial UI, do we need to surface both the session date and the payment date when they differ, or is using payment date for totals enough for this scope?

Current recommendation:
Use a status selector in edit mode and do not force a single recovery target. That keeps the flow explicit and avoids guessing between `scheduled` and `confirmed`, both of which already exist in `web-bruno`.

For payment control, require both `paymentMethod` and an editable `paymentDate` across every flow that transitions a session to `paid` in `web-bruno`, default the quick-pay date to today, and attribute revenue by `paidAt`. If we need to keep the UI lean, showing payment date in detail/edit surfaces is enough for now and a richer financial list redesign can stay separate.

For the pricing polish, treat zero-cost support as a psychotherapy-only `AppointmentForm` capability, keep package totals positive, and prevent wheel-based numeric input changes in the booking form.

## Requirement Traceability

| ID | Requirement | Status |
|---|---|---|
| WBAEM-01 | Edit agenda session from weekly view | Pending |
| WBAEM-02 | Delete mistaken session | Pending |
| WBAEM-03 | Reverse accidental status/payment changes | Pending |
| WBAEM-04 | Capture payment method for paid sessions | Pending |
| WBAEM-05 | Capture payment date independently from session date | Pending |
| WBAEM-06 | Protect price entry and allow free psychotherapy sessions | Pending |
| WBAEM-07 | Repaginate session-detail action buttons | Pending |

## Success Criteria

- [ ] Agenda events can be edited without recreating them
- [ ] Mistaken agenda events can be deleted in-app
- [ ] Accidental `realizado` or `pago` actions are reversible
- [ ] Paid sessions record whether the payment was `card`, `pix`, or `cash`
- [ ] A payment received in a later month is attributed to the month of `paidAt`, not the month of the session
- [ ] The weekly agenda stays consistent after edit/delete operations
- [ ] Bruno can save a psychotherapy session with `R$ 0,00` when it should be free
- [ ] Scrolling over a booking price input no longer changes its value accidentally
- [ ] `SlotDetail` actions are easier to scan on desktop and mobile
