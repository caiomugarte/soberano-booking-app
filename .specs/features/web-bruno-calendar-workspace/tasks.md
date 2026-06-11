# web-bruno Calendar Workspace Tasks

**Design**: `.specs/features/web-bruno-calendar-workspace/design.md`
**Status**: Implemented — automated verification passed; manual workspace verification pending

---

## Execution Plan

### Phase 1: Configuration + scheduling foundation (Sequential)

```
T1 → T2 → T3
```

### Phase 2: Workspace shell + blocking surfaces (Parallel OK after T3)

```
T3 complete, then:
  ├── T4 [P]
  ├── T5 [P]
  └── T6 [P]
```

### Phase 3: Surface alignment + verification (Sequential)

```
T4 + T5 + T6 → T7 → T8
```

---

## Task Breakdown

### T1: Add provider workspace configuration persistence

**What**: Add provider-scoped workspace fields for visible start/end hours and default session duration, then expose them through the existing profile contract.
**Where**:
- `packages/api/prisma/schema.prisma`
- `packages/api/prisma/migrations/...`
- `packages/api/src/http/routes/admin.routes.ts`
- `packages/web-bruno/src/api/settings.ts`
**Depends on**: None
**Reuses**: existing `/api/admin/me` read/write flow
**Requirement**: WBCW-01, WBCW-04

**Tools**:

- MCP: NONE
- Skill: `coding-guidelines`

**Done when**:

- [x] Provider persistence has explicit workspace start/end and default duration fields
- [x] `/api/admin/me` returns those fields
- [x] `/api/admin/me` accepts updates for those fields with validation
- [x] `packages/web-bruno` profile typings include the new workspace fields
- [x] `cd packages/api && npx tsc --noEmit` exits 0

---

### T2: Make psychology scheduling duration-aware

**What**: Add optional duration override input to psychology create/edit flows and align recurring rule persistence with selected duration.
**Where**:
- `packages/api/src/application/use-cases/booking/create-psychology-session.ts`
- `packages/api/src/application/use-cases/booking/update-psychology-session.ts`
- `packages/api/src/application/use-cases/booking/psychology-session.utils.ts`
- recurring-series use cases/routes in `packages/api/src/application/use-cases/booking/` and `packages/api/src/http/routes/psychology.routes.ts`
- relevant repository/persistence files if recurring series needs a stored duration field
**Depends on**: T1
**Reuses**: existing `endTime` derivation and conflict detection patterns
**Requirement**: WBCW-04

**Tools**:

- MCP: NONE
- Skill: `coding-guidelines`

**Done when**:

- [x] Session create/update contracts accept optional `durationMinutes`
- [x] Backend computes `endTime` from selected duration or provider default
- [x] Recurring rules preserve selected duration for future materialization
- [x] Conflict checks still reject overlapping sessions correctly
- [x] Targeted use-case tests cover default duration and manual override cases
- [x] `cd packages/api && npm test -- --runInBand` passes for the new scheduling tests

---

### T3: Replace shared hardcoded day/hour helpers in `web-bruno`

**What**: Introduce a shared workspace helper model for Monday-through-Sunday coverage, visible hour rows, and hourly start-slot options, then migrate the current hardcoded consumers to it.
**Where**:
- `packages/web-bruno/src/lib/calendar-workspace.ts`
- `packages/web-bruno/src/lib/slots.ts`
- `packages/web-bruno/src/components/appointments/AppointmentForm.tsx`
- `packages/web-bruno/src/pages/AppointmentsPage.tsx`
- `packages/web-bruno/src/pages/SettingsPage.tsx`
- `packages/web-bruno/src/config/constants.ts`
**Depends on**: T2
**Reuses**: existing date-fns week helpers and current slot utilities
**Requirement**: WBCW-01, WBCW-05

**Tools**:

- MCP: NONE
- Skill: `coding-guidelines`, `react-best-practices`

**Done when**:

- [x] Shared workspace helpers replace direct `TIME_SLOTS` and six-day assumptions in the listed surfaces
- [x] Appointment form start-time options come from workspace helpers
- [x] Default appointment workbench week range includes Sunday
- [x] Settings UI uses a seven-day display model where relevant
- [x] `cd packages/web-bruno && npm run build` exits 0

---

### T4 [P]: Build the calendar workspace shell

**What**: Replace the dashboard's week-only agenda shell with a reusable `CalendarWorkspace` that supports `Dia`, `Semana`, and `Calendário`.
**Where**:
- `packages/web-bruno/src/components/agenda/CalendarWorkspace.tsx`
- supporting agenda sub-components in `packages/web-bruno/src/components/agenda/`
- `packages/web-bruno/src/pages/DashboardPage.tsx`
**Depends on**: T3
**Reuses**: `SlotDetail`, `TimeSlot`, existing dashboard create/edit modal handoff
**Requirement**: WBCW-01, WBCW-02

**Tools**:

- MCP: NONE
- Skill: `coding-guidelines`, `react-best-practices`, `frontend-design`

**Done when**:

- [x] Dashboard agenda exposes `Dia`, `Semana`, and `Calendário`
- [x] Day and week views reuse the existing create/open-session flows
- [x] Month view shows appointment/block indicators and drills into the selected date
- [x] Sunday appears in week navigation and rendering
- [x] Existing notice/edit/create flows still work from the dashboard
- [x] `cd packages/web-bruno && npm run build` exits 0

---

### T5 [P]: Add header-launched agenda blocking

**What**: Let Bruno create and remove full-day or time-range blocks from a single workspace header action, without adding extra block buttons inside the calendar.
**Where**:
- `packages/web-bruno/src/components/agenda/BlockAgendaDialog.tsx`
- `packages/web-bruno/src/components/agenda/CalendarWorkspace.tsx`
- `packages/web-bruno/src/api/settings.ts`
- optional validation updates in `packages/api/src/http/routes/schedule.routes.ts`
**Depends on**: T3
**Reuses**: existing provider absence hooks and schedule endpoints
**Requirement**: WBCW-03

**Tools**:

- MCP: NONE
- Skill: `coding-guidelines`, `react-best-practices`

**Done when**:

- [x] Bruno can open a block flow from a single workspace header action
- [x] Full-day and time-range blocks persist through the existing absence path
- [x] Existing blocks render clearly in the workspace
- [x] The calendar grid does not add extra per-slot or per-cell block buttons
- [x] Removing a block refreshes the workspace state
- [x] Overlapping active-session blocks are rejected with a clear error
- [x] `cd packages/web-bruno && npm run build` and `cd packages/api && npx tsc --noEmit` both exit 0

---

### T6 [P]: Add duration override support to the appointment form

**What**: Apply provider default duration automatically in the session form while allowing Bruno to override it per session.
**Where**:
- `packages/web-bruno/src/components/appointments/AppointmentForm.tsx`
- `packages/web-bruno/src/schemas/appointment.schema.ts`
- `packages/web-bruno/src/api/appointments.ts`
**Depends on**: T3
**Reuses**: existing create/edit modal lifecycle and payment/status validation flow
**Requirement**: WBCW-04

**Tools**:

- MCP: NONE
- Skill: `coding-guidelines`, `react-best-practices`

**Done when**:

- [x] Form preloads default duration from provider workspace config
- [x] Bruno can override duration before saving
- [x] Create/edit mutations send duration input when needed
- [x] Edit mode shows the effective duration derived from the current appointment times
- [x] `cd packages/web-bruno && npm run build` exits 0

---

### T7: Align secondary surfaces with the new workspace model

**What**: Keep `Agendamentos` and `Configurações` aligned with the dashboard workspace after the shell lands.
**Where**:
- `packages/web-bruno/src/pages/AppointmentsPage.tsx`
- `packages/web-bruno/src/components/appointments/AppointmentsWorkbench.tsx`
- `packages/web-bruno/src/pages/SettingsPage.tsx`
**Depends on**: T4, T5, T6
**Reuses**: shared workspace helpers, provider profile update path
**Requirement**: WBCW-01, WBCW-05

**Tools**:

- MCP: NONE
- Skill: `coding-guidelines`, `react-best-practices`

**Done when**:

- [x] `Agendamentos` default week range matches the Monday-through-Sunday workspace week
- [x] Sunday/expanded-hour sessions remain visible in both dashboard and operations list
- [x] Settings page can edit workspace hour window and default duration
- [x] Query refresh keeps both surfaces consistent after create/edit/delete/block actions
- [x] `cd packages/web-bruno && npm run build` exits 0

---

### T8: Verify duration, Sunday, and blocking behavior end to end

**What**: Verify the new workspace behavior across API and `web-bruno`, including default duration, override duration, Sunday visibility, and agenda blocking.
**Where**:
- targeted API tests
- frontend build/manual verification notes
**Depends on**: T7
**Reuses**: existing psychology session and recurrence test patterns
**Requirement**: WBCW-01, WBCW-02, WBCW-03, WBCW-04, WBCW-05

**Tools**:

- MCP: NONE
- Skill: `coding-guidelines`

**Done when**:

- [x] API tests cover default duration and override duration schedule conflicts
- [ ] Manual verification confirms Sunday appears in `Semana` and `Agendamentos`
- [ ] Manual verification confirms month view drills into day/week context
- [ ] Manual verification confirms blocks can be created and removed from the workspace
- [x] Verification notes are recorded in the feature summary or PR

---

## Parallel Execution Map

```
Phase 1 (Sequential):
  T1 ──→ T2 ──→ T3

Phase 2 (Parallel):
  T3 complete, then:
    ├── T4 [P]
    ├── T5 [P]
    └── T6 [P]

Phase 3 (Sequential):
  T4, T5, T6 complete, then:
    T7 ──→ T8
```

---

## Task Granularity Check

| Task | Scope | Status |
|---|---|---|
| T1: Provider workspace config | Prisma + one route/hook contract slice | ✅ Cohesive |
| T2: Duration-aware scheduling | One API scheduling behavior slice | ✅ Cohesive |
| T3: Shared workspace helpers | One frontend foundation slice | ✅ Cohesive |
| T4: Calendar workspace shell | One dashboard UI slice | ✅ Cohesive |
| T5: Header-launched agenda blocking | One interaction slice | ✅ Cohesive |
| T6: Duration override form support | One form/mutation slice | ✅ Cohesive |
| T7: Secondary surface alignment | One integration slice | ✅ Cohesive |
| T8: Verification | One verification slice | ✅ Cohesive |

---

## Verification Notes

- Backend:
  - `cd packages/api && npx prisma generate`
  - `cd packages/api && npx tsc --noEmit`
  - `cd packages/api && npx vitest run src/application/use-cases/booking/__tests__/psychology-session-defaults.use-cases.test.ts src/application/use-cases/booking/__tests__/psychology-session-protocol.use-cases.test.ts src/application/use-cases/booking/__tests__/recurring-series.use-cases.test.ts`
- Frontend:
  - `cd packages/web-bruno && npm run build`
- Manual:
  - Attempted local browser verification on 2026-06-10 after starting a local Vite server
  - In-app browser target was not available in this session, so Sunday/month/blocking flows remain pending manual confirmation
