# MCP Tenant Header — Specification

**Status:** Tasks ready — ready to execute
**Last updated:** 2026-04-13
**Parent feature:** multi-tenant-saas (TENANT-03)

---

## Context

The multi-tenant spec (TENANT-03) requires all API requests to include an `X-Tenant-Slug` header.
Without it, the API returns `404 TENANT_NOT_FOUND`. The `packages/mcp` server makes HTTP calls to
the API for every tool invocation and must identify the tenant on each call.

**Phase 1 (done):** All 9 MCP tools were updated to accept a `tenantSlug` parameter and forward
it as `X-Tenant-Slug` on every API call. The tools are fully implemented and correct.

**Phase 2 (this spec):** Change how the tenant slug is sourced — from a per-deployment env var
(`TENANT_SLUG`) to a per-request URL path segment (`/mcp/:tenantSlug`). This makes one MCP
instance capable of serving all tenants, consistent with how the API works.

---

## Goals

- [ ] One MCP deployment serves all tenants — no need to deploy per tenant
- [ ] Tenant is resolved per-request from the URL path (`/mcp/soberano`, `/mcp/marques`)
- [ ] `TENANT_SLUG` env var is removed — not needed anymore
- [ ] Requests to `/mcp` with no tenant slug return 400
- [ ] Requests to `/mcp/:unknownSlug` let the API return the TENANT_NOT_FOUND error (already handled by tools)
- [ ] No changes to tool files — their `tenantSlug` param is already correct

## Out of Scope

| Feature | Reason |
|---|---|
| Per-tenant auth tokens | Shared `MCP_SECRET` is sufficient — slug is data scoping, not auth |
| Validating the slug against a known list | The API already returns TENANT_NOT_FOUND; MCP doesn't need to duplicate that check |
| Changes to tool logic or API | All tool files already correct from Phase 1 |

---

## User Stories

### P1: Tenant resolved from URL path per request — MTH-02

**User Story:** As a platform engineer, I want the MCP server to resolve the tenant from the
request URL so that one MCP deployment can serve all tenants without per-tenant configuration.

**Acceptance Criteria:**

1. WHEN n8n calls `POST /mcp/soberano` THEN the MCP server SHALL resolve `soberano` as the tenant and pass it to all tool calls
2. WHEN n8n calls `POST /mcp/marques` THEN the MCP server SHALL resolve `marques` as the tenant independently of any other concurrent request
3. WHEN a request is made to `/mcp` (no slug) THEN the server SHALL return `400 { error: "TENANT_SLUG_REQUIRED" }`
4. WHEN `TENANT_SLUG` env var is removed from Coolify THEN the server SHALL still boot and serve requests normally
5. WHEN two tenants make concurrent requests THEN each SHALL receive data scoped to their own tenant (no cross-contamination — guaranteed by `createMcpServer()` being called per request)

**Independent Test:** Configure two n8n workflows pointing to `/mcp/soberano` and `/mcp/marques` → each returns its own tenant's services.

---

## What Changes Where

### `packages/mcp`

| What | File | Why |
|---|---|---|
| Remove `TENANT_SLUG` from Zod schema and `env` export | `src/config/env.ts` | No longer needed — tenant comes from URL |
| Extract tenant slug from URL path; pass to `createMcpServer(slug)` | `src/server.ts` | MTH-02 |

### No changes to

- Any of the 9 tool files (already accept `tenantSlug` param — Phase 1)
- Prisma schema, API, or frontend
- Auth mechanism (`MCP_SECRET` stays shared)

---

## Implementation Pattern

**`src/server.ts`** — replace env-var tenant with URL-path extraction:

```ts
// URL pattern: /mcp/:tenantSlug  or  /mcp/:tenantSlug?...
const MCP_PATH_RE = /^\/mcp\/([^/?]+)/;

const httpServer = createServer(async (req, res) => {
  if (!isAuthorized(req.headers['authorization'])) {
    unauthorized(res);
    return;
  }

  const match = req.url?.match(MCP_PATH_RE);
  if (!match) {
    res.writeHead(400, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'TENANT_SLUG_REQUIRED' }));
    return;
  }

  const tenantSlug = match[1];
  const body = req.method === 'POST' ? await readBody(req) : undefined;
  const server = createMcpServer(tenantSlug);
  const transport = new StreamableHTTPServerTransport({ sessionIdGenerator: undefined });
  res.on('close', () => { server.close(); });
  await server.connect(transport);
  await transport.handleRequest(req, res, body);
});
```

`createMcpServer` now takes `tenantSlug` as a parameter (replaces `env.tenantSlug`):

```ts
function createMcpServer(tenantSlug: string): McpServer {
  const server = new McpServer({ name: 'altion-mcp', version: '1.0.0' });
  registerListServices(server, env.apiBaseUrl, tenantSlug);
  // ... all 9 tools, same as today, env.tenantSlug → tenantSlug
  return server;
}
```

**`src/config/env.ts`** — remove `TENANT_SLUG`:

```ts
const schema = z.object({
  PORT: z.string().default('3002'),
  API_BASE_URL: z.string().url(),
  MCP_SECRET: z.string().min(1),
  INTERNAL_API_SECRET: z.string().min(16),
  // TENANT_SLUG removed
});
```

---

## n8n Configuration

Each tenant's n8n AI Agent workflow is configured with its own MCP endpoint URL:

| Tenant | MCP URL |
|---|---|
| Soberano | `https://mcp.altion.com.br/mcp/soberano` |
| Marques | `https://mcp.altion.com.br/mcp/marques` |

Auth token (`MCP_SECRET`) is shared — same value across all tenant workflows.

---

## Deployment

- Remove `TENANT_SLUG` from Coolify MCP service env vars
- Update n8n workflows to use the new URL pattern `/mcp/:tenantSlug`
- No restart of the API or any other service required

---

## Requirement Traceability

| Requirement ID | Story | Files Changed |
|---|---|---|
| MTH-02 | Tenant resolved from URL path | `env.ts`, `server.ts` |

---

## Success Criteria

- [ ] Server boots without `TENANT_SLUG` env var
- [ ] `POST /mcp/soberano` returns Soberano's services via `list_services`
- [ ] `POST /mcp` (no slug) returns `400 TENANT_SLUG_REQUIRED`
- [ ] No tool files were modified in Phase 2
