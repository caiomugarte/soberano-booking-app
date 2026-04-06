# WhatsApp AI Booking — Specification

## Problem Statement

Customers who contact the barbershop via WhatsApp today get a slow, unreliable chatbot. The web app works well, but not every customer uses it. The goal is an AI assistant on WhatsApp that interprets free-text messages and drives the booking flow using the same backend the web app uses — no duplicated business logic.

The integration approach is: **n8n orchestrates the AI**; the AI uses an **MCP server** to call the existing API; the MCP server is a new service in the monorepo.

## Goals

- [ ] Customers can book appointments via WhatsApp in natural language (Portuguese)
- [ ] The AI answers questions about services, barbers, and availability using live data
- [ ] Booking is created through the existing `/book` endpoint — no parallel data path
- [ ] The MCP server is a standalone package in the monorepo, deployable on the same VPS
- [ ] n8n workflow is clearly documented so it can be reproduced and extended

## Out of Scope

| Feature | Reason |
|---|---|
| Customer login / auth on WhatsApp | Phone number is the identifier — no passwords |
| Payments via WhatsApp | Out of product scope entirely |
| AI changing/cancelling appointments | Deferred — adds ambiguity to P1 |
| Multi-tenant MCP (per-shop config) | SaaS generalization deferred to future |
| Web UI changes | This feature is backend + n8n only |

---

## User Stories

### P1: Customer asks about services — WAB-01 ⭐ MVP

**User Story**: As a customer messaging the barbershop on WhatsApp, I want to ask "what services do you offer?" and get a clear, formatted response with names and prices.

**Why P1**: The AI needs live service data to answer confidently. Without this tool, it hallucinates or gives stale info.

**Acceptance Criteria**:

1. WHEN customer sends a question about services THEN AI SHALL call `list_services` tool and respond with current service list including name, duration, and price in BRL
2. WHEN the API returns an empty list THEN AI SHALL respond that no services are currently available
3. WHEN the API is unreachable THEN AI SHALL respond with a polite error and suggest calling the shop directly

**Independent Test**: Message "Quais são os serviços e preços?" — verify response matches current services in database.

---

### P1: Customer asks about available barbers — WAB-02 ⭐ MVP

**User Story**: As a customer, I want to ask "who are the barbers?" and see who's available and on which days.

**Why P1**: Required before slots can be offered — customer needs to choose a barber.

**Acceptance Criteria**:

1. WHEN customer asks about barbers THEN AI SHALL call `list_barbers` tool and respond with each barber's name and work days
2. WHEN customer asks about a specific barber THEN AI SHALL filter and respond with that barber's info only

**Independent Test**: Message "Quem são os barbeiros?" — verify names and days match database.

---

### P1: Customer checks available slots — WAB-03 ⭐ MVP

**User Story**: As a customer, I want to ask "what times are free for [barber] on [date]?" and get a list of slots.

**Why P1**: Without slot availability the booking flow cannot happen.

**Acceptance Criteria**:

1. WHEN customer specifies barber + date THEN AI SHALL call `get_available_slots` and respond with available time slots
2. WHEN no slots are available THEN AI SHALL inform the customer and suggest alternative dates
3. WHEN date is in the past THEN AI SHALL reject with a friendly message
4. WHEN customer is ambiguous about the date (e.g. "tomorrow", "Saturday") THEN AI SHALL interpret relative to the current date in `America/Campo_Grande` timezone

**Independent Test**: Ask for slots on a known date — verify response matches `/slots` endpoint output.

---

### P1: Customer books an appointment — WAB-04 ⭐ MVP

**User Story**: As a customer, I want to say "I want to book a haircut with Matheus on Saturday at 10am" and have the appointment created.

**Why P1**: This is the core value of the feature.

**Acceptance Criteria**:

1. WHEN customer provides service + barber + date + time THEN AI SHALL call `create_booking` with the customer's WhatsApp phone number as identifier
2. WHEN booking succeeds THEN AI SHALL respond with confirmation including date, time, barber name, and the cancel link
3. WHEN the slot is already taken THEN AI SHALL inform the customer and offer to check other slots
4. WHEN the customer's name is not yet known THEN AI SHALL ask for it before booking
5. WHEN the customer has messaged before (name already in system) THEN AI SHALL reuse their name without asking again
6. WHEN required info is missing (no service, no barber, no date, no time) THEN AI SHALL ask clarifying questions one at a time

**Independent Test**: Full end-to-end — send "Quero marcar um corte com o Matheus no sábado às 10h" → appointment appears in admin dashboard.

---

### P2: Customer asks "do I have an appointment?" — WAB-05

**User Story**: As a customer, I want to ask if I have any upcoming appointments so I don't have to remember the cancel link.

**Why P2**: Useful but requires a new API endpoint (`GET /appointments/by-phone`) not currently available. Adds scope.

**Acceptance Criteria**:

1. WHEN customer asks about their appointments THEN AI SHALL call `get_my_appointments` with the customer's phone number
2. WHEN appointments exist THEN AI SHALL respond with the next upcoming appointment details
3. WHEN no appointments exist THEN AI SHALL inform the customer

**Independent Test**: Ask with a phone that has a known booking — verify correct appointment is returned.

---

### P2: Customer cancels an appointment via AI — WAB-06

**User Story**: As a customer, I want to say "I want to cancel my appointment" and have it cancelled without needing the cancel link.

**Why P2**: The cancel link flow works but requires the customer to find the link. AI-assisted cancel is better UX.

**Acceptance Criteria**:

1. WHEN customer requests cancellation THEN AI SHALL look up their appointment by phone (WAB-05 required)
2. WHEN appointment is found THEN AI SHALL confirm details and ask the customer to confirm cancellation
3. WHEN customer confirms THEN AI SHALL call `cancel_appointment` tool
4. WHEN cancellation succeeds THEN AI SHALL confirm and send a summary

**Independent Test**: "Quero cancelar meu agendamento" with a known booking → appointment cancelled in database.

---

### P3: AI handles ambiguous or off-topic messages gracefully — WAB-07

**User Story**: As a customer, when I send something unclear or unrelated to bookings, I want a helpful redirect rather than a confused or silent response.

**Why P3**: Nice UX polish — not blocking for MVP.

**Acceptance Criteria**:

1. WHEN customer sends a message unrelated to bookings THEN AI SHALL politely redirect to booking-related topics
2. WHEN customer asks for help THEN AI SHALL explain what it can do

---

## Edge Cases

- WHEN the MCP server cannot reach the backend API THEN it SHALL return a structured error and the AI SHALL surface a user-friendly message
- WHEN WhatsApp phone number extraction fails in n8n THEN booking SHALL be rejected with a clear log entry
- WHEN customer provides a phone number in an unexpected format THEN the MCP tool SHALL normalize it to 10-11 digits before calling the API
- WHEN the AI is called with no message history THEN it SHALL greet the customer and explain what it can help with
- WHEN the booking rate limit (5/min) is hit THEN the AI SHALL tell the customer to try again shortly

---

## Requirement Traceability

| Requirement ID | Story | Phase | Status |
|---|---|---|---|
| WAB-01 | P1: List services | Tasks | T2, T7 |
| WAB-02 | P1: List barbers | Tasks | T2, T7 |
| WAB-03 | P1: Available slots | Tasks | T3, T7 |
| WAB-04 | P1: Create booking | Tasks | T4, T5, T7 |
| WAB-05 | P2: Get my appointments | Deferred | — |
| WAB-06 | P2: Cancel via AI | Deferred | — |
| WAB-07 | P3: Graceful fallback | — | System prompt |

**Coverage:** 4 P1 requirements mapped to tasks (T1–T7). P2–P3 deferred.

---

## What changes where

### Monorepo (`packages/`)

| What | Why |
|---|---|
| New `packages/mcp` package | MCP server — exposes API as tools |
| New API endpoint: `GET /appointments/by-phone` | Needed for WAB-05, WAB-06 (P2) |
| `docker-compose.yaml` update | Add `mcp` service |
| Env config (`packages/mcp/src/config/env.ts`) | API base URL, MCP auth secret |

### n8n workflow

| What | Why |
|---|---|
| New "WhatsApp AI Agent" workflow | Receives messages, drives AI conversation |
| MCP Client node | Connects n8n AI Agent to the MCP server |
| Chatwoot webhook trigger | Receives incoming WhatsApp messages |
| Response sender node | Sends AI reply back via Chatwoot |
| Conversation memory | Passes message history to AI for multi-turn context |

### No changes to

- Existing booking/notification flows (barber reminders, etc.)
- Web frontend
- Any existing Prisma schema for P1 (P2 may need a query addition)

---

## Success Criteria

- [ ] Customer can complete a booking via WhatsApp in under 3 minutes with no human intervention
- [ ] AI never creates a booking with wrong data (wrong barber, wrong slot)
- [ ] AI responds in Portuguese in all scenarios
- [ ] MCP server is deployed and reachable from n8n
- [ ] Existing WhatsApp notification flows are unaffected
