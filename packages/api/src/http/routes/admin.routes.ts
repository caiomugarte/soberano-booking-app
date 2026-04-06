import type { FastifyInstance, FastifyRequest } from 'fastify';
import { z } from 'zod';
import { authGuard } from '../middleware/auth.middleware.js';
import { PrismaAppointmentRepository } from '../../infrastructure/database/repositories/prisma-appointment.repository.js';
import { PrismaBarberRepository } from '../../infrastructure/database/repositories/prisma-barber.repository.js';
import { PrismaServiceRepository } from '../../infrastructure/database/repositories/prisma-service.repository.js';
import { PrismaCustomerRepository } from '../../infrastructure/database/repositories/prisma-customer.repository.js';
import { createNotificationService } from '../../infrastructure/notifications/whatsapp-notification.service.js';
import { AdminCreateAppointment } from '../../application/use-cases/booking/admin-create-appointment.js';
import { APPOINTMENT_STATUS, bookingSchema } from '@soberano/shared';
import { NotFoundError, SlotTakenError, ValidationError } from '../../shared/errors.js';

const appointmentRepo = new PrismaAppointmentRepository();
const barberRepo = new PrismaBarberRepository();
const serviceRepo = new PrismaServiceRepository();
const customerRepo = new PrismaCustomerRepository();

export async function adminRoutes(app: FastifyInstance): Promise<void> {
  // All admin routes require authentication
  app.addHook('onRequest', authGuard);

  // Get the logged-in barber's profile
  app.get('/admin/me', { schema: { tags: ['Admin'], summary: 'Get logged-in barber profile', security: [{ bearerAuth: [] }] } }, async (request: FastifyRequest & { barberId?: string }, reply) => {
    const barber = await barberRepo.findById(request.barberId!, request.client.id);
    if (!barber) return reply.status(404).send({ error: 'NOT_FOUND' });
    return { firstName: barber.firstName, lastName: barber.lastName, avatarUrl: barber.avatarUrl };
  });

  // Get barber's appointments for a date
  app.get('/admin/appointments', { schema: { tags: ['Admin'], summary: "Get barber's appointments for a date", querystring: z.object({ date: z.string().optional() }), security: [{ bearerAuth: [] }] } }, async (request: FastifyRequest & { barberId?: string }) => {
    const { date } = request.query as { date?: string };
    const barberId = request.barberId!;
    const clientId = request.client.id;

    const targetDate = date ? new Date(date + 'T00:00:00') : new Date();
    targetDate.setHours(0, 0, 0, 0);

    const { appointments, total, summary } = await appointmentRepo.findByBarberAndDate(barberId, targetDate, clientId);
    return { appointments, total, summary };
  });

  // Delete an appointment
  app.delete<{ Params: { id: string } }>('/admin/appointments/:id', { schema: { tags: ['Admin'], summary: 'Delete appointment', params: z.object({ id: z.string() }), security: [{ bearerAuth: [] }] } }, async (request, reply) => {
    const { id } = request.params;
    const appointment = await appointmentRepo.findById(id, request.client.id);
    if (!appointment) return reply.status(404).send({ error: 'NOT_FOUND' });
    await appointmentRepo.deleteById(id);
    return reply.status(204).send();
  });

  // Get all appointments for a date range (weekly calendar view)
  app.get('/admin/appointments/range', { schema: { tags: ['Admin'], summary: 'Get appointments for a date range', querystring: z.object({ from: z.string(), to: z.string() }), security: [{ bearerAuth: [] }] } }, async (request: FastifyRequest & { barberId?: string }, reply) => {
    const { from, to } = request.query as { from?: string; to?: string };
    if (!from || !to) return reply.status(400).send({ error: 'BAD_REQUEST', message: 'from e to são obrigatórios.' });
    const appointments = await appointmentRepo.findByBarberAndDateRange(
      request.barberId!,
      new Date(from + 'T00:00:00'),
      new Date(to + 'T00:00:00'),
      request.client.id,
    );
    return { appointments };
  });

  // Get aggregated stats for a date range (weekly / monthly views)
  app.get('/admin/stats', { schema: { tags: ['Admin'], summary: 'Get appointment stats for a date range', querystring: z.object({ from: z.string(), to: z.string() }), security: [{ bearerAuth: [] }] } }, async (request: FastifyRequest & { barberId?: string }, reply) => {
    const { from, to } = request.query as { from?: string; to?: string };
    if (!from || !to) return reply.status(400).send({ error: 'BAD_REQUEST', message: 'from e to são obrigatórios.' });
    const fromDate = new Date(from + 'T00:00:00');
    const toDate = new Date(to + 'T00:00:00');
    const days = await appointmentRepo.getStatsByDateRange(request.barberId!, fromDate, toDate, request.client.id);
    return { days };
  });

  // Update appointment status (completed / no_show)
  app.patch<{ Params: { id: string } }>('/admin/appointments/:id', { schema: { tags: ['Admin'], summary: 'Update appointment status', params: z.object({ id: z.string() }), body: z.object({ status: z.enum(['completed', 'no_show']) }), security: [{ bearerAuth: [] }] } }, async (request, reply) => {
    const { id } = request.params;
    const { status } = request.body as { status: string };

    if (![APPOINTMENT_STATUS.COMPLETED, APPOINTMENT_STATUS.NO_SHOW].includes(status as never)) {
      return reply.status(400).send({
        error: 'BAD_REQUEST',
        message: 'Status deve ser "completed" ou "no_show".',
      });
    }

    await appointmentRepo.updateStatus(id, status);
    return { message: 'Status atualizado.' };
  });

  // Admin manually creates an appointment for a customer
  app.post('/admin/appointments', { schema: { tags: ['Admin'], summary: 'Admin creates appointment for customer', body: bookingSchema.omit({ barberId: true }).extend({ customerPhone: z.string().optional() }), security: [{ bearerAuth: [] }] } }, async (request: FastifyRequest & { barberId?: string }, reply) => {
    const adminBookingSchema = bookingSchema.omit({ barberId: true }).extend({
      customerPhone: z.string().regex(/^\d{10,11}$/, 'Telefone deve ter 10 ou 11 dígitos').optional(),
    });
    const parsed = adminBookingSchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.status(400).send({ error: 'VALIDATION_ERROR', message: parsed.error.errors[0].message });
    }

    const notificationService = createNotificationService(request.client);
    const useCase = new AdminCreateAppointment(
      appointmentRepo,
      serviceRepo,
      barberRepo,
      customerRepo,
      notificationService,
    );

    try {
      const result = await useCase.execute({
        ...parsed.data,
        barberId: request.barberId!,
        clientId: request.client.id,
      });
      const cancelUrl = `${request.client.baseUrl}/agendamento/${result.appointment.cancelToken}`;
      return reply.status(201).send({ ...result, cancelUrl });
    } catch (err) {
      if (err instanceof SlotTakenError) {
        return reply.status(409).send({ error: 'SLOT_TAKEN', message: 'Horário já ocupado.' });
      }
      if (err instanceof ValidationError) {
        return reply.status(400).send({ error: 'VALIDATION_ERROR', message: (err as Error).message });
      }
      if (err instanceof NotFoundError) {
        return reply.status(404).send({ error: 'NOT_FOUND', message: (err as Error).message });
      }
      throw err;
    }
  });

  // Look up a customer by phone number
  app.get('/admin/customers/lookup', { schema: { tags: ['Admin'], summary: 'Look up customer by phone', querystring: z.object({ phone: z.string() }), security: [{ bearerAuth: [] }] } }, async (request: FastifyRequest & { barberId?: string }, reply) => {
    const { phone } = request.query as { phone?: string };
    if (!phone) {
      return reply.status(400).send({ error: 'BAD_REQUEST', message: 'phone é obrigatório.' });
    }
    const customer = await customerRepo.findByPhone(phone, request.client.id);
    return { name: customer ? customer.name : null };
  });

  // Barber cancels an appointment and notifies the customer
  app.post<{ Params: { id: string } }>('/admin/appointments/:id/cancel', { schema: { tags: ['Admin'], summary: 'Barber cancels appointment and notifies customer', params: z.object({ id: z.string() }), body: z.object({ reason: z.string().min(1).max(300) }), security: [{ bearerAuth: [] }] } }, async (request, reply) => {
    const { id } = request.params;
    const { reason } = z.object({ reason: z.string().min(1).max(300) }).parse(request.body);

    const appointment = await appointmentRepo.findById(id, request.client.id);
    if (!appointment) {
      return reply.status(404).send({ error: 'NOT_FOUND', message: 'Agendamento não encontrado.' });
    }
    if (appointment.status !== 'confirmed') {
      return reply.status(400).send({ error: 'BAD_REQUEST', message: 'Apenas agendamentos confirmados podem ser cancelados.' });
    }

    await appointmentRepo.updateStatus(id, APPOINTMENT_STATUS.CANCELLED, new Date());

    const notificationService = createNotificationService(request.client);
    notificationService.sendBarberCancellationToCustomer(appointment, reason).catch((err) => {
      console.error('[WhatsApp] Failed to send barber cancellation notice:', err);
    });

    return { message: 'Agendamento cancelado e cliente notificado.' };
  });
}
