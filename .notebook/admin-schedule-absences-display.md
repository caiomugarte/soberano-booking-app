# Admin Schedule Absences Display

**Tags:** admin, schedule, absences, web, api, flow
**Discovered:** 2026-05-02

## Current Flow

- `packages/web/src/pages/admin/SchedulePage.tsx`
  - `useAbsences()` loads all absences for the logged-in provider.
  - The page hides past rows locally with `absences.filter((a) => a.date.slice(0, 10) >= today)`.
  - `today` is built with `new Date().toISOString().slice(0, 10)`.
  - The add-absence form also blocks past dates via `<input min={today}>`.
- `packages/web/src/api/use-schedule.ts`
  - `useAbsences()` calls `GET /admin/schedule/absences` and returns `r.absences` unchanged.
- `packages/api/src/http/routes/schedule.routes.ts`
  - `GET /admin/schedule/absences` calls `PrismaProviderShiftRepository.findAbsencesByProvider(request.providerId!)`.
  - No date filtering happens in the admin route.
- `packages/api/src/infrastructure/database/repositories/prisma-provider-shift.repository.ts`
  - `findAbsencesByProvider(providerId)` returns every absence for that provider ordered by `date ASC`.

## Existing Precedent

- `packages/api/src/http/routes/internal.routes.ts`
  - `GET /internal/provider-absences` already filters the repository result down to upcoming dates only before returning it.
  - It compares `a.date.slice(0, 10)` against `todayInCampoGrande()`.

## Implication

If the product rule is "past absences should not be displayed", the current admin page already satisfies that visually, but only in the page component. The API still returns historical records, so any future consumer of `GET /admin/schedule/absences` would need to remember to re-apply the same filter.
