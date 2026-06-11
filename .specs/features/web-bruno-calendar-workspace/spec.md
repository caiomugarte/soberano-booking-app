# web-bruno Calendar Workspace Specification

## Problem Statement

`packages/web-bruno` still treats Bruno's agenda as a hardcoded weekly grid. The visible hours come from `TIME_SLOTS`, the slot math still assumes a fixed `SESSION_DURATION_MINUTES`, and visible days still come from a Monday-to-Saturday `DAYS_OF_WEEK` constant reused by the dashboard, appointment form, settings screen, and appointment workbench defaults.

That leaves Bruno with three operational gaps:

1. Sunday can already exist in backend shifts and appointment data, but the frontend still hides it.
2. Off-hour or expanded-day scheduling keeps requiring code edits because the workspace model is not centralized.
3. Bruno cannot switch between day/week/calendar views or block time directly from the agenda workspace.

Saturday is no longer the real scope boundary. The remaining gap is a reusable calendar/workspace model that supports Sunday, expanded hours, a clean multi-view shell, and agenda blocking without relying on scattered hardcoded constants.

## Scope Decision

This change should use `tlc-spec-driven` in **complex scope**.

Why:

- It is larger than a direct UI tweak. The current hardcoding leaks through `DashboardPage`, `WeeklyGrid`, `AppointmentForm`, `AppointmentsPage`, `SettingsPage`, and `lib/slots`.
- It introduces at least one architecture decision: whether the workspace model is stored explicitly in settings/config or derived from existing schedule data.
- It includes ambiguous user-facing behavior that should be clarified before implementation: how default duration and overrides should persist, how the month calendar should behave, and how agenda blocking should stay available without overloading the calendar UI.
- Existing specs cover recurrence and event correction, but not a new calendar workspace shell with multi-view navigation and blocking controls.

This should be specified first, then clarified through `context.md` if needed, then moved into design/tasks before implementation. It is not a safe "implement directly" change.

## Goals

- [ ] Bruno has a real agenda workspace with `Dia`, `Semana`, and `Calendário` views.
- [ ] Sunday is visible and manageable everywhere the Bruno agenda currently depends on hardcoded weekday lists.
- [ ] Visible hours and slot generation stop depending on scattered frontend constants.
- [ ] Bruno can block and unblock agenda time directly from the agenda workspace.
- [ ] The Bruno workspace applies a default session duration automatically, but Bruno can override it per session when needed.
- [ ] Existing correction flows (detail, edit, payment, recurrence stop) continue to work from the new workspace.

## Out of Scope

| Feature | Reason |
|---|---|
| Rebuilding `SlotDetail` payment/status semantics | Already covered by `web-bruno-agenda-event-management` |
| Changing recurring protected-horizon rules | Already covered by `web-bruno-recurring-session-series` |
| Financial dashboard redesign | Separate flow |
| Multi-provider side-by-side calendar | Not requested |
| Public booking/customer calendar changes | Admin-only Bruno workspace |
| Protocol accounting or receivables logic | Separate specs already exist |
| A generic shared calendar system for every tenant | This spec is driven by Bruno's current workspace gap |

---

## User Stories

### P1: Replace the hardcoded agenda model with a shared workspace model ⭐ MVP

**User Story**: As Bruno, I want the agenda days, hours, and slot options to come from one workspace model so I can expand the schedule without editing several files every time.

**Why P1**: This is the structural fix behind Sunday support, expanded hours, and every future agenda view.

**Acceptance Criteria**:

1. WHEN the Bruno workspace defines visible days and hours THEN the dashboard agenda, appointment time selectors, and default agenda/workbench week ranges SHALL use that same model instead of independent hardcoded constants.
2. WHEN the visible hour window starts before `08:00` or ends after `17:00` THEN the agenda SHALL render those extra hours without requiring more hardcoded `TIME_SLOTS` edits.
3. WHEN Sunday is enabled in the workspace THEN the mobile day selector, desktop week grid, settings day list, and default current-week range SHALL include Sunday.
4. WHEN an appointment already exists inside the workspace window but outside the old hardcoded slot list THEN the agenda SHALL still render it in the correct hour block.
5. WHEN Bruno opens a time selector to create or edit a session THEN the available start times SHALL come from the shared workspace model instead of a constant array.

**Independent Test**: Expand the workspace to include Sunday and a later hour such as `19:00`, then confirm the agenda UI and appointment form both expose and render that slot consistently.

---

### P1: Switch between day, week, and calendar views ⭐ MVP

**User Story**: As Bruno, I want `Dia`, `Semana`, and `Calendário` views so I can inspect dense days, manage the current week, and browse future periods from one workspace.

**Why P1**: A week-only grid is no longer enough once the workspace expands in days and hours.

**Acceptance Criteria**:

1. WHEN Bruno opens the agenda workspace THEN the UI SHALL expose a view switcher with `Dia`, `Semana`, and `Calendário`.
2. WHEN Bruno changes the active view THEN the selected reference date SHALL stay in context instead of resetting unexpectedly.
3. WHEN `Dia` is selected THEN the workspace SHALL show one day's hourly agenda with the same create/open-session entry points available in the current weekly grid.
4. WHEN `Semana` is selected THEN the workspace SHALL show a seven-day view that can include Sunday.
5. WHEN `Calendário` is selected THEN the workspace SHALL show a monthly calendar with visible indicators for appointments and blocked days/periods.
6. WHEN Bruno clicks a day in the monthly calendar THEN the system SHALL let him drill into that date without losing context.

**Independent Test**: Open a date with appointments, switch across `Dia`, `Semana`, and `Calendário`, and confirm the same date remains navigable with visible appointment indicators.

---

### P1: Block the agenda from a single workspace header action ⭐ MVP

**User Story**: As Bruno, I want to block a full day or a time range from the agenda workspace header so I do not have to leave the calendar to close availability, without cluttering the calendar itself.

**Why P1**: The current absence flow lives in settings, which breaks the operational calendar workflow.

**Acceptance Criteria**:

1. WHEN Bruno opens the agenda workspace THEN the header SHALL expose a single `Bloquear agenda` action.
2. WHEN Bruno uses the header action THEN the UI SHALL let him define the target date plus either a full-day block or a time-range block.
3. WHEN the block form is opened THEN the calendar grid itself SHALL NOT add extra per-slot or per-cell block buttons that increase visual noise.
4. WHEN Bruno confirms a full-day or time-range block THEN the system SHALL persist that block through the existing provider-absence model or its approved replacement.
5. WHEN a block exists THEN the day, week, and calendar views SHALL render that period as unavailable.
6. WHEN Bruno tries to create a session from the workspace inside a blocked period THEN the UI SHALL prevent the action and explain that the period is blocked.
7. WHEN Bruno opens an existing block from the workspace THEN he SHALL be able to remove it there without returning to `Configurações`.
8. WHEN Bruno tries to block a period that already contains active sessions THEN the system SHALL refuse the block or require those sessions to be resolved first instead of silently creating an overlapping block.

**Independent Test**: Use the header `Bloquear agenda` action to block Sunday from `14:00` to `16:00`, confirm the slot renders as blocked in every view, and remove the block without opening `Configurações`.

---

### P1: Use a default duration with optional per-session override ⭐ MVP

**User Story**: As Bruno, I want new sessions to start with a default duration but still be editable when a case needs more or less time, so the workspace stays fast for normal bookings without blocking exceptions.

**Why P1**: Bruno wants predictable defaults, but a rigid fixed-duration rule would break real scheduling cases that need custom lengths.

**Acceptance Criteria**:

1. WHEN Bruno creates a new psychology session THEN the form SHALL prefill the configured default duration automatically.
2. WHEN Bruno wants a different duration for a specific session THEN the form SHALL let him override that duration before saving.
3. WHEN a session is saved THEN the stored `endTime` SHALL be derived from `startTime + selected duration`, whether that duration came from the default or a manual override.
4. WHEN recurring-series creation or update flows materialize future occurrences THEN those occurrences SHALL respect the selected duration stored for that recurring rule.
5. WHEN slot conflicts are evaluated THEN overlapping sessions SHALL remain blocked correctly based on the persisted `startTime` and `endTime`, including custom durations.
6. WHEN historical 50-minute appointments still exist THEN the agenda SHALL render their stored `startTime` and `endTime` correctly until any optional normalization work is completed.

**Independent Test**: Save one session using the default duration and another with a manual override, verify both persist with the expected `endTime`, and confirm overlapping sessions are still rejected.

---

### P2: Keep the calendar workspace and appointment operations surface aligned

**User Story**: As Bruno, I want the new calendar workspace and the `Agendamentos` list to agree on the same week boundaries and appointment visibility so I can trust either surface.

**Why P2**: The current appointment workbench still derives its default week end from the same hardcoded weekday constant, so Sunday and expanded-hour fixes must stay consistent across both entry points.

**Acceptance Criteria**:

1. WHEN the current-week defaults are generated for the `Agendamentos` surface THEN the default period SHALL match the same Monday-through-Sunday workspace week shown in `Semana`.
2. WHEN a Sunday or expanded-hour appointment exists THEN it SHALL be visible both in the calendar workspace and in the `Agendamentos` list for the same date range.
3. WHEN Bruno creates, edits, deletes, or blocks time from the calendar workspace THEN the affected queries SHALL refresh so both the workspace and the operations list remain consistent.

**Independent Test**: Create a Sunday evening session from the agenda workspace and confirm it appears in both the weekly calendar and the `Agendamentos` list for that week.

## Edge Cases

- WHEN `useWeekAppointments()` already fetches Sunday but the old UI model still hides it THEN the new workspace SHALL surface that Sunday data without requiring a different query contract.
- WHEN a week crosses a month boundary THEN `Semana` and `Calendário` SHALL keep the same selected date context instead of jumping unexpectedly.
- WHEN Bruno has an appointment outside provider shifts but inside the expanded workspace hours THEN the workspace SHALL still render the appointment instead of hiding it.
- WHEN a blocked full day exists with no appointments on it THEN the monthly calendar SHALL still show that day as blocked.
- WHEN a historical Bruno appointment still uses a 50-minute interval THEN the new agenda SHALL render its stored times instead of forcing it into a broken 60-minute display.
- WHEN Bruno removes a block or edits a session from one view THEN the other visible workspace views SHALL refresh consistently.

## Implementation Notes

### Current hardcoded hotspots

- [packages/web-bruno/src/config/constants.ts](/Users/caio.mugarte/Documents/projetos/soberano/packages/web-bruno/src/config/constants.ts)
  - `TIME_SLOTS`
  - `SESSION_DURATION_MINUTES`
  - `DAYS_OF_WEEK`
- [packages/web-bruno/src/components/agenda/WeeklyGrid.tsx](/Users/caio.mugarte/Documents/projetos/soberano/packages/web-bruno/src/components/agenda/WeeklyGrid.tsx)
  - week-only layout
  - hardcoded day iteration
  - hardcoded time-row iteration
- [packages/web-bruno/src/components/appointments/AppointmentForm.tsx](/Users/caio.mugarte/Documents/projetos/soberano/packages/web-bruno/src/components/appointments/AppointmentForm.tsx)
  - create/edit time options still come from `TIME_SLOTS`
- [packages/web-bruno/src/pages/AppointmentsPage.tsx](/Users/caio.mugarte/Documents/projetos/soberano/packages/web-bruno/src/pages/AppointmentsPage.tsx)
  - default week range ends at `DAYS_OF_WEEK.length - 1`, which is still Saturday today
- [packages/web-bruno/src/pages/SettingsPage.tsx](/Users/caio.mugarte/Documents/projetos/soberano/packages/web-bruno/src/pages/SettingsPage.tsx)
  - day selection and grouped rendering still depend on the Monday-to-Saturday constant
- [packages/web-bruno/src/lib/slots.ts](/Users/caio.mugarte/Documents/projetos/soberano/packages/web-bruno/src/lib/slots.ts)
  - slot generation and `endTime` math still assume the old constants

### Likely frontend changes

- Replace the week-only `WeeklyGrid` shell with a reusable agenda workspace that can render:
  - day view
  - week view
  - monthly calendar view
- Centralize the Bruno workspace model so days, visible hour window, slot size, and active view/date are not duplicated across components.
- Update `AppointmentForm` and package slot entry flows to consume workspace time options rather than a hardcoded array.
- Reuse the existing absence hooks from `packages/web-bruno/src/api/settings.ts` inside the workspace so blocking can happen from a single agenda-header action instead of from buttons inside the calendar grid.
- Keep `SlotDetail`, edit, payment, and stop-recurrence flows wired into the new workspace rather than re-implementing those actions in parallel.

### Likely backend or data changes

- Sunday support already exists in the schedule API contract (`dayOfWeek: 0..6`), so the Sunday gap is primarily frontend.
- If Bruno gets default duration plus per-session overrides, the API and persistence model need to separate:
  - workspace or service default duration
  - session-level chosen duration for each created appointment or recurring rule
  - conflict handling based on persisted `startTime` and `endTime`
- Bruno's existing duration-driven use cases and seed data are still part of this scope:
  - [packages/api/src/infrastructure/database/seed-bruno.ts](/Users/caio.mugarte/Documents/projetos/soberano/packages/api/src/infrastructure/database/seed-bruno.ts)
  - [packages/api/src/application/use-cases/booking/create-psychology-session.ts](/Users/caio.mugarte/Documents/projetos/soberano/packages/api/src/application/use-cases/booking/create-psychology-session.ts)
  - [packages/api/src/application/use-cases/booking/update-psychology-session.ts](/Users/caio.mugarte/Documents/projetos/soberano/packages/api/src/application/use-cases/booking/update-psychology-session.ts)
  - recurring-series use cases already derive `endTime` from service duration and would need to inherit the new default/override contract once the data model is aligned
- If the workspace model becomes explicit instead of being derived, the settings/profile API will need a read/write contract for it.
- Inline blocking may need backend validation so an absence cannot be created on top of active appointments without explicit resolution.

## Open Questions

1. Duration rule for new Bruno sessions:
   Decision captured: use an automatic default duration, but allow Bruno to override it per session when needed.
   Follow-up for design: confirm whether the default belongs to the workspace config, to each service, or both with precedence rules.

2. Should the workspace model live in explicit Bruno settings/config, or be derived entirely from existing shifts?
   Recommendation: prefer explicit workspace configuration. Bruno's psychology session API does not currently enforce shifts, so deriving the internal calendar window only from shifts could still hide legitimate off-shift appointments.

3. Blocking entry point inside the workspace:
   Decision captured: keep a single `Bloquear agenda` action in the workspace header and do not add extra block buttons inside the calendar grid.

## Requirement Traceability

| Requirement ID | Story | Phase | Status |
|---|---|---|---|
| WBCW-01 | P1: Replace the hardcoded agenda model with a shared workspace model | Design | Pending |
| WBCW-02 | P1: Switch between day, week, and calendar views | Design | Pending |
| WBCW-03 | P1: Block the agenda directly from the agenda workspace | Design | Pending |
| WBCW-04 | P1: Use a default duration with optional per-session override | Design | Pending |
| WBCW-05 | P2: Keep the calendar workspace and appointment operations surface aligned | Design | Pending |

**Coverage**: 5 total, 0 mapped to tasks, 5 unmapped

## Success Criteria

- [ ] Bruno can navigate `Dia`, `Semana`, and `Calendário` views from one agenda workspace.
- [ ] Sunday appointments and blocks are visible in the Bruno agenda without special-case code paths.
- [ ] Expanded hours no longer depend on editing multiple hardcoded `TIME_SLOTS` consumers.
- [ ] Bruno can block and unblock agenda time from the workspace header without adding extra block controls inside the calendar grid.
- [ ] New Bruno sessions use the approved default-duration-plus-override model consistently across create, edit, recurrence, and conflict checks.
