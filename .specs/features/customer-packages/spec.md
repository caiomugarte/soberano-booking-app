# Customer Packages Specification

## Problem Statement

Barbers currently create prepaid packages informally: they manually book N separate appointments for a customer who pays upfront for a bundle (e.g. 4 haircuts for R$200). There's no tracking of how many appointments have been consumed, no record of the commercial agreement, and no signal for when to collect payment. This causes friction and lost revenue visibility.

## Goals

- [ ] Barber can create a prepaid package for a customer (total uses + total price)
- [ ] When a booking is created, the barber can select which active package to link it to
- [ ] Barber can see all of a customer's active packages and remaining credits during the booking flow
- [ ] Package status (active/completed) is visible and reflects real usage

## Out of Scope

| Feature | Reason |
|---|---|
| Service-specific packages | User decision — packages apply to any service |
| Package expiry / time-based validity | Not requested; deferred |
| Auto-renewal / recurring packages | Previously deferred in STATE.md |
| Customer-facing package view | Admin-only feature for now |
| Manual credit adjustment | Not requested; deferred |
| Refund flow on cancellation | Not requested; deactivation only removes future bookability |
| Pagination on package list | Barbershop scale (<200 packages); full list acceptable |

---

## User Stories

### P1: Create a Package for a Customer ⭐ MVP

**User Story**: As a barber, I want to create a prepaid package for a customer by setting a number of uses and a total price, so that I can track their prepaid appointments in one place.

**Why P1**: Without this, the entire feature doesn't exist. This is the entry point.

**Acceptance Criteria**:

1. WHEN the barber opens the "Novo Pacote" flow THEN system SHALL show a form with: customer phone (optional), customer name (required), number of uses, total price in R$
2. WHEN the barber submits a valid form THEN system SHALL call `POST /admin/packages` and close the modal on success
3. WHEN the customer phone has ≥10 digits THEN system SHALL auto-lookup the customer name (same debounce pattern as `AdminBookingModal`)
4. WHEN the form is submitted with invalid data (name < 2 chars, uses < 1, price ≤ 0) THEN system SHALL keep the button disabled

**Independent Test**: Open the modal, fill in a new customer's name + 4 uses + R$200 → submit → modal closes → no errors.

---

### P1: Select Active Package During Booking ⭐ MVP

**User Story**: As a barber, I want to see and select which active package to link to a booking when a customer has one or more active packages, so that I have full control over which package is consumed.

**Why P1**: Without this, there is no way to link bookings to packages and the tracking purpose of the feature is lost.

**Acceptance Criteria**:

1. WHEN a customer is looked up by phone in `AdminBookingModal` and they have exactly one active package THEN system SHALL display a package selector pre-selected on that package showing its name/credits (e.g. "Pacote — 2/4 usos")
2. WHEN a customer has two or more active packages THEN system SHALL display all of them as selectable options, none pre-selected
3. WHEN the barber selects a package THEN system SHALL include `packageId` in the `POST /admin/appointments` request body
4. WHEN the barber deselects / clears the package selector THEN system SHALL submit the booking without `packageId`
5. WHEN the customer has no active packages THEN system SHALL show nothing (no UI change from current behavior)
6. WHEN the package lookup is loading THEN system SHALL show nothing (no blocking UI)

**Independent Test**: Look up a customer with 2 active packages → both appear in the selector → select one → submit → request body includes the correct `packageId`.

---

### P2: Entry Point in Dashboard

**User Story**: As a barber, I want a clear button to create a new package from the dashboard, so that I can find the feature without hunting.

**Why P2**: The feature is useless without discoverability, but the exact placement is a UI detail that doesn't block P1 test coverage.

**Acceptance Criteria**:

1. WHEN the barber is on `DashboardPage` THEN system SHALL show a "Novo Pacote" button alongside the existing "Novo Agendamento" button
2. WHEN the barber clicks "Novo Pacote" THEN system SHALL open `AdminPackageModal`

**Independent Test**: Click "Novo Pacote" → modal opens.

---

## Edge Cases

- WHEN phone is not provided (empty) THEN package SHALL be created with `customerPhone: null`
- WHEN API call fails on package creation THEN system SHALL show the error message inline (same pattern as `AdminBookingModal`)
- WHEN the last credit of a selected package is consumed via a booking THEN the package status becomes `completed` — it SHALL disappear from the selector on the next lookup
- WHEN `useAdminCustomerPackages` is called with a phone shorter than 10 digits THEN the query SHALL be disabled (same guard as `useAdminCustomerLookup`)
- WHEN the customer has one active package and the barber does not want to link it THEN they SHALL be able to deselect it and book without a `packageId`

---

### P2: Manage All Packages

**User Story**: As a barber, I want a dedicated section to see all customer packages (active, completed, and cancelled) and deactivate an active package if needed, so that I have full visibility and control over the package program.

**Acceptance Criteria**:

1. WHEN the barber navigates to the Packages page THEN system SHALL display all packages for the tenant sorted by creation date (newest first)
2. WHEN the barber filters by status THEN system SHALL show only packages matching that status
3. WHEN the barber types in the search field THEN system SHALL filter packages by customer name or phone (client-side, no extra request)
4. WHEN the barber clicks "Desativar" on an active package THEN system SHALL show a confirmation prompt; on confirm, set `status = 'cancelled'` and remove it from the booking selector
5. WHEN a package has `status = 'completed'` or `'cancelled'` THEN system SHALL show it read-only with no action button
6. WHEN the barber opens the Packages page THEN system SHALL show a loading state while data is fetching

**Independent Test**: Navigate to Packages → all packages visible → filter to "active" → only active shown → deactivate one → it moves to cancelled in the list.

---

## Backend Requirements

### B1: Create Package — `POST /admin/packages`

**Acceptance Criteria**:

1. WHEN the endpoint receives `{ customerName, customerPhone?, totalUses, totalPriceCents }` THEN system SHALL create a record in `customer_packages` with `status = 'active'` and `usedCount = 0`, scoped to the authenticated tenant
2. WHEN `customerPhone` is absent or blank THEN `customer_phone` SHALL be stored as `NULL`
3. WHEN `customerName` has fewer than 2 characters, OR `totalUses < 1`, OR `totalPriceCents ≤ 0` THEN system SHALL return `400 VALIDATION_ERROR`
4. WHEN creation succeeds THEN system SHALL return `201` with the full `CustomerPackage` object

---

### B2: List Active Packages — `GET /admin/packages?phone={phone}`

**Acceptance Criteria**:

1. WHEN the endpoint is called with a valid `phone` THEN system SHALL return only packages with `status = 'active'` for that phone, scoped to the authenticated tenant
2. WHEN `phone` query param is absent THEN system SHALL return `400 BAD_REQUEST`
3. WHEN no active packages exist for that phone THEN system SHALL return `200 { packages: [] }`

---

### B3: Link Package to Booking — `POST /admin/appointments` (modified)

**Acceptance Criteria**:

1. WHEN the request body contains an optional `packageId` THEN system SHALL validate the package belongs to the authenticated tenant and has `status = 'active'`
2. WHEN the package is valid THEN system SHALL create the appointment with `package_id` set AND increment `used_count` on the package
3. WHEN `used_count + 1 >= total_uses` after increment THEN system SHALL set `status = 'completed'` on the package
4. WHEN `packageId` refers to a package that does not exist OR has `status ≠ 'active'` THEN system SHALL return `400 VALIDATION_ERROR` and NOT create the appointment
5. WHEN `packageId` is absent THEN appointment creation SHALL behave identically to the current implementation

---

### B4: List All Packages — `GET /admin/packages` (extended)

**Acceptance Criteria**:

1. WHEN called **without** `phone` THEN system SHALL return all packages for the tenant, sorted by `createdAt` descending
2. WHEN called with `?status=active|completed|cancelled` THEN system SHALL filter by that status
3. WHEN called with `?phone=xxx` THEN existing behavior is preserved (active-only, for that phone — unchanged)
4. Response shape: `200 { packages: CustomerPackage[] }`

---

### B5: Deactivate Package — `PATCH /admin/packages/:id/deactivate`

**Acceptance Criteria**:

1. WHEN called with a valid `id` belonging to the authenticated tenant with `status = 'active'` THEN system SHALL set `status = 'cancelled'` and return `200` with the updated package
2. WHEN the package does not exist or belongs to a different tenant THEN system SHALL return `404`
3. WHEN the package already has `status = 'completed'` or `'cancelled'` THEN system SHALL return `400 VALIDATION_ERROR`

---

## Requirement Traceability

| Requirement ID | Story | Phase | Status |
|---|---|---|---|
| PKG-01 | P1: Create Package — form fields | Design | Pending |
| PKG-02 | P1: Create Package — submit & close | Design | Pending |
| PKG-03 | P1: Create Package — customer auto-lookup | Design | Pending |
| PKG-04 | P1: Create Package — form validation | Design | Pending |
| PKG-05 | P1: Package selector — single package pre-selected | Design | Pending |
| PKG-06 | P1: Package selector — multiple packages, none pre-selected | Design | Pending |
| PKG-07 | P1: Pass packageId on booking submit | Design | Pending |
| PKG-08 | P1: Allow booking without packageId (deselect) | Design | Pending |
| PKG-09 | P2: Dashboard entry point | Design | Pending |
| BKD-01 | B1: Create package — DB record + tenant scope | Design | Pending |
| BKD-02 | B1: Create package — null phone | Design | Pending |
| BKD-03 | B1: Create package — input validation | Design | Pending |
| BKD-04 | B1: Create package — 201 response | Design | Pending |
| BKD-05 | B2: List active packages by phone | Design | Pending |
| BKD-06 | B2: Missing phone → 400 | Design | Pending |
| BKD-07 | B3: Validate packageId on appointment creation | Design | Pending |
| BKD-08 | B3: Increment usedCount + link appointment | Design | Pending |
| BKD-09 | B3: Status transitions to completed | Design | Pending |
| BKD-10 | B3: Invalid/inactive packageId → 400, no appointment created | Design | Pending |
| BKD-11 | B3: Absent packageId → no regression | Design | Pending |
| MGT-01 | P2: Packages page — list all packages | Design | Pending |
| MGT-02 | P2: Packages page — filter by status | Design | Pending |
| MGT-03 | P2: Packages page — search by name/phone | Design | Pending |
| MGT-04 | P2: Packages page — deactivate with confirmation | Design | Pending |
| MGT-05 | P2: Packages page — navigation entry point | Design | Pending |
| BKD-12 | B4: List all packages without phone filter | Design | Pending |
| BKD-13 | B4: Optional status filter | Design | Pending |
| BKD-14 | B4: phone param preserves existing behavior | Design | Pending |
| BKD-15 | B5: Deactivate active package → cancelled | Design | Pending |
| BKD-16 | B5: Deactivate non-owned or missing → 404 | Design | Pending |
| BKD-17 | B5: Deactivate already completed/cancelled → 400 | Design | Pending |

---

## Success Criteria

- [ ] Barber can create a package for a new or existing customer in under 30 seconds
- [ ] All active packages for a customer are visible before confirming a booking
- [ ] `packageId` is included in the booking request only when the barber explicitly selects a package
- [ ] Zero regressions in the existing `AdminBookingModal` booking flow (no package = identical behavior)
- [ ] Barber can see all packages (any status) from a dedicated page
- [ ] Barber can deactivate an active package; it immediately disappears from the booking selector
- [ ] `cancelled` packages are visible in the management page but cannot be re-activated
