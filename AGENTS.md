# AGENTS.md — Soberano Barbearia

Guidance for AI agents working on this codebase. Read this before making any changes.

> Product requirements, feature status, and business rules: [`prd.md`](./prd.md)  
> Active feature work, decisions, and blockers: [`.specs/project/STATE.md`](./.specs/project/STATE.md)  
> For library-specific best practices and general engineering guidelines (SOLID, Clean Architecture, Clean Code, unit testing) see [`docs/best-practices.md`](./docs/best-practices.md).

## Project

Barbershop appointment booking app. Replaces a WhatsApp AI chatbot. Monorepo with three packages:

| Package | Path | Role |
|---|---|---|
| `@soberano/api` | `packages/api` | Fastify backend — clean architecture |
| `@soberano/web` | `packages/web` | React 19 frontend |
| `@soberano/shared` | `packages/shared` | Zod schemas + shared TypeScript types |

---

## Architecture — API (`packages/api`)

Strict clean architecture. Dependencies flow inward only: `http` → `application` → `domain`. Infrastructure implements domain ports.

```
src/
├── domain/           # Entities + repository interfaces (zero framework deps)
├── application/      # Use cases (business logic — no Prisma, no Fastify)
│   └── use-cases/
│       ├── booking/  # create-appointment, get-available-slots, cancel, change
│       └── barber/   # authenticate-barber
├── infrastructure/   # Prisma repos, JWT, Chatwoot notifications, cron job
├── http/             # Fastify routes + auth middleware (thin controllers only)
├── config/           # env.ts (typed env), database.ts (Prisma singleton)
└── shared/           # AppError and domain error classes
```

**Rules:**
- Use cases receive repository interfaces (ports), never Prisma directly.
- Routes parse/validate with Zod, call a use case, return HTTP responses. No business logic in routes.
- Domain entities are plain TypeScript — no decorators, no ORM annotations.
- New use cases go in `application/use-cases/<domain>/`. New Prisma repos go in `infrastructure/database/repositories/`.

---

## Architecture — Web (`packages/web`)

```
src/
├── api/          # TanStack Query hooks (one file per resource)
├── components/
│   ├── ui/       # Reusable primitives (Button, Input, Panel, Spinner…)
│   ├── booking/  # Booking wizard steps
│   ├── admin/    # Admin-only components
│   └── appointment/
├── pages/        # Route-level components (thin — delegate to components)
├── stores/       # Zustand stores (auth, booking wizard state)
├── lib/          # Pure utilities (format.ts, etc.)
└── config/       # api.ts (base URL), query-client.ts
```

**Rules:**
- Use **Compound Components** whenever a UI concept has multiple related sub-parts (e.g. a card with header/body/footer, a step with title/content/actions). Export the root + sub-components as named exports; co-locate in the same file unless they grow large.
- Data fetching lives in `api/` hooks (TanStack Query). Components never call `fetch` directly.
- Global UI state → Zustand. Server state → TanStack Query. Local ephemeral state → `useState`.
- Pages are thin: they compose components and pass props. Logic belongs in hooks or stores.
- Auth token lives **in memory only** (Zustand `auth.store.ts`). Never put it in `localStorage`.

---

## Shared package (`packages/shared`)

- Contains Zod schemas used by both API (validation) and web (form validation, types).
- Export TypeScript types inferred from schemas via `z.infer<typeof Schema>`.
- Do not add framework-specific code here.

---

## Key patterns to follow

### Adding a new feature end-to-end

1. **Shared**: add/update Zod schema if new data shape is needed.
2. **API domain**: add/extend entity or repository interface if needed.
3. **API application**: write a new use case. Unit-test it with mocked repos.
4. **API infrastructure**: implement new repo methods if the interface changed.
5. **API http**: add a route that calls the use case. Validate input with Zod.
6. **Web api/**: add a TanStack Query hook for the new endpoint.
7. **Web components/pages**: build UI using Compound Components where appropriate.

### Use case structure

```ts
// application/use-cases/booking/example.ts
export class ExampleUseCase {
  constructor(
    private readonly appointmentRepo: AppointmentRepository,
    private readonly barberRepo: BarberRepository,
  ) {}

  async execute(input: ExampleInput): Promise<ExampleOutput> {
    // pure business logic — no Prisma, no HTTP, no side effects beyond repos
  }
}
```

### Compound Component structure

```tsx
// components/ui/Card.tsx
function Card({ children }: { children: React.ReactNode }) { ... }
Card.Header = function CardHeader({ children }: { children: React.ReactNode }) { ... }
Card.Body   = function CardBody({ children }: { children: React.ReactNode }) { ... }

export { Card }

// Usage:
<Card>
  <Card.Header>Title</Card.Header>
  <Card.Body>Content</Card.Body>
</Card>
```

---

## Testing

- Use cases: unit tests with vitest + mocked repository implementations. Tests live in `__tests__/` next to the file under test.
- Stores: unit tests with vitest. Same `__tests__/` convention.
- Run all tests: `npm test` from the root.
- Do not mock Prisma in tests — test use cases through their repository interfaces.

---

## Code style

- TypeScript strict mode everywhere.
- No `any`. Use `unknown` at boundaries and narrow with Zod.
- Prefer `type` over `interface` for data shapes; use `interface` for repository/service contracts.
- No default exports except for React page components (to match React Router conventions).
- Validate all environment variables at startup via `config/env.ts` — never access `process.env` directly elsewhere.

---

## Notifications

WhatsApp messages go through Chatwoot + Baileys. The `WhatsAppNotificationService` in `infrastructure/notifications/` is the only place that sends messages. Use cases call it through an interface — they do not import it directly.

Brazilian phone numbers are stored without `+55`. Chatwoot contacts are searched by both 10-digit and 11-digit forms before creating a new contact.

---

## Deployment

- **VPS**: Hostinger, managed by Coolify. DNS/TLS via Cloudflare.
- **App**: deployed as a single `docker-compose.yaml` resource in Coolify — `api` and `web` services in the same stack.
- **Database**: PostgreSQL runs as a separate Coolify service (not inside the compose stack). Connected via `DATABASE_URL`.
- **Routing**: the `web` container runs nginx (`packages/web/nginx.conf`). All `/api` requests are proxied internally to the `api` service via `API_INTERNAL_URL`. There is **no separate public domain for the API** — the single public domain (`soberano.altion.com.br`) serves both the SPA and API through this nginx proxy.
- Both services share the `coolify` external Docker network so nginx can reach the `api` container by service name.
- `git push master` triggers auto-redeploy of the compose stack.
- Migrations run automatically on deploy via `prisma migrate deploy` (no prompts, no data loss).
- `VITE_API_URL` is only used in local development. In production the web build uses relative `/api` paths, proxied internally by nginx.
- See `DEPLOY.md` for full infrastructure setup.

---

## Skills

These skills are available in this environment. **Use them proactively** — don't wait for the user to ask.

| Skill | Invoke with | When to use |
|-------|-------------|-------------|
| `tlc-spec-driven` | `/tlc-spec-driven` | Feature planning, project initialization, brownfield codebase mapping, and creating tasks from a `spec.md`. Runs 4 adaptive phases — **Specify → Design → Tasks → Execute** — auto-sized by scope. Design and Tasks are skipped when not needed. Use **Quick Mode** (within the skill) for fixes ≤3 files. **Never create tasks from a spec.md manually — always invoke this skill.** |
| `codenavi` | `/codenavi` | Exploring unfamiliar parts of the codebase, tracing a flow, brownfield mapping, or before implementing anything in an area you haven't read. Prefer over the `Explore` subagent when the area will be revisited across sessions — findings persist in `.notebook/`. Use `Explore` only for one-off mapping that won't be needed again. |
| `coding-guidelines` | `/coding-guidelines` | When writing or modifying any code — enforces SOLID, Clean Architecture, Clean Code, and unit testing rules specific to this stack. |
| `best-practices` | `/best-practices` | Security audits, modernizing code, checking for vulnerabilities, applying web best practices. |
| `security-best-practices` | `/security-best-practices` | Explicit security review of new endpoints, auth flows, or any code handling user input, tokens, or external data. |
| `react-best-practices` | `/react-best-practices` | Writing or reviewing React/Vite components — performance patterns, hooks rules, TanStack Query usage. |
| `frontend-design` | `/frontend-design` | Building new UI pages or components where visual quality matters — avoids generic AI-looking output. |
| `docs-writer` | `/docs-writer` | Writing or updating `AGENTS.md`, `prd.md`, `README`, or any file in `docs/`. |
| `commit` | `/commit` | Generating a conventional commit message from the current diff. Use before every commit. |

### Decision guide

**When to use `/tlc-spec-driven`:**
- Feature touches multiple packages, requires DB migrations, or has architectural decisions → full pipeline (Specify → Design → Tasks → Execute)
- Feature scope is unclear or has ambiguous gray areas → full pipeline (the skill handles clarification internally)
- Creating tasks from an existing `spec.md` → always invoke this skill, never `TaskCreate` directly
- Initializing a new project or mapping an existing codebase → use the project-init or brownfield-mapping commands within the skill
- Bug fix or small change ≤3 files with known cause → use **Quick Mode** within the skill (`/tlc-spec-driven` then say "quick fix")
- Straightforward feature, <10 tasks, no architectural decisions → Medium scope: Specify + Execute only (Design/Tasks auto-skipped)

**Other skill decisions:**
- **Navigating unfamiliar code?** → `/codenavi` before touching anything (persists to `.notebook/`). Use `Explore` subagent only for one-off research you won't need again.
- **Writing backend code?** → `/coding-guidelines` + `/security-best-practices` for any endpoint handling auth or user input.
- **Writing frontend code?** → `/coding-guidelines` + `/react-best-practices`.
- **Building a new UI page?** → `/frontend-design` + `/react-best-practices`.
- **Ready to commit?** → `/commit`.

---

## What NOT to do

- Do not put business logic in Fastify routes — routes are thin controllers only.
- Do not import Prisma inside use cases or domain entities.
- Do not store auth tokens in `localStorage` or `sessionStorage`.
- Do not call `fetch` directly from React components — always go through a TanStack Query hook.
- Do not read `process.env` outside of `config/env.ts`.
- Do not skip migrations or modify the database schema manually — always use Prisma migrations.
- Do not add speculative abstractions or helpers that are only used once.
