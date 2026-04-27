---
name: Booking TimeStep — week navigation anchor mismatch
description: getWeekDates is today-anchored; weekOffset must be computed from today, not from Monday
type: gotcha
---

## Gotcha: two different week anchors

`getWeekDates(offset)` in `lib/format.ts` is **today-anchored**:
- offset=0 → today … today+6
- offset=1 → today+7 … today+13

The auto-advance logic in `TimeStep.tsx` (skips to the first day the barber works on mount) must compute weekOffset using the **same anchor** — i.e., diff from today, not from Monday of the current calendar week.

Using a Monday-anchored diff caused the week view to jump one week ahead whenever today was Sunday and the next available day was Monday of the next calendar week.

**Fixed in hotfix/wrong-weekly-choosing:** `TimeStep.tsx` line ~39 — compute `diffDays` from `today`, not `mondayThisWeek`.

Note: `getAdminWeekDates` (also in `lib/format.ts`) IS Monday-anchored — do not mix the two.
