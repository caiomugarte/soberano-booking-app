# WhatsApp AI Booking — Tasks

## Dependency map

```
T1 ──► T2 ──► T3 ──► T4 (MCP server — can be done standalone)
                          │
T5 (new API endpoint)     │
         └────────────────► T6 (docker-compose)
                                    │
                                    └──► T7 (n8n workflow)
```

T1–T4 (MCP server) and T5 (API endpoint) are **independent** — can be built in parallel.
T6 (deployment) requires T1–T5.
T7 (n8n) requires T6 (MCP server must be running).

---

## T1 — Bootstrap `packages/mcp`

**Goal**: Create the package scaffold with TypeScript config, env validation, and an empty MCP server that starts without errors.

**Files to create**:
- `packages/mcp/package.json` — name: `@soberano/mcp`, deps: `@modelcontextprotocol/sdk`, `zod`
- `packages/mcp/tsconfig.json` — extend `../../tsconfig.base.json`, ESM output
- `packages/mcp/src/config/env.ts` — validate `PORT`, `API_BASE_URL`, `MCP_SECRET`
- `packages/mcp/src/server.ts` — `McpServer` instance with Streamable HTTP transport, auth middleware checking `Authorization: Bearer {MCP_SECRET}`
- `packages/mcp/Dockerfile` — two-stage build (same pattern as `packages/api/Dockerfile`)

**Verification**:
- `cd packages/mcp && npm run build` compiles without errors
- `node dist/server.js` starts and logs "MCP server listening on port 3002"

**Requirement IDs**: WAB-01, WAB-02, WAB-03, WAB-04 (foundation)

---

## T2 — Implement `list_services` and `list_barbers` tools

**Goal**: MCP server can return live service and barber data.

**Files to create/edit**:
- `packages/mcp/src/tools/list-services.ts`
- `packages/mcp/src/tools/list-barbers.ts`
- `packages/mcp/src/server.ts` — register both tools

**Tool specs**:

```ts
// list_services — no input
// Calls: GET {API_BASE_URL}/services
// Returns: services array with id, name, durationMinutes, priceCents, icon

// list_barbers — no input
// Calls: GET {API_BASE_URL}/barbers
// Returns: barbers array with id, firstName, lastName, workDays
```

**Verification**:
- Call the MCP endpoint directly (e.g. with curl or MCP Inspector) — `list_services` returns the current services from DB
- `list_barbers` returns the 3 barbers with correct work days

**Requirement IDs**: WAB-01, WAB-02

---

## T3 — Implement `get_available_slots` tool

**Goal**: MCP can return available time slots for a barber + date.

**Files to create/edit**:
- `packages/mcp/src/tools/get-available-slots.ts`
- `packages/mcp/src/server.ts` — register tool

**Tool spec**:
```ts
// Input: { barberId: string (UUID), date: string (YYYY-MM-DD) }
// Calls: GET {API_BASE_URL}/slots?barberId={barberId}&date={date}
// Returns: slots array or empty array
// Error: if API returns error, propagate as tool error
```

**Verification**:
- Call tool with a known barberId + today's date → returns same result as `GET /slots` endpoint
- Call with past date → API returns empty, tool returns empty array

**Requirement IDs**: WAB-03

---

## T4 — Implement `create_booking` tool

**Goal**: MCP can create an appointment via the existing `/book` endpoint.

**Files to create/edit**:
- `packages/mcp/src/tools/create-booking.ts`
- `packages/mcp/src/server.ts` — register tool

**Tool spec**:
```ts
// Input:
//   serviceId: string (UUID)
//   barberId: string (UUID)
//   date: string (YYYY-MM-DD)
//   startTime: string (HH:mm)
//   customerName: string
//   customerPhone: string (raw WhatsApp number — will be normalized)
//
// Normalization: strip leading '+55' or '55' from phone if result is 10-11 digits
//   "+5567999887766" → "67999887766"
//   "5567999887766"  → "67999887766"
//   "67999887766"    → "67999887766" (no change)
//
// Calls: POST {API_BASE_URL}/book
// Returns on success: { appointmentId, cancelToken, cancelUrl }
// Returns on SLOT_TAKEN (409): tool error "Horário já ocupado. Verifique outros horários disponíveis."
// Returns on VALIDATION_ERROR (400): tool error with message from API
```

**Verification**:
- Call tool with valid data → appointment created in DB, confirmation returned with cancelUrl
- Call tool with an occupied slot → returns slot-taken error message
- Call tool with `+5567999887766` → booking is created with `67999887766` in DB

**Requirement IDs**: WAB-04

---

## T5 — New API endpoint: `GET /customer/name`

**Goal**: Allow the MCP/AI to check if a returning customer has a name on record, so the AI doesn't ask for it again.

**Files to edit**:
- `packages/api/src/http/routes/booking.routes.ts` — add the new route

**Route spec**:
```ts
// GET /customer/name?phone=xxx
// No auth required
// Validates: phone must be 10-11 digits
// Calls: customerRepo.findByPhone(phone)
// Returns: { name: string | null }
// 400 if phone param is missing or invalid format
```

> Note: The existing `GET /admin/customers/lookup` does the same thing but is behind admin auth. This is intentionally a public read-only endpoint returning only the name. Do not expose other customer fields.

**Verification**:
- `GET /customer/name?phone=67999887766` with a known customer → returns their name
- `GET /customer/name?phone=00000000000` with unknown customer → returns `{ name: null }`
- `GET /customer/name?phone=abc` → 400 error

**Requirement IDs**: WAB-04 (UX: skip name question for returning customers)

---

## T6 — Add `mcp` service to docker-compose + Coolify env vars

**Goal**: MCP server is deployed on the VPS and reachable from n8n via internal Docker network.

**Files to edit**:
- `docker-compose.yaml` — add `mcp` service (see design.md for full config)

**Env vars to add in Coolify**:
```
MCP_SECRET=<generate a strong random string>
```

**Verification**:
- After deploy, from n8n (or another container on the `coolify` network): `curl -H "Authorization: Bearer {MCP_SECRET}" http://mcp:3002/mcp` responds (even with an error body is fine — just needs to be reachable)
- Existing `api` and `web` services are unaffected

**Requirement IDs**: WAB-01–WAB-04 (deployment prerequisite)

---

## T7 — n8n workflow: WhatsApp AI Agent

**Goal**: Build the complete n8n workflow that receives WhatsApp messages and responds via the AI + MCP.

**n8n nodes (in order)**:

1. **Chatwoot Webhook** (already exists — reuse or clone)
   - Event: `message_created`

2. **IF node** — filter condition:
   - `{{ $json.message_type }} === "incoming"`
   - `{{ $json.event }} === "message_created"`
   - `{{ $json.content }}` is not empty
   - Stop: do nothing (prevents the AI from responding to its own outgoing messages)

3. **Set node** — extract variables:
   - `customerPhone`: `{{ $json.meta.sender.phone_number }}`
   - `conversationId`: `{{ $json.id }}` (conversation id from webhook payload)
   - `currentMessage`: `{{ $json.content }}`

4. **HTTP Request node** — fetch conversation history:
   - Method: GET
   - URL: `{CHATWOOT_URL}/api/v1/accounts/{ACCOUNT_ID}/conversations/{{ $json.conversationId }}/messages`
   - Header: `api_access_token: {CHATWOOT_API_TOKEN}`
   - Returns: last messages array

5. **Code node** — format message history for AI:
   ```js
   // Map Chatwoot messages to [{role: "user"|"assistant", content: string}]
   // incoming → user, outgoing → assistant
   // Take last 20 non-empty messages
   // Exclude the current message (already passed separately)
   ```

6. **AI Agent node**:
   - Model: Google Gemini (existing credential)
   - System prompt: (see design.md — inject `customerPhone` and current date)
   - Input: `{{ $json.currentMessage }}`
   - Memory/history: output of step 5

7. **MCP Client node** (connected to AI Agent as tool provider):
   - URL: `http://mcp:3002/mcp`
   - Authentication: Header Auth → `Authorization: Bearer {{ $env.MCP_SECRET }}`

8. **HTTP Request node** — send reply via Chatwoot:
   - Method: POST
   - URL: `{CHATWOOT_URL}/api/v1/accounts/{ACCOUNT_ID}/conversations/{{ $json.conversationId }}/messages`
   - Body: `{ "content": "{{ $json.output }}", "message_type": "outgoing", "private": false }`
   - Header: `api_access_token: {CHATWOOT_API_TOKEN}`

**Verification**:
- Send "Quais são os serviços?" via WhatsApp → bot replies with service list
- Send "Quero marcar um corte com o Matheus na segunda às 10h" → bot asks for name → confirm → appointment in DB
- Send a message from the bot account → workflow does nothing (filter blocks it)

**Requirement IDs**: WAB-01, WAB-02, WAB-03, WAB-04

---

## Task summary

| Task | What | Req IDs | Depends on |
|---|---|---|---|
| T1 | MCP package scaffold | WAB-01–04 | — |
| T2 | list_services + list_barbers | WAB-01, WAB-02 | T1 |
| T3 | get_available_slots | WAB-03 | T1 |
| T4 | create_booking | WAB-04 | T1 |
| T5 | GET /customer/name endpoint | WAB-04 | — |
| T6 | docker-compose + deploy | WAB-01–04 | T1–T5 |
| T7 | n8n workflow | WAB-01–04 | T6 |

**Parallel tracks**: T1–T4 (MCP) and T5 (API) can be built at the same time. T6 gates T7.

---

## Prerequisite checklist (before T7)

- [ ] n8n version ≥ 1.68 (MCP Client node available) — check at `Settings > About`
- [ ] Google Gemini API credential already configured in n8n
- [ ] Chatwoot API token available in n8n credentials
- [ ] `MCP_SECRET` env var set in Coolify
- [ ] MCP service deployed and reachable from n8n container
