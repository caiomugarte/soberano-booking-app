import type { FastifyInstance } from 'fastify';
import { bookingSchema, slotsQuerySchema } from '@soberano/shared';
import { PrismaAppointmentRepository } from '../../infrastructure/database/repositories/prisma-appointment.repository.js';
import { PrismaServiceRepository } from '../../infrastructure/database/repositories/prisma-service.repository.js';
import { PrismaBarberRepository } from '../../infrastructure/database/repositories/prisma-barber.repository.js';
import { PrismaCustomerRepository } from '../../infrastructure/database/repositories/prisma-customer.repository.js';
import { PrismaBarberShiftRepository } from '../../infrastructure/database/repositories/prisma-barber-shift.repository.js';
import { WhatsAppNotificationService } from '../../infrastructure/notifications/whatsapp-notification.service.js';
import { CreateAppointment } from '../../application/use-cases/booking/create-appointment.js';
import { GetAvailableSlots } from '../../application/use-cases/booking/get-available-slots.js';

const appointmentRepo = new PrismaAppointmentRepository();
const serviceRepo = new PrismaServiceRepository();
const barberRepo = new PrismaBarberRepository();
const customerRepo = new PrismaCustomerRepository();
const shiftRepo = new PrismaBarberShiftRepository();
const notificationService = new WhatsAppNotificationService();

export async function bookingRoutes(app: FastifyInstance): Promise<void> {
  // Get available slots
  app.get('/slots', async (request) => {
    const query = slotsQuerySchema.parse(request.query);
    const useCase = new GetAvailableSlots(appointmentRepo, shiftRepo);
    const slots = await useCase.execute(query.barberId, query.date);
    return { slots };
  });

  // Create booking
  app.post('/book', {
    config: {
      rateLimit: {
        max: 5,
        timeWindow: '1 minute',
      },
    },
  }, async (request, reply) => {
    const input = bookingSchema.parse(request.body);
    const useCase = new CreateAppointment(
      appointmentRepo,
      serviceRepo,
      barberRepo,
      customerRepo,
      notificationService,
    );
    const result = await useCase.execute(input);
    return reply.status(201).send(result);
  });
}
