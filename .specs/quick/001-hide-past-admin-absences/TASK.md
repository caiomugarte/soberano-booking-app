# Quick Task 001: Hide Past Admin Absences

**Date:** 2026-05-02
**Status:** Done

## Description

Hide past provider absences from the admin schedule page without deleting historical records from the database.

## Files Changed

- `packages/api/src/http/routes/schedule.routes.ts` — filter admin absence responses to today-and-future records only
- `packages/web/src/pages/admin/SchedulePage.tsx` — render the absence list returned by the API without re-filtering in the page

## Verification

- [x] `GET /admin/schedule/absences` only returns today-and-future absences for the authenticated provider
- [x] The admin schedule page still renders upcoming absences and the existing empty state correctly
- [x] `npm -w @soberano/api run build`
- [x] `npm -w @soberano/web run build`

## Commit

`not committed`
