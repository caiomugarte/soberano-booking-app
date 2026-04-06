import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { bookingSchema, slotsQuerySchema } from '@soberano/shared';
import { PrismaAppointmentRepository } from '../../infrastructure/database/repositories/prisma-appointment.repository.js';
import { PrismaServiceRepository } from '../../infrastructure/database/repositories/prisma-service.repository.js';
import { PrismaBarberRepository } from '../../infrastructure/database/repositories/prisma-barber.repository.js';
import { PrismaCustomerRepository } from '../../infrastructure/database/repositories/prisma-customer.repository.js';
import { PrismaBarberShiftRepository } from '../../infrastructure/database/repositories/prisma-barber-shift.repository.js';
import { createNotificationService } from '../../infrastructure/notifications/whatsapp-notification.service.js';
import { CreateAppointment } from '../../application/use-cases/booking/create-appointment.js';
import { GetAvailableSlots } from '../../application/use-cases/booking/get-available-slots.js';

const appointmentRepo = new PrismaAppointmentRepository();
const serviceRepo = new PrismaServiceRepository();
const barberRepo = new PrismaBarberRepository();
const customerRepo = new PrismaCustomerRepository();
const shiftRepo = new PrismaBarberShiftRepository();

const customerNameQuerySchema = z.object({
  phone: z.string().regex(/^\d{10,11}$/),
});

export async function bookingRoutes(app: FastifyInstance): Promise<void> {
  // Get available slots
  app.get('/slots', async (request) => {
    const query = slotsQuerySchema.parse(request.query);
    const useCase = new GetAvailableSlots(appointmentRepo, shiftRepo);
    const slots = await useCase.execute(query.barberId, query.date, request.client.id);
    return { slots };
  });

  // Get customer name by phone (public, used by AI to greet returning customers)
  app.get('/customer/name', async (request, reply) => {
    const result = customerNameQuerySchema.safeParse(request.query);
    if (!result.success) {
      return reply.status(400).send({ error: 'phone must be 10-11 digits' });
    }
    const customer = await customerRepo.findByPhone(result.data.phone, request.client.id);
    return { name: customer?.name ?? null };
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
    const notificationService = createNotificationService(request.client);
    const useCase = new CreateAppointment(
      appointmentRepo,
      serviceRepo,
      barberRepo,
      customerRepo,
      notificationService,
      shiftRepo,
    );
    const result = await useCase.execute({ ...input, clientId: request.client.id });
    const cancelUrl = `${request.client.baseUrl}/agendamento/${result.appointment.cancelToken}`;
    return reply.status(201).send({ ...result, cancelUrl });
  });
}
