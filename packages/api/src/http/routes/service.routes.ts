import type { FastifyInstance } from 'fastify';
import { PrismaServiceRepository } from '../../infrastructure/database/repositories/prisma-service.repository.js';

const serviceRepo = new PrismaServiceRepository();

export async function serviceRoutes(app: FastifyInstance): Promise<void> {
  app.get('/services', async () => {
    const services = await serviceRepo.findAllActive();
    return { services };
  });
}
