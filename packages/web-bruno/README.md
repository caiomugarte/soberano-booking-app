# `packages/web-bruno`

Psychology frontend for Bruno Morghetti. This package is a Vite + React SPA that talks to the shared backend through `/api` routes.

## What lives here

- Authenticated dashboard, patients, appointments, reports, financial, and settings screens
- Shared HTTP client with in-memory access token handling and cookie-based refresh
- Production nginx config that serves the SPA and proxies `/api/*` to the internal API service

## Environment variables

### Frontend build

| Variable | Required | Purpose |
|---|---|---|
| `VITE_TENANT_SLUG` | Yes | Sends the tenant slug header expected by the API |

### Production runtime

| Variable | Required | Purpose |
|---|---|---|
| `API_INTERNAL_URL` | Yes | nginx upstream target for `/api/*` proxying inside the Docker network |
| `COOLIFY_SHARED_NETWORK` | Yes | Shared external Docker network that lets nginx resolve the `api` hostname |

## Development

Install dependencies from the repo root:

```bash
npm install
```

Run the psychology frontend:

```bash
npm -w psicologo run dev
```

By default, the Vite dev server proxies `/api/*` to `http://localhost:3000`, so browser requests still use relative `/api` paths during local development.

Build the package locally with:

```bash
npm -w psicologo run build
```

## Production

The production bundle does not require a public API hostname. Browser requests go to the same tenant domain at `/api/...`, and nginx forwards them to `API_INTERNAL_URL`.

Build the image with the tenant slug only:

```bash
docker build \
  --build-arg VITE_TENANT_SLUG=bruno \
  -f packages/web-bruno/Dockerfile .
```

At runtime, configure nginx with the internal API target and the shared
Coolify network:

```env
API_INTERNAL_URL=http://api:3000
COOLIFY_SHARED_NETWORK=coolify-prod
```

`API_INTERNAL_URL=http://api:3000` only works when the `web-bruno`
container and the shared API container both join the same external Docker
network. If Coolify does not attach this app to `COOLIFY_SHARED_NETWORK`,
nginx starts with `host not found in upstream "api"`.

Routing behavior in production:

- SPA routes and deep links fall back to `index.html`
- `/api/*` requests are proxied to `API_INTERNAL_URL`
- Cookies, `Authorization`, and `x-tenant-slug` headers continue to flow to the API
