# Repository Methods for MCP Provider Tools

tags: mcp, repositories, appointment, provider-shift, reference

## AppointmentRepository

File: `packages/api/src/infrastructure/database/repositories/prisma-appointment.repository.ts`
Interface: `packages/api/src/domain/repositories/appointment.repository.ts`

### Methods relevant to provider/MCP tools

`findByBarberAndDate(barberId, date: Date)`
→ `{ appointments: AppointmentWithDetails[], total, summary: { confirmed, completed, revenueCents } }`
Used by: `GET /internal/provider-appointments`, `GET /admin/appointments`

`getStatsByDateRange(barberId, from: Date, to: Date)`
→ `DayStat[]` where `DayStat = { date, confirmed, completed, revenueCents }`
Groups by day. Only days with activity are returned (sparse — no zero-filled gaps).
Used by: `GET /internal/provider-stats`, `GET /admin/stats`

`findByBarberAndDateRange(barberId, from: Date, to: Date)`
→ `AppointmentWithDetails[]` ordered by date+startTime
Full appointment objects (with customer, service, barber relations).
Used by: `GET /admin/appointments/range`

`findBookedSlots(barberId, date: Date, excludeId?)`
→ `string[]` of `startTime` values for confirmed appointments
Used for slot conflict checking.

### AppointmentWithDetails shape (key fields)
`id, barberId, date, startTime, endTime, status, priceCents, cancelToken`
Relations: `customer { id, name, phone }`, `service { id, name, duration, priceCents, icon }`, `barber { id, firstName, lastName, slug }`

Note: DB column is `providerId` — the repository maps it to `barberId` in `mapAppointment()`.

## ProviderShiftRepository

File: `packages/api/src/infrastructure/database/repositories/prisma-provider-shift.repository.ts`

### Methods relevant to provider/MCP tools

`createAbsence(data)` → `ProviderAbsenceEntity`
`findAbsencesByProvider(providerId)` → `ProviderAbsenceEntity[]` (all, not filtered by date)
`deleteAbsence(id)` → void
`updateAbsence(id, updates)` → `ProviderAbsenceEntity`

### ProviderAbsenceEntity shape
`id, tenantId, providerId, date: Date, startTime: string|null, endTime: string|null, reason: string|null`
Full-day absence = startTime and endTime both null.

## Important Gotcha

`findAbsencesByProvider` returns ALL absences including past ones. The internal route filters to upcoming:
```
const today = todayInCampoGrande();
const upcoming = all.filter(a => dateString >= today);
```
See: `internal.routes.ts` GET `/internal/provider-absences`.
