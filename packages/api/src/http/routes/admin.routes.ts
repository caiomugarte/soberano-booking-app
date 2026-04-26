import crypto from 'node:crypto';
import type { FastifyInstance, FastifyRequest } from 'fastify';
import { z } from 'zod';
import { authGuard } from '../middleware/auth.middleware.js';
import { PrismaAppointmentRepository } from '../../infrastructure/database/repositories/prisma-appointment.repository.js';
import { PrismaProviderRepository } from '../../infrastructure/database/repositories/prisma-provider.repository.js';
import { PrismaServiceRepository } from '../../infrastructure/database/repositories/prisma-service.repository.js';
import { PrismaCustomerRepository } from '../../infrastructure/database/repositories/prisma-customer.repository.js';
import { PrismaCustomerPackageRepository } from '../../infrastructure/database/repositories/prisma-customer-package.repository.js';
import { WhatsAppNotificationService } from '../../infrastructure/notifications/whatsapp-notification.service.js';
import { ChatwootClient } from '../../infrastructure/notifications/chatwoot.client.js';
import { AdminCreateAppointment } from '../../application/use-cases/booking/admin-create-appointment.js';
import { APPOINTMENT_STATUS, bookingSchema, createPackageSchema, tenantConfigSchema } from '@soberano/shared';
import { NotFoundError, SlotTakenError, ValidationError } from '../../shared/errors.js';

export async function adminRoutes(app: FastifyInstance): Promise<void> {
  // All admin routes require authentication
  app.addHook('preHandler', authGuard);

  // Get the logged-in provider's profile
  app.get('/admin/me', async (request, reply) => {
    const providerRepo = new PrismaProviderRepository(request.tenantPrisma);
    const provider = await providerRepo.findById(request.providerId!);
    if (!provider) return reply.status(404).send({ error: 'NOT_FOUND' });
    return {
      id: provider.id,
      firstName: provider.firstName,
      lastName: provider.lastName,
      phone: provider.phone,
      avatarUrl: provider.avatarUrl,
      pixKey: provider.pixKey,
      messageTemplate: provider.messageTemplate,
    };
  });

  // Update the logged-in provider's profile
  app.patch('/admin/me', async (request, reply) => {
    const schema = z.object({
      phone: z.string().regex(/^\d{10,11}$/, 'Telefone deve ter 10 ou 11 dígitos').nullable().optional(),
      pixKey: z.string().max(255).optional(),
      messageTemplate: z.string().max(2000).optional(),
    }).refine((d) => d.phone !== undefined || d.pixKey !== undefined || d.messageTemplate !== undefined, {
      message: 'Informe ao menos um campo para atualizar.',
    });

    const parsed = schema.safeParse(request.body);
    if (!parsed.success) {
      return reply.status(400).send({ error: 'VALIDATION_ERROR', message: parsed.error.errors[0].message });
    }

    const updated = await request.tenantPrisma.provider.update({
      where: { id: request.providerId! },
      data: parsed.data,
    });

    return {
      id: updated.id,
      firstName: updated.firstName,
      lastName: updated.lastName,
      phone: updated.phone,
      avatarUrl: updated.avatarUrl,
      pixKey: updated.pixKey,
      messageTemplate: updated.messageTemplate,
    };
  });

  // Get provider's appointments for a date
  app.get('/admin/appointments', async (request) => {
    const { date } = request.query as { date?: string };
    const providerId = request.providerId!;

    const targetDate = date ? new Date(date + 'T00:00:00') : new Date();
    targetDate.setHours(0, 0, 0, 0);

    const appointmentRepo = new PrismaAppointmentRepository(request.tenantPrisma);
    const { appointments, total, summary } = await appointmentRepo.findByBarberAndDate(providerId, targetDate);
    return { appointments, total, summary };
  });

  // Delete an appointment
  app.delete<{ Params: { id: string } }>('/admin/appointments/:id', async (request, reply) => {
    const { id } = request.params;
    const appointmentRepo = new PrismaAppointmentRepository(request.tenantPrisma);
    const appointment = await appointmentRepo.findById(id);
    if (!appointment) return reply.status(404).send({ error: 'NOT_FOUND' });
    await appointmentRepo.deleteById(id);
    return reply.status(204).send();
  });

  // Get all appointments for a date range (weekly calendar view)
  app.get('/admin/appointments/range', async (request, reply) => {
    const { from, to } = request.query as { from?: string; to?: string };
    if (!from || !to) return reply.status(400).send({ error: 'BAD_REQUEST', message: 'from e to são obrigatórios.' });
    const appointmentRepo = new PrismaAppointmentRepository(request.tenantPrisma);
    const appointments = await appointmentRepo.findByBarberAndDateRange(
      request.providerId!,
      new Date(from + 'T00:00:00'),
      new Date(to + 'T00:00:00'),
    );
    return { appointments };
  });

  // Get aggregated stats for a date range (weekly / monthly views)
  app.get('/admin/stats', async (request, reply) => {
    const { from, to } = request.query as { from?: string; to?: string };
    if (!from || !to) return reply.status(400).send({ error: 'BAD_REQUEST', message: 'from e to são obrigatórios.' });
    const fromDate = new Date(from + 'T00:00:00');
    const toDate = new Date(to + 'T00:00:00');
    const appointmentRepo = new PrismaAppointmentRepository(request.tenantPrisma);
    const days = await appointmentRepo.getStatsByDateRange(request.providerId!, fromDate, toDate);
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

    const appointmentRepo = new PrismaAppointmentRepository(request.tenantPrisma);
    await appointmentRepo.updateStatus(id, status);
    return { message: 'Status atualizado.' };
  });

  // Admin manually creates an appointment for a customer
  app.post('/admin/appointments', async (request: FastifyRequest, reply) => {
    const adminBookingSchema = bookingSchema.omit({ barberId: true }).extend({
      customerPhone: z.string().regex(/^\d{10,11}$/, 'Telefone deve ter 10 ou 11 dígitos').optional(),
      priceCents: z.number().int().positive().optional(),
      packageId: z.string().uuid().optional(),
    });
    const parsed = adminBookingSchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.status(400).send({ error: 'VALIDATION_ERROR', message: parsed.error.errors[0].message });
    }

    const appointmentRepo = new PrismaAppointmentRepository(request.tenantPrisma);
    const serviceRepo = new PrismaServiceRepository(request.tenantPrisma);
    const providerRepo = new PrismaProviderRepository(request.tenantPrisma);
    const customerRepo = new PrismaCustomerRepository(request.tenantPrisma);
    const packageRepo = new PrismaCustomerPackageRepository(request.tenantPrisma);
    const config = tenantConfigSchema.parse(request.tenant.config);
    const chatwootClient = new ChatwootClient(config);
    const notificationService = new WhatsAppNotificationService(config, chatwootClient);

    const useCase = new AdminCreateAppointment(
      appointmentRepo,
      serviceRepo,
      providerRepo,
      customerRepo,
      notificationService,
      packageRepo,
    );

    try {
      const result = await useCase.execute({ ...parsed.data, tenantId: request.tenant.id, barberId: request.providerId!, bookingUrl: config.bookingUrl });
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
  app.get('/admin/customers/lookup', async (request, reply) => {
    const { phone } = request.query as { phone?: string };
    if (!phone) {
      return reply.status(400).send({ error: 'BAD_REQUEST', message: 'phone é obrigatório.' });
    }
    const customerRepo = new PrismaCustomerRepository(request.tenantPrisma);
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

    const appointmentRepo = new PrismaAppointmentRepository(request.tenantPrisma);
    const serviceRepo = new PrismaServiceRepository(request.tenantPrisma);
    const appointment = await appointmentRepo.findById(id);
    if (!appointment) return reply.status(404).send({ error: 'NOT_FOUND', message: 'Agendamento não encontrado.' });

    const { serviceId, date: dateStr, startTime } = parsed.data;

    // Resolve service (new or existing)
    const service = serviceId ? await serviceRepo.findById(serviceId) : appointment.service;
    if (!service) return reply.status(404).send({ error: 'NOT_FOUND', message: 'Serviço não encontrado.' });

    const newDateStr = dateStr ?? (appointment.date as Date).toISOString().slice(0, 10);
    const newDate = new Date(newDateStr + 'T00:00:00');
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

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const isInThePast = newDate < today;
    if (timeOrDateChanged && !isInThePast && updated.customer.phone) {
      const config = tenantConfigSchema.parse(request.tenant.config);
      const chatwootClient = new ChatwootClient(config);
      const notificationService = new WhatsAppNotificationService(config, chatwootClient);
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

    const appointmentRepo = new PrismaAppointmentRepository(request.tenantPrisma);
    const customerRepo = new PrismaCustomerRepository(request.tenantPrisma);
    const appointment = await appointmentRepo.findById(id);
    if (!appointment) return reply.status(404).send({ error: 'NOT_FOUND', message: 'Agendamento não encontrado.' });

    const { name, phone } = parsed.data;
    const currentCustomer = appointment.customer;
    const phoneChanged = phone && phone !== currentCustomer.phone;

    if (phoneChanged) {
      const newName = name ?? currentCustomer.name;
      const newCustomer = await customerRepo.upsertByPhone(phone, newName, request.tenant.id);
      await appointmentRepo.updateCustomer(id, newCustomer.id);
      // Re-fetch to get updated appointment with relations for notification
      const updated = await appointmentRepo.findById(id);
      if (updated) {
        const config = tenantConfigSchema.parse(request.tenant.config);
        const chatwootClient = new ChatwootClient(config);
        const notificationService = new WhatsAppNotificationService(config, chatwootClient);
        notificationService.sendBookingConfirmation(updated).catch((err) => {
          console.error('[WhatsApp] Failed to send confirmation after phone update:', err);
        });
      }
    } else if (name) {
      await customerRepo.updateName(currentCustomer.id, name);
    }

    return { message: 'Dados do cliente atualizados.' };
  });

  // Mark an appointment as paid
  app.patch<{ Params: { id: string } }>('/admin/appointments/:id/pay', async (request, reply) => {
    const { id } = request.params;
    const appointmentRepo = new PrismaAppointmentRepository(request.tenantPrisma);
    const appointment = await appointmentRepo.findById(id);
    if (!appointment) return reply.status(404).send({ error: 'NOT_FOUND', message: 'Agendamento não encontrado.' });
    if (appointment.paymentStatus === 'paid') return reply.status(409).send({ error: 'ALREADY_PAID', message: 'Agendamento já marcado como pago.' });
    const updated = await appointmentRepo.updatePaymentStatus(id, new Date());
    return updated;
  });

  // Get financial summary for a date range
  app.get('/admin/financial', async (request, reply) => {
    const { from, to } = request.query as { from?: string; to?: string };
    if (!from || !to) return reply.status(400).send({ error: 'BAD_REQUEST', message: 'from e to são obrigatórios.' });
    const fromDate = new Date(from + 'T00:00:00');
    const toDate = new Date(to + 'T00:00:00');
    if (fromDate > toDate) return reply.status(400).send({ error: 'BAD_REQUEST', message: 'from não pode ser maior que to.' });
    const appointmentRepo = new PrismaAppointmentRepository(request.tenantPrisma);
    return appointmentRepo.getFinancialSummary(request.providerId!, fromDate, toDate);
  });

  // Create a customer package
  app.post('/admin/packages', async (request, reply) => {
    const parsed = createPackageSchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.status(400).send({ error: 'VALIDATION_ERROR', message: parsed.error.errors[0].message });
    }
    const packageRepo = new PrismaCustomerPackageRepository(request.tenantPrisma);
    const pkg = await packageRepo.create({ ...parsed.data, tenantId: request.tenant.id });
    return reply.status(201).send(pkg);
  });

  // List packages — by phone (active only) or all with optional status filter
  app.get('/admin/packages', async (request, reply) => {
    const { phone, status } = request.query as { phone?: string; status?: string };
    const packageRepo = new PrismaCustomerPackageRepository(request.tenantPrisma);
    if (phone) {
      const packages = await packageRepo.findActiveByPhone(request.tenant.id, phone);
      return { packages };
    }
    const packages = await packageRepo.findAllByTenant(request.tenant.id, status ? { status } : undefined);
    return { packages };
  });

  // Deactivate a package
  app.patch<{ Params: { id: string } }>('/admin/packages/:id/deactivate', async (request, reply) => {
    const { id } = request.params;
    const packageRepo = new PrismaCustomerPackageRepository(request.tenantPrisma);
    try {
      const pkg = await packageRepo.deactivate(id, request.tenant.id);
      return { package: pkg };
    } catch (err) {
      if ((err as Error).message === 'NOT_FOUND') return reply.status(404).send({ error: 'NOT_FOUND' });
      if ((err as Error).message === 'NOT_ACTIVE') return reply.status(400).send({ error: 'BAD_REQUEST', message: 'Pacote não está ativo.' });
      throw err;
    }
  });

  // Delete a cancelled package
  app.delete<{ Params: { id: string } }>('/admin/packages/:id', async (request, reply) => {
    const { id } = request.params;
    const packageRepo = new PrismaCustomerPackageRepository(request.tenantPrisma);
    try {
      await packageRepo.deleteById(id, request.tenant.id);
      return reply.status(204).send();
    } catch (err) {
      if ((err as Error).message === 'NOT_FOUND') return reply.status(404).send({ error: 'NOT_FOUND' });
      if ((err as Error).message === 'NOT_CANCELLED') return reply.status(400).send({ error: 'BAD_REQUEST', message: 'Apenas pacotes cancelados podem ser apagados.' });
      throw err;
    }
  });

  // Provider cancels an appointment and notifies the customer
  app.post<{ Params: { id: string } }>('/admin/appointments/:id/cancel', async (request, reply) => {
    const { id } = request.params;
    const { reason } = z.object({ reason: z.string().min(1).max(300) }).parse(request.body);

    const appointmentRepo = new PrismaAppointmentRepository(request.tenantPrisma);
    const appointment = await appointmentRepo.findById(id);
    if (!appointment) {
      return reply.status(404).send({ error: 'NOT_FOUND', message: 'Agendamento não encontrado.' });
    }
    if (appointment.status !== 'confirmed') {
      return reply.status(400).send({ error: 'BAD_REQUEST', message: 'Apenas agendamentos confirmados podem ser cancelados.' });
    }

    await appointmentRepo.updateStatus(id, APPOINTMENT_STATUS.CANCELLED, new Date());

    // Fire-and-forget notification to customer
    const config = tenantConfigSchema.parse(request.tenant.config);
    const chatwootClient = new ChatwootClient(config);
    const notificationService = new WhatsAppNotificationService(config, chatwootClient);
    notificationService.sendBarberCancellationToCustomer(appointment, reason).catch((err) => {
      console.error('[WhatsApp] Failed to send barber cancellation notice:', err);
    });

    return { message: 'Agendamento cancelado e cliente notificado.' };
  });
}
