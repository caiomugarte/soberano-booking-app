# Admin Manual Booking Specification

## Problem Statement

Barbers currently have no way to create appointments from the admin dashboard. All bookings come through the customer-facing flow. Barbers need to register walk-ins, phone requests, and bookings outside their normal shift hours directly from the dashboard.

## Goals

- [ ] Barber can create a booking for any customer from the admin dashboard, choosing date and time freely (including outside shift hours), with double-booking prevention

## Out of Scope

| Feature | Reason |
|---|---|
| Monthly plan booking | Deferred — grouped cancellation, special reminders, and plan tracking require a separate spec |
| Booking past dates | Barbers cannot register past appointments |
| Editing an existing appointment's time | Not requested |
| Slot picker UI | Barber uses free text time input; they know their schedule |

---

## User Stories

### P1: Manual Single Booking ⭐ MVP

**User Story**: As a barber, I want to create a booking for a customer directly from the admin dashboard so that I can register walk-ins and phone requests at any time, even outside my normal shift hours.

**Why P1**: Barbers have zero control over the schedule from the admin side today. This unblocks the core operational need.

**Acceptance Criteria**:

1. WHEN barber clicks "Novo Agendamento" button on the dashboard THEN system SHALL open a booking modal
2. WHEN the modal opens THEN system SHALL present fields: customer name, customer phone, service (dropdown), date (date picker), time (free text HH:mm)
3. WHEN barber submits THEN system SHALL allow any time input — including outside barber's shift hours
4. WHEN barber submits with a date in the past THEN system SHALL reject with a validation error
5. WHEN barber submits and the selected barber + date + startTime is already occupied by a confirmed appointment THEN system SHALL reject with "Horário já ocupado"
6. WHEN barber submits a valid booking THEN system SHALL create the appointment and immediately refresh the dashboard appointment list
7. WHEN booking is created THEN system SHALL send a WhatsApp confirmation to the customer (same as customer-facing flow)
8. WHEN customer phone already exists in the system THEN system SHALL upsert (reuse existing customer record)
9. WHEN barber fills phone of an existing customer THEN system SHALL auto-fill the customer name field

---

## Edge Cases

- WHEN two bookings are submitted simultaneously for the same slot THEN system SHALL rely on the DB unique constraint and show "Horário já ocupado" to the second request
- WHEN the time input is malformed (e.g., "25:99") THEN system SHALL show a validation error before submission
- WHEN the selected service has a duration that would overlap with an existing appointment THEN system SHALL [block — same double-booking rule applies to the end time window]
- WHEN barber submits with today's date but a past hour THEN system SHALL reject (past time = past date rule applies intraday)

---

## Requirement Traceability

| Requirement ID | Story | Phase | Status |
|---|---|---|---|
| AMB-01 | P1: "Novo Agendamento" button on dashboard | Design | Pending |
| AMB-02 | P1: Booking modal with name/phone/service/date/time fields | Design | Pending |
| AMB-03 | P1: No shift restriction — any time allowed | Design | Pending |
| AMB-04 | P1: No past dates | Design | Pending |
| AMB-05 | P1: Double-booking prevention (barber + date + time) | Design | Pending |
| AMB-06 | P1: Dashboard refresh after booking created | Design | Pending |
| AMB-07 | P1: WhatsApp confirmation sent to customer | Design | Pending |
| AMB-08 | P1: Customer upsert by phone | Design | Pending |
| AMB-09 | P1: Auto-fill name from existing customer by phone | Design | Pending |

**Coverage:** 9 total, 0 mapped to tasks, 9 unmapped ⚠️

---

## Success Criteria

- [ ] Barber can create a manual booking from the dashboard in under 30 seconds
- [ ] Zero double-bookings possible through the admin booking flow
- [ ] Customer receives WhatsApp confirmation identical to the customer-facing flow
