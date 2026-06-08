# web-bruno Protocol Payment Ledger — Tasks

**Design**: `.specs/features/web-bruno-protocol-payment-ledger/design.md`
**Status**: Draft

---

## Execution Plan

### Phase 1 — Data model and backend contract foundation (Sequential)

The ledger table, derived protocol read model, and route semantics must land before the Bruno frontend can safely consume or mutate partial protocol payments.

```
T1 → T2 → T3
```

### Phase 2 — Frontend protocol contract and workspace foundation (Sequential)

After the backend contract is stable, the typed hook/schema layer must land before the protocol workspace can consume it.

```
T3 → T4 → T5
```

### Phase 3 — Financial and patient-detail integration (Parallel OK)

Once the protocol workspace is ledger-aware, the finance dashboard and patient financial detail can update in parallel.

```
     ┌→ T6 [P]
T5 ──┤
     └→ T7 [P]
```

---

## Parallel Execution Map

```
Phase 1:
  T1  Prisma + protocol repository ledger foundation
   ↓
  T2  Protocol use cases + psychology routes — create/update sale vs add-payment workflow
   ↓
  T3  Financial aggregations — protocol revenue by payment entries and remaining-balance receivables

Phase 2:
  T3 done, then:
    T4  protocol.schema.ts + api/protocols.ts + api/financial.ts — align Bruno typing and hooks
     ↓
    T5  ProtocolForm.tsx + ProtocolPaymentDialog.tsx + PatientProtocolsPanel.tsx — split sale editing from payment capture

Phase 3:
  T5 done, then in parallel:
    ├── T6 [P]  FinancialPage.tsx + PendingPayments.tsx — ledger-aware revenue and protocol pending balances
    └── T7 [P]  PatientDetailPage.tsx + shared labels/constants — final protocol finance presentation
```

---

## Task Breakdown

### T1: Add protocol payment ledger persistence and derived protocol read model

**What**: Introduce a child payment table for neuromodulation protocol receipts, backfill legacy scalar payment state into that ledger, and make the protocol repository derive commercial payment status and balances from payment rows instead of protocol columns.
**Where**:
- `packages/api/prisma/schema.prisma`
- `packages/api/prisma/migrations/...`
- `packages/api/src/domain/entities/neuromodulation-protocol.ts`
- `packages/api/src/domain/repositories/neuromodulation-protocol.repository.ts`
- `packages/api/src/infrastructure/database/repositories/prisma-neuromodulation-protocol.repository.ts`
**Depends on**: None
**Reuses**: Existing protocol counter projection in `prisma-neuromodulation-protocol.repository.ts`
**Requirement**: PLEDGER-01, PLEDGER-03, PLEDGER-08, PLEDGER-09, PLEDGER-10, PLEDGER-13

**Done when**:
- [ ] Prisma has a `NeuromodulationProtocolPayment` model related to `NeuromodulationProtocol`
- [ ] A migration backfills legacy paid protocols into one payment row each before removing protocol scalar payment fields
- [ ] Protocol domain types expose `paymentStatus`, `paidAmountCents`, `remainingAmountCents`, `lastPaymentAt`, and `payments`
- [ ] Protocol payment status supports `pending`, `partial`, and `paid`
- [ ] The Prisma protocol repository derives protocol commercial state from payment rows instead of stored protocol payment columns
- [ ] Payment rows are returned in deterministic receipt order
- [ ] `cd packages/api && npm run build` exits 0

**Commit**: deferred — commit alongside T2

---

### T2: Split protocol sale editing from payment-entry commands in the backend

**What**: Replace the current binary protocol payment contract with a ledger-aware API: optional initial payment on create, commercial-only update on patch, and a dedicated endpoint to append protocol payments.
**Where**:
- `packages/api/src/application/use-cases/booking/create-neuromodulation-protocol.ts`
- `packages/api/src/application/use-cases/booking/update-neuromodulation-protocol.ts`
- `packages/api/src/application/use-cases/booking/neuromodulation-protocol.utils.ts`
- `packages/api/src/application/use-cases/booking/add-neuromodulation-protocol-payment.ts`
- `packages/api/src/application/use-cases/booking/__tests__/neuromodulation-protocol.use-cases.test.ts`
- `packages/api/src/http/routes/psychology.routes.ts`
**Depends on**: T1
**Reuses**: Existing patient eligibility checks, not-found handling, and protocol route block in `psychology.routes.ts`
**Requirement**: PLEDGER-01, PLEDGER-02, PLEDGER-04, PLEDGER-05, PLEDGER-06, PLEDGER-07, PLEDGER-11, PLEDGER-12, PLEDGER-13

**Done when**:
- [ ] `POST /psychology/patients/:id/protocols` accepts `initialPayment?` instead of scalar `paymentStatus/paymentMethod/paidAt`
- [ ] Creating a protocol with `initialPayment` persists the protocol sale and first ledger row atomically
- [ ] `PATCH /psychology/protocols/:id` updates only sale metadata (`totalSessions`, `totalPriceCents`, `status`, `notes`)
- [ ] `POST /psychology/protocols/:id/payments` exists and returns the updated protocol read model
- [ ] Zero/negative payment amounts are rejected
- [ ] Future payment dates are rejected
- [ ] Overpayments beyond the remaining protocol balance are rejected
- [ ] Lowering `totalPriceCents` below the already-paid amount is rejected
- [ ] Protocol use-case tests cover partial payment, final payment, and overpayment validation
- [ ] `cd packages/api && npm test -- neuromodulation-protocol.use-cases.test.ts` exits 0
- [ ] `cd packages/api && npm run build` exits 0

**Commit**: `feat(psychology-api): add protocol payment ledger commands`

---

### T3: Rework financial and patient-summary aggregations around ledger entries

**What**: Change the shared financial repository so protocol revenue is attributed by payment rows and protocol receivables use only the remaining open balance.
**Where**:
- `packages/api/src/domain/repositories/appointment.repository.ts`
- `packages/api/src/infrastructure/database/repositories/prisma-appointment.repository.ts`
- `packages/api/src/http/routes/psychology.routes.ts`
**Depends on**: T2
**Reuses**: Existing mixed appointment + protocol financial summary shape and patient financial summary path
**Requirement**: PLEDGER-14, PLEDGER-15, PLEDGER-16, PLEDGER-17, PLEDGER-18, PLEDGER-19

**Done when**:
- [ ] `getFinancialSummary()` includes protocol revenue by payment rows whose `paidAt` falls inside the requested range
- [ ] Protocol-linked operational appointments remain excluded from sale revenue aggregation
- [ ] Pending protocol receivable rows use `remainingAmountCents` instead of full `totalPriceCents`
- [ ] Partially paid protocols still count as pending until their remaining balance reaches zero
- [ ] `getPatientFinancialSummary()` uses ledger sums for paid protocol totals
- [ ] `getPatientFinancialSummary()` uses remaining balances for pending protocol totals
- [ ] Protocol counts in patient financial summary distinguish fully settled vs still-open sales
- [ ] `cd packages/api && npm run build` exits 0

**Commit**: `feat(financial): attribute protocol revenue by ledger entries`

---

### T4: Align web-bruno protocol schemas and hooks with the ledger contract

**What**: Update the Bruno protocol typing and query/mutation layer so protocol sale creation, sale editing, payment entry creation, and financial consumption all understand ledger-backed protocol finance.
**Where**:
- `packages/web-bruno/src/schemas/protocol.schema.ts`
- `packages/web-bruno/src/schemas/patient.schema.ts`
- `packages/web-bruno/src/api/protocols.ts`
- `packages/web-bruno/src/api/financial.ts`
- `packages/web-bruno/src/config/constants.ts`
**Depends on**: T3
**Reuses**: Existing React Query invalidation scope for patients, appointments, protocols, and financial data
**Requirement**: PLEDGER-01, PLEDGER-08, PLEDGER-10, PLEDGER-14, PLEDGER-16, PLEDGER-19

**Done when**:
- [ ] Protocol typing includes `payments`, `paidAmountCents`, `remainingAmountCents`, and `lastPaymentAt`
- [ ] Protocol payment status typing supports `pending`, `partial`, and `paid`
- [ ] Appointment payment typing remains binary and does not leak the protocol-only `partial` state
- [ ] `useCreateProtocol()` and `useUpdateProtocol()` use separate payload contracts
- [ ] `useAddProtocolPayment()` exists and invalidates the same protocol/patient/financial query scope as other protocol mutations
- [ ] Financial API typing preserves protocol payment arrays for ledger-based revenue flattening
- [ ] Patient financial summary typing still matches the backend totals/counts
- [ ] `cd packages/web-bruno && npm run build` exits 0

**Commit**: deferred — commit alongside T5

---

### T5: Split protocol sale editing from payment capture in the Bruno protocol workspace

**What**: Make the patient protocol panel display ledger-backed finance, keep sale edits separate from payment history, and add a protocol-specific dialog for registering new receipts.
**Where**:
- `packages/web-bruno/src/components/protocols/ProtocolForm.tsx`
- `packages/web-bruno/src/components/protocols/ProtocolPaymentDialog.tsx`
- `packages/web-bruno/src/components/protocols/PatientProtocolsPanel.tsx`
**Depends on**: T4
**Reuses**: Existing protocol panel layout, modal styling, and mutation flow in `api/protocols.ts`
**Requirement**: PLEDGER-01, PLEDGER-02, PLEDGER-03, PLEDGER-04, PLEDGER-08, PLEDGER-10, PLEDGER-11

**Done when**:
- [ ] Create mode can optionally capture an initial protocol payment amount/method/date
- [ ] Edit mode no longer overwrites or recreates ledger history
- [ ] Current protocols show commercial total, paid amount, remaining balance, and derived payment status
- [ ] Payment history is visible inside the protocol workspace
- [ ] Protocols with remaining balance expose a `Registrar pagamento` or equivalent add-payment action
- [ ] Fully paid protocols hide the add-payment action
- [ ] The protocol payment dialog validates amount, method, and date before mutating
- [ ] `cd packages/web-bruno && npm run build` exits 0

**Commit**: `feat(web-bruno): manage protocol payments as ledger entries`

---

### T6 [P]: Make Bruno financial pending/revenue surfaces ledger-aware for protocols

**What**: Update the Bruno financial page and pending-payment bench so protocol revenue follows payment entries and protocol receivables reflect only the remaining open balance.
**Where**:
- `packages/web-bruno/src/pages/FinancialPage.tsx`
- `packages/web-bruno/src/components/financial/PendingPayments.tsx`
**Depends on**: T4, T5
**Reuses**: Existing pending-payment filtering/selection UX and chart/revenue summary composition
**Requirement**: PLEDGER-14, PLEDGER-15, PLEDGER-16, PLEDGER-17, PLEDGER-18, PLEDGER-19

**Done when**:
- [ ] Protocol revenue entries are flattened from `protocol.payments`
- [ ] Each protocol payment contributes only its own `amountCents` on its own `paidAt`
- [ ] Pending protocol rows use `remainingAmountCents`
- [ ] Both `pending` and `partial` protocols remain visible in pending receivables until settled
- [ ] The protocol quick action uses the protocol payment dialog and `useAddProtocolPayment()` instead of `useUpdateProtocol()` payment flags
- [ ] Financial cards and charts stop treating the whole protocol total as one paid event after the first receipt
- [ ] `cd packages/web-bruno && npm run build` exits 0

**Commit**: `feat(web-bruno): report protocol revenue from payment ledger`

---

### T7 [P]: Update patient financial detail and shared payment-status presentation

**What**: Finish the ledger rollout by showing patient-level protocol totals from the new finance semantics and aligning shared labels/badges with protocol partial-payment state.
**Where**:
- `packages/web-bruno/src/pages/PatientDetailPage.tsx`
- `packages/web-bruno/src/config/constants.ts`
- any small protocol-only display helpers touched during implementation
**Depends on**: T5
**Reuses**: Existing patient detail financial card layout and status-label mapping patterns
**Requirement**: PLEDGER-08, PLEDGER-09, PLEDGER-10, PLEDGER-16, PLEDGER-17

**Done when**:
- [ ] Patient detail protocol totals show paid value from ledger sums
- [ ] Patient detail protocol pending totals show only the remaining open balance
- [ ] Patient detail protocol counts distinguish settled vs still-open sales
- [ ] Shared labels can render `pending`, `partial`, and `paid` for protocol payment status
- [ ] Appointment payment UI remains unchanged and does not expose `partial`
- [ ] `cd packages/web-bruno && npm run build` exits 0

**Commit**: `feat(web-bruno): surface protocol partial-payment status`
