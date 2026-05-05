# web-bruno Recurring Session Gap

**Tags:** psychology, web-bruno, recurrence, ai-availability, api, flow
**Discovered:** 2026-05-04

## Summary

`packages/web-bruno/src/components/appointments/AppointmentForm.tsx` currently models recurrence as a finite client-side batch: enabling recurrence calls `useCreateRecurringAppointments()` with `{ startDate, weeks }`.

`packages/web-bruno/src/api/appointments.ts` sends that payload to `POST /api/psychology/sessions/batch`, and `packages/api/src/http/routes/psychology.routes.ts` simply loops `weeks` times, creating one appointment every 7 days. There is no persistent recurring-series model and no link between the generated appointments.

## Why It Matters

- Future agenda weeks go empty once the pre-created batch ends.
- AI availability still reads concrete appointments through the normal slot pipeline (`packages/api/src/application/use-cases/booking/get-available-slots.ts` + `packages/api/src/infrastructure/database/repositories/prisma-appointment.repository.ts:findBookedSlots()`), so once the batch runs out the fixed slot can be offered again.

## Update

The recurring-session-series implementation replaces that gap with a persistent rule in `packages/api/prisma/schema.prisma` (`RecurringAppointmentSeries`) plus `appointments.recurringSeriesId`.

- `POST /api/psychology/recurring-series` now creates the series and seeds a protected future horizon through `CreateRecurringSeriesUseCase`.
- `PATCH /api/psychology/recurring-series/:id/stop` stops the rule and removes future occurrences from the chosen date onward.
- `packages/api/src/infrastructure/jobs/recurring-series-materialization.job.ts` replenishes active series daily.
- `packages/web-bruno/src/components/agenda/SlotDetail.tsx` and `TimeSlot.tsx` surface recurrence metadata and let Bruno stop a series from an occurrence.
- `findBookedSlots()` now treats every non-cancelled appointment as blocked, so scheduled recurring sessions remain unavailable to slot-discovery flows.

## Pointers

- `packages/web-bruno/src/components/appointments/AppointmentForm.tsx`
- `packages/web-bruno/src/api/appointments.ts`
- `packages/api/src/http/routes/psychology.routes.ts`
- `packages/api/src/application/use-cases/booking/create-recurring-series.ts`
- `packages/api/src/application/use-cases/booking/materialize-recurring-series-window.ts`
- `packages/api/src/application/use-cases/booking/stop-recurring-series.ts`
- `packages/api/src/application/use-cases/booking/get-available-slots.ts`
- `packages/mcp/src/tools/get-next-available-date.ts`
