# Password Service Stale JS Gotcha
> Tests can load a committed CommonJS artifact instead of the TS source

Entry: `packages/api/src/infrastructure/auth/__tests__/password.service.test.ts`
Path: test imports `../password.service.js` under NodeNext ESM conventions

Gotcha:
- If `packages/api/src/infrastructure/auth/password.service.js` exists beside `password.service.ts`, Vitest resolves the real `.js` file first
- The committed artifact used CommonJS output with `bcryptjs_1.default.hash(...)`
- In the test runtime, that import shape left `default` undefined, so all password tests failed with `Cannot read properties of undefined (reading 'hash')`

Fix:
- Keep only `packages/api/src/infrastructure/auth/password.service.ts` in `src/`
- Delete stray build artifacts from source directories instead of patching test imports

Updated: 2026-05-05
