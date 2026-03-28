# Deploy Guide — Soberano Barbearia

## Infrastructure overview

| Component | Where |
|---|---|
| VPS | Hostinger — `31.97.91.218` |
| Platform | Coolify (self-hosted) |
| Database | PostgreSQL (Coolify service) |
| API | Coolify Application — `https://api.soberano.altion.com.br` |
| Web | Coolify Application — `https://soberano.altion.com.br` |

---

## Prerequisites

- VPS running with Coolify installed
- Ports **80** and **443** open on the VPS firewall:
  ```bash
  sudo ufw allow 80 && sudo ufw allow 443
  ```
- DNS A records pointing to the VPS:
  | Type | Name | Value |
  |---|---|---|
  | A | `soberano` | `31.97.91.218` |
  | A | `api.soberano` | `31.97.91.218` |

---

## Step 1 — PostgreSQL (Coolify Service)

1. Coolify → **New Resource** → **Database** → **PostgreSQL**
2. Set a database name, user, and password
3. Copy the **internal connection string** — you'll need it as `DATABASE_URL`
4. Start the service

> The database lives independently of the API container. Redeploying the API never drops data.

---

## Step 2 — API resource

**Coolify → New Resource → Application → From GitHub**

| Setting | Value |
|---|---|
| Repository | `caiomugarte/soberano-booking-app` |
| Branch | `master` |
| Build Pack | `Dockerfile` |
| Base Directory | `/` |
| Dockerfile Location | `/packages/api/Dockerfile` |
| Ports Exposes | `3000` |
| Domain | `https://api.soberano.altion.com.br` |

**Watch Paths** (avoids rebuilding when only web changes):
```
packages/api/**
packages/shared/**
package.json
package-lock.json
```

**Environment Variables** (all required):

```
NODE_ENV=production
PORT=3000
DATABASE_URL=postgresql://user:pass@host:5432/soberano
JWT_SECRET=<random 64-char string>
JWT_REFRESH_SECRET=<different random 64-char string>
BASE_URL=https://api.soberano.altion.com.br
```

**Optional (WhatsApp notifications via Chatwoot):**
```
CHATWOOT_BASE_URL=https://your-chatwoot-instance.com
CHATWOOT_API_TOKEN=your-token
CHATWOOT_ACCOUNT_ID=1
CHATWOOT_INBOX_ID=1
```

> To generate secrets: `node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"`

**Pre-deployment command:** leave empty (do not use `php artisan migrate`)

Deploy and verify the container is **Running** in the Coolify dashboard.

---

## Step 3 — Web resource

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

**Build Variables** (toggle to "Build Variable", not Runtime):

```
VITE_API_URL=https://api.soberano.altion.com.br
```

> `VITE_API_URL` is baked into the JS bundle at build time — changing it requires a redeploy.

Deploy and verify the container is **Running**.

---

## Step 4 — Seed the database (first deploy only)

After the first successful API deploy, run the seed script via the Coolify terminal:

**API resource → Terminal:**
```bash
node_modules/.bin/tsx packages/api/src/infrastructure/database/seed.ts
```

This will:
- Create the 3 barbers (Matheus, Adenilson, Vandson) with random passwords
- Create all 9 services with prices
- Print credentials to the console — **copy them immediately**, they won't be shown again

To change a barber's password later, run the seed again — existing barbers won't have their passwords changed (only new ones get a password on first creation).

---

## Step 5 — Verify

```bash
# API health check
curl https://api.soberano.altion.com.br/api/services

# Should return JSON array of services
```

Open `https://soberano.altion.com.br` in the browser — the booking flow should load.

---

## Ongoing deploys

Every `git push` to `master` triggers an automatic redeploy on both Coolify resources (based on Watch Paths). The process is:

1. Docker image is built
2. `prisma migrate deploy` runs — applies only pending migrations, never touches data
3. New container starts, old one stops

---

## Database backups

Coolify supports scheduled backups to S3-compatible storage.

**Setup:**
1. Coolify → **Settings** → **Backup Storage** → add S3 credentials
2. PostgreSQL service → **Backups** → enable scheduled backup (e.g. `0 2 * * *` for daily at 2am)

**Recommended free options:**
- **Cloudflare R2** — free up to 10GB, no egress fees
- **Backblaze B2** — free up to 10GB

**Manual backup (without S3):**
```bash
pg_dump $DATABASE_URL > backup_$(date +%Y%m%d).sql
```

---

## Secrets rotation

To rotate JWT secrets:
1. Update `JWT_SECRET` and `JWT_REFRESH_SECRET` in Coolify env vars
2. Redeploy API
3. All existing sessions will be invalidated — barbers will need to log in again
