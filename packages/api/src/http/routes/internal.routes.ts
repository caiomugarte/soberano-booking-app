import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { env } from '../../config/env.js';
import { prisma as _prisma } from '../../config/database.js';
import { createTenantPrisma } from '../../config/tenant-prisma.js';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const prisma = _prisma as any;
import { PrismaProviderShiftRepository } from '../../infrastructure/database/repositories/prisma-provider-shift.repository.js';

const absenceBodySchema = z.object({
  barberId: z.string().uuid(),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  startTime: z.string().regex(/^\d{2}:\d{2}$/).optional(),
  endTime: z.string().regex(/^\d{2}:\d{2}$/).optional(),
  reason: z.string().max(200).optional(),
});

function todayInCampoGrande(): string {
  return new Intl.DateTimeFormat('sv-SE', { timeZone: 'America/Campo_Grande' }).format(new Date());
}

export async function internalRoutes(app: FastifyInstance): Promise<void> {
  app.post('/internal/provider-absences', async (request, reply) => {
    const secret = request.headers['x-internal-secret'];
    if (!secret || secret !== env.INTERNAL_API_SECRET) {
      return reply.status(401).send({ error: 'UNAUTHORIZED', message: 'Não autorizado.' });
    }

    const result = absenceBodySchema.safeParse(request.body);
    if (!result.success) {
      return reply.status(400).send({ error: 'VALIDATION_ERROR', message: result.error.errors[0]?.message ?? 'Dados inválidos.' });
    }

    const { barberId, date, startTime, endTime, reason } = result.data;

    if (date < todayInCampoGrande()) {
      return reply.status(400).send({ error: 'VALIDATION_ERROR', message: 'A data não pode ser no passado.' });
    }

    const provider = await prisma.provider.findUnique({ where: { id: barberId } });
    if (!provider) {
      return reply.status(404).send({ error: 'NOT_FOUND', message: 'Barbeiro não encontrado.' });
    }

    const tenantPrisma = createTenantPrisma(provider.tenantId);
    const shiftRepo = new PrismaProviderShiftRepository(tenantPrisma);
    const absence = await shiftRepo.createAbsence({
      providerId: barberId,
      date: new Date(date + 'T00:00:00'),
      startTime: startTime ?? null,
      endTime: endTime ?? null,
      reason: reason ?? null,
    });

    return reply.status(201).send({
      absenceId: absence.id,
      date: absence.date,
      startTime: absence.startTime,
      endTime: absence.endTime,
      reason: absence.reason,
    });
  });
}
