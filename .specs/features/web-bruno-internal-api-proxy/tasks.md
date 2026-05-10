# Web Bruno Internal API Proxy — Tasks

**Spec**: `.specs/features/web-bruno-internal-api-proxy/spec.md`
**Status**: Draft

---

## Execution Plan

```text
Phase 1 — Frontend runtime behavior (sequential):
  T1

Phase 2 — Local + production routing config (parallel after T1):
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

### T1: Switch the psychology HTTP client to same-origin `/api` by default

**What**: Update the shared `web-bruno` HTTP client so production requests use same-origin `/api` paths, while still allowing a local `VITE_API_URL` override when explicitly provided.
**Where**: `packages/web-bruno/src/api/http-client.ts`
**Depends on**: None
**Reuses**: Existing `doFetch()`, `apiFetch()`, `tryRefreshToken()`, and `callLogout()` flow
**Requirement**: WBRUNOPROXY-01, WBRUNOPROXY-03, WBRUNOPROXY-06

**Tools**:

- MCP: `filesystem`
- Skill: `coding-guidelines`, `react-best-practices`

**Done when**:

- [ ] `doFetch()` defaults to same-origin `/api/...` requests when `VITE_API_URL` is absent
- [ ] `VITE_API_URL` still works as an explicit local override
- [ ] Login, refresh, logout, and authenticated retry logic continue using the same HTTP client
- [ ] `x-tenant-slug`, cookies, and `Authorization` behavior remain unchanged from the caller perspective
- [ ] `npm -w psicologo run build` passes

**Commit**: `refactor(web-bruno): default API client to same-origin proxy`

---

### T2: Add a Vite `/api` dev proxy for local development [P]

**What**: Configure the `web-bruno` dev server to proxy `/api` to the local API so relative browser requests work in development without requiring an absolute production-style origin.
**Where**: `packages/web-bruno/vite.config.ts`
**Depends on**: T1
**Reuses**: Vite proxy pattern already used in `packages/web/vite.config.ts` and `packages/web-admin/vite.config.ts`
**Requirement**: WBRUNOPROXY-06

**Tools**:

- MCP: `filesystem`
- Skill: NONE

**Done when**:

- [ ] Vite dev server proxies `/api` to the local backend target
- [ ] Existing `@` alias resolution remains intact
- [ ] Local development no longer requires a production-only API origin to exercise relative `/api` calls
- [ ] `npm -w psicologo run build` still passes after the config change

**Commit**: `chore(web-bruno): add local api proxy in vite`

---

### T3: Add nginx `/api` proxying to the web-bruno container [P]

**What**: Extend the `web-bruno` nginx config so `/api/*` requests are proxied to the internal API service and never fall through to the SPA route handler.
**Where**: `packages/web-bruno/nginx.conf`
**Depends on**: T1
**Reuses**: Proxy header pattern already used in `packages/web-admin/nginx.conf`
**Requirement**: WBRUNOPROXY-02, WBRUNOPROXY-03

**Tools**:

- MCP: `filesystem`
- Skill: NONE

**Done when**:

- [ ] `location /api` exists before the SPA fallback or is otherwise guaranteed to match first
- [ ] nginx proxies `/api/*` to `${API_INTERNAL_URL}`
- [ ] `Host`, `X-Real-IP`, `X-Forwarded-For`, and `X-Forwarded-Proto` headers are forwarded
- [ ] Cookies and auth-related headers are not blocked by the nginx config
- [ ] SPA deep links still resolve to `index.html`

**Commit**: `feat(web-bruno): proxy api traffic through nginx`

---

### T4: Remove build-time API origin from the web-bruno Docker image [P]

**What**: Stop injecting `VITE_API_URL` into the production `web-bruno` image so the browser bundle no longer depends on a public API hostname.
**Where**: `packages/web-bruno/Dockerfile`
**Depends on**: T1
**Reuses**: Existing multi-stage Docker build
**Requirement**: WBRUNOPROXY-04, WBRUNOPROXY-05

**Tools**:

- MCP: `filesystem`
- Skill: NONE

**Done when**:

- [ ] `ARG VITE_API_URL` and `ENV VITE_API_URL` are removed from the Docker build
- [ ] `VITE_TENANT_SLUG` remains available for the frontend build
- [ ] `npm -w psicologo run build` still passes

**Commit**: `build(web-bruno): remove build-time API URL injection`

---

### T5: Update web-bruno development and deployment documentation

**What**: Rewrite the package documentation so local development and production deployment both describe the internal `/api` proxy model clearly.
**Where**: `packages/web-bruno/README.md`
**Depends on**: T2, T3, T4
**Reuses**: Existing Development and Production sections
**Requirement**: WBRUNOPROXY-04, WBRUNOPROXY-05, WBRUNOPROXY-06

**Tools**:

- MCP: `filesystem`
- Skill: `docs-writer`

**Done when**:

- [ ] Development docs explain how `/api` traffic is resolved locally via the Vite proxy
- [ ] Production docs no longer imply a build-time public API origin is required
- [ ] Production docs tell operators to configure `API_INTERNAL_URL` for the nginx proxy target
- [ ] Any references that imply the old `packages/web` production flow are corrected for `web-bruno`

**Commit**: `docs(web-bruno): document internal api proxy setup`

---

### T6: Verify same-origin psychology frontend behavior end to end

**What**: Run build-level checks and define the manual validation needed to prove the psychology frontend no longer depends on a public API hostname.
**Where**: Verification only
**Depends on**: T1, T2, T3, T4, T5
**Reuses**: Existing login, patient, session, and settings flows
**Requirement**: WBRUNOPROXY-01, WBRUNOPROXY-02, WBRUNOPROXY-03, WBRUNOPROXY-04, WBRUNOPROXY-05, WBRUNOPROXY-06

**Tools**:

- MCP: `filesystem`
- Skill: NONE

**Done when**:

- [ ] `npm -w psicologo run build`
- [ ] Built `web-bruno` assets do not contain the public API hostname string
- [ ] Manual check: login succeeds through the tenant domain
- [ ] Manual check: patient list or session list loads through `/api/...`
- [ ] Manual check: a representative authenticated write action succeeds through the same-origin proxy
- [ ] Manual check: refresh/logout flow still works with cookie-based auth
- [ ] Manual check: refreshing a client-side route still loads the SPA while `/api/*` stays proxied

**Commit**: `test(web-bruno): verify internal API proxy deployment behavior`

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
| T1: Update psychology HTTP client base resolution | 1 frontend client file | OK |
| T2: Add local Vite API proxy | 1 Vite config file | OK |
| T3: Add nginx API proxy | 1 nginx config file | OK |
| T4: Remove Docker build arg coupling | 1 Dockerfile | OK |
| T5: Update package README | 1 documentation file | OK |
| T6: Verification checklist | Verification only | OK |

---

## Recommended Tools For Execution

- Skills: `coding-guidelines`, `react-best-practices`, `docs-writer`
- Local commands: `npm -w psicologo run build`
- Manual validation target: login, patient/session read, authenticated write, and refresh/logout through same-origin `/api`
