# web-bruno Patient Care Model — Tasks

**Spec**: `.specs/features/web-bruno-patient-care-model/spec.md`
**Status**: Draft

---

## Execution Plan

```
Phase 1 — Rollout + persistence foundation (sequential):
  T1 → T2 → T3

Phase 2 — API business rules (parallel after T3):
  T3 → T4 [P]
  T3 → T5 [P]

Phase 3 — API delivery + seed rollout:
  T4+T5 → T6
  T3 → T7 [P]

Phase 4 — web-bruno integration:
  T6 → T8 [P]
  T6 → T9 [P]
  T8 → T10

Phase 5 — Verification + rollout checks:
  T7+T8+T9+T10 → T11
```

Full dependency graph:
```
T1 → T2 → T3
           ├→ T4 [P] ─┐
           ├→ T5 [P] ─┼→ T6 ─┬→ T8 [P] ─→ T10 ─┐
           └→ T7 [P]  ┘      └→ T9 [P] ───────┼→ T11
                                               └──────
```

---

## Task Breakdown

### T1 — Audit Bruno legacy patient and service data before the model switch

**What**: Inspect the current Bruno tenant data to confirm the backfill rule for legacy patients and the normalization path from legacy psychology service slugs into the new scheduling taxonomy.
**Where**: Bruno target database(s) plus rollout notes alongside this feature
**Depends on**: None
**Requirement**: PCM-01, PCM-04, PCM-07, PCM-10, PCM-13

**Tools**:
- MCP: NONE
- Skill: `tlc-spec-driven`, `codenavi`

**Done when**:
- [ ] Existing Bruno service rows using `individual`, `couple`, or `family` are inventoried before migration
- [ ] Existing patient rows are reviewed so the team knows whether `careMode` can be backfilled automatically or needs manual follow-up
- [ ] Historical appointments tied to legacy psychology services are counted before normalization
- [ ] A rollout note records the chosen legacy backfill rule for patients and service taxonomy cleanup

**Verify**:
- Run tenant-scoped queries against the Bruno database before applying the migration

---

### T2 — Extend the Prisma patient model with care-mode profile fields

**What**: Add the patient profile fields needed for care mode, psychotherapy agreement data, birthday awareness, and address capture while preserving appointment price snapshots as the historical source of truth.
**Where**: `packages/api/prisma/schema.prisma`
**Depends on**: T1
**Requirement**: PCM-01, PCM-02, PCM-03, PCM-04, PCM-06, PCM-10

**Tools**:
- MCP: NONE
- Skill: `coding-guidelines`

**Done when**:
- [ ] `Customer` has a required care-mode field constrained to `psychotherapy` or `neuromodulation`
- [ ] `Customer` has nullable psychotherapy-only agreement fields for the agreed session price and frequency
- [ ] `Customer` has `birthDate` and `address` fields suitable for form validation and dashboard use
- [ ] The schema keeps psychotherapy-only fields optional at the DB level so neuromodulation patients can be stored cleanly
- [ ] `Appointment.priceCents` remains unchanged as the historical snapshot field
- [ ] `cd packages/api && npx prisma validate` exits 0

**Verify**: `cd packages/api && npx prisma validate`

---

### T3 — Generate the migration and normalize legacy Bruno records

**What**: Create the Prisma migration and include the data normalization/backfill needed so the Bruno tenant moves to the supported patient/service model without rewriting historical appointment values.
**Where**: `packages/api/prisma/migrations/`
**Depends on**: T2
**Requirement**: PCM-06, PCM-07, PCM-10, PCM-11

**Tools**:
- MCP: NONE
- Skill: `coding-guidelines`

**Done when**:
- [ ] `prisma migrate dev` creates a migration for the new customer profile fields
- [ ] The migration or its paired rollout step backfills legacy Bruno patients with a valid care mode using the T1 rule
- [ ] Legacy Bruno scheduling rows are normalized so the supported taxonomy consumed by the UI is `psychotherapy` and `neuromodulation`
- [ ] Historical appointments keep their existing `priceCents` values unchanged after normalization
- [ ] `prisma generate` exits 0

**Verify**: `cd packages/api && npx prisma migrate dev --name bruno-patient-care-model && npx prisma generate`

---

### T4 — Add patient-profile contracts and application use cases

**What**: Extend the patient entity/repository contract and add patient-focused application use cases that enforce care-mode validation and mode-switch behavior in the API application layer instead of route handlers.
**Where**:
- `packages/api/src/domain/entities/customer.ts`
- `packages/api/src/domain/repositories/customer.repository.ts`
- `packages/api/src/infrastructure/database/repositories/prisma-customer.repository.ts`
- `packages/api/src/application/use-cases/patient/`
- `packages/api/src/application/use-cases/patient/__tests__/`
**Depends on**: T3
**Requirement**: PCM-01, PCM-02, PCM-03, PCM-04, PCM-05, PCM-06

**Tools**:
- MCP: NONE
- Skill: `coding-guidelines`, `security-best-practices`

**Done when**:
- [ ] `CustomerEntity` and repository return the new care-mode profile fields
- [ ] Create/update patient use cases enforce exactly one care mode
- [ ] Psychotherapy patients require agreed session price and weekly/biweekly frequency
- [ ] Neuromodulation patients can be saved without psychotherapy-only commercial fields
- [ ] Changing care mode stops incompatible future defaults without mutating historical appointments
- [ ] Use-case tests cover create, edit, validation failures, and care-mode switches
- [ ] `cd packages/api && npm test -- --runInBand` passes for the new patient use-case tests

**Verify**:
```bash
cd packages/api && npm test -- --runInBand
```

---

### T5 — Add psychology scheduling defaulting rules in the booking layer

**What**: Implement the booking-side logic that resolves the supported scheduling taxonomy and defaults psychotherapy session value/cadence from the patient agreement instead of the service price.
**Where**:
- `packages/api/src/application/use-cases/booking/`
- `packages/api/src/application/use-cases/booking/__tests__/`
- `packages/api/src/domain/repositories/appointment.repository.ts`
- `packages/api/src/infrastructure/database/repositories/prisma-appointment.repository.ts` if helper methods are needed
**Depends on**: T3
**Requirement**: PCM-07, PCM-08, PCM-09, PCM-10, PCM-11, PCM-12

**Tools**:
- MCP: NONE
- Skill: `coding-guidelines`, `security-best-practices`

**Done when**:
- [ ] The supported scheduling taxonomy for Bruno is `psychotherapy` and `neuromodulation`
- [ ] Psychotherapy session creation/defaulting uses the patient's agreed session price when available
- [ ] Weekly and biweekly patient frequency values map into recurrence default metadata
- [ ] Neuromodulation flows do not auto-apply psychotherapy value or cadence defaults
- [ ] Tests cover patient-agreement changes affecting only future session defaults
- [ ] Tests cover the edge case where psychotherapy has no agreed price and the API requires an explicit value before saving
- [ ] `cd packages/api && npm test -- --runInBand` passes for the new booking use-case tests

**Verify**:
```bash
cd packages/api && npm test -- --runInBand
```

---

### T6 — Wire psychology and service routes to the new patient-care contract

**What**: Update the Fastify route layer to validate the new patient fields, expose them to `web-bruno`, and use the new booking/patient rules for session creation, editing, recurring series, and service taxonomy delivery.
**Where**:
- `packages/api/src/http/routes/psychology.routes.ts`
- `packages/api/src/http/routes/service.routes.ts`
- route-local mappers near the same files if extraction helps
**Depends on**: T4, T5
**Requirement**: PCM-01, PCM-02, PCM-03, PCM-04, PCM-05, PCM-06, PCM-07, PCM-08, PCM-09, PCM-10, PCM-11, PCM-12

**Tools**:
- MCP: NONE
- Skill: `coding-guidelines`, `security-best-practices`

**Done when**:
- [ ] Patient create/update validation covers `careMode`, `birthDate`, `address`, and psychotherapy-only agreement fields
- [ ] Patient list and detail payloads include the full care-model profile needed by `web-bruno`
- [ ] Session and recurring-series endpoints accept only `psychotherapy` or `neuromodulation` as Bruno scheduling types
- [ ] Psychotherapy session creation uses the patient agreement by default and requires an explicit value when the agreement is missing
- [ ] Neuromodulation session creation skips psychotherapy defaults cleanly
- [ ] Existing appointment rows keep their stored `priceCents` snapshots when patient agreement data later changes
- [ ] `GET /api/services` for Bruno surfaces only the supported scheduling rows the UI should offer
- [ ] `cd packages/api && npx tsc --noEmit` exits 0

**Verify**:
```bash
cd packages/api && npx tsc --noEmit
# Manual API smoke checks:
# - create psychotherapy patient with agreement fields -> 201
# - create neuromodulation patient without psychotherapy fields -> 201
# - create psychotherapy session after agreement change -> new default only affects future sessions
```

---

### T7 — Update Bruno seed data and any one-off rollout helper for the new taxonomy

**What**: Keep local/staging Bruno environments reproducible by updating the Bruno seed to the supported scheduling taxonomy and isolating any one-off normalization helper away from runtime application code.
**Where**:
- `packages/api/src/infrastructure/database/seed-bruno.ts`
- optional one-off helper under `packages/api/scripts/` if the rollout needs scripted cleanup
**Depends on**: T3
**Requirement**: PCM-07, PCM-11, PCM-12

**Tools**:
- MCP: NONE
- Skill: `coding-guidelines`

**Done when**:
- [ ] The Bruno seed creates or upserts only `psychotherapy` and `neuromodulation` service rows
- [ ] Seed data remains idempotent across repeated runs
- [ ] Any temporary rollout helper is isolated from runtime API code and clearly scoped to migration cleanup
- [ ] Local development can reproduce the new Bruno scheduling taxonomy without manual DB edits

**Verify**:
```bash
cd packages/api && npx tsx src/infrastructure/database/seed-bruno.ts
```

---

### T8 — Update the dedicated patient register and detail surfaces in `web-bruno`

**What**: Extend the web-bruno patient types, hooks, and patient-facing screens so Bruno can capture and review care mode, agreement data, birth date, and address in the normal patient register flow.
**Where**:
- `packages/web-bruno/src/schemas/patient.schema.ts`
- `packages/web-bruno/src/api/patients.ts`
- `packages/web-bruno/src/components/patients/PatientForm.tsx`
- `packages/web-bruno/src/pages/PatientDetailPage.tsx`
- `packages/web-bruno/src/pages/PatientsPage.tsx` if modal copy or entry points need adjustment
**Depends on**: T6
**Requirement**: PCM-01, PCM-02, PCM-03, PCM-04, PCM-05

**Tools**:
- MCP: NONE
- Skill: `coding-guidelines`, `react-best-practices`

**Done when**:
- [ ] Patient schema and hooks match the new API contract
- [ ] The patient form requires a care mode and conditionally requires psychotherapy agreement fields
- [ ] Neuromodulation patients can be created and edited without psychotherapy-only fields blocking the save
- [ ] The patient detail page shows care mode, birth date, address, and psychotherapy agreement details when applicable
- [ ] Legacy blank values surface cleanly while the record is being completed
- [ ] `npm --prefix packages/web-bruno run build` exits 0

**Verify**:
```bash
npm --prefix packages/web-bruno run build
```

---

### T9 — Update the appointment flow and taxonomy surfaces in `web-bruno`

**What**: Replace the legacy psychology labels in the scheduling flow and make the appointment UI default psychotherapy value/cadence from the selected patient profile instead of the old service-price behavior.
**Where**:
- `packages/web-bruno/src/schemas/appointment.schema.ts`
- `packages/web-bruno/src/api/appointments.ts`
- `packages/web-bruno/src/api/financial.ts`
- `packages/web-bruno/src/components/appointments/AppointmentForm.tsx`
- `packages/web-bruno/src/config/constants.ts`
- `packages/web-bruno/src/components/agenda/TimeSlot.tsx`
- `packages/web-bruno/src/components/agenda/SlotDetail.tsx`
- `packages/web-bruno/src/components/patients/PatientHistory.tsx`
**Depends on**: T6
**Requirement**: PCM-06, PCM-07, PCM-08, PCM-09, PCM-10, PCM-11, PCM-12

**Tools**:
- MCP: NONE
- Skill: `coding-guidelines`, `react-best-practices`

**Done when**:
- [ ] The frontend session-type enum and labels use `psychotherapy` and `neuromodulation`
- [ ] Selecting a psychotherapy patient prefills the session value from the patient's agreed price
- [ ] The recurrence UI prefills weekly or biweekly cadence from patient frequency but stays editable
- [ ] Patients without stored frequency do not get forced into recurrence
- [ ] Neuromodulation patients skip psychotherapy-specific defaults
- [ ] The inline "new patient" path inside the appointment flow no longer bypasses required care-model capture
- [ ] Agenda, patient history, and financial mapping no longer rely on `individual`, `couple`, or `family`
- [ ] `npm --prefix packages/web-bruno run build` exits 0

**Verify**:
```bash
npm --prefix packages/web-bruno run build
```

---

### T10 — Add the dashboard birthday reminder surface

**What**: Show a dismissible, non-blocking birthday reminder on the Bruno dashboard when today's local date matches one or more stored patient birth dates.
**Where**:
- `packages/web-bruno/src/pages/DashboardPage.tsx`
- optional reminder component under `packages/web-bruno/src/components/`
- `packages/web-bruno/src/api/patients.ts` only if a dedicated helper/query is needed
**Depends on**: T8
**Requirement**: PCM-13, PCM-14, PCM-15

**Tools**:
- MCP: NONE
- Skill: `coding-guidelines`, `react-best-practices`

**Done when**:
- [ ] The dashboard shows a reminder only when one or more patients have birthdays on today's local date
- [ ] The reminder lists all matching patients
- [ ] Dismissing the reminder affects only the current page visit and does not block other dashboard actions
- [ ] Patients without `birthDate` are ignored without errors
- [ ] `npm --prefix packages/web-bruno run build` exits 0

**Verify**:
```bash
npm --prefix packages/web-bruno run build
```

---

### T11 — Verify the full patient-care-model rollout

**What**: Validate the migration, API, and web-bruno flows end to end so the patient foundation, defaulting rules, historical value stability, and birthday reminder all behave as specified before execution is marked complete.
**Where**: API + web-bruno runtime verification and rollout notes
**Depends on**: T7, T8, T9, T10
**Requirement**: PCM-01, PCM-02, PCM-03, PCM-04, PCM-05, PCM-06, PCM-07, PCM-08, PCM-09, PCM-10, PCM-11, PCM-12, PCM-13, PCM-14, PCM-15

**Tools**:
- MCP: NONE
- Skill: `coding-guidelines`, `react-best-practices`

**Done when**:
- [ ] Bruno can create a psychotherapy patient with agreed price, frequency, birth date, and address
- [ ] Bruno can create a neuromodulation patient without psychotherapy-only pricing fields
- [ ] Changing a psychotherapy patient's agreement affects only future session defaults
- [ ] Existing historical appointments keep their stored `priceCents` snapshots after agreement changes
- [ ] The dashboard birthday reminder appears for today's birthdays and stays dismissible
- [ ] `cd packages/api && npx tsc --noEmit` exits 0
- [ ] `cd packages/api && npm test -- --runInBand` passes for the new use-case coverage
- [ ] `npm --prefix packages/web-bruno run build` exits 0
- [ ] Manual rollout notes capture any remaining staging-only cleanup for legacy Bruno data

**Verify**:
```bash
cd packages/api && npx tsc --noEmit
cd packages/api && npm test -- --runInBand
npm --prefix packages/web-bruno run build
# Manual smoke:
# - create psychotherapy patient and schedule a weekly session
# - change agreed price and create a second session
# - confirm first session keeps old value and second uses new default
# - set a patient birthday to today and confirm the dashboard reminder appears
```

---

## Parallel Execution Map

```
Phase 1 (Sequential):
  T1 ──→ T2 ──→ T3

Phase 2 (Parallel):
  T3 complete, then:
    ├── T4 [P]
    └── T5 [P]

Phase 3:
  T4 + T5 ──→ T6
  T3 ───────→ T7 [P]

Phase 4:
  T6 complete, then:
    ├── T8 [P] ──→ T10
    └── T9 [P]

Phase 5:
  T7 + T8 + T9 + T10 ──→ T11
```

---

## Task Granularity Check

| Task | Scope | Status |
|---|---|---|
| T1: Audit legacy Bruno data | 1 rollout discovery slice | ✅ Granular |
| T2: Extend Prisma patient model | 1 schema file | ✅ Granular |
| T3: Generate migration + normalization | 1 migration deliverable | ✅ Granular |
| T4: Patient-profile use cases | 1 API feature slice | ✅ Cohesive |
| T5: Scheduling defaulting use cases | 1 API booking slice | ✅ Cohesive |
| T6: Route/service wiring | 1 HTTP delivery slice | ✅ Cohesive |
| T7: Seed + rollout helper | 1 infrastructure slice | ✅ Granular |
| T8: Patient register/detail UI | 1 frontend patient slice | ✅ Cohesive |
| T9: Appointment taxonomy/default UI | 1 frontend scheduling slice | ✅ Cohesive |
| T10: Birthday reminder | 1 dashboard slice | ✅ Granular |
| T11: End-to-end verification | 1 verification pass | ✅ Granular |
