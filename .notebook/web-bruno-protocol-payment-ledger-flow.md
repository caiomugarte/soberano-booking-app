# web-bruno Protocol Payment Ledger Flow

**Tags:** psychology, web-bruno, api, protocols, financial, payments, ledger, flow
**Discovered:** 2026-06-08

## Entry Points

- `packages/api/prisma/schema.prisma`
- `packages/api/src/infrastructure/database/repositories/prisma-neuromodulation-protocol.repository.ts`
- `packages/api/src/application/use-cases/booking/add-neuromodulation-protocol-payment.ts`
- `packages/api/src/http/routes/psychology.routes.ts`
- `packages/api/src/infrastructure/database/repositories/prisma-appointment.repository.ts`
- `packages/web-bruno/src/components/protocols/PatientProtocolsPanel.tsx`
- `packages/web-bruno/src/components/protocols/ProtocolPaymentDialog.tsx`
- `packages/web-bruno/src/pages/FinancialPage.tsx`
- `packages/web-bruno/src/components/financial/PendingPayments.tsx`

## Findings

1. Protocol-sale finance is now ledger-derived instead of protocol-column-derived:
   - `NeuromodulationProtocol` keeps only the commercial total and lifecycle fields
   - `NeuromodulationProtocolPayment` stores each receipt amount/method/date
   - repository mapping derives `paymentStatus`, `paidAmountCents`, `remainingAmountCents`, `lastPaymentAt`, and ordered `payments`
2. The API contract is split into three protocol finance commands:
   - `POST /psychology/patients/:id/protocols` accepts optional `initialPayment`
   - `PATCH /psychology/protocols/:id` edits only sale metadata
   - `POST /psychology/protocols/:id/payments` appends a new ledger entry
   - `PATCH /psychology/protocols/:id/payments/:paymentId` corrects an existing payment entry when Bruno needs to fix amount/method/date mistakes
3. Financial aggregation is intentionally asymmetric:
   - protocol revenue comes from payment rows whose `paidAt` lands in the requested range
   - open protocol receivables still surface even when none of that protocol’s payments are inside the current range
4. Patient financial detail treats protocol sales as settled only when the remaining balance hits zero:
   - `paidTotalCents` sums all recorded protocol receipts
   - `pendingTotalCents` sums only the remaining balances of open protocol sales
5. Bruno now uses two different quick-pay dialogs in pending surfaces:
   - appointments still use `PaymentMethodDialog` because the amount is the session value
   - protocols use `ProtocolPaymentDialog` because Bruno must enter amount + method + receipt date
6. Payment history in `PatientProtocolsPanel` is now operational, not read-only:
   - each protocol payment row exposes `Editar pagamento`
   - edit mode reuses the same dialog but caps the new amount at `current payment + remaining balance`

## Gotchas

- Do not widen appointment payment typing to include `partial`; that state is protocol-only on both API and `web-bruno`.
- If `getFinancialSummary()` filters protocol rows only by payment date, partially paid older protocols disappear from receivable surfaces; open protocol balances must stay query-visible even without in-range receipts.
- The ledger migration backfills each legacy `payment_status = paid` protocol into one payment row, then drops the old scalar payment columns; finished-protocol deletion depends on the child payment FK being `ON DELETE CASCADE`.
- The ledger is no longer fully immutable: edits are allowed, but only through the explicit payment-edit endpoint so the same validation rules apply as add-payment.
