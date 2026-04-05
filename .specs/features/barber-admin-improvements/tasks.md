# Barber Admin Improvements — Tasks

**Spec**: `.specs/features/barber-admin-improvements/spec.md`
**Status**: Draft

---

## Execution Plan

### Phase 1 — Independent (Parallel OK)

T1 and T2 have no dependencies on each other and can run simultaneously.

```
T1 [P] ──────────────────────────────────────────→ commit
T2 [P] ──→ T3 ──→ T4 ──→ T5 ──→ T6 ──→ commit
```

### Phase 2 — Repository (Sequential)

T3 implements the interface changes from T2.

### Phase 3 — API Route (Sequential)

T4 wires the repository changes into HTTP endpoints.

### Phase 4 — Frontend API layer (Sequential)

T5 aligns the React Query hooks with the new API contract.

### Phase 5 — UI (Sequential)

T6 consumes the updated hooks and renders the new behaviour.

---

## Parallel Execution Map

```
Phase 1 (Parallel):
  ├── T1 [P]  admin-create-appointment.ts — skip notifications for past dates
  └── T2 [P]  appointment.repository.ts  — update interface

Phase 2:
  T2 done → T3  prisma-appointment.repository.ts — implement changes

Phase 3:
  T3 done → T4  admin.routes.ts — remove pagination + add DELETE endpoint

Phase 4:
  T4 done → T5  use-admin.ts — drop page param + add useDeleteAppointment

Phase 5:
  T5 done → T6  DashboardPage.tsx — remove pagination UI + add Apagar button
```

---

## Task Breakdown

### T1 [P]: Skip notifications for past-date manual bookings

**What**: Add a date guard in `AdminCreateAppointment.execute` — if the booking date is strictly before today's midnight, skip `sendBookingConfirmation` and `notifyBarber`. All other logic (create appointment, return result) stays unchanged.
**Where**: `packages/api/src/application/use-cases/booking/admin-create-appointment.ts`
**Depends on**: None
**Reuses**: Existing `if (input.customerPhone)` notification block (modify it)
**Requirement**: BAI-01

**Done when**:
- [ ] `const today = new Date(); today.setHours(0,0,0,0)` comparison gates the notification block
- [ ] A booking for yesterday with a phone produces no WhatsApp call (log confirms skip)
- [ ] A booking for today or tomorrow with a phone still sends both notifications
- [ ] A booking with no phone still skips notifications (existing guard preserved)
- [ ] TypeScript compiles with no errors

**Commit**: `fix(admin): skip WhatsApp notifications for past-date manual bookings`

---

### T2 [P]: Update AppointmentRepository interface

**What**: Change the `findByBarberAndDate` signature to remove `page` and `limit` params and update its return type to drop pagination fields. Add `deleteById(id: string): Promise<void>` signature.
**Where**: `packages/api/src/domain/repositories/appointment.repository.ts`
**Depends on**: None
**Requirement**: BAI-02, BAI-04

**Exact changes**:
- `findByBarberAndDate(barberId: string, date: Date, page: number, limit: number): Promise<{ appointments: AppointmentWithDetails[]; total: number; summary: ... }>` → remove `page` and `limit` params; keep `{ appointments, total, summary }` return (total is still useful for the summary header)
- Add: `deleteById(id: string): Promise<void>`

**Done when**:
- [ ] `findByBarberAndDate` signature has no `page` or `limit` params
- [ ] `deleteById` is present in the interface
- [ ] TypeScript compiles (T3 will be needed to fully satisfy the compiler)

**Commit**: deferred — commit alongside T3

---

### T3: Implement updated repository methods

**What**: Update `PrismaAppointmentRepository` to match the interface from T2 — remove pagination from `findByBarberAndDate` and implement `deleteById`.
**Where**: `packages/api/src/infrastructure/database/repositories/prisma-appointment.repository.ts`
**Depends on**: T2
**Requirement**: BAI-02, BAI-04

**Exact changes**:
- `findByBarberAndDate`: remove `page`/`limit` params and `skip`/`take` from the `findMany` call. Remove the `total` count query that used `count({ where })` for pagination purposes — or keep it for the summary (check if `total` is still needed by the route). Keep the `confirmedCount` and `completedAgg` for the summary.
- Add `deleteById`:
  ```ts
  async deleteById(id: string): Promise<void> {
    await prisma.appointment.delete({ where: { id } });
  }
  ```

**Done when**:
- [ ] `findByBarberAndDate` no longer accepts or uses `page`/`limit`
- [ ] `findByBarberAndDate` returns all appointments for the date (no `skip`/`take`)
- [ ] `deleteById` deletes the record and throws if not found (Prisma default)
- [ ] TypeScript compiles with no errors
- [ ] Existing `findByBarberAndDateRange` is untouched

**Commit**: `refactor(api): remove pagination from findByBarberAndDate, add deleteById`

---

### T4: Update admin routes — remove pagination + add DELETE endpoint

**What**: Update `GET /admin/appointments` to call `findByBarberAndDate` without `page`/`limit` and drop those fields from the response. Add `DELETE /admin/appointments/:id` endpoint.
**Where**: `packages/api/src/http/routes/admin.routes.ts`
**Depends on**: T3
**Requirement**: BAI-02, BAI-04

**Exact changes to GET `/admin/appointments`**:
- Remove `page`, `limit`, `pageNum`, `limitNum` variables
- Call `appointmentRepo.findByBarberAndDate(barberId, targetDate)` (two args only)
- Return `{ appointments, total, summary }` — drop `page`, `limit`, `totalPages` from response

**New DELETE `/admin/appointments/:id`**:
```ts
app.delete<{ Params: { id: string } }>('/admin/appointments/:id', async (request, reply) => {
  const { id } = request.params;
  const appointment = await appointmentRepo.findById(id);
  if (!appointment) return reply.status(404).send({ error: 'NOT_FOUND' });
  await appointmentRepo.deleteById(id);
  return reply.status(204).send();
});
```

**Done when**:
- [ ] `GET /admin/appointments` response no longer contains `page`, `limit`, `totalPages`
- [ ] `GET /admin/appointments` returns all appointments for the date in one call
- [ ] `DELETE /admin/appointments/:id` returns 204 on success
- [ ] `DELETE /admin/appointments/:id` returns 404 for unknown id
- [ ] Route requires auth (inherited from `app.addHook('onRequest', authGuard)`)
- [ ] TypeScript compiles with no errors

**Commit**: `feat(api): remove appointment pagination, add DELETE /admin/appointments/:id`

---

### T5: Update use-admin.ts — drop page param + add useDeleteAppointment

**What**: Update `useAdminAppointments` to remove the `page` argument and update `AppointmentPage` interface. Add `useDeleteAppointment` mutation hook.
**Where**: `packages/web/src/api/use-admin.ts`
**Depends on**: T4
**Requirement**: BAI-03, BAI-05

**Exact changes**:

1. Update `AppointmentPage` interface — remove `page`, `limit`, `totalPages` fields (keep `appointments`, `total`, `summary`)
2. Update `useAdminAppointments`:
   - Remove `page: number = 1` param
   - Update `queryKey` to `['admin-appointments', date]`
   - Update `queryFn` URL to `/admin/appointments?date=${date}` (no page param)
3. Add mutation:
```ts
export function useDeleteAppointment() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) =>
      authRequest(`/admin/appointments/${id}`, { method: 'DELETE' }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-appointments'] });
    },
  });
}
```

**Done when**:
- [ ] `useAdminAppointments` accepts only `date: string`
- [ ] `AppointmentPage` has no `page`/`limit`/`totalPages` fields
- [ ] `useDeleteAppointment` exported and typed correctly
- [ ] TypeScript compiles with no errors

**Commit**: deferred — commit alongside T6

---

### T6: Update DashboardPage.tsx — remove pagination UI + add Apagar button

**What**: Two UI changes to `DashboardPage.tsx`:
1. Remove `page` state, `setPage` calls, and the pagination `<div>` block from the daily appointments view.
2. Add an "Apagar" button to `AppointmentCard` shown when `(isConfirmed && timePassed) || isCompleted || isNoShow`. Clicking opens a `window.confirm` dialog; on confirmation, calls `useDeleteAppointment`.

**Where**: `packages/web/src/pages/admin/DashboardPage.tsx`
**Depends on**: T5
**Requirement**: BAI-03, BAI-06

**Exact changes**:

1. **Remove pagination**:
   - Remove `const [page, setPage] = useState(1)` (and reset on date change)
   - Update `useAdminAppointments(dateStr)` call — drop `page` arg
   - Remove the `{/* Pagination */}` block (lines ~839–857)

2. **Add Apagar button to `AppointmentCard`**:
   - Accept `onDeleteClick: (id: string) => void` prop
   - Show button when `(isConfirmed && timePassed) || isCompleted || isNoShow`
   - Placement: alongside "Concluído"/"Não Veio" in the confirmed block AND alongside the "Corrigir" buttons in the completed/no_show block
   - Style: destructive red, consistent with existing no_show button style, e.g.:
     ```
     className="py-2 px-3 rounded-lg bg-red-500/10 border border-red-500/30 text-red-400 hover:bg-red-500/20 transition-colors cursor-pointer text-xs font-medium"
     ```
   - Label: `✕ Apagar`

3. **Wire in parent component**:
   - Call `useDeleteAppointment()` in the daily view component
   - Pass `onDeleteClick` to each `AppointmentCard`
   - On click: `if (window.confirm('Tem certeza? Esta ação não pode ser desfeita.')) { deleteMutation.mutate(id) }`

**Done when**:
- [ ] No `page` state or pagination `<div>` exists in the daily view
- [ ] "Apagar" button appears for completed appointments
- [ ] "Apagar" button appears for no_show appointments
- [ ] "Apagar" button appears for confirmed appointments where `timePassed` is true
- [ ] "Apagar" button does NOT appear for confirmed future appointments
- [ ] Clicking "Apagar" shows a confirm dialog before mutating
- [ ] Cancelling the dialog makes no API call
- [ ] On successful delete, the appointment disappears from the list
- [ ] TypeScript compiles with no errors

**Commit**: `feat(web): remove appointment pagination and add Apagar delete button`

---

## Task Granularity Check

| Task | Scope | Status |
|---|---|---|
| T1: Skip notifications for past dates | 1 use-case file, 1 code block | ✅ Granular |
| T2: Update repository interface | 1 interface file, 2 method changes | ✅ Granular |
| T3: Implement updated repository methods | 1 repository file, 2 method changes | ✅ Granular |
| T4: Update admin routes | 1 route file, 1 modified endpoint + 1 new endpoint | ✅ Granular |
| T5: Update use-admin.ts | 1 API layer file, 1 updated hook + 1 new hook | ✅ Granular |
| T6: Update DashboardPage.tsx | 1 component file, pagination removal + button addition | ✅ Granular |

**Coverage check**:

| Requirement | Task |
|---|---|
| BAI-01 | T1 |
| BAI-02 (backend) | T2, T3, T4 |
| BAI-03 (frontend) | T5, T6 |
| BAI-04 (backend) | T2, T3, T4 |
| BAI-05 (frontend hook) | T5 |
| BAI-06 (frontend UI) | T6 |
