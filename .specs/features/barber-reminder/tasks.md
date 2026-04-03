# Barber Reminder Tasks

**Spec**: `.specs/features/barber-reminder/spec.md`
**Status**: Approved

---

## Execution Plan

```
Phase 1 (Sequential — DB foundation):
  T1 → T2 → T3

Phase 2 (Parallel — domain + notification, after T3):
  T3 complete, then:
    ├── T4 [P]  (entity field)
    ├── T5 [P]  (repository interface)
    └── T6 [P]  (notification method)

Phase 3 (Sequential — infrastructure, after T4+T5):
  T4 + T5 complete → T7 (prisma repository impl)

Phase 4 (Sequential — integration, after T6+T7):
  T6 + T7 complete → T8 (reminder job)
```

---

## Task Breakdown

### T1: Add `barberReminderSent` field to Prisma schema

**What**: Add `barberReminderSent Boolean @default(false) @map("barber_reminder_sent")` to the `Appointment` model in `schema.prisma`
**Where**: `packages/api/prisma/schema.prisma`
**Depends on**: None
**Reuses**: Existing `reminderSent` field as reference (line 96)
**Requirement**: BREM-05

**Done when**:
- [ ] Field added to `Appointment` model with correct type, default, and column mapping
- [ ] `prisma validate` passes with no errors

**Verify**:
```bash
cd packages/api && npx prisma validate
```
Expected: no errors

**Commit**: `feat(db): add barber_reminder_sent field to appointments`

---

### T2: Generate Prisma migration

**What**: Create a new migration for the `barber_reminder_sent` column
**Where**: `packages/api/prisma/migrations/` (auto-generated)
**Depends on**: T1
**Reuses**: Existing migration pattern (see `20260402151114_make_customer_phone_optional/`)
**Requirement**: BREM-05

**Done when**:
- [ ] Migration file created in `prisma/migrations/`
- [ ] Migration SQL contains `ALTER TABLE "appointments" ADD COLUMN "barber_reminder_sent" BOOLEAN NOT NULL DEFAULT false`
- [ ] `prisma migrate dev` or `prisma migrate deploy` applies without errors

**Verify**:
```bash
cd packages/api && npx prisma migrate dev --name make_barber_reminder_sent
```
Expected: migration applied, Prisma client regenerated

**Commit**: (included in T1 commit or separate if migration file is separate)

---

### T3: Regenerate Prisma client

**What**: Run `prisma generate` so the updated `Appointment` type includes `barberReminderSent`
**Where**: Auto-generated `node_modules/@prisma/client`
**Depends on**: T2
**Reuses**: N/A

**Done when**:
- [ ] `npx prisma generate` runs without errors
- [ ] TypeScript can reference `appointment.barberReminderSent` without type error (verify via `tsc --noEmit`)

**Verify**:
```bash
cd packages/api && npx prisma generate && npx tsc --noEmit
```
Expected: no TypeScript errors

---

### T4: Add `barberReminderSent` to `AppointmentEntity` [P]

**What**: Add `barberReminderSent: boolean` field to the `AppointmentEntity` interface
**Where**: `packages/api/src/domain/entities/appointment.ts`
**Depends on**: T3
**Reuses**: Existing `reminderSent: boolean` field (line 17) as reference
**Requirement**: BREM-05

**Done when**:
- [ ] `barberReminderSent: boolean` added to `AppointmentEntity` interface
- [ ] `npx tsc --noEmit` passes with no errors

**Verify**:
```bash
cd packages/api && npx tsc --noEmit
```

**Commit**: `feat(domain): add barberReminderSent to AppointmentEntity`

---

### T5: Add `findUpcomingWithoutBarberReminder` and `markBarberReminderSent` to repository interface [P]

**What**: Extend `AppointmentRepository` interface with two new method signatures
**Where**: `packages/api/src/domain/repositories/appointment.repository.ts`
**Depends on**: T3
**Reuses**: `findUpcomingWithoutReminder(minutesAhead: number)` and `markReminderSent(id: string)` signatures (lines 27, 30) as reference
**Requirement**: BREM-01, BREM-02

**Done when**:
- [ ] `findUpcomingWithoutBarberReminder(minutesAhead: number): Promise<AppointmentWithDetails[]>` added to interface
- [ ] `markBarberReminderSent(id: string): Promise<void>` added to interface
- [ ] `npx tsc --noEmit` passes (interface contract enforced)

**Verify**:
```bash
cd packages/api && npx tsc --noEmit
```
Expected: TypeScript error on `PrismaAppointmentRepository` until T7 is done (interface not yet implemented — expected at this stage)

**Commit**: `feat(domain): add barber reminder methods to AppointmentRepository interface`

---

### T6: Add `sendBarberReminder` method to `WhatsAppNotificationService` [P]

**What**: Add a `sendBarberReminder(appointment: AppointmentWithDetails): Promise<void>` method that sends a WhatsApp reminder to the barber's phone
**Where**: `packages/api/src/infrastructure/notifications/whatsapp-notification.service.ts`
**Depends on**: T3
**Reuses**: `notifyBarber()` method (line 175) for phone check + `sendWithRetry` pattern; `sendReminder()` (line 152) for message structure
**Requirement**: BREM-01, BREM-03

**Message format**:
```
⏰ *Lembrete: você tem um cliente em breve!*

👤 Cliente: {customer.name}
✂️ Serviço: {service.name}
🕐 Horário: {startTime}
```

**Done when**:
- [ ] Method added after `sendReminder()`
- [ ] Returns early (no-op) when `appointment.barber.phone` is null/undefined — logs `[WhatsApp] Barber {firstName} has no phone configured, skipping reminder`
- [ ] Uses `sendWithRetry` with `appointment.barber.phone` and barber full name
- [ ] `npx tsc --noEmit` passes

**Verify**:
```bash
cd packages/api && npx tsc --noEmit
```

**Commit**: `feat(notifications): add sendBarberReminder to WhatsAppNotificationService`

---

### T7: Implement `findUpcomingWithoutBarberReminder` and `markBarberReminderSent` in `PrismaAppointmentRepository`

**What**: Implement both repository methods added in T5 into the Prisma repository
**Where**: `packages/api/src/infrastructure/database/repositories/prisma-appointment.repository.ts`
**Depends on**: T4, T5
**Reuses**: `findUpcomingWithoutReminder()` (lines 93–114) and `markReminderSent()` (lines 140–145) as direct reference — identical logic, different field
**Requirement**: BREM-01, BREM-02, BREM-04, BREM-05

**Done when**:
- [ ] `findUpcomingWithoutBarberReminder` queries `barberReminderSent: false` (mirrors `reminderSent: false` in existing method)
- [ ] `markBarberReminderSent` updates `barberReminderSent: true` for given appointment id
- [ ] TypeScript interface satisfied — `npx tsc --noEmit` passes with no errors

**Verify**:
```bash
cd packages/api && npx tsc --noEmit
```

**Commit**: `feat(infra): implement barber reminder repository methods`

---

### T8: Extend `reminder.job.ts` to send barber reminders

**What**: Add a second loop inside the cron callback that fetches appointments without barber reminders and sends them via `sendBarberReminder`
**Where**: `packages/api/src/infrastructure/jobs/reminder.job.ts`
**Depends on**: T6, T7
**Reuses**: Existing customer reminder loop (lines 12–21) as reference pattern
**Requirement**: BREM-01, BREM-02, BREM-03, BREM-04, BREM-06

**Logic**:
```
1. findUpcomingWithoutBarberReminder(60) → upcomingForBarbers
2. For each appointment:
   a. sendBarberReminder(appointment)
   b. markBarberReminderSent(appointment.id)  ← only if send succeeds OR barber has no phone
   c. On error: log, do NOT mark as sent (retry next tick)
```

**Note on BREM-06**: When `sendBarberReminder` returns early due to no phone, the job must still call `markBarberReminderSent` to suppress future attempts. The no-phone check returns without throwing, so the `markBarberReminderSent` call after `sendBarberReminder` will naturally handle this — no special branching needed.

**Done when**:
- [ ] Second loop added after existing customer reminder loop
- [ ] Each appointment is processed independently (failure of one doesn't stop others)
- [ ] `markBarberReminderSent` is called after successful `sendBarberReminder` (including no-phone case)
- [ ] Errors are caught per-appointment and logged with `[Reminder] Failed barber reminder for appointment {id}:`
- [ ] `npx tsc --noEmit` passes
- [ ] Manual trigger test: appointment ~55min from now receives barber WhatsApp message

**Verify**:
```bash
cd packages/api && npx tsc --noEmit
```
Manual: seed a near-future confirmed appointment with a barber phone, trigger cron, check logs + DB.

**Commit**: `feat(jobs): send barber reminders in reminder cron job`

---

## Parallel Execution Map

```
T1 ──→ T2 ──→ T3 ──┬── T4 [P] ──────────┬── T7 ──→ T8
                   ├── T5 [P] ──────────┘        ↑
                   └── T6 [P] ───────────────────┘
```

---

## Task Granularity Check

| Task | Scope | Status |
|---|---|---|
| T1: schema.prisma field | 1 field in 1 file | ✅ Granular |
| T2: migration | 1 migration | ✅ Granular |
| T3: prisma generate | 1 command | ✅ Granular |
| T4: entity field | 1 field in 1 file | ✅ Granular |
| T5: repository interface | 2 method signatures, 1 file | ✅ Granular (cohesive pair) |
| T6: notification method | 1 method in 1 file | ✅ Granular |
| T7: repository impl | 2 methods in 1 file | ✅ Granular (cohesive pair) |
| T8: job extension | 1 loop in 1 file | ✅ Granular |

## Requirement Coverage

| Requirement ID | Covered by |
|---|---|
| BREM-01 | T6, T7, T8 |
| BREM-02 | T7, T8 |
| BREM-03 | T6, T8 |
| BREM-04 | T8 |
| BREM-05 | T1, T2, T3, T4, T5 |
| BREM-06 | T8 |

**Coverage**: 6/6 requirements mapped ✅
