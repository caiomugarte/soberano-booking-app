# Code Conventions

## Naming Conventions

**Files:**
- kebab-case with type suffix: `create-appointment.ts`, `prisma-appointment.repository.ts`, `auth.middleware.ts`
- Test files: `*.test.ts` or `*.test.tsx`, co-located in `__tests__/` subdirectory
- React components: PascalCase filenames (`BookingWizard.tsx`, `BarberStep.tsx`)

**Classes/Interfaces:**
- PascalCase: `CreateAppointment`, `PrismaAppointmentRepository`, `AppError`
- Interface prefix for repositories: `AppointmentRepository` (interface) vs `PrismaAppointmentRepository` (implementation)

**Functions:**
- camelCase: `startReminderJob`, `authGuard`, `formatDate`
- React components: PascalCase exported functions (`export function BookingWizard()`)
- Route registrars: `xRoutes` pattern (`bookingRoutes`, `adminRoutes`)

**Variables/Constants:**
- camelCase for variables: `appointmentRepo`, `notificationService`
- UPPER_SNAKE_CASE for static maps: `WEEKDAYS_PT`
- Zod schemas: camelCase with `Schema` suffix: `bookingSchema`, `slotsQuerySchema`

**Database (Prisma):**
- Model names: PascalCase (`Barber`, `Appointment`)
- DB table names: snake_case via `@@map("barbers")`
- DB column names: snake_case via `@map("first_name")`
- TypeScript property names: camelCase (`firstName`, `createdAt`)

## Code Organization

**Import ordering (observed in route files):**
1. Node built-ins (`node:crypto`)
2. Framework imports (`fastify`)
3. External packages (`zod`)
4. Internal shared (`@soberano/shared`)
5. Internal relative (repositories, use-cases, services)

**File structure in route files:**
1. Imports
2. Repository/service singletons (module-level `const`)
3. Local Zod schemas
4. Exported route function

**Use case file structure:**
1. Imports
2. Input interface
3. Class with constructor-injected dependencies
4. Single `execute(input)` method

## Type Safety

**Approach:** TypeScript strict mode via `tsconfig.base.json`
- Repository interfaces use TypeScript interfaces, not classes
- `as unknown as T` cast pattern when Prisma return type doesn't match domain type (common workaround for Prisma include types)
- Zod for runtime validation at HTTP boundary; TypeScript types for internal use

**Example cast pattern** (from `prisma-appointment.repository.ts`):
```typescript
return prisma.appointment.findUnique({...}) as unknown as AppointmentWithDetails | null;
```

## Error Handling

**Pattern:** Custom `AppError` hierarchy thrown in use cases, caught by Fastify error handler in `server.ts`
- `AppError` → base class with `statusCode` + `code`
- `SlotTakenError`, `NotFoundError`, `UnauthorizedError`, `ValidationError` extend `AppError`
- Zod errors handled separately in global error handler (400 VALIDATION_ERROR)
- Route-level: some routes use `try/catch` for specific error types, others let errors propagate to global handler
- Notifications: always fire-and-forget (`.catch(err => console.error(...))` pattern)

## Comments/Documentation

**Style:** Minimal. Comments used only for:
- Section headers in long files (`// Error handler`, `// Health check`, `// Routes`)
- Non-obvious business logic (`// PG unique constraint prevents double-booking`)
- TODO/workaround notes

No JSDoc. No inline type comments (TypeScript handles this).

## Environment Variables

**Pattern:** Validated at startup via Zod schema in `packages/api/src/config/env.ts`
- Process exits with clear error message if validation fails
- All env access via `import { env } from '../../config/env.js'` — never `process.env` directly
- Optional services (Chatwoot) use `.optional()` in Zod schema

## ESM

All packages use `"type": "module"` — ES modules throughout. Imports use `.js` extension even for `.ts` source files (TypeScript ESM requirement).
