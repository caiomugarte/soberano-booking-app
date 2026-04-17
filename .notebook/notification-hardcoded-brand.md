# Notification Service — Tenant-Aware Brand

**Tags:** notifications, whatsapp, multi-tenancy, tenant-config
**Originally a blocker (resolved):** brand is now from TenantConfig

## Current Pattern

`packages/api/src/infrastructure/notifications/whatsapp-notification.service.ts`

Constructor: `constructor(private config: TenantConfig, private client: ChatwootClient)`

- `config.businessName` → replaces old hardcoded "Soberano Barbearia"
- `config.providerLabel` → replaces old hardcoded "Barbeiro"
- `config.bookingUrl` → replaces old hardcoded `env.BASE_URL` for cancel links

Route handlers build the notification service per-request:
```typescript
const tenantConfig = tenantConfigSchema.parse(request.tenant.config);
const client = new ChatwootClient(tenantConfig);
const notificationService = new WhatsAppNotificationService(tenantConfig, client);
```

## TenantConfig Shape

Defined in `packages/shared/src/tenant-config.schema.ts`. Required fields: `businessName`, `providerLabel`, `bookingUrl`. Optional: `chatwootBaseUrl`, `chatwootApiToken`, `chatwootAccountId`, `chatwootInboxId`.

If Chatwoot credentials are absent, `client.isEnabled()` returns false and notifications are silently skipped (logged to console).
