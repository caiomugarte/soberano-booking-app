# CodeNavi Notebook

## Entries

| File | Tags | Summary |
|------|------|---------|
| [architecture-overview.md](architecture-overview.md) | architecture, packages, overview | All 6 packages, API layer structure, key entry points, stack |
| [booking-flow.md](booking-flow.md) | booking, flow, use-case | Full customer booking request flow from HTTP to DB |
| [multi-tenancy-implementation.md](multi-tenancy-implementation.md) | multi-tenancy, architecture, prisma | How tenant isolation works: middleware, Prisma extension, TenantConfig |
| [multi-tenancy-blockers.md](multi-tenancy-blockers.md) | multi-tenancy, architecture | Original 4 blockers — all resolved, see multi-tenancy-implementation.md |
| [platform-layer.md](platform-layer.md) | platform, super-admin, tenant-management | Super-admin platform: `/api/platform/` routes + `web-admin` UI |
| [repository-singleton-pattern.md](repository-singleton-pattern.md) | repositories, architecture, pattern | Repos instantiated per-request with request.tenantPrisma |
| [notification-hardcoded-brand.md](notification-hardcoded-brand.md) | notifications, whatsapp, tenant-config | WhatsAppNotificationService takes TenantConfig — brand from Tenant.config JSON |
| [mcp-tool-registration-pattern.md](mcp-tool-registration-pattern.md) | mcp, tools, pattern, architecture | Tool file structure, public vs provider distinction, server.ts registration flow |
| [mcp-internal-route-pattern.md](mcp-internal-route-pattern.md) | mcp, internal-routes, api, pattern, auth | Internal route auth, tenant resolution via barberId, validation patterns, route inventory |
| [mcp-repository-methods.md](mcp-repository-methods.md) | mcp, repositories, appointment, provider-shift, reference | Appointment and shift repo methods available for provider MCP tools |
