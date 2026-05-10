# Web Internal API Proxy Specification

## Problem Statement

`packages/web` currently bakes `VITE_API_URL` into the browser bundle and the production deploy guide still depends on a public API domain. That makes each frontend build environment-specific and ties customer traffic to Coolify/Traefik routing for a separate API hostname. We want `packages/web` to use the same-origin `/api` path in production, with nginx proxying requests over the internal Docker network to the API service.

## Goals

- [ ] Production `packages/web` uses relative `/api` requests for all browser-to-API traffic
- [ ] nginx in `packages/web` proxies `/api/*` to a runtime `API_INTERNAL_URL`
- [ ] Production deploys of `packages/web` no longer require `VITE_API_URL`
- [ ] Local development and automated tests continue to work without regressions

## Out of Scope

| Feature | Reason |
|---------|--------|
| `packages/web-admin` proxy migration | This spec is only for `packages/web` |
| API route/business-logic changes | The backend contract stays the same; only request routing changes |
| Tenant resolution redesign | `X-Tenant-Slug` behavior remains as-is |
| MCP or other nginx routes beyond what `packages/web` needs | Keep this change focused on frontend API traffic |

---

## User Stories

### P1: Same-Origin API Traffic ⭐ MVP

**User Story**: As a customer or barber using the Soberano web app, I want the frontend to call the backend through the same public domain so that booking and admin flows do not depend on a separate public API hostname.

**Why P1**: This removes the environment-specific API-domain dependency that is currently causing production routing friction.

**Acceptance Criteria**:

1. WHEN `packages/web` runs in production THEN all browser API requests SHALL target relative `/api` paths rather than a baked absolute API origin
2. WHEN nginx in the `web` container receives `/api/*` traffic THEN it SHALL proxy the request to `API_INTERNAL_URL` on the Docker network
3. WHEN proxied requests include cookies, `Authorization`, or `X-Tenant-Slug` headers THEN nginx SHALL forward them to the API unchanged
4. WHEN the API responds to auth flows such as login, refresh, or logout THEN browser behavior SHALL remain unchanged for credentials and session continuity
5. WHEN a user refreshes a client-side route THEN nginx SHALL still serve the SPA, while `/api/*` paths SHALL never fall through to `index.html`

**Independent Test**: Deploy `packages/web` without a public API domain, open the tenant site, complete a booking flow, then log into the barber area and verify authenticated requests succeed through `/api`.

---

### P1: Deploy Without Build-Time API Domain ⭐ MVP

**User Story**: As an operator deploying `packages/web`, I want production runtime configuration to use an internal API URL so that frontend deploys are not coupled to a public API hostname in Coolify.

**Why P1**: This is the operational change that addresses the multi-environment problem.

**Acceptance Criteria**:

1. WHEN `packages/web` is built for production THEN `VITE_API_URL` SHALL NOT be required for the browser bundle
2. WHEN a production `web` container starts THEN it SHALL read `API_INTERNAL_URL` as the nginx proxy target
3. WHEN the deployment guide is followed THEN customer traffic SHALL use only the tenant web domain for browser-to-API access
4. WHEN a new tenant frontend is deployed THEN the required production config SHALL be limited to tenant-specific values plus the internal API target

**Independent Test**: Review the built frontend assets and confirm they do not contain the public API hostname, then deploy using only the tenant domain plus `API_INTERNAL_URL`.

---

### P2: Preserve Local Developer Workflow

**User Story**: As a developer, I want local `packages/web` development to keep working after this migration so that production routing changes do not slow down day-to-day frontend work.

**Why P2**: The production fix should not break local feedback loops.

**Acceptance Criteria**:

1. WHEN `packages/web` runs via the Vite dev server THEN API requests SHALL continue to work through the local dev setup
2. WHEN `VITE_API_URL` is used locally for an explicit override THEN the frontend SHALL still support that workflow
3. WHEN frontend tests run THEN they SHALL NOT depend on a production-only absolute API origin

**Independent Test**: Run local web development and the existing web test suite after the migration and confirm both still pass.

---

## Edge Cases

- WHEN `API_INTERNAL_URL` is missing or invalid in production THEN the deployment/runbook SHALL make the failure mode explicit rather than silently relying on a public API URL
- WHEN nginx handles SPA deep links and API requests THEN `/api/*` SHALL be matched before the SPA fallback
- WHEN the frontend is deployed in multiple environments on the same Coolify instance THEN production browser traffic SHALL no longer depend on Traefik routing for a separate API hostname

---

## Requirement Traceability

| Requirement ID | Story | Phase | Status |
|--------------|-------|------|--------|
| WPROXY-01 | P1: Same-Origin API Traffic | Design | Pending |
| WPROXY-02 | P1: Same-Origin API Traffic | Design | Pending |
| WPROXY-03 | P1: Same-Origin API Traffic | Design | Pending |
| WPROXY-04 | P1: Deploy Without Build-Time API Domain | Design | Pending |
| WPROXY-05 | P1: Deploy Without Build-Time API Domain | Design | Pending |
| WPROXY-06 | P2: Preserve Local Developer Workflow | Design | Pending |

**Coverage:** 6 total, 0 mapped to tasks, 6 unmapped pending review

---

## Success Criteria

- [ ] Booking and barber-auth flows work through the tenant web domain without exposing a public API hostname in frontend assets
- [ ] Production `packages/web` deploy docs/config use `API_INTERNAL_URL` instead of `VITE_API_URL`
- [ ] Local development and current web tests still work after the routing change
