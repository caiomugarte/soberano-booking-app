# web-bruno Recurring Session Series Specification

## Problem Statement

`packages/web-bruno` currently treats recurring sessions as a finite batch created by `POST /api/psychology/sessions/batch`. The form sends a `weeks` count, the backend creates only that many weekly rows, and after the horizon ends the future agenda becomes empty again.

That creates two operational risks for Bruno's psychology flow:

1. A regular patient's fixed slot stops appearing in the future agenda unless Bruno recreates it manually.
2. The AI availability flow can offer that slot to another patient once the pre-created rows run out, because availability is driven by concrete `appointments` in the database.

## Scope Decision

This change should use `tlc-spec-driven` in **complex scope**.

Why:

- It is not a frontend-only change; it touches `packages/web-bruno`, `packages/api`, and Prisma persistence.
- The current recurrence behavior is coupled to AI slot discovery, so the fix affects booking integrity, not just UI ergonomics.
- We need at least one non-trivial architecture decision: how to represent an ongoing recurring series without pre-creating infinite appointments.
- The current finite-batch endpoint (`/psychology/sessions/batch`) is the wrong abstraction for the new requirement and should no longer drive recurring scheduling.

## Goals

- [ ] Bruno can create an ongoing recurring session that remains active until he explicitly stops it.
- [ ] Recurring cadence supports "every N weeks", including weekly (`1`) and biweekly (`2`).
- [ ] The future agenda never goes empty for an active recurring patient within the booking horizon used by Bruno and the AI.
- [ ] AI slot availability never treats an active recurring patient's fixed slot as free inside the protected future horizon.
- [ ] Bruno can stop a recurring series without deleting historical completed sessions.

## Out of Scope

| Feature | Reason |
|---|---|
| Editing cadence for all future occurrences after creation | Important, but not required to solve the immediate empty-future-agenda risk |
| One-off skip/exceptions for a single future occurrence in a series | Separate recurrence-exceptions problem |
| Monthly financial-plan billing automation | Different business workflow from session reservation |
| Rewriting existing package/session payment flows | Unrelated to recurring-slot persistence |
| Infinite pre-creation of appointments | Operationally unsafe and unnecessary |

---

## User Stories

### P1: Create an ongoing recurring series ⭐ MVP

**User Story**: As Bruno, I want to create a recurring session that repeats every N weeks until I stop it, so a regular patient's fixed slot stays reserved without manual re-creation.

**Why P1**: This is the core business problem and removes the current failure mode caused by a finite `weeks` counter.

**Acceptance Criteria**:

1. WHEN Bruno creates a session with recurrence enabled THEN the system SHALL persist a recurring-series rule instead of only a finite batch count.
2. WHEN Bruno chooses recurrence interval `1` THEN the system SHALL treat the series as weekly.
3. WHEN Bruno chooses recurrence interval `2` THEN the system SHALL treat the series as biweekly.
4. WHEN a recurring series is created THEN the system SHALL materialize future appointment rows for that series inside a rolling protected horizon.
5. WHEN the protected horizon advances THEN the system SHALL replenish future appointment rows automatically while the series remains active.
6. WHEN a slot in the protected horizon is already occupied by another non-cancelled appointment THEN the system SHALL reject the conflicting occurrence creation instead of silently treating the series as fully scheduled.

**Independent Test**: Create a weekly series starting on a known date, advance the protected horizon in a test fixture or job run, and confirm the series continues to produce future `appointments` without manual re-creation.

---

### P1: Stop future recurrence without erasing history ⭐ MVP

**User Story**: As Bruno, I want to stop a recurring slot from continuing in the future, so I can end a regular patient's fixed reservation without losing past session history.

**Why P1**: "Until I delete it" must be supported explicitly, otherwise the new series model cannot be safely operated.

**Acceptance Criteria**:

1. WHEN Bruno stops a recurring series THEN the system SHALL prevent creation of new future occurrences after the chosen stop point.
2. WHEN Bruno stops a recurring series THEN the system SHALL keep historical appointments already in the past unchanged.
3. WHEN Bruno stops a recurring series THEN the system SHALL remove or cancel future occurrences belonging to that series from the stop point onward.
4. WHEN Bruno opens an appointment that belongs to an active recurring series THEN the UI SHALL indicate that the slot is part of a recurrence.

**Independent Test**: Create a biweekly series, stop it from a future date, and confirm past occurrences remain while future ones disappear from the agenda and no longer block new generation.

---

### P2: Keep agenda and AI availability consistent

**User Story**: As Bruno, I want the agenda and AI availability to reflect the same recurring reservations, so I do not forget fixed patients or accidentally free their slots.

**Why P2**: The business pain is not only visual; it directly affects customer-facing availability.

**Acceptance Criteria**:

1. WHEN an active recurring series exists THEN weekly agenda queries SHALL return its materialized future occurrences normally through the existing sessions list.
2. WHEN AI checks slot availability inside its supported search window THEN the recurring patient's slot SHALL appear unavailable for matching occurrence dates.
3. WHEN the system cannot materialize one or more future occurrences for an active series THEN the backend SHALL surface that mismatch explicitly instead of silently succeeding with an incomplete schedule.
4. WHEN Bruno creates a recurring series THEN the UI SHALL show clear success feedback describing the cadence and that the recurrence stays active until stopped.

**Independent Test**: After creating a recurring series, query both the agenda week and the availability endpoint for a future occurrence date and confirm both reflect the slot as occupied.

---

### P2: Replace the current finite-weeks recurrence UX

**User Story**: As Bruno, I want the recurrence control to describe cadence instead of "create 4/5/6 weeks", so the form matches how recurring patients actually work.

**Why P2**: The current UI encodes the wrong mental model and directly caused the production issue.

**Acceptance Criteria**:

1. WHEN Bruno enables recurrence in `AppointmentForm` THEN the UI SHALL ask for recurrence cadence ("every N weeks") instead of a total number of weeks to generate.
2. WHEN recurrence is disabled THEN the form SHALL continue to create a single non-recurring session as it does today.
3. WHEN Bruno creates a recurring session THEN the frontend SHALL call a recurring-series API instead of the finite `/psychology/sessions/batch` endpoint.
4. WHEN Bruno edits or views an occurrence that belongs to a recurring series THEN the UI SHALL show recurrence metadata for context.

**Independent Test**: Open the session form, verify the old "X semanas" batch input is gone, create a weekly recurring session, and confirm the request uses the new recurring-series contract.

## Edge Cases

- WHEN the recurrence start date conflicts with an existing non-cancelled session THEN system SHALL reject the series creation with a conflict error.
- WHEN a future occurrence conflicts during rolling replenishment THEN system SHALL record and expose the conflict instead of silently leaving the recurring slot unprotected.
- WHEN Bruno stops a series after some future occurrences were already materialized THEN system SHALL remove or cancel only the future rows from the chosen stop point onward.
- WHEN a single occurrence is edited manually THEN system SHALL preserve the immediate appointment edit, even if series-wide editing remains out of scope.
- WHEN availability is queried beyond the protected horizon THEN system SHALL either extend the horizon first or document that the supported booking window stays inside the protected horizon.

## Requirement Traceability

| Requirement ID | Story | Phase | Status |
|---|---|---|---|
| WRSS-01 | P1: Create an ongoing recurring series | Pending | Pending |
| WRSS-02 | P1: Stop future recurrence without erasing history | Pending | Pending |
| WRSS-03 | P2: Keep agenda and AI availability consistent | Pending | Pending |
| WRSS-04 | P2: Replace the current finite-weeks recurrence UX | Pending | Pending |

**Coverage**: 4 total, 0 mapped to tasks, 4 unmapped

## Success Criteria

- [ ] An active recurring patient still appears in future agenda weeks without manual re-creation.
- [ ] AI slot discovery within its supported future window does not offer a recurring patient's fixed slot to other patients.
- [ ] Bruno can stop a recurrence cleanly without deleting past session history.
- [ ] The old finite-batch recurrence flow is no longer the path used by `web-bruno`.
