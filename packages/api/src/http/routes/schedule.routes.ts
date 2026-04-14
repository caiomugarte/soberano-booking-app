import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { authGuard } from '../middleware/auth.middleware.js';
import { PrismaProviderShiftRepository } from '../../infrastructure/database/repositories/prisma-provider-shift.repository.js';

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
  app.get('/admin/schedule/shifts', async (request) => {
    const shiftRepo = new PrismaProviderShiftRepository(request.tenantPrisma);
    const shifts = await shiftRepo.findAllByProvider(request.providerId!);
    return { shifts };
  });

  // Replace all my shifts (send full schedule at once)
  app.put('/admin/schedule/shifts', async (request) => {
    const { shifts } = request.body as { shifts: unknown[] };
    const parsed = z.array(shiftSchema).parse(shifts);
    const shiftRepo = new PrismaProviderShiftRepository(request.tenantPrisma);
    await shiftRepo.replaceForProvider(request.providerId!, parsed);
    return { message: 'Horários atualizados.' };
  });

  // Get my absences
  app.get('/admin/schedule/absences', async (request) => {
    const shiftRepo = new PrismaProviderShiftRepository(request.tenantPrisma);
    const absences = await shiftRepo.findAbsencesByProvider(request.providerId!);
    return { absences };
  });

  // Add absence
  app.post('/admin/schedule/absences', async (request, reply) => {
    const input = absenceSchema.parse(request.body);
    const shiftRepo = new PrismaProviderShiftRepository(request.tenantPrisma);
    const absence = await shiftRepo.createAbsence({
      tenantId: request.tenant.id,
      providerId: request.providerId!,
      date: new Date(input.date + 'T00:00:00'),
      startTime: input.startTime ?? null,
      endTime: input.endTime ?? null,
      reason: input.reason ?? null,
    });
    return reply.status(201).send({ absence });
  });

  // Delete absence
  app.delete<{ Params: { id: string } }>('/admin/schedule/absences/:id', async (request, reply) => {
    const shiftRepo = new PrismaProviderShiftRepository(request.tenantPrisma);
    try {
      await shiftRepo.deleteAbsence(request.params.id);
    } catch (err: unknown) {
      // Prisma P2025: record not found
      if (err && typeof err === 'object' && 'code' in err && err.code === 'P2025') {
        return reply.status(404).send({ error: 'NOT_FOUND', message: 'Ausência não encontrada.' });
      }
      throw err;
    }
    return { message: 'Ausência removida.' };
  });
}
