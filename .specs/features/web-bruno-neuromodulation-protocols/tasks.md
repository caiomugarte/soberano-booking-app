# web-bruno Neuromodulation Protocols Tasks

**Spec**: `.specs/features/web-bruno-neuromodulation-protocols/spec.md`
**Status**: Draft
**Blocked by**: `web-bruno-patient-care-model` must land `careMode`, patient profile fields, and the `psychotherapy | neuromodulation` scheduling taxonomy before protocol execution starts.

---

## Execution Plan

### Phase 1: Backend foundation (Sequential)

```
T1 → T2 → T3 → T4
```

### Phase 2: web-bruno contract layer (Sequential)

```
T4 → T5
```

### Phase 3: Bruno UI surfaces (Parallel OK)

```
T5 complete, then:
  ├── T6 [P]
  ├── T7 [P]
  └── T8 [P]
```

### Phase 4: Verification + handoff (Sequential)

```
T6 + T7 + T8 → T9
```

---

## Task Breakdown

### T1: Add neuromodulation protocol persistence and appointment credit linkage

**What**: Introduce a patient-scoped neuromodulation protocol model plus the appointment-level fields needed to link sessions to a protocol and persist the resolved credit outcome.
**Where**:
- `packages/api/prisma/schema.prisma`
- `packages/api/prisma/migrations/...`
- `packages/api/src/domain/entities/appointment.ts`
- `packages/api/src/domain/entities/neuromodulation-protocol.ts`
- `packages/api/src/domain/repositories/appointment.repository.ts`
- `packages/api/src/domain/repositories/neuromodulation-protocol.repository.ts`
- `packages/api/src/infrastructure/database/repositories/`
**Depends on**: None
**Reuses**: Existing `CustomerPackage` commercial fields and the appointment linkage pattern already used by `recurringSeriesId`
**Requirement**: NMP-01, NMP-02, NMP-06, NMP-07, NMP-09, NMP-12, NMP-14, NMP-16, NMP-17, NMP-18

**Done when**:
- [ ] Prisma has a neuromodulation protocol model linked to tenant, provider, and patient/customer
- [ ] The protocol model stores at least `totalSessions`, protocol status, total sale value, payment status, payment method, and payment date
- [ ] Appointment rows can optionally link to a protocol and persist the provider-resolved credit outcome needed for reserve, release, and consume flows
- [ ] Repository contracts expose the minimum read/write operations needed by the application layer without leaking Prisma into use cases
- [ ] A migration exists for the new schema
- [ ] `cd packages/api && npx tsc --noEmit` exits 0

---

### T2: Implement protocol management use cases and counter projection

**What**: Add clean-architecture use cases for creating, updating, viewing, and changing the status of neuromodulation protocols, including the counter projection Bruno needs in the UI.
**Where**:
- `packages/api/src/application/use-cases/booking/`
- `packages/api/src/infrastructure/database/repositories/`
- `packages/api/src/application/use-cases/booking/__tests__/`
**Depends on**: T1
**Reuses**: Existing recurring-series use-case structure, tenant-aware repository injection, and mocked-repository Vitest style
**Requirement**: NMP-01, NMP-02, NMP-03, NMP-04, NMP-05, NMP-12, NMP-13, NMP-14, NMP-15, NMP-16, NMP-17

**Done when**:
- [ ] Create and update use cases validate `careMode = neuromodulation` before opening or editing a protocol
- [ ] Psychotherapy patients are rejected with a domain/application validation error
- [ ] Protocol detail output returns `totalSessions`, `reservedSessions`, `consumedSessions`, and `remainingSessions`
- [ ] Allowance edits cannot reduce the protocol below already consumed credits
- [ ] Status transitions support `active`, `maintenance`, and `finished`
- [ ] Finished protocol history stays separate from later maintenance or later new active protocols for the same patient
- [ ] Targeted use-case tests cover create, edit, counter projection, psychotherapy rejection, and status transitions
- [ ] `cd packages/api && npm test -- --runInBand` passes for the new protocol use-case tests

---

### T3: Make psychology session mutations protocol-aware

**What**: Add application-layer booking/correction logic so protocol-linked neuromodulation sessions reserve, release, or consume credits correctly, with an explicit override when Bruno needs to break the default outcome.
**Where**:
- `packages/api/src/application/use-cases/booking/`
- `packages/api/src/domain/repositories/appointment.repository.ts`
- `packages/api/src/domain/repositories/neuromodulation-protocol.repository.ts`
- `packages/api/src/infrastructure/database/repositories/`
- `packages/api/src/application/use-cases/booking/__tests__/`
**Depends on**: T2
**Reuses**: Existing psychology slot-conflict validation and agenda-correction semantics already handled in the session edit flow
**Requirement**: NMP-06, NMP-07, NMP-08, NMP-09, NMP-10, NMP-11, NMP-13, NMP-14

**Done when**:
- [ ] Booking a protocol-linked neuromodulation session reserves one credit without requiring batch creation of future dates
- [ ] Early cancel or reschedule flows can release a reserved credit when Bruno explicitly chooses to keep it
- [ ] Completed, `no_show`, deleted-with-consume, and manual-consume corrections keep the credit consumed
- [ ] Finished protocols cannot receive new linked sessions
- [ ] Maintenance bookings are allowed without re-opening or consuming the original main-protocol allowance
- [ ] Trying to reserve beyond the available protocol allowance returns a clear validation error unless the protocol is adjusted first
- [ ] Targeted tests cover reserve, release, consume, override, overbooking, finished-protocol rejection, and maintenance behavior
- [ ] `cd packages/api && npm test -- --runInBand` passes for the new booking/protocol tests

---

### T4: Expose protocol routes and financial-contract changes

**What**: Add protocol CRUD/status endpoints, extend psychology session endpoints for protocol metadata and override input, and make the shared financial summary surface protocol sales without double-counting linked appointments.
**Where**:
- `packages/api/src/http/routes/psychology.routes.ts`
- `packages/api/src/http/routes/admin.routes.ts`
- route-local mappers or DTO helpers near those files
**Depends on**: T3
**Reuses**: Existing `mapToSession()` shape, auth/provider scope middleware, and `/admin/financial` summary route
**Requirement**: NMP-01, NMP-02, NMP-03, NMP-06, NMP-10, NMP-11, NMP-12, NMP-14, NMP-16, NMP-17, NMP-18, NMP-19

**Done when**:
- [ ] Protocol endpoints exist for create, detail/list-by-patient, edit, and status change
- [ ] Psychology session create and update endpoints accept `protocolId?` and the explicit credit-outcome override input needed by the spec
- [ ] Session responses include the protocol metadata the Bruno UI needs to show whether a session is linked, standalone, or maintenance-only
- [ ] Finished-protocol, psychotherapy-patient, and overbooking failures return clear 4xx responses
- [ ] `GET /api/admin/financial` can represent protocol-sale revenue and unpaid protocol receivables separately from operational appointment rows
- [ ] Protocol-linked appointments no longer create duplicate sale revenue in the shared financial payload
- [ ] `cd packages/api && npx tsc --noEmit` exits 0

---

### T5: Align web-bruno schemas and hooks with the protocol contract

**What**: Add the frontend contract layer for protocols and extend existing patient, appointment, and financial hooks/types so the UI can consume protocol counters, status, and revenue semantics.
**Where**:
- `packages/web-bruno/src/schemas/patient.schema.ts`
- `packages/web-bruno/src/schemas/appointment.schema.ts`
- `packages/web-bruno/src/schemas/protocol.schema.ts`
- `packages/web-bruno/src/api/patients.ts`
- `packages/web-bruno/src/api/appointments.ts`
- `packages/web-bruno/src/api/financial.ts`
- `packages/web-bruno/src/api/protocols.ts`
**Depends on**: T4
**Reuses**: Existing TanStack Query invalidation patterns from `appointments.ts`, `patients.ts`, and `financial.ts`
**Requirement**: NMP-01, NMP-03, NMP-06, NMP-10, NMP-11, NMP-12, NMP-14, NMP-16, NMP-17, NMP-18, NMP-19

**Done when**:
- [ ] Patient typing exposes the protocol-relevant patient fields introduced by the care-model foundation
- [ ] Appointment typing includes protocol-link and credit-outcome metadata
- [ ] A dedicated protocol schema/type exists for totals, counters, status, and payment state
- [ ] Query and mutation hooks exist for create, read-by-patient, update, and status transitions on protocols
- [ ] Financial summary typing can distinguish protocol-sale items from operational appointment items
- [ ] Protocol mutations invalidate the relevant patient, appointment, protocol, and financial caches
- [ ] `cd packages/web-bruno && npm run build` exits 0

---

### T6 [P]: Add the patient-level neuromodulation protocol management surface

**What**: Let Bruno create, edit, inspect, and transition neuromodulation protocols from the patient detail flow, with current counters and history visible in one place.
**Where**:
- `packages/web-bruno/src/pages/PatientDetailPage.tsx`
- `packages/web-bruno/src/components/protocols/`
- `packages/web-bruno/src/components/patients/PatientForm.tsx` only if the prerequisite care-model UI still needs protocol-aware affordances
**Depends on**: T5
**Reuses**: Existing `Panel`, `Modal`, and patient detail composition patterns
**Requirement**: NMP-01, NMP-02, NMP-03, NMP-04, NMP-05, NMP-12, NMP-15, NMP-16, NMP-17

**Done when**:
- [ ] Neuromodulation patients have a clear create/edit protocol entry point in the patient detail surface
- [ ] Psychotherapy patients do not expose the protocol action, or are blocked with clear validation feedback if the flow is forced
- [ ] The protocol detail UI shows total, reserved, consumed, and remaining counters
- [ ] Bruno can move a protocol to `maintenance` or `finished`
- [ ] Historical finished protocols remain visible separately from the current active or maintenance workflow
- [ ] The UI surfaces protocol sale value and payment state without pretending later appointments are the sale itself
- [ ] `cd packages/web-bruno && npm run build` exits 0

---

### T7 [P]: Make booking and correction flows protocol-aware in web-bruno

**What**: Update the scheduling flow so neuromodulation appointments can be linked to a protocol when appropriate, stay bookable without a protocol when necessary, and ask Bruno to resolve credit outcomes during corrections.
**Where**:
- `packages/web-bruno/src/components/appointments/AppointmentForm.tsx`
- `packages/web-bruno/src/components/agenda/SlotDetail.tsx`
- `packages/web-bruno/src/components/agenda/WeeklyGrid.tsx`
- `packages/web-bruno/src/pages/DashboardPage.tsx`
- `packages/web-bruno/src/components/patients/PatientHistory.tsx`
**Depends on**: T5
**Reuses**: Existing agenda modal lifecycle, payment dialog pattern, and recurring-series action handling
**Requirement**: NMP-06, NMP-07, NMP-08, NMP-09, NMP-10, NMP-11, NMP-13, NMP-14

**Done when**:
- [ ] When a neuromodulation patient has an active protocol, the appointment form can link the session to it
- [ ] When a neuromodulation patient has no active protocol, the UI still allows scheduling but clearly indicates no protocol credit is being consumed
- [ ] Maintenance bookings remain possible without reusing the finished main-protocol allowance
- [ ] Finished protocols cannot be selected in create or edit flows
- [ ] Edit, cancel, delete, and status-correction flows collect the explicit consume-vs-release choice whenever the business rule requires it
- [ ] Protocol counter data refreshes after create, edit, status, and delete mutations
- [ ] Session detail/history surfaces clearly indicate when an appointment is protocol-linked
- [ ] `cd packages/web-bruno && npm run build` exits 0

---

### T8 [P]: Update Bruno financial and pendency surfaces for protocol-sale revenue

**What**: Make the financial UI treat the protocol sale as the commercial revenue event and prevent linked operational sessions from showing up as duplicate receivables.
**Where**:
- `packages/web-bruno/src/pages/FinancialPage.tsx`
- `packages/web-bruno/src/components/financial/PendingPayments.tsx`
- `packages/web-bruno/src/components/financial/RevenueSummary.tsx`
- `packages/web-bruno/src/components/financial/RevenueChart.tsx`
**Depends on**: T5
**Reuses**: Existing `paidAt`-based revenue attribution and pending-payment presentation patterns
**Requirement**: NMP-16, NMP-17, NMP-18, NMP-19

**Done when**:
- [ ] Paid neuromodulation protocol sales contribute revenue by the protocol payment date
- [ ] Unpaid neuromodulation protocol sales appear as the receivable surface instead of every future linked session
- [ ] Protocol-linked appointments no longer duplicate sale revenue or pending totals in Bruno financial UI
- [ ] Existing psychotherapy and non-protocol session financial behavior remains intact
- [ ] The resulting financial payload is ready to be reused by the later `web-bruno-operations-hub` pendency-selection work
- [ ] `cd packages/web-bruno && npm run build` exits 0

---

### T9: Verify the end-to-end protocol lifecycle and capture rollout notes

**What**: Run the compile/test/manual checks that prove protocol opening, gradual scheduling, maintenance, and financial attribution all work together.
**Where**:
- API verification
- `packages/web-bruno` verification
- feature notes / PR summary
**Depends on**: T6, T7, T8
**Reuses**: The independent tests already defined in the spec plus the financial smoke-test pattern from `web-bruno-agenda-event-management`
**Requirement**: NMP-01 through NMP-19

**Done when**:
- [ ] `cd packages/api && npx tsc --noEmit` exits 0
- [ ] Targeted Vitest suites for protocol use cases exit 0
- [ ] `cd packages/web-bruno && npm run build` exits 0
- [ ] Manual smoke test confirms: create neuromodulation patient, open a 36-session protocol, book two sessions, release one credit, consume another, move the protocol to maintenance, and book a maintenance follow-up
- [ ] Manual financial check confirms: one paid protocol sale appears as revenue once, linked appointments do not duplicate it, and unpaid protocol sales appear as the pending receivable
- [ ] Any remaining dependency or follow-on work for `web-bruno-operations-hub` is recorded in the feature summary or PR notes

---

## Task Granularity Check

| Task | Scope | Status |
|---|---|---|
| T1: Persistence + linkage | Prisma + domain/repository contracts | ✅ Cohesive |
| T2: Protocol management use cases | 1 application-layer feature slice | ✅ Cohesive |
| T3: Protocol-aware session mutations | 1 business-rules slice for booking corrections | ✅ Cohesive |
| T4: HTTP + financial contract | 2 route surfaces sharing one external contract | ✅ Cohesive |
| T5: web-bruno contract layer | tightly related schema/hook files | ✅ Cohesive |
| T6: Patient protocol surface | patient detail + new protocol components | ✅ Cohesive |
| T7: Scheduling/correction UX | tightly coupled agenda and appointment files | ✅ Cohesive |
| T8: Financial/pendency UI | tightly related financial surfaces | ✅ Cohesive |
| T9: Verification | integration-focused release gate | ✅ Cohesive |

---

## Verification Notes

- Backend:
  - `cd packages/api && npx tsc --noEmit`
  - targeted `vitest` for protocol management and protocol-linked session use cases
- Frontend:
  - `cd packages/web-bruno && npm run build`
- Manual:
  - Create a neuromodulation patient with the care-model foundation fields
  - Open a protocol with 36 sessions and verify counters
  - Book linked sessions gradually and confirm reserve/release/consume behavior
  - Move the protocol to maintenance and book a follow-up without reopening the original allowance
  - Confirm financial revenue appears once at protocol-sale level and pending receivables do not duplicate linked operational sessions
