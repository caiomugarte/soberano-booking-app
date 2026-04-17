# MCP Tool Registration Pattern

tags: mcp, tools, pattern, architecture

## Overview

All MCP tools live in `packages/mcp/src/tools/*.ts`. Each file exports a single `register*` function. All tools are registered in `packages/mcp/src/server.ts:createMcpServer()`.

## Two Tool Categories

### Public tools (customer-facing)
Signature: `register*(server, apiBaseUrl, tenantSlug)`
Hit public API routes (no secret). Examples: `list-services.ts`, `create-booking.ts`, `get-my-appointments.ts`.

### Provider tools (barber-facing, internal)
Signature: `register*(server, apiBaseUrl, internalApiSecret, tenantSlug)`
Hit `/api/internal/*` routes. Require `X-Internal-Secret` header. Examples: `book-barber-absence.ts`, `get-barber-appointments.ts`, `get-barber-financial-report.ts`.

## Tool File Template

```
packages/mcp/src/tools/<tool-name>.ts
```

- Import: `McpServer` from `@modelcontextprotocol/sdk/server/mcp.js`, `z` from `zod`
- Export: `export function register<ToolName>(server, apiBaseUrl, internalApiSecret?, tenantSlug): void`
- Register via: `server.tool(snake_case_name, description, zodSchema, asyncHandler)`
- Handler returns: `{ content: [{ type: 'text' as const, text: JSON.stringify(data) }] }`
- On error: `{ isError: true, content: [{ type: 'text' as const, text: 'message' }] }`
- Error codes handled: 401 → config error, 404 → not found, other non-ok → generic API error

## server.ts Registration

`packages/mcp/src/server.ts:createMcpServer()` — imports and calls every register function.
Public tools: `register*(server, env.apiBaseUrl, tenantSlug)`
Provider tools: `register*(server, env.apiBaseUrl, env.internalApiSecret, tenantSlug)`

The server is stateless — a fresh instance is created per HTTP request.

## Tool Description Convention

- Describe WHAT it returns and WHEN to use it.
- For provider tools: add "barberId is known from the workflow context — never ask the barber for it."
- This prevents the AI from prompting the barber for IDs they shouldn't need to provide.

## Current Tool Inventory (as of 2026-04-17)

Public (8): `list_services`, `list_barbers`, `get_available_slots`, `get_next_available_date`, `create_booking`, `get_my_appointments`, `cancel_booking`, `reschedule_booking`

Provider/internal (6): `book_barber_absence`, `list_barber_absences`, `cancel_barber_absence`, `edit_barber_absence`, `get_barber_appointments`, `get_barber_financial_report`
