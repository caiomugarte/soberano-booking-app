# Customer Packages Management Rescope

**Tags:** web, api, packages, providers, lifecycle, flow
**Discovered:** 2026-05-27

## What Changed

The original customer-packages work covered package creation, package selection during manual booking, and a basic package list page. The current Soberano follow-up request expands that into a package-management workflow.

## Key Discoveries

- `packages/api/prisma/schema.prisma:model CustomerPackage` has `tenantId` but no `providerId`
- `packages/api/src/http/routes/admin.routes.ts` currently lists packages by tenant when `phone` is absent
- `packages/api/src/infrastructure/database/repositories/prisma-customer-package.repository.ts:incrementUsedCount()` marks a package `completed` as soon as `usedCount >= totalUses`
- `packages/web/src/components/admin/BookFromPackageModal.tsx` already provides a package-scoped sequential booking flow and is the best base for a shared package workspace modal

## Why This Matters

Two requested behaviors cannot be implemented correctly as web-only changes:

1. **Provider-owned packages**
   - The frontend cannot reliably hide or protect another provider's packages when the API and schema do not model ownership.
2. **Active until the last future booking happens**
   - The current package lifecycle is decided in the repository at credit-allocation time, not from future linked appointments.

## Recommended Direction

- Keep `AdminBookingModal` for the general booking flow with inline package selection
- Reuse/refactor `BookFromPackageModal` into a shared package workspace modal for:
  - post-create immediate scheduling
  - package details from `PackagesPage`
  - package-linked booking management
- Add provider ownership and lifecycle support to the API before implementing the final UI behavior

## Implementation Anchors

- `packages/api/prisma/schema.prisma:model CustomerPackage` now carries `providerId` and provider-scoped indexes
- `packages/api/src/infrastructure/database/repositories/prisma-customer-package.repository.ts` now owns the lifecycle reevaluation rule:
  - stay `active` while `usedCount < totalUses`
  - or while any future non-cancelled linked appointment still exists
  - otherwise become `completed`
- `packages/api/src/http/routes/admin.routes.ts` now reevaluates package lifecycle after package-linked admin create, status change, reschedule, cancel, and delete mutations
- `packages/web/src/components/admin/PackageWorkspaceModal.tsx` is now the shared package-first modal for both post-create scheduling and packages-page details
- `packages/web/src/components/admin/AdminAppointmentCard.tsx`, `AdminEditAppointmentModal.tsx`, and `AdminAppointmentManagementDialogs.tsx` are the reusable admin booking-management pieces that the package workspace can compose instead of duplicating dashboard logic
