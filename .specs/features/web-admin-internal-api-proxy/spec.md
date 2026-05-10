# Web Admin Internal API Proxy Specification

## Problem Statement

`packages/web-admin` already has nginx proxy rules for `/api`, but the frontend code and deploy configuration still depend on a build-time `VITE_API_URL`. That leaves the super-admin panel partially coupled to a public API hostname even though the container is already prepared to proxy API traffic internally. We want `packages/web-admin` to complete the same-origin `/api` model in production.

## Goals

- [ ] Production `packages/web-admin` uses relative `/api/platform` requests in the browser
- [ ] Production deploys of `packages/web-admin` no longer require `VITE_API_URL`
- [ ] The existing nginx `/api` proxy in `packages/web-admin` becomes the single production API-routing path
- [ ] Super-admin login and tenant-management flows keep working through the admin domain

## Out of Scope

| Feature | Reason |
|---------|--------|
| `packages/web` changes | Covered by the existing `web-internal-api-proxy` spec |
| `packages/web-bruno` changes | Covered separately because its frontend and routes differ |
| New platform endpoints or auth behavior | Backend contract stays unchanged |
| MCP routing changes | Existing `/mcp` proxy behavior is not part of this migration |

---

## User Stories

### P1: Same-Origin Platform API Traffic ⭐ MVP

**User Story**: As a super-admin user, I want the admin panel to call the platform API through the same public domain so that login and tenant-management flows do not depend on a separate public API hostname.

**Why P1**: `packages/web-admin` already has most of the proxy foundation; completing it removes the remaining production coupling.

**Acceptance Criteria**:

1. WHEN `packages/web-admin` runs in production THEN browser requests to the platform API SHALL use relative `/api/platform` paths rather than a baked absolute origin
2. WHEN nginx receives `/api/*` traffic in the `web-admin` container THEN it SHALL proxy the request to `API_INTERNAL_URL`
3. WHEN platform requests include `Authorization` headers THEN nginx SHALL forward them unchanged to the API
4. WHEN a super-admin logs in, loads tenants, edits tenants, or toggles tenant settings THEN those flows SHALL continue to work through the admin domain

**Independent Test**: Deploy `packages/web-admin` without a public API domain, log in at the admin URL, list tenants, and save a tenant update successfully.

---

### P1: Runtime Internal API Target ⭐ MVP

**User Story**: As an operator deploying `packages/web-admin`, I want runtime nginx config to use `API_INTERNAL_URL` so that the admin frontend is not environment-specific at build time.

**Why P1**: This aligns the super-admin deploy model with the internal Docker-network proxy approach.

**Acceptance Criteria**:

1. WHEN `packages/web-admin` is built for production THEN `VITE_API_URL` SHALL NOT be required in the browser bundle
2. WHEN the admin container starts in production THEN nginx SHALL read `API_INTERNAL_URL` as the proxy target
3. WHEN the deployment guide is followed THEN browser-to-API traffic for the admin panel SHALL flow only through the admin public domain

**Independent Test**: Inspect the production build output and confirm it does not contain the public API hostname, then deploy with only the admin domain plus `API_INTERNAL_URL`.

---

### P2: Preserve Local Development

**User Story**: As a developer, I want local `packages/web-admin` development to keep working after this migration so that the production simplification does not slow down day-to-day work.

**Why P2**: The migration should improve production without creating local friction.

**Acceptance Criteria**:

1. WHEN `packages/web-admin` runs locally THEN API requests SHALL still work through the current dev setup
2. WHEN `VITE_API_URL` is used locally as an explicit override THEN the frontend SHALL still support that workflow
3. WHEN `packages/web-admin` adopts relative production paths THEN local development documentation SHALL remain unambiguous about how API traffic is resolved

**Independent Test**: Start the admin frontend locally and verify login plus tenant list loading still work.

---

## Edge Cases

- WHEN the admin app serves a deep client-side route THEN nginx SHALL still return `index.html`, while `/api/*` requests SHALL remain proxied
- WHEN `API_INTERNAL_URL` is missing in production THEN the deployment/runbook SHALL not imply that `VITE_API_URL` is still a valid production fallback
- WHEN the admin app sends authenticated requests after login THEN same-origin proxying SHALL not strip `Authorization` headers

---

## Requirement Traceability

| Requirement ID | Story | Phase | Status |
|--------------|-------|------|--------|
| WADMINPROXY-01 | P1: Same-Origin Platform API Traffic | Design | Pending |
| WADMINPROXY-02 | P1: Same-Origin Platform API Traffic | Design | Pending |
| WADMINPROXY-03 | P1: Runtime Internal API Target | Design | Pending |
| WADMINPROXY-04 | P1: Runtime Internal API Target | Design | Pending |
| WADMINPROXY-05 | P2: Preserve Local Development | Design | Pending |

**Coverage:** 5 total, 0 mapped to tasks, 5 unmapped pending review

---

## Success Criteria

- [ ] Super-admin flows work through the admin public domain without baking a public API hostname into frontend assets
- [ ] Production `packages/web-admin` deploy config uses `API_INTERNAL_URL` instead of `VITE_API_URL`
- [ ] Local admin development remains functional and clearly documented
