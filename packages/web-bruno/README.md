s ss # Soberano Barbearia

Appointment booking system for Soberano Barbearia. Replaces a WhatsApp AI chatbot with a proper web app — faster, more reliable, and with a clean barber admin panel.

## Stack

| Layer | Tech |
|---|---|
| Backend | Fastify + Prisma + PostgreSQL |
| Frontend | React 19 + Vite + TanStack Query + Zustand + Tailwind CSS |
| Shared | Zod validation schemas + TypeScript types |
| Notifications | Chatwoot API (WhatsApp via Baileys) |
| Jobs | node-cron (reminders) |

## Structure

```
soberano/
├── packages/
│   ├── api/        # Fastify backend (clean architecture)
│   ├── web/        # React frontend
│   └── shared/     # Zod schemas and shared types
└── package.json    # npm workspaces root
```

### API — Clean Architecture layers

```
src/
├── domain/          # Entities and repository interfaces (ports)
├── application/     # Use cases (business logic, no framework deps)
│   └── use-cases/
│       ├── booking/ # create-appointment, get-available-slots, cancel, change
│       └── barber/  # authenticate-barber
├── infrastructure/  # Prisma repos, JWT, notifications, cron job
└── http/            # Fastify routes and middleware
```

## Features

**Customer (public)**
- 5-step booking wizard: Service → Barber → Date/Time → Details → Confirm
- WhatsApp confirmation with cancel/change link
- Cancel or reschedule via token link (phone last-4 verification)
- 1-hour reminder via WhatsApp

**Barber admin (authenticated)**
- Dashboard: view appointments by date, mark completed / no-show
- Cancel an appointment with reason → sends WhatsApp to customer
- Manage weekly shifts (work hours per day, lunch break as two rows)
- Register absences (full day or time range)

## API Endpoints

### Public
| Method | Path | Description |
|---|---|---|
| GET | `/api/services` | List active services |
| GET | `/api/barbers` | List active barbers |
| GET | `/api/slots?barberId=&date=` | Available slots for a barber/date |
| POST | `/api/book` | Create appointment (rate limited: 5/min) |
| GET | `/api/appointment/:token` | View appointment |
| PATCH | `/api/appointment/:token/cancel` | Customer cancels |
| PATCH | `/api/appointment/:token/change` | Customer reschedules |

### Auth
| Method | Path | Description |
|---|---|---|
| POST | `/api/auth/login` | Barber login (rate limited: 10/min) |
| POST | `/api/auth/refresh` | Refresh access token (uses httpOnly cookie) |
| POST | `/api/auth/logout` | Clear refresh token cookie |

### Admin (JWT required)
| Method | Path | Description |
|---|---|---|
| GET | `/api/admin/appointments?date=` | Barber's appointments |
| PATCH | `/api/admin/appointments/:id` | Update status (completed / no_show) |
| POST | `/api/admin/appointments/:id/cancel` | Cancel with reason + notify customer |
| GET | `/api/admin/schedule/shifts` | Get my shifts |
| PUT | `/api/admin/schedule/shifts` | Replace all shifts |
| GET | `/api/admin/schedule/absences` | Get my absences |
| POST | `/api/admin/schedule/absences` | Add absence |
| DELETE | `/api/admin/schedule/absences/:id` | Remove absence |

## Database Schema

```
Barber          ← has many → BarberShift (dayOfWeek, startTime, endTime)
                ← has many → BarberAbsence (date, startTime?, endTime?, reason?)
                ← has many → Appointment

Service         ← has many → Appointment

Customer        ← has many → Appointment
  phone (unique, normalized without +55)

Appointment
  barberId + date + startTime → partial unique index (WHERE status = 'confirmed')
  cancelToken (64-char hex, unique)
  status: confirmed | cancelled | completed | no_show
```

The double-booking guard is a **partial unique index** on `(barber_id, date, start_time) WHERE status = 'confirmed'` — cancelled or no-show slots can be rebooked.

## Auth Security

- Access token (1h JWT) returned in response body, stored **in memory only** (no localStorage)
- Refresh token (7d JWT) in **httpOnly cookie** — JS cannot read it
- On app load, silently calls `/api/auth/refresh` to restore session from cookie
- On 401, auto-refreshes and retries the request once
- Logout calls the server to clear the cookie

## Notifications (Chatwoot + Baileys)

Events that trigger a WhatsApp message to the customer:
- Booking confirmed (includes cancel/change link)
- Appointment changed (new date/time + link)
- Appointment cancelled by customer
- Appointment cancelled by barber (includes reason)
- Reminder 1 hour before (cron every 15 min)

**Brazilian phone normalization:** numbers are stored without `+55`. Chatwoot contacts are searched by both the 10-digit (old 8-digit mobile, more common in existing customer base with Baileys) and 11-digit (9-digit mobile) forms before creating a new contact.

## Environment Variables

Create `packages/api/.env`:

```env
NODE_ENV=development
PORT=3000

# PostgreSQL
DATABASE_URL=postgresql://user:password@localhost:5432/soberano

# JWT — use long random strings in production
JWT_SECRET=change-me-min-32-chars
JWT_REFRESH_SECRET=change-me-different-min-32-chars

# Frontend URL (for CORS and WhatsApp links)
BASE_URL=http://localhost:5173

# Chatwoot (optional — notifications are skipped if not set)
CHATWOOT_BASE_URL=https://your-chatwoot.com
CHATWOOT_API_TOKEN=your-token
CHATWOOT_ACCOUNT_ID=1
CHATWOOT_INBOX_ID=1
```

## Development

```bash
# Install dependencies
npm install

# Run API + web in parallel
npm run dev

# Or individually
npm run dev:api
npm run dev:web
```

### Database

```bash
# Run migrations
npm run db:migrate

# Seed (3 barbers, 9 services, default shifts)
npm run db:seed

# Open Prisma Studio
npm run db:studio
```

Default barber credentials after seed (change in production):

| Barber | Email | Password |
|---|---|---|
| Matheus | matheus@soberano.com | soberano123 |
| Vandson | vandson@soberano.com | soberano123 |
| Adenilson | adenilson@soberano.com | soberano123 |

## Production

```bash
# Build
npm -w @soberano/api run build
npm -w @soberano/web run build

# Run migrations (no prompt)
npm -w @soberano/api exec -- prisma migrate deploy

# Start API
npm -w @soberano/api run start
```

Serve the web build (`packages/web/dist/`) as static files via nginx or a static host. The API should be proxied at `/api`.
