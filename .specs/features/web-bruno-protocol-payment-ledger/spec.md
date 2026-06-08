# Web Bruno Protocol Payment Ledger Specification

## Problem Statement

The current Bruno neuromodulation protocol payment model stores only one `paymentStatus`, one `paymentMethod`, and one `paidAt` on the protocol row. That supports only all-or-nothing payment tracking, but Bruno needs to register multiple receipts for the same protocol sale, each with its own amount and date. This feature is linked to `web-bruno-neuromodulation-protocols`, but it must stay separate because it changes the commercial data model, financial attribution rules, and API contracts rather than only adding UI.

## Linked Features

- Extends the protocol-sale revenue model introduced by `web-bruno-neuromodulation-protocols`
- Refines the requirements behind `NMP-16`, `NMP-17`, `NMP-18`, and `NMP-19` without reopening the full protocol lifecycle scope

## Goals

- [ ] Bruno can register multiple payment entries against a single neuromodulation protocol sale
- [ ] Each protocol payment entry stores its own amount, date, and payment method
- [ ] The protocol commercial state shows how much was received and how much remains open
- [ ] Bruno financial reports attribute protocol revenue by each payment entry date instead of one protocol-level `paidAt`
- [ ] Protocol-linked appointments remain operational only and do not duplicate protocol-sale revenue

## Out of Scope

Explicitly excluded. Documented to prevent scope creep.

| Feature | Reason |
| --- | --- |
| Automatic installment schedules or recurring receivable generation | Bruno only asked to register actual received payments with distinct values and dates |
| Refunds, chargebacks, or negative ledger adjustments | Separate financial correction workflow |
| Payment gateway, Pix automation, or bank reconciliation | This phase is manual backoffice control only |
| Generic package ledger for non-neuromodulation packages | This spec covers the protocol-sale model linked to `web-bruno-neuromodulation-protocols` |

---

## User Stories

### P1: Register Multiple Payments for the Same Protocol Sale ⭐ MVP

**User Story**: As Bruno, I want to register one or more payments for a neuromodulation protocol sale, so that I can reflect how the patient actually pays over time.

**Why P1**: The current scalar payment model cannot represent different payment dates and values for the same protocol, which is the core business gap called out for this change.

**Acceptance Criteria**:

1. WHEN Bruno opens a neuromodulation protocol with a commercial value THEN the system SHALL show the protocol total, the total amount already received, and the remaining balance
2. WHEN Bruno uses the package/protocol payment action THEN the system SHALL collect at least `amount`, `paymentDate`, and `paymentMethod` for the new payment entry
3. WHEN Bruno saves a payment for a protocol THEN the system SHALL append a new payment ledger entry instead of overwriting a single protocol-level payment field
4. WHEN Bruno creates a protocol and records an upfront payment in the same flow THEN the system SHALL persist that receipt as the first payment ledger entry
5. WHEN Bruno adds a payment whose total would exceed the protocol commercial value THEN the system SHALL block the save and require Bruno to correct the amount or adjust the protocol value first
6. WHEN Bruno tries to register a payment with a zero or negative amount THEN the system SHALL block the save with validation feedback
7. WHEN Bruno tries to register a payment with a future receipt date THEN the system SHALL block the save because the ledger only records payments already received

**Independent Test**: Create a protocol worth `R$ 3.600,00`, register `R$ 1.000,00` today and `R$ 2.600,00` on a later date, and confirm the protocol shows both entries plus zero remaining balance after the second receipt.

---

### P1: Derive Protocol Payment State From the Ledger ⭐ MVP

**User Story**: As Bruno, I want the protocol payment state to reflect the sum of recorded payments, so that I can see whether the sale is still open, partially received, or fully settled.

**Why P1**: Multiple payment entries are only useful if the product can turn them into an accurate commercial status and open balance.

**Acceptance Criteria**:

1. WHEN a protocol has no payment entries THEN the system SHALL show it as `pending`
2. WHEN a protocol has at least one payment entry but the paid total is still below the protocol commercial value THEN the system SHALL show it as `partial`
3. WHEN the paid total exactly matches the protocol commercial value THEN the system SHALL show it as `paid`
4. WHEN Bruno records the first partial payment for a protocol THEN the existing all-or-nothing `Marcar como pago` workflow SHALL become an additive payment workflow that still allows later entries until the balance reaches zero
5. WHEN Bruno edits the protocol commercial value after payments already exist THEN the system SHALL preserve the existing ledger history and SHALL NOT allow the total value to drop below the amount already received
6. WHEN existing historical protocols already have only scalar payment fields from the legacy model THEN the migration SHALL preserve their financial meaning without losing the recorded payment date or amount

**Independent Test**: Register one payment smaller than the protocol total and confirm the protocol becomes `partial`; register the final payment later and confirm the protocol becomes `paid` without losing the first receipt.

---

### P1: Attribute Revenue and Receivables by Payment Ledger Entries ⭐ MVP

**User Story**: As Bruno, I want protocol revenue and receivables to follow the ledger entries, so that the financial view reflects when money actually came in and what is still outstanding.

**Why P1**: A multi-payment ledger changes not only the protocol detail view but also the core accounting behavior already promised in the neuromodulation spec.

**Acceptance Criteria**:

1. WHEN a protocol has payment entries on different dates THEN the financial summary SHALL count each entry in the period that contains that entry's `paymentDate`
2. WHEN Bruno filters the financial view by date range THEN paid protocol revenue SHALL include only the payment ledger entries whose `paymentDate` falls inside the requested range
3. WHEN a protocol is partially paid THEN the receivable view SHALL show only the remaining open balance, not the full protocol total
4. WHEN a protocol is fully paid through multiple entries THEN the receivable view SHALL remove that protocol from the pending balance surface
5. WHEN Bruno books or edits protocol-linked neuromodulation appointments after the sale THEN those operational appointments SHALL continue to avoid generating duplicate commercial revenue rows
6. WHEN protocol revenue is displayed in lists or details THEN Bruno SHALL be able to audit the underlying payment ledger entries that produced that revenue

**Independent Test**: Register one protocol payment in June and another in July, then confirm the June financial summary includes only the June receipt, the July summary includes only the July receipt, and the pending balance shrinks after each receipt.

---

## Edge Cases

- WHEN a legacy protocol was previously stored as `paymentStatus = paid` with one `paidAt` and one `paymentMethod` THEN the migration SHALL materialize an equivalent ledger history so past reports do not change unexpectedly
- WHEN a legacy protocol was previously stored as `paymentStatus = pending` THEN the migration SHALL keep it with zero received amount and the full balance open
- WHEN Bruno records a partial payment and then changes the protocol total upward THEN the remaining balance SHALL be recalculated without altering the historical ledger entries
- WHEN Bruno opens a protocol that is already fully paid THEN the UI SHALL keep the payment history visible even though no additional payment action is needed
- WHEN the financial range contains no payment ledger entries for a partially paid protocol THEN that period SHALL show no paid revenue for the protocol while still allowing the open balance to appear in receivable surfaces

---

## Requirement Traceability

| Requirement ID | Story | Phase | Status |
| --- | --- | --- | --- |
| PLEDGER-01 | P1: Register multiple payments for the same protocol sale | Design | Pending |
| PLEDGER-02 | P1: Register multiple payments for the same protocol sale | Design | Pending |
| PLEDGER-03 | P1: Register multiple payments for the same protocol sale | Design | Pending |
| PLEDGER-04 | P1: Register multiple payments for the same protocol sale | Design | Pending |
| PLEDGER-05 | P1: Register multiple payments for the same protocol sale | Design | Pending |
| PLEDGER-06 | P1: Register multiple payments for the same protocol sale | Design | Pending |
| PLEDGER-07 | P1: Register multiple payments for the same protocol sale | Design | Pending |
| PLEDGER-08 | P1: Derive protocol payment state from the ledger | Design | Pending |
| PLEDGER-09 | P1: Derive protocol payment state from the ledger | Design | Pending |
| PLEDGER-10 | P1: Derive protocol payment state from the ledger | Design | Pending |
| PLEDGER-11 | P1: Derive protocol payment state from the ledger | Design | Pending |
| PLEDGER-12 | P1: Derive protocol payment state from the ledger | Design | Pending |
| PLEDGER-13 | P1: Derive protocol payment state from the ledger | Design | Pending |
| PLEDGER-14 | P1: Attribute revenue and receivables by payment ledger entries | Design | Pending |
| PLEDGER-15 | P1: Attribute revenue and receivables by payment ledger entries | Design | Pending |
| PLEDGER-16 | P1: Attribute revenue and receivables by payment ledger entries | Design | Pending |
| PLEDGER-17 | P1: Attribute revenue and receivables by payment ledger entries | Design | Pending |
| PLEDGER-18 | P1: Attribute revenue and receivables by payment ledger entries | Design | Pending |
| PLEDGER-19 | P1: Attribute revenue and receivables by payment ledger entries | Design | Pending |

---

## Success Criteria

- [ ] Bruno can register more than one payment for the same protocol sale with different dates and amounts
- [ ] The protocol commercial view shows received amount, remaining balance, and payment history without losing prior receipts
- [ ] The protocol state can represent `pending`, `partial`, and `paid` based on recorded payments
- [ ] Financial reports attribute protocol revenue by each payment entry date instead of one protocol-level paid date
- [ ] Partially paid protocols appear in receivable surfaces only for their remaining balance
- [ ] Protocol-linked appointments remain operational and do not double-count sale revenue
