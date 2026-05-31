# Quick Task 005: Highlight Web Bruno Agenda Session Types

**Date:** 2026-05-18
**Status:** Done

## Description

Show `Psicoterapia` and `Neuromodulação` with distinct visual cues in the `web-bruno` weekly agenda so Bruno can identify the session type faster on the calendar without confusing it with status badges.

## Files Changed

- `packages/web-bruno/src/components/agenda/TimeSlot.tsx` — replace the plain session type text with a neutral meta label plus a type-specific color dot

## Verification

- [x] Weekly agenda cards show `Psicoterapia` with a dedicated type indicator that does not reuse status/payment badge styling
- [x] Weekly agenda cards show `Neuromodulação` with a dedicated type indicator that does not conflict with the `Pendente` payment badge
- [x] `npm --prefix packages/web-bruno run build`

## Commit

`not committed`
