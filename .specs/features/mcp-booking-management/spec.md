# MCP Booking Management Tools — Specification

## Context

The `packages/mcp` server already exposes four tools to the WhatsApp AI agent:
`list_services`, `list_barbers`, `get_available_slots`, `create_booking`.

These new tools extend the AI's capabilities to cover the full booking lifecycle:
customers can cancel or reschedule via WhatsApp, the AI can proactively suggest the
next available date, and barbers can register absences through their own WhatsApp
channel without opening the admin panel.

`get_my_appointments` and `cancel_booking` were previously deferred (WAB-05, WAB-06)
and are now promoted to P1 because they are prerequisites for `reschedule_booking`.

---

## Goals

- [ ] Customer can say "cancela meu horário" on WhatsApp and have it cancelled with confirmation
- [ ] Customer can say "quero remarcar meu horário" and pick a new slot
- [ ] AI can suggest the next available date for a barber without the customer having to guess dates
- [ ] Barber can say "vou faltar quinta-feira" on WhatsApp and have the absence registered
- [ ] All tools follow the existing pattern in `packages/mcp/src/tools/`
- [ ] No changes to existing tools or the frontend

## Out of Scope

| Feature | Reason |
|---|---|
| Multi-appointment lookup (customer has >1 booking) | Barbershop context: one active booking per customer at a time is the norm. Return the next upcoming one only. |
| Cancelling past appointments | Past appointments cannot be cancelled |
| Barber creating absences for another barber | Each barber's n8n channel maps to their own ID |
| Customer authentication beyond phone lookup | Phone number is the identity mechanism for this barbershop |
| New Prisma migrations | All required DB models already exist (`ProviderAbsence`, `Appointment`) |

---

## User Stories

### P1: Look up a customer's upcoming appointment — MCB-01

**User Story**: As the AI agent, I need to retrieve a customer's next upcoming appointment using their WhatsApp phone number, so I can present details before cancel or reschedule actions.

**Why P1**: Gate for MCB-02 and MCB-03. Without this the AI has no cancelToken or appointment details.

**Acceptance Criteria**:

1. WHEN the AI calls `get_my_appointments` with a valid phone THEN the tool SHALL return the next upcoming confirmed appointment including: `id`, `cancelToken`, barber name, service name, date, `startTime`, `endTime`, `priceCents`
2. WHEN no upcoming appointment exists THEN the tool SHALL return `{ appointment: null }` (not an error)
3. WHEN the phone format is invalid (not 10–11 digits) THEN the tool SHALL return a tool error
4. WHEN the API is unreachable THEN the tool SHALL return a tool error with a user-friendly message

**Backend**: New `GET /appointments/by-phone?phone=xxx` endpoint in `booking.routes.ts`.
Returns the customer's next upcoming `confirmed` appointment, ordered by date + startTime ascending.
Returns `cancelToken` (required for downstream cancel/change calls). Returns `{ appointment: null }` when none found.

> **Security note**: Returning `cancelToken` from a phone-only lookup is acceptable here.
> The cancel endpoint also requires `phoneLastFour`, so knowledge of the full phone is required
> at both steps. This is a deliberate trade-off for the barbershop context.

**New repository method**: `findUpcomingByCustomerPhone(phone: string): Promise<AppointmentWithDetails | null>`
— finds the next appointment where `customer.phone = phone`, `status = 'confirmed'`, `date >= today`,
ordered by `date asc`, `startTime asc`, limit 1.

**Independent Test**: Call with a known customer phone that has a future appointment → returns correct appointment. Call with unknown phone → returns `{ appointment: null }`.

---

### P1: Cancel an appointment via WhatsApp AI — MCB-02

**User Story**: As a customer messaging on WhatsApp, I want to say "quero cancelar meu agendamento" and have the AI cancel it after I confirm.

**Why P1**: Customers currently need the cancel link. AI-assisted cancel removes that friction.

**Acceptance Criteria**:

1. WHEN AI calls `cancel_booking` with a valid `cancelToken` and correct `phoneLastFour` THEN the appointment SHALL be cancelled and a success message returned
2. WHEN the `phoneLastFour` does not match THEN the tool SHALL return a tool error: "Telefone não confere."
3. WHEN the appointment is not found THEN the tool SHALL return a tool error: "Agendamento não encontrado."
4. WHEN the appointment is already cancelled THEN the tool SHALL return an appropriate error
5. WHEN cancellation succeeds THEN the existing WhatsApp notification to the customer SHALL fire (handled by the API)

**Backend**: Uses existing `PATCH /appointment/:token/cancel` — no new endpoint needed.

**AI flow**:
1. AI calls `get_my_appointments(phone)` → gets appointment + cancelToken
2. AI confirms details with the customer
3. Customer confirms → AI calls `cancel_booking(cancelToken, phone.slice(-4))`

**Independent Test**: Run full flow with a test booking → appointment status changes to `cancelled` in DB.

---

### P1: Reschedule an appointment via WhatsApp AI — MCB-03

**User Story**: As a customer, I want to say "quero remarcar meu horário para quinta às 14h" and have the appointment moved.

**Why P1**: Reschedule is currently only possible via the cancel-link flow. AI makes this conversational.

**Acceptance Criteria**:

1. WHEN AI calls `reschedule_booking` with valid cancelToken, phoneLastFour, newDate, and newStartTime THEN the appointment SHALL be rescheduled
2. WHEN the new slot is already taken THEN the tool SHALL return: "Horário já ocupado. Tente outro horário."
3. WHEN the new date is in the past THEN the tool SHALL return a validation error
4. WHEN the barber does not work on the requested day THEN the tool SHALL return: "Barbeiro não atende neste dia."
5. WHEN rescheduling succeeds THEN the existing WhatsApp change notice SHALL fire (handled by the API)

**Backend**: Uses existing `PATCH /appointment/:token/change` — no new endpoint needed.

**AI flow**:
1. AI calls `get_my_appointments(phone)` → gets appointment + cancelToken
2. AI calls `get_available_slots(barberId, newDate)` to confirm the slot is free before proposing
3. Customer confirms → AI calls `reschedule_booking(cancelToken, phone.slice(-4), newDate, newStartTime)`

**Independent Test**: Reschedule a test booking to a new date → DB shows new date/time, notification sent.

---

### P2: Find the next available date for a barber — MCB-04

**User Story**: As the AI, when a customer asks "quando é a próxima vaga com o Matheus?", I want to surface the earliest date that has open slots — without making the customer guess dates.

**Why P2**: Quality-of-life for the customer. Not blocking but significantly improves the booking UX.

**Acceptance Criteria**:

1. WHEN AI calls `get_next_available_date(barberId)` THEN the tool SHALL scan from today (America/Campo_Grande) forward and return the first date with at least one available slot
2. WHEN a date is found THEN the tool SHALL return `{ date: "YYYY-MM-DD", slots: string[] }` (the slots for that date)
3. WHEN no date is found within `maxDaysAhead` (default 30) THEN the tool SHALL return a tool error: "Nenhuma vaga encontrada nos próximos 30 dias."
4. WHEN `fromDate` is provided THEN the scan SHALL start from that date instead of today

**Backend**: New `GET /slots/next-available?barberId=...&from=YYYY-MM-DD&maxDays=30` endpoint in `booking.routes.ts`.

The API handles the loop in-process (no repeated HTTP round trips from MCP):
1. Load barber shifts (1 DB query) → know which `dayOfWeek` values the barber works
2. Iterate from `from` date, skipping days not in the barber's working days
3. For each working-day candidate, check available slots (reuse `GetAvailableSlots` use case)
4. Return `{ date, slots }` on first non-empty result
5. Return `{ date: null, slots: [] }` if nothing found within `maxDays`

Query params:
- `barberId`: UUID (required)
- `from`: YYYY-MM-DD (required — MCP passes today in `America/Campo_Grande`)
- `maxDays`: integer 1–60 (optional, default 30)

**Why not loop in the MCP**: Would require up to 30 sequential HTTP round trips (network latency × 30). The API-side loop is in-process, and shift pre-filtering reduces iterations significantly (e.g., Mon–Fri barber skips 8 weekend days out of 30).

**Independent Test**: Call with a barberId that has future availability → returns a date within 30 days. Call with a barberId with no shifts → returns "nenhuma vaga" error.

---

### P2: Barber registers an absence via WhatsApp AI — MCB-05

**User Story**: As a barber, I want to message "vou faltar quinta" and have my absence registered without opening the admin panel.

**Why P2**: Barbers currently must open the web app to register absences. WhatsApp is faster and what they already use.

**Acceptance Criteria**:

1. WHEN the AI calls `book_barber_absence(barberId, date)` THEN a full-day absence SHALL be created for that barber
2. WHEN `startTime` and `endTime` are also provided THEN a partial-day absence SHALL be created
3. WHEN `reason` is provided THEN it SHALL be stored on the absence record
4. WHEN the date is in the past THEN the tool SHALL return a validation error
5. WHEN `barberId` is invalid (not found in tenant) THEN the tool SHALL return: "Barbeiro não encontrado."
6. WHEN the absence is created THEN the tool SHALL return: `{ absenceId, date, startTime, endTime, reason }`

**Backend**: New `POST /internal/provider-absences` endpoint, protected by `X-Internal-Secret` header
(value = new `INTERNAL_API_SECRET` env var, shared between `packages/api` and `packages/mcp`).

```
POST /internal/provider-absences
X-Internal-Secret: {INTERNAL_API_SECRET}
{
  "barberId": "uuid",
  "date": "YYYY-MM-DD",
  "startTime": "HH:mm" | null,
  "endTime": "HH:mm" | null,
  "reason": "string" | null
}
→ 201 { absenceId, date, startTime, endTime, reason }
→ 404 if barberId not found
→ 400 if date is in the past
→ 401 if secret header missing/wrong
```

**Auth note**: The `INTERNAL_API_SECRET` is a new Coolify env var separate from `MCP_SECRET`.
This keeps concerns separate: `MCP_SECRET` gates the MCP endpoint itself; `INTERNAL_API_SECRET`
gates internal API calls from trusted services. Both are set once in Coolify.

**n8n note**: Each barber's WhatsApp AI workflow in n8n is configured with that barber's ID as
a hardcoded variable. The n8n workflow injects `barberId` into the AI's system prompt so the AI
always knows which barber is sending the message.

**Independent Test**: POST to `/internal/provider-absences` with valid secret + barberId + date →
absence appears in DB and `GET /admin/schedule/absences` returns it.

---

## Edge Cases

- WHEN the customer's phone has no bookings and they ask to cancel → AI responds "Não encontrei nenhum agendamento futuro para o seu número."
- WHEN the customer has a booking but it's in the past → treat as no upcoming booking
- WHEN `get_next_available_date` is called and the barber has shifts but all slots are booked for 30 days → return the "nenhuma vaga" error
- WHEN the MCP server cannot reach the API → all tools return structured tool errors with user-friendly messages (same pattern as existing tools)
- WHEN `book_barber_absence` receives a date with an existing absence → the API `createAbsence` allows duplicates (no unique constraint on providerId+date); AI may create a second absence. Deferred: deduplicate via future enhancement.

---

## Requirement Traceability

| Requirement ID | Story | API Changes | MCP Tool |
|---|---|---|---|
| MCB-01 | get_my_appointments | New `GET /appointments/by-phone` | `get_my_appointments` |
| MCB-02 | cancel_booking | None (existing endpoint) | `cancel_booking` |
| MCB-03 | reschedule_booking | None (existing endpoint) | `reschedule_booking` |
| MCB-04 | get_next_available_date | New `GET /slots/next-available` | `get_next_available_date` |
| MCB-05 | book_barber_absence | New `POST /internal/provider-absences` | `book_barber_absence` |

---

## What Changes Where

### `packages/api`

| What | File | Why |
|---|---|---|
| New endpoint `GET /appointments/by-phone` | `booking.routes.ts` | MCB-01 |
| New endpoint `GET /slots/next-available` | `booking.routes.ts` | MCB-04 |
| New method `findUpcomingByCustomerPhone` | `appointment.repository.ts` + `prisma-appointment.repository.ts` | MCB-01 |
| New endpoint `POST /internal/provider-absences` | New `internal.routes.ts` | MCB-05 |
| Register internal routes | `server.ts` | MCB-05 |
| New env var `INTERNAL_API_SECRET` | `config/env.ts` | MCB-05 |

### `packages/mcp`

| What | File | Why |
|---|---|---|
| New tool | `tools/get-my-appointments.ts` | MCB-01 |
| New tool | `tools/cancel-booking.ts` | MCB-02 |
| New tool | `tools/reschedule-booking.ts` | MCB-03 |
| New tool | `tools/get-next-available-date.ts` | MCB-04 |
| New tool | `tools/book-barber-absence.ts` | MCB-05 |
| Register all new tools | `server.ts` | All |
| New env var `INTERNAL_API_SECRET` | `config/env.ts` | MCB-05 |

### No changes to

- Prisma schema (all models already exist)
- Frontend / web app
- Existing MCP tools
- n8n workflow (new tools are auto-discovered via MCP protocol; barber workflow needs `barberId` variable added as a one-time config step)

---

## Success Criteria

- [ ] Customer can cancel their next appointment in a WhatsApp conversation with the AI
- [ ] Customer can reschedule their next appointment without needing the cancel link
- [ ] AI can answer "quando é a próxima vaga?" for any barber within 30 days
- [ ] Barber can register a full-day or partial-day absence via their WhatsApp channel
- [ ] All five new tools integrate with the existing MCP server and are discoverable by the n8n AI Agent node
- [ ] No existing tools or booking flows are broken
