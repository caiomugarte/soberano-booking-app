# web-bruno Receivables Workbench Flow

**Tags:** psychology, web-bruno, financial, receivables, flow
**Discovered:** 2026-06-08

## Entry Points

- `packages/api/src/http/routes/psychology.routes.ts`
- `packages/web-bruno/src/api/appointments.ts`
- `packages/web-bruno/src/pages/FinancialPage.tsx`
- `packages/web-bruno/src/components/financial/PendingPayments.tsx`

## Flow

1. `GET /api/psychology/sessions` is the source of truth for Bruno's overdue session contract:
   - `dueOnly=true` clamps the upper bound to today in Sao Paulo
   - `excludeCancelled=true` removes cancelled sessions
   - `receivableScope=operations-only` excludes protocol-linked session duplicates except maintenance rows
2. `useDuePendingAppointments()` in `packages/web-bruno/src/api/appointments.ts` hard-codes that contract for the receivables workbench instead of re-deriving overdue rows from the annual financial summary.
3. `FinancialPage` builds the workbench from two sources:
   - overdue appointment rows from `useDuePendingAppointments()`
   - protocol-sale rows from `useFinancialSummary()` for remaining commercial balances
4. `PendingPayments` owns only Bruno-side workbench behavior:
   - patient dropdown filter
   - visible count/total
   - visible selection state
   - bulk reminder and bulk mark-paid actions for compatible appointment rows
5. Batch appointment actions run through `useSendBulkPaymentReminders()` and `useBulkMarkAppointmentsPaid()` in `packages/web-bruno/src/api/appointments.ts`, which return per-row success/failure payloads and invalidate the shared appointment/financial query families once.
6. Protocol-sale rows stay visible in the same surface, but they carry an explicit `bulkActionLimitation` and still use the individual `ProtocolPaymentDialog` flow until a protocol-specific batch contract exists.

## Gotchas

- The receivables bench is intentionally mixed: appointment rows use the overdue session contract, while protocol rows still come from the financial summary path. Do not assume the batch actions apply to every visible row.
- Selection state is defined against the visible filtered subset. If the patient filter changes, hidden rows must drop out of selection immediately so Bruno does not act on stale rows.
- If you weaken `normalizeAppointmentFilters()` in `packages/web-bruno/src/api/appointments.ts`, the workbench can silently reuse stale cached data because the same helper feeds both the request URL and the React Query key.
