# Web API Routing Modes
> Frontend packages are inconsistent about same-origin API proxying vs build-time API origins

Entry: `packages/web/src/config/api.ts`, `packages/web/src/api/auth-request.ts`, `packages/web/vite.config.ts`, `packages/web/nginx.conf`, `packages/web/Dockerfile`, `docker-compose.web.yaml`, `packages/web-admin/src/api/platform.ts`, `packages/web-admin/nginx.conf`, `packages/web-admin/Dockerfile`, `docker-compose.admin.yaml`, `packages/web-bruno/src/api/http-client.ts`, `packages/web-bruno/nginx.conf`, `packages/web-bruno/Dockerfile`, `packages/web-bruno/README.md`, `AGENTS.md`, `prd.md`, `DEPLOY.md`

`packages/web`:
- `src/config/api.ts` resolves browser requests to same-origin `/api` by default and still supports an explicit `VITE_API_URL` override when provided
- `src/api/auth-request.ts`, `src/stores/auth.store.ts`, and admin login reuse that shared `/api` base for auth, refresh, and logout flows
- `vite.config.ts` still proxies `/api` to `http://localhost:3000` in local dev
- `nginx.conf` now proxies `/api/*` to `${API_INTERNAL_URL}` before the SPA fallback
- `Dockerfile` and `docker-compose.web.yaml` no longer require build-time `VITE_API_URL`; runtime proxying uses `API_INTERNAL_URL`
- `packages/web/.env` should not define `VITE_API_URL`, otherwise production builds will bake the local override into the bundle

`packages/web-admin`:
- `src/api/platform.ts` still builds requests from `import.meta.env.VITE_API_URL`
- `nginx.conf` already proxies `/api` to `${API_INTERNAL_URL}` and forwards headers
- `Dockerfile` and `docker-compose.admin.yaml` still expect build-time `VITE_API_URL`
- This means the runtime proxy exists, but the browser bundle is still coupled to a public API origin

`packages/web-bruno`:
- `src/api/http-client.ts` prepends `import.meta.env.VITE_API_URL` to all requests
- `nginx.conf` only serves the SPA; it does not proxy `/api`
- `Dockerfile` still bakes `VITE_API_URL` into the build
- `README.md` already says the API should be proxied at `/api`, so docs and runtime behavior are out of sync

Shared mismatch:
- `AGENTS.md` and root `prd.md` describe the target production model: tenant traffic hits the frontend domain, and nginx proxies `/api` internally via `API_INTERNAL_URL`
- `DEPLOY.md` still documents the older public-API-domain model (`https://api.altion.com.br`)

Implication:
- `packages/web` is now aligned with the same-origin proxy model described in the deploy docs
- `web-admin` and `web-bruno` are still partway through the broader migration, so frontend packages remain inconsistent until their own proxy tasks land

Updated: 2026-04-30
