import crypto from 'node:crypto';
import type { FastifyInstance, FastifyRequest } from 'fastify';
import { z } from 'zod';
import { authGuard } from '../middleware/auth.middleware.js';
import { PrismaAppointmentRepository } from '../../infrastructure/database/repositories/prisma-appointment.repository.js';
import { PrismaBarberRepository } from '../../infrastructure/database/repositories/prisma-barber.repository.js';
import { PrismaServiceRepository } from '../../infrastructure/database/repositories/prisma-service.repository.js';
import { PrismaCustomerRepository } from '../../infrastructure/database/repositories/prisma-customer.repository.js';
import { WhatsAppNotificationService } from '../../infrastructure/notifications/whatsapp-notification.service.js';
import { AdminCreateAppointment } from '../../application/use-cases/booking/admin-create-appointment.js';
import { APPOINTMENT_STATUS, bookingSchema } from '@soberano/shared';
import { NotFoundError, SlotTakenError, ValidationError } from '../../shared/errors.js';

const appointmentRepo = new PrismaAppointmentRepository();
const barberRepo = new PrismaBarberRepository();
const serviceRepo = new PrismaServiceRepository();
const customerRepo = new PrismaCustomerRepository();
const notificationService = new WhatsAppNotificationService();

export async function adminRoutes(app: FastifyInstance): Promise<void> {
  // All admin routes require authentication
  app.addHook('onRequest', authGuard);

  // Get the logged-in barber's profile
  app.get('/admin/me', async (request: FastifyRequest & { barberId?: string }, reply) => {
    const barber = await barberRepo.findById(request.barberId!);
    if (!barber) return reply.status(404).send({ error: 'NOT_FOUND' });
    return { id: barber.id, firstName: barber.firstName, lastName: barber.lastName, avatarUrl: barber.avatarUrl };
  });

  // Get barber's appointments for a date
  app.get('/admin/appointments', async (request: FastifyRequest & { barberId?: string }) => {
    const { date } = request.query as { date?: string };
    const barberId = request.barberId!;

    const targetDate = date ? new Date(date + 'T00:00:00') : new Date();
    targetDate.setHours(0, 0, 0, 0);

    const { appointments, total, summary } = await appointmentRepo.findByBarberAndDate(barberId, targetDate);
    return { appointments, total, summary };
  });

  // Delete an appointment
  app.delete<{ Params: { id: string } }>('/admin/appointments/:id', async (request, reply) => {
    const { id } = request.params;
    const appointment = await appointmentRepo.findById(id);
    if (!appointment) return reply.status(404).send({ error: 'NOT_FOUND' });
    await appointmentRepo.deleteById(id);
    return reply.status(204).send();
  });

  // Get all appointments for a date range (weekly calendar view)
  app.get('/admin/appointments/range', async (request: FastifyRequest & { barberId?: string }, reply) => {
    const { from, to } = request.query as { from?: string; to?: string };
    if (!from || !to) return reply.status(400).send({ error: 'BAD_REQUEST', message: 'from e to são obrigatórios.' });
    const appointments = await appointmentRepo.findByBarberAndDateRange(
      request.barberId!,
      new Date(from + 'T00:00:00'),
      new Date(to + 'T00:00:00'),
    );
    return { appointments };
  });

  // Get aggregated stats for a date range (weekly / monthly views)
  app.get('/admin/stats', async (request: FastifyRequest & { barberId?: string }, reply) => {
    const { from, to } = request.query as { from?: string; to?: string };
    if (!from || !to) return reply.status(400).send({ error: 'BAD_REQUEST', message: 'from e to são obrigatórios.' });
    const fromDate = new Date(from + 'T00:00:00');
    const toDate = new Date(to + 'T00:00:00');
    const days = await appointmentRepo.getStatsByDateRange(request.barberId!, fromDate, toDate);
    return { days };
  });

  // Update appointment status (completed / no_show)
  app.patch<{ Params: { id: string } }>('/admin/appointments/:id', async (request, reply) => {
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
  app.post('/admin/appointments', async (request: FastifyRequest & { barberId?: string }, reply) => {
    const adminBookingSchema = bookingSchema.omit({ barberId: true }).extend({
      customerPhone: z.string().regex(/^\d{10,11}$/, 'Telefone deve ter 10 ou 11 dígitos').optional(),
    });
    const parsed = adminBookingSchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.status(400).send({ error: 'VALIDATION_ERROR', message: parsed.error.errors[0].message });
    }

    const useCase = new AdminCreateAppointment(
      appointmentRepo,
      serviceRepo,
      barberRepo,
      customerRepo,
      notificationService,
    );

    try {
      const result = await useCase.execute({ ...parsed.data, barberId: request.barberId! });
      return reply.status(201).send(result);
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
  app.get('/admin/customers/lookup', async (request: FastifyRequest & { barberId?: string }, reply) => {
    const { phone } = request.query as { phone?: string };
    if (!phone) {
      return reply.status(400).send({ error: 'BAD_REQUEST', message: 'phone é obrigatório.' });
    }
    const customer = await customerRepo.findByPhone(phone);
    return { name: customer ? customer.name : null };
  });

  // Admin reschedules an appointment (service, date, time)
  app.patch<{ Params: { id: string } }>('/admin/appointments/:id/schedule', async (request, reply) => {
    const { id } = request.params;
    const schema = z.object({
      serviceId: z.string().uuid().optional(),
      date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Data inválida').optional(),
      startTime: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, 'Horário inválido').optional(),
    }).refine((d) => d.serviceId || d.date || d.startTime, {
      message: 'Informe ao menos um campo para atualizar.',
    });

    const parsed = schema.safeParse(request.body);
    if (!parsed.success) {
      return reply.status(400).send({ error: 'VALIDATION_ERROR', message: parsed.error.errors[0].message });
    }

    const appointment = await appointmentRepo.findById(id);
    if (!appointment) return reply.status(404).send({ error: 'NOT_FOUND', message: 'Agendamento não encontrado.' });

    const { serviceId, date: dateStr, startTime } = parsed.data;

    // Resolve service (new or existing)
    const service = serviceId ? await serviceRepo.findById(serviceId) : appointment.service;
    if (!service) return reply.status(404).send({ error: 'NOT_FOUND', message: 'Serviço não encontrado.' });

    const newDate = dateStr ? new Date(dateStr + 'T00:00:00') : new Date(appointment.date);
    const newStartTime = startTime ?? appointment.startTime;
    const currentDateStr = (appointment.date as Date).toISOString().slice(0, 10);
    const timeOrDateChanged =
      (!!dateStr && dateStr !== currentDateStr) ||
      (!!startTime && startTime !== appointment.startTime);

    // Recalculate endTime from service duration
    const [h, m] = newStartTime.split(':').map(Number);
    const endMinutes = h * 60 + m + service.duration;
    const newEndTime = `${String(Math.floor(endMinutes / 60)).padStart(2, '0')}:${String(endMinutes % 60).padStart(2, '0')}`;

    // Check slot availability if date/time is changing, excluding this appointment
    if (timeOrDateChanged) {
      const bookedSlots = await appointmentRepo.findBookedSlots(appointment.barberId, newDate, id);
      if (bookedSlots.includes(newStartTime)) {
        return reply.status(409).send({ error: 'SLOT_TAKEN', message: 'Horário já ocupado.' });
      }
    }

    const newCancelToken = timeOrDateChanged ? crypto.randomBytes(32).toString('hex') : undefined;

    const updated = await appointmentRepo.updateSchedule(id, {
      ...(serviceId ? { serviceId, priceCents: service.priceCents } : {}),
      endTime: newEndTime,
      ...(timeOrDateChanged ? {
        date: newDate,
        startTime: newStartTime,
        cancelToken: newCancelToken!,
        reminderSent: false,
        barberReminderSent: false,
      } : {}),
    });

    if (timeOrDateChanged && updated.customer.phone) {
      notificationService.sendChangeNotice(updated).catch((err) => {
        console.error('[WhatsApp] Failed to send change notice after admin reschedule:', err);
      });
    }

    return { message: 'Agendamento atualizado.' };
  });

  // Admin edits customer info on an appointment (name and/or phone)
  app.patch<{ Params: { id: string } }>('/admin/appointments/:id/customer', async (request, reply) => {
    const { id } = request.params;
    const schema = z.object({
      name: z.string().min(1).max(100).optional(),
      phone: z.string().regex(/^\d{10,11}$/, 'Telefone deve ter 10 ou 11 dígitos').optional(),
    }).refine((d) => d.name || d.phone, { message: 'Informe nome ou telefone.' });

    const parsed = schema.safeParse(request.body);
    if (!parsed.success) {
      return reply.status(400).send({ error: 'VALIDATION_ERROR', message: parsed.error.errors[0].message });
    }

    const appointment = await appointmentRepo.findById(id);
    if (!appointment) return reply.status(404).send({ error: 'NOT_FOUND', message: 'Agendamento não encontrado.' });

    const { name, phone } = parsed.data;
    const currentCustomer = appointment.customer;
    const phoneChanged = phone && phone !== currentCustomer.phone;

    if (phoneChanged) {
      const newName = name ?? currentCustomer.name;
      const newCustomer = await customerRepo.upsertByPhone(phone, newName);
      await appointmentRepo.updateCustomer(id, newCustomer.id);
      // Re-fetch to get updated appointment with relations for notification
      const updated = await appointmentRepo.findById(id);
      if (updated) {
        notificationService.sendBookingConfirmation(updated).catch((err) => {
          console.error('[WhatsApp] Failed to send confirmation after phone update:', err);
        });
      }
    } else if (name) {
      await customerRepo.updateName(currentCustomer.id, name);
    }

    return { message: 'Dados do cliente atualizados.' };
  });

  // Barber cancels an appointment and notifies the customer
  app.post<{ Params: { id: string } }>('/admin/appointments/:id/cancel', async (request, reply) => {
    const { id } = request.params;
    const { reason } = z.object({ reason: z.string().min(1).max(300) }).parse(request.body);

    const appointment = await appointmentRepo.findById(id);
    if (!appointment) {
      return reply.status(404).send({ error: 'NOT_FOUND', message: 'Agendamento não encontrado.' });
    }
    if (appointment.status !== 'confirmed') {
      return reply.status(400).send({ error: 'BAD_REQUEST', message: 'Apenas agendamentos confirmados podem ser cancelados.' });
    }

    await appointmentRepo.updateStatus(id, APPOINTMENT_STATUS.CANCELLED, new Date());

    // Fire-and-forget notification to customer
    notificationService.sendBarberCancellationToCustomer(appointment, reason).catch((err) => {
      console.error('[WhatsApp] Failed to send barber cancellation notice:', err);
    });

    return { message: 'Agendamento cancelado e cliente notificado.' };
  });
}
