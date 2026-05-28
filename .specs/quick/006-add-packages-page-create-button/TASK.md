# Quick Task 006: Add Packages Page Create Entry Point

**Date:** 2026-05-28
**Status:** Done

## Description

Add a mobile-friendly package creation entry point to `PackagesPage` so providers can start package creation directly from the package management screen and continue into the existing package workspace after creation.

## Files Changed

- `packages/web/src/pages/admin/PackagesPage.tsx` — replace the header-area `Novo Pacote` placement with a dashboard-style floating action entry point and reuse the existing `AdminPackageModal` to `PackageWorkspaceModal` handoff
- `packages/web/src/pages/admin/__tests__/PackagesPage.test.tsx` — cover opening the floating action menu, launching package creation, and continuing into the workspace after a successful create

## Verification

- [x] `PackagesPage` shows a mobile-friendly floating package action without changing the existing filter and search flow
- [x] Opening the floating action menu and choosing `+ Pacote` opens the package creation modal
- [x] Successful package creation continues into the package workspace in schedule mode
- [x] `npm -w @soberano/web run test -- PackagesPage`
- [x] `npm -w @soberano/web run build`

## Commit

`not committed`
