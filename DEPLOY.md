# Deploy Guide — Soberano Platform

## Infrastructure overview

| Component | Where |
|---|---|
| VPS | Hostinger — `31.97.91.218` |
| Platform | Coolify (self-hosted) |
| DNS / TLS | Cloudflare |
| Database | PostgreSQL (Coolify service — shared across all tenants) |
| API | Coolify Application — `https://api.altion.com.br` (shared) |
| Super-admin | Coolify Application — `https://admin.altion.com.br` |
| Soberano web | Coolify Application — `https://soberano.altion.com.br` (SPA + same-origin `/api` proxy) |
| _New client web_ | Coolify Application — `https://[slug].altion.com.br` or custom domain |

**Environment network rule:**

- Production stacks join `coolify-prod`
- Development stacks join `coolify-dev`
- Do not attach prod and dev application stacks to the same external Docker network, or shared aliases like `api` will collide

**Docker Compose files:**

| File | Purpose | Deployed |
|---|---|---|
| `docker-compose.infra.yaml` | API + MCP — shared platform | Once |
| `docker-compose.web.yaml` | Soberano frontend | Once |
| `docker-compose.web-bruno.yaml` | Bruno frontend | Once |
| `docker-compose.web-marques.yaml` | Marques frontend | Once |
| `docker-compose.admin.yaml` | Super-admin panel | Once |

---

## Initial setup (first time only)

### Step 0 — Create one shared Docker network per environment

On the VPS, create the external networks once:

```bash
docker network create coolify-prod
docker network create coolify-dev
```

Every Coolify application based on these compose files must set `COOLIFY_SHARED_NETWORK` to the correct environment network. Inside each environment network, `http://api:3000` remains safe because only that environment's API container is reachable via the `api` alias.

The API compose file also declares an explicit `api` alias on the shared
network so tenant frontends can proxy to `http://api:3000` without depending
on Coolify-generated container names.

### Step 1 — PostgreSQL (Coolify Service)

1. Coolify → **New Resource** → **Database** → **PostgreSQL**
2. Set a database name, user, and password
3. Copy the **internal connection string** — you'll need it as `DATABASE_URL`
4. Start the service

> The database lives independently of all application containers. Redeploying any service never drops data.

---

### Step 2 — API resource (`docker-compose.infra.yaml`)

**Coolify → New Resource → Application → From GitHub**

| Setting | Value |
|---|---|
| Repository | `caiomugarte/soberano-booking-app` |
| Branch | `master` |
| Build Pack | `Dockerfile` |
| Base Directory | `/` |
| Dockerfile Location | `/packages/api/Dockerfile` |
| Ports Exposes | `3000` |
| Domain | `https://api.altion.com.br` |

**Coolify stack setting:**

- Enable **Connect to Predefined Networks** so the `api` container can reach
  the PostgreSQL internal hostname on the selected destination network.

**Watch Paths** (avoids rebuilding when only frontend changes):
```
packages/api/**
packages/shared/**
package.json
package-lock.json
```

**Environment Variables:**

```
NODE_ENV=production
PORT=3000
DATABASE_URL=postgresql://user:pass@host:5432/soberano
JWT_SECRET=<random 64-char string>
JWT_REFRESH_SECRET=<different random 64-char string>
ALLOWED_ORIGINS=https://soberano.altion.com.br,https://admin.altion.com.br
SUPER_ADMIN_JWT_SECRET=<random 64-char string>
SUPER_ADMIN_EMAIL=your@email.com
SUPER_ADMIN_PASSWORD_HASH=<bcrypt hash>
```

> To generate secrets: `node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"`
>
> To generate the password hash: `node -e "const b=require('bcryptjs');b.hash('yourpassword',12).then(console.log)"`

> **Note:** Chatwoot credentials are **not** set here. They live in each tenant's config in the database, managed via the super-admin panel.

Do not define custom Docker networks for this stack inside
`docker-compose.infra.yaml`. Let Coolify attach the stack to the selected
destination network.

Deploy and verify the container is **Running**.

---

### Step 3 — Super-admin panel (`docker-compose.admin.yaml`)

**Coolify → New Resource → Application → From GitHub**

| Setting | Value |
|---|---|
| Repository | `caiomugarte/soberano-booking-app` |
| Branch | `master` |
| Build Pack | `Dockerfile` |
| Base Directory | `/` |
| Dockerfile Location | `/packages/web-admin/Dockerfile` |
| Ports Exposes | `80` |
| Domain | `https://admin.altion.com.br` |

**Watch Paths:**
```
packages/web-admin/**
packages/shared/**
```

**Compose / Environment Variables:**

```
API_INTERNAL_URL=http://api:3000
COOLIFY_SHARED_NETWORK=coolify-prod
```

Deploy and verify the container is **Running**.

---

### Step 4 — Soberano web (`docker-compose.web.yaml`)

**Coolify → New Resource → Application → From GitHub**

| Setting | Value |
|---|---|
| Repository | `caiomugarte/soberano-booking-app` |
| Branch | `master` |
| Build Pack | `Dockerfile` |
| Base Directory | `/` |
| Dockerfile Location | `/packages/web/Dockerfile` |
| Ports Exposes | `80` |
| Domain | `https://soberano.altion.com.br` |

**Watch Paths:**
```
packages/web/**
packages/shared/**
```

**Build Variables:**

```
VITE_TENANT_SLUG=soberano
```

**Runtime Variables:**

```
API_INTERNAL_URL=http://api:3000
COOLIFY_SHARED_NETWORK=coolify-prod
```

`API_INTERNAL_URL` is the nginx upstream target on the shared Coolify Docker network. Keep it as the internal API service URL, not a public hostname.

Deploy and verify the container is **Running**.

---

### Step 5 — Seed the database (first deploy only)

After the first successful API deploy, open the Coolify terminal on the API resource and run:

```bash
node_modules/.bin/tsx packages/api/src/infrastructure/database/seed.ts
```

This creates the Soberano tenant + 3 providers (Matheus, Adenilson, Vandson) + 9 services.
Credentials are printed to the console — **copy them immediately**.

---

### Step 6 — Verify

```bash
# Browser-to-API traffic now goes through the tenant domain
curl https://soberano.altion.com.br/api/health

# Soberano services (must include X-Tenant-Slug)
curl https://soberano.altion.com.br/api/services -H "X-Tenant-Slug: soberano"
```

Open `https://soberano.altion.com.br` — the booking flow should load normally.

### Step 4b — Additional tenant frontends

Deploy each tenant frontend as its own Coolify application using the matching
compose file:

| Tenant | Compose file | Dockerfile | Build variable |
|---|---|---|---|
| Bruno | `docker-compose.web-bruno.yaml` | `packages/web-bruno/Dockerfile` | `VITE_TENANT_SLUG=bruno` |
| Marques | `docker-compose.web-marques.yaml` | `packages/web-marques/Dockerfile` | `VITE_TENANT_SLUG=marques` |

Each tenant frontend also needs:

```env
API_INTERNAL_URL=http://api:3000
COOLIFY_SHARED_NETWORK=coolify-prod
```

If you deploy a tenant frontend to development, switch
`COOLIFY_SHARED_NETWORK` to `coolify-dev`.

---

## Multi-tenant migration

> **When to run this:** The first time you deploy multi-tenancy to production. Soberano is already live — this runbook migrates it without downtime.

### Pre-migration checklist

- [ ] Backup the database (see [Database backups](#database-backups))
- [ ] Notify barbers that they will need to log in again after the deploy (JWT payload changes — existing tokens are invalidated)
- [ ] Confirm `api.altion.com.br` DNS A record is pointing to `31.97.91.218`
- [ ] Confirm `admin.altion.com.br` DNS A record is pointing to `31.97.91.218`

### Migration steps

**1. Update API env vars in Coolify**

In the existing API Coolify resource, update environment variables:

Add:
```
ALLOWED_ORIGINS=https://soberano.altion.com.br,https://admin.altion.com.br
SUPER_ADMIN_JWT_SECRET=<new random 64-char string>
SUPER_ADMIN_EMAIL=your@email.com
SUPER_ADMIN_PASSWORD_HASH=<bcrypt hash>
```

Remove:
```
CHATWOOT_BASE_URL
CHATWOOT_API_TOKEN
CHATWOOT_ACCOUNT_ID
CHATWOOT_INBOX_ID
BASE_URL
```

> Chatwoot credentials are now stored per-tenant in the database. You will re-enter them via the super-admin panel after migration.

**2. Deploy the API**

Push to `master` or trigger a manual redeploy in Coolify.

The deploy runs three migrations automatically in sequence:
- **Migration 1:** Creates the `tenants` table, adds nullable `tenant_id` to all tables, seeds the Soberano tenant row, and assigns all existing rows to it
- **Migration 2:** Makes `tenant_id` NOT NULL and adds indexes
- **Migration 3:** Renames `barbers` → `providers` (internal only — API routes unchanged)

> If the deploy fails, check the Coolify deploy logs. Migrations are safe to re-run — `prisma migrate deploy` only applies pending migrations.

**3. Update Soberano web env vars in Coolify**

In the existing Soberano web Coolify resource:

Add:
```
VITE_TENANT_SLUG=soberano
API_INTERNAL_URL=http://api:3000
COOLIFY_SHARED_NETWORK=coolify-prod
```

Trigger a redeploy.

**4. Deploy the super-admin panel**

Follow [Step 3](#step-3--super-admin-panel-docker-composeadminyaml) above to create the `admin.altion.com.br` Coolify resource.

**5. Configure Soberano's Chatwoot credentials**

1. Open `https://admin.altion.com.br` and log in
2. Select the **Soberano** tenant
3. Under **Notifications**, enter the Chatwoot credentials that were previously in the API env vars
4. Save — notifications resume immediately (no redeploy needed)

**6. Verify**

```bash
# Existing booking flow still works
curl https://soberano.altion.com.br

# Same-origin API path works through the tenant domain
curl https://soberano.altion.com.br/api/services -H "X-Tenant-Slug: soberano"

# Without header → 404
curl https://soberano.altion.com.br/api/services  # → {"error":"TENANT_NOT_FOUND"}
```

Ask a barber to log in and confirm the admin dashboard works.

### Rollback

If anything breaks after the API deploy:

1. In Coolify, redeploy the **previous** API image (Deployments tab → previous deploy → Redeploy)
2. Migrations 1 and 2 (additive columns) do not need reverting — the old code ignores `tenant_id`
3. If Migration 3 (rename) ran, the old code will fail — contact Coolify support to restore from backup

> This is why a database backup before migration is mandatory.

---

## Adding a new client

### 1. DNS setup

**For a subdomain on `altion.com.br`** (e.g., `marques.altion.com.br`):

In Cloudflare, add:
| Type | Name | Value | Proxy |
|---|---|---|---|
| A | `marques` | `31.97.91.218` | Proxied |

**For a custom domain** (e.g., `barbeiramarques.com.br`):

The client adds a CNAME in their DNS registrar:
```
CNAME  @  soberano.altion.com.br
```
Then add `barbeiramarques.com.br` as an additional domain on the Coolify web resource. Coolify handles the TLS cert automatically.

### 2. Create the tenant

1. Open `https://admin.altion.com.br`
2. **New Tenant** → fill in:
   - **Slug:** `marques` (URL-safe, lowercase, unique)
   - **Name:** `Barbearia Marques`
   - **Type:** `barbershop`
   - **Business name:** `Barbearia Marques` (used in WhatsApp messages)
   - **Provider label:** `Barbeiro`
   - **Booking URL:** `https://marques.altion.com.br`
   - **Chatwoot credentials:** (the client's own Chatwoot account)
3. Save — the tenant is immediately live in the API

### 3. Seed the tenant's data

In the API Coolify terminal:

```bash
TENANT_SLUG=marques node_modules/.bin/tsx packages/api/src/infrastructure/database/seed.ts
```

This creates providers and services for the new tenant. Adjust the seed script or add data via the admin dashboard.

### 4. Deploy the web frontend

**Coolify → New Resource → Application → From GitHub**

| Setting | Value |
|---|---|
| Dockerfile Location | `/packages/web-marques/Dockerfile` |
| Ports Exposes | `80` |
| Domain | `https://marques.altion.com.br` |

**Build Variables:**

```
VITE_TENANT_SLUG=marques
```

**Runtime Variables:**

```
API_INTERNAL_URL=http://api:3000
COOLIFY_SHARED_NETWORK=coolify-prod
```

The customer-facing frontend should call `https://marques.altion.com.br/api/...`; nginx proxies those requests to `API_INTERNAL_URL` on the shared Coolify network.

**Watch Paths:**
```
packages/web-marques/**
packages/shared/**
```

Deploy. The new client is live.

### 5. Update `ALLOWED_ORIGINS`

Add the new frontend URL to the API's `ALLOWED_ORIGINS` env var in Coolify:

```
ALLOWED_ORIGINS=https://soberano.altion.com.br,https://marques.altion.com.br,https://admin.altion.com.br
```

Redeploy the API.

---

## Ongoing deploys

Each Coolify resource auto-deploys on `git push master` based on its Watch Paths.

| Resource | Triggers on changes to | What runs |
|---|---|---|
| API (`docker-compose.infra.yaml`) | `packages/api/**`, `packages/shared/**` | Docker build → `prisma migrate deploy` → new container |
| Soberano web | `packages/web/**`, `packages/shared/**` | Docker build (Vite) → nginx |
| Marques web | `packages/web-marques/**`, `packages/shared/**` | Docker build (Vite) → nginx |
| Super-admin | `packages/web-admin/**`, `packages/shared/**` | Docker build (Vite) → nginx |

> Frontend deploys never trigger an API redeploy. API deploys never trigger frontend rebuilds. Each resource is independent.

---

## Database backups

Coolify supports scheduled backups to S3-compatible storage.

**Setup:**
1. Coolify → **Settings** → **Backup Storage** → add S3 credentials
2. PostgreSQL service → **Backups** → enable scheduled backup (e.g. `0 2 * * *` for daily at 2am)

**Recommended free options:**
- **Cloudflare R2** — free up to 10GB, no egress fees
- **Backblaze B2** — free up to 10GB

**Manual backup:**
```bash
pg_dump $DATABASE_URL > backup_$(date +%Y%m%d).sql
```

---

## Secrets rotation

**JWT secrets** (invalidates all active sessions — barbers must re-login):
1. Update `JWT_SECRET` and `JWT_REFRESH_SECRET` in Coolify
2. Redeploy API

**Super-admin password:**
1. Generate new hash: `node -e "const b=require('bcryptjs');b.hash('newpassword',12).then(console.log)"`
2. Update `SUPER_ADMIN_PASSWORD_HASH` in Coolify
3. Redeploy API
