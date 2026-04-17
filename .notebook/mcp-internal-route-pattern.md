# MCP Internal API Route Pattern

tags: mcp, internal-routes, api, pattern, auth

## File

`packages/api/src/http/routes/internal.routes.ts` — all internal routes live here, exported as `internalRoutes(app)`.

## Auth Pattern

Every internal route starts with this guard (no middleware — inline per route):

```
const secret = request.headers['x-internal-secret'];
if (!secret || secret !== env.INTERNAL_API_SECRET) {
  return reply.status(401).send({ error: 'UNAUTHORIZED', message: 'Não autorizado.' });
}
```

## Tenant Resolution Pattern

Internal routes receive `barberId` (UUID) from the query/body, NOT a tenant slug. Tenant is resolved by looking up the provider:

```
const provider = await prisma.provider.findUnique({ where: { id: barberId } });
// prisma here is the global non-tenant prisma (_prisma as any)
const tenantPrisma = createTenantPrisma(provider.tenantId);
const repo = new PrismaXxxRepository(tenantPrisma);
```

Key: the global `prisma` (imported as `_prisma as any`) is used only to resolve the provider's tenantId. All domain queries use `tenantPrisma`.

## Validation Pattern

- `barberId`: regex `/^[0-9a-f-]{36}$/i` (not `.uuid()` — raw regex inline)
- `date`: regex `/^\d{4}-\d{2}-\d{2}$/`
- `startTime`/`endTime`: regex `/^\d{2}:\d{2}$/`
- Date construction: `new Date(dateStr + 'T00:00:00')` (no timezone suffix — uses server local)
- "Today" in Campo Grande TZ: `new Intl.DateTimeFormat('sv-SE', { timeZone: 'America/Campo_Grande' }).format(new Date())`

## Error Response Shape

```json
{ "error": "ERROR_CODE", "message": "Portuguese message." }
```

Status codes: 400 VALIDATION_ERROR, 401 UNAUTHORIZED, 404 NOT_FOUND.

## Current Internal Routes

| Method | Path | Purpose |
|--------|------|---------|
| POST | `/internal/provider-absences` | Create absence |
| GET | `/internal/provider-absences?barberId=` | List upcoming absences |
| DELETE | `/internal/provider-absences/:id` | Cancel absence |
| PATCH | `/internal/provider-absences/:id` | Edit absence |
| GET | `/internal/provider-appointments?barberId=&date=` | Confirmed appointments on a date |
| GET | `/internal/provider-stats?barberId=&from=&to=` | Financial stats for date range |

## MCP Tool → Internal Route Mapping

MCP tools call `${apiBaseUrl}/api/internal/<path>` with headers:
- `X-Internal-Secret: internalApiSecret`
- `X-Tenant-Slug: tenantSlug`

Note: `X-Tenant-Slug` is sent by the tool but internal routes resolve tenant via barberId lookup — it's passed for consistency but not currently used by these routes.
