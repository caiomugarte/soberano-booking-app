# Customer Packages Tasks

**Spec**: `.specs/features/customer-packages/spec.md`
**Design**: `.specs/features/customer-packages/design.md`
**Status**: Draft
**Scope**: Provider-owned management expansion. The original package MVP is already in the product; these tasks cover the follow-up management flow requested on 2026-05-27.

---

## Execution Plan

### Phase 1 — Data ownership and lifecycle foundation (Sequential)

```text
T1 → T2 → T3
```

### Phase 2 — Provider-scoped package API (Sequential)

```text
T3 → T4 → T5
```

### Phase 3 — Web contract layer (Sequential)

```text
T4 → T6
```

### Phase 4 — Web component foundation (Parallel OK)

```text
T6 complete, then:
  ├── T7 [P]
  ├── T9 [P]
  ├── T10 [P]
  └── T11 [P]
```

### Phase 5 — Package flow integration (Sequential)

```text
T7 → T8
T7 + T10 + T11 → T12
```

### Phase 6 — Verification (Sequential)

```text
T5 + T8 + T9 + T12 → T13
```

---

## Task Breakdown

### T1: Add provider ownership to `CustomerPackage` persistence and migrate existing rows

**What**: Extend the package schema so each package belongs to a specific provider, and create the migration/backfill needed to enforce that ownership on existing data.
**Where**:
- `packages/api/prisma/schema.prisma`
- `packages/api/prisma/migrations/...`

**Depends on**: None
**Reuses**: Existing `Provider` relations already present on `Appointment`, `Absence`, and other provider-scoped models
**Requirement**: OWN-01, BKD-01

**Done when**:
- [ ] `CustomerPackage` has a required `providerId` relation to `Provider`
- [ ] The package indexes support provider-scoped queries (`tenantId`, `providerId`, `status`, `customerPhone`)
- [ ] A migration exists that adds `provider_id` to `customer_packages`
- [ ] Existing package rows are backfilled with a valid provider ownership strategy, or the migration includes an explicit remediation step so production data is not left in an invalid null-owner state
- [ ] `cd packages/api && npx prisma validate` exits 0
- [ ] `cd packages/api && npx prisma generate` exits 0

**Commit**: `feat(api): add provider ownership to customer packages`

---

### T2: Extend package domain and repository contracts for provider scope, details, and lifecycle evaluation

**What**: Update the package entity and repository interface so the application layer can create provider-owned packages, query only the authenticated provider's packages, load package details with linked bookings, and reevaluate lifecycle status.
**Where**:
- `packages/api/src/domain/entities/customer-package.ts`
- `packages/api/src/domain/repositories/customer-package.repository.ts`
- `packages/api/src/infrastructure/database/repositories/prisma-customer-package.repository.ts`

**Depends on**: T1
**Reuses**: Existing Prisma repository pattern and linked-appointment include patterns already used in `PrismaAppointmentRepository`
**Requirement**: OWN-01, OWN-02, OWN-03, LIFE-01, LIFE-02, LIFE-03, BKD-05, BKD-07, BKD-12, BKD-15, BKD-20

**Done when**:
- [ ] `CustomerPackageEntity` includes `providerId`
- [ ] `CustomerPackageRepository.create()` accepts `providerId`
- [ ] Active-by-phone queries are scoped to `tenantId + providerId + phone`
- [ ] The repository exposes a provider-scoped package list method used by the Packages page
- [ ] The repository exposes a provider-scoped package details method that includes linked booking summaries
- [ ] The repository exposes a lifecycle reevaluation method that derives `active` vs `completed` from both `usedCount` and future non-cancelled linked appointments
- [ ] The implementation no longer hard-completes a package only because `usedCount >= totalUses`
- [ ] `cd packages/api && npx tsc --noEmit` exits 0

**Commit**: `feat(api): add provider-scoped package repository contracts`

---

### T3: Reevaluate package lifecycle on package-linked appointment mutations

**What**: Centralize package lifecycle reevaluation in the admin booking flow so package status stays correct after package-linked creates, schedule edits, cancellations, deletes, and status changes.
**Where**:
- `packages/api/src/application/use-cases/booking/admin-create-appointment.ts`
- `packages/api/src/http/routes/admin.routes.ts`
- any package-aware helper introduced alongside T2

**Depends on**: T2
**Reuses**: Existing admin appointment mutation flows in `admin.routes.ts` and the current package-link notification behavior already present in `AdminCreateAppointment`
**Requirement**: LIFE-01, LIFE-02, LIFE-03, BKD-07, BKD-08, BKD-09, BKD-10, BKD-11, BKD-20, PKG-12, PKG-13

**Done when**:
- [ ] Package-linked creation still increments `usedCount`, but package status is derived through the shared lifecycle evaluator instead of immediate hard completion
- [ ] Provider-owned package validation happens before appointment creation when `packageId` is present
- [ ] Lifecycle reevaluation runs after package-linked appointment cancel, delete, status mutation, and schedule mutation when the future-booking state could change
- [ ] Non-package appointment mutations keep their current behavior
- [ ] The package-linked WhatsApp confirmation still omits the self-service block, while non-package bookings keep the existing confirmation template
- [ ] `cd packages/api && npx tsc --noEmit` exits 0

**Commit**: `feat(api): sync package lifecycle with admin appointment mutations`

---

### T4: Expose provider-scoped package routes and a package details endpoint

**What**: Update the admin package routes so create/list/deactivate operations are provider-scoped, and add a package details endpoint for the package workspace modal.
**Where**:
- `packages/api/src/http/routes/admin.routes.ts`

**Depends on**: T3
**Reuses**: Existing authenticated provider context from `authGuard`, existing `createPackageSchema`, and the current package route structure already in `admin.routes.ts`
**Requirement**: BKD-01, BKD-04, BKD-05, BKD-06, BKD-12, BKD-13, BKD-14, BKD-15, BKD-16, BKD-17, BKD-18, BKD-19, MGT-01, MGT-06, OWN-01, OWN-02, OWN-03

**Done when**:
- [ ] `POST /admin/packages` stores `providerId = request.providerId`
- [ ] `GET /admin/packages?phone=...` returns only active packages owned by the authenticated provider
- [ ] `GET /admin/packages` returns only packages owned by the authenticated provider
- [ ] `GET /admin/packages` supports `?status=active|completed|cancelled`
- [ ] A provider-scoped package details route exists for the workspace modal, for example `GET /admin/packages/:id`
- [ ] The details route returns linked package bookings with the fields required by the web design
- [ ] `PATCH /admin/packages/:id/deactivate` is provider-scoped and rejects non-owned packages
- [ ] Cross-provider package access returns 404 or an equivalent protected error shape
- [ ] `cd packages/api && npx tsc --noEmit` exits 0

**Commit**: `feat(api): add provider-scoped package management routes`

---

### T5: Add API regression coverage for provider ownership and delayed completion

**What**: Add focused tests around provider ownership, package lifecycle reevaluation, and package details access so the new rules stay protected as later booking work changes.
**Where**:
- `packages/api/src/application/use-cases/booking/__tests__/admin-create-appointment.test.ts`
- new targeted test files where needed under `packages/api/src/**/__tests__/`

**Depends on**: T4
**Reuses**: Existing mocked-repository Vitest pattern already used in `admin-create-appointment.test.ts`
**Requirement**: OWN-01, OWN-02, OWN-03, LIFE-01, LIFE-02, LIFE-03, BKD-07, BKD-09, BKD-10, BKD-15, BKD-16

**Done when**:
- [ ] Tests cover rejecting a package owned by a different provider
- [ ] Tests cover keeping a fully allocated package `active` while a future non-cancelled linked booking still exists
- [ ] Tests cover moving a package to `completed` only after no future non-cancelled linked bookings remain
- [ ] Tests cover package details access being denied across providers
- [ ] `cd packages/api && npm test -- --runInBand` passes

**Commit**: `test(api): cover package ownership and lifecycle rules`

---

### T6: Extend `use-admin.ts` for provider-scoped package summaries and details

**What**: Update the web admin API layer so package creation, package lists, package details, selector data, and invalidation behavior all match the new provider-scoped backend contract.
**Where**:
- `packages/web/src/api/use-admin.ts`

**Depends on**: T4
**Reuses**: Existing TanStack Query patterns already used for admin appointments, package summary list hooks, and booking mutations
**Requirement**: PKG-10, MGT-01, MGT-02, MGT-05, MGT-06, MGT-07, MGT-08, OWN-02, LIFE-02

**Done when**:
- [ ] `CustomerPackage` typing includes `providerId` and the full status union used by the web flow
- [ ] A typed package details model exists for the workspace modal
- [ ] A package details query hook exists for the package workspace flow
- [ ] Create, book, deactivate, cancel, delete, status-update, and schedule-update mutations invalidate both package summary and package details queries where needed
- [ ] The API layer exposes the provider-scoped selector and page contracts without leaking tenant-wide assumptions into components
- [ ] `npm -w @soberano/web run build` passes

**Commit**: `feat(web): align admin package hooks with provider-scoped contracts`

---

### T7: Refactor `BookFromPackageModal` into a shared `PackageWorkspaceModal`

**What**: Reuse the existing package-scoped booking modal as the foundation for one shared package workspace that supports package summary, linked bookings, and sequential package scheduling.
**Where**:
- `packages/web/src/components/admin/BookFromPackageModal.tsx` or a renamed successor such as `PackageWorkspaceModal.tsx`

**Depends on**: T6
**Reuses**: Existing sequential package booking flow in `BookFromPackageModal.tsx`, `useServices()`, `useSlots()`, and the current package-linked booking payload logic
**Requirement**: PKG-05, PKG-06, PKG-07, MGT-05, MGT-06

**Done when**:
- [ ] The shared workspace can render package summary information and remaining uses
- [ ] The workspace can load linked bookings through the new package details hook
- [ ] The workspace still supports booking one or more remaining usages in sequence without leaving the package context
- [ ] The workspace can be opened from both the post-create flow and the Packages page
- [ ] Package-linked booking creation refreshes package summary and details queries
- [ ] `npm -w @soberano/web run build` passes

**Commit**: `feat(web): create shared package workspace modal`

---

### T8: Hand off package creation into the shared package workspace

**What**: Change the dashboard package creation flow so successful package creation opens the shared package workspace instead of simply closing the modal.
**Where**:
- `packages/web/src/components/admin/AdminPackageModal.tsx`
- `packages/web/src/pages/admin/DashboardPage.tsx`

**Depends on**: T7
**Reuses**: Existing dashboard modal state wiring and the current `AdminPackageModal` form/lookup behavior
**Requirement**: PKG-01, PKG-02, PKG-03, PKG-04, PKG-05, PKG-06, PKG-07, PKG-14

**Done when**:
- [ ] `AdminPackageModal` returns the created package context needed to open the shared workspace
- [ ] `DashboardPage` opens the shared workspace immediately after successful package creation
- [ ] Providers can close the workspace before scheduling every usage and still keep the package available for later use
- [ ] The "Novo Pacote" dashboard entry point still works as before from the user’s perspective
- [ ] `npm -w @soberano/web run build` passes

**Commit**: `feat(web): continue package creation into scheduling workspace`

---

### T9: Scope `AdminBookingModal` package selection to the authenticated provider

**What**: Keep the inline package selector in the general admin booking flow, but ensure it uses only the authenticated provider's active packages and preserves explicit selection behavior.
**Where**:
- `packages/web/src/components/admin/AdminBookingModal.tsx`

**Depends on**: T6
**Reuses**: Existing package selector behavior already present in `AdminBookingModal.tsx`
**Requirement**: PKG-08, PKG-09, PKG-10, PKG-11, PKG-12, PKG-13, OWN-02

**Done when**:
- [ ] Exactly one provider-owned active package is still auto-selected
- [ ] Multiple provider-owned active packages still require explicit selection
- [ ] Deselecting the chosen package still submits the booking without `packageId`
- [ ] Customers with no provider-owned active packages still see no package UI
- [ ] Package-linked bookings still trigger the correct package query invalidation after success
- [ ] `npm -w @soberano/web run build` passes

**Commit**: `feat(web): scope admin booking package selector by provider`

---

### T10: Rework `PackagesPage` around active-first provider-owned package summaries

**What**: Make the Packages page default to active packages, show only the authenticated provider's packages, and expose summary-card actions that match package status and remaining uses.
**Where**:
- `packages/web/src/pages/admin/PackagesPage.tsx`

**Depends on**: T6
**Reuses**: Existing status pill, search, and deactivate confirmation patterns already present in the current `PackagesPage.tsx`
**Requirement**: MGT-01, MGT-02, MGT-03, MGT-04, MGT-08, OWN-02, LIFE-02

**Done when**:
- [ ] The initial page state requests and displays active packages first
- [ ] The page still allows switching to completed, cancelled, and all packages
- [ ] Search remains client-side on the returned provider-owned package set
- [ ] Active package cards expose actions such as "Ver detalhes", "Agendar uso", and "Desativar" according to the design
- [ ] Completed and cancelled packages remain visible but read-only for lifecycle actions
- [ ] `npm -w @soberano/web run build` passes

**Commit**: `feat(web): make packages page active-first and provider-owned`

---

### T11: Extract reusable linked-booking management UI from `DashboardPage`

**What**: Pull the appointment-management UI needed by the package workspace out of the large dashboard page so package-linked bookings can be edited or corrected from the package context without duplicating logic.
**Where**:
- `packages/web/src/pages/admin/DashboardPage.tsx`
- new reusable admin components under `packages/web/src/components/admin/`

**Depends on**: T6
**Reuses**: Existing `EditAppointmentModal`, cancel flow, and appointment action patterns currently embedded in `DashboardPage.tsx`
**Requirement**: MGT-07

**Done when**:
- [ ] The UI needed to edit or correct a linked booking is available outside `DashboardPage.tsx`
- [ ] The extraction does not change the existing dashboard booking-management behavior
- [ ] The new reusable pieces can be consumed by the package workspace flow
- [ ] `npm -w @soberano/web run build` passes

**Commit**: `refactor(web): extract reusable admin appointment management UI`

---

### T12: Integrate package details and linked-booking management into `PackagesPage`

**What**: Wire the shared package workspace into the Packages page so providers can inspect a package, schedule remaining usages, and manage linked bookings from the package context.
**Where**:
- `packages/web/src/pages/admin/PackagesPage.tsx`
- the shared package workspace component from T7
- extracted booking-management UI from T11

**Depends on**: T7, T10, T11
**Reuses**: Existing package deactivation flow and the booking-management patterns extracted from `DashboardPage.tsx`
**Requirement**: MGT-05, MGT-06, MGT-07, PKG-05, PKG-06, PKG-07

**Done when**:
- [ ] Package cards can open the shared workspace in details mode
- [ ] The shared workspace can switch into schedule mode for remaining uses from the Packages page
- [ ] Linked package bookings can be managed from the package context without leaving the package flow
- [ ] Closing the workspace refreshes the package summary list and the currently viewed package details
- [ ] `npm -w @soberano/web run build` passes

**Commit**: `feat(web): manage package details and linked bookings from packages page`

---

### T13: Add web verification coverage for package workspace flows

**What**: Add focused tests for the active-first Packages page, the post-create handoff into the package workspace, and the provider-scoped package selector behavior.
**Where**:
- `packages/web/src/**/__tests__/`

**Depends on**: T5, T8, T9, T12
**Reuses**: Existing Vitest + Testing Library patterns already used in the web package
**Requirement**: PKG-05, PKG-08, PKG-09, MGT-02, OWN-02, LIFE-02

**Done when**:
- [ ] There is coverage for the active-first default filter on `PackagesPage`
- [ ] There is coverage for opening the shared package workspace after successful package creation
- [ ] There is coverage for the single-package auto-select vs multi-package explicit-select behavior in `AdminBookingModal`
- [ ] There is coverage for keeping fully booked packages in the active UI when the API still marks them active because future linked bookings exist
- [ ] `npm -w @soberano/web run test` passes

**Commit**: `test(web): cover package workspace and provider-scoped package flows`

---

## Parallel Execution Map

```text
Phase 1:
  T1 → T2 → T3

Phase 2:
  T3 → T4 → T5

Phase 3:
  T4 → T6

Phase 4:
  T6 complete, then in parallel:
    ├── T7 [P]  shared package workspace modal
    ├── T9 [P]  provider-scoped selector in AdminBookingModal
    ├── T10 [P] active-first PackagesPage summaries
    └── T11 [P] reusable linked-booking management UI

Phase 5:
  T7 → T8
  T7 + T10 + T11 → T12

Phase 6:
  T5 + T8 + T9 + T12 → T13
```

---

## Granularity Check

| Task | Scope | Status |
|---|---|---|
| T1: Provider ownership migration | 1 schema change + generated migration | ✅ Granular |
| T2: Package repository contracts | 1 entity + 1 repo interface + 1 repo implementation | ✅ Granular |
| T3: Lifecycle integration in booking mutations | 1 cohesive business-rule change across existing admin booking mutations | ✅ Granular |
| T4: Provider-scoped package routes | 1 route file, package endpoints only | ✅ Granular |
| T5: API regression coverage | focused package ownership/lifecycle tests | ✅ Granular |
| T6: Web package hooks/types | 1 API hook file | ✅ Granular |
| T7: Shared package workspace modal | 1 component surface | ✅ Granular |
| T8: Post-create handoff | 2 tightly related dashboard/package-creation files | ✅ Granular |
| T9: Booking selector scoping | 1 component | ✅ Granular |
| T10: Packages page summaries | 1 page | ✅ Granular |
| T11: Reusable linked-booking UI extraction | 1 cohesive extraction from dashboard admin booking UI | ✅ Granular |
| T12: Package details integration | 1 page + 2 reused components | ✅ Granular |
| T13: Web verification coverage | focused tests for package flow | ✅ Granular |
