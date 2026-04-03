# Admin Manual Booking — Tasks

**Design**: `.specs/features/admin-manual-booking/design.md`
**Status**: Approved

---

## Execution Plan

```
Phase 1 — Backend foundation (sequential):
  T1 → T2 → T3

Phase 2 — Backend endpoints + Frontend hooks (parallel after T3):
  T3 complete, then:
    ├── T4 [P]  POST /admin/appointments route
    └── T5 [P]  GET /admin/customers/lookup route

Phase 3 — Frontend component + wiring (parallel after T4, T5):
  T4 + T5 complete, then:
    ├── T6 [P]  useAdminCreateBooking hook
    └── T7 [P]  useAdminCustomerLookup hook

Phase 4 — UI (sequential, builds on T6 + T7):
  T6 + T7 complete, then:
    T8 → T9
```

---

## Task Breakdown

### T1: Add `findByPhone` to CustomerRepository interface and Prisma implementation

**What**: Add `findByPhone(phone: string): Promise<Customer | null>` to the customer repository interface and implement it in Prisma.
**Where**:
- `packages/api/src/domain/repositories/customer.repository.ts` — add method to interface
- `packages/api/src/infrastructure/database/repositories/prisma-customer.repository.ts` — implement with `prisma.customer.findUnique({ where: { phone } })`

**Depends on**: None
**Reuses**: Existing `findUnique` pattern already used in `upsertByPhone`
**Requirement**: AMB-09

**Done when**:
- [ ] `CustomerRepository` interface has `findByPhone` method typed correctly
- [ ] `PrismaCustomerRepository` implements it using `prisma.customer.findUnique`
- [ ] TypeScript compiles with no errors (`pnpm --filter api tsc --noEmit`)

**Commit**: `feat(api): add findByPhone to customer repository`

---

### T2: Create `AdminCreateAppointment` use case

**What**: New use case class that creates an appointment without shift validation. Identical to `CreateAppointment` except lines 54–63 (shift coverage check) are removed.
**Where**: `packages/api/src/application/use-cases/booking/admin-create-appointment.ts`

**Depends on**: None (can start in parallel with T1, but T3 needs both)
**Reuses**: `packages/api/src/application/use-cases/booking/create-appointment.ts` — copy and remove the shift validation block
**Requirement**: AMB-03, AMB-04, AMB-05, AMB-07

**Rules**:
- Keep: past-date check, SlotTakenError on P2002, customer upsert, WhatsApp notification (fire-and-forget)
- Remove: `shiftRepo` dependency, shift coverage validation (the `shifts.length` and `slotCovered` checks)
- `barberId` comes from input (injected by route from JWT), not looked up separately

**Done when**:
- [ ] Class `AdminCreateAppointment` exists with `execute(input)` method
- [ ] Constructor takes `appointmentRepo`, `serviceRepo`, `barberRepo`, `customerRepo`, `notificationService` (no `shiftRepo`)
- [ ] Past-date validation throws `ValidationError`
- [ ] Double-booking throws `SlotTakenError` (P2002 catch)
- [ ] WhatsApp `sendBookingConfirmation` and `notifyBarber` called fire-and-forget
- [ ] TypeScript compiles with no errors

**Commit**: `feat(api): add AdminCreateAppointment use case (no shift restriction)`

---

### T3: Add `PrismaServiceRepository` and `PrismaCustomerRepository` instances to admin.routes.ts

**What**: Instantiate the two repo classes needed by the new admin routes at the top of `admin.routes.ts`, alongside the existing repo instances.
**Where**: `packages/api/src/http/routes/admin.routes.ts` — add imports and instances

**Depends on**: T1 (for `customerRepo.findByPhone` to exist on the type)
**Reuses**: Pattern already used in `booking.routes.ts` for the same repos
**Requirement**: AMB-02

**Done when**:
- [ ] `PrismaServiceRepository` and `PrismaCustomerRepository` imported and instantiated in `admin.routes.ts`
- [ ] TypeScript compiles with no errors

**Commit**: `feat(api): add service and customer repo instances to admin routes`

---

### T4: Add `POST /admin/appointments` route [P]

**What**: New authenticated route that calls `AdminCreateAppointment` and returns the created appointment.
**Where**: `packages/api/src/http/routes/admin.routes.ts` — add route to existing file

**Depends on**: T2, T3
**Reuses**: `authGuard` already applied to all routes in this file; `bookingSchema` from `@soberano/shared` for validation (omit `barberId` from body — injected from `request.barberId`)
**Requirement**: AMB-02, AMB-03, AMB-04, AMB-06, AMB-07

**Route contract**:
```
POST /admin/appointments
Authorization: Bearer <token>

Body: {
  serviceId: string (UUID)
  date: string (YYYY-MM-DD)
  startTime: string (HH:mm)
  customerName: string
  customerPhone: string
}

Response 201: { appointment: AdminAppointment, cancelUrl: string }
Response 400: { error: "VALIDATION_ERROR", message: string }
Response 409: { error: "SLOT_TAKEN", message: "Horário já ocupado." }
```

**Done when**:
- [ ] Route validates body with zod (reuse `bookingSchema` fields minus `barberId`)
- [ ] `barberId` injected from `request.barberId` (JWT), not from body
- [ ] `SlotTakenError` mapped to 409 response
- [ ] `ValidationError` mapped to 400 response
- [ ] `NotFoundError` mapped to 404 response
- [ ] Returns 201 with appointment on success
- [ ] TypeScript compiles with no errors

**Commit**: `feat(api): add POST /admin/appointments route for manual barber booking`

---

### T5: Add `GET /admin/customers/lookup` route [P]

**What**: New authenticated route that looks up a customer by phone and returns their name (or null).
**Where**: `packages/api/src/http/routes/admin.routes.ts` — add route to existing file

**Depends on**: T1, T3
**Reuses**: `authGuard` already applied; `customerRepo` instance from T3
**Requirement**: AMB-09

**Route contract**:
```
GET /admin/customers/lookup?phone=11999999999
Authorization: Bearer <token>

Response 200: { name: string | null }
Response 400: { error: "BAD_REQUEST", message: "phone é obrigatório." }
```

**Done when**:
- [ ] Route reads `phone` from query string
- [ ] Returns 400 if phone is missing
- [ ] Calls `customerRepo.findByPhone(phone)`
- [ ] Returns `{ name: customer.name }` if found, `{ name: null }` if not
- [ ] TypeScript compiles with no errors

**Commit**: `feat(api): add GET /admin/customers/lookup for customer name auto-fill`

---

### T6: Add `useAdminCreateBooking` hook [P]

**What**: TanStack Query mutation hook that calls `POST /admin/appointments`.
**Where**: `packages/web/src/api/use-admin.ts` — append to existing file

**Depends on**: T4
**Reuses**: `authRequest` wrapper; `useAdminCancelAppointment` as pattern reference; invalidates `['admin-appointments']` on success
**Requirement**: AMB-02, AMB-06

```typescript
export interface AdminBookingInput {
  serviceId: string;
  date: string;
  startTime: string;
  customerName: string;
  customerPhone: string;
}

export function useAdminCreateBooking(): UseMutationResult<...>
```

**Done when**:
- [ ] `AdminBookingInput` type exported
- [ ] Mutation calls `authRequest('/admin/appointments', { method: 'POST', body: JSON.stringify(input) })`
- [ ] `onSuccess` invalidates `['admin-appointments']`
- [ ] TypeScript compiles with no errors

**Commit**: `feat(web): add useAdminCreateBooking mutation hook`

---

### T7: Add `useAdminCustomerLookup` hook [P]

**What**: TanStack Query hook that fetches customer name by phone for auto-fill.
**Where**: `packages/web/src/api/use-admin.ts` — append to existing file

**Depends on**: T5
**Reuses**: `authRequest` wrapper; `useAdminMe` as pattern reference
**Requirement**: AMB-09

```typescript
export function useAdminCustomerLookup(phone: string): UseQueryResult<{ name: string | null }>
```

**Behavior**: `enabled: phone.length >= 10`, `staleTime: 30_000`

**Done when**:
- [ ] Query calls `authRequest('/admin/customers/lookup?phone=' + phone)`
- [ ] `enabled` only when `phone.length >= 10`
- [ ] `staleTime: 30_000`
- [ ] TypeScript compiles with no errors

**Commit**: `feat(web): add useAdminCustomerLookup query hook`

---

### T8: Create `AdminBookingModal` component

**What**: Modal form component with fields: phone, name, service, date, time. Handles auto-fill, validation, and submission.
**Where**: `packages/web/src/components/admin/AdminBookingModal.tsx` (new file)

**Depends on**: T6, T7
**Reuses**: `Input`, `Button`, `Spinner` components; `CancelModal` shell pattern (fixed overlay + centered card) from `DashboardPage.tsx:201`; `formatPhone`, `stripPhone` from `lib/format.ts`
**Requirement**: AMB-01, AMB-02, AMB-03, AMB-04, AMB-05, AMB-08, AMB-09

**Fields and behavior**:
1. **Phone** — `Input` with `inputMode="tel"`, formatted via `formatPhone`. Raw stripped value used as `customerPhone`. When `strippedPhone.length >= 10`, triggers debounced lookup (400ms local debounce via `useEffect` + `setTimeout`).
2. **Name** — `Input`. Auto-filled when lookup returns a name, but remains editable.
3. **Service** — `<select>` fetching from public `GET /services` (use `useServices` hook if it exists, else `useQuery` against `/services`). Shows name + icon.
4. **Date** — `Input type="date"`, `min={today}` (YYYY-MM-DD format).
5. **Time** — `Input`, `placeholder="09:00"`, validated on blur against `/^([01]\d|2[0-3]):[0-5]\d$/`.

**Submit guard**: All fields filled + time regex valid + date ≥ today.

**Error display**: `useAdminCreateBooking.error?.message` shown in red below the submit button.

**Done when**:
- [ ] Component renders with all 5 fields
- [ ] Phone change triggers debounced lookup at ≥10 digits
- [ ] Name auto-fills from lookup result and stays editable
- [ ] Service dropdown populated with active services
- [ ] Date picker has `min` set to today
- [ ] Time input validates HH:mm regex on blur, shows inline error if invalid
- [ ] Submit button disabled until all fields valid
- [ ] `useAdminCreateBooking.mutate()` called on submit
- [ ] On success: `onClose()` called
- [ ] Error message from API displayed inline
- [ ] Loading state shown via `Button loading` prop
- [ ] TypeScript compiles with no errors

**Commit**: `feat(web): add AdminBookingModal component`

---

### T9: Wire `AdminBookingModal` into `DashboardPage`

**What**: Add modal state, "Novo Agendamento" button, and conditionally render the modal in `DashboardPage`.
**Where**: `packages/web/src/pages/admin/DashboardPage.tsx`

**Depends on**: T8
**Reuses**: Existing `useState` pattern in the page; existing button styles
**Requirement**: AMB-01

**Changes**:
1. Import `AdminBookingModal`
2. Add `const [showBookingModal, setShowBookingModal] = useState(false)`
3. Add "Novo Agendamento" button in the header row next to the current date — small gold-outlined button, consistent with the page's action buttons style
4. Render `{showBookingModal && <AdminBookingModal onClose={() => setShowBookingModal(false)} />}`

**Done when**:
- [ ] Button visible in the dashboard header
- [ ] Clicking button opens the modal
- [ ] Modal closes on `onClose` (successful booking or manual close)
- [ ] After successful booking, appointment appears in the list (from query invalidation in T6)
- [ ] TypeScript compiles with no errors

**Commit**: `feat(web): wire AdminBookingModal into DashboardPage`

---

## Parallel Execution Map

```
Phase 1 (Sequential):
  T1 ──→ T3
  T2 ──→ T3

Phase 2 (Parallel after T3):
  T3 ──┬──→ T4 [P]
       └──→ T5 [P]

Phase 3 (Parallel after T4+T5):
  T4 ──→ T6 [P]
  T5 ──→ T7 [P]

Phase 4 (Sequential):
  T6 + T7 ──→ T8 ──→ T9
```

---

## Requirement Coverage

| Requirement ID | Covered by |
|---|---|
| AMB-01 | T9 |
| AMB-02 | T4, T8 |
| AMB-03 | T2, T4 |
| AMB-04 | T2, T4, T8 |
| AMB-05 | T2 |
| AMB-06 | T6, T9 |
| AMB-07 | T2 |
| AMB-08 | T2 |
| AMB-09 | T1, T5, T7, T8 |

**Coverage: 9/9 ✅**
