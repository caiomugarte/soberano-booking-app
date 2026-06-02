# web-bruno Appointments Filter Normalization Gotcha

**Tags:** psychology, web-bruno, appointments, patients, react-query, gotcha
**Discovered:** 2026-06-02

## Shared Surface

- `packages/web-bruno/src/api/appointments.ts`
  - `useAppointments()` builds both the React Query key and the request URL from `normalizeAppointmentFilters()`.
- Current consumers that pass these filters include:
  - `packages/web-bruno/src/components/patients/PatientHistory.tsx`
  - `packages/web-bruno/src/pages/AppointmentsPage.tsx`

## Gotcha

- If `normalizeAppointmentFilters()` omits a field, that field is ignored twice:
  - it never reaches `/api/psychology/sessions` in the query string
  - it never changes the React Query key, so cached data is reused as if the filter had not changed
- This already surfaced with patient-history `type` and `status` filters: `paymentStatus` and date filters worked because they were normalized, while `type` and `status` silently no-op'd.

## Current Fix Anchor

- `packages/web-bruno/src/api/appointments.ts:normalizeAppointmentFilters()`
  - must preserve `type`
  - must preserve `status`
- Backend support already exists in:
  - `packages/api/src/http/routes/psychology.routes.ts`
  - `packages/api/src/infrastructure/database/repositories/prisma-appointment.repository.ts:findPatientHistory()`
