import type { FastifyInstance } from 'fastify';
import { PrismaBarberRepository } from '../../infrastructure/database/repositories/prisma-barber.repository.js';

const barberRepo = new PrismaBarberRepository();

export async function barberRoutes(app: FastifyInstance): Promise<void> {
  app.get('/barbers', async () => {
    const barbers = await barberRepo.findAllActive();
    // Don't expose password or email to public
    return {
      barbers: barbers.map(({ password, email, ...b }) => b),
    };
  });
}
