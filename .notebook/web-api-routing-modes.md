# Web API Routing Modes
> Frontend packages now standardize on same-origin `/api` browser requests with proxying handled by Vite in local dev and nginx in production

Entry: `packages/web/src/config/api.ts`, `packages/web/src/api/auth-request.ts`, `packages/web/vite.config.ts`, `packages/web/nginx.conf`, `packages/web/Dockerfile`, `docker-compose.web.yaml`, `packages/web-admin/src/api/platform.ts`, `packages/web-admin/nginx.conf`, `packages/web-admin/Dockerfile`, `docker-compose.admin.yaml`, `packages/web-bruno/src/api/http-client.ts`, `packages/web-bruno/nginx.conf`, `packages/web-bruno/Dockerfile`, `packages/web-bruno/README.md`, `packages/web-marques/src/config/api.js`, `packages/web-marques/nginx.conf`, `packages/web-marques/Dockerfile`, `docker-compose.yaml`, `AGENTS.md`, `DEPLOY.md`

Shared pattern:
- Browser code uses relative `/api/...` paths only; no frontend package relies on `VITE_API_URL`
- Local development keeps the Vite `/api` proxy to `http://localhost:3000`
- Production nginx config proxies `/api/*` to `${API_INTERNAL_URL}` before SPA fallback
- Dockerfiles only need `VITE_TENANT_SLUG` at build time; `API_INTERNAL_URL` is a runtime env for nginx templating

`packages/web`:
- `src/config/api.ts` hardcodes `API_BASE = '/api'`
- Auth refresh, logout, and admin login continue to use that shared base
- Tests cover the fixed `/api` base directly

`packages/web-admin`:
- `src/api/platform.ts` now calls `/api/platform/...` directly
- `Dockerfile`, `docker-compose.admin.yaml`, and root `docker-compose.yaml` no longer use a build-time API origin; they pass `API_INTERNAL_URL` at runtime instead

`packages/web-bruno`:
- `src/api/http-client.ts` now fetches the relative request path directly and still injects `x-tenant-slug`, cookies, and auth headers
- `README.md` and package AGENTS docs now describe the same-origin `/api` model only

`packages/web-marques`:
- `src/config/api.js` now uses `/api`
- `nginx.conf` was missing an API proxy; it now forwards `/api/*` to `${API_INTERNAL_URL}`, which is required after removing the browser-side override
- `Dockerfile` no longer bakes `VITE_API_URL` into the build

Gotcha:
- If a frontend package serves through nginx, `API_INTERNAL_URL` must be configured at runtime or nginx templating will produce a broken upstream even though the bundle itself is correct

Updated: 2026-04-30
