import { z } from 'zod';
import type { FastifyInstance } from 'fastify';
import { PrismaServiceRepository } from '../../infrastructure/database/repositories/prisma-service.repository.js';

const serviceRepo = new PrismaServiceRepository();

export async function serviceRoutes(app: FastifyInstance): Promise<void> {
  app.get('/services', {
    schema: {
      tags: ['Services'],
      summary: 'List all active services',
      response: { 200: z.object({ services: z.array(z.any()) }) },
    },
  }, async (request) => {
    const services = await serviceRepo.findAllActive(request.client.id);
    return { services };
  });
}
