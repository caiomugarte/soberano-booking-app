# Multi-Tenant SaaS Platform Specification

**Status:** Draft — awaiting gray area discussion  
**Created:** 2026-04-05  
**Feature ID:** MTS

---

## Problem Statement

The platform was built exclusively for Soberano Barbearia. The core scheduling engine, admin dashboard, and WhatsApp notifications are all generic enough to serve any barbershop — but nothing in the codebase, database, or infrastructure supports running a second client today. To monetize the investment already made and grow recurring revenue, the platform must support multiple clients (tenants) from a single codebase, single API, and single database while allowing each client to have a branded frontend and a different set of enabled features.

---

## Goals

- [ ] Any new barbershop can be onboarded without touching existing client data
- [ ] Each client's data is fully isolated — a query for client A never leaks client B's records
- [ ] Each client can have a distinct branded frontend (different colors, logo, copy, domain)
- [ ] Features can be enabled or disabled per client (maps to plan tiers)
- [ ] Soberano Barbearia migrates to the multi-tenant model with zero disruption
- [ ] Infrastructure scales to ~20 clients on the current VPS without architectural rework

---

## Out of Scope

| Feature | Reason |
|---------|--------|
| Self-service client signup | Manual onboarding is fine for early SaaS — automate later |
| Online payment / subscription billing | Separate feature; clients pay Caio directly for now |
| Per-barber feature toggles | Feature flags are per-client (plan level), not per-barber |
| Cross-tenant analytics / reporting | Super-admin dashboard v2 |
| Client-facing SLA or uptime guarantees | Infrastructure concern, not product |
| Custom domain SSL automation (Let's Encrypt) | Manual setup per client for now |

---

## Users & Roles (Updated)

| Role | Auth | Scope |
|------|------|-------|
| Customer | None | Books/cancels within one client's portal |
| Barber (Client Admin) | Email + password | Manages their own client's appointments, schedule, barbers |
| **Super-Admin** | Email + password (separate) | Manages clients, onboards new tenants, configures feature flags |

---

## User Stories

### P1: Tenant Isolation — Data Layer ⭐ MVP

**User Story:** As a super-admin, I want every database record to belong to a specific client so that no client can ever see another client's data.

**Why P1:** Without this, nothing else is safe to build. This is the foundation.

**Acceptance Criteria:**

1. WHEN any query runs THEN system SHALL scope results to the resolved `clientId`
2. WHEN a barber from Client A calls `/api/admin/appointments` THEN system SHALL return only Client A's appointments
3. WHEN a customer books at Client A's URL THEN system SHALL associate the appointment with Client A
4. WHEN a new record is created (barber, service, appointment, etc.) THEN system SHALL require a valid `clientId`

**Independent Test:** Create two clients with identical barber slugs. Booking on client A must not appear in client B's admin dashboard.

---

### P1: Tenant Resolution — API Layer ⭐ MVP

**User Story:** As the API, I want to know which client I'm serving on every request so that I can scope all data access correctly.

**Why P1:** The API is shared; every request must resolve the tenant before any handler runs.

**Acceptance Criteria:**

1. WHEN a request arrives THEN system SHALL resolve the `clientId` from a tenant identifier (subdomain, header, or path — TBD in design)
2. WHEN the tenant identifier is invalid or missing THEN system SHALL return `400` with an appropriate error
3. WHEN a JWT token is validated THEN system SHALL verify the barber belongs to the resolved tenant
4. WHEN the tenant is resolved THEN system SHALL make `clientId` available throughout the request lifecycle

**Independent Test:** Two clients configured; API correctly routes and scopes requests for each based on tenant identifier.

---

### P1: Client Configuration — Feature Flags ⭐ MVP

**User Story:** As a super-admin, I want to enable or disable specific features per client so that I can sell different plan tiers without deploying separate code.

**Why P1:** The core monetization mechanism. Site-only vs AI plan is a feature flag.

**Acceptance Criteria:**

1. WHEN a client is created THEN system SHALL store a feature flags configuration for that client
2. WHEN a request arrives for a feature (e.g., AI chatbot endpoint) THEN system SHALL check if that feature is enabled for the resolved client
3. WHEN a feature is disabled THEN system SHALL return `403` with message "Feature not enabled for this plan"
4. WHEN super-admin updates a client's flags THEN system SHALL take effect on the next request (no redeploy)
5. WHEN frontend loads THEN system SHALL receive the client's enabled features so it can show/hide UI elements

**Independent Test:** Disable `whatsapp-ai` for client A. Client A's frontend hides the AI chatbot entry point. Client B (with it enabled) shows it normally.

---

### P1: White-Label Frontend ⭐ MVP

**User Story:** As a client (barbershop owner), I want my booking portal to look like my brand so that my customers feel it belongs to my shop.

**Why P1:** Clients won't pay for a portal with another shop's name and colors.

**Acceptance Criteria:**

1. WHEN a frontend is deployed for a client THEN system SHALL display that client's brand (name, primary color, logo)
2. WHEN two clients are deployed from the same codebase THEN system SHALL render each with their own brand without code duplication
3. WHEN a client's theme config changes THEN system SHALL reflect it without redeployment (config-driven)
4. WHEN a client has no logo THEN system SHALL fall back to text-based shop name

**Independent Test:** Deploy same frontend code for two clients with different theme configs. Each renders its own brand correctly.

---

### P1: Soberano Migration ⭐ MVP

**User Story:** As Soberano Barbearia (existing client), I want the migration to multi-tenant to be invisible so that there is zero downtime or data loss.

**Why P1:** We can't break the one paying client we already have.

**Acceptance Criteria:**

1. WHEN the migration runs THEN system SHALL seed a `Client` record for Soberano with its existing config
2. WHEN the migration runs THEN system SHALL backfill `clientId` on all existing Barber, Service, Customer, and Appointment records
3. WHEN migration completes THEN all existing Soberano URLs, tokens, and WhatsApp links SHALL continue to work
4. WHEN migration completes THEN Soberano's admin dashboard SHALL function identically to before

**Independent Test:** Run migration on a copy of prod DB. All existing Soberano records have `clientId`. All admin API calls still return correct data.

---

### P2: Super-Admin Panel

**User Story:** As a super-admin, I want a dashboard to create and configure clients so that I can onboard new barbershops without writing SQL.

**Why P2:** Important for scalability but the first few clients can be onboarded manually via DB seeds.

**Acceptance Criteria:**

1. WHEN super-admin logs in THEN system SHALL show a list of all clients with status and enabled features
2. WHEN super-admin creates a client THEN system SHALL provision a `Client` record with slug, name, theme, and feature flags
3. WHEN super-admin updates a client's feature flags THEN system SHALL immediately reflect changes in API responses
4. WHEN super-admin views a client THEN system SHALL show aggregate stats (total appointments, total revenue)

**Independent Test:** Create a new client via super-admin panel. New client's slug resolves correctly on the API.

---

### P2: Per-Client Environment Configuration

**User Story:** As the system, I want each client to have its own WhatsApp credentials and base URL so that notifications come from the client's own number, not a shared one.

**Why P2:** Clients need WhatsApp messages branded with their own shop contact.

**Acceptance Criteria:**

1. WHEN a WhatsApp notification is sent for Client A THEN system SHALL use Client A's Chatwoot credentials
2. WHEN a cancel/reschedule link is generated THEN system SHALL use Client A's BASE_URL, not a shared URL
3. WHEN a client has no WhatsApp configured THEN system SHALL degrade gracefully (log only, as today)

---

### P3: Client Onboarding CLI / Script

**User Story:** As a developer (Caio), I want a CLI script to onboard a new client so that I can set up a new barbershop in under 10 minutes.

**Why P3:** Nice to have for repeatability. Manual DB + env setup works initially.

**Acceptance Criteria:**

1. WHEN script runs with client config (name, slug, features, theme) THEN system SHALL create Client record and seed initial barbers/services template
2. WHEN script completes THEN system SHALL output a checklist of remaining manual steps (DNS, SSL, WhatsApp setup)

---

## Edge Cases

- WHEN two clients share a barber slug (e.g., both have `matheus`) THEN system SHALL resolve correctly because slug uniqueness is scoped to `clientId`
- WHEN a JWT from Client A is sent to Client B's subdomain THEN system SHALL reject the request (`403 Tenant mismatch`)
- WHEN a `cancelToken` from one client is used on another client's domain THEN system SHALL return `404`
- WHEN a client is deactivated THEN system SHALL return `503` for all customer-facing requests for that client
- WHEN the DB has a record without `clientId` (pre-migration) THEN migration script SHALL assign it to Soberano

---

## Requirement Traceability

| Requirement ID | Story | Phase | Status |
|----------------|-------|-------|--------|
| MTS-01 | P1: Tenant Isolation | Design | Pending |
| MTS-02 | P1: Tenant Resolution | Design | Pending |
| MTS-03 | P1: Feature Flags | Design | Pending |
| MTS-04 | P1: White-Label Frontend | Design | Pending |
| MTS-05 | P1: Soberano Migration | Design | Pending |
| MTS-06 | P2: Super-Admin Panel | Design | Pending |
| MTS-07 | P2: Per-Client Env Config | Design | Pending |
| MTS-08 | P3: Onboarding Script | - | Pending |

---

## Success Criteria

- [ ] A second barbershop can be onboarded in < 1 hour by Caio without touching Soberano's data
- [ ] Soberano's booking flow works identically after migration
- [ ] Feature flags for AI plan can be toggled per-client without redeploy
- [ ] Each client's frontend shows its own brand (name, color, logo)
- [ ] No cross-tenant data leakage in any API response (verified by test)
