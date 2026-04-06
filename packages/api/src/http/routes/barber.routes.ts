import { z } from 'zod';
import type { FastifyInstance } from 'fastify';
import { PrismaBarberRepository } from '../../infrastructure/database/repositories/prisma-barber.repository.js';
import { PrismaBarberShiftRepository } from '../../infrastructure/database/repositories/prisma-barber-shift.repository.js';

const barberRepo = new PrismaBarberRepository();
const shiftRepo = new PrismaBarberShiftRepository();

export async function barberRoutes(app: FastifyInstance): Promise<void> {
  app.get('/barbers', {
    schema: {
      tags: ['Barbers'],
      summary: 'List all active barbers with their work days',
      response: { 200: z.object({ barbers: z.array(z.any()) }) },
    },
  }, async (request) => {
    const barbers = await barberRepo.findAllActive(request.client.id);
    const allShifts = await Promise.all(barbers.map((b) => shiftRepo.findAllByBarber(b.id)));
    // Don't expose password or email to public
    return {
      barbers: barbers.map(({ password, email, ...b }, i) => ({
        ...b,
        workDays: [...new Set(allShifts[i].map((s) => s.dayOfWeek))].sort(),
      })),
    };
  });
}
