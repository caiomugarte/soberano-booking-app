# Web Bruno Internal API Proxy Specification

## Problem Statement

`packages/web-bruno` still builds browser requests around `VITE_API_URL`, its nginx config only serves the SPA, and its production docs already say the API should be proxied at `/api`. That means the psychology frontend has the same production environment-coupling problem as `packages/web`: the desired same-origin model exists in documentation, but not in the deployed runtime path.

## Goals

- [ ] Production `packages/web-bruno` uses relative `/api` requests for all browser-to-API traffic
- [ ] nginx in `packages/web-bruno` proxies `/api/*` to a runtime `API_INTERNAL_URL`
- [ ] Production deploys of `packages/web-bruno` no longer require `VITE_API_URL`
- [ ] Psychology auth, session, patient, document, report, and settings flows keep working through the tenant web domain

## Out of Scope

| Feature | Reason |
|---------|--------|
| New psychology API endpoints | Backend scope is handled by the existing `web-bruno-api-migration` and `psychology-api` work |
| `packages/web` or `packages/web-admin` changes | Covered by their own specs |
| Tenant resolution redesign | Current `VITE_TENANT_SLUG` and tenant-header behavior remain unchanged |
| UI redesign or UX changes | This is strictly about API routing/runtime configuration |

---

## User Stories

### P1: Same-Origin Psychology API Traffic ⭐ MVP

**User Story**: As Bruno using the psychology panel, I want the frontend to call the API through the same public domain so that auth and clinical workflows do not depend on a separate public API hostname.

**Why P1**: This removes the same multi-environment production risk affecting the other tenant frontends.

**Acceptance Criteria**:

1. WHEN `packages/web-bruno` runs in production THEN browser API requests SHALL target relative `/api` paths rather than a baked absolute origin
2. WHEN nginx in the `web-bruno` container receives `/api/*` traffic THEN it SHALL proxy the request to `API_INTERNAL_URL`
3. WHEN requests include cookies, `Authorization`, or `x-tenant-slug` headers THEN nginx SHALL forward them unchanged to the API
4. WHEN Bruno logs in, silently refreshes a session, loads patients, manages sessions, edits reports, or updates settings THEN those flows SHALL continue to work through the same public domain
5. WHEN a client-side route is refreshed directly THEN SPA routes SHALL still serve `index.html`, while `/api/*` requests SHALL never fall through to the SPA

**Independent Test**: Deploy `packages/web-bruno` without a public API domain, log in, load patients and sessions, then verify refresh/logout and a representative write action succeed through `/api`.

---

### P1: Runtime Internal API Target ⭐ MVP

**User Story**: As an operator deploying `packages/web-bruno`, I want the production runtime to point nginx at an internal API URL so that the frontend build is not tied to a specific public API hostname.

**Why P1**: This is the operational change needed to make the psychology frontend consistent with the internal-proxy approach.

**Acceptance Criteria**:

1. WHEN `packages/web-bruno` is built for production THEN `VITE_API_URL` SHALL NOT be required for the browser bundle
2. WHEN the `web-bruno` container starts in production THEN nginx SHALL read `API_INTERNAL_URL` as the proxy target
3. WHEN the production build output is inspected THEN it SHALL NOT contain the public API hostname
4. WHEN deployment docs are followed THEN browser-to-API traffic SHALL use only the tenant frontend domain plus the internal proxy target

**Independent Test**: Inspect built assets for the absence of the public API hostname, then deploy using only the tenant domain and `API_INTERNAL_URL`.

---

### P2: Preserve Local Developer Workflow

**User Story**: As a developer, I want local `packages/web-bruno` development to remain workable after this migration so that production improvements do not complicate API development.

**Why P2**: The app currently relies on explicit API origin configuration; the migration needs a clear local path.

**Acceptance Criteria**:

1. WHEN `packages/web-bruno` runs locally THEN API requests SHALL continue to work through a documented development setup
2. WHEN `VITE_API_URL` is used locally as an explicit override THEN that workflow SHALL remain supported
3. WHEN local development is run without the production nginx layer THEN the project docs/config SHALL clearly define how `/api` traffic is resolved

**Independent Test**: Start `packages/web-bruno` locally with the documented dev setup and verify login plus a representative authenticated query work.

---

## Edge Cases

- WHEN `API_INTERNAL_URL` is missing or invalid in production THEN the failure mode SHALL be explicit in deployment documentation rather than silently reverting to a baked public origin
- WHEN auth refresh uses cookies across the same-origin `/api` path THEN session continuity SHALL remain intact
- WHEN `packages/web-bruno` continues to send `x-tenant-slug` for multi-tenant routing THEN the internal proxy SHALL not interfere with tenant resolution

---

## Requirement Traceability

| Requirement ID | Story | Phase | Status |
|--------------|-------|------|--------|
| WBRUNOPROXY-01 | P1: Same-Origin Psychology API Traffic | Design | Pending |
| WBRUNOPROXY-02 | P1: Same-Origin Psychology API Traffic | Design | Pending |
| WBRUNOPROXY-03 | P1: Same-Origin Psychology API Traffic | Design | Pending |
| WBRUNOPROXY-04 | P1: Runtime Internal API Target | Design | Pending |
| WBRUNOPROXY-05 | P1: Runtime Internal API Target | Design | Pending |
| WBRUNOPROXY-06 | P2: Preserve Local Developer Workflow | Design | Pending |

**Coverage:** 6 total, 0 mapped to tasks, 6 unmapped pending review

---

## Success Criteria

- [ ] Psychology frontend flows work through the tenant public domain without baking a public API hostname into frontend assets
- [ ] Production `packages/web-bruno` deploy config uses `API_INTERNAL_URL` instead of `VITE_API_URL`
- [ ] Local `packages/web-bruno` development remains workable with clear routing documentation
