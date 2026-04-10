import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { bookingSchema, slotsQuerySchema, tenantConfigSchema } from '@soberano/shared';
import { PrismaAppointmentRepository } from '../../infrastructure/database/repositories/prisma-appointment.repository.js';
import { PrismaServiceRepository } from '../../infrastructure/database/repositories/prisma-service.repository.js';
import { PrismaProviderRepository } from '../../infrastructure/database/repositories/prisma-provider.repository.js';
import { PrismaCustomerRepository } from '../../infrastructure/database/repositories/prisma-customer.repository.js';
import { PrismaProviderShiftRepository } from '../../infrastructure/database/repositories/prisma-provider-shift.repository.js';
import { WhatsAppNotificationService } from '../../infrastructure/notifications/whatsapp-notification.service.js';
import { ChatwootClient } from '../../infrastructure/notifications/chatwoot.client.js';
import { CreateAppointment } from '../../application/use-cases/booking/create-appointment.js';
import { GetAvailableSlots } from '../../application/use-cases/booking/get-available-slots.js';

const customerNameQuerySchema = z.object({
  phone: z.string().regex(/^\d{10,11}$/),
});

export async function bookingRoutes(app: FastifyInstance): Promise<void> {
  // Get available slots
  app.get('/slots', async (request) => {
    const query = slotsQuerySchema.parse(request.query);
    const { excludeId } = request.query as { excludeId?: string };
    const appointmentRepo = new PrismaAppointmentRepository(request.tenantPrisma);
    const shiftRepo = new PrismaProviderShiftRepository(request.tenantPrisma);
    const useCase = new GetAvailableSlots(appointmentRepo, shiftRepo);
    const slots = await useCase.execute(query.barberId, query.date, excludeId);
    return { slots };
  });

  // Get customer name by phone (public, used by AI to greet returning customers)
  app.get('/customer/name', async (request, reply) => {
    const result = customerNameQuerySchema.safeParse(request.query);
    if (!result.success) {
      return reply.status(400).send({ error: 'phone must be 10-11 digits' });
    }
    const customerRepo = new PrismaCustomerRepository(request.tenantPrisma);
    const customer = await customerRepo.findByPhone(result.data.phone);
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
    const appointmentRepo = new PrismaAppointmentRepository(request.tenantPrisma);
    const serviceRepo = new PrismaServiceRepository(request.tenantPrisma);
    const providerRepo = new PrismaProviderRepository(request.tenantPrisma);
    const customerRepo = new PrismaCustomerRepository(request.tenantPrisma);
    const shiftRepo = new PrismaProviderShiftRepository(request.tenantPrisma);
    const config = tenantConfigSchema.parse(request.tenant.config);
    const chatwootClient = new ChatwootClient(config);
    const notificationService = new WhatsAppNotificationService(config, chatwootClient);
    const useCase = new CreateAppointment(
      appointmentRepo,
      serviceRepo,
      providerRepo,
      customerRepo,
      notificationService,
      shiftRepo,
    );
    const result = await useCase.execute({ ...input, tenantId: request.tenant.id, bookingUrl: config.bookingUrl });
    return reply.status(201).send(result);
  });
}
