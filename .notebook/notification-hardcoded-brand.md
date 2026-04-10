# Notification Service — Hardcoded Brand (Gotcha)

**Tags:** notifications, whatsapp, multi-tenancy
**Discovered:** 2026-04-09

## Location

`packages/api/src/infrastructure/notifications/whatsapp-notification.service.ts`

## Problem

Every message method hardcodes `"📍 *Soberano Barbearia*"` and `"💈 Barbeiro:"`:
- `sendBookingConfirmation` (L57)
- `sendBarberCancellationToCustomer` (L82)
- `sendCancellationNotice` (L106)
- `sendChangeNotice` (L130)
- `sendReminder` (L155)
- `sendBarberReminder` (L177)

## Fix

The `WhatsAppNotificationService` constructor should accept a `TenantConfig` object:
```typescript
interface TenantNotificationConfig {
  businessName: string;
  providerLabel: string;   // "Barbeiro" | "Psicóloga" | "Terapeuta"
  bookingUrl: string;      // tenant's BASE_URL
}
```

This config is fetched from the resolved `Tenant` record on each request and passed when instantiating the service. Store in `Tenant.config: Json` column.
