import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { env } from '../../config/env.js';
import { prisma as _prisma } from '../../config/database.js';
import { createTenantPrisma } from '../../config/tenant-prisma.js';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const prisma = _prisma as any;
import { PrismaProviderShiftRepository } from '../../infrastructure/database/repositories/prisma-provider-shift.repository.js';
import { PrismaAppointmentRepository } from '../../infrastructure/database/repositories/prisma-appointment.repository.js';

const absenceBodySchema = z.object({
  barberId: z.string().uuid(),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  startTime: z.string().regex(/^\d{2}:\d{2}$/).optional(),
  endTime: z.string().regex(/^\d{2}:\d{2}$/).optional(),
  reason: z.string().max(200).optional(),
});

const absenceUpdateBodySchema = z.object({
  barberId: z.string().uuid(),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  startTime: z.string().regex(/^\d{2}:\d{2}$/).nullable().optional(),
  endTime: z.string().regex(/^\d{2}:\d{2}$/).nullable().optional(),
  reason: z.string().max(200).nullable().optional(),
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
      tenantId: provider.tenantId,
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

  app.get('/internal/provider-absences', async (request, reply) => {
    const secret = request.headers['x-internal-secret'];
    if (!secret || secret !== env.INTERNAL_API_SECRET) {
      return reply.status(401).send({ error: 'UNAUTHORIZED', message: 'Não autorizado.' });
    }

    const { barberId } = request.query as { barberId?: string };
    if (!barberId || !/^[0-9a-f-]{36}$/i.test(barberId)) {
      return reply.status(400).send({ error: 'VALIDATION_ERROR', message: 'barberId inválido.' });
    }

    const provider = await prisma.provider.findUnique({ where: { id: barberId } });
    if (!provider) {
      return reply.status(404).send({ error: 'NOT_FOUND', message: 'Barbeiro não encontrado.' });
    }

    const tenantPrisma = createTenantPrisma(provider.tenantId);
    const shiftRepo = new PrismaProviderShiftRepository(tenantPrisma);
    const today = todayInCampoGrande();
    const all = await shiftRepo.findAbsencesByProvider(barberId);
    const upcoming = all.filter((a) => {
      const d = a.date instanceof Date ? a.date.toISOString().slice(0, 10) : String(a.date).slice(0, 10);
      return d >= today;
    });

    return reply.status(200).send({ absences: upcoming });
  });

  app.delete<{ Params: { id: string } }>('/internal/provider-absences/:id', async (request, reply) => {
    const secret = request.headers['x-internal-secret'];
    if (!secret || secret !== env.INTERNAL_API_SECRET) {
      return reply.status(401).send({ error: 'UNAUTHORIZED', message: 'Não autorizado.' });
    }

    const { barberId } = request.body as { barberId?: string };
    if (!barberId || !/^[0-9a-f-]{36}$/i.test(barberId)) {
      return reply.status(400).send({ error: 'VALIDATION_ERROR', message: 'barberId inválido.' });
    }

    const provider = await prisma.provider.findUnique({ where: { id: barberId } });
    if (!provider) {
      return reply.status(404).send({ error: 'NOT_FOUND', message: 'Barbeiro não encontrado.' });
    }

    const tenantPrisma = createTenantPrisma(provider.tenantId);
    const shiftRepo = new PrismaProviderShiftRepository(tenantPrisma);
    const absence = await tenantPrisma.providerAbsence.findUnique({ where: { id: request.params.id } });
    if (!absence || absence.providerId !== barberId) {
      return reply.status(404).send({ error: 'NOT_FOUND', message: 'Ausência não encontrada.' });
    }

    await shiftRepo.deleteAbsence(request.params.id);
    return reply.status(204).send();
  });

  app.patch<{ Params: { id: string } }>('/internal/provider-absences/:id', async (request, reply) => {
    const secret = request.headers['x-internal-secret'];
    if (!secret || secret !== env.INTERNAL_API_SECRET) {
      return reply.status(401).send({ error: 'UNAUTHORIZED', message: 'Não autorizado.' });
    }

    const result = absenceUpdateBodySchema.safeParse(request.body);
    if (!result.success) {
      return reply.status(400).send({ error: 'VALIDATION_ERROR', message: result.error.errors[0]?.message ?? 'Dados inválidos.' });
    }

    const { barberId, date, startTime, endTime, reason } = result.data;

    if (date && date < todayInCampoGrande()) {
      return reply.status(400).send({ error: 'VALIDATION_ERROR', message: 'A data não pode ser no passado.' });
    }

    const provider = await prisma.provider.findUnique({ where: { id: barberId } });
    if (!provider) {
      return reply.status(404).send({ error: 'NOT_FOUND', message: 'Barbeiro não encontrado.' });
    }

    const tenantPrisma = createTenantPrisma(provider.tenantId);
    const absence = await tenantPrisma.providerAbsence.findUnique({ where: { id: request.params.id } });
    if (!absence || absence.providerId !== barberId) {
      return reply.status(404).send({ error: 'NOT_FOUND', message: 'Ausência não encontrada.' });
    }

    const shiftRepo = new PrismaProviderShiftRepository(tenantPrisma);
    const updates: Parameters<typeof shiftRepo.updateAbsence>[1] = {};
    if (date !== undefined) updates.date = new Date(date + 'T00:00:00');
    if (startTime !== undefined) updates.startTime = startTime;
    if (endTime !== undefined) updates.endTime = endTime;
    if (reason !== undefined) updates.reason = reason;

    const updated = await shiftRepo.updateAbsence(request.params.id, updates);
    return reply.status(200).send({
      absenceId: updated.id,
      date: updated.date,
      startTime: updated.startTime,
      endTime: updated.endTime,
      reason: updated.reason,
    });
  });

  app.get('/internal/provider-appointments', async (request, reply) => {
    const secret = request.headers['x-internal-secret'];
    if (!secret || secret !== env.INTERNAL_API_SECRET) {
      return reply.status(401).send({ error: 'UNAUTHORIZED', message: 'Não autorizado.' });
    }

    const { barberId, date } = request.query as { barberId?: string; date?: string };

    if (!barberId || !/^[0-9a-f-]{36}$/i.test(barberId)) {
      return reply.status(400).send({ error: 'VALIDATION_ERROR', message: 'barberId inválido.' });
    }

    if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      return reply.status(400).send({ error: 'VALIDATION_ERROR', message: 'date inválido. Use o formato YYYY-MM-DD.' });
    }

    const provider = await prisma.provider.findUnique({ where: { id: barberId } });
    if (!provider) {
      return reply.status(404).send({ error: 'NOT_FOUND', message: 'Barbeiro não encontrado.' });
    }

    const tenantPrisma = createTenantPrisma(provider.tenantId);
    const appointmentRepo = new PrismaAppointmentRepository(tenantPrisma);
    const { appointments } = await appointmentRepo.findByBarberAndDate(barberId, new Date(date + 'T00:00:00'));

    const confirmed = appointments
      .filter((a) => a.status === 'confirmed')
      .map((a) => ({
        id: a.id,
        customerName: a.customer.name,
        startTime: a.startTime,
        endTime: a.endTime,
        serviceName: a.service.name,
      }));

    return reply.status(200).send({ appointments: confirmed });
  });
}
