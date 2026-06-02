# web-bruno Patient Care Model V2 — Tasks

**Spec**: `.specs/features/web-bruno-patient-care-model-v2/spec.md`
**Status**: Draft
**Blocked by**: Open product decision on whether the parents-meeting workflow needs only status or also a dedicated meeting date in this phase.

---

## Execution Plan

Phase 1 — Persistence + migration foundation (sequential):
```
T1 → T2
```

Phase 2 — Application-layer model replacement (parallel after T2):
```
     ┌→ T3 [P] ─┐
T2 ──┤          ├→ T6 → T7 ─┬→ T8 [P] ─┐
     └→ T4 [P] ─┘           └→ T9 [P] ─┼→ T10
          └→ T5 [P] ────────┘          └─────
```

Full dependency graph:
```
T1 → T2
      ├→ T3 [P] ─┐
      ├→ T4 [P] ─┼→ T6 → T7 ─┬→ T8 [P] ─┐
      └→ T5 [P] ─┘           └→ T9 [P] ─┼→ T10
                                         └─────
```

---

## Task Breakdown

### T1 — Introduce the dual-track patient-care profile persistence model

**What**: Replace the exclusive patient `careMode` persistence contract with a patient-care profile that can preserve psychotherapy agreement data while also expressing neuromodulation eligibility, and add the stored state needed for the parents-meeting workflow.
**Where**:
- `packages/api/prisma/schema.prisma`
- `packages/api/src/domain/entities/customer.ts`
- `packages/api/src/domain/repositories/customer.repository.ts`
- `packages/api/src/infrastructure/database/repositories/prisma-customer.repository.ts`
**Depends on**: None
**Requirement**: WBPCM2-01, WBPCM2-02, WBPCM2-04

**Tools**:
- MCP: NONE
- Skill: `coding-guidelines`, `security-best-practices`

**Done when**:
- [ ] The patient persistence model can express psychotherapy agreement data and neuromodulation eligibility together on the same record
- [ ] The schema preserves `birthDate` as the source for minor detection
- [ ] The schema adds stored state for the parents-meeting workflow
- [ ] Historical appointment financial snapshot fields remain unchanged
- [ ] Repository contracts expose the new patient-care profile without leaking Prisma concerns into use cases
- [ ] `cd packages/api && npx prisma validate` exits 0

**Verify**:
```bash
cd packages/api && npx prisma validate
```

---

### T2 — Generate the migration and backfill current Bruno patients safely

**What**: Create the Prisma migration and the rollout/backfill logic that converts the current exclusive-mode patient rows into the dual-track model without losing psychotherapy agreement data or rewriting historical appointments.
**Where**:
- `packages/api/prisma/migrations/`
- rollout notes or a one-off helper scoped to this feature
**Depends on**: T1
**Requirement**: WBPCM2-01, WBPCM2-02, WBPCM2-03

**Tools**:
- MCP: NONE
- Skill: `tlc-spec-driven`, `coding-guidelines`

**Done when**:
- [ ] A migration exists for the dual-track patient-care profile fields
- [ ] Current psychotherapy agreement data is preserved during migration
- [ ] Current neuromodulation patients are backfilled into the new eligibility model without clearing psychotherapy agreement data that should survive V2
- [ ] The rollout note captures any patient rows that need manual review after backfill
- [ ] Historical appointment `priceCents` snapshots remain unchanged
- [ ] `cd packages/api && npx prisma generate` exits 0

**Verify**:
```bash
cd packages/api && npx prisma generate
```

---

### T3 [P] — Replace exclusive patient profile normalization in the application layer

**What**: Update patient create/update use cases so they manage the dual-track care profile, stop clearing psychotherapy agreement data just because neuromodulation is enabled, and persist the parents-meeting workflow state.
**Where**:
- `packages/api/src/application/use-cases/patient/`
- `packages/api/src/application/use-cases/patient/__tests__/`
**Depends on**: T2
**Requirement**: WBPCM2-01, WBPCM2-02, WBPCM2-04

**Tools**:
- MCP: NONE
- Skill: `coding-guidelines`, `security-best-practices`

**Done when**:
- [ ] Patient create/update use cases no longer enforce mutually exclusive psychotherapy vs neuromodulation state
- [ ] Psychotherapy agreement validation still applies when psychotherapy is active for the patient
- [ ] The patient save flow can persist the parents-meeting workflow state
- [ ] Underage classification is derived from `birthDate` using the Brazil/Sao Paulo business date, not from manual guessing
- [ ] Use-case tests cover psychotherapy-only, neuromodulation-only, dual-track, and underage workflow scenarios
- [ ] `cd packages/api && npm test -- --runInBand` passes for the new patient use-case coverage

**Verify**:
```bash
cd packages/api && npm test -- --runInBand
```

---

### T4 [P] — Replace exclusive booking and protocol eligibility rules

**What**: Update psychology session and neuromodulation protocol business rules so booking eligibility is driven by the new patient-care profile instead of exact equality with one exclusive `careMode`.
**Where**:
- `packages/api/src/application/use-cases/booking/`
- `packages/api/src/application/use-cases/booking/__tests__/`
**Depends on**: T2
**Requirement**: WBPCM2-01, WBPCM2-02

**Tools**:
- MCP: NONE
- Skill: `coding-guidelines`, `security-best-practices`

**Done when**:
- [ ] Patients with psychotherapy agreement data can book psychotherapy regardless of neuromodulation eligibility
- [ ] Patients eligible for neuromodulation can create/manage protocols without requiring an exclusive neuromodulation-only patient state
- [ ] Dual-track patients can schedule either `psychotherapy` or `neuromodulation` sessions
- [ ] Psychotherapy session defaulting still uses the patient agreement and preserves historical price snapshots on old rows
- [ ] Booking tests cover psychotherapy-only, neuromodulation-only, dual-track, and explicit-value fallback scenarios
- [ ] `cd packages/api && npm test -- --runInBand` passes for the new booking/protocol tests

**Verify**:
```bash
cd packages/api && npm test -- --runInBand
```

---

### T5 [P] — Add patient-history filter and patient-financial backend helpers

**What**: Add the backend query contract Bruno needs to filter patient session history and retrieve patient-level financial context without double-counting protocol-covered neuromodulation operations.
**Where**:
- `packages/api/src/domain/repositories/appointment.repository.ts`
- `packages/api/src/infrastructure/database/repositories/prisma-appointment.repository.ts`
- `packages/api/src/http/routes/admin.routes.ts` or `packages/api/src/http/routes/psychology.routes.ts`, depending on the chosen patient-detail contract
- targeted tests near the touched repository/use-case files
**Depends on**: T2
**Requirement**: WBPCM2-05, WBPCM2-06

**Tools**:
- MCP: NONE
- Skill: `coding-guidelines`, `security-best-practices`

**Done when**:
- [ ] Backend filters can narrow patient history by at least date range, session type, session status, and payment status
- [ ] The patient-level financial contract separates psychotherapy/session receivables from protocol-sale financial state
- [ ] Protocol-covered neuromodulation operational rows are not double-counted as extra revenue
- [ ] Query-level tests or repository verification cover filtered history and patient financial aggregation rules
- [ ] `cd packages/api && npx tsc --noEmit` exits 0

**Verify**:
```bash
cd packages/api && npx tsc --noEmit
```

---

### T6 — Wire psychology routes to the V2 patient-care contract

**What**: Update the Fastify route layer to validate the dual-track patient-care profile, expose underage and parents-meeting data to `web-bruno`, harden patient deletion blockers, and deliver the new filtered history and patient-financial payloads.
**Where**:
- `packages/api/src/http/routes/psychology.routes.ts`
- route-local mappers/helpers near the same file
**Depends on**: T3, T4, T5
**Requirement**: WBPCM2-01, WBPCM2-02, WBPCM2-03, WBPCM2-04, WBPCM2-05, WBPCM2-06

**Tools**:
- MCP: NONE
- Skill: `coding-guidelines`, `security-best-practices`

**Done when**:
- [ ] Patient create/update validation accepts the dual-track care-profile contract
- [ ] Patient list/detail payloads expose the fields needed for care-profile summary, minor detection, and parents-meeting status
- [ ] Patient deletion returns actionable blocker categories for documents, sessions, recurring series, and neuromodulation protocols
- [ ] Unexpected delete-time FK blockers are translated into a 409-style user-facing dependency response instead of surfacing as a generic internal error
- [ ] Patient history routes accept the new filter set Bruno needs
- [ ] Patient detail contract exposes patient-level financial summary data without double-counting protocol-covered neuromodulation operations
- [ ] `cd packages/api && npx tsc --noEmit` exits 0

**Verify**:
```bash
cd packages/api && npx tsc --noEmit
# Manual API smoke:
# - create dual-track patient
# - schedule psychotherapy and neuromodulation for the same patient
# - filter patient history by type/payment status
# - attempt patient delete with linked dependencies and confirm 409-style blocker details
```

---

### T7 — Align web-bruno schemas and hooks with the V2 patient-care contract

**What**: Update the frontend schemas and TanStack Query hooks so Bruno UI surfaces can consume the dual-track patient profile, filtered history, delete blockers, underage workflow, and patient-level financial summary.
**Where**:
- `packages/web-bruno/src/schemas/patient.schema.ts`
- `packages/web-bruno/src/schemas/appointment.schema.ts`
- `packages/web-bruno/src/api/patients.ts`
- `packages/web-bruno/src/api/appointments.ts`
- `packages/web-bruno/src/api/financial.ts`
**Depends on**: T6
**Requirement**: WBPCM2-01, WBPCM2-03, WBPCM2-04, WBPCM2-05, WBPCM2-06

**Tools**:
- MCP: NONE
- Skill: `coding-guidelines`, `react-best-practices`

**Done when**:
- [ ] Patient typing reflects the dual-track care-profile fields and parents-meeting workflow state
- [ ] Appointment/history hooks can send the new patient-history filters
- [ ] Delete-patient hook preserves the blocker message shape returned by the API
- [ ] Patient-detail financial typing can represent session receivables and protocol-sale financial state together
- [ ] Hook invalidation stays consistent after patient/profile/history/payment mutations
- [ ] `npm --prefix packages/web-bruno run build` exits 0

**Verify**:
```bash
npm --prefix packages/web-bruno run build
```

---

### T8 [P] — Update the patient register and detail surfaces for dual-track care and minor workflow

**What**: Extend the patient form and patient detail page so Bruno can manage the dual-track care profile, see minor status, mark the parents-meeting workflow, and view patient-level financial summary from the detail page.
**Where**:
- `packages/web-bruno/src/components/patients/PatientForm.tsx`
- `packages/web-bruno/src/pages/PatientDetailPage.tsx`
- `packages/web-bruno/src/components/protocols/PatientProtocolsPanel.tsx` only if visibility rules must change for dual-track patients
**Depends on**: T7
**Requirement**: WBPCM2-01, WBPCM2-03, WBPCM2-04, WBPCM2-06

**Tools**:
- MCP: NONE
- Skill: `coding-guidelines`, `react-best-practices`

**Done when**:
- [ ] The patient form can capture the V2 care profile without forcing psychotherapy and neuromodulation to be mutually exclusive
- [ ] Minor patients show a clear indicator in the patient form/detail surfaces
- [ ] Bruno can mark and later review the parents-meeting workflow status from the patient surfaces
- [ ] The patient detail page shows financial context for session receivables and protocol-sale state
- [ ] The protocols panel remains available for patients who are neuromodulation-eligible even when they also have psychotherapy data
- [ ] Delete blocker messages remain inline and actionable when patient exclusion is denied
- [ ] `npm --prefix packages/web-bruno run build` exits 0

**Verify**:
```bash
npm --prefix packages/web-bruno run build
```

---

### T9 [P] — Update appointment flow and patient history for dual-track behavior and filters

**What**: Update the appointment form and patient history UI so Bruno can schedule either session type for a dual-track patient, keep psychotherapy defaults scoped correctly, and filter patient history without breaking existing actions.
**Where**:
- `packages/web-bruno/src/components/appointments/AppointmentForm.tsx`
- `packages/web-bruno/src/components/patients/PatientHistory.tsx`
**Depends on**: T7
**Requirement**: WBPCM2-01, WBPCM2-02, WBPCM2-05

**Tools**:
- MCP: NONE
- Skill: `coding-guidelines`, `react-best-practices`

**Done when**:
- [ ] The appointment flow no longer auto-locks session type to one exclusive patient mode
- [ ] Psychotherapy defaults still prefill from the patient agreement only when Bruno is scheduling psychotherapy
- [ ] Dual-track patients can schedule neuromodulation sessions without inheriting psychotherapy values incorrectly
- [ ] Patient history exposes the new filters and preserves row actions such as delete, stop recurring, reports, and payment updates
- [ ] Empty-state behavior remains correct when filters remove every row
- [ ] `npm --prefix packages/web-bruno run build` exits 0

**Verify**:
```bash
npm --prefix packages/web-bruno run build
```

---

### T10 — Verify the full V2 rollout and capture follow-up notes

**What**: Validate the migration, API, and `web-bruno` behavior end to end so the dual-track patient model, minor workflow, delete safety, history filters, and patient financial detail all behave as specified.
**Where**:
- API verification
- `packages/web-bruno` verification
- feature rollout notes / summary
**Depends on**: T8, T9
**Requirement**: WBPCM2-01 through WBPCM2-06

**Tools**:
- MCP: NONE
- Skill: `tlc-spec-driven`, `coding-guidelines`, `react-best-practices`

**Done when**:
- [ ] `cd packages/api && npx tsc --noEmit` exits 0
- [ ] Targeted Vitest suites for patient and booking use cases exit 0
- [ ] `npm --prefix packages/web-bruno run build` exits 0
- [ ] Manual smoke confirms one patient can hold psychotherapy and neuromodulation together and book both session types
- [ ] Manual smoke confirms underage patients surface the parents-meeting workflow correctly
- [ ] Manual smoke confirms patient deletion shows actionable blockers instead of a generic internal-server error
- [ ] Manual smoke confirms patient history filters work and patient financial detail does not double-count protocol-covered neuromodulation operations
- [ ] Any deferred decision about parents-meeting date vs status-only is captured in the rollout summary if it remains unresolved

**Verify**:
```bash
cd packages/api && npx tsc --noEmit
cd packages/api && npm test -- --runInBand
npm --prefix packages/web-bruno run build
```

---

## Parallel Execution Map

```
Phase 1 (Sequential):
  T1 ──→ T2

Phase 2 (Parallel):
  T2 complete, then:
    ├── T3 [P]
    ├── T4 [P]
    └── T5 [P]

Phase 3:
  T3 + T4 + T5 ──→ T6 ──→ T7

Phase 4 (Parallel):
  T7 complete, then:
    ├── T8 [P]
    └── T9 [P]

Phase 5:
  T8 + T9 ──→ T10
```

---

## Task Granularity Check

| Task | Scope | Status |
|---|---|---|
| T1: Persistence model | Schema + domain/repository contract | ✅ Cohesive |
| T2: Migration/backfill | One migration/rollout slice | ✅ Cohesive |
| T3: Patient use cases | One application-layer patient slice | ✅ Cohesive |
| T4: Booking/protocol eligibility | One application-layer booking slice | ✅ Cohesive |
| T5: History + financial backend helpers | One data/query contract slice | ✅ Cohesive |
| T6: Route wiring + delete safety | One HTTP delivery slice | ✅ Cohesive |
| T7: Frontend schemas + hooks | One contract layer slice | ✅ Cohesive |
| T8: Patient register/detail UI | One patient-facing UI slice | ✅ Cohesive |
| T9: Appointment/history UI | One scheduling/history UI slice | ✅ Cohesive |
| T10: End-to-end verification | One rollout validation pass | ✅ Granular |
