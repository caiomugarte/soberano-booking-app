# Web Internal API Proxy — Tasks

**Spec**: `.specs/features/web-internal-api-proxy/spec.md`
**Status**: Draft

---

## Execution Plan

```text
Phase 1 — Frontend runtime behavior (sequential):
  T1

Phase 2 — Production proxy/runtime config (parallel after T1):
  T1 complete, then:
    ├── T2 [P]
    ├── T3 [P]
    └── T4 [P]

Phase 3 — Docs + verification (sequential after T2, T3, T4):
  T2 + T3 + T4 complete, then:
    T5 → T6
```

---

## Task Breakdown

### T1: Switch web API clients to same-origin `/api` by default

**What**: Update the public and authenticated web API helpers so production requests use same-origin `/api` paths, while still allowing a local `VITE_API_URL` override when explicitly provided.
**Where**:
- `packages/web/src/config/api.ts`
- `packages/web/src/api/auth-request.ts`
- `packages/web/src/stores/auth.store.ts` only if a small adjustment is required to keep logout/refresh behavior aligned

**Depends on**: None
**Reuses**: Existing `api` and `authRequest` fetch wrappers
**Requirement**: WPROXY-01, WPROXY-03, WPROXY-06

**Tools**:

- MCP: `filesystem`
- Skill: `coding-guidelines`, `react-best-practices`

**Done when**:

- [ ] Public requests default to `/api/...` when `VITE_API_URL` is absent
- [ ] Authenticated requests, refresh, and logout default to same-origin `/api/...` when `VITE_API_URL` is absent
- [ ] `VITE_API_URL` still works as an explicit local override
- [ ] `X-Tenant-Slug`, cookies, and `Authorization` behavior remain unchanged from the caller perspective
- [ ] `npm -w @soberano/web run build` passes

**Commit**: `refactor(web): default API clients to same-origin proxy`

---

### T2: Add nginx `/api` proxying to the web container [P]

**What**: Extend the web nginx config so `/api/*` requests are proxied to the internal API service and never fall through to the SPA route handler.
**Where**: `packages/web/nginx.conf`
**Depends on**: T1
**Reuses**: Proxy header pattern already used in `packages/web-admin/nginx.conf`
**Requirement**: WPROXY-02, WPROXY-03

**Tools**:

- MCP: `filesystem`
- Skill: NONE

**Done when**:

- [ ] `location /api` exists before the SPA fallback or is otherwise guaranteed to match first
- [ ] nginx proxies `/api/*` to `${API_INTERNAL_URL}`
- [ ] `Host`, `X-Real-IP`, `X-Forwarded-For`, and `X-Forwarded-Proto` headers are forwarded
- [ ] Cookies and auth-related headers are not blocked by the nginx config
- [ ] SPA deep links still resolve to `index.html`

**Commit**: `feat(web): proxy api traffic through nginx`

---

### T3: Remove build-time API origin from the web Docker image [P]

**What**: Stop injecting `VITE_API_URL` into the production web image so the browser bundle no longer depends on a public API hostname.
**Where**: `packages/web/Dockerfile`
**Depends on**: T1
**Reuses**: Existing multi-stage Docker build and test-before-build flow
**Requirement**: WPROXY-04, WPROXY-06

**Tools**:

- MCP: `filesystem`
- Skill: NONE

**Done when**:

- [ ] `ARG VITE_API_URL` and `ENV VITE_API_URL` are removed from the Docker build
- [ ] `VITE_TENANT_SLUG` remains available for the frontend build
- [ ] The existing test step still runs during image build
- [ ] `npm -w @soberano/shared run build`
- [ ] `npm -w @soberano/web run test`
- [ ] `npm -w @soberano/web run build`

**Commit**: `build(web): remove build-time API URL injection`

---

### T4: Switch the tenant web deploy stack to runtime `API_INTERNAL_URL` [P]

**What**: Update the web deployment config so nginx receives `API_INTERNAL_URL` at container runtime instead of relying on a frontend build arg for API origin.
**Where**: `docker-compose.web.yaml`
**Depends on**: T1
**Reuses**: Existing runtime nginx template pattern
**Requirement**: WPROXY-02, WPROXY-05

**Tools**:

- MCP: `filesystem`
- Skill: NONE

**Done when**:

- [ ] `docker-compose.web.yaml` no longer passes `VITE_API_URL` as a build arg
- [ ] `docker-compose.web.yaml` provides runtime `API_INTERNAL_URL` to the `web` container
- [ ] `VITE_TENANT_SLUG` remains available where the build still needs it
- [ ] The deployment shape stays compatible with the Coolify shared-network approach

**Commit**: `chore(deploy): use runtime internal API URL for tenant web`

---

### T5: Update the tenant web deployment runbook

**What**: Rewrite the `packages/web` deployment instructions to use `API_INTERNAL_URL` instead of `VITE_API_URL`, and make the same-origin browser-to-API flow explicit.
**Where**: `DEPLOY.md`
**Depends on**: T2, T3, T4
**Reuses**: Existing Soberano web deployment section and later tenant deployment references
**Requirement**: WPROXY-05, WPROXY-06

**Tools**:

- MCP: `filesystem`
- Skill: `docs-writer`

**Done when**:

- [ ] The Soberano web deployment section no longer instructs operators to set `VITE_API_URL` for production
- [ ] The doc tells operators to configure `API_INTERNAL_URL` for the nginx proxy target
- [ ] Later tenant-web deployment references to build-time public API origin are removed or corrected
- [ ] Validation steps reflect that browser API traffic now goes through `https://<tenant-domain>/api/...`

**Commit**: `docs(deploy): document tenant web internal API proxy setup`

---

### T6: Verify same-origin tenant web behavior end to end

**What**: Run build/test-level checks and define the manual validation needed to prove the tenant web frontend no longer depends on a public API hostname.
**Where**: Verification only
**Depends on**: T1, T2, T3, T4, T5
**Reuses**: Existing booking flow and barber-auth flow
**Requirement**: WPROXY-01, WPROXY-02, WPROXY-03, WPROXY-04, WPROXY-05, WPROXY-06

**Tools**:

- MCP: `filesystem`
- Skill: NONE

**Done when**:

- [ ] `npm -w @soberano/shared run build`
- [ ] `npm -w @soberano/web run test`
- [ ] `npm -w @soberano/web run build`
- [ ] Built web assets do not contain the public API hostname string
- [ ] Manual check: customer booking flow works through the tenant domain
- [ ] Manual check: barber login plus an authenticated admin request succeeds through `/api/...`
- [ ] Manual check: refreshing a client-side route still loads the SPA while `/api/*` stays proxied

**Commit**: `test(web): verify internal API proxy deployment behavior`

---

## Parallel Execution Map

```text
Phase 1:
  T1

Phase 2:
  T1 complete, then:
    ├── T2 [P]
    ├── T3 [P]
    └── T4 [P]

Phase 3:
  T2 + T3 + T4 complete, then:
    T5 ──→ T6
```

---

## Task Granularity Check

| Task | Scope | Status |
|---|---|---|
| T1: Update web API base resolution | 2-3 tightly related frontend client files | OK |
| T2: Add nginx API proxy | 1 nginx config file | OK |
| T3: Remove Docker build arg coupling | 1 Dockerfile | OK |
| T4: Switch runtime deploy env to `API_INTERNAL_URL` | 1 compose file | OK |
| T5: Update deployment guide | 1 documentation file | OK |
| T6: Verification checklist | Verification only | OK |

---

## Recommended Tools For Execution

- Skills: `coding-guidelines`, `react-best-practices`, `docs-writer`
- Local commands: `npm -w @soberano/shared run build`, `npm -w @soberano/web run test`, `npm -w @soberano/web run build`
- Manual validation target: tenant domain booking flow and barber-auth flow through same-origin `/api`
