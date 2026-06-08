# web-bruno Neuromodulation Protocol Flow

**Tags:** psychology, web-bruno, api, protocols, financial, agenda, flow
**Discovered:** 2026-05-18

## Entry Points

- `packages/api/src/http/routes/psychology.routes.ts`
- `packages/api/src/application/use-cases/booking/create-neuromodulation-protocol.ts`
- `packages/api/src/application/use-cases/booking/update-psychology-session.ts`
- `packages/api/src/application/use-cases/booking/delete-psychology-session.ts`
- `packages/api/src/infrastructure/database/repositories/prisma-neuromodulation-protocol.repository.ts`
- `packages/web-bruno/src/components/protocols/PatientProtocolsPanel.tsx`
- `packages/web-bruno/src/components/appointments/AppointmentForm.tsx`
- `packages/web-bruno/src/pages/FinancialPage.tsx`

## Findings

1. Bruno’s protocol feature rides on the same patient `careMode` foundation as the psychology taxonomy switch:
   - neuromodulation eligibility is enforced from `Customer.careMode`
   - Bruno session type options are now `psychotherapy|neuromodulation`, with legacy service slugs normalized at the API edge
2. Protocol counters are projected from appointment outcomes instead of being stored denormalized:
   - `reserved` and `consumed` come from linked appointment rows
   - `manualConsumedCount` on the protocol preserves consumed credits when a linked appointment is deleted or unlinked after consumption
3. Financial attribution now splits into two streams:
   - operational appointments still count when they are standalone or maintenance-only
   - protocol-sale revenue comes from `neuromodulation_protocols`, and linked active-protocol sessions are excluded to prevent double counting
4. The Bruno UI reads protocol state in three main places:
   - patient detail protocol management in `PatientProtocolsPanel`
   - agenda booking/editing via protocol selection and consume-vs-release overrides in `AppointmentForm`
   - pending/revenue surfaces through the mixed appointment + protocol payload in `FinancialPage`
5. Protocol deletion is already implemented end-to-end, but only for finished protocols without linked appointments:
   - application guard lives in `packages/api/src/application/use-cases/booking/delete-neuromodulation-protocol.ts`
   - Bruno exposes the action from the finished-history block in `packages/web-bruno/src/components/protocols/PatientProtocolsPanel.tsx`
   - older spec/tasks drafts did not fully capture that delete lifecycle
6. Automatic protocol finishing is still a lifecycle gap:
   - counters already project `reserved`, `consumed`, and `remaining`
   - current booking mutation use cases do not auto-transition a protocol to `finished` when consumed credits reach the sold allowance
7. Protocol commercial payment is still a scalar model reused across API and financial reporting:
   - `NeuromodulationProtocol` stores only one `paymentStatus`, `paymentMethod`, and `paidAt`
   - repository/query layers surface protocol-sale revenue directly from those protocol fields
   - supporting multiple receipts for one protocol sale requires a separate ledger-style feature, not only a UI change

## Gotchas

- Deleting a protocol-linked appointment without a ledger would lose credit history; `manualConsumedCount` is the compensating store for delete/unlink flows where Bruno chooses to keep a credit consumed.
- Quick cancel/delete actions only prompt for release-vs-consume when `protocolLinkType === 'protocol'`; maintenance sessions stay operational and don’t participate in the allowance counters.
- `GET /api/services` still has to normalize Bruno’s legacy rows until the migration/seed rollout finishes on real data; the frontend should not assume raw service slugs are already clean in the database.
- `PatientProtocolsPanel` splits current vs finished protocols purely by status, so any future auto-finish rule will immediately move a protocol out of the current action surface unless the UI copy and invalidation stay aligned with that behavior.
- The current protocol revenue path assumes one protocol-level `paidAt`; any partial-payment ledger must also change financial range filtering and receivable aggregation, not just the protocol form.
