# Quick Task 004: Make Web Bruno Patient Email Optional

**Date:** 2026-05-04
**Status:** Done

## Description

Allow the `web-bruno` patient form to submit without an email by omitting blank email values on create and clearing them correctly on edit.

## Files Changed

- `packages/web-bruno/src/components/patients/PatientForm.tsx` — normalize blank email values before submitting create and update requests
- `packages/web-bruno/src/api/patients.ts` — align the frontend update payload type with the API patch contract

## Verification

- [x] Creating a patient with an empty email no longer sends `email: ''`
- [x] Editing a patient can clear an existing email by submitting a blank email field
- [x] `npm --prefix packages/web-bruno run build`

## Commit

`not committed`
