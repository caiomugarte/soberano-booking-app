# Customer Packages Specification

## Problem Statement

Soberano already supports prepaid packages, but the management flow is still fragmented:

- the barber creates a package in one place and then has to book each usage separately elsewhere
- the Packages page is tenant-wide instead of provider-owned
- package bookings are hard to inspect and manage without hunting through the daily or weekly dashboard
- package status flips to `completed` as soon as all credits are booked, even when future package appointments still exist

This creates operational friction and makes the package page unreliable as the source of truth for each provider.

## Goals

- [ ] Provider can create a prepaid package for a customer with total uses and total price
- [ ] Provider can immediately schedule package usages right after package creation
- [ ] Provider can schedule remaining usages later from the Packages page
- [ ] Packages are owned and managed only by the provider who created them
- [ ] Provider can inspect package booking dates and manage linked appointments directly from the package flow
- [ ] Package status remains active until the last booked usage is no longer a future appointment
- [ ] Packages page opens focused on active packages first, reducing noise
- [ ] Provider receives a WhatsApp reminder to collect package payment when the final package appointment is completed

## Out of Scope

| Feature | Reason |
|---|---|
| Service-specific packages | User decision — packages apply to any service |
| Package expiry / time-based validity | Not requested; deferred |
| Auto-renewal / recurring packages | Previously deferred in STATE.md |
| Customer-facing package view | Admin-only feature for now |
| Manual credit adjustment | Not requested; deferred |
| Automatic credit restoration on cancelled package bookings | Not requested in this scope; package lifecycle is corrected, but credit policy remains unchanged |
| Package payment status tracking or receivables workflow | Not requested; current ask is reminder-only, not a billing ledger |
| Cross-provider package sharing or reassignment | New rule is the opposite: packages are provider-owned |
| Pagination on package list | Barbershop scale (<200 packages); full list acceptable |

---

## User Stories

### P1: Create a Package and Continue Scheduling ⭐ MVP

**User Story**: As a provider, I want to create a prepaid package and immediately continue into package booking, so that I do not need to leave the flow and re-open another modal for each usage.

**Why P1**: This removes the biggest friction in the current flow and makes package creation usable in practice.

**Acceptance Criteria**:

1. WHEN the provider opens the "Novo Pacote" flow THEN system SHALL show a form with: customer phone (optional), customer name (required), number of uses, total price in R$
2. WHEN the customer phone has ≥10 digits THEN system SHALL auto-lookup the customer name using the same debounce pattern as `AdminBookingModal`
3. WHEN the form is submitted with invalid data (name < 2 chars, uses < 1, price ≤ 0) THEN system SHALL keep the primary action disabled
4. WHEN the provider submits a valid form THEN system SHALL call `POST /admin/packages`
5. WHEN package creation succeeds THEN system SHALL keep the provider inside the package flow and offer immediate scheduling for the newly created package instead of forcing a return to the dashboard first
6. WHEN the provider schedules one package usage from that post-create flow THEN the booking SHALL be created with the new package already linked via `packageId`
7. WHEN the provider wants to stop before scheduling every usage THEN they SHALL be able to close the flow, and the remaining usages SHALL stay available for later booking from the Packages page

**Independent Test**: Create a 4-use package, book 2 usages immediately, close the flow, then confirm the package still shows 2 remaining usages on the Packages page.

---

### P1: Select Active Package During Booking ⭐ MVP

**User Story**: As a provider, I want to see and select which active package to link to a booking when a customer has one or more active packages that belong to me, so that I have full control over which package is consumed.

**Why P1**: Without this, there is no reliable way to link bookings to the correct provider-owned package.

**Acceptance Criteria**:

1. WHEN a customer is looked up by phone in `AdminBookingModal` and they have exactly one active package owned by the authenticated provider THEN system SHALL display a package selector pre-selected on that package
2. WHEN a customer has two or more active packages owned by the authenticated provider THEN system SHALL display all of them as selectable options and SHALL not auto-select any of them
3. WHEN the provider selects a package THEN system SHALL include `packageId` in the `POST /admin/appointments` request body
4. WHEN the provider deselects or clears the package selector THEN system SHALL submit the booking without `packageId`
5. WHEN the customer has no active packages for the authenticated provider THEN system SHALL show no package UI and SHALL preserve the current booking flow
6. WHEN an admin booking is created with `packageId` THEN the customer WhatsApp confirmation SHALL omit the self-service cancel/change link and send only the confirmation details
7. WHEN an admin booking is created without `packageId` THEN the existing admin manual booking WhatsApp behavior SHALL remain unchanged

**Independent Test**: Look up a customer with 2 active packages owned by the logged-in provider, select one, submit the booking, and confirm the request body includes the chosen `packageId`.

---

### P2: Entry Point in Dashboard

**User Story**: As a provider, I want a clear dashboard entry point for package management, so that I can find the flow without hunting.

**Acceptance Criteria**:

1. WHEN the provider is on `DashboardPage` THEN system SHALL show a "Novo Pacote" button alongside the existing "Novo Agendamento" button
2. WHEN the provider clicks "Novo Pacote" THEN system SHALL open the package creation flow
3. WHEN the provider opens the barber profile dropdown THEN system SHALL see a "Pacotes" entry that navigates to the Packages page

**Independent Test**: Click "Novo Pacote" from the dashboard, then navigate to "Pacotes" from the dropdown.

---

### P2: Manage Provider Packages

**User Story**: As a provider, I want the Packages page to show only my packages and prioritize active ones, so that I can focus on the packages I still need to service.

**Acceptance Criteria**:

1. WHEN the provider opens the Packages page THEN system SHALL show only packages owned by the authenticated provider
2. WHEN the Packages page opens for the first time THEN system SHALL default to active packages instead of showing every package immediately
3. WHEN the provider changes the status filter THEN system SHALL allow switching between active, completed, cancelled, and all packages
4. WHEN the provider types in the search field THEN system SHALL filter the visible packages by customer name or phone without requiring a new request
5. WHEN a package is active and still has remaining usages THEN the package card SHALL expose an "Agendar uso" action
6. WHEN a package is active THEN the package card SHALL still allow deactivation with confirmation that warns future linked appointments will be cancelled while past appointments remain unchanged
7. WHEN a package is completed or cancelled THEN the package card SHALL remain visible but read-only for lifecycle actions

**Independent Test**: Open Packages, confirm only active packages are shown first, switch to "Todos", search by customer name, and confirm package cards expose actions consistent with the package state.

---

### P2: View and Manage Package Booking Details

**User Story**: As a provider, I want to open a package and see all linked bookings in one place, so that I can manage package dates without searching through the agenda.

**Acceptance Criteria**:

1. WHEN the provider opens a package from the Packages page THEN system SHALL show package details including customer info, total uses, used count, remaining uses, status, and linked bookings
2. WHEN linked package bookings exist THEN system SHALL list them in the package details view with date, time, service, and appointment status
3. WHEN the package still has remaining usages THEN the package details view SHALL allow the provider to schedule another usage from there
4. WHEN a linked appointment needs to be managed THEN the provider SHALL be able to use the same operational actions already available in the admin dashboard without leaving the package context
5. WHEN the provider closes the package details view after making changes THEN the Packages page SHALL refresh the package summary and linked-booking information

**Independent Test**: Open a package with existing bookings, reschedule one linked booking from the package details view, and confirm the updated date appears there without using the daily or weekly dashboard.

---

### P2: Package Status Reflects Real Lifecycle

**User Story**: As a provider, I want package status to remain active while future package appointments still exist, so that the package page reflects reality instead of looking finished too early.

**Acceptance Criteria**:

1. WHEN a package still has remaining usages THEN its status SHALL be `active`
2. WHEN a package has no remaining usages but still has future non-cancelled linked appointments THEN its status SHALL remain `active`
3. WHEN a package has no remaining usages and no future non-cancelled linked appointments left THEN its status SHALL become `completed`
4. WHEN a package is manually deactivated THEN its status SHALL become `cancelled`, any future linked confirmed appointments SHALL be cancelled as part of the same action, and linked appointments that already happened SHALL remain unchanged
5. WHEN the Packages page is filtered to active packages THEN packages that are fully booked but still have future linked appointments SHALL still appear there

**Independent Test**: Fully book a package with two future appointments, verify it still appears as active, then verify it moves to completed only after the last future booking is no longer pending in the future. Also deactivate a package with one future linked appointment and one past linked appointment, and verify the package becomes cancelled, the future appointment is cancelled, and the past appointment remains unchanged.

---

### P2: Remind the Provider to Collect Package Payment

**User Story**: As a provider, I want a reminder when the last package appointment is completed, so that I remember to ask the customer to pay for the package.

**Why P2**: This is a business follow-up tied to the end of the package lifecycle and should happen automatically inside the same provider-managed flow.

**Acceptance Criteria**:

1. WHEN a package-linked appointment is marked `completed` and that action makes the package transition from `active` to `completed` THEN system SHALL send a WhatsApp reminder to the package owner/provider to collect the package payment
2. WHEN that reminder is sent THEN it SHALL include at least the customer name and the package total price
3. WHEN the package reaches `completed` because future bookings were cancelled, marked `no_show`, deleted, or manually deactivated instead of a final completed appointment THEN system SHALL NOT send the payment reminder
4. WHEN the provider has no phone configured THEN system SHALL skip the reminder without failing the appointment status update

**Independent Test**: Mark the final linked appointment of a fully allocated package as `completed`, verify the package transitions to completed, and verify the provider receives the payment reminder. Repeat with `no_show` and verify no reminder is sent.

---

### P2: Packages Are Provider-Owned

**User Story**: As a provider, I want packages to be private to the provider who created them, so that one provider cannot manage another provider's commercial agreements.

**Acceptance Criteria**:

1. WHEN a provider creates a package THEN the package SHALL be assigned to that authenticated provider
2. WHEN a different provider opens the Packages page THEN they SHALL NOT see packages created by another provider
3. WHEN a different provider looks up a customer in `AdminBookingModal` THEN they SHALL NOT see another provider's packages in the selector
4. WHEN a provider tries to open details, deactivate, or book against a package owned by another provider THEN system SHALL deny the action

**Independent Test**: Create a package as Provider A, log in as Provider B, and confirm the package is absent from both the Packages page and the booking selector.

---

## Edge Cases

- WHEN phone is not provided THEN the package SHALL be created with `customerPhone: null`
- WHEN package creation fails THEN system SHALL show the server error inline in the package flow
- WHEN the provider closes the post-create package flow without scheduling any usage THEN the package SHALL still exist and remain available on the Packages page
- WHEN the provider closes the post-create package flow after scheduling some but not all usages THEN the package SHALL remain active with the correct remaining count
- WHEN `useAdminCustomerPackages` is called with a phone shorter than 10 digits THEN the query SHALL remain disabled
- WHEN a package-linked booking is created from the package page instead of `AdminBookingModal` THEN the same no-link WhatsApp rule SHALL still apply because the booking is linked by `packageId`
- WHEN a package is fully booked but still has future linked appointments THEN the web UI SHALL continue presenting it as active
- WHEN a package is deactivated and some linked appointments are already in the past THEN those past appointments SHALL remain unchanged and SHALL NOT be included in the deactivation warning copy
- WHEN a package is deactivated and some linked appointments are still future confirmed bookings THEN those future bookings SHALL be cancelled so later reminder jobs no longer treat them as upcoming active appointments
- WHEN the final package appointment is merely in the past but has not been explicitly marked `completed` in the admin flow THEN the provider payment reminder SHALL NOT fire yet in this scope

---

## Backend Requirements

### B1: Create Provider-Owned Package — `POST /admin/packages`

**Acceptance Criteria**:

1. WHEN the endpoint receives `{ customerName, customerPhone?, totalUses, totalPriceCents }` THEN system SHALL create a record in `customer_packages` with `status = 'active'`, `usedCount = 0`, and `providerId = request.providerId`
2. WHEN `customerPhone` is absent or blank THEN `customer_phone` SHALL be stored as `NULL`
3. WHEN `customerName` has fewer than 2 characters, OR `totalUses < 1`, OR `totalPriceCents ≤ 0` THEN system SHALL return `400 VALIDATION_ERROR`
4. WHEN creation succeeds THEN system SHALL return `201` with the full provider-owned `CustomerPackage` object

---

### B2: List Active Packages by Phone — `GET /admin/packages?phone={phone}`

**Acceptance Criteria**:

1. WHEN the endpoint is called with `phone` THEN system SHALL return only active packages for that phone owned by the authenticated provider
2. WHEN no active provider-owned packages exist for that phone THEN system SHALL return `200 { packages: [] }`
3. WHEN the same customer has packages owned by another provider THEN those packages SHALL NOT be included in this response

---

### B3: Link Package to Booking — `POST /admin/appointments` (modified)

**Acceptance Criteria**:

1. WHEN the request body contains `packageId` THEN system SHALL validate that the package belongs to the authenticated provider and is not cancelled
2. WHEN the package is valid THEN system SHALL create the appointment with `package_id` set and increment `used_count` on the package
3. WHEN the booking consumes the last remaining usage but the package still has future non-cancelled linked appointments THEN system SHALL keep the package status as `active`
4. WHEN `packageId` refers to a package that does not exist, belongs to a different provider, or is not usable THEN system SHALL return `400 VALIDATION_ERROR` and SHALL NOT create the appointment
5. WHEN `packageId` is present AND the booking has a customer phone THEN the confirmation WhatsApp message SHALL omit the self-service cancel/change link
6. WHEN `packageId` is absent THEN appointment creation SHALL behave identically to the current implementation

---

### B4: List Provider Packages — `GET /admin/packages`

**Acceptance Criteria**:

1. WHEN called without `phone` THEN system SHALL return only packages owned by the authenticated provider
2. WHEN called with `?status=active|completed|cancelled` THEN system SHALL filter within that provider-owned package set
3. WHEN called with `?phone=xxx` THEN the active-by-phone behavior from B2 SHALL be preserved
4. Response shape SHALL support the Packages page summary view without requiring tenant-wide leakage

---

### B5: Package Details and Linked Bookings

**Acceptance Criteria**:

1. WHEN the provider opens a package details view THEN system SHALL expose the bookings linked to that package for the authenticated provider
2. WHEN linked bookings are returned THEN each item SHALL include the data needed to render and manage the booking from the package context: appointment id, date, start/end time, status, service summary, customer summary, and package progress metadata when relevant
3. WHEN the package belongs to another provider THEN the details request SHALL return `404` or an equivalent access-denied response

Note: The exact endpoint shape can be finalized in design, but the current web contracts do not expose enough package-specific booking data for this feature.

---

### B6: Deactivate Package — `PATCH /admin/packages/:id/deactivate`

**Acceptance Criteria**:

1. WHEN called with a valid active package owned by the authenticated provider THEN system SHALL cancel any linked appointments that are still future `confirmed` bookings, set `status = 'cancelled'`, and return the updated package
2. WHEN linked appointments are already in the past, or already `cancelled`, `completed`, or `no_show`, THEN system SHALL leave them unchanged during package deactivation
3. WHEN future linked appointments are cancelled by package deactivation THEN later customer and barber reminder jobs SHALL no longer treat them as upcoming active bookings
4. WHEN the package does not exist or belongs to a different provider THEN system SHALL return `404`
5. WHEN the package is already completed or cancelled THEN system SHALL return `400 VALIDATION_ERROR`

---

### B7: Package Lifecycle Status Evaluation

**Acceptance Criteria**:

1. WHEN package-linked appointments are created, updated, cancelled, completed, marked no-show, or deleted THEN system SHALL reevaluate package status using both remaining usages and future linked appointments
2. WHEN `usedCount < totalUses` THEN package SHALL remain `active`
3. WHEN `usedCount >= totalUses` AND at least one future non-cancelled linked appointment still exists THEN package SHALL remain `active`
4. WHEN `usedCount >= totalUses` AND no future non-cancelled linked appointments remain THEN package SHALL become `completed`

---

### B8: Provider Payment Reminder on Final Package Completion

**Acceptance Criteria**:

1. WHEN a package-linked appointment status is updated to `completed` and package reevaluation transitions that package from `active` to `completed` THEN system SHALL send a WhatsApp reminder to the owning provider to collect payment for the package
2. WHEN the reminder is sent THEN it SHALL include at least the customer name and the package total price
3. WHEN the package becomes `completed` through `cancelled`, `no_show`, deletion, or manual deactivation paths THEN system SHALL NOT send the payment reminder
4. WHEN the provider has no phone configured, or WhatsApp delivery is unavailable, THEN system SHALL skip or log the reminder failure without failing the appointment mutation response

---

## Requirement Traceability

| Requirement ID | Story | Phase | Status |
|---|---|---|---|
| PKG-01 | P1: Package creation form fields | Design | Pending |
| PKG-02 | P1: Customer auto-lookup in package flow | Design | Pending |
| PKG-03 | P1: Package form validation | Design | Pending |
| PKG-04 | P1: Create package via admin flow | Design | Pending |
| PKG-05 | P1: Continue into post-create scheduling | Design | Pending |
| PKG-06 | P1: Book package usages immediately after creation | Design | Pending |
| PKG-07 | P1: Allow leaving with remaining usages unscheduled | Design | Pending |
| PKG-08 | P1: Single active package pre-selected in booking | Design | Pending |
| PKG-09 | P1: Multiple active packages require explicit choice | Design | Pending |
| PKG-10 | P1: Include `packageId` only when selected | Design | Pending |
| PKG-11 | P1: Allow booking without package link | Design | Pending |
| PKG-12 | P1: Package-linked booking omits self-service link | Design | Pending |
| PKG-13 | P1: Non-package booking keeps current confirmation | Design | Pending |
| PKG-14 | P2: Dashboard and navigation entry points | Design | Pending |
| MGT-01 | P2: Packages page is provider-owned | Design | Pending |
| MGT-02 | P2: Active packages shown first by default | Design | Pending |
| MGT-03 | P2: Status filters on Packages page | Design | Pending |
| MGT-04 | P2: Search by customer name or phone | Design | Pending |
| MGT-05 | P2: Schedule remaining usage from package page | Design | Pending |
| MGT-06 | P2: Open package details with linked bookings | Design | Pending |
| MGT-07 | P2: Manage linked bookings from package context | Design | Pending |
| MGT-08 | P2: Deactivate active package | Design | Pending |
| OWN-01 | P2: Package assigned to authenticated provider on create | Design | Pending |
| OWN-02 | P2: Provider only sees own packages | Design | Pending |
| OWN-03 | P2: Cross-provider package management denied | Design | Pending |
| LIFE-01 | P2: Package stays active while remaining uses exist | Design | Pending |
| LIFE-02 | P2: Fully booked package stays active while future bookings exist | Design | Pending |
| LIFE-03 | P2: Package completes only after future lifecycle is resolved | Design | Pending |
| PAY-01 | P2: Provider reminded to collect package payment on final completion | Design | Pending |
| BKD-01 | B1: Create package with provider ownership | Design | Pending |
| BKD-02 | B1: Blank phone stored as null | Design | Pending |
| BKD-03 | B1: Validation errors on bad input | Design | Pending |
| BKD-04 | B1: 201 response with package payload | Design | Pending |
| BKD-05 | B2: Active-by-phone list scoped to provider | Design | Pending |
| BKD-06 | B2: Empty list when no provider-owned packages exist | Design | Pending |
| BKD-07 | B3: Validate `packageId` ownership and usability | Design | Pending |
| BKD-08 | B3: Link appointment and increment used count | Design | Pending |
| BKD-09 | B3/B7: Do not complete package too early | Design | Pending |
| BKD-10 | B3: Reject invalid or cross-provider package usage | Design | Pending |
| BKD-11 | B3: No regression when `packageId` is absent | Design | Pending |
| BKD-12 | B4: List provider packages without tenant leakage | Design | Pending |
| BKD-13 | B4: Optional status filter | Design | Pending |
| BKD-14 | B4: Preserve active-by-phone behavior | Design | Pending |
| BKD-15 | B5: Expose package-linked booking details | Design | Pending |
| BKD-16 | B5: Block details access across providers | Design | Pending |
| BKD-17 | B6: Deactivate active provider-owned package | Design | Pending |
| BKD-18 | B6: 404 for missing or non-owned package | Design | Pending |
| BKD-19 | B6: 400 for already completed/cancelled package | Design | Pending |
| BKD-20 | B7: Reevaluate lifecycle on package-linked booking mutations | Design | Pending |
| BKD-21 | B8: Send provider payment reminder on active-to-completed transition | Design | Pending |
| BKD-22 | B8: Reminder includes customer name and package total price | Design | Pending |
| BKD-23 | B8: No reminder for no_show/cancelled/delete/deactivate completion paths | Design | Pending |
| BKD-24 | B8: Reminder failure does not fail appointment mutation | Design | Pending |

---

## Success Criteria

- [ ] Provider can create a package and immediately book one or more usages without reopening another flow
- [ ] Remaining package usages can also be booked later from the Packages page
- [ ] `packageId` is included in the booking request only when the provider explicitly selects or schedules within a package flow
- [ ] Package-linked admin bookings keep the provider-managed WhatsApp behavior with no self-service link
- [ ] Providers only see and manage their own packages
- [ ] Providers can inspect linked package bookings and manage them from the package context instead of searching the agenda
- [ ] Packages page defaults to active packages and reduces information overload on first open
- [ ] Fully booked packages remain active until the last future linked booking is no longer pending in the future
- [ ] When the last package appointment is marked `completed`, the provider receives a payment-collection reminder with the package amount
