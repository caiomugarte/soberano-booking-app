import type { FastifyInstance } from 'fastify';
import { PrismaServiceRepository } from '../../infrastructure/database/repositories/prisma-service.repository.js';

export async function serviceRoutes(app: FastifyInstance): Promise<void> {
  app.get('/services', async (request) => {
    const serviceRepo = new PrismaServiceRepository(request.tenantPrisma);
    const services = await serviceRepo.findAllActive();
    return { services };
  });
}
