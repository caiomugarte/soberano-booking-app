# External Integrations

## Notifications

**Service:** Chatwoot  
**Purpose:** WhatsApp message delivery (booking confirmations, reminders, cancellations, changes)  
**Implementation:** `packages/api/src/infrastructure/notifications/chatwoot.client.ts` + `whatsapp-notification.service.ts`  
**Configuration:** `CHATWOOT_BASE_URL`, `CHATWOOT_API_TOKEN`, `CHATWOOT_ACCOUNT_ID`, `CHATWOOT_INBOX_ID` (all optional — service gracefully skips if not configured)  
**Authentication:** Bearer token (`CHATWOOT_API_TOKEN`) in HTTP header  
**Pattern:** Fire-and-forget with 3-attempt exponential backoff retry

**Messages sent:**
- `sendBookingConfirmation` — on new booking
- `sendCancellationNotice` — customer self-cancels
- `sendBarberCancellationToCustomer` — barber cancels appointment
- `sendChangeNotice` — appointment rescheduled
- `sendReminder` — 60 min before appointment (to customer)
- `sendBarberReminder` — 60 min before appointment (to barber)
- `notifyBarber` — on booked/cancelled/changed events

**Multi-tenancy concern:** All messages hardcode `"Soberano Barbearia"` as the business name. Will need tenant-aware message templates.

## Background Jobs

**Queue system:** node-cron (in-process, no queue)  
**Location:** `packages/api/src/infrastructure/jobs/reminder.job.ts`  
**Started:** In `server.ts` after server start

**Jobs:**
- Reminder job: every 15 minutes, checks appointments starting within 60 minutes
  - Customer reminder: `sendReminder()` + `markReminderSsent()`
  - Barber reminder: `sendBarberReminder()` + `markBarberReminderSent()`
  - Gaussian delay between messages (mean 8s, std 3s, range 3-20s) to mimic human pacing

**Multi-tenancy concern:** Reminder queries have no tenant filter — when multi-tenancy lands, `findUpcomingWithoutReminder` must scope by tenant.

## MCP Server

**Service:** Model Context Protocol server (`packages/mcp`)  
**Purpose:** Exposes API capabilities to AI agents (WhatsApp chatbot, Claude)  
**Implementation:** `packages/mcp/src/server.ts`  
**Configuration:** `API_BASE_URL` (points to API service), `MCP_SECRET` (bearer token auth)  
**Authentication:** Validates `MCP_SECRET` on incoming requests  
**Deployment:** Separate Docker container, depends on `api` service

## API Rate Limiting

**Service:** `@fastify/rate-limit` (in-process, no Redis)  
**Default:** 100 req/min globally  
**Override:** `POST /api/book` — 5 req/min (stricter, anti-abuse)

## Authentication

**Service:** JWT (jsonwebtoken 9)  
**Access token:** Short-lived, sent as Bearer in Authorization header  
**Refresh token:** Longer-lived, stored in HttpOnly cookie  
**Implementation:** `packages/api/src/infrastructure/auth/jwt.service.ts`  
**Secrets:** `JWT_SECRET`, `JWT_REFRESH_SECRET` (both required, min 32 chars)

## CORS

**Implementation:** `@fastify/cors`  
**Dev:** Allow all origins (`true`)  
**Prod:** Allow only `BASE_URL` env var  
**Credentials:** Enabled (needed for HttpOnly refresh token cookie)
