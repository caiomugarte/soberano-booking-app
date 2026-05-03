# Quick Task 002: Fix Admin Absence Date Min Timezone

**Date:** 2026-05-02
**Status:** Done

## Description

Make the admin schedule absence date input use the Campo Grande business day instead of UTC so the `min` date does not jump a day ahead near midnight.

## Files Changed

- `packages/web/src/lib/format.ts` — added a helper to format today in `America/Campo_Grande`
- `packages/web/src/pages/admin/SchedulePage.tsx` — switched the absence form's `today` value to the new helper

## Verification

- [x] The admin absence form derives `today` from `America/Campo_Grande`
- [x] `npm -w @soberano/web run build`

## Commit

`not committed`
