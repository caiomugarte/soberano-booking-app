# Web Auth Refresh Race
> Same-origin auth in `packages/web` needs a shared refresh flow to avoid cookie-rotation races

Entry: `packages/web/src/api/auth-session.ts`, `packages/web/src/api/auth-request.ts`, `packages/web/src/stores/auth.store.ts`, `packages/web/src/main.tsx`

- `packages/web/src/main.tsx` runs under `React.StrictMode` in development, so `App` effects can be invoked twice during bootstrap
- both `initialize()` and protected API retries depend on `/api/auth/refresh`
- the API rotates the refresh cookie on every successful `/api/auth/refresh` response
- if multiple refresh requests run in parallel, one can succeed and rotate the cookie while another still carries the previous cookie and gets `401`
- before the fix, concurrent protected requests that all received `401` could each try to refresh and one failing refresh could force `logout()`
- the safe client pattern is a module-level in-flight refresh promise reused by both bootstrap and `401` retry paths

Implication:
- intermittent `401` on protected admin queries after an expired token is likely a client refresh race, not a route-level auth mismatch
- dev-only “refresh logs me out” can be amplified by Strict Mode if bootstrap refresh work is not deduplicated

Updated: 2026-04-30
