# Best Practices Reference

Technology best practices for the Soberano stack. Complements `AGENTS.md` (architecture rules) with library-specific guidance.

---

## SOLID Principles

### S — Single Responsibility
A class or module should have one reason to change. If you find yourself writing "and" when describing what something does, split it.

```ts
// Bad — handles business logic AND persistence AND formatting
class AppointmentService {
  async create(data) {
    const appointment = new Appointment(data)  // domain
    await this.db.save(appointment)            // persistence
    return this.format(appointment)            // presentation
  }
}

// Good — each concern in its own layer
class CreateAppointmentUseCase {
  constructor(private repo: AppointmentRepository) {}
  async execute(input: CreateAppointmentInput): Promise<Appointment> { ... }
}
```

### O — Open/Closed
Open for extension, closed for modification. Add behavior by adding code, not changing existing code.

```ts
// Bad — adding a new notification channel requires editing this class
class NotificationService {
  send(type: 'email' | 'whatsapp', message: string) {
    if (type === 'email') { ... }
    if (type === 'whatsapp') { ... }
  }
}

// Good — new channels just implement the interface
interface NotificationChannel {
  send(message: string): Promise<void>
}
class WhatsAppChannel implements NotificationChannel { ... }
class EmailChannel implements NotificationChannel { ... }
```

### L — Liskov Substitution
Subtypes must be substitutable for their base type without breaking the program. If you override a method and the behavior changes enough to surprise callers, you've violated LSP.

```ts
// Bad — subclass throws where base class never does
class ReadOnlyRepository extends AppointmentRepository {
  save(): never { throw new Error('read-only') } // callers don't expect this
}

// Good — model the constraint in the type system, not by surprise
interface ReadableRepository { findById(id: string): Promise<Appointment> }
interface WritableRepository extends ReadableRepository { save(a: Appointment): Promise<void> }
```

### I — Interface Segregation
Clients should not depend on methods they don't use. Prefer narrow, focused interfaces over fat ones.

```ts
// Bad — use cases that only read are forced to depend on write methods
interface AppointmentRepository {
  findById(id: string): Promise<Appointment>
  findByBarber(barberId: string): Promise<Appointment[]>
  save(a: Appointment): Promise<void>
  delete(id: string): Promise<void>
}

// Good — split by use
interface AppointmentReader {
  findById(id: string): Promise<Appointment>
  findByBarber(barberId: string): Promise<Appointment[]>
}
interface AppointmentWriter {
  save(a: Appointment): Promise<void>
  delete(id: string): Promise<void>
}
```

### D — Dependency Inversion
High-level modules should not depend on low-level modules. Both should depend on abstractions. Concretely: use cases depend on repository *interfaces*, never on Prisma directly.

```ts
// Bad — use case knows about Prisma
class CreateAppointmentUseCase {
  constructor(private prisma: PrismaClient) {} // coupled to infrastructure
}

// Good — use case depends on an abstraction
class CreateAppointmentUseCase {
  constructor(private repo: AppointmentRepository) {} // interface, not Prisma
}
// Prisma implementation is injected at the composition root (server startup)
```

---

## Clean Architecture

**The dependency rule:** source code dependencies point inward only. Inner layers know nothing about outer layers.

```
┌─────────────────────────────────┐
│  HTTP / UI (Fastify routes,     │  ← knows about application layer
│            React components)    │
├─────────────────────────────────┤
│  Application (Use Cases)        │  ← knows about domain layer only
├─────────────────────────────────┤
│  Domain (Entities, Interfaces)  │  ← knows nothing outside itself
└─────────────────────────────────┘
  Infrastructure (Prisma, JWT…)     ← implements domain interfaces
```

**Key rules**
- **Domain entities** are plain TypeScript — no framework imports, no ORM decorators.
- **Use cases** receive repository interfaces via constructor injection — never `import { prisma }`.
- **Infrastructure** (Prisma repos, JWT, WhatsApp) implements domain interfaces. It is allowed to know about domain types.
- **Routes/controllers** are thin: parse input → call use case → map output to HTTP response. Zero business logic.
- **Composition root** (server startup) is the only place where concrete implementations are wired together.

**Boundaries between layers communicate via plain objects** (DTOs / value objects), not framework-specific types.

```ts
// Bad — HTTP concerns leaking into use case
class CreateAppointmentUseCase {
  async execute(req: FastifyRequest) { ... } // use case should never know FastifyRequest
}

// Good — plain input/output objects
class CreateAppointmentUseCase {
  async execute(input: CreateAppointmentInput): Promise<AppointmentDTO> { ... }
}
```

---

## Clean Code

### Naming
- Names should reveal intent. If you need a comment to explain a name, rename it.
- Functions: verb + noun (`createAppointment`, `findAvailableSlots`). Booleans: `is`/`has`/`can` prefix.
- Avoid abbreviations (`appt` → `appointment`, `usr` → `user`).
- Be consistent — pick one word per concept (`fetch` vs `get` vs `retrieve` — pick one and stick to it).

### Functions
- Do one thing. If you describe a function with "and", split it.
- Keep them short — if it doesn't fit on one screen, consider splitting.
- **Command-Query Separation:** a function either returns a value (query) or causes a side effect (command), not both.
- Prefer fewer parameters. More than 3 → consider an options object.

```ts
// Bad — does two things + returns a value
async function saveAndNotify(appointment: Appointment): Promise<boolean> {
  await repo.save(appointment)
  await notify(appointment)
  return true
}

// Good — separate concerns
await repo.save(appointment)
await notificationService.send(appointment)
```

### Comments
- **Don't comment what the code says — comment why it does something non-obvious.**
- If code needs a comment to be understood, first try to rename or restructure it.
- Delete commented-out code — git history exists for that.

```ts
// Bad — comment restates the code
// increment counter
count++

// Good — comment explains the non-obvious why
// Chatwoot searches by both 10 and 11-digit numbers because
// Brazilian numbers gained a 9th digit in 2012 but legacy entries still exist
const phones = [phone10, phone11]
```

### Error handling
- Use specific error classes, not generic `Error('something went wrong')`.
- Fail fast — validate inputs at boundaries, throw early.
- Never swallow errors silently (`catch (e) {}`).
- Error messages should help the caller fix the problem.

```ts
// Bad
throw new Error('invalid')

// Good
throw new AppError('SLOT_UNAVAILABLE', `Slot ${slotId} is no longer available`)
```

---

## Unit Testing

### What makes a good unit test
- **Fast** — no real database, no HTTP calls, no file system.
- **Isolated** — one unit at a time; mock external dependencies.
- **Deterministic** — same result every run; fake timers for date-sensitive logic.
- **Self-describing** — test name reads as a sentence: `"should reject booking for past date"`.

### Naming
Use the pattern: `[unit] should [expected behavior] when [condition]`

```ts
describe('CreateAppointmentUseCase', () => {
  it('should throw SLOT_UNAVAILABLE when slot is already booked', async () => { ... })
  it('should create appointment and return its id when input is valid', async () => { ... })
})
```

### AAA — Arrange / Act / Assert
```ts
it('should reject booking for past date', async () => {
  // Arrange
  vi.setSystemTime(new Date('2026-04-01'))
  const input = { ...validInput, datetime: '2026-03-01T10:00:00Z' }

  // Act
  const result = useCase.execute(input)

  // Assert
  await expect(result).rejects.toThrow('PAST_DATE')
})
```

### What to test
- **Use cases:** happy path + each business rule / edge case. Test through the public `execute()` method, not internals.
- **Domain entities:** validation logic, state transitions.
- **Pure utilities:** input/output — no mocking needed.
- **Don't test:** framework glue (routes, Prisma setup), trivial getters/setters.

### Test doubles
| Type | Use when |
|---|---|
| **Stub** | You need a controlled return value |
| **Mock** | You need to assert a method was called |
| **Fake** | You need a lightweight in-memory implementation (e.g. in-memory repo) |

Prefer **in-memory repository fakes** over mocking Prisma directly — they're more realistic and less brittle.

```ts
class InMemoryAppointmentRepository implements AppointmentRepository {
  private items: Appointment[] = []
  async save(a: Appointment) { this.items.push(a) }
  async findById(id: string) { return this.items.find(a => a.id === id) ?? null }
}
```

### One assertion focus per test
A test can have multiple `expect` calls, but they should all verify the **same outcome**. If you're checking two unrelated things, split into two tests — failures will be easier to diagnose.

### Anti-patterns
- Testing implementation details (private methods, internal state) instead of behavior
- Too many mocks — if everything is mocked, you're not testing anything real
- Shared mutable state between tests — always reset in `beforeEach`
- Asserting on too many things at once — hard to know what broke

---

## React 19

**Component design**
- One component = one responsibility. Map data shape to component tree.
- Build static (props-only) first, add state second.
- Only store what cannot be derived. If it's computable from props/state, don't store it.
- State lives at the closest common ancestor of all components that read it.
- Data flows down (props); events flow up (callbacks). Never reverse this.

**Rules**
- Components must be pure — same props/state always produces the same output.
- No side effects during render — use `useEffect`.
- Never mutate props or state in place — create new objects.
- Hooks at the top level only — no hooks inside loops, conditions, or nested functions.

**Anti-patterns**
- Storing derived state (e.g. `count` alongside `items`)
- Mutating state directly (`state.items.push(x)` instead of `set([...state.items, x])`)
- Controlled inputs without `onChange`

---

## TanStack Query v5

**Defaults to be aware of**

| Setting | Default | What it means |
|---|---|---|
| `staleTime` | `0` | Every cached result is immediately stale; always refetches in background |
| `gcTime` | 5 min | Unused cache is garbage-collected after 5 minutes |
| `retry` | `3` | Failed requests retry 3× with exponential backoff |
| `refetchOnWindowFocus` | `true` | Refetches when the tab regains focus |

**Key patterns**
- Set `staleTime` intentionally. Stable reference data (barbers, services) → `staleTime: Infinity` or `1000 * 60 * 5`.
- Define query key factories as constants to prevent typos and enable precise invalidation:
  ```ts
  export const barberKeys = {
    all: ['barbers'] as const,
    detail: (id: string) => ['barbers', id] as const,
  }
  ```
- Use `enabled` for dependent queries — never chain `useQuery` calls with conditional logic:
  ```ts
  const { data: slot } = useQuery({
    queryKey: ['slot', selectedSlotId],
    queryFn: () => fetchSlot(selectedSlotId!),
    enabled: !!selectedSlotId,
  })
  ```
- Prefer `queryClient.invalidateQueries` over manual `setQueryData` after mutations.
- TanStack Query = **server state** only. UI state (wizard step, selected tab) → Zustand.

**Anti-patterns**
- Using query data as form default values without copying first (mutates cache)
- Calling `useQuery` inside conditions
- Not providing array `queryKey` — breaks caching

---

## Zustand v5

**Store design — colocate actions (default)**
```ts
export const useBookingStore = create<BookingStore>((set) => ({
  selectedBarberId: null,
  setSelectedBarberId: (id) => set({ selectedBarberId: id }),
}))
```

**Module-level actions (alternative — better for testability)**
```ts
export const useBookingStore = create<BookingState>(() => ({
  selectedBarberId: null,
}))

// Callable without a hook — easier to test, tree-shakeable
export const setSelectedBarberId = (id: string) =>
  useBookingStore.setState({ selectedBarberId: id })
```

**Selectors — always use them**
```ts
// Good — only re-renders when selectedBarberId changes
const barberId = useBookingStore((s) => s.selectedBarberId)

// Bad — subscribes to the entire store, re-renders on any change
const store = useBookingStore()
```

**Slices pattern (for large stores)**
- Define each slice as a `StateCreator` factory, combine in one `create()` call.
- Cross-slice actions use `get()` to call sibling slice actions.
- Apply `persist`/`devtools` middleware only at the combined store level.

**Anti-patterns**
- Storing server/async data in Zustand (use TanStack Query instead)
- Subscribing to the whole store without a selector

---

## React Router v7

- Route config lives in `app/routes.ts` — explicit over convention.
- Use `<Outlet />` in parent routes for nested UI. Use layout routes for shared UI without URL segments.
- Use generated type imports for full type safety:
  ```ts
  import type { Route } from "./+types/booking"
  export async function loader({ params }: Route.LoaderArgs) { ... }
  ```
- Data fetching goes in `loader`, form mutations in `action` — not inside components.
- Add `ErrorBoundary` at critical nesting levels.

**Anti-patterns**
- Fetching data inside components instead of `loader`
- Missing `ErrorBoundary` at route level

---

## Fastify v5

**Handler style — always `return`, never mix with `reply.send()`**
```ts
// Good
fastify.get('/appointments', async (request, reply) => {
  return db.appointments.findMany()
})

// Bad — first one wins; mixing both causes silent bugs
fastify.get('/appointments', async (request, reply) => {
  const data = await db.appointments.findMany()
  reply.send(data)
  return data // silently discarded
})
```

**Always define JSON Schema for routes** — both for input validation and response serialization (2–3× speed gain, prevents data leakage):
```ts
fastify.post('/appointments', {
  schema: {
    body: appointmentBodySchema,
    response: { 201: appointmentResponseSchema },
  },
  handler: async (req) => createAppointment(req.body),
})
```

**Plugin load order matters:** ecosystem plugins → custom plugins → decorators → hooks → route handlers.

**Anti-patterns**
- Returning `undefined` from async handlers
- Skipping response schemas (security + performance risk)
- Business logic in route handlers — routes are thin controllers

---

## Prisma v6

**Singleton — mandatory**

One `PrismaClient` = one connection pool. Multiple instances = connection exhaustion. Already handled by `packages/api/src/config/database.ts` — never instantiate `PrismaClient` elsewhere.

**Query patterns**
- Avoid N+1 — use `include` or `relationLoadStrategy: 'join'`:
  ```ts
  prisma.appointment.findMany({
    relationLoadStrategy: 'join',
    include: { barber: true, service: true },
  })
  ```
- Use `$transaction` for multi-step atomic operations:
  ```ts
  await prisma.$transaction([
    prisma.appointment.create({ data: { ... } }),
    prisma.slot.update({ where: { id }, data: { available: false } }),
  ])
  ```
- Select only what you need — avoid over-fetching:
  ```ts
  prisma.user.findMany({ select: { id: true, name: true } })
  ```
- Catch errors with `PrismaClientKnownRequestError` for specific error codes (e.g. unique constraint `P2002`).

**Anti-patterns**
- Looping with individual queries instead of batch/include
- No indexes on frequently filtered/sorted columns
- Catching Prisma errors generically without checking error codes

---

## Zod

**Infer types from schemas — single source of truth**
```ts
const appointmentSchema = z.object({
  barberId: z.string().uuid(),
  serviceId: z.string().uuid(),
  datetime: z.string().datetime(),
})
type Appointment = z.infer<typeof appointmentSchema>
```

**Parse at boundaries, trust inside**
- Validate at API request entry points, env vars, external API responses.
- Internal functions receive already-validated types — no redundant parsing.

**Use `.safeParse()` to avoid throwing**
```ts
const result = appointmentSchema.safeParse(req.body)
if (!result.success) {
  return reply.status(400).send({ errors: result.error.flatten() })
}
// result.data is fully typed here
```

**Compose schemas instead of repeating**
```ts
const baseUser = z.object({ name: z.string(), email: z.string().email() })
const createUser = baseUser.extend({ password: z.string().min(8) })
const updateUser = baseUser.partial()
```

**Anti-patterns**
- Duplicating TypeScript types and Zod schemas separately
- Exposing raw `ZodError` objects to API consumers
- Validating internal function arguments with Zod (unnecessary overhead)

---

## Vitest

**Organization**
- Co-locate tests next to source files: `booking.service.test.ts` next to `booking.service.ts`.
- Group with `describe` blocks mirroring module structure.
- Follow AAA: Arrange → Act → Assert. One focus per test.

**Mocking**
- `vi.mock()` for module-level mocking.
- Mock time for date-sensitive tests:
  ```ts
  vi.useFakeTimers()
  vi.setSystemTime(new Date('2026-01-15'))
  // ...
  vi.useRealTimers()
  ```
- Do not mock Prisma — test use cases through repository interfaces (see `AGENTS.md`).

**Async**
```ts
await expect(asyncFn()).resolves.toEqual(expected)
await expect(asyncFn()).rejects.toThrow('message')
```

**Anti-patterns**
- Over-mocking (mock only what's external to the unit under test)
- Relying on real system time (flaky tests)
- Ignoring async errors — use proper matchers

---

## TypeScript (project-wide)

- `strict: true` in all `tsconfig.json` — required for Zod inference to work correctly.
- `unknown` at boundaries, narrowed with Zod. No `any`.
- `type` for data shapes; `interface` for repository/service contracts.
- Validate all env vars at startup (`config/env.ts`) — never access `process.env` directly elsewhere.
