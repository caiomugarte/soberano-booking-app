# CodeNavi Notebook

## Entries

| File | Tags | Summary |
|---|---|---|
| [admin-appointment-query-invalidation-gotcha.md](admin-appointment-query-invalidation-gotcha.md) | web, admin, react-query, appointments, packages, gotcha | Day, week, and stats views use separate query keys, so package-linked mutations must invalidate all of them |
| [password-service-stale-js-gotcha.md](password-service-stale-js-gotcha.md) | api, auth, tests, vitest, gotcha | Stale JS artifact in `src/` can shadow the TS password service and break bcrypt imports |
| [api-runtime-deploy-gotchas.md](api-runtime-deploy-gotchas.md) | deploy, api, cron, coolify, traefik | Shared API deploy model; every API instance also starts reminder cron |
| [booking-time-step-week-navigation.md](booking-time-step-week-navigation.md) | booking, week-nav, gotcha | getWeekDates is today-anchored; weekOffset must use today as reference, not Monday |
| [architecture-overview.md](architecture-overview.md) | architecture, packages, overview | All 6 packages, API layer structure, key entry points, stack |
| [booking-flow.md](booking-flow.md) | booking, flow, use-case | Full customer booking request flow from HTTP to DB |
| [admin-package-booking-notifications.md](admin-package-booking-notifications.md) | notifications, admin-booking, packages, whatsapp, flow | Package-linked admin bookings share one API confirmation path and currently always include self-service links |
| [multi-tenancy-implementation.md](multi-tenancy-implementation.md) | multi-tenancy, architecture, prisma | How tenant isolation works: middleware, Prisma extension, TenantConfig |
| [multi-tenancy-blockers.md](multi-tenancy-blockers.md) | multi-tenancy, architecture | Original 4 blockers — all resolved, see multi-tenancy-implementation.md |
| [platform-layer.md](platform-layer.md) | platform, super-admin, tenant-management | Super-admin platform: `/api/platform/` routes + `web-admin` UI |
| [repository-singleton-pattern.md](repository-singleton-pattern.md) | repositories, architecture, pattern | Repos instantiated per-request with request.tenantPrisma |
| [notification-hardcoded-brand.md](notification-hardcoded-brand.md) | notifications, whatsapp, tenant-config | WhatsAppNotificationService takes TenantConfig — brand from Tenant.config JSON |
| [psychology-patient-crud-flow.md](psychology-patient-crud-flow.md) | psychology, patients, web-bruno, api, flow | Psychology patient modal submits through TanStack hooks into thin Fastify CRUD routes; duplicate messaging is driven by Prisma P2002 mapping and `null` clears on patch |
| [web-bruno-patient-care-model-hotspots.md](web-bruno-patient-care-model-hotspots.md) | psychology, web-bruno, api, patients, appointments, taxonomy, flow | Current Bruno care-model work must touch both patient entry points and replace the legacy `individual/couple/family` taxonomy across API, seed, and frontend surfaces |
| [web-bruno-neuromodulation-protocol-flow.md](web-bruno-neuromodulation-protocol-flow.md) | psychology, web-bruno, api, protocols, financial, agenda, flow | Neuromodulation protocols depend on patient `careMode`, project counters from appointment outcomes, and split protocol-sale revenue from operational session rows |
| [web-api-routing-modes.md](web-api-routing-modes.md) | web, deploy, nginx, proxy, coolify | packages/web uses dev proxy locally but still bakes a public API origin in production |
| [mcp-tool-registration-pattern.md](mcp-tool-registration-pattern.md) | mcp, tools, pattern, architecture | Tool file structure, public vs provider distinction, server.ts registration flow |
| [mcp-internal-route-pattern.md](mcp-internal-route-pattern.md) | mcp, internal-routes, api, pattern, auth | Internal route auth, tenant resolution via barberId, validation patterns, route inventory |
| [mcp-repository-methods.md](mcp-repository-methods.md) | mcp, repositories, appointment, provider-shift, reference | Appointment and shift repo methods available for provider MCP tools |
| [admin-schedule-absences-display.md](admin-schedule-absences-display.md) | admin, schedule, absences, web, api, flow | Admin schedule page hides past absences in the UI only; admin API still returns historical records while the internal API already filters upcoming only |
| [customer-packages-management-rescope.md](customer-packages-management-rescope.md) | web, api, packages, providers, lifecycle, flow | Customer package management now needs provider ownership, package-specific details, and lifecycle rules that the current API/schema do not expose |
| [web-bruno-agenda-session-flow.md](web-bruno-agenda-session-flow.md) | psychology, web-bruno, agenda, sessions, api, flow | Weekly agenda opens SlotDetail for existing sessions; current flow only supports one-way status/payment mutations and cannot edit or delete sessions |
| [web-bruno-recurring-session-gap.md](web-bruno-recurring-session-gap.md) | psychology, web-bruno, recurrence, ai-availability, api, flow | web-bruno recurrence is finite batch creation only; future agenda and AI availability depend on concrete appointments, so a persistent series model is needed |
| [portal-mobile-responsiveness-surface-map.md](portal-mobile-responsiveness-surface-map.md) | mobile, responsive, web-admin, web-bruno, layout | Internal portal mobile work spans shell/sidebar fixes plus dense-route audits in both web-admin and web-bruno |
| [prisma-package-index-rename-order-gotcha.md](prisma-package-index-rename-order-gotcha.md) | prisma, migrations, deploy, packages, gotcha | A rename-only migration was generated before the provider-owned package index existed; keep it no-op and create the final short name in the later migration |
| [web-format-date-tests-time-dependence.md](web-format-date-tests-time-dependence.md) | web, tests, vitest, date, gotcha | Calendar label tests must freeze the system date before asserting fixed month/year strings |
