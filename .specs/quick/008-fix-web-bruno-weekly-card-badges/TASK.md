# Quick Task 008: Fix Web Bruno Weekly Card Badges

**Date:** 2026-06-11
**Status:** Done

## Description

Reorganize the compact `web-bruno` agenda card metadata so weekly-view cards keep the patient name readable even when the session also shows recurrence, status, and payment tags.

## Files Changed

- `packages/web-bruno/src/components/agenda/TimeSlot.tsx` — reserve fixed space for the patient/time rows and condense compact card metadata so badges stop squeezing the name line

## Verification

- [x] Compact agenda cards keep the patient and time rows visible instead of letting extra tags compress the text vertically
- [x] Compact cards show session type and recurrence in a lighter metadata row while status and payment remain in the badge footer
- [x] `npm run build` in `packages/web-bruno`

## Commit

`not committed`
