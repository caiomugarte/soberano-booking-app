# Testing Infrastructure

## Test Frameworks

**Unit/Integration:** Vitest 3 (all packages)  
**E2E:** None  
**Coverage:** Not configured  

## Test Organization

**Location:** `__tests__/` subdirectory within the feature directory  
**Naming:** `*.test.ts` / `*.test.tsx`  
**Structure:** Vitest `describe` + `it` blocks

## Testing Patterns

### API Unit Tests

**Approach:** Constructor-injected repositories mocked via `vi.fn()`  
**Location:** `packages/api/src/application/use-cases/booking/__tests__/`, `packages/api/src/infrastructure/auth/__tests__/`

Pattern: use cases receive repository interfaces — tests create mock implementations inline:
```
makeUseCase(overrides?) → creates fake repo objects with vi.fn() returns
```

No real DB connection in tests. All repository calls are mocked.

**Key test files:**
- `create-appointment.test.ts` — tests all booking validation paths
- `cancel-appointment.test.ts`
- `get-available-slots.test.ts`
- `jwt.service.test.ts`, `password.service.test.ts`

### Web Unit Tests

**Approach:** @testing-library/react + jsdom, TanStack Query mocked  
**Location:** `packages/web/src/components/__tests__/`

**Key test files:**
- `BookingWizard.test.tsx`
- `ConfirmStep.test.tsx`
- `CustomerStep.test.tsx`
- `ProtectedRoute.test.tsx`
- `StepIndicator.test.tsx`
- `packages/web/src/stores/__tests__/booking.store.test.ts`
- `packages/web/src/stores/__tests__/auth.store.test.ts`

### Shared Tests

**Location:** `packages/shared/src/` (test files alongside source)

## Test Execution

**Commands:**
```bash
npm test                        # Run all packages
npm -w @soberano/api run test   # API only
npm -w @soberano/web run test   # Web only
npm -w @soberano/shared run test
```

**Configuration:** Each package has its own `vitest.config` implicit in `vite.config` or default Vitest detection

**CI enforcement:** Tests run inside Docker build — build fails if any test fails:
```dockerfile
RUN npm -w @soberano/api run test   # In api/Dockerfile
RUN npm -w @soberano/web run test   # In web/Dockerfile
```

## Coverage Targets

**Current:** Not measured  
**Goals:** Not documented  
**Enforcement:** None (only pass/fail)

## Multi-Tenancy Testing Consideration

Current tests have no concept of `tenantId`. When multi-tenancy is added, every test fixture will need a `tenantId` field and tests should verify that data from one tenant cannot be accessed by another.
