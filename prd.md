# PRD — Soberano Barbearia Booking Platform

**Status:** Living document  
**Last updated:** 2026-04-03  
**Product owner:** Caio Mugarte  
**First client:** Soberano Barbearia, Campo Grande, MS

---

## 1. Problem Statement

Soberano Barbearia's booking experience relied on an n8n + Chatwoot WhatsApp AI chatbot. Customers frequently experienced delays and scheduling errors due to AI prompt unreliability. The goal is a fast, frictionless web-based booking system that complements (not replaces) the WhatsApp channel, delivering a native-app-like experience without requiring customer login.

---

## 2. Product Vision

A multi-tenant SaaS platform for barbershops that turns appointment scheduling into a competitive advantage. The first tenant is Soberano Barbearia; the platform is designed to be resold to other barbershops across Brazil.

**Two pricing tiers:**
| Plan | Price (BRL/mo) | Includes |
|------|---------------|----------|
| Site-only | ~R$ 189 | Web booking, admin dashboard, WhatsApp notifications, schedule management |
| AI | ~R$ 350 | Everything above + WhatsApp AI chatbot + AI-powered features |

---

## 3. Users & Roles

| Role | Auth | Description |
|------|------|-------------|
| Customer | None | Books, cancels, or reschedules via web. Identified by phone number. |
| Barber (Admin) | Email + password (JWT) | Manages own schedule, views own appointments, takes manual bookings. |

> Currently no super-admin or multi-tenant admin role. Each barber sees only their own data.

### Current barbers (Soberano)
- Matheus Kemp (`slug: matheus`)
- Adenilson Fogaça (`slug: adenilson`)
- Vandson Metélo (`slug: vandson`)

---

## 4. Business Rules

- **No customer accounts.** Phone number is the sole customer identifier. Walk-in customers (no phone) are supported.
- **No login for customers.** All post-booking actions (cancel, reschedule) use a unique token delivered via WhatsApp link.
- **Price snapshot.** Appointment stores the service price at the time of booking; later price changes don't affect existing bookings.
- **Timezone.** All scheduling is in `America/Campo_Grande` (UTC-4), not São Paulo.
- **Operating hours.** Mon–Sat, 09:00–18:30, 30-minute slots.
- **Double-booking prevention** is enforced at the database level via a partial unique constraint on `(barberId, date, startTime)` where `status = 'confirmed'`.

---

## 5. Services

9 active services, R$50–R$120, each 30 minutes by default. Displayed with emoji icon and sorted by `sortOrder`.

| Service | Example price |
|---------|--------------|
| Corte | R$ 50 |
| Barba | R$ 40 |
| Corte + Barba | R$ 80 |
| ... (9 total) | up to R$ 120 |

---

## 6. Features

### 6.1 Customer Booking Wizard (5 steps)

**Entry point:** `/` (homepage)

| Step | Content | Validation |
|------|---------|-----------|
| 1 | Service selection | Service must be active |
| 2 | Barber selection | Barber must be active; shows photo or emoji fallback |
| 3 | Date & time selection | Date ≥ today; time within barber's shift; slot not taken; no absences |
| 4 | Customer details | Name required; phone optional (10–11 digits, Brazilian) |
| 5 | Confirmation | Review and submit |

**Post-booking:** WhatsApp confirmation sent to customer with cancel/reschedule link.

**Rate limit:** 5 bookings/minute per IP.

---

### 6.2 Appointment Management (Customer)

**Entry point:** `/agendamento/:token`

Token is a 64-char hex string delivered in WhatsApp messages. Actions:

| Action | Auth | Constraint |
|--------|------|-----------|
| View details | Token in URL | Always available (limited data) |
| Cancel | Token + last-4 of phone | Appointment must be `confirmed` |
| Reschedule | Token + last-4 of phone | Appointment must be `confirmed`; new date ≥ today; new time within shift |

**Post-cancel:** Customer gets cancellation WhatsApp; barber gets event notification.  
**Post-reschedule:** New cancel link generated; both customer and barber notified.

---

### 6.3 Admin Dashboard

**Entry point:** `/admin` (requires JWT auth)

#### Views
| View | Default | Description |
|------|---------|-------------|
| Day | ✅ | Paginated appointment list for selected date (15/page) |
| Week | | Read-only calendar grid with appointment blocks |
| Month | | Calendar with aggregated stats per day |

#### Appointment cards show
- Service name, customer name (and phone if available), time, price
- Status badge: `confirmed` / `completed` / `no_show` / `cancelled`
- Action buttons: Mark completed, mark no-show, cancel with reason

#### Summary stats (day view)
- Total confirmed appointments
- Total revenue (from confirmed)
- No-show count

#### Date range stats (`/admin/stats?from=...&to=...`)
- Revenue total
- Appointment count by status

---

### 6.4 Admin Manual Booking

**Status:** API complete, UI in progress.

Barbers can book appointments directly from the dashboard for walk-in or phone-based customers.

| Field | Required | Notes |
|-------|----------|-------|
| Service | Yes | Must be active |
| Date | Yes | Must be today or future |
| Time | Yes | Free text HH:mm — no shift restriction (unlike customer flow) |
| Customer name | Yes | Auto-populated if phone resolves to known customer |
| Customer phone | No | Walk-ins allowed without phone |

**Differences from customer flow:**
- No shift hour restriction
- No step-by-step wizard; single modal form
- WhatsApp notification sent if customer has a phone

---

### 6.5 Schedule Management

**Entry point:** `/admin/schedule`

#### Shifts
- Weekly recurring time blocks per day-of-week
- Multiple rows per day supported (e.g., morning + afternoon split)
- Replaced atomically on save (no partial updates)

#### Absences
- Full-day or time-range (e.g., 12:00–14:00)
- Optional reason (up to 200 chars)
- Immediately blocks affected slots in customer booking flow

---

### 6.6 WhatsApp Notifications

Delivered via Chatwoot + Baileys integration. Gracefully degraded: if Chatwoot env vars are missing, messages are logged to console only.

#### Customer notifications
| Trigger | Template |
|---------|---------|
| Booking confirmed | Service, barber, date, time, price, cancel link |
| Appointment changed (by customer) | New details + new cancel link |
| Appointment cancelled (by customer) | Service, date, time + link to rebook |
| Appointment cancelled (by barber) | Service, barber, date, time, **barber's reason** + link to rebook |
| 1-hour reminder (cron) | Service, barber, time, cancel link |

#### Barber notifications
| Trigger | Template |
|---------|---------|
| New booking (any source) | Customer name, phone, service, date, time, price |
| Booking cancelled (by customer) | Same fields as above |
| Booking rescheduled (by customer) | New date/time |
| 1-hour reminder (cron) | Customer name, service, time |

**Cron job:** Runs every 15 minutes. Finds appointments 55–65 min away without reminder sent flag. Customer and barber reminders tracked independently (`reminderSent`, `barberReminderSent`).

---

### 6.7 Authentication (Barbers)

- Email + password login
- Access token: 1h TTL, stored in-memory on client
- Refresh token: 7d TTL, httpOnly cookie (silent refresh on page reload)
- Rate limit: 10 login attempts/minute per IP

---

## 7. Data Model (Summary)

```
Barber              BarberShift         BarberAbsence
──────              ───────────         ─────────────
id (UUID)           id (UUID)           id (UUID)
slug (unique)       barberId            barberId
firstName           dayOfWeek (0–6)     date
lastName            startTime           startTime?
email (unique)      endTime             endTime?
password (hashed)                       reason?
phone?
avatarUrl?
isActive

Service             Customer            Appointment
───────             ────────            ───────────
id (UUID)           id (UUID)           id (UUID)
slug (unique)       name                barberId
name                phone? (unique)     serviceId
icon (emoji)        createdAt           customerId
priceCents                              date
duration (min)                          startTime
isActive                                endTime
sortOrder                               priceCents (snapshot)
                                        status (confirmed|completed|no_show|cancelled)
                                        cancelToken (unique, 64 hex)
                                        reminderSent
                                        barberReminderSent
                                        cancelledAt?
```

---

## 8. API Surface (High Level)

### Public
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/services` | Active services |
| GET | `/api/barbers` | Active barbers with work days |
| GET | `/api/slots?barberId=&date=` | Available time slots |
| POST | `/api/book` | Create customer appointment |
| GET | `/api/appointment/:token` | View appointment |
| PATCH | `/api/appointment/:token/cancel` | Cancel appointment |
| PATCH | `/api/appointment/:token/change` | Reschedule appointment |

### Auth
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/auth/login` | Barber login |
| POST | `/api/auth/refresh` | Silent token refresh |
| POST | `/api/auth/logout` | Logout |

### Admin (JWT required)
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/admin/me` | Barber profile |
| GET | `/api/admin/appointments` | Appointments by date (paginated) |
| GET | `/api/admin/appointments/range` | Appointments by date range |
| GET | `/api/admin/stats` | Aggregated stats |
| PATCH | `/api/admin/appointments/:id` | Update status |
| POST | `/api/admin/appointments/:id/cancel` | Cancel with reason |
| POST | `/api/admin/appointments` | Manual booking |
| GET | `/api/admin/customers/lookup` | Customer lookup by phone |
| GET | `/api/admin/schedule/shifts` | Get shifts |
| PUT | `/api/admin/schedule/shifts` | Replace all shifts |
| GET | `/api/admin/schedule/absences` | Get absences |
| POST | `/api/admin/schedule/absences` | Add absence |
| DELETE | `/api/admin/schedule/absences/:id` | Remove absence |

---

## 9. Tech Stack

| Layer | Technology |
|-------|-----------|
| API | Fastify + Prisma + PostgreSQL |
| Frontend | React 19 + Vite + TanStack Query + Zustand + Tailwind CSS |
| WhatsApp | Chatwoot API + Baileys |
| Cron | node-cron (in-process) |
| Deployment | VPS on Hostinger, managed via Coolify |
| Timezone | `America/Campo_Grande` (UTC-4) |

Architecture: Clean arch (domain → application → infrastructure → HTTP).

---

## 10. Feature Status

| Feature | Status |
|---------|--------|
| Customer 5-step booking wizard | ✅ Complete |
| Customer cancel/reschedule via token | ✅ Complete |
| Admin authentication | ✅ Complete |
| Admin dashboard (day/week/month) | ✅ Complete |
| Schedule management (shifts & absences) | ✅ Complete |
| Admin manual booking (API) | ✅ Complete |
| Admin manual booking (UI modal) | ⚠️ In progress |
| Customer WhatsApp reminders | ✅ Complete |
| Barber WhatsApp reminders | ✅ Complete |
| Barber photos in booking flow (step 2) | ⚠️ Pending |
| Barber identity on dashboard cards | ⚠️ Pending |

---

## 11. Out of Scope (Current Phase)

- Super-admin / multi-tenant management panel
- Photo upload via admin panel (avatarUrls set manually in DB for now)
- Configurable reminder timing per barber
- Toggle reminders per barber from UI
- Monthly plan / auto-recurring bookings
- Multi-barber plan (one account, multiple barbers)
- Online payment integration
- Customer-facing appointment history

---

## 12. Deployment

### Infrastructure

Hosted on a VPS (Hostinger), managed via **Coolify** (Docker-based). All services run as Docker containers on the same internal network.

### Nginx Proxy (web container)

The web container runs nginx and acts as the unified entry point for a client domain. All traffic hits a single domain; nginx routes internally:

| Path | Proxied to | Notes |
|------|-----------|-------|
| `/` | Vite SPA (static files) | SPA routing via `try_files` |
| `/api/*` | API container (`${API_INTERNAL_URL}`) | `Host` header forwarded as-is |
| `/mcp` | MCP container (`http://mcp:3002/mcp`) | Used by n8n AI agent |

nginx forwards the original `Host` header to the API via `proxy_set_header Host $host`. This means the API receives the full client domain (e.g., `soberano.altion.com.br`) on every request — used for tenant resolution in the multi-tenant architecture.

### Environment Variables

| Env var | Service | Purpose |
|---------|---------|---------|
| `DATABASE_URL` | API | PostgreSQL connection string |
| `JWT_SECRET` | API | Access token signing (min 32 chars) |
| `JWT_REFRESH_SECRET` | API | Refresh token signing (min 32 chars) |
| `BASE_URL` | API | Used in WhatsApp links (e.g., `https://soberano.altion.com.br`) |
| `CHATWOOT_BASE_URL` | API | Chatwoot instance URL (optional) |
| `CHATWOOT_API_TOKEN` | API | Chatwoot API token (optional) |
| `CHATWOOT_ACCOUNT_ID` | API | Chatwoot account (optional) |
| `CHATWOOT_INBOX_ID` | API | Chatwoot inbox (optional) |
| `API_INTERNAL_URL` | Web (nginx) | Internal Docker network URL for API proxy |

Notifications degrade gracefully if Chatwoot vars are absent.
