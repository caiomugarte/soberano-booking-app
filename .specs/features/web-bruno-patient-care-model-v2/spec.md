# Web Bruno Patient Care Model V2 Specification

## Problem Statement

The original `web-bruno-patient-care-model` feature established patient birth date, address, psychotherapy agreement defaults, and the `psychotherapy` / `neuromodulation` taxonomy. That foundation is now partially implemented in code, but the real clinic workflow has already outgrown one of its core assumptions: the patient record is still modeled as one exclusive `careMode`, while Bruno needs the same patient to receive neuromodulation and still book psychotherapy when appropriate.

This mismatch is already embedded in runtime behavior:

- patient normalization clears psychotherapy data whenever the patient is saved as `neuromodulation`
- psychology session creation and editing reject session types that do not equal the patient's current `careMode`
- the Bruno appointment form auto-locks the chosen session type to the patient's current mode

At the same time, Bruno now needs the patient detail page to become a safer operational surface:

1. deleting a patient must never fall through to a generic internal-server failure
2. minors must be identified explicitly and Bruno must be able to mark the parents meeting workflow
3. session history needs filters
4. patient detail needs financial context

This V2 spec replaces the old "exactly one care mode" assumption with a patient-care profile that can support psychotherapy and neuromodulation together while preserving the valid pricing/defaulting behavior already introduced by the first iteration.

## Scope Decision

This change should use `tlc-spec-driven` in **complex scope**.

Why:

- the current exclusive-mode assumption is already implemented across `packages/api`, Prisma-backed patient state, and `packages/web-bruno`
- allowing one patient to book both psychotherapy and neuromodulation is a domain-model correction, not just a UI tweak
- the change touches patient CRUD, booking validation, protocol eligibility, deletion safety, patient history queries, and patient financial aggregation
- "minor + parents meeting" introduces new patient-profile state that is not present anywhere in the repo today
- the delete defect can likely be fixed quickly, but the rest of the scope should not be implemented against the old exclusive model

Recommendation:

- keep this feature in **Specify** now
- follow with a short **Design** document and then **Tasks**
- do not start broad implementation directly from the old `web-bruno-patient-care-model/tasks.md`, because those tasks assume the exclusive `careMode` baseline

## Goals

- [ ] The patient profile can represent psychotherapy and neuromodulation together on the same patient
- [ ] Psychotherapy agreement defaults remain patient-driven without forcing exclusivity
- [ ] Patient deletion failures surface precise blockers instead of generic internal-server errors
- [ ] Minors are identified from birth date and Bruno can track the parents-meeting workflow
- [ ] Patient session history supports operational filters
- [ ] Patient detail shows financial context without double-counting protocol-covered neuromodulation operations

## Out of Scope

| Feature | Reason |
|---|---|
| Full guardian/responsible-party CRM with separate contacts, signatures, or authorization uploads | Not requested yet |
| Automatic creation of a calendar event for the parents meeting | The request is to identify and mark the workflow first |
| Installments, split payments, or a full ledger redesign on the patient page | Separate financial scope |
| Rewriting historical appointment `priceCents` snapshots when the patient profile changes | Historical values must remain stable |
| Generalizing care into arbitrary future modalities beyond `psychotherapy` and `neuromodulation` | This V2 only needs to remove the current false exclusivity between these two tracks |
| Replacing the dedicated operations-hub appointment pages | History filtering stays local to patient detail for this scope |

## User Stories

### WBPCM2-01 — Replace Exclusive Care Mode with a Dual-Track Patient Profile

**User Story**: As Bruno, I want one patient record to support psychotherapy and neuromodulation together, so that I can keep one clinical profile even when the patient receives both kinds of care.

**Acceptance Criteria**:

1. WHEN Bruno creates or edits a patient THEN the system SHALL allow psychotherapy data and neuromodulation eligibility to coexist on the same patient record
2. WHEN a patient has psychotherapy agreement data saved THEN the system SHALL keep using that agreement for psychotherapy defaulting even if the patient also receives neuromodulation
3. WHEN a patient is eligible for neuromodulation THEN Bruno SHALL still be able to create or edit neuromodulation protocols for that same patient
4. WHEN a patient has both psychotherapy agreement data and neuromodulation eligibility THEN Bruno SHALL be able to schedule either `psychotherapy` or `neuromodulation` sessions for that patient
5. WHEN a patient has no psychotherapy agreement saved THEN psychotherapy scheduling SHALL still require an explicit session value before save
6. WHEN Bruno changes the patient's care profile later THEN existing appointments and protocol history SHALL keep their stored historical values unchanged
7. WHEN Bruno opens the patient detail surface THEN the care-profile summary SHALL show whether psychotherapy, neuromodulation, or both are active for that patient

**Independent Test**: Save one patient with both psychotherapy agreement data and neuromodulation eligibility, then confirm Bruno can create one psychotherapy session and one neuromodulation session for the same patient.

---

### WBPCM2-02 — Preserve Psychotherapy Defaults Without Blocking Neuromodulation

**User Story**: As Bruno, I want psychotherapy price and cadence defaults to stay correct without preventing neuromodulation scheduling on the same patient.

**Acceptance Criteria**:

1. WHEN Bruno opens the appointment form for a patient who has psychotherapy agreement data THEN psychotherapy SHALL still default from the patient's agreed session price and frequency
2. WHEN Bruno chooses `psychotherapy` for a dual-track patient THEN the recurrence UI SHALL still prefill weekly or biweekly cadence from the patient agreement
3. WHEN Bruno chooses `neuromodulation` for that same patient THEN psychotherapy defaults SHALL NOT overwrite the neuromodulation session value or protocol-link behavior
4. WHEN Bruno edits an existing psychotherapy session without changing its explicit stored value THEN the session SHALL keep its historical `priceCents` snapshot
5. WHEN a patient's psychotherapy agreement changes later THEN only future psychotherapy defaults SHALL use the new agreement

**Independent Test**: Change the psychotherapy agreement of a dual-track patient after one psychotherapy session already exists, then confirm only newly created psychotherapy sessions pick up the new default.

---

### WBPCM2-03 — Delete Patient Safely and Actionably

**User Story**: As Bruno, I want patient deletion to tell me exactly what is blocking the action, so that I do not hit a generic internal error and can clean up the right records first.

**Acceptance Criteria**:

1. WHEN Bruno attempts to delete a patient with linked records THEN the API SHALL return a conflict response with a human-readable blocker summary instead of an unhandled 500
2. WHEN the blocker is known ahead of deletion THEN the message SHALL identify the blocking categories separately for at least documents, sessions, recurring series, and neuromodulation protocols
3. WHEN a foreign-key blocker is discovered only at delete time THEN the API SHALL translate that failure into the same user-facing conflict shape instead of leaking an internal error
4. WHEN deletion is blocked THEN the patient detail page SHALL keep Bruno on the current page and show the blocker message inline
5. WHEN Bruno removes the blocking records and retries THEN the patient deletion SHALL succeed without requiring database intervention

**Independent Test**: Try deleting a patient with one linked session and one linked protocol, confirm the delete is blocked with a precise message, then remove those dependencies and confirm the delete succeeds.

---

### WBPCM2-04 — Identify Minors and Track the Parents-Meeting Workflow

**User Story**: As Bruno, I want the system to identify underage patients and let me mark the parents-meeting workflow, so that this obligation stays visible in the patient record.

**Acceptance Criteria**:

1. WHEN a patient has `birthDate` that makes them under 18 on the current Sao Paulo local date THEN the system SHALL classify that patient as a minor
2. WHEN a patient is classified as a minor THEN the patient form and detail page SHALL show an explicit minor indicator
3. WHEN a patient is a minor THEN Bruno SHALL be able to mark the parents-meeting workflow as at least `pending` or `completed`
4. WHEN Bruno marks the parents-meeting workflow as completed THEN the patient detail surface SHALL preserve that status visibly on later visits
5. WHEN `birthDate` is missing THEN the system SHALL not guess minor status
6. WHEN a patient is no longer a minor because time passes THEN the minor indicator SHALL stop appearing without erasing the previously recorded parents-meeting history

**Independent Test**: Save a patient younger than 18, confirm the minor indicator appears, mark the parents meeting as completed, reload the detail page, and confirm both the age classification and saved workflow state behave correctly.

---

### WBPCM2-05 — Filter the Patient Session History

**User Story**: As Bruno, I want filters in the patient session history, so that I can quickly isolate the clinical or financial slice I need without scanning the entire timeline.

**Acceptance Criteria**:

1. WHEN Bruno opens patient history THEN the UI SHALL allow filtering by at least date range, session type, session status, and payment status
2. WHEN one or more filters are active THEN only matching history rows SHALL remain visible
3. WHEN filters return no results THEN the history area SHALL show an explicit empty state instead of a blank list
4. WHEN Bruno clears the filters THEN the full patient history SHALL be shown again
5. WHEN Bruno uses delete, recurring-stop, report, or payment actions from a filtered view THEN those actions SHALL continue to work on the selected row without losing filter state unexpectedly

**Independent Test**: Create mixed psychotherapy and neuromodulation history for one patient, apply type and payment filters together, and confirm only the matching rows remain visible.

---

### WBPCM2-06 — Add Financial Context to Patient Detail

**User Story**: As Bruno, I want financial information in the patient detail page, so that I can understand what was received and what is still pending without leaving the patient context.

**Acceptance Criteria**:

1. WHEN Bruno opens a patient detail page THEN the system SHALL show a financial summary for that patient
2. WHEN the patient has psychotherapy sessions THEN the summary SHALL include at least paid totals, pending totals, and counts for session receivables tied to that patient
3. WHEN the patient has neuromodulation protocol sales THEN the detail surface SHALL also show the protocol-sale financial state for that patient
4. WHEN a neuromodulation operational session is commercially covered by a protocol sale THEN the patient financial summary SHALL NOT double-count that operational row as additional revenue
5. WHEN Bruno updates payment state from the patient-history surface THEN the financial summary SHALL refresh to reflect the new values

**Independent Test**: Mark one psychotherapy session as paid, leave another pending, add one neuromodulation protocol sale, and confirm the patient detail summary reflects the three commercial states without duplication.

## Edge Cases

- WHEN a dual-track patient has psychotherapy agreement data but Bruno schedules a neuromodulation session without protocol linkage THEN the session SHALL still be allowed and SHALL NOT inherit psychotherapy value automatically
- WHEN Bruno edits an existing neuromodulation patient that already has psychotherapy agreement data from V2 migration/backfill THEN the patient save flow SHALL preserve both tracks instead of clearing one side
- WHEN a patient delete blocker message includes multiple categories THEN the UI SHALL keep the wording actionable instead of collapsing everything into "documentos"
- WHEN a minor patient has no parents-meeting status recorded yet THEN the detail page SHALL show that the workflow is still pending rather than silently omitting the section
- WHEN patient history is filtered to an empty result after a destructive action such as session deletion THEN the empty state SHALL render correctly without a stale row remaining on screen
- WHEN a patient has paid protocol sales and unpaid operational sessions at the same time THEN the financial summary SHALL keep protocol-sale totals distinct from standalone session receivables

## Implementation Notes

### Current blockers already in code

- `packages/api/src/application/use-cases/patient/patient-profile.utils.ts` currently normalizes into one exclusive `careMode` and clears psychotherapy fields when the mode is `neuromodulation`
- `packages/api/src/application/use-cases/booking/psychology-session.utils.ts` currently rejects any session whose `type` does not exactly match the patient's `careMode`
- `packages/api/src/application/use-cases/booking/create-psychology-session.ts` and `update-psychology-session.ts` both call that session-to-care-mode assertion
- `packages/api/src/application/use-cases/booking/neuromodulation-protocol.utils.ts` currently treats `careMode === neuromodulation` as the protocol eligibility rule
- `packages/web-bruno/src/schemas/patient.schema.ts`, `components/patients/PatientForm.tsx`, and `components/appointments/AppointmentForm.tsx` all model the patient as one exclusive mode
- `packages/web-bruno/src/pages/PatientDetailPage.tsx` currently hides the protocols panel unless `patient.careMode === 'neuromodulation'`

### Likely API and data-model touchpoints

- `packages/api/prisma/schema.prisma`
- `packages/api/src/domain/entities/customer.ts`
- `packages/api/src/domain/repositories/customer.repository.ts`
- `packages/api/src/infrastructure/database/repositories/prisma-customer.repository.ts`
- `packages/api/src/application/use-cases/patient/`
- `packages/api/src/application/use-cases/booking/`
- `packages/api/src/http/routes/psychology.routes.ts`

### Likely `web-bruno` touchpoints

- `packages/web-bruno/src/schemas/patient.schema.ts`
- `packages/web-bruno/src/api/patients.ts`
- `packages/web-bruno/src/api/appointments.ts`
- `packages/web-bruno/src/components/patients/PatientForm.tsx`
- `packages/web-bruno/src/components/patients/PatientHistory.tsx`
- `packages/web-bruno/src/components/appointments/AppointmentForm.tsx`
- `packages/web-bruno/src/pages/PatientDetailPage.tsx`
- `packages/web-bruno/src/api/financial.ts`

## Open Questions

1. Is the parents-meeting workflow only a status marker (`pending` / `completed`), or does Bruno also want a dedicated meeting date field in this same scope?
2. On patient detail, is the expected financial info a compact summary first, or does Bruno need a patient-level ledger/list immediately?
3. For dual-track patients, should neuromodulation eligibility be represented as a simple boolean capability, or is there a stronger business concept that should replace `careMode` entirely?

Current recommendation:

- treat this V2 as the place to replace `careMode` with a dual-track patient-care profile, not as a one-off exception in the booking layer
- keep the parents-meeting workflow lightweight in this phase: status first, optional date only if Bruno confirms he needs it now
- start the patient financial area with a summary plus navigable recent items, not a full ledger redesign

## Requirement Traceability

| ID | Requirement | Status |
|---|---|---|
| WBPCM2-01 | Support psychotherapy and neuromodulation together on one patient | Pending |
| WBPCM2-02 | Keep psychotherapy defaults without enforcing exclusivity | Pending |
| WBPCM2-03 | Return actionable patient-delete blockers instead of internal errors | Pending |
| WBPCM2-04 | Identify minors and track parents-meeting workflow | Pending |
| WBPCM2-05 | Add patient-history filters | Pending |
| WBPCM2-06 | Add patient-detail financial context | Pending |

## Success Criteria

- [ ] Bruno can keep one patient record for psychotherapy, neuromodulation, or both
- [ ] Psychotherapy agreement defaults still work after the exclusive-mode rule is removed
- [ ] Patient deletion never fails with a generic internal-server error for known dependency cases
- [ ] Minor patients are visibly identified and the parents-meeting workflow can be tracked
- [ ] Bruno can filter patient history instead of scanning the full list manually
- [ ] Patient detail shows usable financial context without double-counting protocol-covered neuromodulation operations
