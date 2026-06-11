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
| web-bruno-agenda-event-management | Tasks draft — payment-date control plus `AppointmentForm`/`SlotDetail` polish added, awaiting approval | `.specs/features/web-bruno-agenda-event-management/tasks.md` |
| web-bruno-calendar-workspace | Implemented — workspace config, duration-aware scheduling, multi-view agenda, and inline blocking landed; automated verification passed, manual workspace verification pending | `.specs/features/web-bruno-calendar-workspace/tasks.md` |
| web-bruno-patient-care-model | Superseded by `web-bruno-patient-care-model-v2`; original tasks describe the exclusive-care-mode baseline | `.specs/features/web-bruno-patient-care-model/tasks.md` |
| web-bruno-patient-care-model-v2 | Tasks draft — dual-track patient profile, delete safety, history filters, and patient financial detail sequenced | `.specs/features/web-bruno-patient-care-model-v2/tasks.md` |
| web-bruno-neuromodulation-protocols | Tasks draft — rebased to the remaining lifecycle delta (auto-finish + finished-history cleanup), awaiting approval | `.specs/features/web-bruno-neuromodulation-protocols/tasks.md` |
| web-bruno-protocol-payment-ledger | Tasks draft — linked to `web-bruno-neuromodulation-protocols`, awaiting approval | `.specs/features/web-bruno-protocol-payment-ledger/tasks.md` |
| web-bruno-operations-hub | Tasks draft — partially implemented; receivables workbench scope was folded into this spec as a verification/hardening pass, awaiting approval | `.specs/features/web-bruno-operations-hub/tasks.md` |
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
| customer-packages | Tasks drafted — original MVP implemented; provider-owned management expansion now sequenced in T1-T13 | `.specs/features/customer-packages/tasks.md` |
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
| 2026-06-02 | `web-bruno-patient-care-model-v2` replaces the original patient-care-model execution track | The codebase already implements the exclusive `careMode` assumption, but Bruno now needs dual-track patients plus patient-detail operational improvements before further execution |
| 2026-06-08 | Protocol payment ledger was split into its own linked spec | Multiple payment dates and amounts cannot fit the current scalar protocol payment fields, so the change must be specified as a separate data-model and financial feature instead of being buried in neuromodulation UI work |
| 2026-06-08 | `web-bruno-receivables-workbench` stays inside `web-bruno-operations-hub` instead of becoming a separate feature | The overdue-only session rule already exists in the API/hook path, so the remaining work is primarily Bruno-specific receivables UI hardening and verification |
| 2026-06-08 | `web-bruno-agenda-event-management` absorbed the zero-cost/session-form/detail-button polish follow-up | The scope stays local to `AppointmentForm` and `SlotDetail`, and the psychology session API already accepts `value >= 0`, so a separate feature track would only fragment the same agenda workflow |
| 2026-06-10 | `web-bruno-calendar-workspace` was split into its own spec | The remaining Bruno agenda gap is no longer "Saturday visibility"; the frontend still hardcodes visible days, hours, and slot math across multiple surfaces, so Sunday support, multi-view calendar behavior, 1-hour blocks, and inline blocking need a dedicated workspace spec |

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
| 006 | Add a mobile-friendly package creation entry point to `PackagesPage` using the dashboard-style floating action pattern and the existing package workspace handoff | 2026-05-28 | not committed | ✅ Done |
| 007 | Run the existing CI workflow for pull requests targeting `develop` as well as `master` so test checks can gate merges on both branches | 2026-06-08 | not committed | ✅ Done |

## Deferred Ideas

- Monthly plan renewal / auto-recurrence (deferred from customer-packages scope)
- Multi-barber plan (deferred from customer-packages scope)
- Package expiry / time-based validity (deferred from customer-packages scope)
- Manual credit adjustment / package cancellation (deferred from customer-packages scope)
