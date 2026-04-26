import type { FastifyInstance } from 'fastify';
import { PrismaProviderRepository } from '../../infrastructure/database/repositories/prisma-provider.repository.js';
import { PrismaProviderShiftRepository } from '../../infrastructure/database/repositories/prisma-provider-shift.repository.js';

export async function barberRoutes(app: FastifyInstance): Promise<void> {
  app.get('/barbers', async (request) => {
    const barberRepo = new PrismaProviderRepository(request.tenantPrisma);
    const shiftRepo = new PrismaProviderShiftRepository(request.tenantPrisma);
    const barbers = await barberRepo.findAllActive();
    const allShifts = await Promise.all(barbers.map((b) => shiftRepo.findAllByProvider(b.id)));
    // Don't expose password or email to public
    return {
      barbers: barbers.map(({ password, email, ...b }, i) => ({
        ...b,
        workDays: [...new Set(allShifts[i].map((s) => s.dayOfWeek))].sort(),
      })),
    };
  });
}
