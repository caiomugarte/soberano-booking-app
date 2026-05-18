# Project State

> Product requirements and full feature inventory: [`/prd.md`](../../prd.md)

## Active Features

| Feature | Status | Spec |
|---|---|---|
| web-admin-internal-api-proxy | Tasks draft — awaiting approval | `.specs/features/web-admin-internal-api-proxy/tasks.md` |
| web-bruno-internal-api-proxy | Tasks draft — awaiting approval | `.specs/features/web-bruno-internal-api-proxy/tasks.md` |
| web-internal-api-proxy | Tasks draft — awaiting approval | `.specs/features/web-internal-api-proxy/tasks.md` |
| portal-mobile-responsiveness | Tasks draft — awaiting approval | `.specs/features/portal-mobile-responsiveness/tasks.md` |
| web-bruno-api-migration | Tasks ready — ready to execute | `.specs/features/web-bruno-api-migration/tasks.md` |
| web-bruno-recurring-session-series | Tasks draft — awaiting approval | `.specs/features/web-bruno-recurring-session-series/tasks.md` |
| web-bruno-agenda-event-management | Tasks draft — payment-date control added, awaiting approval | `.specs/features/web-bruno-agenda-event-management/tasks.md` |
| web-bruno-patient-care-model | Tasks draft — patient profile, defaulting, and birthday reminder sequenced | `.specs/features/web-bruno-patient-care-model/tasks.md` |
| web-bruno-neuromodulation-protocols | Tasks draft — blocked by patient care model foundation, awaiting approval | `.specs/features/web-bruno-neuromodulation-protocols/tasks.md` |
| web-bruno-operations-hub | Tasks draft — depends on patient care model and protocol receivable rules, awaiting approval | `.specs/features/web-bruno-operations-hub/tasks.md` |
| psychology-patient-dedup | Tasks draft — awaiting approval | `.specs/features/psychology-patient-dedup/tasks.md` |
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
| 2026-05-04 | Psychology session payment-method capture stays inside `web-bruno-agenda-event-management` | It extends the same paid-state workflow across agenda, financial, and patient-history surfaces instead of introducing a separate feature track |
| 2026-05-05 | Psychology payment-date control stays inside `web-bruno-agenda-event-management` | It extends the same paid-state workflow and requires financial attribution by `paidAt`, not only by the session date |
| 2026-05-18 | Bruno psychology changes split into three linked specs | Separating patient/domain foundation, neuromodulation protocols, and operations keeps later execution atomic and reduces cross-package ambiguity |
| 2026-05-18 | Neuromodulation revenue belongs to the protocol sale, not to later operational session rows | Bruno sells long protocols first and books dates over time, so financial attribution must follow the protocol agreement |

## Blockers

_None recorded yet._

## Lessons

_None recorded yet._

## Quick Tasks Completed

| # | Description | Date | Commit | Status |
|---|---|---|---|---|
| 001 | Hide past absences from the admin schedule page without deleting DB records | 2026-05-02 | not committed | ✅ Done |
| 002 | Make the admin absence date input use the Campo Grande business day instead of UTC | 2026-05-02 | not committed | ✅ Done |
| 003 | Reset the web-bruno patient modal fields on open so new patient creation does not reuse the previous values | 2026-05-04 | not committed | ✅ Done |
| 004 | Make the web-bruno patient form treat blank email as optional on create and clearable on edit | 2026-05-04 | not committed | ✅ Done |
| 005 | Highlight `Psicoterapia` and `Neuromodulação` with distinct colors in the `web-bruno` weekly agenda | 2026-05-18 | not committed | ✅ Done |

## Deferred Ideas

- Monthly plan renewal / auto-recurrence (deferred from customer-packages scope)
- Multi-barber plan (deferred from customer-packages scope)
- Package expiry / time-based validity (deferred from customer-packages scope)
- Manual credit adjustment / package cancellation (deferred from customer-packages scope)
