# Web Admin Internal API Proxy — Tasks

**Spec**: `.specs/features/web-admin-internal-api-proxy/spec.md`
**Status**: Draft

---

## Execution Plan

```text
Phase 1 — Frontend runtime behavior (sequential):
  T1

Phase 2 — Production runtime config (parallel after T1):
  T1 complete, then:
    ├── T2 [P]
    └── T3 [P]

Phase 3 — Docs + verification (sequential after T2, T3):
  T2 + T3 complete, then:
    T4 → T5
```

---

## Task Breakdown

### T1: Switch `platformRequest` to same-origin `/api/platform` by default

**What**: Update the web-admin API client so production requests use a relative `/api/platform` base, while still allowing a local `VITE_API_URL` override when explicitly provided.
**Where**: `packages/web-admin/src/api/platform.ts`
**Depends on**: None
**Reuses**: Existing `platformRequest()` fetch wrapper
**Requirement**: WADMINPROXY-01, WADMINPROXY-05

**Tools**:

- MCP: `filesystem`
- Skill: `coding-guidelines`

**Done when**:

- [ ] `platformRequest()` builds requests from `/api/platform` when `VITE_API_URL` is absent
- [ ] `VITE_API_URL` still works as an explicit local override
- [ ] Login and authenticated tenant-management calls still use the same fetch wrapper
- [ ] `npm -w @soberano/web-admin run build` passes

**Commit**: `refactor(web-admin): default platform API calls to same-origin proxy`

---

### T2: Remove build-time API origin from the web-admin Docker image [P]

**What**: Stop injecting `VITE_API_URL` at image build time so the browser bundle no longer depends on a public API hostname.
**Where**: `packages/web-admin/Dockerfile`
**Depends on**: T1
**Reuses**: Existing multi-stage Docker build
**Requirement**: WADMINPROXY-03

**Tools**:

- MCP: `filesystem`
- Skill: NONE

**Done when**:

- [ ] `ARG VITE_API_URL` and `ENV VITE_API_URL` are removed from the builder stage
- [ ] The image still builds `@soberano/shared` and `@soberano/web-admin` successfully
- [ ] `npm -w @soberano/shared run build`
- [ ] `npm -w @soberano/web-admin run build`

**Commit**: `build(web-admin): remove build-time API URL injection`

---

### T3: Switch the admin deploy stack to runtime `API_INTERNAL_URL` [P]

**What**: Update the admin deployment config so nginx receives `API_INTERNAL_URL` at container runtime instead of relying on a frontend build arg.
**Where**:
- `docker-compose.admin.yaml`
- `packages/web-admin/nginx.conf` only if a small adjustment is needed to make the runtime expectation explicit

**Depends on**: T1
**Reuses**: Existing nginx `/api` proxy block in `packages/web-admin/nginx.conf`
**Requirement**: WADMINPROXY-02, WADMINPROXY-04

**Tools**:

- MCP: `filesystem`
- Skill: NONE

**Done when**:

- [ ] `docker-compose.admin.yaml` no longer passes `VITE_API_URL` as a build arg
- [ ] `docker-compose.admin.yaml` provides runtime `API_INTERNAL_URL` to the `web-admin` container
- [ ] The nginx config clearly remains responsible for `/api/*` proxying to `API_INTERNAL_URL`
- [ ] The deployment shape is compatible with the Coolify shared-network approach

**Commit**: `chore(deploy): use runtime internal API URL for web-admin`

---

### T4: Update the admin deployment runbook

**What**: Rewrite the super-admin deployment instructions to use `API_INTERNAL_URL` instead of `VITE_API_URL`, and make the same-origin browser-to-API flow explicit.
**Where**: `DEPLOY.md`
**Depends on**: T2, T3
**Reuses**: Existing “Step 3 — Super-admin panel” section and related references to `VITE_API_URL`
**Requirement**: WADMINPROXY-04, WADMINPROXY-05

**Tools**:

- MCP: `filesystem`
- Skill: `docs-writer`

**Done when**:

- [ ] The super-admin deployment section no longer instructs operators to set `VITE_API_URL`
- [ ] The doc tells operators to configure `API_INTERNAL_URL` for the nginx proxy target
- [ ] Any later references to admin frontend build-time API origin are removed or corrected
- [ ] The validation steps reflect that browser API traffic now goes through `https://admin.altion.com.br/api/...`

**Commit**: `docs(deploy): document web-admin internal API proxy setup`

---

### T5: Verify same-origin admin behavior end to end

**What**: Run build-level checks and define the manual validation needed to prove the admin panel no longer depends on a public API hostname.
**Where**: Verification only
**Depends on**: T1, T2, T3, T4
**Reuses**: Existing admin login and tenant-management flows
**Requirement**: WADMINPROXY-01, WADMINPROXY-02, WADMINPROXY-03, WADMINPROXY-04, WADMINPROXY-05

**Tools**:

- MCP: `filesystem`
- Skill: NONE

**Done when**:

- [ ] `npm -w @soberano/shared run build`
- [ ] `npm -w @soberano/web-admin run build`
- [ ] Built admin assets do not contain the public API hostname string
- [ ] Manual check: super-admin login works through the admin domain
- [ ] Manual check: tenant list load works through `/api/platform/...`
- [ ] Manual check: saving a tenant update succeeds through the same-origin proxy

**Commit**: `test(web-admin): verify internal API proxy deployment behavior`

---

## Parallel Execution Map

```text
Phase 1:
  T1

Phase 2:
  T1 complete, then:
    ├── T2 [P]
    └── T3 [P]

Phase 3:
  T2 + T3 complete, then:
    T4 ──→ T5
```

---

## Task Granularity Check

| Task | Scope | Status |
|---|---|---|
| T1: Update platform API base resolution | 1 frontend client file | OK |
| T2: Remove Docker build arg coupling | 1 Dockerfile | OK |
| T3: Switch runtime deploy env to `API_INTERNAL_URL` | 1 compose file + optional nginx clarification | OK |
| T4: Update deployment guide | 1 documentation file | OK |
| T5: Verification checklist | Verification only | OK |

---

## Recommended Tools For Execution

- Skills: `coding-guidelines` for code changes, `docs-writer` for `DEPLOY.md`
- Local commands: `npm -w @soberano/shared run build`, `npm -w @soberano/web-admin run build`
- Manual validation target: `https://admin.altion.com.br` through same-origin `/api/platform`
