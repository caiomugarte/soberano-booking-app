# Admin Package Booking Notifications

**Tags:** notifications, admin-booking, packages, whatsapp, flow
**Discovered:** 2026-04-30

## Shared Notification Path

Package-linked admin bookings still use the same API route as normal admin manual bookings:

- `packages/web/src/components/admin/AdminBookingModal.tsx` sends `POST /admin/appointments` with optional `packageId`
- `packages/web/src/components/admin/BookFromPackageModal.tsx` also sends `POST /admin/appointments` with `packageId`
- `packages/api/src/http/routes/admin.routes.ts` instantiates `AdminCreateAppointment`
- `packages/api/src/application/use-cases/booking/admin-create-appointment.ts` always calls `notificationService.sendBookingConfirmation()` for future bookings with a phone, but now passes an `includeManageLink` option derived from `packageId`

## Current Customer Message Behavior

`packages/api/src/infrastructure/notifications/whatsapp-notification.service.ts:sendBookingConfirmation()`

The confirmation still contains the usual appointment details, but the self-service block is now conditional:

- When `includeManageLink !== false`, it appends:
  - `Para cancelar ou alterar:`
  - `${config.bookingUrl}/agendamento/${appointment.cancelToken}`
- When `includeManageLink === false`, it omits that block entirely

So package-linked admin bookings no longer expose the same self-service cancel/change link as customer-facing bookings, while non-package admin bookings keep the old behavior.

## Scope Gotcha

The behavior applies to both package entry points because `packageId` is evaluated in the shared API use case:

- `AdminBookingModal` package selector path
- `BookFromPackageModal` package-first path on `PackagesPage`

This remains an API-level rule. The frontend does not need a separate flag unless package-linked and non-package-linked admin bookings should diverge in some new way beyond `packageId`.
