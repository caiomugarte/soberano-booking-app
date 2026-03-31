import type { FastifyInstance, FastifyRequest } from 'fastify';
import { z } from 'zod';
import { authGuard } from '../middleware/auth.middleware.js';
import { PrismaAppointmentRepository } from '../../infrastructure/database/repositories/prisma-appointment.repository.js';
import { WhatsAppNotificationService } from '../../infrastructure/notifications/whatsapp-notification.service.js';
import { APPOINTMENT_STATUS } from '@soberano/shared';

const appointmentRepo = new PrismaAppointmentRepository();
const notificationService = new WhatsAppNotificationService();

export async function adminRoutes(app: FastifyInstance): Promise<void> {
  // All admin routes require authentication
  app.addHook('onRequest', authGuard);

  // Get barber's appointments for a date (paginated)
  app.get('/admin/appointments', async (request: FastifyRequest & { barberId?: string }) => {
    const { date, page = '1', limit = '15' } = request.query as { date?: string; page?: string; limit?: string };
    const barberId = request.barberId!;

    const targetDate = date ? new Date(date + 'T00:00:00') : new Date();
    targetDate.setHours(0, 0, 0, 0);

    const pageNum = Math.max(1, parseInt(page, 10) || 1);
    const limitNum = Math.min(50, Math.max(1, parseInt(limit, 10) || 10));

    const { appointments, total, summary } = await appointmentRepo.findByBarberAndDate(barberId, targetDate, pageNum, limitNum);
    return { appointments, total, page: pageNum, limit: limitNum, totalPages: Math.ceil(total / limitNum), summary };
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
