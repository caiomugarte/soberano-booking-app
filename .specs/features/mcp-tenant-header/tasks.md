# MCP Tenant Header — Tasks

**Spec**: `.specs/features/mcp-tenant-header/spec.md`
**Status**: Approved

## Context

Phase 1 (all 9 tool files) is already implemented. The tools already accept `tenantSlug` and
forward `X-Tenant-Slug` on every API call. Only 2 files remain.

---

## Execution Plan

```
T1 → T2  (sequential — T2 depends on T1 removing env.tenantSlug)
```

---

## Task Breakdown

### T1: Remove `TENANT_SLUG` from env config

**What**: Remove `TENANT_SLUG` from the Zod schema and the `env` export. The tenant slug will
come from the URL path at request time, not from an env var.
**Where**: `packages/mcp/src/config/env.ts`
**Depends on**: None
**Requirement**: MTH-02

**Change**:
```ts
const schema = z.object({
  PORT: z.string().default('3002'),
  API_BASE_URL: z.string().url(),
  MCP_SECRET: z.string().min(1),
  INTERNAL_API_SECRET: z.string().min(16),
  // remove: TENANT_SLUG: z.string().min(1),
});

export const env = {
  port: parseInt(parsed.PORT, 10),
  apiBaseUrl: parsed.API_BASE_URL,
  mcpSecret: parsed.MCP_SECRET,
  internalApiSecret: parsed.INTERNAL_API_SECRET,
  // remove: tenantSlug: parsed.TENANT_SLUG,
};
```

**Done when**:
- [ ] `TENANT_SLUG` removed from Zod schema
- [ ] `tenantSlug` removed from `env` export
- [ ] `pnpm tsc --noEmit` reports an error on `server.ts` (expected — `env.tenantSlug` is now invalid, T2 will fix it)

---

### T2: Extract tenant slug from URL path in `server.ts`

**What**: Change `createMcpServer()` to accept `tenantSlug` as a parameter. Replace the fixed
`/mcp` route with `/mcp/:tenantSlug` path matching. Extract the slug from the URL and pass it to
`createMcpServer`. Return `400 TENANT_SLUG_REQUIRED` when no slug is present.
**Where**: `packages/mcp/src/server.ts`
**Depends on**: T1
**Requirement**: MTH-02

**Change**:
```ts
const MCP_PATH_RE = /^\/mcp\/([^/?]+)/;

function createMcpServer(tenantSlug: string): McpServer {
  const server = new McpServer({ name: 'altion-mcp', version: '1.0.0' });
  registerListServices(server, env.apiBaseUrl, tenantSlug);
  registerListBarbers(server, env.apiBaseUrl, tenantSlug);
  registerGetAvailableSlots(server, env.apiBaseUrl, tenantSlug);
  registerCreateBooking(server, env.apiBaseUrl, tenantSlug);
  registerGetMyAppointments(server, env.apiBaseUrl, tenantSlug);
  registerCancelBooking(server, env.apiBaseUrl, tenantSlug);
  registerRescheduleBooking(server, env.apiBaseUrl, tenantSlug);
  registerGetNextAvailableDate(server, env.apiBaseUrl, tenantSlug);
  registerBookBarberAbsence(server, env.apiBaseUrl, env.internalApiSecret, tenantSlug);
  return server;
}

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

**Done when**:
- [ ] `createMcpServer` accepts `tenantSlug: string` parameter (no longer uses `env.tenantSlug`)
- [ ] URL is matched with `/^\/mcp\/([^/?]+)/` — extracts slug from path
- [ ] Missing slug returns `400 { error: 'TENANT_SLUG_REQUIRED' }`
- [ ] `pnpm tsc --noEmit` passes with zero errors
- [ ] Server boots without `TENANT_SLUG` set in env
- [ ] `POST /mcp/soberano` reaches the MCP handler (slug = `"soberano"`)
- [ ] `POST /mcp` returns 400

**Commit**: `feat(mcp): resolve tenant from URL path, remove TENANT_SLUG env var`

---

## Deployment Checklist

After merging:
- [ ] Remove `TENANT_SLUG` from Coolify MCP service env vars
- [ ] Update each n8n workflow's MCP endpoint URL from `/mcp` → `/mcp/:tenantSlug`
  - Soberano: `/mcp/soberano`
- [ ] Smoke test: call `list_services` via updated n8n workflow → returns Soberano's services
