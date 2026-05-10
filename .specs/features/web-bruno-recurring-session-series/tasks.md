# web-bruno Recurring Session Series Tasks

**Design**: `.specs/features/web-bruno-recurring-session-series/design.md`
**Status**: Draft

---

## Execution Plan

### Phase 1: Persistence + domain foundation (Sequential)

```
T1 → T2
```

### Phase 2: API behavior + automation (Parallel OK)

```
T2 complete, then:
  ├── T3 [P]
  └── T4 [P]
```

### Phase 3: web-bruno integration (Sequential)

```
T3 + T4 → T5 → T6
```

### Phase 4: Verification + cleanup (Sequential)

```
T6 → T7
```

---

## Task Breakdown

### T1: Add recurring-series persistence and appointment linkage

**What**: Create the persistence model for recurring series and link generated appointments back to the source series.
**Where**:
- `packages/api/prisma/schema.prisma`
- `packages/api/prisma/migrations/...`
- `packages/api/src/domain/entities/appointment.ts`
- `packages/api/src/domain/repositories/appointment.repository.ts`
**Depends on**: None
**Reuses**: Existing `Appointment` persistence and relation patterns
**Requirement**: WRSS-01, WRSS-02, WRSS-03

**Done when**:
- [ ] Prisma has a recurring-series model with tenant/provider/customer/service linkage
- [ ] `Appointment` can optionally reference `recurringSeriesId`
- [ ] A migration exists for the new schema
- [ ] Repository contracts expose the minimum series read/write operations needed by use cases
- [ ] `cd packages/api && npx tsc --noEmit` exits 0

---

### T2: Add recurring-series use cases in the API application layer

**What**: Implement clean-architecture use cases for create, stop, and materialize recurring series.
**Where**:
- `packages/api/src/application/use-cases/booking/`
- `packages/api/src/domain/repositories/`
- `packages/api/src/infrastructure/database/repositories/`
- `packages/api/src/application/use-cases/booking/__tests__/`
**Depends on**: T1
**Reuses**: Existing slot-conflict rules and appointment creation patterns
**Requirement**: WRSS-01, WRSS-02, WRSS-03

**Done when**:
- [ ] `CreateRecurringSeriesUseCase` persists the series and creates the initial protected horizon
- [ ] `StopRecurringSeriesUseCase` stops future generation and removes/cancels future occurrences from the stop point
- [ ] `MaterializeRecurringSeriesWindowUseCase` replenishes occurrences up to the protected horizon
- [ ] Use-case tests cover weekly and biweekly generation, conflict rejection, and stop behavior
- [ ] `cd packages/api && npm test -- --runInBand` passes for the new use-case tests

---

### T3 [P]: Expose recurring-series routes and session recurrence metadata

**What**: Add psychology API endpoints for recurring-series creation/stop and include recurrence metadata in session responses.
**Where**:
- `packages/api/src/http/routes/psychology.routes.ts`
- optional DTO helpers near the same route or shared route-local mappers
**Depends on**: T2
**Reuses**: Existing auth/provider scope and session mapping style
**Requirement**: WRSS-01, WRSS-02, WRSS-03, WRSS-04

**Done when**:
- [ ] `POST /psychology/recurring-series` exists and validates interval-based recurrence input
- [ ] A stop endpoint exists for recurring series
- [ ] Session payloads can include `recurringSeriesId` and recurrence metadata when applicable
- [ ] Conflicts return a clear 409 response
- [ ] The old batch endpoint is no longer required for the recurring-session path
- [ ] `cd packages/api && npx tsc --noEmit` exits 0

---

### T4 [P]: Add rolling recurrence materialization job

**What**: Keep active recurring series projected into future appointment rows inside the protected horizon.
**Where**:
- `packages/api/src/infrastructure/jobs/`
- `packages/api/src/server.ts`
**Depends on**: T2
**Reuses**: Existing cron bootstrap pattern from `reminder.job.ts`
**Requirement**: WRSS-01, WRSS-03

**Done when**:
- [ ] A background job runs recurring-series materialization on a safe schedule
- [ ] The job only processes active series
- [ ] The job does not duplicate already-materialized occurrences
- [ ] Materialization failures are logged with enough context to investigate the affected series
- [ ] `cd packages/api && npx tsc --noEmit` exits 0

---

### T5: Replace finite-weeks recurrence in AppointmentForm and hooks

**What**: Swap the current batch-weeks recurrence UI for cadence-based series creation and wire the new API contract.
**Where**:
- `packages/web-bruno/src/components/appointments/AppointmentForm.tsx`
- `packages/web-bruno/src/api/appointments.ts`
- `packages/web-bruno/src/schemas/appointment.schema.ts`
**Depends on**: T3, T4
**Reuses**: Existing session form fields, mutation invalidation, and agenda modal flow
**Requirement**: WRSS-01, WRSS-04

**Done when**:
- [ ] The old "repetir semanalmente + X semanas" batch input is removed
- [ ] The form supports "every N weeks" recurrence input
- [ ] Recurring create calls the new recurring-series endpoint
- [ ] Non-recurring create still calls the single-session endpoint
- [ ] Success and error feedback describe the recurring behavior clearly
- [ ] `cd packages/web-bruno && npm run build` exits 0

---

### T6: Surface recurrence metadata and stop-series actions in the agenda

**What**: Let Bruno recognize recurring occurrences and stop a series from the agenda flow.
**Where**:
- `packages/web-bruno/src/components/agenda/SlotDetail.tsx`
- `packages/web-bruno/src/components/agenda/WeeklyGrid.tsx`
- `packages/web-bruno/src/pages/DashboardPage.tsx`
**Depends on**: T5
**Reuses**: Existing slot detail modal and appointment refresh lifecycle
**Requirement**: WRSS-02, WRSS-03, WRSS-04

**Done when**:
- [ ] Slot details indicate when an appointment belongs to a recurring series
- [ ] Bruno can stop a recurring series from an occurrence context
- [ ] Stopping a series refreshes the agenda and removes/cancels future occurrences as designed
- [ ] Existing non-recurring session flows still work
- [ ] `cd packages/web-bruno && npm run build` exits 0

---

### T7: Verify AI availability and remove reliance on the finite batch path

**What**: Confirm that recurring series protect future slots in both the agenda and the AI-facing availability flow.
**Where**:
- API and MCP verification
- remove or quarantine remaining `web-bruno` callers of `/psychology/sessions/batch` for recurrence
**Depends on**: T6
**Reuses**: Existing `get_available_slots` and `get_next_available_date` tooling
**Requirement**: WRSS-03, WRSS-04

**Done when**:
- [ ] A future recurring slot appears occupied in the week agenda
- [ ] `GET /api/slots` does not offer the recurring slot on matching dates inside the protected horizon
- [ ] MCP availability tools reflect the same occupied slot behavior
- [ ] No remaining `web-bruno` recurrence flow depends on finite `weeks` generation
- [ ] Manual verification notes are recorded in the feature summary or PR

---

## Task Granularity Check

| Task | Scope | Status |
|---|---|---|
| T1: Persistence + linkage | Prisma + repository contracts | ✅ Cohesive |
| T2: Application use cases | 1 feature slice in API application layer | ✅ Cohesive |
| T3: HTTP routes + DTO metadata | 1 route surface | ✅ Cohesive |
| T4: Materialization job | 1 infrastructure concern | ✅ Granular |
| T5: Form + hooks | 3 tightly related frontend files | ✅ Cohesive |
| T6: Agenda integration | 3 tightly coupled agenda files | ✅ Cohesive |
| T7: Verification + batch-path retirement | verification-focused integration slice | ✅ Cohesive |

---

## Verification Notes

- Backend:
  - `cd packages/api && npx tsc --noEmit`
  - targeted `vitest` for recurring-series use cases
- Frontend:
  - `cd packages/web-bruno && npm run build`
- Manual:
  - Create a weekly recurring series
  - Confirm future agenda weeks keep showing the fixed slot
  - Stop the series and confirm only future occurrences are removed/cancelled
  - Query a future date in slot availability and confirm the recurring slot is blocked
