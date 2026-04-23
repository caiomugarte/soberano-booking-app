# Multi-tenancy & Database Architecture

## Overview

This project uses a **shared database, shared schema** multi-tenancy model. All clients — barbershops and other service providers — share a single PostgreSQL database (`soberano_prod`) with every table scoped by a `tenant_id` column.

The `Tenant` model carries a `type` field (`"barbershop"`, `"psychology"`, etc.) that lets each frontend and the API behave differently per vertical while the underlying booking engine stays shared.

---

## All clients — shared database

Every client is a row in the `tenants` table. All other tables (`providers`, `services`, `customers`, `appointments`, etc.) carry a `tenant_id` foreign key that isolates each client's data.

```
soberano_prod (single database)
├── tenants
│   ├── { id, slug: "soberano",    type: "barbershop" }
│   ├── { id, slug: "web-marques", type: "barbershop" }
│   └── { id, slug: "bruno",       type: "psychology" }
├── providers      (tenant_id → tenants.id)
├── services       (tenant_id → tenants.id)
├── customers      (tenant_id → tenants.id)
├── appointments   (tenant_id → tenants.id)
├── session_reports (tenant_id → tenants.id)  ← psychology only
└── documents       (tenant_id → tenants.id)  ← psychology only
```

### Onboarding a new client

No new database or migration is needed. The steps are:

1. Insert a row into `tenants` with the client's `slug`, `name`, and `type`.
2. Seed the client's providers and services.
3. Deploy their branded frontend (a new package under `packages/`).

### Why this approach

| Concern | Shared DB (current) | Separate DB per client |
|---|---|---|
| Add new client | Insert a row | Create DB + run migrations |
| Schema change | One migration, all clients | Run migration N times |
| Cross-client analytics | Trivial query | Requires federation |
| Operational overhead | Flat | Grows with client count |

---

## Domain mapping across verticals

The core booking primitives are generic enough to serve multiple service verticals:

| Concept | Barbershop | Psychology |
|---------|------------|------------|
| `Tenant` | Barbershop business | Psychologist practice |
| `Provider` | Barber | Psychologist |
| `Service` | Haircut, shave, etc. | Individual, couple, family session |
| `Customer` | Client | Patient |
| `Appointment` | Booking | Session |
| `ProviderShift` | Working hours | Working hours |
| `ProviderAbsence` | Days off | Days off |

Psychology-specific features (`session_reports`, `documents`, payment tracking fields) are additive — they are nullable columns and new tables that barbershop tenants never touch.

---

## Decision rule

> **Is this a new client in an existing vertical?** → New `Tenant` row. No new database, no new API.
>
> **Is this a new vertical with incompatible domain logic?** → Evaluate whether the booking primitives still map. If they do, extend the shared schema additively. If they don't, consider a separate service.
