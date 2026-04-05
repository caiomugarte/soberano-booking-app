# Barber Admin Improvements Specification

## Problem Statement

Three UX/correctness issues exist in the barber admin area after the manual-booking rollout:
1. Manual bookings for past dates still trigger WhatsApp reminders to the customer and barber — which is pointless and confusing.
2. The daily appointments list paginates, forcing the barber to click "Próxima" to see all appointments for a given day.
3. There is no way to delete an appointment that has a mistake (wrong service booked, accidentally marked as completed, etc.). The barber is stuck with bad data.

## Goals

- [ ] No WhatsApp notifications sent for manual bookings with a past date
- [ ] All appointments for a selected day are shown in one list without pagination
- [ ] Barber can delete any completed, no_show, or confirmed (time-passed) appointment from the dashboard

## Out of Scope

| Feature | Reason |
|---|---|
| Soft delete / archive | Not requested; hard delete is sufficient |
| Undo / restore deleted appointments | Not requested |
| Delete for confirmed future appointments | Cancellation flow already handles that case (sends customer notification) |
| Audit log of deletions | Not requested |

---

## User Stories

### P1: Skip reminders for past-date manual bookings ⭐ MVP

**User Story**: As the system, I want to skip WhatsApp confirmation and barber notification when a manual booking is created for a past date so that neither the customer nor the barber receives nonsensical reminder messages.

**Why P1**: Already shipped code sends reminders regardless of date. Barbers are using manual booking to log past walk-ins and triggering ghost notifications.

**Acceptance Criteria**:

1. WHEN `AdminCreateAppointment.execute` is called with a `date` that is before today (local date comparison) THEN system SHALL skip `sendBookingConfirmation` and `notifyBarber` calls entirely
2. WHEN the booking date is today or in the future THEN system SHALL send notifications as currently implemented (no change)
3. WHEN the booking has no `customerPhone` THEN system SHALL skip notifications as currently implemented (no change — phone guard already exists)

**Independent Test**: Create a manual booking with yesterday's date and a customer phone; verify no WhatsApp message is sent and the appointment appears in the dashboard.

---

### P1: Remove pagination from daily appointment list ⭐ MVP

**User Story**: As a barber, I want to see all my appointments for a given day in a single scrollable list so that I don't miss appointments that are on "page 2".

**Why P1**: Pagination on a daily view with at most ~15–20 appointments is friction with no benefit. It also hides appointments the barber needs to act on.

**Acceptance Criteria**:

1. WHEN the barber views the daily appointments tab THEN system SHALL return ALL appointments for that day in a single response (no `page`/`limit` params)
2. WHEN the API responds THEN the frontend SHALL render all appointments without "Anterior / Próxima" pagination controls
3. WHEN the response has 0 appointments THEN system SHALL show the existing empty state (no regression)

**Independent Test**: Seed 20 appointments for one day; load the dashboard; verify all 20 appear without pagination controls.

---

### P1: "Apagar" button to delete problematic appointments ⭐ MVP

**User Story**: As a barber, I want to delete an appointment that has a mistake (wrong service, accidentally marked completed, wrong customer, etc.) so that the dashboard reflects reality and I'm not stuck with corrupted booking data.

**Why P1**: Without this, the barber has no escape hatch for data errors. Once an appointment is marked completed or no_show it cannot be corrected to a prior state — only deleted.

**Acceptance Criteria**:

1. WHEN an appointment's status is `completed` or `no_show` THEN the `AppointmentCard` SHALL show an "Apagar" button alongside the existing "Corrigir" buttons
2. WHEN an appointment's status is `confirmed` AND `timePassed` is true THEN the `AppointmentCard` SHALL also show an "Apagar" button alongside "Concluído" / "Não Veio"
3. WHEN the barber clicks "Apagar" THEN system SHALL show a confirmation dialog (e.g. "Tem certeza? Esta ação não pode ser desfeita.") before proceeding
4. WHEN the barber confirms deletion THEN system SHALL call `DELETE /admin/appointments/:id` and, on success, remove the appointment from the list (invalidate query)
5. WHEN the barber cancels the confirmation THEN system SHALL do nothing
6. WHEN the `DELETE` request fails THEN system SHALL show an inline error and NOT remove the appointment from the list
7. WHEN `DELETE /admin/appointments/:id` is called THEN the backend SHALL permanently delete the appointment record from the database
8. WHEN `DELETE /admin/appointments/:id` is called for an appointment that doesn't exist THEN backend SHALL return 404

**Independent Test**: Mark an appointment as completed; click "Apagar"; confirm; verify appointment disappears from the list and is gone from the DB.

---

## Edge Cases

- WHEN a past-date manual booking has `customerPhone` but no reminder is needed THEN the booking IS still created successfully (only notifications are skipped)
- WHEN pagination is removed from the API, the existing `summary` (confirmed count, revenue) SHALL still be returned
- WHEN barber deletes an appointment that's the last item in a section (e.g., last "Concluído"), that section header SHALL disappear (no empty section rendered)
- WHEN `timePassed` is false (appointment is in the future, confirmed) THEN "Apagar" SHALL NOT appear — barber must use the cancellation flow instead

---

## Requirement Traceability

| Requirement ID | Story | Phase | Status |
|---|---|---|---|
| BAI-01 | P1: Skip notifications for past-date bookings — date check in use-case | Execute | Pending |
| BAI-02 | P1: Remove pagination — backend returns all for a date | Execute | Pending |
| BAI-03 | P1: Remove pagination — frontend removes page state + pagination UI | Execute | Pending |
| BAI-04 | P1: Apagar button — DELETE /admin/appointments/:id endpoint | Execute | Pending |
| BAI-05 | P1: Apagar button — useDeleteAppointment hook in use-admin.ts | Execute | Pending |
| BAI-06 | P1: Apagar button — AppointmentCard renders button + confirmation | Execute | Pending |

**Coverage:** 6 total, 6 mapped to implementation, 0 unmapped

---

## Implementation Notes

- **BAI-01**: In `admin-create-appointment.ts`, compare `new Date(input.date + 'T00:00:00')` against today's midnight. If `date < today`, skip the notification block entirely.
- **BAI-02**: In `admin.routes.ts`, remove `page`/`limit` query params from `GET /admin/appointments`. Call `appointmentRepo.findByBarberAndDate(barberId, targetDate)` without pagination (or with a high fixed limit). Return `{ appointments, total, summary }` — drop `page`, `limit`, `totalPages` from response.
- **BAI-03**: In `use-admin.ts`, update `useAdminAppointments` to drop `page` param. In `DashboardPage.tsx`, remove `page` state, `setPage` calls, and the pagination `<div>` block.
- **BAI-04**: Add `DELETE /admin/appointments/:id` route in `admin.routes.ts`. Call `appointmentRepo.deleteById(id)`. Return 204 on success.
- **BAI-05**: Add `useDeleteAppointment` mutation in `use-admin.ts`. On success, invalidate `['admin-appointments']`.
- **BAI-06**: In `DashboardPage.tsx`, add "Apagar" `<button>` to `AppointmentCard`: shown when `(isConfirmed && timePassed) || isCompleted || isNoShow`. On click, `window.confirm(...)` or inline confirm state → call mutation. Style: red-ish destructive style consistent with the existing delete/cancel patterns.

## Success Criteria

- [ ] No WhatsApp messages triggered when barber logs a past walk-in
- [ ] All daily appointments visible without pagination clicks
- [ ] Barber can delete any completed / no_show / past-confirmed appointment in ≤2 clicks
