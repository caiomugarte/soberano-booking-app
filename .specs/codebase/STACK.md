# Tech Stack

**Analyzed:** 2026-04-09

## Core

- Language: TypeScript 5.7
- Runtime: Node.js 20
- Package manager: npm workspaces (monorepo)

## Backend (`packages/api`)

- API Framework: Fastify 5.2
- ORM: Prisma 6.5
- Database: PostgreSQL (Prisma + `@db.Timestamptz`, `@db.Uuid`)
- Auth: JWT via `jsonwebtoken` 9 (access + refresh tokens)
- Password hashing: `bcryptjs`
- Validation: Zod 3.24
- Scheduling: `node-cron` 3
- Environment validation: Zod schema in `src/config/env.ts`

## Frontend (`packages/web`)

- Framework: React 19 + Vite 6
- Routing: React Router DOM 7
- Server state: TanStack Query (React Query) 5
- Client state: Zustand 5
- Styling: Tailwind CSS 3 + PostCSS + Autoprefixer
- Form validation: Zod (shared schemas from `@soberano/shared`)
- Testing: Vitest 3 + @testing-library/react 16 + jsdom

## Shared (`packages/shared`)

- Zod schemas shared between API and web
- Compiled to `dist/` — consumed by both packages

## MCP Server (`packages/mcp`)

- `@modelcontextprotocol/sdk` 1.x
- Proxies to API via HTTP (`API_BASE_URL` env var)
- Secured by `MCP_SECRET` env var

## Testing

- Unit/Integration: Vitest 3 (API + web + shared)
- API tests: mocked repository interfaces
- Web tests: @testing-library/react + jsdom
- Tests run inside Docker build (`RUN npm ... run test`) — build fails if tests fail

## Infrastructure

- Containers: Docker (multi-stage for web, slim for api)
- Web serving: nginx:alpine (serves React SPA)
- Deploy: Coolify via `docker-compose.yaml`
- Nginx: SPA config with `try_files $uri /index.html`

## External Services

- Notifications: Chatwoot (WhatsApp gateway)
- AI: MCP server (model context protocol bridge)
