# web-bruno Neuromodulation Protocols — Remaining Lifecycle Tasks

**Spec**: `.specs/features/web-bruno-neuromodulation-protocols/spec.md`
**Status**: Draft

## Current Baseline

The current branch already contains the main neuromodulation protocol foundation:

- protocol persistence, counters, and revenue-sale separation in `packages/api`
- protocol CRUD/status routes plus delete guardrails in `packages/api/src/http/routes/psychology.routes.ts`
- TanStack hooks in `packages/web-bruno/src/api/protocols.ts`
- patient protocol management in `packages/web-bruno/src/components/protocols/PatientProtocolsPanel.tsx`
- protocol-aware booking/correction flows in `AppointmentForm`, `SlotDetail`, and `PatientHistory`
- financial protocol-sale rendering in `packages/web-bruno/src/pages/FinancialPage.tsx`

These tasks only cover the remaining lifecycle alignment introduced by the updated spec, especially automatic finishing and the clarified finished-history cleanup semantics.

Baseline requirement coverage:

- `NMP-01` through `NMP-19` are already represented in the current branch foundation listed above
- this task plan focuses new execution on `NMP-20` through `NMP-23`
- `T5` regression-verifies the adjacent pre-existing flows most likely to break while landing the lifecycle delta

---

## Execution Plan

### Phase 1 — Backend lifecycle alignment (Sequential)

```
T1 → T2
```

### Phase 2 — web-bruno lifecycle alignment (Parallel OK)

```
T2 complete, then:
  ├── T3 [P]
  └── T4 [P]
```

### Phase 3 — Verification + handoff (Sequential)

```
T3 + T4 → T5
```

---

## Parallel Execution Map

```
Phase 1:
  T1  booking lifecycle rules — auto-finish active protocols when the sold allowance becomes consumed
   ↓
  T2  protocol management guardrails — keep finished-history and delete behavior coherent after auto-finish

Phase 2:
  T2 done, then in parallel:
    ├── T3 [P]  hooks + PatientProtocolsPanel — refresh current vs finished protocol views after lifecycle mutations
    └── T4 [P]  AppointmentForm + history/correction UX — stop offering auto-finished protocols and preserve credit-resolution flows

Phase 3:
  T3 + T4 done → T5  verification + feature handoff
```

---

## Task Breakdown

### T1 — Add automatic protocol finishing to booking lifecycle mutations

**What**: Update the protocol-aware booking/correction use cases so an active neuromodulation protocol is automatically marked `finished` when consumed credits reach its sold allowance, without treating only-reserved sessions as completion.
**Where**:
- `packages/api/src/application/use-cases/booking/create-psychology-session.ts`
- `packages/api/src/application/use-cases/booking/update-psychology-session.ts`
- `packages/api/src/application/use-cases/booking/delete-psychology-session.ts`
- `packages/api/src/application/use-cases/booking/psychology-session.utils.ts`
- `packages/api/src/application/use-cases/booking/__tests__/psychology-session-protocol.use-cases.test.ts`
**Depends on**: None
**Reuses**: Existing `resolveProtocolOutcome()` and `getUsageSnapshot()` patterns plus the current `manualConsumedCount` ledger for delete/unlink flows
**Requirement**: NMP-09, NMP-11, NMP-14, NMP-20

**Tools**:
- MCP: NONE
- Skill: `coding-guidelines`, `security-best-practices`

**Done when**:
- [ ] Completing or `no_show`-consuming the final sold credit automatically transitions the linked active protocol to `finished`
- [ ] Delete/unlink flows that explicitly consume the last remaining credit can also auto-finish the protocol
- [ ] Reserved sessions alone do not auto-finish a protocol before the final credit becomes consumed
- [ ] Maintenance-linked sessions keep their existing behavior and do not participate in sold-allowance exhaustion
- [ ] Newly auto-finished protocols stop accepting new linked sessions through the existing finished-protocol guardrails
- [ ] Targeted tests cover completed, `no_show`, delete-with-consume, and reserved-only edge cases
- [ ] `cd packages/api && npm test -- --runInBand packages/api/src/application/use-cases/booking/__tests__/psychology-session-protocol.use-cases.test.ts` exits 0

**Verify**:
```bash
cd packages/api && npm test -- --runInBand packages/api/src/application/use-cases/booking/__tests__/psychology-session-protocol.use-cases.test.ts
```

---

### T2 — Keep protocol management and finished-history guardrails coherent after auto-finish

**What**: Align the protocol-management use cases and tests so auto-finished protocols stay in finished history until explicitly deleted, while the existing delete guardrails remain the only allowed cleanup path.
**Where**:
- `packages/api/src/application/use-cases/booking/change-neuromodulation-protocol-status.ts`
- `packages/api/src/application/use-cases/booking/delete-neuromodulation-protocol.ts`
- `packages/api/src/application/use-cases/booking/list-patient-neuromodulation-protocols.ts`
- `packages/api/src/application/use-cases/booking/__tests__/neuromodulation-protocol.use-cases.test.ts`
- `packages/api/src/application/use-cases/booking/__tests__/delete-neuromodulation-protocol.test.ts`
**Depends on**: T1
**Reuses**: Existing `assertAllowedStatusTransition()` and `countLinkedAppointments()` guards
**Requirement**: NMP-12, NMP-15, NMP-22, NMP-23

**Tools**:
- MCP: NONE
- Skill: `coding-guidelines`, `security-best-practices`

**Done when**:
- [ ] Auto-finished protocols remain visible through the finished-history listing until Bruno explicitly deletes them
- [ ] Finished protocols cannot be reopened through contradictory status transitions
- [ ] Deletion still succeeds only for finished protocols without linked appointments
- [ ] Deletion failures for active, maintenance, or linked protocols return stable validation messages that match the clarified product rules
- [ ] Targeted tests cover auto-finished-history visibility, reopen rejection, eligible delete, and blocked delete scenarios
- [ ] `cd packages/api && npm test -- --runInBand packages/api/src/application/use-cases/booking/__tests__/neuromodulation-protocol.use-cases.test.ts packages/api/src/application/use-cases/booking/__tests__/delete-neuromodulation-protocol.test.ts` exits 0

**Verify**:
```bash
cd packages/api && npm test -- --runInBand \
  packages/api/src/application/use-cases/booking/__tests__/neuromodulation-protocol.use-cases.test.ts \
  packages/api/src/application/use-cases/booking/__tests__/delete-neuromodulation-protocol.test.ts
```

---

### T3 [P] — Refresh the patient protocol panel and hook layer for lifecycle-driven moves

**What**: Ensure the Bruno hook layer and `PatientProtocolsPanel` react correctly when a protocol moves from current to finished because of booking mutations, while preserving the clarified finished-history delete semantics already exposed in the UI.
**Where**:
- `packages/web-bruno/src/api/appointments.ts`
- `packages/web-bruno/src/api/protocols.ts`
- `packages/web-bruno/src/components/protocols/PatientProtocolsPanel.tsx`
- `packages/web-bruno/src/schemas/protocol.schema.ts` only if lifecycle typing or copy needs adjustment
**Depends on**: T2
**Reuses**: Existing query invalidation patterns for `appointments`, `protocols`, and `patients`
**Requirement**: NMP-03, NMP-11, NMP-21, NMP-22, NMP-23

**Tools**:
- MCP: NONE
- Skill: `coding-guidelines`, `react-best-practices`

**Done when**:
- [ ] Session mutations that trigger auto-finish cause the protocol panel to refresh without manual page reload
- [ ] Auto-finished protocols leave the current-protocol block and appear in finished history after refetch
- [ ] The delete CTA remains limited to finished-history items
- [ ] Blocked delete attempts still surface the backend validation message inline in the confirmation flow
- [ ] Panel copy stays consistent with the clarified lifecycle semantics for finished history vs current protocols
- [ ] `npm --prefix packages/web-bruno run build` exits 0

**Verify**:
```bash
npm --prefix packages/web-bruno run build
```

---

### T4 [P] — Align booking and correction UX with auto-finished protocol lifecycle

**What**: Make sure protocol selection and session correction surfaces stop offering newly auto-finished protocols for future links while preserving the explicit consume-vs-release workflow Bruno already uses for linked-session corrections and deletions.
**Where**:
- `packages/web-bruno/src/components/appointments/AppointmentForm.tsx`
- `packages/web-bruno/src/components/agenda/SlotDetail.tsx`
- `packages/web-bruno/src/components/patients/PatientHistory.tsx`
**Depends on**: T2
**Reuses**: Existing protocol selector filtering and `ProtocolCreditActionDialog` behavior
**Requirement**: NMP-08, NMP-10, NMP-13, NMP-14, NMP-21

**Tools**:
- MCP: NONE
- Skill: `coding-guidelines`, `react-best-practices`

**Done when**:
- [ ] A protocol that auto-finishes after the last consumed credit no longer appears as selectable in subsequent create/edit flows after the normal refetch cycle
- [ ] Finished protocols remain blocked from new links in both create and correction flows
- [ ] Consume-vs-release prompts remain intact for linked delete/cancel/correction paths
- [ ] Maintenance and standalone neuromodulation messaging stays clear after the lifecycle update
- [ ] No UI path silently re-links a session back to an auto-finished protocol
- [ ] `npm --prefix packages/web-bruno run build` exits 0

**Verify**:
```bash
npm --prefix packages/web-bruno run build
```

---

### T5 — Verify protocol lifecycle regression and record handoff notes

**What**: Run the targeted compile/test/manual checks that prove auto-finish, finished-history cleanup, maintenance, and protocol-sale financial behavior all still work together after the lifecycle alignment.
**Where**:
- API verification
- `packages/web-bruno` verification
- `.specs/project/STATE.md` or feature handoff notes if new follow-up work appears
**Depends on**: T3, T4
**Reuses**: Existing protocol lifecycle tests plus the current Bruno financial smoke-test pattern
**Requirement**: NMP-11, NMP-12, NMP-13, NMP-14, NMP-16, NMP-17, NMP-18, NMP-19, NMP-20, NMP-21, NMP-22, NMP-23

**Tools**:
- MCP: NONE
- Skill: `tlc-spec-driven`

**Done when**:
- [ ] `cd packages/api && npx tsc --noEmit` exits 0
- [ ] The targeted protocol and protocol-linked session Vitest suites exit 0
- [ ] `npm --prefix packages/web-bruno run build` exits 0
- [ ] Manual smoke confirms a protocol auto-finishes only when the last sold credit is consumed
- [ ] Manual smoke confirms an eligible finished protocol can be deleted from history, while active, maintenance, and linked protocols remain blocked
- [ ] Manual smoke confirms Bruno can still use the maintenance path intentionally without reopening a finished protocol
- [ ] Manual financial check confirms protocol-sale revenue remains single-counted after the lifecycle changes
- [ ] Any follow-up gap discovered during verification is recorded in the project state or feature handoff notes

**Verify**:
```bash
cd packages/api && npx tsc --noEmit
npm --prefix packages/web-bruno run build
```

---

## Task Granularity Check

| Task | Scope | Status |
|---|---|---|
| T1: Auto-finish booking lifecycle | 1 backend business-rules slice | ✅ Cohesive |
| T2: Finished-history guardrails | 1 backend protocol-management slice | ✅ Cohesive |
| T3: Panel + hook refresh | tightly related web-bruno lifecycle surfaces | ✅ Cohesive |
| T4: Booking/correction UX alignment | tightly related protocol-aware UI surfaces | ✅ Cohesive |
| T5: Verification + handoff | integration-focused release gate | ✅ Cohesive |

---

## Verification Notes

- Backend:
  - `cd packages/api && npx tsc --noEmit`
  - targeted `vitest` for `psychology-session-protocol`, `neuromodulation-protocol`, and `delete-neuromodulation-protocol`
- Frontend:
  - `npm --prefix packages/web-bruno run build`
- Manual:
  - Open a protocol with one remaining sold credit, complete the final linked session, and confirm the protocol moves to finished history
  - Try to book another linked session and confirm the finished protocol is no longer selectable
  - Delete an eligible finished protocol and confirm it disappears from history
  - Confirm blocked delete behavior for active, maintenance, and linked protocols
  - Confirm maintenance follow-up and protocol-sale revenue behavior still match the existing Bruno flow
