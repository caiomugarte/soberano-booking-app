# Admin Barber Identity – Tasks

**Spec**: `.specs/features/admin-barber-identity/spec.md`
**Status**: Draft

---

## Execution Plan

2 tasks, sequential. T1 must land before T2 because the UI depends on the type being correct.

```
T1 → T2
```

---

## Task Breakdown

### T1: Extend `AdminAppointment` type with barber field

**What**: Add `barber: { firstName: string; lastName: string; avatarUrl: string | null }` to the `AdminAppointment` interface so TypeScript knows the API already returns it.
**Where**: `packages/web/src/api/use-admin.ts` — line 5, `AdminAppointment` interface
**Depends on**: None
**Reuses**: Existing shape from `includeRelations` in `prisma-appointment.repository.ts` (lines 10–19)
**Requirement**: ABI-04

**Done when**:
- [ ] `AdminAppointment` has `barber: { firstName: string; lastName: string; avatarUrl: string | null }`
- [ ] `tsc --noEmit` passes in `packages/web`

**Verify**:
```bash
pnpm --filter web tsc --noEmit
# Expected: no errors
```

---

### T2: Render barber photo + name in `AppointmentCard`

**What**: Add a barber identity row to `AppointmentCard` — circular photo (32×32px) when `avatarUrl` is set, initials fallback (`firstName[0] + lastName[0]`) when null or on `onError`; followed by the barber's full name.
**Where**: `packages/web/src/pages/admin/DashboardPage.tsx` — `AppointmentCard` component (lines 41–105)
**Depends on**: T1
**Reuses**: Photo + initials pattern already in `BarberStep.tsx` (lines 34–49); gold/dark-border class naming from same file

**Implementation detail**:
- Place the barber row inside the existing `<div className="flex items-start justify-between ...">` block, below the customer name/phone lines (after line 68)
- Photo: `w-8 h-8 rounded-full object-cover border border-dark-border`
- Initials fallback: same dimensions, `bg-dark-border flex items-center justify-center text-xs font-bold`
- Full name: `text-xs text-muted` inline next to the photo

**Requirement**: ABI-01, ABI-02, ABI-03

**Done when**:
- [ ] Appointment card shows barber photo when `avatarUrl` is set
- [ ] Appointment card shows initials (e.g. `MK`) when `avatarUrl` is null
- [ ] `onError` on `<img>` hides the photo and shows initials fallback
- [ ] `tsc --noEmit` passes in `packages/web`
- [ ] Visual check: open admin dashboard → day view → any card shows barber identity row

**Verify**:
```bash
pnpm --filter web tsc --noEmit
# Then open admin dashboard in browser and check a card
```

---

## Parallel Execution Map

```
Phase 1 (Sequential):
  T1 ──→ T2
```

---

## Granularity Check

| Task | Scope | Status |
|------|-------|--------|
| T1: Extend AdminAppointment type | 1 interface, 1 file | ✅ Granular |
| T2: Render barber identity in AppointmentCard | 1 component block, 1 file | ✅ Granular |
