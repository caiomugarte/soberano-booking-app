# Architecture Overview

**Tags:** architecture, packages, overview
**Discovered:** 2026-04-17 full codebase mapping

## Project Scope

**Barbershop-only.** This platform is intentionally scoped to barbershop clients. The domain model, terminology (barbers, shifts, services), and features are barbershop-specific. Other verticals (clinics, psychologists, salons) should be separate projects — they would require a different domain model, not just a new tenant.

## Monorepo Packages (npm workspaces)

| Package | Path | Purpose |
|---------|------|---------|
| `@soberano/api` | `packages/api` | Fastify REST API — clean architecture |
| `@soberano/mcp` | `packages/mcp` | MCP server for AI assistant integrations |
| `@soberano/shared` | `packages/shared` | Zod schemas + TypeScript types shared across packages |
| `@soberano/web` | `packages/web` | Customer-facing booking UI (React 19 + Vite + TanStack Query) |
| `web-admin` | `packages/web-admin` | Super-admin platform UI — tenant management |
| `web-marques` | `packages/web-marques` | Tenant-specific booking UI for Marques barbershop (JSX, not TSX) |

## API Layer Structure (`packages/api/src/`)

```
domain/          → entities + repository interfaces (no framework deps)
application/     → use cases (pure business logic)
infrastructure/  → Prisma repos, JWT, WhatsApp notifications, cron job
http/            → Fastify routes + middleware
config/          → env, database, tenant-prisma
```

## Key Entry Points

- **API server:** `packages/api/src/server.ts`
- **MCP server:** `packages/mcp/src/server.ts`
- **Customer web:** `packages/web/src/main.tsx`
- **Super-admin web:** `packages/web-admin/src/main.tsx`
- **Marques tenant web:** `packages/web-marques/src/main.jsx`

## Database

Single PostgreSQL database, multi-tenant via `tenantId` column. See `packages/api/prisma/schema.prisma`.

Main models: `Tenant`, `Provider`, `ProviderShift`, `ProviderAbsence`, `Service`, `Customer`, `Appointment`.

Note: Domain layer still uses `barber`/`barberId` terminology; DB/Prisma uses `provider`/`providerId`. A mapping function in `prisma-appointment.repository.ts:mapAppointment()` bridges the two.

## Stack

- Backend: Fastify + Prisma + PostgreSQL
- Frontend: React 19 + Vite + TanStack Query + Zustand + Tailwind CSS
- Shared: Zod validation + TypeScript types
- Notifications: Chatwoot API (WhatsApp via Baileys)
- Jobs: node-cron (reminders)
- MCP: `@modelcontextprotocol/sdk` StreamableHTTP transport
