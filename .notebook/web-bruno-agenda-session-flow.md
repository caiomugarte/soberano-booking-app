# web-bruno Agenda Session Flow

**Tags:** psychology, web-bruno, agenda, sessions, api, flow
**Discovered:** 2026-05-04

## Entry Points

- `packages/web-bruno/src/pages/DashboardPage.tsx`
- `packages/web-bruno/src/components/agenda/WeeklyGrid.tsx`
- `packages/web-bruno/src/components/agenda/SlotDetail.tsx`
- `packages/web-bruno/src/api/appointments.ts`
- `packages/api/src/http/routes/psychology.routes.ts`

## Flow

1. `DashboardPage` owns the shared `AppointmentForm` lifecycle for both create and edit flows.
2. `WeeklyGrid` loads the week through `useWeekAppointments(currentWeek)`, opens `SlotDetail` for existing sessions, and delegates edit opens back up to the dashboard.
3. `SlotDetail` now supports both corrective flows and quick actions: it can open edit mode, confirm deletion, or still run mark-paid / status shortcuts.
4. Agenda mutations run through `useUpdateAppointment()` and `useDeleteAppointment()` in `packages/web-bruno/src/api/appointments.ts`, both of which invalidate the shared `['appointments']` query family.
5. `PATCH /api/psychology/sessions/:id` now supports editing patient, date, time, type, value, notes, status, payment status, payment method, and paid timestamp; the route recomputes derived fields and blocks slot conflicts.
6. `DELETE /api/psychology/sessions/:id` hard-deletes the session in provider scope and clears linked session reports first so the appointment row can be removed safely.
7. Every `web-bruno` flow that marks a session as paid now collects both `paymentMethod` and an explicit payment date before persisting: agenda detail, pending-payments, patient history, and edit/create flows that explicitly save a session as paid.

## Gotchas

- `web-bruno` uses both `scheduled` and `confirmed` as active statuses. The appointment form creates new sessions as `scheduled`, while the API defaults to `confirmed` if no status is sent.
- Restoring a previously cancelled session must re-run conflict detection even when date/time are unchanged, because cancelled slots may already have been reused by another active session.
- Package creation still uses `useCreateBatchAppointments()`, which loops over `POST /api/psychology/sessions`; the package form now splits the informed total value across all selected slots and creates each session as `paymentStatus = pending`, so package payment capture happens later per session if needed.
- Financial reporting in `web-bruno` now uses `paidAt` as the receipt date for paid revenue; when a payment date is not explicitly captured, delayed payments can still land in the wrong month, so the paid-state flows must keep sending `paidAt`.
