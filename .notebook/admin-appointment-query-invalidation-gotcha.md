# Admin Appointment Query Invalidation Gotcha

**Tags:** web, admin, react-query, appointments, packages, gotcha
**Discovered:** 2026-05-29

## Query Surfaces

- `packages/web/src/api/use-admin.ts`
  - Day view uses `useAdminAppointments(date)` with query key `['admin-appointments', date]`.
  - Week view uses `useAdminAppointmentsRange(from, to)` with query key `['admin-appointments-range', from, to]`.
  - Month/year summaries use `useAdminStats(from, to)` with query key `['admin-stats', from, to]`.

## Gotcha

- Invalidating only `['admin-appointments']` refreshes the day view but leaves week/month/year surfaces stale.
- Package deactivation at `packages/web/src/api/use-admin.ts:useAdminDeactivatePackage()` also has to invalidate appointment queries, not only `adminPackageQueryKeys.all`.
- Package-linked appointment mutations share the same requirement:
  - `useAdminCancelAppointment()`
  - `useDeleteAppointment()`
  - `useUpdateAppointmentStatus()`
  - `useAdminCreateBooking()`
  - `useAdminUpdateAppointmentSchedule()`

## Current Fix Anchor

- `packages/web/src/api/use-admin.ts:invalidateAdminAppointmentQueries()`
  - invalidates `['admin-appointments']`
  - invalidates `['admin-appointments-range']`
  - invalidates `['admin-stats']`
- Package-linked mutations also call `invalidatePackageQueries()` so package details and package lists stay in sync with cancelled linked bookings.
