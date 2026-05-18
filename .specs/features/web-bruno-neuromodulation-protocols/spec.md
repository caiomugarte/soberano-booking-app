# Web Bruno Neuromodulation Protocols Specification

## Problem Statement

The current Bruno package flow assumes all neuromodulation sessions are known upfront and can be batch-created immediately. That does not match the real protocol workflow: Bruno sells a long neuromodulation program, books dates gradually over months, needs to track reserved and remaining sessions, and sometimes must keep or release a credit depending on late changes. Revenue also belongs to the protocol sale, not to each later booked session.

## Goals

- [ ] Bruno can open a neuromodulation protocol for a patient with a configurable session allowance
- [ ] Bruno can book neuromodulation sessions gradually instead of pre-creating all future dates
- [ ] Protocol-linked sessions can reserve, consume, or release a session credit as Bruno manages changes
- [ ] Bruno can move a patient from active protocol to maintenance or finished status
- [ ] Neuromodulation revenue is recorded from the protocol sale, not from each later appointment row

## Out of Scope

| Feature | Reason |
|---|---|
| Fully automatic 24-hour policy enforcement based on a timestamp rule | Bruno wants operational control over exceptions |
| Customer self-service protocol portal | Admin-only workflow for now |
| Installments, split payments, or receivable schedules for protocol sales | Single protocol sale is enough for this phase |
| Automated refunds or automatic credit returns | Credit outcome stays explicit and provider-managed |
| Psychotherapy pricing and cadence defaults | Split into `web-bruno-patient-care-model` |

---

## User Stories

### P1: Open and Maintain a Neuromodulation Protocol ⭐ MVP

**User Story**: As Bruno, I want to create and edit a neuromodulation protocol for a patient, so that I can track how many sessions belong to the protocol and how many are still available.

**Why P1**: Without a protocol record, the Bruno frontend cannot represent the commercial agreement or session allowance that drives the whole neuromodulation flow.

**Acceptance Criteria**:

1. WHEN a patient is in `careMode = neuromodulation` THEN the system SHALL allow Bruno to create a protocol linked to that patient
2. WHEN Bruno creates a protocol THEN the system SHALL capture at least `totalSessions`, protocol status, and the commercial value of the protocol sale
3. WHEN Bruno opens an existing protocol THEN the system SHALL show `totalSessions`, `reservedSessions`, `consumedSessions`, and `remainingSessions`
4. WHEN Bruno edits a protocol THEN the system SHALL allow adjusting the configured session allowance while keeping the already consumed session history intact
5. WHEN Bruno tries to create a protocol for a psychotherapy patient THEN the system SHALL block the action with validation feedback

**Independent Test**: Create a neuromodulation patient, open a protocol with 36 sessions, and confirm the protocol detail shows the total and remaining counters.

---

### P1: Book Neuromodulation Sessions Gradually Against the Protocol ⭐ MVP

**User Story**: As Bruno, I want to book only the neuromodulation dates I know right now, so that the rest of the protocol can stay available for later scheduling.

**Why P1**: This is the workflow gap that makes the current batch package flow impractical for Bruno.

**Acceptance Criteria**:

1. WHEN Bruno opens the appointment form for a neuromodulation patient with an active protocol THEN the system SHALL allow linking the new appointment to that protocol
2. WHEN Bruno books a protocol-linked neuromodulation session THEN the system SHALL reserve one session credit without requiring the rest of the dates to be created
3. WHEN Bruno changes or cancels a protocol-linked session early and chooses to keep the credit THEN the system SHALL release that reserved credit back to the protocol
4. WHEN Bruno completes a protocol-linked session, marks it as lost, or explicitly chooses to consume the credit on correction THEN the system SHALL keep that credit consumed
5. WHEN Bruno needs to override the default credit outcome for a protocol-linked session THEN the system SHALL allow an explicit provider choice before saving
6. WHEN a protocol-linked appointment changes credit outcome THEN the protocol counters SHALL refresh immediately in the Bruno UI

**Independent Test**: Open a 36-session protocol, book two future sessions, release one credit through an early change, and confirm the remaining counter returns correctly.

---

### P1: Move the Patient Into Maintenance or Finish the Protocol ⭐ MVP

**User Story**: As Bruno, I want to move a neuromodulation patient into maintenance or finished status, so that I can keep booking follow-up care without pretending the original protocol is still active.

**Why P1**: Bruno explicitly needs a maintenance period after the main protocol ends, and that state changes how he manages future sessions.

**Acceptance Criteria**:

1. WHEN Bruno decides the active protocol is complete THEN the system SHALL allow changing the protocol status to `maintenance` or `finished`
2. WHEN a protocol is in `maintenance` THEN the system SHALL allow Bruno to keep booking neuromodulation sessions for that patient without enforcing the original main-protocol session allowance
3. WHEN a protocol is marked `finished` THEN the system SHALL prevent new sessions from being linked to that finished protocol
4. WHEN Bruno reopens a patient in maintenance care later THEN the system SHALL preserve the completed protocol history separately from the new maintenance scheduling activity

**Independent Test**: Mark an active protocol as maintenance and confirm Bruno can still book a follow-up neuromodulation session without reopening the original 36-session allowance.

---

### P1: Protocol Revenue Belongs to the Sale, Not the Later Appointments ⭐ MVP

**User Story**: As Bruno, I want neuromodulation revenue to be recorded from the protocol sale, so that later operational appointments do not distort the financial view.

**Why P1**: The user explicitly confirmed this business rule, and it keeps neuromodulation aligned with how Bruno sells the treatment.

**Acceptance Criteria**:

1. WHEN Bruno creates a neuromodulation protocol THEN the system SHALL capture the commercial value and payment state of the protocol independently from later appointment rows
2. WHEN a protocol sale is marked as paid THEN the financial view SHALL attribute that revenue to the protocol payment date
3. WHEN Bruno books or edits protocol-linked neuromodulation appointments later THEN those operational appointments SHALL NOT create standalone session revenue entries for the same sale
4. WHEN the Bruno financial pendency view is shown THEN unpaid neuromodulation protocol sales SHALL appear as the receivable, not every future protocol-linked appointment

**Independent Test**: Create a paid neuromodulation protocol, then book several linked sessions and confirm the financial summary shows one protocol revenue entry instead of repeated per-session revenue.

---

## Edge Cases

- WHEN Bruno tries to reserve more sessions than the protocol currently allows THEN the system SHALL block the booking or require a protocol adjustment first
- WHEN a protocol-linked session is deleted after reserving a credit THEN the system SHALL require Bruno to choose whether that credit stays consumed or returns to the protocol
- WHEN a protocol is already `finished` THEN the Bruno UI SHALL prevent linking new sessions to it
- WHEN a patient has no active protocol and is in neuromodulation mode THEN the scheduling flow SHALL still work, but it SHALL clearly indicate the session is not consuming protocol credit
- WHEN the same patient later starts a new protocol after a finished one THEN the system SHALL keep the old protocol history separate from the new active protocol

---

## Requirement Traceability

| Requirement ID | Story | Phase | Status |
|---|---|---|---|
| NMP-01 | P1: Create protocol for neuromodulation patients | Design | Pending |
| NMP-02 | P1: Capture total sessions and protocol sale value | Design | Pending |
| NMP-03 | P1: Show reserved, consumed, and remaining counters | Design | Pending |
| NMP-04 | P1: Allow protocol allowance adjustments without rewriting consumed history | Design | Pending |
| NMP-05 | P1: Block protocol creation for psychotherapy patients | Design | Pending |
| NMP-06 | P1: Link neuromodulation appointments to an active protocol | Design | Pending |
| NMP-07 | P1: Reserve one credit per linked booking without batch date creation | Design | Pending |
| NMP-08 | P1: Release a reserved credit when Bruno keeps it on early change/cancel | Design | Pending |
| NMP-09 | P1: Consume the credit on completed/lost/manual-consume outcomes | Design | Pending |
| NMP-10 | P1: Let Bruno override the default credit outcome | Design | Pending |
| NMP-11 | P1: Refresh protocol counters after credit mutations | Design | Pending |
| NMP-12 | P1: Move protocol to maintenance or finished | Design | Pending |
| NMP-13 | P1: Allow booking in maintenance without the original limit | Design | Pending |
| NMP-14 | P1: Block new links to finished protocols | Design | Pending |
| NMP-15 | P1: Keep completed protocol history separate from maintenance activity | Design | Pending |
| NMP-16 | P1: Record revenue at protocol sale level | Design | Pending |
| NMP-17 | P1: Attribute protocol revenue by protocol payment date | Design | Pending |
| NMP-18 | P1: Prevent linked appointments from duplicating sale revenue | Design | Pending |
| NMP-19 | P1: Show unpaid protocol sales as the neuromodulation receivable surface | Design | Pending |

---

## Success Criteria

- [ ] Bruno can open a long neuromodulation protocol without pre-booking all future dates
- [ ] Protocol counters accurately reflect reserved, consumed, and remaining sessions after schedule changes
- [ ] Maintenance follow-up can continue after the main protocol ends
- [ ] The financial view treats the protocol sale as the commercial revenue event
- [ ] Linked neuromodulation appointments stay operational and do not double-count protocol revenue
