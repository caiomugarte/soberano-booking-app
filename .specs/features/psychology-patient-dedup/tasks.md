# Psychology Patient Dedupe — Tasks

**Spec**: `.specs/features/psychology-patient-dedup/spec.md`
**Status**: Draft

---

## Execution Plan

```
Phase 1 — Rollout foundation (sequential):
  T1 → T2 → T3

Phase 2 — Application changes (backend then frontend):
  T3 → T4 → T5

Phase 3 — Verification and rollout checks:
  T4+T5 → T6
```

Full dependency graph:
```
T1 → T2 → T3 → T4 → T5 → T6
             └────────────→ T6
```

---

## Task Breakdown

### T1 — Audit existing patient CPF data before adding uniqueness

**What**: Check the target database(s) for duplicate non-null patient CPFs per tenant so the CPF unique index can be added safely.
**Where**: Target environment database plus migration working notes
**Depends on**: None
**Requirement**: PPD-03, PPD-04

**Tools**:
- MCP: NONE
- Skill: `coding-guidelines`

**Done when**:
- [ ] A query or script identifies duplicate non-null customer CPFs grouped by `tenant_id`
- [ ] The team knows whether existing data must be cleaned before the migration runs
- [ ] The rollout note for duplicate CPF cleanup is captured alongside the implementation work

**Verify**:
- Run a tenant-scoped duplicate CPF query against the target database before applying the migration

---

### T2 — Add per-tenant CPF uniqueness to the Prisma schema

**What**: Extend the `Customer` Prisma model with a per-tenant unique constraint on `cpf`, preserving the existing optional field behavior.
**Where**: `packages/api/prisma/schema.prisma`
**Depends on**: T1
**Requirement**: PPD-01, PPD-03

**Tools**:
- MCP: NONE
- Skill: `coding-guidelines`

**Done when**:
- [ ] `Customer` keeps `cpf` nullable
- [ ] `Customer` has `@@unique([tenantId, cpf])` in addition to the existing phone uniqueness
- [ ] `npx prisma validate` exits 0

**Verify**: `cd packages/api && npx prisma validate`

---

### T3 — Generate the CPF uniqueness migration and regenerate Prisma client

**What**: Create the Prisma migration for the new CPF unique index and regenerate the typed Prisma client.
**Where**: `packages/api/prisma/migrations/`
**Depends on**: T2
**Requirement**: PPD-01, PPD-03

**Tools**:
- MCP: NONE
- Skill: `coding-guidelines`

**Done when**:
- [ ] `prisma migrate dev` creates a migration for the new CPF unique constraint
- [ ] `prisma generate` exits 0
- [ ] The migration is safe to apply after the T1 audit result

**Verify**: `cd packages/api && npx prisma migrate dev --name add-customer-cpf-unique && npx prisma generate`

---

### T4 — Normalize CPF and map duplicate conflicts in psychology patient routes

**What**: Update the psychology patient create/update routes so CPF is normalized before persistence and duplicate conflicts are returned as clear field-specific API errors for `telefone` and `CPF`.
**Where**: `packages/api/src/http/routes/psychology.routes.ts`
**Depends on**: T3
**Requirement**: PPD-01, PPD-02, PPD-03, PPD-04, PPD-06

**Tools**:
- MCP: NONE
- Skill: `coding-guidelines`, `security-best-practices`

**Done when**:
- [ ] Patient create normalizes CPF before calling the repository or Prisma
- [ ] Patient update normalizes CPF before calling the repository or Prisma
- [ ] Blank CPF on create is omitted instead of stored as an empty string
- [ ] Blank CPF on edit can clear the stored CPF via the existing nullable patch contract
- [ ] Duplicate `P2002` conflicts are mapped to `telefone` or `CPF` correctly
- [ ] Email remains optional and is not treated as a duplicate blocker in this route flow
- [ ] `npx tsc --noEmit` exits 0

**Verify**:
```bash
cd packages/api && npx tsc --noEmit
# Manual API checks:
# - create patient with formatted CPF → 201
# - create second patient with same digits/unformatted CPF → 409 CPF
# - update patient to duplicate phone → 409 telefone
```

---

### T5 — Surface duplicate patient conflicts in the web-bruno patient form

**What**: Update the psychology patient form flow so duplicate conflict responses are shown clearly in create/edit mode while preserving optional email behavior.
**Where**:
- `packages/web-bruno/src/components/patients/PatientForm.tsx`
- `packages/web-bruno/src/api/patients.ts` if hook typing or error plumbing needs adjustment
**Depends on**: T4
**Requirement**: PPD-05, PPD-06

**Tools**:
- MCP: NONE
- Skill: `coding-guidelines`, `react-best-practices`

**Done when**:
- [ ] Create mode keeps email optional and does not block saves on blank or repeated email
- [ ] Duplicate phone conflicts show a clear message in the modal
- [ ] Duplicate CPF conflicts show a clear message in the modal
- [ ] Edit mode keeps the modal open and preserves current field values after a duplicate rejection
- [ ] Any frontend CPF normalization stays consistent with the backend contract and does not change the optional-field behavior
- [ ] `npm --prefix packages/web-bruno run build` exits 0

**Verify**:
```bash
npm --prefix packages/web-bruno run build
# Manual UI checks:
# - create patient with duplicate phone → visible telefone error
# - create patient with duplicate CPF → visible CPF error
# - create patient without email → success
```

---

### T6 — End-to-end verification of the dedupe contract

**What**: Verify the full duplicate-prevention flow across migration, API, and `web-bruno`, including tenant scoping and optional-field behavior.
**Where**: API + web-bruno runtime verification
**Depends on**: T4, T5
**Requirement**: PPD-01, PPD-02, PPD-03, PPD-04, PPD-05, PPD-06

**Tools**:
- MCP: NONE
- Skill: `coding-guidelines`, `react-best-practices`

**Done when**:
- [ ] Duplicate `phone` is blocked within the same tenant
- [ ] Duplicate `cpf` is blocked within the same tenant even when formatted differently
- [ ] Patients with blank `phone` and blank `cpf` can still be created
- [ ] Shared email values do not block patient creation or editing by themselves
- [ ] The API and UI show field-specific duplicate errors for `telefone` and `CPF`
- [ ] `cd packages/api && npx tsc --noEmit` exits 0
- [ ] `npm --prefix packages/web-bruno run build` exits 0

**Verify**:
```bash
cd packages/api && npx tsc --noEmit
npm --prefix packages/web-bruno run build
# Manual smoke test in Bruno flow:
# - same tenant duplicate phone => blocked
# - same tenant duplicate CPF => blocked
# - same email only => allowed
```

---

## Parallel Execution Map

```
Phase 1 (Sequential):
  T1 ──→ T2 ──→ T3

Phase 2 (Sequential by contract):
  T3 ──→ T4 ──→ T5

Phase 3 (Verification):
  T4 + T5 ──→ T6
```

---

## Task Granularity Check

| Task | Scope | Status |
|---|---|---|
| T1: Audit existing duplicate CPFs | 1 rollout check | ✅ Granular |
| T2: Add CPF unique constraint to schema | 1 schema file | ✅ Granular |
| T3: Generate migration + client | 1 migration deliverable | ✅ Granular |
| T4: Normalize CPF + duplicate route handling | 1 route file | ✅ Granular |
| T5: Show duplicate errors in patient form | 1 UI flow | ✅ Granular |
| T6: Verify full dedupe contract | 1 verification pass | ✅ Granular |

