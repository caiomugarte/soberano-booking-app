# Feature Spec: Swagger / OpenAPI Documentation

## Goal

Expose an interactive OpenAPI 3.0 documentation UI for the Soberano API, generated automatically from route schemas. Primarily for internal developer use (client integrations, AI tooling, debugging). Accessible in all environments but optionally protected in production.

## Context

- **API**: Fastify v5, Zod v3, ESM, TypeScript
- **Routes**: 9 route files — `booking`, `appointment`, `service`, `barber`, `auth`, `admin`, `schedule`, `client`, `super-admin`
- **Auth**: JWT via `Authorization: Bearer` header; tenant resolved from `Host` header
- **Existing schemas**: Zod schemas in `@soberano/shared` (`bookingSchema`, `slotsQuerySchema`) and inline in route files

## Approach

Use `fastify-type-provider-zod` to bridge Zod schemas and Fastify's type provider, enabling automatic OpenAPI schema generation from existing Zod definitions. This avoids duplicating schemas in JSON Schema format.

**Packages to add:**
- `@fastify/swagger` — OpenAPI spec generation
- `@fastify/swagger-ui` — Interactive docs UI at `/docs`
- `fastify-type-provider-zod` — Zod ↔ Fastify type provider bridge

**Swagger UI path**: `/docs` (redirected from `/api/docs` for convenience)
**OpenAPI spec path**: `/docs/json`

## Requirements

### SW-01 — Swagger plugin registration
Register `@fastify/swagger` in `server.ts` before any routes, configured with:
- `openapi: { info: { title: 'Soberano API', version: '1.0.0' }, ... }`
- `securityDefinitions`: Bearer JWT scheme (`bearerAuth`)
- Zod type provider set globally on the Fastify instance

### SW-02 — Swagger UI plugin
Register `@fastify/swagger-ui` at `/docs` with:
- `routePrefix: '/docs'`
- `uiConfig: { docExpansion: 'list', deepLinking: false }`
- No authentication gate for now (internal tool)

### SW-03 — Type provider integration
Call `app.withTypeProvider<ZodTypeProvider>()` and use `serializerCompiler` + `validatorCompiler` from `fastify-type-provider-zod`. This replaces manual `zod.parse()` calls in routes with Fastify's native schema validation.

**Note:** Existing `zod.parse()` / `zod.safeParse()` calls in route handlers can remain unchanged initially — type provider integration is opt-in per route. Schemas only need to be added to routes we want documented. Full migration to type provider validation is out of scope for this feature.

### SW-04 — Route annotations: `booking.routes.ts`
| Route | Method | Schema |
|-------|--------|--------|
| `/api/slots` | GET | query: `slotsQuerySchema`, response 200: `{ slots: string[] }` |
| `/api/customer/name` | GET | query: `{ phone: string }`, response 200: `{ name: string \| null }` |
| `/api/book` | POST | body: `bookingSchema`, response 201: appointment + `cancelUrl` |

Tag: `Booking`

### SW-05 — Route annotations: `appointment.routes.ts`
Read the file and annotate all routes.

Tag: `Appointments`

### SW-06 — Route annotations: `service.routes.ts`
Read the file and annotate all routes.

Tag: `Services`

### SW-07 — Route annotations: `barber.routes.ts`
Read the file and annotate all routes.

Tag: `Barbers`

### SW-08 — Route annotations: `auth.routes.ts`
Read the file and annotate all routes.

Tag: `Auth`

### SW-09 — Route annotations: `admin.routes.ts`
Read the file and annotate all routes. Mark routes as `security: [{ bearerAuth: [] }]`.

Tag: `Admin`

### SW-10 — Route annotations: `schedule.routes.ts`
Read the file and annotate all routes. Mark protected routes.

Tag: `Schedule`

### SW-11 — Route annotations: `client.routes.ts`
Read the file and annotate all routes.

Tag: `Client`

### SW-12 — Route annotations: `super-admin.routes.ts`
Read the file and annotate all routes. Mark all as `security: [{ bearerAuth: [] }]`.

Tag: `Super Admin`

### SW-13 — State update
Update `.specs/project/STATE.md` to reflect this feature as active.

## Out of Scope

- Full migration of route validation to type provider (large change, separate feature)
- Auth gate on `/docs` (deferred — internal use only for now)
- Automatic schema inference from Prisma models
- Client SDK generation from the spec

## Acceptance Criteria

- `GET /docs` returns the Swagger UI HTML
- `GET /docs/json` returns a valid OpenAPI 3.0 JSON document
- All 9 route groups appear as tagged sections in the UI
- Bearer auth scheme is listed and usable via the "Authorize" button
- No TypeScript compilation errors introduced
- Existing tests continue to pass
