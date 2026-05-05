# Psychology Patient Dedupe Specification

## Problem Statement

The psychology patient flow in `packages/web-bruno` currently allows duplicate patient records unless they collide on the existing per-tenant phone uniqueness rule. `email` is optional, `cpf` is not unique, and the API conflict handling only returns friendly duplicate messages for `phone` and `email`. That creates two risks: the same patient can be registered multiple times under different or missing phones, and future duplicate blocking based on optional email would be too noisy and unreliable.

## Goals

- [ ] Psychology patient creation and editing block duplicate records by hard identifiers that are reliable in this flow
- [ ] `phone` remains a per-tenant hard unique identifier when provided
- [ ] `cpf` becomes a per-tenant hard unique identifier when provided
- [ ] `email` remains optional and non-blocking for duplicate detection
- [ ] CPF duplicate checks are format-insensitive by normalizing stored/submitted values before comparison
- [ ] Duplicate conflicts return clear API and UI messages for the conflicting field

## Out of Scope

| Feature | Reason |
|---------|--------|
| Duplicate detection by patient name alone | High false-positive risk; not a stable identifier |
| Blocking duplicates by email | Email is optional in this flow and not reliable enough to be a hard uniqueness key |
| Merging existing duplicate patient records | Separate data-cleanup workflow from duplicate prevention |
| Fuzzy duplicate suggestions in the UI | Useful later, but not required to enforce the hard rule |
| Backfilling or reformatting unrelated customer data outside psychology patients | Keep scope limited to the dedupe contract needed for this feature |

---

## User Stories

### P1: Block duplicate patients by phone and CPF ⭐ MVP

**User Story**: As Bruno managing psychology patients, I want patient registration to reject duplicates based on stable identifiers so that each real patient has one record per tenant.

**Why P1**: Duplicate patient records break history continuity, create ambiguous scheduling/reporting, and are harder to clean up after the fact than preventing them at save time.

**Acceptance Criteria**:

1. WHEN a psychology patient is created with a `phone` already used by another patient in the same tenant THEN the request SHALL be rejected with a conflict message for `telefone`
2. WHEN a psychology patient is created with a `cpf` already used by another patient in the same tenant THEN the request SHALL be rejected with a conflict message for `CPF`
3. WHEN a psychology patient is edited to use a `phone` already used by a different patient in the same tenant THEN the request SHALL be rejected with a conflict message for `telefone`
4. WHEN a psychology patient is edited to use a `cpf` already used by a different patient in the same tenant THEN the request SHALL be rejected with a conflict message for `CPF`
5. WHEN `phone` and `cpf` are both blank or omitted THEN patient creation SHALL still be allowed as long as all other validation passes
6. WHEN a patient is edited without changing its own `phone` or `cpf` THEN the update SHALL succeed and SHALL NOT self-conflict

**Independent Test**: Create two psychology patients in the same tenant, then verify duplicate create and duplicate update attempts fail for both `phone` and `cpf` while unique values succeed.

---

### P1: Normalize CPF before enforcing uniqueness ⭐ MVP

**User Story**: As Bruno, I want CPF duplicate detection to work regardless of punctuation so that the same document number cannot be saved twice in different formats.

**Why P1**: Without normalization, values like `123.456.789-00` and `12345678900` would bypass the dedupe rule and create false uniqueness.

**Acceptance Criteria**:

1. WHEN a psychology patient is created or updated with CPF punctuation THEN the system SHALL normalize the CPF before persisting or comparing it
2. WHEN two submissions contain the same CPF digits in different visual formats THEN the second save SHALL be rejected as a duplicate
3. WHEN a blank CPF is submitted on create THEN the stored value SHALL remain absent rather than a formatted empty string
4. WHEN a blank CPF is submitted on edit THEN the API SHALL support clearing an existing CPF if the request otherwise passes validation

**Independent Test**: Save one patient with formatted CPF and verify a second patient with the same digits in unformatted form is rejected.

---

### P1: Keep email optional and non-blocking

**User Story**: As Bruno, I want email to remain optional so that missing or shared email addresses do not prevent patient registration.

**Why P1**: Email is often unavailable or less trustworthy in this workflow, and making it a hard duplicate key would create unnecessary friction.

**Acceptance Criteria**:

1. WHEN a psychology patient is created without an email THEN the request SHALL still succeed if all other validation passes
2. WHEN two psychology patients share the same email and differ on hard identifiers THEN the duplicate rule SHALL NOT reject the save solely because of email
3. WHEN the frontend patient form submits a blank email THEN it SHALL continue to omit or clear the value according to the existing create/update contract

**Independent Test**: Create multiple patients with blank email, then create or edit patients sharing the same non-empty email and verify no email-only conflict is raised.

---

### P2: Surface clear duplicate feedback in API and UI

**User Story**: As Bruno, I want to know which field caused a duplicate rejection so that I can correct the patient record quickly.

**Acceptance Criteria**:

1. WHEN the API rejects a duplicate psychology patient request THEN the response SHALL identify whether the conflict was `telefone` or `CPF`
2. WHEN `packages/web-bruno` receives that duplicate conflict THEN the patient form SHALL show a clear error message instead of failing silently
3. WHEN duplicate validation fails during edit mode THEN the form SHALL stay open with the current values intact so Bruno can correct the conflicting field

**Independent Test**: Trigger duplicate conflicts from the `web-bruno` patient form in both create and edit mode and verify a readable field-specific message is shown.

---

## Edge Cases

- WHEN an existing tenant already has duplicate non-null CPFs before the migration runs THEN the rollout SHALL fail explicitly or require a cleanup step before adding the unique index
- WHEN CPF is submitted with spaces, dots, or dashes THEN normalization SHALL remove formatting before uniqueness is evaluated
- WHEN CPF is omitted or cleared for multiple patients THEN multiple null CPFs SHALL still be allowed
- WHEN phone is omitted for multiple patients THEN multiple null phones SHALL still be allowed under the existing uniqueness model
- WHEN duplicate checks run across tenants THEN the rule SHALL remain tenant-scoped and SHALL NOT block another tenant from using the same phone or CPF
- WHEN the duplicate conflict originates from database uniqueness rather than pre-check logic THEN the API SHALL still map it to a friendly field-specific response

---

## Requirement Traceability

| Requirement ID | Story | Phase | Status |
|--------------|-------|------|--------|
| PPD-01 | P1: Block duplicate patients by phone and CPF | Specify | Pending |
| PPD-02 | P1: Block duplicate patients by phone and CPF | Specify | Pending |
| PPD-03 | P1: Normalize CPF before enforcing uniqueness | Specify | Pending |
| PPD-04 | P1: Normalize CPF before enforcing uniqueness | Specify | Pending |
| PPD-05 | P1: Keep email optional and non-blocking | Specify | Pending |
| PPD-06 | P2: Surface clear duplicate feedback in API and UI | Specify | Pending |

---

## Success Criteria

- [ ] The psychology patient data model enforces per-tenant uniqueness for non-null `phone` and non-null normalized `cpf`
- [ ] Duplicate create/update attempts return clear, field-specific conflict responses for `telefone` and `CPF`
- [ ] `packages/web-bruno` preserves optional email behavior while surfacing duplicate failures clearly
- [ ] The rollout path accounts for any existing duplicate CPF data before the unique constraint is added

## Implementation Notes

### Expected backend scope
- `packages/api/prisma/schema.prisma`: add a per-tenant unique constraint for `cpf`
- Prisma migration: add the unique index safely after checking existing tenant data
- `packages/api/src/http/routes/psychology.routes.ts`: normalize CPF in create/update validation flow and map duplicate conflicts for `cpf`
- `packages/api/src/infrastructure/database/repositories/prisma-customer.repository.ts`: keep repository create/update behavior compatible with normalized optional fields

### Expected frontend scope
- `packages/web-bruno/src/components/patients/PatientForm.tsx`: preserve optional email behavior and surface duplicate conflict messages in the modal
- `packages/web-bruno/src/api/patients.ts`: preserve the current create/update payload contract while exposing duplicate API errors cleanly to the form

### Data rollout note
- Before applying the migration in any environment, query for duplicate non-null CPFs per tenant and resolve them manually or through a dedicated cleanup script; otherwise the unique index creation can fail.
