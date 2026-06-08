# Web Bruno Operations Hub Specification

## Problem Statement

Even after the agenda correction work, Bruno still lacks an operational surface that makes day-to-day management comfortable. Saturday appointments are easy to lose because the frontend still models only Monday to Friday, and the current operations and financial surfaces still need tightening before Bruno can treat them as a reliable daily workbench.

For receivables specifically, the overdue-only session rule already exists in the API and typed frontend hooks. This scope is therefore mostly about verification and hardening: making the Bruno `Financeiro` receivables bench clearly overdue-focused, filterable, totalized, and actionable in bulk without redefining the underlying financial model from scratch.

## Goals

- [ ] Bruno has an appointment-management entry point beyond the weekly grid
- [ ] Saturday is fully visible and manageable in the Bruno scheduling UI
- [ ] The `Financeiro` receivables bench shows only overdue session pendencies and exposes clear filters plus totals
- [ ] Bruno can act on selected pendencies in bulk to remind or mark paid without opening each row one by one
- [ ] The dashboard can surface today’s birthdays without disrupting the workflow

## Out of Scope

| Feature | Reason |
|---|---|
| Session edit/delete/payment-method correction flows | Already covered by `web-bruno-agenda-event-management` |
| Neuromodulation protocol credit accounting | Split into `web-bruno-neuromodulation-protocols` |
| Rebuilding the paid-revenue summary/chart area of `Financeiro` | This scope hardens the receivables workbench, not the historical revenue widgets |
| Defining new overdue semantics for protocol-sale receivables | The overdue cutoff already exists for session receivables; protocol aging rules still belong to the protocol/payment-ledger track |
| Automatic WhatsApp payment reminders after X hours | Not specified enough yet; manual operations first |
| Customer-facing reminder links or self-service flows | Admin-only workbench for now |
| Birthday WhatsApp automation | In-app reminder is enough for this phase |

---

## User Stories

### P1: Manage Appointments from a Real Operations Surface ⭐ MVP

**User Story**: As Bruno, I want a dedicated appointments management surface, so that I can find, inspect, and correct sessions even when they are awkward to reach from the weekly grid.

**Why P1**: The Saturday complaint and the “maybe a menu de Agendamentos” request both point to discoverability and manageability, not just one broken button.

**Acceptance Criteria**:

1. WHEN Bruno opens the main navigation THEN the system SHALL expose an `Agendamentos` entry point in addition to the weekly dashboard agenda
2. WHEN Bruno opens the operations appointment surface THEN the system SHALL show appointments in a list or table that can be filtered by date and patient
3. WHEN a Saturday appointment exists THEN the weekly agenda, shifts/settings UI, and the operations appointment surface SHALL all show Saturday consistently
4. WHEN Bruno opens an appointment from the operations surface THEN the existing session detail and correction flows SHALL remain available
5. WHEN no appointments match the active filters THEN the operations surface SHALL show an explicit empty state instead of a blank page

**Independent Test**: Create a Saturday appointment, open both the weekly agenda and the operations appointment surface, and confirm the session is visible and manageable from both.

---

### P1: Receivables Workbench Shows Only Overdue Items and Supports Filtering ⭐ MVP

**User Story**: As Bruno, I want the `Financeiro` receivables workbench to show only what is actually overdue and let me filter it by patient, so that I can organize follow-up work without mixing in future sessions.

**Why P1**: This is the direct answer to the “financeiro é só o que tá atrasado”, “pendências somente até a data atual”, “dropdown nas pendências por paciente”, and “filtrar por” requests.

**Acceptance Criteria**:

1. WHEN Bruno opens the receivables area inside `Financeiro` THEN appointment-based rows in the workbench SHALL include only overdue session pendencies, meaning session rows whose date is today or earlier and whose payment state is still pending
2. WHEN a pending item is cancelled THEN it SHALL NOT appear in the receivables workbench
3. WHEN Bruno filters pendencies by patient THEN the system SHALL provide a patient dropdown instead of free-text search and SHALL update the visible rows accordingly
4. WHEN Bruno changes the active filters THEN the workbench SHALL show the count of currently visible overdue pendencies and the total open amount for that visible set
5. WHEN no receivable rows match the active filters THEN the surface SHALL show a clear empty state instead of listing future pending sessions or blank content
6. WHEN the overdue-only rule is exercised from the Bruno frontend THEN the implementation SHALL reuse the existing API and typed query-hook contract instead of reintroducing parallel filtering logic in the page layer

**Independent Test**: Create one overdue pending session and one future pending session, then confirm only the overdue one appears and can be selected.

---

### P1: Selected Pendencies Support Bulk Pay and Reminder Actions ⭐ MVP

**User Story**: As Bruno, I want to act on the pendencies I selected, so that selection leads directly to useful follow-up work without repeating the same operation row by row.

**Why P1**: Selection without bulk actions would not solve the “selecionar todas as pendências para marcar pago e cobrar todas” request on its own.

**Acceptance Criteria**:

1. WHEN Bruno checks one or more visible pendencies THEN the UI SHALL show the current visible selection count
2. WHEN Bruno clicks `Selecionar todas as visíveis` THEN the system SHALL select every currently filtered pendency that is compatible with the chosen bulk action
3. WHEN filters change after a selection THEN the visible selection state SHALL update consistently to match the new filtered set instead of silently keeping hidden rows selected
4. WHEN Bruno selects one or more compatible pendencies THEN the system SHALL expose bulk `Marcar pago` and bulk `Enviar lembrete` actions
5. WHEN Bruno triggers the bulk mark-paid action THEN the system SHALL apply the chosen payment data only to the selected compatible rows and SHALL leave non-selected rows untouched
6. WHEN Bruno triggers the bulk reminder action THEN the system SHALL send reminders only for the selected compatible pendencies
7. WHEN one reminder succeeds and another fails THEN the system SHALL report a mixed result without losing the whole selection context
8. WHEN a selected pendency has no valid phone/contact path for the reminder THEN the system SHALL report that specific failure clearly
9. WHEN the bulk actions complete THEN the UI SHALL show how many rows were updated or reminded successfully, which rows still need attention, and the total amount represented by the currently visible filtered set
10. WHEN a visible receivable row cannot participate in a bulk appointment action because it follows a different receivable flow THEN the UI SHALL make that limitation explicit and SHALL NOT silently include the row in the batch

**Independent Test**: Select three due pendencies, bulk-send reminders, then bulk-mark compatible rows as paid and confirm both actions touch only the selected rows while the reminder flow still reports per-row success/failure.

---

### P2: Birthday Reminder on the Dashboard

**User Story**: As Bruno, I want a light dashboard reminder for today’s birthdays, so that I notice them during daily operations.

**Why P2**: The reminder is useful, but it depends on patient birth dates from the patient care model and does not block the main operational hub.

**Acceptance Criteria**:

1. WHEN one or more active patients have birthdays today THEN the dashboard SHALL show a non-blocking birthday reminder toast or panel
2. WHEN Bruno dismisses the reminder THEN the dashboard SHALL stay fully usable and SHALL NOT reopen the same reminder during the current visit unless reloaded
3. WHEN multiple birthdays exist THEN the reminder SHALL show all of them, not just the first patient
4. WHEN no birthdays exist for the current day THEN the reminder SHALL stay hidden

**Independent Test**: Save two patients with today’s birthday, load the dashboard, and confirm both names appear in the birthday reminder.

---

## Edge Cases

- WHEN Bruno has Saturday shifts configured but the old weekday constants are still cached in the UI THEN the refreshed app state SHALL still render Saturday after the feature ships
- WHEN all selected pendencies fail reminder sending THEN the UI SHALL keep those items visible for retry instead of clearing them silently
- WHEN Bruno selects all visible pendencies and then narrows the filters THEN the visible selection count SHALL shrink to the filtered subset rather than keeping hidden rows selected without feedback
- WHEN Bruno selects visible pendencies and then changes the patient dropdown THEN the visible total and visible selected count SHALL recompute to the newly filtered subset
- WHEN Bruno triggers bulk mark-paid from the receivables workbench THEN the shared payment dialog SHALL collect the payment method and payment date once and SHALL apply that same data only to the selected compatible rows
- WHEN a due pendency belongs to a neuromodulation protocol that is billed at protocol level THEN the pendency surface SHALL avoid duplicating that receivable as a standalone session item
- WHEN a protocol-level receivable appears in the same list as overdue session pendencies THEN the workbench SHALL keep the limitation around unsupported bulk appointment actions explicit instead of presenting a misleading “all rows will be charged/reminded” state

---

## Requirement Traceability

| Requirement ID | Story | Phase | Status |
|---|---|---|---|
| OPS-01 | P1: Add Agendamentos entry point | Design | Pending |
| OPS-02 | P1: Provide a filterable appointment operations surface | Design | Pending |
| OPS-03 | P1: Show Saturday consistently in agenda, settings, and operations views | Design | Pending |
| OPS-04 | P1: Reuse existing appointment correction flows from the operations surface | Design | Pending |
| OPS-05 | P1: Show explicit empty states for filtered appointment views | Design | Pending |
| OPS-06 | P1: Limit pendencies to due pending items only | Design | Pending |
| OPS-07 | P1: Exclude cancelled items from pendencies | Design | Pending |
| OPS-08 | P1: Support per-row selection and visible selection counts | Design | Pending |
| OPS-09 | P1: Support select-all-visible behavior | Design | Pending |
| OPS-10 | P1: Keep selection state consistent after filter changes | Design | Pending |
| OPS-11 | P1: Show empty state when no due pendencies remain | Design | Pending |
| OPS-12 | P1: Support a patient dropdown filter in the receivables workbench | Design | Pending |
| OPS-13 | P1: Show visible overdue totals for the active filtered set | Design | Pending |
| OPS-14 | P1: Expose bulk mark-paid action for selected compatible pendencies | Design | Pending |
| OPS-15 | P1: Apply bulk mark-paid only to the selected compatible rows | Design | Pending |
| OPS-16 | P1: Expose bulk reminder action for selected compatible pendencies | Design | Pending |
| OPS-17 | P1: Send reminders only for selected compatible rows | Design | Pending |
| OPS-18 | P1: Report mixed batch reminder results clearly | Design | Pending |
| OPS-19 | P1: Report missing contact/reminder failures per row | Design | Pending |
| OPS-20 | P1: Summarize visible totals plus batch outcomes after completion | Design | Pending |
| OPS-21 | P2: Show today’s birthday reminder on dashboard | Design | Pending |
| OPS-22 | P2: Support dismissal without blocking the dashboard | Design | Pending |
| OPS-23 | P2: Show multiple birthdays in one reminder | Design | Pending |
| OPS-24 | P2: Hide the reminder when there are no birthdays | Design | Pending |

---

## Success Criteria

- [ ] Saturday appointments are no longer hidden by the Bruno frontend
- [ ] Bruno can find and manage appointments from a dedicated operational entry point
- [ ] Future pending sessions no longer pollute the pendency list
- [ ] Bruno can filter overdue pendencies by patient, see the visible overdue total, and select them in bulk
- [ ] Bruno can mark compatible due pendencies as paid in bulk and send reminder actions from that same selection workflow
- [ ] Birthday reminders are visible in the dashboard without interrupting normal work
