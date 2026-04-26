# Project Structure

**Root:** `/Users/caio.mugarte/Documents/projetos/soberano`

## Directory Tree

```
soberano/
├── package.json              # Workspace root — npm workspaces: packages/*
├── package-lock.json
├── tsconfig.base.json        # Shared TS config extended by all packages
├── docker-compose.yaml       # Production deployment (api + mcp + web)
├── prd.md                    # Product Requirements Document
├── .specs/                   # Spec-driven development artifacts
│   ├── project/STATE.md      # Decisions, blockers, deferred ideas
│   ├── codebase/             # Brownfield docs (this directory)
│   └── features/             # Feature specs (spec.md, design.md, tasks.md)
└── packages/
    ├── shared/               # Shared Zod schemas + TypeScript types
    │   ├── src/index.ts
    │   └── dist/             # Compiled output (consumed by api + web)
    ├── api/                  # Fastify REST API
    │   ├── prisma/
    │   │   ├── schema.prisma
    │   │   └── migrations/
    │   ├── src/
    │   │   ├── server.ts     # Entry point, plugin registration, error handler
    │   │   ├── config/       # env.ts, database.ts (Prisma singleton)
    │   │   ├── shared/       # errors.ts
    │   │   ├── domain/       # entities/ + repositories/ (interfaces)
    │   │   ├── application/  # use-cases/ (business logic)
    │   │   ├── http/         # routes/ + middleware/
    │   │   └── infrastructure/
    │   │       ├── auth/     # jwt.service.ts, password.service.ts
    │   │       ├── database/ # repositories/ (Prisma impls) + seed.ts
    │   │       ├── jobs/     # reminder.job.ts (node-cron)
    │   │       └── notifications/ # whatsapp-notification.service.ts, chatwoot.client.ts
    │   └── Dockerfile
    ├── web/                  # React SPA (Soberano Barbearia — current client)
    │   ├── src/
    │   │   ├── main.tsx      # React entry point
    │   │   ├── App.tsx       # Router + auth initialization
    │   │   ├── pages/        # Route-level components
    │   │   │   ├── BookingPage.tsx
    │   │   │   ├── AppointmentPage.tsx
    │   │   │   ├── PrivacyPage.tsx
    │   │   │   └── admin/    # LoginPage, DashboardPage, SchedulePage
    │   │   ├── components/
    │   │   │   ├── booking/  # BookingWizard + 5 step components
    │   │   │   ├── admin/    # ProtectedRoute, AdminBookingModal
    │   │   │   └── ui/       # Button, Input, Spinner, Panel, Footer, StepIndicator, StickyBar
    │   │   └── stores/       # booking.store.ts, auth.store.ts
    │   ├── nginx.conf        # SPA nginx config (try_files)
    │   └── Dockerfile        # Multi-stage: node builder → nginx:alpine
    ├── mcp/                  # MCP server (AI bridge)
    │   └── src/server.ts
    └── web-marques/          # Future second client frontend (empty — node_modules only)
```

## Module Organization

### `packages/shared`
**Purpose:** Type-safe contract between API and web  
**Key files:** `src/index.ts` exports Zod schemas (`bookingSchema`, `slotsQuerySchema`) + TS types

### `packages/api/src/domain`
**Purpose:** Core business types and repository contracts (no dependencies on Prisma)  
**Key files:** `entities/appointment.ts`, `repositories/appointment.repository.ts`

### `packages/api/src/application`
**Purpose:** Business logic use cases — the "what the app does"  
**Key files:** `use-cases/booking/create-appointment.ts`, `get-available-slots.ts`, etc.

### `packages/api/src/http`
**Purpose:** HTTP boundary — request parsing, response formatting  
**Key files:** `routes/*.routes.ts`, `middleware/auth.middleware.ts`

### `packages/api/src/infrastructure`
**Purpose:** External system implementations (DB, notifications, auth, cron)

## Where Things Live

**Booking flow logic:**
- Business rules: `application/use-cases/booking/create-appointment.ts`
- HTTP: `http/routes/booking.routes.ts`
- DB: `infrastructure/database/repositories/prisma-appointment.repository.ts`

**Authentication:**
- JWT logic: `infrastructure/auth/jwt.service.ts`
- HTTP guard: `http/middleware/auth.middleware.ts`
- Login use case: `application/use-cases/barber/authenticate-barber.ts`

**WhatsApp notifications:**
- All message formatting: `infrastructure/notifications/whatsapp-notification.service.ts`
- Chatwoot HTTP client: `infrastructure/notifications/chatwoot.client.ts`

**Reminders:**
- Cron job: `infrastructure/jobs/reminder.job.ts` (started in `server.ts`)

**DB schema:**
- `packages/api/prisma/schema.prisma`
- Migrations: `packages/api/prisma/migrations/`
