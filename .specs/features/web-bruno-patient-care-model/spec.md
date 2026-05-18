# Web Bruno Patient Care Model Specification

## Problem Statement

The Bruno psychology flow still models session value from the service, even though psychotherapy pricing is negotiated per patient and remains stable across that patient's journey. The patient record also lacks the core profile fields Bruno needs in practice: care mode, psychotherapy cadence, birth date, and address. This keeps the frontend misaligned with the real clinic workflow and blocks birthday awareness on the dashboard.

## Goals

- [ ] Each patient has exactly one active care mode: `psychotherapy` or `neuromodulation`
- [ ] Patient registration captures the profile fields Bruno needs for the chosen care mode
- [ ] Psychotherapy sessions default from the patient's agreed price and cadence instead of a service price
- [ ] Existing appointment value snapshots remain historically stable when the patient agreement changes
- [ ] Bruno can see today's birthdays from patient birth dates

## Out of Scope

| Feature | Reason |
|---|---|
| Neuromodulation protocol credit management | Split into `web-bruno-neuromodulation-protocols` |
| Bulk pendency operations and appointment management menu | Split into `web-bruno-operations-hub` |
| Automated birthday WhatsApp messages | In-app awareness is enough for this phase |
| Installment billing or contract history for psychotherapy agreements | Not requested |
| Preserving legacy psychology labels like `couple` and `family` in the Bruno UI | The staging vertical will move to the new taxonomy |

---

## User Stories

### P1: Capture the Real Patient Model ⭐ MVP

**User Story**: As Bruno, I want each patient record to reflect the real treatment mode and profile details, so that the register matches how I actually manage psychotherapy and neuromodulation patients.

**Why P1**: Every later psychology flow depends on this foundation. Without it, price, cadence, birthdays, and protocol management keep using the wrong source of truth.

**Acceptance Criteria**:

1. WHEN Bruno creates or edits a patient THEN the system SHALL require exactly one `careMode` value: `psychotherapy` or `neuromodulation`
2. WHEN the selected `careMode` is `psychotherapy` THEN the patient form SHALL capture an agreed session price and a frequency value of `weekly` or `biweekly`
3. WHEN the selected `careMode` is `neuromodulation` THEN the patient form SHALL not require psychotherapy-only commercial fields to save the patient
4. WHEN Bruno creates or edits a patient THEN the form SHALL capture `birthDate` and `address` in the patient register
5. WHEN Bruno opens a patient detail page THEN the selected care mode and stored profile fields SHALL be visible in the patient information surface
6. WHEN a patient changes care mode later THEN the system SHALL stop applying incompatible defaults from the previous mode without rewriting historical appointments

**Independent Test**: Create one psychotherapy patient and one neuromodulation patient, then confirm each record shows the expected fields and saved mode in the detail page.

---

### P1: Psychotherapy Price and Cadence Come from the Patient ⭐ MVP

**User Story**: As Bruno, I want psychotherapy sessions to default from the patient's negotiated agreement, so that I do not need to keep correcting the same price and frequency on every booking.

**Why P1**: This is the business rule that most directly breaks the current service-driven psychology model.

**Acceptance Criteria**:

1. WHEN the Bruno psychology tenant loads scheduling types THEN the supported scheduling taxonomy SHALL be `psychotherapy` and `neuromodulation`
2. WHEN Bruno opens the appointment form for a psychotherapy patient THEN the session value SHALL default from that patient's agreed session price
3. WHEN a psychotherapy patient has `weekly` frequency THEN the recurrence UI SHALL prefill weekly cadence; WHEN the frequency is `biweekly` THEN it SHALL prefill biweekly cadence
4. WHEN Bruno changes a patient's agreed session price THEN existing appointments SHALL keep their stored `priceCents` snapshot unchanged
5. WHEN Bruno creates a new psychotherapy session after the patient agreement changes THEN the new default value SHALL use the updated patient agreement
6. WHEN Bruno opens the appointment form for a neuromodulation patient THEN the psychotherapy price and cadence defaults SHALL NOT be auto-applied

**Independent Test**: Save a psychotherapy patient with an agreed price, create one session, change the patient's agreed price, then create another session and confirm only the new session uses the updated default.

---

### P2: Birthday Awareness on the Dashboard

**User Story**: As Bruno, I want the dashboard to warn me when today is a patient's birthday, so that I can notice and act on it without manually checking patient records.

**Why P2**: The clinic asked for a reminder, but it depends on the patient foundation being in place first.

**Acceptance Criteria**:

1. WHEN the dashboard loads and one or more active patients have `birthDate` matching today's local date THEN the system SHALL show a non-blocking birthday reminder surface
2. WHEN multiple patients have birthdays today THEN the reminder surface SHALL list all of them
3. WHEN no patients have birthdays today THEN the dashboard SHALL not show a birthday reminder
4. WHEN Bruno dismisses the reminder during the current page visit THEN the system SHALL keep the rest of the dashboard usable without blocking interactions

**Independent Test**: Save a patient whose birthday is today, open the dashboard, and confirm the reminder appears with the patient's name.

---

## Edge Cases

- WHEN Bruno tries to save a patient without a `careMode` THEN the system SHALL block the save with validation feedback
- WHEN Bruno tries to create a psychotherapy session for a patient with no agreed price yet THEN the system SHALL require Bruno to enter a valid session value before saving
- WHEN a patient has no stored frequency THEN the appointment form SHALL stay editable and SHALL NOT force recurrence
- WHEN a patient birth date is missing from legacy staging data THEN the birthday reminder SHALL ignore that patient until the register is completed
- WHEN a historical appointment still references a legacy psychology service row during staging cleanup THEN the migration or normalization step SHALL map it into the supported scheduling taxonomy before the Bruno UI consumes it

---

## Requirement Traceability

| Requirement ID | Story | Phase | Status |
|---|---|---|---|
| PCM-01 | P1: Require one care mode per patient | Design | Pending |
| PCM-02 | P1: Capture psychotherapy agreed price | Design | Pending |
| PCM-03 | P1: Capture psychotherapy frequency | Design | Pending |
| PCM-04 | P1: Capture birth date and address | Design | Pending |
| PCM-05 | P1: Show care model fields in patient detail | Design | Pending |
| PCM-06 | P1: Ignore incompatible defaults after care mode change | Design | Pending |
| PCM-07 | P1: Replace psychology scheduling taxonomy with psychotherapy/neuromodulation | Design | Pending |
| PCM-08 | P1: Default psychotherapy session value from patient agreement | Design | Pending |
| PCM-09 | P1: Default recurrence cadence from patient frequency | Design | Pending |
| PCM-10 | P1: Keep historical appointment price snapshots unchanged | Design | Pending |
| PCM-11 | P1: Use updated patient agreement only for future sessions | Design | Pending |
| PCM-12 | P1: Skip psychotherapy defaults for neuromodulation patients | Design | Pending |
| PCM-13 | P2: Show dashboard birthday reminder for today's patients | Design | Pending |
| PCM-14 | P2: Support multiple birthdays in one reminder surface | Design | Pending |
| PCM-15 | P2: Keep dashboard clean when there are no birthdays | Design | Pending |

---

## Success Criteria

- [ ] Bruno can register a psychotherapy patient with agreed price, frequency, birth date, and address in a single flow
- [ ] Bruno can register a neuromodulation patient without being forced through psychotherapy-specific pricing fields
- [ ] New psychotherapy sessions no longer depend on a service price to get the default value right
- [ ] Changing a patient's agreement affects only future session defaults
- [ ] The dashboard can surface today's birthdays using real patient data
