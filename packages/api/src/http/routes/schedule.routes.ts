import type { FastifyInstance, FastifyRequest } from 'fastify';
import { z } from 'zod';
import { authGuard } from '../middleware/auth.middleware.js';
import { PrismaBarberShiftRepository } from '../../infrastructure/database/repositories/prisma-barber-shift.repository.js';

const shiftRepo = new PrismaBarberShiftRepository();

const shiftSchema = z.object({
  dayOfWeek: z.number().int().min(0).max(6),
  startTime: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/),
  endTime: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/),
});

const absenceSchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  startTime: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/).optional(),
  endTime: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/).optional(),
  reason: z.string().max(200).optional(),
});

export async function scheduleRoutes(app: FastifyInstance): Promise<void> {
  app.addHook('onRequest', authGuard);

  // Get my shifts (all days)
  app.get('/admin/schedule/shifts', async (request: FastifyRequest & { barberId?: string }) => {
    const shifts = await shiftRepo.findAllByBarber(request.barberId!);
    return { shifts };
  });

  // Replace all my shifts (send full schedule at once)
  app.put('/admin/schedule/shifts', async (request: FastifyRequest & { barberId?: string }) => {
    const { shifts } = request.body as { shifts: unknown[] };
    const parsed = z.array(shiftSchema).parse(shifts);
    await shiftRepo.replaceForBarber(request.barberId!, parsed);
    return { message: 'Horários atualizados.' };
  });

  // Get my absences
  app.get('/admin/schedule/absences', async (request: FastifyRequest & { barberId?: string }) => {
    const absences = await shiftRepo.findAbsencesByBarber(request.barberId!);
    return { absences };
  });

  // Add absence
  app.post('/admin/schedule/absences', async (request: FastifyRequest & { barberId?: string }, reply) => {
    const input = absenceSchema.parse(request.body);
    const absence = await shiftRepo.createAbsence({
      barberId: request.barberId!,
      date: new Date(input.date + 'T00:00:00'),
      startTime: input.startTime ?? null,
      endTime: input.endTime ?? null,
      reason: input.reason ?? null,
    });
    return reply.status(201).send({ absence });
  });

  // Delete absence
  app.delete<{ Params: { id: string } }>('/admin/schedule/absences/:id', async (request) => {
    await shiftRepo.deleteAbsence(request.params.id);
    return { message: 'Ausência removida.' };
  });
}
