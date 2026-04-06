# Multi-Tenant SaaS Context

**Gathered:** 2026-04-05  
**Spec:** `.specs/features/multi-tenant-saas/spec.md`  
**Status:** Ready for design

---

## Feature Boundary

Transform the current single-client barbershop platform into a multi-tenant SaaS where multiple barbershops (clients/tenants) share one codebase, one API, and one database — each with their own branded frontend, isolated data, and configurable feature set.

---

## Implementation Decisions

### 1. Database Multi-Tenancy Strategy

- **Shared schema with `clientId` FK on every table** (Row-Level Tenancy)
- All tenants coexist in the same tables; every tenant-owned row carries a `clientId` foreign key
- A `Client` table is the anchor: all existing tables (Barber, Service, Customer, Appointment, etc.) get a `clientId` column
- Uniqueness constraints that are currently global (e.g., barber slug, customer phone) must be scoped to `(clientId, slug)` and `(clientId, phone)`
- The API middleware resolves the tenant and injects `clientId` into every repository call — no handler touches data without a resolved tenant

### 2. Infrastructure / Kubernetes

- **Deferred** — not needed at current scale (~5–20 clients)
- Current VPS + Coolify (Docker-based) is sufficient
- K8s is NOT free: managed control plane costs $50–150/mo plus compute — not worth it until ≥50 clients or a client demands a formal SLA
- Revisit when: hitting resource limits on VPS, needing zero-downtime deploys at scale, or having dedicated DevOps support

### 3. Frontend Architecture

- **Monorepo with a shared design system** — Option B
- Structure: `packages/ui` (shared component library with theming), `apps/[client-slug]` per deployed client
- Each client app is thin: it imports from `packages/ui`, provides its own `theme.config.ts` (colors, logo, name, typography), and can override specific pages or components if needed
- Default path: rapid rollout using only theme config — no custom code needed per client
- Premium path: client wants a fully custom frontend → we build it as a separate `apps/[slug]` with deeper overrides, billed as a custom project
- This means Soberano gets migrated into `apps/soberano` as the reference implementation

### 4. Tenant Resolution

- **Subdomain + custom domain combined** (A + B)
- Default pattern: `[client-slug].altion.com.br` (e.g., `soberano.altion.com.br`)
- Custom domain: client brings their own domain (e.g., `agenda.soberanobarbearia.com`) → DNS CNAME points to our server
- **Mechanism:** The web container's nginx already forwards the original `Host` header to the API via `proxy_set_header Host $host`. The API Fastify middleware reads `request.headers.host`, strips the subdomain to get the slug, or does a DB lookup against `Client.customDomain` for custom domains.
- Resolution order: check `Client.customDomain` match first → fall back to subdomain extraction from `Host`
- No `X-Client-Slug` header needed — `Host` forwarding is already in place via nginx
- **Deployment model:** API, PostgreSQL, and MCP are shared services (one Coolify stack). Each new client only adds one new web container with its own domain and `API_INTERNAL_URL` pointing to the shared API container.
- DNS wildcard `*.altion.com.br` + SSL wildcard cert covers all subdomain clients; custom domains need per-client SSL setup (manual for now)

### 5. Feature Flags

- **Explicit feature list per client** — Option B
- Client record stores `enabledFeatures: string[]` — an array of named feature keys
- A central feature registry (in code) defines all valid feature keys and their descriptions
- Plan tiers map to feature presets: `"site-only"` plan = `["booking", "admin-dashboard", "whatsapp-notifications", "schedule-management"]`; `"ai"` plan = all of the above + `["whatsapp-ai-chatbot", "ai-features"]`
- API middleware checks feature flags before reaching feature-specific handlers
- Frontend receives the client's `enabledFeatures` on app load (via a public `/api/client/config` endpoint) and uses it to show/hide UI elements
- Super-admin can override individual flags without changing the plan (for custom deals)

### Agent's Discretion

- Exact feature key names in the registry (e.g., `whatsapp-ai` vs `ai-chatbot`) — agent decides during design
- Whether `clientId` is injected via Fastify request decoration or a context object passed to repositories — agent decides during design
- Prisma migration strategy for backfilling `clientId` on existing Soberano records — agent decides during design

---

## Specific References

- Current domain: `altion.com.br` — platform brand; `soberano.altion.com.br` is the first client
- Current deployment: VPS on Hostinger, managed by Coolify
- Existing Soberano data must be backfilled to the new `Client` record — zero disruption requirement

---

## Deferred Ideas

- K8s / container orchestration — revisit at ≥50 clients or formal SLA requirement
- Self-service client signup — manual onboarding is fine for early growth
- Per-client SSL automation (Let's Encrypt wildcard renewal is manual for now)
- Super-admin analytics dashboard — aggregate revenue/appointment stats across all clients
- Fully custom frontend builds for premium clients — architecture supports it, but it's a separate commercial offering
