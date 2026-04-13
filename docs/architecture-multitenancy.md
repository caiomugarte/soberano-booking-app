# Multi-tenancy & Database Architecture

## Overview

This project uses a **shared database, shared schema** multi-tenancy model for the barbershop SaaS platform. All barbershop clients share a single PostgreSQL database (`soberano_prod`) with every table scoped by a `tenant_id` column.

Non-barbershop products (e.g. a psychologist booking app) are treated as **separate products** and get their own database and repository.

---

## Barbershop clients — shared database

Every barbershop client is a row in the `tenants` table. All other tables (`providers`, `services`, `customers`, `appointments`, etc.) carry a `tenant_id` foreign key that isolates each client's data.

```
soberano_prod (single database)
├── tenants
│   ├── { id, slug: "soberano",    type: "barbershop" }
│   ├── { id, slug: "web-marques", type: "barbershop" }
│   └── { id, slug: "...",         type: "barbershop" }
├── providers  (tenant_id → tenants.id)
├── services   (tenant_id → tenants.id)
├── customers  (tenant_id → tenants.id)
└── appointments (tenant_id → tenants.id)
```

### Onboarding a new barbershop client

No new database or migration is needed. The steps are:

1. Insert a row into `tenants` with the client's `slug`, `name`, and config.
2. Seed the client's providers and services.
3. Deploy their branded frontend (a new package under `packages/`).

### Why this approach

| Concern | Shared DB (current) | Separate DB per client |
|---|---|---|
| Add new client | Insert a row | Create DB + run migrations |
| Schema change | One migration, all clients | Run migration N times |
| Cross-client analytics | Trivial query | Requires federation |
| Operational overhead | Flat | Grows with client count |

Separate databases per barbershop would make sense only if clients required strict data residency guarantees or radically different schemas — neither applies here.

---

## Non-barbershop products — separate database

When a new product vertical has a fundamentally different domain (different entities, different feature set), it lives in its own repository with its own Prisma schema and its own database on the same PostgreSQL instance.

```
PostgreSQL instance (Coolify)
├── soberano_prod     ← all barbershop tenants (shared, tenant_id pattern)
└── psicologia_prod   ← psychologist product (separate repo + schema)
```

Each product points to its own `DATABASE_URL`:

```
# Barbershop API
DATABASE_URL=postgresql://user:pass@host:5432/soberano_prod

# Psychologist API (separate repo)
DATABASE_URL=postgresql://user:pass@host:5432/psicologia_prod
```

### Why a separate database (not a separate schema or shared tables)

- **Prisma** handles one database per project natively. Schema-level separation requires manual config workarounds.
- **Migrations are independent** — a breaking change in the psychologist schema never risks the barbershop data.
- **Backups and restores are isolated** — each product can be backed up, restored, or handed off independently.
- **The domains are genuinely different** — a psychologist app may require patient records, session notes, intake forms, and scheduling rules that have no equivalent in the barbershop model.

---

## Decision rule

> **Is this a new barbershop client?** → New `Tenant` row in `soberano_prod`. No new database.
>
> **Is this a new product with a different domain?** → New repository, new Prisma schema, new database on the same Postgres instance.
