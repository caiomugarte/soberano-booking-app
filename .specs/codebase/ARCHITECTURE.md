# Architecture

**Pattern:** Monorepo — Clean Architecture API + SPA Frontend

## High-Level Structure

```
soberano/
├── packages/api       ← Fastify REST API (Clean Architecture)
├── packages/web       ← React SPA (booking + admin dashboard)
├── packages/shared    ← Zod schemas shared between api and web
├── packages/mcp       ← MCP server (AI bridge to API)
└── packages/web-*     ← Future per-client frontends (web-marques is empty)
```

## API: Clean Architecture Layers

```
http/routes/          ← Controllers: parse request, call use case, return response
application/use-cases/ ← Business logic: orchestrate domain + repos + services
domain/entities/      ← TypeScript types (not classes) for domain objects
domain/repositories/  ← Repository interfaces (contracts)
infrastructure/
  database/repositories/ ← Prisma implementations of repository interfaces
  auth/               ← JWT + password services
  notifications/      ← WhatsApp (Chatwoot) notification service
  jobs/               ← node-cron background jobs
config/               ← env validation (Zod), Prisma client singleton
shared/errors.ts      ← AppError hierarchy (AppError, SlotTakenError, etc.)
```

### Identified Patterns

**Repository Pattern**
- Location: `domain/repositories/*.repository.ts` (interfaces) + `infrastructure/database/repositories/prisma-*.repository.ts` (implementations)
- Purpose: Decouple business logic from Prisma
- Example: `packages/api/src/domain/repositories/appointment.repository.ts`
- **Critical concern for multi-tenancy:** Repositories are instantiated as module-level singletons in route files (`const appointmentRepo = new PrismaAppointmentRepository()`). No request context is passed — all queries are unscoped.

**Use Case Pattern**
- Location: `application/use-cases/booking/`
- Constructor-injected repositories + services
- Single `execute(input)` method
- Example: `packages/api/src/application/use-cases/booking/create-appointment.ts`

**Fastify Plugin Routes**
- Each route file exports `async function xRoutes(app: FastifyInstance)`
- Registered in `server.ts` with prefix `/api`
- Auth via `app.addHook('onRequest', authGuard)` on protected route groups

**Zod Schema Validation**
- Shared schemas in `packages/shared` consumed by both API and web
- API: `bookingSchema.parse(request.body)` in route handlers
- Web: same schemas for form validation

## Data Flow

### Customer Booking Flow
```
Browser → POST /api/book
  → bookingRoutes → bookingSchema.parse()
  → CreateAppointment.execute()
    → serviceRepo.findById() [validates service active]
    → barberRepo.findById() [validates barber active]
    → shiftRepo.findByBarberAndDay() [validates slot in shift]
    → customerRepo.upsertByPhone() [create or find customer]
    → appointmentRepo.create() [DB unique constraint prevents double-booking]
    → notificationService.sendBookingConfirmation() [fire-and-forget WhatsApp]
    → notificationService.notifyBarber() [fire-and-forget WhatsApp]
  → 201 { appointment, cancelUrl }
```

### Admin Authentication Flow
```
POST /api/auth/login
  → authenticateBarber.execute()
    → barberRepo.findByEmail()
    → password.compare()
    → jwt.signAccessToken() + jwt.signRefreshToken()
  → sets HttpOnly cookie (refresh) + returns accessToken

All admin routes: authGuard hook → verifyAccessToken() → attaches barberId to request
```

### Reminder Job Flow
```
node-cron (every 15 min)
  → appointmentRepo.findUpcomingWithoutReminder(60min)
  → for each: notificationService.sendReminder() + markReminderSent()
  → appointmentRepo.findUpcomingWithoutBarberReminder(60min)
  → for each: notificationService.sendBarberReminder() + markBarberReminderSent()
  (gaussian delay between messages to mimic human pacing)
```

## Frontend Architecture

```
pages/          ← Route-level components (BookingPage, admin/DashboardPage, etc.)
components/
  booking/      ← BookingWizard + 5 step components (Service, Barber, Time, Customer, Confirm)
  admin/        ← Admin-specific components (ProtectedRoute, AdminBookingModal)
  ui/           ← Primitive UI components (Button, Input, Spinner, Panel, etc.)
stores/         ← Zustand stores (booking.store.ts, auth.store.ts)
```

**State Management:**
- Booking flow state: Zustand `booking.store.ts` (step, selections)
- Auth state: Zustand `auth.store.ts` (token, barber info)
- Server data: TanStack Query (services, barbers, slots)

**API URL:** Single `VITE_API_URL` build arg — no tenant concept in frontend yet.

## Code Organization

**Approach:** Feature-based within layers (API), page-based (web)

**Module boundaries:**
- `@soberano/shared` — types and schemas that cross the API/web boundary
- Each package is self-contained; `shared` is the only cross-package dependency
