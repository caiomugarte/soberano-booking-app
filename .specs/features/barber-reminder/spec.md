# Barber Appointment Reminder Specification

## Problem Statement

Barbers currently don't receive automated WhatsApp reminders before their appointments. The system already sends reminders to customers 1 hour ahead via a cron job, but barbers rely solely on their own memory or the admin dashboard to track upcoming appointments. A missed appointment by a barber (due to forgetfulness) has higher impact than a missed one by a customer.

## Goals

- [ ] Barbers receive a WhatsApp reminder 1 hour before each confirmed appointment
- [ ] Barber reminder tracking is independent from customer reminder tracking
- [ ] Reminder is skipped gracefully when a barber has no phone configured

## Out of Scope

| Feature | Reason |
|---|---|
| Configurable reminder timing per barber | Over-engineering; 1h is sufficient for now |
| Reminder for cancelled/completed appointments | Not meaningful |
| Admin UI to toggle barber reminders | Not needed at this stage |

---

## User Stories

### P1: Barber receives WhatsApp reminder 1 hour before appointment ⭐ MVP

**User Story**: As a barber, I want to receive a WhatsApp message 1 hour before my scheduled appointments so that I don't miss or forget them.

**Why P1**: Core value of the feature — everything else depends on this.

**Acceptance Criteria**:

1. WHEN a confirmed appointment is ~1 hour away AND the barber has a phone configured AND `barberReminderSent` is false THEN the system SHALL send a WhatsApp reminder to the barber's phone number
2. WHEN the reminder is sent successfully THEN system SHALL set `barberReminderSent = true` on the appointment
3. WHEN the barber has no phone configured THEN system SHALL skip the barber reminder and log a message (no error thrown)
4. WHEN the barber reminder send fails THEN system SHALL log the error and NOT mark `barberReminderSent = true` (so it retries on the next cron tick)

**Independent Test**: Seed an appointment ~55 minutes from now with a barber that has a phone; trigger the cron manually; verify the barber receives a WhatsApp message and `barberReminderSent` is true in the DB.

---

### P2: Barber reminder is independent of customer reminder

**User Story**: As the system, I want barber and customer reminder flags tracked separately so that one failing doesn't block the other.

**Why P2**: Prevents a scenario where `reminderSent = true` (customer was notified) but the barber was never notified, or vice versa.

**Acceptance Criteria**:

1. WHEN customer reminder is sent but barber reminder fails THEN system SHALL NOT set `barberReminderSent = true` and SHALL retry the barber reminder on the next cron tick
2. WHEN barber has no phone THEN `barberReminderSent` SHALL still be set to true to prevent repeated "no phone" log noise

**Independent Test**: Manually set `reminderSent = true` and `barberReminderSent = false` on a near-future appointment; trigger cron; verify only the barber message is sent.

---

## Edge Cases

- WHEN barber has no phone THEN system SHALL set `barberReminderSent = true` to suppress future attempts
- WHEN the cron job runs and finds appointments already past their start time THEN those appointments SHALL NOT receive reminders (covered by existing time window filter)
- WHEN both customer and barber need reminders for the same appointment THEN both SHALL be attempted independently in the same cron tick

---

## Requirement Traceability

| Requirement ID | Story | Phase | Status |
|---|---|---|---|
| BREM-01 | P1: Barber receives reminder | Implement | Pending |
| BREM-02 | P1: Mark barberReminderSent after send | Implement | Pending |
| BREM-03 | P1: Skip gracefully if no phone | Implement | Pending |
| BREM-04 | P1: Retry on failure | Implement | Pending |
| BREM-05 | P2: Independent tracking flags | Implement | Pending |
| BREM-06 | P2: Set barberReminderSent=true when no phone | Implement | Pending |

**Coverage:** 6 total, 0 mapped to tasks, 6 unmapped

---

## Implementation Plan

Follows the existing customer reminder pattern exactly. Changes required:

1. **`schema.prisma`** — add `barberReminderSent Boolean @default(false) @map("barber_reminder_sent")`
2. **New migration** — `make_barber_reminder_sent`
3. **`appointment.ts` entity** — add `barberReminderSent: boolean`
4. **`appointment.repository.ts`** — add `findUpcomingWithoutBarberReminder(minutesAhead)` and `markBarberReminderSent(id)` signatures
5. **`prisma-appointment.repository.ts`** — implement both methods (mirrors `findUpcomingWithoutReminder` / `markReminderSent`)
6. **`whatsapp-notification.service.ts`** — add `sendBarberReminder(appointment)` method
7. **`reminder.job.ts`** — extend cron to also query and send barber reminders

## Success Criteria

- [ ] Barber receives WhatsApp message ~1 hour before each confirmed appointment
- [ ] `barberReminderSent` flag prevents duplicate messages across cron ticks
- [ ] No changes to customer reminder behavior (fully additive)
- [ ] Barbers without a phone configured are handled silently
