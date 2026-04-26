# Booking Flow

**Tags:** booking, flow, use-case
**Discovered:** 2026-04-09

## HTTP Entry Point
`packages/api/src/http/routes/booking.routes.ts` → `POST /api/book`

## Flow
1. Tenant resolved via `X-Tenant-Slug` header → `request.tenantPrisma` set by middleware
2. `bookingSchema.parse(request.body)` — Zod validation (shared schema from `@soberano/shared`)
3. Repos instantiated per-request: `new PrismaAppointmentRepository(request.tenantPrisma)` etc.
4. `CreateAppointment.execute(input)` — use case at `application/use-cases/booking/create-appointment.ts`
5. Validates: service active → barber active → date not past → shift covers slot
6. Calculates endTime from `service.duration`
7. `customerRepo.upsertByPhone()` — create or find customer by phone
8. `appointmentRepo.create()` — Prisma unique constraint `(barberId, date, startTime)` prevents double-booking (P2002 → SlotTakenError)
9. `tenantConfigSchema.parse(request.tenant.config)` → builds `WhatsAppNotificationService`
10. Fire-and-forget: `notificationService.sendBookingConfirmation()` + `notifyBarber()`
11. Returns `{ appointment, cancelUrl }`

## Cancel URL Pattern
`${env.BASE_URL}/agendamento/${cancelToken}` — cancelToken is 32 random bytes hex

## Double-Booking Prevention
Handled at DB level via Prisma unique constraint — not application-level lock.
Race condition window exists but is minimal; constraint is the final guard.
