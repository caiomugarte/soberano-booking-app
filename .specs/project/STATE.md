# Project State

> Product requirements and full feature inventory: [`/prd.md`](../../prd.md)

## Active Features

| Feature | Status | Spec |
|---|---|---|
| web-admin-internal-api-proxy | Tasks draft — awaiting approval | `.specs/features/web-admin-internal-api-proxy/tasks.md` |
| web-bruno-internal-api-proxy | Tasks draft — awaiting approval | `.specs/features/web-bruno-internal-api-proxy/tasks.md` |
| web-internal-api-proxy | Tasks draft — awaiting approval | `.specs/features/web-internal-api-proxy/tasks.md` |
| web-bruno-api-migration | Tasks ready — ready to execute | `.specs/features/web-bruno-api-migration/tasks.md` |
| psychology-api | Tasks draft — awaiting approval | `.specs/features/psychology-api/tasks.md` |
| frontend-unit-tests | Tasks ready — ready to execute | `.specs/features/frontend-unit-tests/spec.md` |
| whatsapp-human-jitter | Tasks ready — ready to execute | `.specs/features/whatsapp-human-jitter/spec.md` |
| multi-tenant-saas | Tasks approved — ready to execute | `.specs/features/multi-tenant-saas/tasks.md` |
| whatsapp-ai-booking | Tasks ready — ready to execute | `.specs/features/whatsapp-ai-booking/spec.md` |
| barber-admin-improvements | Tasks ready — ready to execute | `.specs/features/barber-admin-improvements/spec.md` |
| mcp-booking-management | Tasks ready — ready to execute | `.specs/features/mcp-booking-management/spec.md` |
| mcp-tenant-header | Tasks ready — ready to execute | `.specs/features/mcp-tenant-header/spec.md` |
| admin-manual-booking | Specify — awaiting gray area clarification | `.specs/features/admin-manual-booking/spec.md` |
| customer-packages | In progress — BT1-BT8 implemented; management section (BT9-BT10, MT1-MT3) tasks drafted, awaiting approval | `.specs/features/customer-packages/tasks.md` |
| admin-barber-identity | Unknown | `.specs/features/admin-barber-identity/spec.md` |
| barber-photos | Unknown | `.specs/features/barber-photos/spec.md` |

## Decisions

| Date | Decision | Reason |
|------|----------|--------|
| 2026-04-05 | Multi-tenancy via shared schema + `clientId` FK | Simplest to operate at current scale (<20 clients); single DB, single migration path |
| 2026-04-05 | Defer Kubernetes | Managed K8s costs $50–150/mo for control plane alone; VPS + Coolify sufficient until ≥50 clients |
| 2026-04-05 | Frontend: monorepo + shared design system (`packages/ui` + `apps/[slug]`) | Enables rapid rollout with themes; supports premium custom builds per client |
| 2026-04-05 | Tenant resolution: subdomain (`[slug].altion.com.br`) + custom domain via `Host` header | Matches existing `soberano.altion.com.br` pattern; custom domain supported via DB lookup |
| 2026-04-05 | Feature flags: explicit `enabledFeatures: string[]` per client + central registry in code | More granular than plan-only; supports custom add-on deals per client |
| 2026-05-02 | Package-linked admin bookings omit self-service cancel/change links in customer confirmations | Package bookings remain provider-managed even though they reuse the admin manual booking flow |

## Blockers

_None recorded yet._

## Lessons

_None recorded yet._

## Quick Tasks Completed

| # | Description | Date | Commit | Status |
|---|---|---|---|---|
| 001 | Hide past absences from the admin schedule page without deleting DB records | 2026-05-02 | not committed | ✅ Done |
| 002 | Make the admin absence date input use the Campo Grande business day instead of UTC | 2026-05-02 | not committed | ✅ Done |

## Deferred Ideas

- Monthly plan renewal / auto-recurrence (deferred from customer-packages scope)
- Multi-barber plan (deferred from customer-packages scope)
- Package expiry / time-based validity (deferred from customer-packages scope)
- Manual credit adjustment / package cancellation (deferred from customer-packages scope)
