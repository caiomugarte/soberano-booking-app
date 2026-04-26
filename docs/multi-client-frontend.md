# Multi-client Frontend Strategy

## Overview

Each client gets a dedicated frontend package inside `packages/`. All frontend packages point to the same API backend (`packages/api`) and are deployed as separate static builds on the same Coolify infrastructure.

```
packages/
├── api              ← shared backend (Fastify + Prisma + PostgreSQL)
├── shared           ← shared utilities and types
├── web              ← Soberano Barbearia (customer booking flow)
├── web-admin        ← Soberano admin dashboard
├── web-marques      ← Web Marques frontend
└── web-bruno        ← Bruno Psicólogo frontend
```

---

## Adding a new client frontend

### 1. Create the package

Copy an existing client package as a starting point:

```bash
cp -r packages/web-bruno packages/web-{clientname}
```

Update `packages/web-{clientname}/package.json`:
- Change the `name` field to `@soberano/web-{clientname}`
- Update the `VITE_API_URL` in `.env` to point to the shared API

### 2. Create a tenant row

```sql
INSERT INTO tenants (id, slug, name, type, config, is_active)
VALUES (gen_random_uuid(), '{clientname}', '{Client Display Name}', '{vertical}', '{}', true);
```

### 3. Seed providers and services

Each provider maps to one login account (psychologist, barber, etc.). Services define the bookable offerings with their prices and durations.

### 4. Configure auth calls

Every frontend must send `X-Tenant-Slug` on **all three** auth calls, not just regular API requests:

| Call | Why it matters |
|------|---------------|
| `POST /api/auth/login` | Covered automatically — tenant middleware runs for login and derives the cookie name from `request.tenant.slug`. |
| `POST /api/auth/refresh` | Excluded from tenant middleware. The handler reads `X-Tenant-Slug` directly to pick the correct `refreshToken_${slug}` cookie. Without the header it falls back to the generic `refreshToken` and finds nothing. |
| `POST /api/auth/logout` | Same — must send the header so the right cookie is cleared. |

Use `web-bruno`'s `http-client.ts` as a reference. The `doFetch` helper adds `X-Tenant-Slug` to every request automatically. If you write your own fetch wrapper, ensure the header is included in the refresh and logout calls as well.

### 5. Deploy on Coolify

Each frontend is deployed as a separate static service on Coolify pointing to its own domain. All services share the same internal API URL via the Docker network.

---

## How the shared API handles multiple frontends

The API resolves the tenant from the incoming `Host` header on every request. nginx forwards the original domain to the API container, so no explicit tenant ID is needed in the frontend — the domain is the tenant identifier.

```
bruno.example.com → nginx → API (Host: bruno.example.com → tenant: bruno)
soberano.example.com → nginx → API (Host: soberano.example.com → tenant: soberano)
```

---

## Psychology vertical — domain mapping

The `web-bruno` package serves a psychologist. The mapping between its domain model and the shared API is:

| web-bruno concept | API entity | Notes |
|-------------------|-----------|-------|
| Psychologist | `Provider` | One provider per psychology tenant |
| Patient | `Customer` | Extended with `cpf`, `email`, `notes` |
| Session type | `Service` | 3 services: individual, couple, family |
| Session | `Appointment` | Extended with `paymentStatus`, `paidAt`, `notes` |
| Working hours | `ProviderShift` | One row per working day |
| Absent days | `ProviderAbsence` | One row per absence |
| Session report | `SessionReport` | Psychology-only table |
| Patient document | `Document` | Psychology-only table |

### API extensions required for psychology

These additions to the shared API are needed before `web-bruno` can replace its local-storage layer with real API calls:

**Existing tables — new nullable columns:**

| Table | Column | Type | Purpose |
|-------|--------|------|---------|
| `customers` | `cpf` | `varchar(14)` nullable | Patient CPF |
| `customers` | `email` | `varchar(255)` nullable | Patient email |
| `customers` | `notes` | `text` nullable | Clinical notes |
| `appointments` | `payment_status` | `varchar(20)` default `'pending'` | `pending` or `paid` |
| `appointments` | `paid_at` | `timestamptz` nullable | When payment was received |
| `appointments` | `appointment_notes` | `text` nullable | Per-session notes |

**New tables:**

| Table | Purpose |
|-------|---------|
| `session_reports` | Clinical notes written after each session, optionally with a file attachment |
| `documents` | Patient administrative or medical documents (stored as base64 or S3 reference) |

Both new tables carry `tenant_id` and are invisible to barbershop tenants.

---

## Schema migration safety

All additions are backwards-compatible:
- New columns are nullable — existing barbershop rows are unaffected.
- New tables (`session_reports`, `documents`) are additive — no existing queries break.
- Migrations run once and apply to all tenants; barbershop tenants simply never write to the new columns or tables.

The rule: **never add a non-nullable column without a default**, and **never modify or remove columns used by existing verticals**.
