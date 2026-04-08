# WhatsApp Human Jitter — Specification

## Problem Statement

The reminder job (`reminder.job.ts`) processes all pending reminders in a tight `for` loop with zero delay between sends. When multiple reminders are due at the same cron tick, they fire in milliseconds — an inhuman pattern that WhatsApp's anti-bot detection targets.

The system uses Chatwoot with the Baileys (WhatsApp Web) channel, which is an unofficial client and subject to WhatsApp's ban policy. While volume is currently low, making the send pattern indistinguishable from a human operator reduces detection risk without any infrastructure changes.

## Goals

- [ ] Reminder sends are paced with human-like timing gaps between each message
- [ ] Timing variance follows a Gaussian distribution (clustered around a natural mean, with realistic variance)
- [ ] No change to notification content, cron schedule, or retry logic
- [ ] No new dependencies introduced

## Out of Scope

| Item | Reason |
|---|---|
| Jitter on booking confirmations | Triggered one-at-a-time by user action — already human-paced |
| Jitter on cancellation/change notices | Same — single event-driven sends |
| Migrating to official WhatsApp API | Separate decision, deferred |
| Varying message content | Different concern |

---

## User Stories

### P1: Reminder sends are spaced with Gaussian jitter — WHJ-01 ⭐ MVP

**User Story**: As the system, when sending multiple reminders in the same cron tick, I want a random human-like delay between each send so that the burst pattern is not detectable as automated.

**Acceptance Criteria**:

1. WHEN two or more customer reminders are due in the same cron tick THEN the system SHALL wait a Gaussian-distributed delay between each send
2. WHEN two or more barber reminders are due in the same cron tick THEN the system SHALL wait a Gaussian-distributed delay between each send
3. WHEN only one reminder is due THEN no delay is added (nothing to space)
4. WHEN the computed delay is below the minimum clamp THEN the system SHALL use the minimum instead
5. WHEN the computed delay is above the maximum clamp THEN the system SHALL use the maximum instead
6. WHEN a send fails and retries THEN the jitter delay SHALL apply after the retry resolves (not between retry attempts — that already has exponential backoff)

**Independent Test**: Add 4 appointments due for reminder at the same time. Run the cron tick manually. Verify the log timestamps between sends are spaced 3–20 seconds apart with variance (not uniform).

---

## Gaussian Parameters

| Parameter | Value | Reasoning |
|---|---|---|
| Mean | 8 000 ms | Feels like a human typing and tapping send |
| Std deviation | 3 000 ms | Natural variance — not all messages take the same time |
| Min clamp | 3 000 ms | Never suspiciously fast |
| Max clamp | 20 000 ms | Avoids stalling the job on outlier draws |

At current scale (3 barbers, low appointment count), the job processes at most ~6 reminders per tick. Total added delay: ~18–120 seconds per cron run — acceptable given the job runs every 15 minutes.

---

## Implementation Approach

### Gaussian RNG — Box-Muller Transform

JavaScript has no native Gaussian RNG. The Box-Muller transform produces a standard normal distribution from two uniform random samples with no external dependencies:

```ts
function gaussianDelay(meanMs: number, stdMs: number, minMs: number, maxMs: number): Promise<void> {
  const u1 = Math.random();
  const u2 = Math.random();
  const z = Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
  const ms = Math.round(Math.max(minMs, Math.min(maxMs, meanMs + z * stdMs)));
  return new Promise((r) => setTimeout(r, ms));
}
```

### Where Jitter Applies

```
reminder.job.ts
└── customer reminder loop
    ├── send reminder for appointment[0]   ← sendReminder + markReminderSent
    ├── [await gaussianDelay()]            ← inserted here
    ├── send reminder for appointment[1]
    ├── [await gaussianDelay()]
    └── ...

└── barber reminder loop
    ├── send barber reminder for appointment[0]
    ├── [await gaussianDelay()]            ← inserted here
    ├── send barber reminder for appointment[1]
    └── ...
```

Delay goes **after** a successful (or exhausted) send attempt and **before** the next one — not between retry attempts within the same send.

---

## What Changes

| File | Change |
|---|---|
| `packages/api/src/infrastructure/jobs/reminder.job.ts` | Add `gaussianDelay()` + `await` it between sends in both loops |

## What Does Not Change

| File | Reason |
|---|---|
| `chatwoot.client.ts` | No change — Chatwoot API calls are unaffected |
| `whatsapp-notification.service.ts` | No change — retry logic stays as-is |
| `create-appointment.ts` | Single send, event-driven |
| `cancel-appointment.ts` | Single send, event-driven |
| `change-appointment.ts` | Single send, event-driven |

---

## Requirement Traceability

| Requirement ID | Story | Status |
|---|---|---|
| WHJ-01 | Gaussian jitter between reminder sends | Specify |
