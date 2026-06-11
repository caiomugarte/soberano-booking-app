# web-bruno Calendar Workspace Context

**Gathered:** 2026-06-10
**Spec:** `.specs/features/web-bruno-calendar-workspace/spec.md`
**Status:** Ready for design

---

## Feature Boundary

This feature replaces Bruno's hardcoded weekly agenda shell with a reusable calendar workspace that:

- shows Sunday consistently
- supports day/week/month navigation
- expands the visible hour window without scattered constant edits
- allows agenda blocking from the workspace without cluttering the calendar grid
- applies a default session duration automatically while still allowing per-session overrides

It does not redesign financial flows, recurrence semantics, or customer-facing booking.

---

## Implementation Decisions

### Duration model

- New Bruno sessions start with an automatic default duration.
- Bruno can override that duration for a specific session before saving.
- The persisted schedule must follow the selected duration, not only a visual grid assumption.
- Historical appointments keep rendering from stored `startTime` and `endTime` even if they still reflect the older 50-minute model.

### Workspace configuration

- The workspace model should be explicit, not inferred only from shifts.
- For v1, the provider profile/settings contract is the preferred home for workspace configuration.
- The first explicit settings focus is:
  - visible agenda start hour
  - visible agenda end hour
  - default session duration
- Sunday support should be part of the shared Bruno workspace behavior instead of remaining an accidental hidden backend capability.

### Calendar views and actions

- `Dia`, `Semana`, and `Calendário` belong to the same agenda workspace.
- `Calendário` should be navigational first:
  - show appointment/block indicators
  - let Bruno drill into a chosen date
- Blocking should be launched from one workspace header action, not from extra controls inside calendar cells, rows, or day columns.
- Existing session correction flows should stay reused from the workspace instead of being duplicated.

### Blocking behavior

- Bruno should be able to block full days or time ranges from the agenda workspace itself.
- The block flow should start from a single header action to avoid adding too much information inside the calendar.
- A blocked period must be visible in all workspace views.
- Blocking cannot silently overlap active sessions; the system must reject or force prior resolution.

### Hour model

- The workspace should use fixed hourly start slots so Bruno can expand the agenda day cleanly.
- Duration override changes how long the session occupies the calendar after the chosen start slot; it does not require abandoning the hour-based workspace navigation.

### Agent's Discretion

- Exact view-switcher styling and layout hierarchy
- Exact month-view indicator density, as long as appointment/block presence stays clear
- Exact duration-input UI control, as long as it preserves default-plus-override behavior

---

## Specific References

- Bruno needs custom session duration support, but the system should still set the default automatically and only use a custom value when he changes it manually.

---

## Deferred Ideas

- Direct block actions from month/day/week calendar cells
- A generic shared calendar workspace for other tenants/packages
- More advanced recurrence-wide duration editing beyond the selected recurring rule contract
