# MCP Booking Management Tools — Tasks

## Dependency Map

```
T1 (GET /appointments/by-phone)
  └──► T3 (get_my_appointments tool)
         └──► T8 (register all tools)

T2 (POST /internal/provider-absences)
  └──► T7 (book_barber_absence tool)
         └──► T8

T6a (GET /slots/next-available)
  └──► T6b (get_next_available_date tool)
         └──► T8

T4, T5 (cancel_booking, reschedule_booking) have no API deps → can start immediately
T8 waits on T3, T4, T5, T6b, T7
```

**Parallel tracks**:
- T1, T2, T6a (all new API endpoints) are independent — build in parallel
- T4 and T5 (MCP tools over existing endpoints) can start immediately
- T3 waits on T1 · T6b waits on T6a · T7 waits on T2
- T8 is last

---

## T1 — New API endpoint: `GET /appointments/by-phone`

**Goal**: Let the AI look up a customer's next upcoming appointment by their WhatsApp phone number.

**Files to edit**:
- `packages/api/src/domain/repositories/appointment.repository.ts` — add `findUpcomingByCustomerPhone` to interface
- `packages/api/src/infrastructure/database/repositories/prisma-appointment.repository.ts` — implement it
- `packages/api/src/http/routes/booking.routes.ts` — add the route

**Repository method spec**:
```ts
findUpcomingByCustomerPhone(phone: string): Promise<AppointmentWithDetails | null>
// Query: customer.phone = phone, status = 'confirmed', date >= today (midnight)
// Order: date asc, startTime asc
// Limit: 1
// Include: provider (barber), service, customer (same includeRelations as other methods)
```

**Route spec**:
```ts
// GET /appointments/by-phone?phone=xxx
// No auth required
// Validate: phone must match /^\d{10,11}$/  → 400 if not
// Returns 200: { appointment: AppointmentWithDetails | null }
// Returns appointment.cancelToken (required by cancel/change tools)
```

**Verification**:
- `GET /appointments/by-phone?phone=67999887766` with a customer who has a future appointment → returns appointment with `cancelToken`
- Same call with no upcoming appointment → `{ appointment: null }`
- `GET /appointments/by-phone?phone=abc` → 400

**Requirement IDs**: MCB-01

---

## T2 — New API endpoint: `POST /internal/provider-absences`

**Goal**: Allow the MCP server to create barber absences without a JWT token.

**Files to create/edit**:
- `packages/api/src/http/routes/internal.routes.ts` — new file
- `packages/api/src/server.ts` — register the new route
- `packages/api/src/config/env.ts` — add `INTERNAL_API_SECRET` (use `z.string().min(16)`)

**Middleware**: inline check in route (not a shared middleware — this is the only internal route for now)

```ts
// POST /internal/provider-absences
// Header: X-Internal-Secret: {INTERNAL_API_SECRET}  → 401 if missing or wrong
// Body: { barberId: string (UUID), date: string (YYYY-MM-DD), startTime?: string (HH:mm), endTime?: string (HH:mm), reason?: string }
// Validates:
//   - barberId is valid UUID
//   - date is not in the past (>= today in America/Campo_Grande)
//   - startTime/endTime format if provided
// Calls: shiftRepo.createAbsence({ providerId: barberId, date, startTime, endTime, reason })
// Verifies barberId exists in tenant (providerRepo.findById) → 404 if not found
// Returns 201: { absenceId, date, startTime, endTime, reason }
```

**Env var**: `INTERNAL_API_SECRET` — add to `packages/api/src/config/env.ts` and to Coolify for the `api` service.

**Verification**:
- `POST /internal/provider-absences` with correct secret + valid barberId + future date → 201, absence in DB
- Same with wrong secret → 401
- Same with past date → 400
- Same with unknown barberId → 404

**Requirement IDs**: MCB-05

---

## T3 — MCP tool: `get_my_appointments`

**Goal**: Tool for the AI to look up a customer's next upcoming appointment.

**Files to create/edit**:
- `packages/mcp/src/tools/get-my-appointments.ts` — new file

**Tool spec**:
```ts
// Tool name: get_my_appointments
// Description: "Retrieves the customer's next upcoming appointment by phone number. Call this before cancel or reschedule actions."
// Input: { customerPhone: string } — raw WhatsApp phone (normalize same as create_booking)
// Calls: GET {API_BASE_URL}/appointments/by-phone?phone={normalized}
// On success: returns { appointment: { id, cancelToken, barberId, barberName, serviceName, date, startTime, endTime, priceCents } | null }
// On phone validation error (400): tool error "Telefone inválido."
// On API error: tool error with status code
```

**Reuse**: Apply the same `normalizePhone` function from `create-booking.ts` (move to a shared `utils/phone.ts` if it makes sense — or duplicate inline, spec doesn't mandate refactoring).

**Verification**:
- Call tool with a known customer phone → returns appointment object with `cancelToken`
- Call with no appointment → returns `{ appointment: null }`
- Call with malformed phone → tool returns error

**Requirement IDs**: MCB-01

---

## T4 — MCP tool: `cancel_booking`

**Goal**: Tool for the AI to cancel a customer's appointment after confirmation.

**Files to create**:
- `packages/mcp/src/tools/cancel-booking.ts`

**Tool spec**:
```ts
// Tool name: cancel_booking
// Description: "Cancels a confirmed appointment. Requires the cancel token from get_my_appointments. Always ask the customer to confirm before calling."
// Input:
//   cancelToken: string — from get_my_appointments result
//   phoneLastFour: string — last 4 digits of customer phone (regex /^\d{4}$/)
// Calls: PATCH {API_BASE_URL}/appointment/{cancelToken}/cancel
//   Body: { phoneLastFour }
// On success (200): returns { message: "Agendamento cancelado com sucesso." }
// On 404: tool error "Agendamento não encontrado."
// On 400 (phone mismatch or already cancelled): tool error with API message
// On other error: tool error with status code
```

**Verification**:
- Call with valid cancelToken + correct phoneLastFour → appointment status is `cancelled` in DB
- Call with wrong phoneLastFour → tool returns phone mismatch error

**Requirement IDs**: MCB-02

---

## T5 — MCP tool: `reschedule_booking`

**Goal**: Tool for the AI to reschedule a customer's appointment to a new date/time.

**Files to create**:
- `packages/mcp/src/tools/reschedule-booking.ts`

**Tool spec**:
```ts
// Tool name: reschedule_booking
// Description: "Reschedules an appointment to a new date and time. Requires the cancel token from get_my_appointments. Always confirm the new slot is available (get_available_slots) before calling."
// Input:
//   cancelToken: string
//   phoneLastFour: string — last 4 digits (/^\d{4}$/)
//   newDate: string — YYYY-MM-DD
//   newStartTime: string — HH:mm
// Calls: PATCH {API_BASE_URL}/appointment/{cancelToken}/change
//   Body: { phoneLastFour, date: newDate, startTime: newStartTime }
// On success (200): returns the updated appointment object
// On 409: tool error "Horário já ocupado. Tente outro horário."
// On 400 (past date, barber off, phone mismatch): tool error with API message
// On 404: tool error "Agendamento não encontrado."
// On other error: tool error with status code
```

**Verification**:
- Call with valid data → appointment has new date/time in DB, cancelToken is regenerated by API
- Call with occupied slot → tool returns slot-taken error
- Call with past date → tool returns validation error

**Requirement IDs**: MCB-03

---

## T6a — New API endpoint: `GET /slots/next-available`

**Goal**: Single HTTP call that finds the earliest date with available slots for a barber, scanning efficiently server-side.

**Files to edit**:
- `packages/api/src/http/routes/booking.routes.ts` — add route
- `packages/api/src/application/use-cases/booking/get-next-available-slot.ts` — new use case

**Route spec**:
```ts
// GET /slots/next-available?barberId=UUID&from=YYYY-MM-DD&maxDays=30
// No auth required
// Validate:
//   barberId: UUID → 400 if missing/invalid
//   from: YYYY-MM-DD (required) → 400 if missing/invalid
//   maxDays: integer 1–60 (optional, default 30) → clamp to range if out of bounds
// Returns 200: { date: "YYYY-MM-DD", slots: string[] }  ← first date with slots
//          or: { date: null, slots: [] }                ← nothing found in range
```

**Use case algorithm** (`GetNextAvailableSlot`):
```ts
// constructor: appointmentRepo, shiftRepo (same as GetAvailableSlots)
// execute(barberId, fromDate, maxDays):
//   1. Load all shifts for barberId (shiftRepo.findAllByProvider or findByProviderAndDay for each)
//      → build Set<number> of working dayOfWeek values
//   2. If workingDays is empty → return { date: null, slots: [] }
//   3. Iterate date from fromDate, up to maxDays candidates:
//      a. Skip if date.getDay() not in workingDays
//      b. Call existing GetAvailableSlots.execute(barberId, dateString)
//      c. If slots.length > 0 → return { date: YYYY-MM-DD, slots }
//   4. Return { date: null, slots: [] }
```

**Verification**:
- `GET /slots/next-available?barberId=...&from=2026-04-14&maxDays=30` with a barber who works Mon–Fri → returns a weekday date with slots
- Same with `maxDays=1` and next day fully booked → returns `{ date: null, slots: [] }`
- Missing `barberId` → 400

**Requirement IDs**: MCB-04

---

## T6b — MCP tool: `get_next_available_date`

**Goal**: Thin MCP tool that delegates to the new API endpoint.

**Files to create**:
- `packages/mcp/src/tools/get-next-available-date.ts`

**Tool spec**:
```ts
// Tool name: get_next_available_date
// Description: "Finds the earliest date with available slots for a barber (up to maxDaysAhead days). Use when a customer asks 'when is the next available slot?'"
// Input:
//   barberId: string (UUID)
//   fromDate?: string (YYYY-MM-DD) — default: today in America/Campo_Grande
//   maxDaysAhead?: number (integer 1–60) — default: 30
//
// Compute today if fromDate omitted:
//   new Intl.DateTimeFormat('pt-BR', { timeZone: 'America/Campo_Grande', ... }).format(new Date())
//
// Calls: GET {API_BASE_URL}/slots/next-available?barberId=...&from=...&maxDays=...
// On success: if date != null → return { date, slots }
//             if date == null → tool error "Nenhuma vaga encontrada nos próximos {maxDaysAhead} dias."
// On API error: tool error with status code
```

**Verification**:
- Call tool with valid barberId → single HTTP call to API, returns date + slots
- Call tool with no fromDate → uses today in Campo Grande timezone

**Requirement IDs**: MCB-04

---

## T7 — MCP tool: `book_barber_absence`

**Goal**: Let the AI register a barber absence on behalf of the barber.

**Files to create/edit**:
- `packages/mcp/src/tools/book-barber-absence.ts` — new file
- `packages/mcp/src/config/env.ts` — add `INTERNAL_API_SECRET`

**Env update**:
```ts
// Add to packages/mcp/src/config/env.ts:
internalApiSecret: z.string().min(16),
// From env: INTERNAL_API_SECRET
```

**Tool spec**:
```ts
// Tool name: book_barber_absence
// Description: "Registers a barber absence (day off). Use when the barber says they won't be working on a specific date. barberId is known from the workflow context — never ask the barber for it."
// Input:
//   barberId: string (UUID)
//   date: string (YYYY-MM-DD)
//   startTime?: string (HH:mm) — omit for full-day absence
//   endTime?: string (HH:mm) — omit for full-day absence
//   reason?: string (max 200 chars)
// Calls: POST {API_BASE_URL}/internal/provider-absences
//   Header: X-Internal-Secret: {env.internalApiSecret}
//   Body: { barberId, date, startTime, endTime, reason }
// On success (201): returns { absenceId, date, startTime, endTime, reason }
// On 401: tool error "Configuração inválida. Contate o suporte."
// On 404: tool error "Barbeiro não encontrado."
// On 400 (past date): tool error with API message
// On other error: tool error with status code
```

**Verification**:
- Call with valid barberId + future date → 201, absence appears in DB
- Call with past date → tool returns validation error
- Absence appears in `GET /admin/schedule/absences` for that barber

**Requirement IDs**: MCB-05

---

## T8 — Register all new tools in `server.ts`

**Goal**: Wire all five new tools into the MCP server.

**Files to edit**:
- `packages/mcp/src/server.ts` — import and register all five tools

```ts
import { registerGetMyAppointments } from './tools/get-my-appointments.js';
import { registerCancelBooking } from './tools/cancel-booking.js';
import { registerRescheduleBooking } from './tools/reschedule-booking.js';
import { registerGetNextAvailableDate } from './tools/get-next-available-date.js';
import { registerBookBarberAbsence } from './tools/book-barber-absence.js';

// In createMcpServer():
registerGetMyAppointments(server, env.apiBaseUrl);
registerCancelBooking(server, env.apiBaseUrl);
registerRescheduleBooking(server, env.apiBaseUrl);
registerGetNextAvailableDate(server, env.apiBaseUrl);
registerBookBarberAbsence(server, env.apiBaseUrl, env.internalApiSecret);
```

**Verification**:
- `npm run build` in `packages/mcp` compiles without errors
- MCP Inspector or curl shows all 9 tools listed

**Requirement IDs**: MCB-01–MCB-05

---

## Task Summary

| Task | What | Req IDs | Depends on |
|---|---|---|---|
| T1 | `GET /appointments/by-phone` API endpoint + repo method | MCB-01 | — |
| T2 | `POST /internal/provider-absences` API endpoint | MCB-05 | — |
| T3 | `get_my_appointments` MCP tool | MCB-01 | T1 |
| T4 | `cancel_booking` MCP tool | MCB-02 | — |
| T5 | `reschedule_booking` MCP tool | MCB-03 | — |
| T6a | `GET /slots/next-available` API endpoint + use case | MCB-04 | — |
| T6b | `get_next_available_date` MCP tool | MCB-04 | T6a |
| T7 | `book_barber_absence` MCP tool + env | MCB-05 | T2 |
| T8 | Register all tools in `server.ts` | All | T3–T7, T6b |

**Parallel tracks**: T1, T2, T6a (API work) can all be built simultaneously. T4 and T5 (MCP tools over existing endpoints) can also start immediately. T3 waits on T1. T6b waits on T6a. T7 waits on T2. T8 is last.

---

## Coolify Env Vars to Add

| Service | Var | Notes |
|---|---|---|
| `api` | `INTERNAL_API_SECRET` | Strong random string, ≥32 chars |
| `mcp` | `INTERNAL_API_SECRET` | Same value as above |
