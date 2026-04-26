# Customer Packages Tasks

**Design**: `.specs/features/customer-packages/design.md`
**Status**: Draft

---

## Execution Plan

### Phase 1: Foundation — types + hooks (Sequential)

T1 → T2 → T3

### Phase 2: UI (Parallel after Phase 1)

```
T3 complete, then:
  ├── T4 [P]   AdminPackageModal
  └── T5 [P]   AdminBookingModal changes
```

### Phase 3: Integration (Sequential after Phase 2)

T4, T5 complete → T6 (DashboardPage wiring)

---

## Task Breakdown

### T1: Add types + extend `AdminBookingInput`

**What**: Add `CustomerPackage` and `AdminCreatePackageInput` interfaces to `use-admin.ts`, and add optional `packageId` to the existing `AdminBookingInput` type.
**Where**: `packages/web/src/api/use-admin.ts`
**Depends on**: None
**Requirement**: PKG-01, PKG-07

**Done when**:
- [ ] `CustomerPackage` interface exported with all fields: `id`, `customerName`, `customerPhone`, `totalUses`, `usedCount`, `totalPriceCents`, `status: 'active' | 'completed'`, `createdAt`
- [ ] `AdminCreatePackageInput` interface exported with: `customerName`, `customerPhone?`, `totalUses`, `totalPriceCents`
- [ ] `AdminBookingInput` has optional `packageId?: string`
- [ ] `tsc --noEmit` passes with no new errors

**Commit**: `feat(web): add CustomerPackage types and extend AdminBookingInput`

---

### T2: Add `useAdminCreatePackage` hook

**What**: New TanStack mutation that calls `POST /admin/packages` with `AdminCreatePackageInput`.
**Where**: `packages/web/src/api/use-admin.ts` (append after T1)
**Depends on**: T1
**Reuses**: `useAdminCreateBooking` pattern — `authRequest`, `useQueryClient`, invalidates on success
**Requirement**: PKG-02

**Done when**:
- [ ] Hook exported from `use-admin.ts`
- [ ] On success, invalidates `['admin-packages']` query key
- [ ] Input typed as `AdminCreatePackageInput`, no `any`
- [ ] `tsc --noEmit` passes

**Commit**: `feat(web): add useAdminCreatePackage mutation hook`

---

### T3: Add `useAdminCustomerPackages` hook

**What**: New TanStack query that calls `GET /admin/packages?phone={phone}` and returns `CustomerPackage[]` (active packages only).
**Where**: `packages/web/src/api/use-admin.ts` (append after T2)
**Depends on**: T1
**Reuses**: `useAdminCustomerLookup` pattern — `enabled: phone.length >= 10`, `staleTime: 30_000`
**Requirement**: PKG-05, PKG-06

**Done when**:
- [ ] Hook exported from `use-admin.ts`
- [ ] Query disabled when `phone.length < 10`
- [ ] Return type is `CustomerPackage[]`
- [ ] `tsc --noEmit` passes

**Commit**: `feat(web): add useAdminCustomerPackages query hook`

---

### T4: Create `AdminPackageModal` component [P]

**What**: New modal component for creating a customer package.
**Where**: `packages/web/src/components/admin/AdminPackageModal.tsx` (new file)
**Depends on**: T2, T3
**Reuses**: `AdminBookingModal` as structural reference; `Input`, `Button`, `formatPhone`, `stripPhone`, `useAdminCustomerLookup`
**Requirement**: PKG-01, PKG-02, PKG-03, PKG-04

**Fields**:
- Phone (`inputMode="tel"`, formatted display, 400ms debounced lookup → autofills name)
- Name (required, min 2 chars)
- Número de usos (`inputMode="numeric"`, integer ≥ 1)
- Preço total (`inputMode="decimal"`, R$, comma→dot normalization)

**Done when**:
- [ ] Modal renders with correct overlay and card matching `AdminBookingModal` structure
- [ ] Phone input triggers name autofill via `useAdminCustomerLookup` with 400ms debounce
- [ ] Submit button disabled until: `name.trim().length >= 2`, `uses >= 1`, `price > 0`
- [ ] On success, `onClose()` is called
- [ ] On error, server message shown inline in red below button
- [ ] `tsc --noEmit` passes

**Commit**: `feat(web): add AdminPackageModal component`

---

### T5: Modify `AdminBookingModal` — package selector + packageId injection [P]

**What**: Add a package selector to the existing booking modal. When the customer has active packages, show selectable pills. Inject the selected `packageId` into the booking payload on submit.
**Where**: `packages/web/src/components/admin/AdminBookingModal.tsx`
**Depends on**: T3
**Requirement**: PKG-05, PKG-06, PKG-07, PKG-08

**Changes**:

1. Import `useAdminCustomerPackages` and call it with `lookupPhone`
2. Add `selectedPackageId` state (`string | null`, default `null`)
3. Add `useEffect`: when `packages` data loads, auto-select if exactly 1 active package; reset to `null` when `lookupPhone` changes
4. Render **package selector** between name field and service selector, only when `packages.length > 0`:
   - Each package renders as a pill button: `"{usedCount}/{totalUses} usos — R$ {totalPriceCents/100}`
   - Selected pill: `border-gold bg-gold/20 text-gold`
   - Unselected pill: `border-dark-border bg-dark text-muted hover:border-gold/40`
   - Clicking a selected pill deselects it (`setSelectedPackageId(null)`)
   - Clicking an unselected pill selects it
5. In `handleSubmit`, add: `...(selectedPackageId ? { packageId: selectedPackageId } : {})`

**Done when**:
- [ ] No packages → zero UI change from current behavior
- [ ] 1 active package → pill appears pre-selected; can be deselected
- [ ] 2+ active packages → all pills appear, none pre-selected; barber selects one
- [ ] Selecting a pill and submitting → `packageId` present in network request
- [ ] Deselecting and submitting → `packageId` absent from network request
- [ ] Switching to a different customer (phone change) → selector resets to unselected
- [ ] `tsc --noEmit` passes

**Commit**: `feat(web): add package selector to AdminBookingModal`

---

### T6: Wire `AdminPackageModal` into `DashboardPage`

**What**: Add "Novo Pacote" button to `DashboardPage` and conditionally render `AdminPackageModal`.
**Where**: `packages/web/src/pages/admin/DashboardPage.tsx`
**Depends on**: T4, T5
**Requirement**: PKG-09

**Changes**:
1. Import `AdminPackageModal`
2. Add `const [packageModalOpen, setPackageModalOpen] = useState(false)`
3. Add "Novo Pacote" button — secondary style (gold border, transparent bg) — adjacent to the existing "Novo Agendamento" button
4. Render `{packageModalOpen && <AdminPackageModal onClose={() => setPackageModalOpen(false)} />}`

**Done when**:
- [ ] "Novo Pacote" button visible in dashboard
- [ ] Clicking button opens `AdminPackageModal`
- [ ] Closing modal (× or success) hides it
- [ ] Existing "Novo Agendamento" button behavior unchanged
- [ ] `tsc --noEmit` passes

**Commit**: `feat(web): add Novo Pacote entry point to DashboardPage`

---

## Parallel Execution Map

```
Phase 1 (Sequential — foundation):
  T1 ──→ T2 ──→ T3

Phase 2 (Parallel — after T2+T3):
  ├── T4 [P]  AdminPackageModal
  └── T5 [P]  AdminBookingModal patch

Phase 3 (Sequential — integration):
  T4 + T5 complete ──→ T6
```

---

## Granularity Check

| Task | Scope | Status |
|---|---|---|
| T1: Add types | 1 file, type-only changes | ✅ Granular |
| T2: useAdminCreatePackage | 1 hook in 1 file | ✅ Granular |
| T3: useAdminCustomerPackages | 1 hook in 1 file | ✅ Granular |
| T4: AdminPackageModal | 1 new component file | ✅ Granular |
| T5: AdminBookingModal patch | 1 file, 5 focused changes | ✅ Granular |
| T6: DashboardPage wiring | 1 file, 4 focused changes | ✅ Granular |

---

## Backend Tasks

### Backend Execution Plan

```
BT1 ──→ BT2 ──→ BT3
BT4 (parallel with BT1-BT3)

BT3 + BT4 ──→ BT5 (routes)
BT2 ──→ BT6 (use case extension)
BT4 + BT6 + BT3 ──→ BT7 (route wiring)
BT6 ──→ BT8 (unit tests)
```

---

### BT1: Prisma schema + migration

**What**: Add `CustomerPackage` model to `schema.prisma`, add optional `packageId` FK on `Appointment`, add `customerPackages` relation on `Tenant`. Generate migration.
**Where**: `packages/api/prisma/schema.prisma`, `packages/api/prisma/migrations/`
**Depends on**: None
**Requirement**: BKD-01, BKD-02, BKD-08

**Changes**:
1. Add `CustomerPackage` model (see `design.md` — Backend Design → DB Schema)
2. Add `packageId String? @map("package_id") @db.Uuid` + `package CustomerPackage? @relation(...)` to `Appointment`
3. Add `customerPackages CustomerPackage[]` to `Tenant`
4. Run `npx prisma migrate dev --name add-customer-packages` from `packages/api`

**Done when**:
- [ ] `schema.prisma` has the `CustomerPackage` model with all fields: `id`, `tenantId`, `customerName`, `customerPhone?`, `totalUses`, `usedCount`, `totalPriceCents`, `status`, `createdAt`, `updatedAt`
- [ ] `Appointment` has optional `packageId` FK pointing to `CustomerPackage`
- [ ] Migration file generated under `prisma/migrations/`
- [ ] `npx prisma validate` passes

**Commit**: `feat(api): add customer_packages table and packageId FK on appointments`

---

### BT2: Domain entity + repository interface

**What**: Create `CustomerPackageEntity` type and `CustomerPackageRepository` interface.
**Where**: 
- `packages/api/src/domain/entities/customer-package.ts` (new)
- `packages/api/src/domain/repositories/customer-package.repository.ts` (new)
**Depends on**: BT1 (schema determines entity shape)
**Requirement**: BKD-01, BKD-05, BKD-08

**`CustomerPackageEntity`**:
```typescript
export interface CustomerPackageEntity {
  id: string
  tenantId: string
  customerName: string
  customerPhone: string | null
  totalUses: number
  usedCount: number
  totalPriceCents: number
  status: 'active' | 'completed'
  createdAt: Date
  updatedAt: Date
}
```

**`CustomerPackageRepository`**:
```typescript
export interface CustomerPackageRepository {
  create(data: { tenantId: string; customerName: string; customerPhone?: string; totalUses: number; totalPriceCents: number }): Promise<CustomerPackageEntity>
  findActiveByPhone(tenantId: string, phone: string): Promise<CustomerPackageEntity[]>
  findByIdAndTenant(id: string, tenantId: string): Promise<CustomerPackageEntity | null>
  incrementUsedCount(id: string): Promise<CustomerPackageEntity>
}
```

**Done when**:
- [ ] Both files exist with correct types
- [ ] `tsc --noEmit` in `packages/api` passes

**Commit**: `feat(api): add CustomerPackage entity and repository interface`

---

### BT3: `PrismaCustomerPackageRepository` implementation

**What**: Implement the `CustomerPackageRepository` interface using `tenantPrisma`.
**Where**: `packages/api/src/infrastructure/database/repositories/prisma-customer-package.repository.ts` (new)
**Depends on**: BT2
**Reuses**: `PrismaCustomerRepository` as structural reference (constructor receives `PrismaClient`)
**Requirement**: BKD-01, BKD-02, BKD-05, BKD-08, BKD-09

**`incrementUsedCount` logic**:
```typescript
async incrementUsedCount(id: string): Promise<CustomerPackageEntity> {
  const updated = await this.prisma.customerPackage.update({
    where: { id },
    data: { usedCount: { increment: 1 } },
  })
  if (updated.usedCount >= updated.totalUses) {
    return this.prisma.customerPackage.update({
      where: { id },
      data: { status: 'completed' },
    })
  }
  return updated
}
```

Note: two sequential operations (not a transaction). Acceptable at barbershop scale.

**Done when**:
- [ ] All 4 interface methods implemented with no `any`
- [ ] `findActiveByPhone` filters by `status: 'active'` and scopes by `tenantId`
- [ ] `findByIdAndTenant` scopes by both `id` and `tenantId`
- [ ] `tsc --noEmit` passes

**Commit**: `feat(api): add PrismaCustomerPackageRepository`

---

### BT4: `createPackageSchema` in shared package

**What**: Add `createPackageSchema` and `CreatePackageInput` type to `packages/shared/src/validation.ts`.
**Where**: `packages/shared/src/validation.ts`
**Depends on**: None
**Requirement**: BKD-03

```typescript
export const createPackageSchema = z.object({
  customerName: z.string().min(2, 'Nome deve ter pelo menos 2 caracteres').max(200),
  customerPhone: z.string().regex(/^\d{10,11}$/, 'Telefone deve ter 10 ou 11 dígitos').optional(),
  totalUses: z.number().int().min(1, 'Número de usos deve ser pelo menos 1'),
  totalPriceCents: z.number().int().positive('Preço deve ser maior que zero'),
})
export type CreatePackageInput = z.infer<typeof createPackageSchema>
```

Export both from `packages/shared/src/index.ts`.

**Done when**:
- [ ] Schema and type exported from `@soberano/shared`
- [ ] `tsc --noEmit` passes in `packages/shared`

**Commit**: `feat(shared): add createPackageSchema`

---

### BT5: `POST /admin/packages` and `GET /admin/packages` routes

**What**: Add two new admin routes for creating and listing packages.
**Where**: `packages/api/src/http/routes/admin.routes.ts`
**Depends on**: BT3, BT4
**Requirement**: BKD-01, BKD-02, BKD-03, BKD-04, BKD-05, BKD-06

**`POST /admin/packages`**:
```
body → createPackageSchema.safeParse() → 400 if invalid
→ new PrismaCustomerPackageRepository(request.tenantPrisma)
→ packageRepo.create({ ...parsed.data, tenantId: request.tenant.id })
→ 201 with created package
```

**`GET /admin/packages`**:
```
query.phone → required, 400 if absent
→ packageRepo.findActiveByPhone(request.tenant.id, phone)
→ 200 { packages: [...] }
```

**Done when**:
- [ ] `POST /admin/packages` returns `201` with the created package
- [ ] `POST /admin/packages` returns `400` for invalid input (name < 2, uses < 1, price ≤ 0)
- [ ] `GET /admin/packages?phone=` returns `200 { packages: [] }` when none found
- [ ] `GET /admin/packages` without phone returns `400`
- [ ] Both routes are protected by the existing `authGuard`
- [ ] `tsc --noEmit` passes

**Commit**: `feat(api): add POST and GET /admin/packages routes`

---

### BT6: Extend `AdminCreateAppointment` use case

**What**: Accept optional `packageId` in input; validate and increment package credit after appointment creation.
**Where**: `packages/api/src/application/use-cases/booking/admin-create-appointment.ts`
**Depends on**: BT2
**Requirement**: BKD-07, BKD-08, BKD-09, BKD-10, BKD-11

**Input change**: add `packageId?: string` to `AdminCreateAppointmentInput`.

**Constructor change**: add `private packageRepo: CustomerPackageRepository` as the last constructor parameter.

**Logic after `customerRepo.upsertByPhone` / `createWalkin`, before `appointmentRepo.create`**:
```
if (input.packageId) {
  const pkg = await packageRepo.findByIdAndTenant(input.packageId, input.tenantId)
  if (!pkg || pkg.status !== 'active') throw new ValidationError('Pacote inválido ou já utilizado.')
}
```

**After `appointmentRepo.create` succeeds**:
```
if (input.packageId) {
  await packageRepo.incrementUsedCount(input.packageId)
}
```

**Done when**:
- [ ] When `packageId` is absent, use case behavior is identical to before (no regression — BKD-11)
- [ ] When `packageId` refers to a non-existent or non-active package, use case throws `ValidationError` before creating the appointment (BKD-10)
- [ ] When `packageId` is valid, `incrementUsedCount` is called after appointment creation (BKD-08)
- [ ] `tsc --noEmit` passes

**Commit**: `feat(api): extend AdminCreateAppointment to link and decrement package`

---

### BT7: Wire `packageId` into `POST /admin/appointments` route

**What**: Parse optional `packageId` from request body, instantiate `PrismaCustomerPackageRepository`, pass both to use case.
**Where**: `packages/api/src/http/routes/admin.routes.ts`
**Depends on**: BT3, BT4, BT6
**Requirement**: BKD-07, BKD-08, BKD-10, BKD-11

**Changes to existing `POST /admin/appointments` handler**:
1. Extend the `adminBookingSchema` with: `packageId: z.string().uuid().optional()`
2. Instantiate `const packageRepo = new PrismaCustomerPackageRepository(request.tenantPrisma)`
3. Pass `packageRepo` as the last argument to `new AdminCreateAppointment(...)`
4. Include `packageId: parsed.data.packageId` in the `useCase.execute()` input
5. Add `ValidationError` → `400` to the existing catch block (it already handles `ValidationError` — verify it covers the new package error)

**Done when**:
- [ ] `POST /admin/appointments` with a valid `packageId` returns `201` and the package `usedCount` is incremented
- [ ] `POST /admin/appointments` with an invalid/inactive `packageId` returns `400 VALIDATION_ERROR` and no appointment is created
- [ ] `POST /admin/appointments` without `packageId` behaves identically to before (BKD-11)
- [ ] `tsc --noEmit` passes

**Commit**: `feat(api): wire packageId into POST /admin/appointments route`

---

### BT8: Unit tests for package credit logic

**What**: Tests for the extended `AdminCreateAppointment` use case covering the three `packageId` scenarios.
**Where**: `packages/api/src/application/use-cases/booking/__tests__/admin-create-appointment.test.ts` (new file)
**Depends on**: BT6
**Requirement**: BKD-07, BKD-08, BKD-09, BKD-10, BKD-11

**Test cases**:
1. `packageId` absent → appointment created, `packageRepo` never called (no regression)
2. `packageId` present + package active → appointment created, `incrementUsedCount` called once
3. `packageId` present + package `status = 'completed'` → throws `ValidationError`, `appointmentRepo.create` never called
4. `packageId` present + package not found → throws `ValidationError`, `appointmentRepo.create` never called

**Done when**:
- [ ] All 4 test cases pass
- [ ] Mocks follow existing pattern from `create-appointment.test.ts` (vi.fn(), no real DB)
- [ ] `npm test` in `packages/api` passes

**Commit**: `test(api): add AdminCreateAppointment package credit tests`

---

## Management Section Tasks

### Management Execution Plan

```
Phase A — Backend (Sequential):
  BT9 ──→ BT10 ──→ BT11

Phase B — Frontend (Sequential after BT10+BT11):
  MT1 ──→ MT2 ──→ MT3
```

---

### BT9: Extend repository — `findAllByTenant` + `deactivate`

**What**: Add two new methods to `CustomerPackageRepository` interface and `PrismaCustomerPackageRepository` implementation.
**Where**:
- `packages/api/src/domain/repositories/customer-package.repository.ts`
- `packages/api/src/infrastructure/database/repositories/prisma-customer-package.repository.ts`
**Depends on**: BT2, BT3 (already done)
**Requirement**: BKD-12, BKD-13, BKD-15, BKD-16, BKD-17

**Interface additions**:
```typescript
findAllByTenant(tenantId: string, options?: { status?: string }): Promise<CustomerPackageEntity[]>
deactivate(id: string, tenantId: string): Promise<CustomerPackageEntity>
```

**Implementation**:
- `findAllByTenant`: `findMany({ where: { tenantId, ...(status ? { status } : {}) }, orderBy: { createdAt: 'desc' } })`
- `deactivate`: `findFirst({ where: { id, tenantId } })` → throw if not found → throw if status !== 'active' → `update({ where: { id }, data: { status: 'cancelled' } })`

Note: `deactivate` validates ownership and status in the repository. The route handler converts the thrown error to the appropriate HTTP status.

**Done when**:
- [ ] Both methods added to interface and implementation
- [ ] `deactivate` throws a recognizable error (e.g. `new Error('NOT_FOUND')` / `new ValidationError(...)`) for 404 and 400 cases
- [ ] `tsc --noEmit` in `packages/api` passes

**Commit**: `feat(api): add findAllByTenant and deactivate to CustomerPackageRepository`

---

### BT10: Extend `GET /admin/packages` + add `PATCH /admin/packages/:id/deactivate`

**What**: Two route changes in `admin.routes.ts`.
**Where**: `packages/api/src/http/routes/admin.routes.ts`
**Depends on**: BT9
**Requirement**: BKD-12, BKD-13, BKD-14, BKD-15, BKD-16, BKD-17

**Change 1 — Extend `GET /admin/packages`**:
```
if phone present → existing behavior unchanged (findActiveByPhone)
if phone absent  → packageRepo.findAllByTenant(tenant.id, { status: query.status })
                   → 200 { packages: [...] }
```

**Change 2 — New `PATCH /admin/packages/:id/deactivate`**:
```
→ packageRepo.deactivate(id, tenant.id)
→ on NOT_FOUND error → 404
→ on ValidationError → 400
→ 200 { package: updated }
```

**Done when**:
- [ ] `GET /admin/packages` without phone returns all packages (not just active)
- [ ] `GET /admin/packages?status=active` returns only active packages
- [ ] `GET /admin/packages?phone=xxx` still returns active-only for that phone (no regression — BKD-14)
- [ ] `PATCH /admin/packages/:id/deactivate` returns 200 on success, 404 if not found, 400 if not active
- [ ] `tsc --noEmit` passes

**Commit**: `feat(api): extend GET /admin/packages and add PATCH deactivate route`

---

### MT1: Add `useAdminPackages` + `useAdminDeactivatePackage` hooks

**What**: Two new hooks in `use-admin.ts`.
**Where**: `packages/web/src/api/use-admin.ts`
**Depends on**: BT10
**Requirement**: MGT-01, MGT-04

```typescript
export function useAdminPackages(status?: string) {
  return useQuery({
    queryKey: ['admin-packages-all', status ?? 'all'],
    queryFn: () =>
      authRequest<{ packages: CustomerPackage[] }>(
        '/admin/packages' + (status ? `?status=${status}` : '')
      ).then((r) => r.packages),
    staleTime: 30_000,
  })
}

export function useAdminDeactivatePackage() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id: string) =>
      authRequest(`/admin/packages/${id}/deactivate`, { method: 'PATCH' }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-packages-all'] })
      queryClient.invalidateQueries({ queryKey: ['admin-packages'] })
    },
  })
}
```

**Done when**:
- [ ] Both hooks exported from `use-admin.ts`
- [ ] `useAdminPackages` uses `['admin-packages-all', status]` query key
- [ ] `useAdminDeactivatePackage.onSuccess` invalidates both query keys
- [ ] `tsc --noEmit` passes

**Commit**: `feat(web): add useAdminPackages and useAdminDeactivatePackage hooks`

---

### MT2: Create `PackagesPage` component

**What**: New admin page listing all packages with filter, search, and deactivate.
**Where**: `packages/web/src/pages/admin/PackagesPage.tsx` (new file)
**Depends on**: MT1
**Requirement**: MGT-01, MGT-02, MGT-03, MGT-04

**State**:
- `statusFilter: '' | 'active' | 'completed' | 'cancelled'` ('' = all, passed to `useAdminPackages`)
- `search: string` — client-side filter on `customerName` and `customerPhone`
- `deactivatingId: string | null` — drives confirmation modal

**Layout**:
```
← Voltar (navigate('/admin'))    "Pacotes"
[Todos] [Ativos] [Concluídos] [Cancelados]   ← filter pills
[Buscar por nome ou telefone...]              ← search input
Package list:
  Card: Name · Phone · status badge · N/M usos · R$ X,XX · date
        [Desativar] button (active only)
Confirmation modal: "Desativar pacote?" + Confirmar / Voltar
```

**Status badge classes** (matches existing patterns):
- `active`: `text-gold border-gold/30 bg-gold/10`
- `completed`: `text-green-400 border-green-400/30 bg-green-400/10`
- `cancelled`: `text-muted border-dark-border bg-dark-surface2`

**Done when**:
- [ ] Page renders list from `useAdminPackages`
- [ ] Status filter pills switch the query parameter; "Todos" passes no status
- [ ] Search filters client-side on `customerName` and `customerPhone`; case-insensitive
- [ ] "Desativar" only shown for `status === 'active'`; clicking shows confirmation modal
- [ ] Confirmation triggers `useAdminDeactivatePackage`; on success, list updates
- [ ] Loading state shown while fetching
- [ ] `tsc --noEmit` passes

**Commit**: `feat(web): add PackagesPage with filter, search, and deactivate`

---

### MT3: Register route + add navigation entry

**What**: Wire `PackagesPage` into the router and expose it from the barber profile dropdown.
**Where**:
- `packages/web/src/App.tsx` — add route
- `packages/web/src/pages/admin/DashboardPage.tsx` — add "Pacotes" to `BarberProfile` dropdown
**Depends on**: MT2
**Requirement**: MGT-05

**`App.tsx` change**: Add before the catch-all `/admin/*`:
```tsx
<Route path="/admin/packages" element={<ProtectedRoute><PackagesPage /></ProtectedRoute>} />
```

**`DashboardPage.tsx` changes**:
1. Add `onPacotes: () => void` to `BarberProfile` props
2. Render `<button onClick={() => { setOpen(false); onPacotes(); }}>Pacotes</button>` in the dropdown (above "Sair")
3. Pass `onPacotes={() => navigate('/admin/packages')}` at the call site

**Done when**:
- [ ] Navigating to `/admin/packages` (authenticated) renders `PackagesPage`
- [ ] "Pacotes" appears in the barber profile dropdown
- [ ] Clicking "Pacotes" navigates to `/admin/packages`
- [ ] Existing "Agenda" and "Sair" dropdown items unchanged
- [ ] `tsc --noEmit` passes

**Commit**: `feat(web): register PackagesPage route and add Pacotes nav entry`

---

## Management Granularity Check

| Task | Scope | Status |
|---|---|---|
| BT9: Repo extensions | 2 files, 2 methods each | ✅ Granular |
| BT10: Route changes | 1 file, 1 extension + 1 new handler | ✅ Granular |
| MT1: Two new hooks | 1 file, 2 hooks | ✅ Granular |
| MT2: PackagesPage | 1 new file, ~130 lines | ✅ Granular |
| MT3: Route + nav wiring | 2 files, 4-line changes each | ✅ Granular |

---

## Backend Granularity Check

| Task | Scope | Status |
|---|---|---|
| BT1: Schema + migration | 1 schema file + generated migration | ✅ Granular |
| BT2: Entity + repo interface | 2 new files, types only | ✅ Granular |
| BT3: Prisma repo implementation | 1 new file, 4 methods | ✅ Granular |
| BT4: Shared schema | 1 file, 1 schema + 1 type | ✅ Granular |
| BT5: Package routes | 1 file, 2 route handlers | ✅ Granular |
| BT6: Use case extension | 1 file, targeted changes | ✅ Granular |
| BT7: Route wiring | 1 file, 5-line change | ✅ Granular |
| BT8: Unit tests | 1 new test file, 4 test cases | ✅ Granular |
