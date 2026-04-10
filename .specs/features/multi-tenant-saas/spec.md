# Multi-Tenant SaaS — Specification

**Status:** Ready for design  
**Last updated:** 2026-04-09

---

## Problem Statement

Soberano is live in production as a single-tenant barbershop booking app. The codebase has no concept of tenants: all DB queries are global, the brand is hardcoded in notifications, and the frontend is tied to one client. Adding a second client today would require duplicating the entire stack. The goal is to introduce multi-tenancy infrastructure so new clients (barbershops, psychologists, etc.) can be onboarded quickly without touching production data or breaking existing behavior.

## Goals

- [ ] Add a second client to the platform without duplicating the API or DB
- [ ] Soberano (existing production client) continues working with zero behavior change
- [ ] New frontends can be deployed independently per client
- [ ] A super-admin can create and manage tenants from a dedicated panel
- [ ] Notifications are tenant-aware (correct brand name, provider label, URL per client)

## Out of Scope

| Feature | Reason |
|---------|--------|
| Building web-marques or psychologist frontend | Infrastructure first; frontends come after |
| Per-tenant feature flags enforcement | Schema supports it, enforcement deferred |
| Recurring sessions / psychologist-specific booking rules | Future vertical work |
| Horizontal scaling / Redis rate limiter | Not needed at current scale |
| Billing / subscription management | Separate future feature |
| Customer-facing multi-tenant routing (e.g., `soberano.altion.com.br`) | DNS/proxy config — out of app scope |

---

## User Stories

### P1: Tenant Model in DB ⭐ MVP
**TENANT-01**

**User Story:** As a platform engineer, I want a `Tenant` model in the DB so that all data is scoped to a client.

**Why P1:** Everything else depends on this. No tenant model = no multi-tenancy.

**Acceptance Criteria:**
1. WHEN the migration runs THEN a `tenants` table SHALL exist with: `id`, `slug` (unique), `name`, `type` (`barbershop` | `clinic` | `wellness`), `config` (JSON), `is_active`, `created_at`
2. WHEN the migration runs THEN all tenant-scoped tables SHALL have a `tenant_id` FK: `providers` (renamed from `barbers`), `provider_shifts`, `provider_absences`, `services`, `customers`, `appointments`
3. WHEN the migration runs THEN existing Soberano data SHALL be assigned to a seed tenant with `slug = "soberano"`
4. WHEN the migration runs THEN no existing rows SHALL be deleted or altered beyond adding the FK column

**Independent Test:** Run `prisma migrate deploy` on a copy of production DB → all existing rows have `tenant_id` set, app still boots.

---

### P1: `Barber` → `Provider` DB Rename ⭐ MVP
**TENANT-02**

**User Story:** As a platform engineer, I want the `barbers` table renamed to `providers` so the domain model supports non-barbershop verticals.

**Why P1:** Done together with TENANT-01 — one migration is safer than two. Non-destructive rename.

**Acceptance Criteria:**
1. WHEN the migration runs THEN `barbers` table SHALL be renamed to `providers`
2. WHEN the migration runs THEN all FK columns (`barber_id`) SHALL be renamed to `provider_id`
3. WHEN the migration runs THEN all Prisma model references SHALL be updated (`Barber` → `Provider`, `barberId` → `providerId`)
4. WHEN the migration runs THEN all API layer references (routes, use-cases, repositories) SHALL be updated to use `Provider` terminology
5. WHEN the migration runs THEN the existing `web` frontend (Soberano) SHALL continue to work — API responses must still include `barber`-named fields for backwards compatibility OR web is updated simultaneously

**Independent Test:** Boot API + existing web → full booking flow completes end-to-end.

---

### P1: Tenant Resolution Middleware ⭐ MVP
**TENANT-03**

**User Story:** As a frontend developer, I want to identify my tenant via a request header so that the API returns only that tenant's data.

**Why P1:** Core mechanism. All data scoping depends on it.

**Acceptance Criteria:**
1. WHEN a request includes `X-Tenant-Slug: soberano` THEN the API SHALL resolve the tenant and attach it to the request context
2. WHEN a request has no `X-Tenant-Slug` header THEN the API SHALL return `404 { error: "TENANT_NOT_FOUND" }`
3. WHEN a request has an unknown `X-Tenant-Slug` THEN the API SHALL return `404 { error: "TENANT_NOT_FOUND" }`
4. WHEN a tenant is resolved THEN all DB queries in that request SHALL be automatically scoped to that `tenantId`
5. WHEN a tenant is `is_active = false` THEN the API SHALL return `403 { error: "TENANT_INACTIVE" }`

**Independent Test:** Send `POST /api/book` with `X-Tenant-Slug: soberano` → booking created. Send same request without header → 404.

---

### P1: Prisma Auto-Scoping via Client Extension ⭐ MVP
**TENANT-04**

**User Story:** As a platform engineer, I want all DB queries to be automatically scoped to the current tenant so that no query can accidentally leak cross-tenant data.

**Why P1:** Manual `tenantId` filtering on every query is error-prone and will be forgotten. Auto-scoping is the only safe approach.

**Acceptance Criteria:**
1. WHEN a Prisma query runs within a request THEN it SHALL automatically include `tenantId` in the `where` clause
2. WHEN a Prisma `create` runs within a request THEN it SHALL automatically set `tenantId` in the `data`
3. WHEN no tenant context exists (e.g., seed scripts, migrations) THEN queries SHALL run without auto-scoping
4. WHEN a repository method is called THEN it SHALL NOT need to manually pass `tenantId` — the extension handles it

**Independent Test:** Add a second tenant + seed data for both → query from tenant A returns only tenant A's data; query from tenant B returns only tenant B's data.

---

### P1: Tenant-Aware Notifications ⭐ MVP
**TENANT-05**

**User Story:** As a client customer, I want WhatsApp notifications to show my barbershop's name (not "Soberano Barbearia") so that the experience matches the business I booked with.

**Why P1:** Without this, a second client's customers receive messages branded as Soberano. Embarrassing and a blocker.

**Acceptance Criteria:**
1. WHEN a notification is sent THEN it SHALL use the tenant's `config.businessName` field (e.g., "Soberano Barbearia" or "Barbearia Marques")
2. WHEN a notification is sent THEN it SHALL use the tenant's `config.providerLabel` field (e.g., "Barbeiro" or "Psicóloga")
3. WHEN a notification is sent THEN the cancel/reschedule URL SHALL use the tenant's `config.bookingUrl`
4. WHEN `Tenant.config` is missing a field THEN a sensible default SHALL be used (e.g., `"Estabelecimento"` for `businessName`)

**Independent Test:** Create second tenant with different `businessName` → book appointment → WhatsApp message shows second tenant's business name.

---

### P1: Update Existing Web Frontend ⭐ MVP
**TENANT-06**

**User Story:** As Soberano (existing production client), I want the existing frontend to work identically after multi-tenancy is introduced so that production is not disrupted.

**Why P1:** Production is live. Breaking Soberano is unacceptable.

**Acceptance Criteria:**
1. WHEN the API receives a request from the Soberano frontend THEN it SHALL correctly resolve the `soberano` tenant
2. WHEN `VITE_TENANT_SLUG=soberano` is set THEN the frontend SHALL send `X-Tenant-Slug: soberano` on every API request
3. WHEN the complete booking flow runs on the updated frontend THEN all 5 steps SHALL work identically to today
4. WHEN the admin dashboard runs THEN all appointment management features SHALL work identically to today

**Independent Test:** Deploy to staging with `VITE_TENANT_SLUG=soberano` → run through full booking wizard → appointment created, WhatsApp sent, admin dashboard shows it.

---

### P1: CORS Multi-Origin Support ⭐ MVP
**TENANT-07**

**User Story:** As a platform engineer, I want the API to accept requests from multiple frontend origins so that multiple client deployments can all call the same API.

**Why P1:** Currently the API only allows `BASE_URL` — a single string. Multiple frontends = multiple origins.

**Acceptance Criteria:**
1. WHEN `ALLOWED_ORIGINS` env var contains a comma-separated list of URLs THEN the API SHALL accept CORS requests from all of them
2. WHEN a request comes from an unlisted origin THEN CORS SHALL reject it
3. WHEN `NODE_ENV=development` THEN all origins SHALL be allowed (existing behavior)

**Independent Test:** Two frontends on different URLs → both can successfully call the API.

---

### P1: Deployment Split ⭐ MVP
**TENANT-08**

**User Story:** As a platform engineer, I want each client frontend deployed independently so that adding a new client doesn't require touching the shared infrastructure.

**Why P1:** Today docker-compose.yaml bundles everything. This must be split so the API/DB are deployed once and frontends are per-client.

**Acceptance Criteria:**
1. WHEN the infra stack is deployed THEN it SHALL include: `api` + `mcp` services (no web)
2. WHEN a client frontend stack is deployed THEN it SHALL include only the web service + env vars `VITE_API_URL` and `VITE_TENANT_SLUG`
3. WHEN a new client is added THEN only a new frontend stack needs to be deployed — the infra stack is untouched
4. WHEN `docker-compose.infra.yaml` is deployed THEN the existing Soberano production environment SHALL continue to work

**Independent Test:** Deploy infra stack → deploy soberano web stack with `VITE_TENANT_SLUG=soberano` → full booking flow works.

---

### P2: Super-Admin Panel — Tenant Management
**TENANT-09, TENANT-10**

**User Story:** As a platform operator (Caio), I want a private admin panel where I can create and manage tenants so that I don't need to manually run DB seed scripts for every new client.

**Why P2:** Immediately valuable but not blocking the infrastructure work. Can be done after P1 is live.

**Acceptance Criteria:**
1. WHEN I log in to the super-admin panel THEN I SHALL authenticate with a platform-level credential (separate from barber auth) — **TENANT-09**
2. WHEN I create a tenant THEN I SHALL provide: name, slug, type (`barbershop` | `clinic` | `wellness`), and notification config (businessName, providerLabel, bookingUrl) — **TENANT-10**
3. WHEN I view the tenant list THEN I SHALL see all tenants with their slug, type, and active status
4. WHEN I deactivate a tenant THEN the API SHALL return `403` for all requests with that tenant's slug
5. WHEN I create a tenant THEN its `slug` SHALL be validated for uniqueness before saving
6. WHEN I edit tenant config THEN the notification messages SHALL reflect the new config immediately (no cache)

**Independent Test:** Create new tenant via panel → call `GET /api/services` with `X-Tenant-Slug: new-slug` → returns empty list (no services yet), not 404.

---

### P2: Reminder Job Tenant-Awareness
**TENANT-11**

**User Story:** As a platform engineer, I want the reminder cron job to send the correct branded message per tenant so that reminders don't cross-brand.

**Why P2:** Required before a second client goes live, but not for infrastructure setup.

**Acceptance Criteria:**
1. WHEN the reminder job runs THEN it SHALL query appointments grouped by tenant
2. WHEN sending a reminder for tenant A THEN the message SHALL use tenant A's config (businessName, providerLabel)
3. WHEN a tenant has no Chatwoot config THEN its reminders SHALL be silently skipped

**Independent Test:** Two tenants with different Chatwoot configs → reminder job runs → each gets messages with their own brand.

---

## Edge Cases

- WHEN a migration is run on production THEN existing Soberano rows SHALL have `tenant_id` set via a data migration (not null) — the column SHALL be `NOT NULL` with a default applied only during migration
- WHEN a slug collision occurs during tenant creation THEN the API SHALL return `409 CONFLICT`
- WHEN the `Tenant.config` JSON is missing expected fields THEN the notification service SHALL fall back to defaults, not throw
- WHEN a barber logs in THEN their JWT SHALL include `tenantId` so admin routes can scope data without re-resolving from header
- WHEN `VITE_TENANT_SLUG` is not set THEN the frontend build SHALL fail with a clear error (Vite env validation)

---

## Requirement Traceability

| ID | Story | Phase | Status |
|----|-------|-------|--------|
| TENANT-01 | Tenant model in DB | Design | Pending |
| TENANT-02 | Barber → Provider rename | Design | Pending |
| TENANT-03 | Tenant resolution middleware | Design | Pending |
| TENANT-04 | Prisma auto-scoping extension | Design | Pending |
| TENANT-05 | Tenant-aware notifications | Design | Pending |
| TENANT-06 | Update existing web frontend | Design | Pending |
| TENANT-07 | CORS multi-origin | Design | Pending |
| TENANT-08 | Deployment split | Design | Pending |
| TENANT-09 | Super-admin auth | Design | Pending |
| TENANT-10 | Super-admin tenant CRUD | Design | Pending |
| TENANT-11 | Reminder job tenant-awareness | Design | Pending |

**Coverage:** 11 total, 0 mapped to tasks, 11 pending design

---

## Success Criteria

- [ ] Soberano booking flow works identically in production after migration
- [ ] Zero production downtime during migration (additive schema changes only)
- [ ] A second barbershop client can be onboarded by: creating tenant via super-admin, deploying a frontend stack with `VITE_TENANT_SLUG=new-slug`
- [ ] Notifications show the correct business name for each tenant
- [ ] No cross-tenant data leakage (verified by test with 2 tenants)
