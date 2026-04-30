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
| `VITE_API_URL` | No | Optional local override for calling an API origin directly |

`VITE_API_URL` is meant for explicit local development overrides only. When it is not set, the app uses same-origin `/api/...` requests by default.

### Production runtime

| Variable | Required | Purpose |
|---|---|---|
| `API_INTERNAL_URL` | Yes | nginx upstream target for `/api/*` proxying inside the Docker network |

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

If you need to bypass the Vite proxy and hit an API origin directly, set `VITE_API_URL` explicitly in the package env file before starting the dev server:

```env
VITE_API_URL=http://localhost:3000
VITE_TENANT_SLUG=bruno
```

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

At runtime, configure nginx with the internal API target:

```env
API_INTERNAL_URL=http://api:3000
```

Routing behavior in production:

- SPA routes and deep links fall back to `index.html`
- `/api/*` requests are proxied to `API_INTERNAL_URL`
- Cookies, `Authorization`, and `x-tenant-slug` headers continue to flow to the API
