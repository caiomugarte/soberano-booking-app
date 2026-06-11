# web-bruno Calendar Workspace Hardcoding

**Tags:** psychology, web-bruno, agenda, calendar, workspace, hardcoding
**Discovered:** 2026-06-10

## Entry Points

- `packages/web-bruno/src/pages/DashboardPage.tsx`
- `packages/web-bruno/src/components/agenda/WeeklyGrid.tsx`
- `packages/web-bruno/src/components/appointments/AppointmentForm.tsx`
- `packages/web-bruno/src/pages/AppointmentsPage.tsx`
- `packages/web-bruno/src/pages/SettingsPage.tsx`
- `packages/web-bruno/src/config/constants.ts`
- `packages/web-bruno/src/lib/slots.ts`
- `packages/api/src/http/routes/schedule.routes.ts`
- `packages/api/src/infrastructure/database/seed-bruno.ts`

## Findings

- `packages/web-bruno/src/config/constants.ts`
  - `TIME_SLOTS` = `08:00` through `17:00`
  - `SESSION_DURATION_MINUTES` = `50`
  - `DAYS_OF_WEEK` = Monday through Saturday only
- The same constants are reused across multiple surfaces:
  - `WeeklyGrid` day/time rendering
  - `AppointmentForm` time options
  - `AppointmentsPage:getDefaultFilters()`
  - `SettingsPage` day selector + grouped shift rendering
  - `lib/slots.ts` end-time math
- `useWeekAppointments()` in `packages/web-bruno/src/api/appointments.ts` already queries Monday through Sunday (`weekStart + 6` days).
  - Result: Sunday appointments can already be fetched but are not rendered by the current agenda UI.
- `AppointmentsPage:getDefaultFilters()` ends the default range at `DAYS_OF_WEEK.length - 1`.
  - With the current six-day constant, the default list stops on Saturday.
- Psychology session create/update use cases do **not** validate against provider shifts today.
  - `packages/api/src/application/use-cases/booking/create-psychology-session.ts`
  - `packages/api/src/application/use-cases/booking/update-psychology-session.ts`
  - Impact: deriving the internal calendar window only from shifts could still hide legitimate off-shift appointments.
- Sunday support already exists in the schedule API contract.
  - `packages/api/src/http/routes/schedule.routes.ts` accepts `dayOfWeek: 0..6`
  - `ProviderShift.dayOfWeek` in Prisma is documented as `0=Sun ... 6=Sat`
- Bruno service duration is stored in data, not only in the frontend.
  - `packages/api/src/infrastructure/database/seed-bruno.ts` seeds both psychology services with `duration: 50`
  - Psychology create/update/recurrence flows derive `endTime` from service duration, so a real 1-hour rule is cross-cutting.
- Agenda blocking can likely reuse the existing absence APIs.
  - `packages/web-bruno/src/api/settings.ts` already exposes create/delete absence hooks
  - `schedule.routes.ts` already supports full-day or time-range absences
  - Missing guard today: no obvious validation prevents creating a block over an existing active appointment

**Updated:** 2026-06-10
