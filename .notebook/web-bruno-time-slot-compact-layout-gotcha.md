# web-bruno Time Slot Compact Layout Gotcha

**Tags:** psychology, web-bruno, agenda, calendar, layout, gotcha
**Discovered:** 2026-06-11

## Surface

- `packages/web-bruno/src/components/agenda/TimeSlot.tsx`
- `packages/web-bruno/src/components/agenda/CalendarWorkspace.tsx`
- `packages/web-bruno/src/components/agenda/WeeklyGrid.tsx`

## Gotcha

- Compact agenda cards are reused for one-hour blocks in both day and week views.
- The card container is fixed-height in those views, while badge pills are `shrink-0` and `whitespace-nowrap`.
- If the patient/time rows remain shrinkable, extra metadata (`type`, `recurrence`, status, payment) can force flexbox to compress the text rows first, which visually clips the patient name.

## Current Fix Anchor

- `packages/web-bruno/src/components/agenda/TimeSlot.tsx`
  - compact mode keeps patient/time/meta rows `shrink-0`
  - compact mode collapses type + recurrence into a lighter text row
  - status/payment remain in the badge footer with denser compact sizing

**Updated:** 2026-06-11
