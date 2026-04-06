# WhatsApp AI Booking — Design

## System Overview

```
Customer (WhatsApp)
       │
       ▼
  Chatwoot / Baileys
       │  webhook: message_created
       ▼
    n8n Workflow
  ┌────────────────────────────────────────────┐
  │  1. Filter (incoming messages only)         │
  │  2. Extract phone + fetch conversation      │
  │  3. AI Agent (Gemini)                       │
  │       │                                     │
  │       ▼  MCP Client (HTTP)                  │
  │  ┌─────────────────────────────┐            │
  │  │  MCP Server (packages/mcp)  │            │
  │  │  list_services              │            │
  │  │  list_barbers               │────► API   │
  │  │  get_available_slots        │            │
  │  │  create_booking             │            │
  │  └─────────────────────────────┘            │
  │  4. Send reply via Chatwoot API             │
  └────────────────────────────────────────────┘
       │
       ▼
Customer receives WhatsApp reply
```

---

## Component 1 — MCP Server (`packages/mcp`)

### What it is

A standalone Node.js HTTP server that implements the Model Context Protocol (Streamable HTTP transport). It declares 4 tools and, when the AI calls one, makes the corresponding REST request to the backend API.

It has **no business logic** — it is a thin adapter between the MCP protocol and the existing HTTP API.

### Transport choice: Streamable HTTP

n8n's MCP Client node supports Streamable HTTP (the current MCP standard). This transport runs over plain HTTP — no WebSocket, no special infrastructure. The MCP server exposes a single POST endpoint (e.g. `POST /mcp`) that handles all tool calls.

### Package structure

```
packages/mcp/
├── src/
│   ├── config/
│   │   └── env.ts          # Validates: PORT, API_BASE_URL, MCP_SECRET
│   ├── tools/
│   │   ├── list-services.ts
│   │   ├── list-barbers.ts
│   │   ├── get-available-slots.ts
│   │   └── create-booking.ts
│   └── server.ts           # McpServer setup + Streamable HTTP transport
├── Dockerfile
└── package.json
```

### Tool definitions

#### `list_services`
```
Description: Lists all active services at Soberano Barbearia with name, duration, and price.
Input: none
API call: GET {API_BASE_URL}/services
Returns: [{ id, name, durationMinutes, priceCents }]
```

#### `list_barbers`
```
Description: Lists all active barbers with their names and working days of the week.
Input: none
API call: GET {API_BASE_URL}/barbers
Returns: [{ id, firstName, lastName, workDays }]
  where workDays is an array of numbers: 0=Sunday … 6=Saturday
```

#### `get_available_slots`
```
Description: Returns available time slots for a specific barber on a specific date.
Input:
  barberId: string (UUID) — from list_barbers
  date:     string (YYYY-MM-DD)
API call: GET {API_BASE_URL}/slots?barberId={barberId}&date={date}
Returns: [{ startTime: "HH:mm", endTime: "HH:mm" }]
```

#### `create_booking`
```
Description: Creates an appointment for the customer.
Input:
  serviceId:    string (UUID) — from list_services
  barberId:     string (UUID) — from list_barbers
  date:         string (YYYY-MM-DD)
  startTime:    string (HH:mm)
  customerName: string — customer's full name
  customerPhone: string — 10 or 11 digits, no country code (already known from WhatsApp)
API call: POST {API_BASE_URL}/book
Returns on success: { appointmentId, cancelToken, cancelUrl }
Returns on slot conflict: error with message "SLOT_TAKEN"
```

### Phone normalization (inside `create_booking` tool)

WhatsApp sends numbers with country code: `+5567999887766` or `5567999887766`.
The tool strips the `+55` prefix before sending to the API:
- `+5567999887766` → `67999887766` (11 digits ✓)
- `5567999887766` → `67999887766` (11 digits ✓)
- `67999887766` → unchanged (already 11 digits ✓)

### Security

A shared secret (`MCP_SECRET`) is required in every request as a Bearer token in the `Authorization` header. n8n's MCP Client node lets you configure this header. Without this, anyone who finds the URL can spam bookings.

The MCP server itself does **not** need public internet exposure — it only needs to be reachable from n8n. If n8n is on the same VPS, it can use the internal Docker network.

### Environment variables

```env
PORT=3002
API_BASE_URL=http://api:3000   # internal Docker service name
MCP_SECRET=<random secret>
```

### Dependencies

```json
{
  "@modelcontextprotocol/sdk": "^1.x",
  "zod": "^3.x"
}
```

---

## Component 2 — New API endpoint

**`GET /customer/name?phone=xxx`** — public endpoint, returns `{ name: string | null }`.

**Why needed**: When a returning customer messages the bot, the AI should greet them by name and skip asking "what's your name?". Without this, every returning customer would be asked for their name again on every session.

**Risk is low**: Returns only a first name. Phone number is the key (already known to the caller — it's their own phone).

**Location**: Add to `booking.routes.ts` (same file as `/slots` and `/book`, also unauthenticated).

**Implementation**: Calls `customerRepo.findByPhone(phone)` and returns `{ name }`.

---

## Component 3 — docker-compose.yaml changes

Add a `mcp` service:

```yaml
mcp:
  build:
    context: .
    dockerfile: packages/mcp/Dockerfile
  environment:
    NODE_ENV: production
    PORT: 3002
    API_BASE_URL: http://api:3000
    MCP_SECRET: ${MCP_SECRET}
  networks:
    - default
    - coolify
  depends_on:
    - api
  restart: unless-stopped
```

The `mcp` service joins the `coolify` network so n8n (also on Coolify) can reach it at `http://mcp:3002`. No public domain needed.

---

## Component 4 — n8n Workflow

### Trigger: Chatwoot Webhook (already configured)

The webhook fires on all Chatwoot events. The payload includes:
- `event`: `message_created`
- `message_type`: `incoming` (customer) or `outgoing` (agent/bot)
- `content`: message text
- `conversation.id`: conversation ID
- `meta.sender.phone_number`: e.g. `+5567999887766`

### Step-by-step workflow

```
[Chatwoot Webhook]
       │
[IF] event == "message_created"
  AND message_type == "incoming"
  AND content is not empty
       │
[HTTP Request] GET Chatwoot conversation messages
  → Last 20 messages of the conversation
  → Used as multi-turn context for the AI
       │
[Set] Extract variables:
  - customerPhone = meta.sender.phone_number
  - conversationId = conversation.id
  - currentMessage = content
       │
[AI Agent] Model: Google Gemini
  System prompt: see below
  Input: currentMessage + conversation history
       │ (uses MCP Client)
  ┌────────────────────────────┐
  │ MCP Client                 │
  │ URL: http://mcp:3002/mcp   │
  │ Auth: Bearer {MCP_SECRET}  │
  └────────────────────────────┘
       │
[HTTP Request] POST Chatwoot send message
  → conversationId
  → AI response content
```

### System prompt template

```
Você é o assistente virtual da Soberano Barbearia, localizada em Campo Grande, MS.
Responda sempre em português brasileiro, de forma amigável e objetiva.

Data e hora atual: {{ $now.setZone('America/Campo_Grande').toFormat('dd/MM/yyyy HH:mm') }}

Número de WhatsApp do cliente: {{ $json.customerPhone }}
Use este número ao criar um agendamento — não peça ao cliente que informe o telefone.

Você pode ajudar o cliente a:
- Ver os serviços disponíveis e preços
- Ver os barbeiros e seus dias de trabalho
- Verificar horários disponíveis
- Fazer um agendamento

Antes de criar um agendamento, confirme com o cliente:
  serviço, barbeiro, data e horário.

Se o cliente for novo (nome desconhecido), pergunte o nome antes de agendar.
Se o cliente já tiver nome registrado no sistema, use-o sem perguntar.

Após confirmar o agendamento, informe:
  - Data e hora confirmados
  - Nome do barbeiro
  - Link para cancelamento (cancelUrl retornado pela ferramenta)

Não discuta assuntos fora do contexto da barbearia.
```

### Conversation history format

Before calling the AI Agent, fetch the last 20 messages from Chatwoot:
```
GET /api/v1/accounts/{accountId}/conversations/{conversationId}/messages
```

Map them to the AI message format:
- `message_type: incoming` → role: `user`
- `message_type: outgoing` → role: `assistant`

Pass as the conversation history array to the AI Agent node.

### Chatwoot send message

```
POST /api/v1/accounts/{accountId}/conversations/{conversationId}/messages
Body: {
  "content": "{{ $json.aiResponse }}",
  "message_type": "outgoing",
  "private": false
}
```

---

## Data flow — full booking example

```
Customer: "Quero marcar um corte com o Matheus no sábado às 10h"

AI calls: list_barbers()
→ finds Matheus (id: "uuid-matheus")

AI calls: list_services()
→ finds "Corte" (id: "uuid-corte")

AI calls: get_available_slots(barberId: "uuid-matheus", date: "2026-04-11")
→ 10:00 is available ✓

AI: "Perfeito! Antes de confirmar, qual é o seu nome?"
Customer: "João Silva"

AI calls: create_booking({
  serviceId: "uuid-corte",
  barberId: "uuid-matheus",
  date: "2026-04-11",
  startTime: "10:00",
  customerName: "João Silva",
  customerPhone: "67999887766"  ← injected from system prompt
})
→ success: cancelUrl = "https://soberano.altion.com.br/appointment/abc123"

AI: "Agendamento confirmado! ✂️
  Corte com Matheus
  Sábado, 11 de abril às 10h00
  Para cancelar: https://soberano.altion.com.br/appointment/abc123"
```

---

## Decisions

| Decision | Choice | Rationale |
|---|---|---|
| MCP transport | Streamable HTTP | Supported by n8n MCP Client; simple to deploy |
| Conversation memory | Fetch from Chatwoot API | No extra infrastructure (Redis, etc.); always accurate |
| Phone normalization | Inside MCP `create_booking` tool | Single place; API doesn't have to deal with `+55` prefix |
| Customer name lookup | New public `GET /customer/name` endpoint | Better UX for returning customers; low security risk |
| MCP server auth | Bearer token (`MCP_SECRET`) | Prevents booking spam from unknown callers |
| Network access | Internal Docker (`coolify` network) | MCP server doesn't need a public domain |

---

## What is NOT in this design

- No changes to the existing notification flows (reminders, confirmations still work as before)
- No changes to the web frontend
- No new Prisma schema changes for P1 (customer name lookup uses existing `customerRepo`)
- No Redis or external session store
