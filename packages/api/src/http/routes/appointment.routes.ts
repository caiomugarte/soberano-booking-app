import type { FastifyInstance } from 'fastify';
import { cancelAppointmentSchema, changeAppointmentSchema } from '@soberano/shared';
import { PrismaAppointmentRepository } from '../../infrastructure/database/repositories/prisma-appointment.repository.js';
import { PrismaBarberShiftRepository } from '../../infrastructure/database/repositories/prisma-barber-shift.repository.js';
import { WhatsAppNotificationService } from '../../infrastructure/notifications/whatsapp-notification.service.js';
import { CancelAppointment } from '../../application/use-cases/booking/cancel-appointment.js';
import { ChangeAppointment } from '../../application/use-cases/booking/change-appointment.js';
import { NotFoundError } from '../../shared/errors.js';

const appointmentRepo = new PrismaAppointmentRepository();
const shiftRepo = new PrismaBarberShiftRepository();
const notificationService = new WhatsAppNotificationService();

export async function appointmentRoutes(app: FastifyInstance): Promise<void> {
  // View appointment by cancel token
  app.get<{ Params: { token: string } }>('/appointment/:token', async (request) => {
    const { token } = request.params;
    const appointment = await appointmentRepo.findByCancelToken(token);
    if (!appointment) {
      throw new NotFoundError('Agendamento');
    }

    // Return without sensitive data — customer still needs to verify phone to take actions
    return {
      appointment: {
        id: appointment.id,
        barberId: appointment.barberId,
        date: appointment.date,
        startTime: appointment.startTime,
        endTime: appointment.endTime,
        status: appointment.status,
        priceCents: appointment.priceCents,
        service: {
          name: appointment.service.name,
          icon: appointment.service.icon,
        },
        barber: {
          firstName: appointment.barber.firstName,
          lastName: appointment.barber.lastName,
        },
        customer: {
          name: appointment.customer.name,
          phoneLast4: appointment.customer.phone.slice(-4),
        },
      },
    };
  });

  // Cancel appointment
  app.patch<{ Params: { token: string } }>('/appointment/:token/cancel', async (request, reply) => {
    const { token } = request.params;
    const input = cancelAppointmentSchema.parse(request.body);
    const useCase = new CancelAppointment(appointmentRepo, notificationService);
    await useCase.execute(token, input.phoneLastFour);
    return reply.status(200).send({ message: 'Agendamento cancelado com sucesso.' });
  });

  // Change appointment date/time
  app.patch<{ Params: { token: string } }>('/appointment/:token/change', async (request) => {
    const { token } = request.params;
    const input = changeAppointmentSchema.parse(request.body);
    const useCase = new ChangeAppointment(appointmentRepo, notificationService, shiftRepo);
    const updated = await useCase.execute(token, input.phoneLastFour, input.date, input.startTime);
    return { appointment: updated };
  });
}
