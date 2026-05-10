# Quick Task 003: Reset Web Bruno Patient Form

**Date:** 2026-05-04
**Status:** Done

## Description

Reset the `web-bruno` patient modal fields whenever it opens so creating a new patient does not reuse the previous patient's values.

## Files Changed

- `packages/web-bruno/src/components/patients/PatientForm.tsx` — reset local form state on modal open and disable form autofill hints

## Verification

- [x] Opening `Novo Paciente` after closing or saving starts with empty fields again
- [x] Opening `Editar Paciente` still loads the current patient's data
- [x] `npm --prefix packages/web-bruno run build`

## Commit

`not committed`
