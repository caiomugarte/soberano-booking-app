# Project State

> Product requirements and full feature inventory: [`/prd.md`](../../prd.md)

## Active Features

| Feature | Status | Spec |
|---|---|---|
| swagger-docs | Implemented | `.specs/features/swagger-docs/spec.md` |
| whatsapp-human-jitter | Tasks ready — ready to execute | `.specs/features/whatsapp-human-jitter/spec.md` |
| multi-tenant-saas | Tasks ready — ready to execute | `.specs/features/multi-tenant-saas/spec.md` |
| whatsapp-ai-booking | Tasks ready — ready to execute | `.specs/features/whatsapp-ai-booking/spec.md` |
| barber-admin-improvements | Tasks ready — ready to execute | `.specs/features/barber-admin-improvements/spec.md` |
| admin-manual-booking | Specify — awaiting gray area clarification | `.specs/features/admin-manual-booking/spec.md` |
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

## Blockers

_None recorded yet._

## Lessons

_None recorded yet._

## Deferred Ideas

- Monthly plan renewal / auto-recurrence (deferred from admin-manual-booking scope)
- Multi-barber plan (deferred from admin-manual-booking scope)
