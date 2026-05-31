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
- `packages/api/src/http/routes/admin.routes.ts:PATCH /admin/packages/:id/deactivate` currently only flips the package status to `cancelled`; it does not inspect or cancel linked appointments
- `packages/api/src/infrastructure/jobs/reminder.job.ts` selects upcoming appointments by appointment status alone, so a deactivated package can still generate customer and barber reminders unless its future linked bookings are cancelled too
- `packages/api/src/infrastructure/notifications/whatsapp-notification.service.ts` has no package-specific barber reminder for “collect the package payment now”; existing barber messaging covers only booked, changed, cancelled, and generic upcoming reminders

## Why This Matters

Two requested behaviors cannot be implemented correctly as web-only changes:

1. **Provider-owned packages**
   - The frontend cannot reliably hide or protect another provider's packages when the API and schema do not model ownership.
2. **Active until the last future booking happens**
   - The current package lifecycle is decided in the repository at credit-allocation time, not from future linked appointments.
3. **Deactivate package without touching history**
   - The current package deactivation route does not distinguish future linked bookings from appointments that already happened.
   - Without an API-side cascade, the web can warn about cancellation, but it cannot actually stop future reminders or keep past appointment history intact by rule.
4. **Remind the barber to collect package payment**
   - The current lifecycle code knows when a package stops having future linked bookings, but it does not trigger a package-closing business notification.
   - The right hook is the package-linked appointment status flow when a `completed` mutation causes the package to transition from `active` to `completed`.

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
  - or while any linked appointment still in `confirmed` exists
  - otherwise become `completed`
- A package-linked booking created for a past or already-started slot must also keep the package `active` until that booking is finalized; otherwise the package can be marked `completed` at creation time and the later `completed` mutation never triggers `sendPackagePaymentReminder()`
- `packages/api/src/application/use-cases/booking/package-lifecycle-manager.ts` now sends the provider reminder when the last open booking is transitioned from `confirmed` to `completed` and the package ends in `completed`, even if the package row was already prematurely marked `completed`
- `packages/api/src/http/routes/admin.routes.ts` now reevaluates package lifecycle after package-linked admin create, status change, reschedule, cancel, and delete mutations
- `packages/api/src/application/use-cases/booking/package-lifecycle-manager.ts` is the shared lifecycle helper used by the admin create flow and the package-aware admin mutation routes
- `packages/api/src/application/use-cases/booking/deactivate-package.ts` is the package-deactivation orchestration path for customer-facing effects:
  - it gathers the future confirmed linked bookings before deactivation
  - calls `CustomerPackageRepository.deactivate()`
  - reloads each cancelled booking through `AppointmentRepository.findById()`
  - reuses `WhatsAppNotificationService.sendBarberCancellationToCustomer()` with the reason `O pacote vinculado a este agendamento foi desativado.`
- `packages/web/src/components/admin/PackageWorkspaceModal.tsx` is now the shared package-first modal for both post-create scheduling and packages-page details
- `packages/web/src/components/admin/AdminPackageModal.tsx` already exposes the reusable creation handoff through `onCreated(pkg)`, and `DashboardPage` opens `PackageWorkspaceModal` in `schedule` mode from that callback
- `packages/web/src/components/admin/AdminAppointmentCard.tsx`, `AdminEditAppointmentModal.tsx`, and `AdminAppointmentManagementDialogs.tsx` are the reusable admin booking-management pieces that the package workspace can compose instead of duplicating dashboard logic
- `packages/api/src/infrastructure/database/repositories/prisma-customer-package.repository.ts:deactivate()` now cancels only future linked `confirmed` appointments before marking the package cancelled, while leaving past/finalized linked rows untouched
- `packages/api/src/infrastructure/notifications/whatsapp-notification.service.ts:sendPackagePaymentReminder()` sends the provider-facing collection reminder, and `PackageLifecycleManager` triggers it only when a package-linked `completed` mutation causes an `active` -> `completed` transition
- `packages/web/src/pages/admin/PackagesPage.tsx` now warns explicitly that package deactivation cancels only future confirmed linked bookings and leaves past/finalized appointments unchanged
