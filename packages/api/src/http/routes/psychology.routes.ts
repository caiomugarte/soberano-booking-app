import crypto from 'node:crypto';
import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { authGuard } from '../middleware/auth.middleware.js';
import { PrismaSessionReportRepository } from '../../infrastructure/database/repositories/prisma-session-report.repository.js';
import { PrismaDocumentRepository } from '../../infrastructure/database/repositories/prisma-document.repository.js';
import { PrismaAppointmentRepository } from '../../infrastructure/database/repositories/prisma-appointment.repository.js';
import { PrismaCustomerRepository } from '../../infrastructure/database/repositories/prisma-customer.repository.js';
import { PrismaRecurringAppointmentSeriesRepository } from '../../infrastructure/database/repositories/prisma-recurring-appointment-series.repository.js';
import { PrismaServiceRepository } from '../../infrastructure/database/repositories/prisma-service.repository.js';
import { ChatwootClient } from '../../infrastructure/notifications/chatwoot.client.js';
import { CreateRecurringSeriesUseCase } from '../../application/use-cases/booking/create-recurring-series.js';
import { StopRecurringSeriesUseCase } from '../../application/use-cases/booking/stop-recurring-series.js';
import { tenantConfigSchema } from '@soberano/shared';

const MAX_DATA_LENGTH = 6_800_000;
const SESSION_DURATION_MINUTES = 50;
const CPF_INPUT_REGEX = /^[\d.\-\s]*$/;
const sessionTypeSchema = z.enum(['individual', 'couple', 'family']);
const appointmentStatusSchema = z.enum([
  'scheduled',
  'confirmed',
  'completed',
  'cancelled',
  'no_show',
]);
const paymentStatusSchema = z.enum(['pending', 'paid']);
const paymentMethodSchema = z.enum(['card', 'pix', 'cash']);

function addMinutes(time: string, minutes: number): string {
  const [h, m] = time.split(':').map(Number);
  const total = h * 60 + m + minutes;
  return `${String(Math.floor(total / 60)).padStart(2, '0')}:${String(total % 60).padStart(2, '0')}`;
}

function toDateStr(raw: Date | string): string {
  if (raw instanceof Date) return raw.toISOString().slice(0, 10);
  return String(raw).slice(0, 10);
}

function normalizeCpf(value: string | null | undefined): string | null | undefined {
  if (value === undefined) return undefined;
  if (value === null) return null;

  const digits = value.replace(/\D/g, '');
  return digits.length > 0 ? digits : null;
}

function normalizeEmail(value: string | null | undefined): string | null | undefined {
  if (value === undefined) return undefined;
  if (value === null) return null;

  const trimmed = value.trim().toLowerCase();
  return trimmed.length > 0 ? trimmed : null;
}

function getPatientConflictField(error: unknown): 'telefone' | 'CPF' | 'email' | null {
  if (!error || typeof error !== 'object' || !('code' in error) || error.code !== 'P2002') {
    return null;
  }

  const rawTarget =
    'meta' in error &&
    error.meta &&
    typeof error.meta === 'object' &&
    'target' in error.meta
      ? error.meta.target
      : undefined;

  const targets = Array.isArray(rawTarget)
    ? rawTarget.map(String)
    : typeof rawTarget === 'string'
      ? [rawTarget]
      : [];

  if (targets.some((target) => target.includes('cpf'))) return 'CPF';
  if (targets.some((target) => target.includes('phone'))) return 'telefone';
  if (targets.some((target) => target.includes('email'))) return 'email';
  return null;
}

function formatPatientDeleteDependencyLabel(count: number, singular: string, plural: string): string {
  return `${count} ${count === 1 ? singular : plural}`;
}

function buildPatientDeleteDependencyMessage(counts: {
  documents: number;
  sessions: number;
}): string {
  const dependencies: string[] = [];

  if (counts.documents > 0) {
    dependencies.push(formatPatientDeleteDependencyLabel(counts.documents, 'documento', 'documentos'));
  }

  if (counts.sessions > 0) {
    dependencies.push(formatPatientDeleteDependencyLabel(counts.sessions, 'sessão', 'sessões'));
  }

  return `Este paciente não pode ser excluído porque existem registros vinculados ao cadastro: ${dependencies.join(', ')}. Remova esses registros antes de excluir o paciente.`;
}

async function ensureCpfAvailable(params: {
  customerRepo: PrismaCustomerRepository;
  cpf: string | null | undefined;
  currentCustomerId?: string;
}): Promise<'CPF' | null> {
  if (!params.cpf) return null;

  const existingCustomer = await params.customerRepo.findByCpf(params.cpf);
  if (existingCustomer && existingCustomer.id !== params.currentCustomerId) {
    return 'CPF';
  }

  return null;
}

async function ensureEmailAvailable(params: {
  customerRepo: PrismaCustomerRepository;
  email: string | null | undefined;
  currentCustomerId?: string;
}): Promise<'email' | null> {
  if (!params.email) return null;

  const existingCustomer = await params.customerRepo.findByEmail(params.email);
  if (existingCustomer && existingCustomer.id !== params.currentCustomerId) {
    return 'email';
  }

  return null;
}

function mapToSession(raw: any) {
  return {
    id: raw.id,
    patientId: raw.customerId,
    date: toDateStr(raw.date),
    startTime: raw.startTime,
    endTime: raw.endTime,
    type: raw.service?.slug ?? 'individual',
    status: raw.status,
    value: raw.priceCents,
    paymentStatus: raw.paymentStatus,
    paymentMethod: raw.paymentMethod ?? undefined,
    paidAt: raw.paidAt ?? undefined,
    notes: raw.appointmentNotes ?? undefined,
    recurringSeriesId: raw.recurringSeriesId ?? undefined,
    recurrenceIntervalWeeks: raw.recurringSeries?.intervalWeeks ?? undefined,
    recurrenceStatus: raw.recurringSeries?.status ?? undefined,
    recurrenceStopDate: raw.recurringSeries?.stopDate ? toDateStr(raw.recurringSeries.stopDate) : undefined,
  };
}

export async function psychologyRoutes(app: FastifyInstance): Promise<void> {
  app.addHook('preHandler', authGuard);

  // ─── Patient CRUD ───────────────────────────────────────────────────────────

  app.get('/psychology/patients', async (request) => {
    const { search } = request.query as { search?: string };
    const customerRepo = new PrismaCustomerRepository(request.tenantPrisma);
    return customerRepo.findAll(request.tenant.id, search);
  });

  app.post('/psychology/patients', async (request, reply) => {
    const schema = z.object({
      name: z.string().min(1).max(200),
      phone: z.string().regex(/^\d{10,11}$/, 'Telefone deve ter 10 ou 11 dígitos').optional(),
      email: z.string().email().max(255).optional(),
      cpf: z.string().max(20).regex(CPF_INPUT_REGEX, 'CPF inválido').optional(),
      notes: z.string().max(2000).optional(),
    });
    const parsed = schema.safeParse(request.body);
    if (!parsed.success) return reply.status(400).send({ error: 'VALIDATION_ERROR', message: parsed.error.errors[0].message });
    const customerRepo = new PrismaCustomerRepository(request.tenantPrisma);
    const { cpf, email, ...rest } = parsed.data;
    const normalizedCpf = normalizeCpf(cpf);
    const normalizedEmail = normalizeEmail(email);
    const cpfConflict = await ensureCpfAvailable({
      customerRepo,
      cpf: normalizedCpf,
    });
    const emailConflict = await ensureEmailAvailable({
      customerRepo,
      email: normalizedEmail,
    });

    if (cpfConflict ?? emailConflict) {
      return reply.status(409).send({
        error: 'CONFLICT',
        message: `Já existe um paciente com este ${cpfConflict ?? emailConflict}.`,
      });
    }

    try {
      const customer = await customerRepo.create({
        tenantId: request.tenant.id,
        ...rest,
        ...(normalizedEmail ? { email: normalizedEmail } : {}),
        ...(normalizedCpf ? { cpf: normalizedCpf } : {}),
      });
      return reply.status(201).send(customer);
    } catch (err: unknown) {
      const field = getPatientConflictField(err);
      if (field) {
        return reply.status(409).send({ error: 'CONFLICT', message: `Já existe um paciente com este ${field}.` });
      }
      throw err;
    }
  });

  app.get<{ Params: { id: string } }>('/psychology/patients/:id', async (request, reply) => {
    const customerRepo = new PrismaCustomerRepository(request.tenantPrisma);
    const customer = await customerRepo.findById(request.params.id);
    if (!customer) return reply.status(404).send({ error: 'NOT_FOUND', message: 'Paciente não encontrado.' });
    return customer;
  });

  app.patch<{ Params: { id: string } }>('/psychology/patients/:id', async (request, reply) => {
    const schema = z.object({
      name: z.string().min(1).max(200).optional(),
      phone: z.string().regex(/^\d{10,11}$/, 'Telefone deve ter 10 ou 11 dígitos').nullable().optional(),
      email: z.string().email().max(255).nullable().optional(),
      cpf: z.string().max(20).regex(CPF_INPUT_REGEX, 'CPF inválido').nullable().optional(),
      notes: z.string().max(2000).nullable().optional(),
    }).refine((d) => Object.values(d).some((v) => v !== undefined), {
      message: 'Informe ao menos um campo para atualizar.',
    });
    const parsed = schema.safeParse(request.body);
    if (!parsed.success) return reply.status(400).send({ error: 'VALIDATION_ERROR', message: parsed.error.errors[0].message });
    const customerRepo = new PrismaCustomerRepository(request.tenantPrisma);
    const customer = await customerRepo.findById(request.params.id);
    if (!customer) return reply.status(404).send({ error: 'NOT_FOUND', message: 'Paciente não encontrado.' });

    const { cpf, email, ...rest } = parsed.data;
    const normalizedCpf = normalizeCpf(cpf);
    const normalizedEmail = normalizeEmail(email);
    const updateData = {
      ...rest,
      ...(email !== undefined ? { email: normalizedEmail } : {}),
      ...(cpf !== undefined ? { cpf: normalizedCpf } : {}),
    };
    const cpfConflict = await ensureCpfAvailable({
      customerRepo,
      cpf: normalizedCpf,
      currentCustomerId: customer.id,
    });
    const emailConflict = await ensureEmailAvailable({
      customerRepo,
      email: normalizedEmail,
      currentCustomerId: customer.id,
    });

    if (cpfConflict ?? emailConflict) {
      return reply.status(409).send({
        error: 'CONFLICT',
        message: `Já existe um paciente com este ${cpfConflict ?? emailConflict}.`,
      });
    }

    try {
      return await customerRepo.update(request.params.id, updateData);
    } catch (err: unknown) {
      const field = getPatientConflictField(err);
      if (field) {
        return reply.status(409).send({ error: 'CONFLICT', message: `Já existe um paciente com este ${field}.` });
      }
      throw err;
    }
  });

  app.delete<{ Params: { id: string } }>('/psychology/patients/:id', async (request, reply) => {
    const customerRepo = new PrismaCustomerRepository(request.tenantPrisma);
    const customer = await customerRepo.findById(request.params.id);
    if (!customer) return reply.status(404).send({ error: 'NOT_FOUND', message: 'Paciente não encontrado.' });

    const [documentsCount, sessionsCount] = await request.tenantPrisma.$transaction([
      request.tenantPrisma.document.count({
        where: { customerId: request.params.id },
      }),
      request.tenantPrisma.appointment.count({
        where: { customerId: request.params.id },
      }),
    ]);

    if (documentsCount > 0 || sessionsCount > 0) {
      return reply.status(409).send({
        error: 'PATIENT_HAS_DEPENDENCIES',
        message: buildPatientDeleteDependencyMessage({
          documents: documentsCount,
          sessions: sessionsCount,
        }),
      });
    }

    await request.tenantPrisma.$transaction([
      request.tenantPrisma.recurringAppointmentSeries.deleteMany({
        where: { customerId: request.params.id },
      }),
      request.tenantPrisma.customer.delete({
        where: { id: request.params.id },
      }),
    ]);

    return reply.status(204).send();
  });

  // ─── Session CRUD ────────────────────────────────────────────────────────────

  app.get('/psychology/sessions', async (request) => {
    const { from, to, patientId } = request.query as { from?: string; to?: string; patientId?: string };
    const appointments = await request.tenantPrisma.appointment.findMany({
      where: {
        providerId: request.providerId!,
        ...(from ? { date: { gte: new Date(from + 'T00:00:00') } } : {}),
        ...(to ? { date: { lte: new Date(to + 'T00:00:00') } } : {}),
        ...(patientId ? { customerId: patientId } : {}),
      },
      include: { service: true, customer: true, recurringSeries: true },
      orderBy: [{ date: 'asc' }, { startTime: 'asc' }],
    });
    return appointments.map(mapToSession);
  });

  app.post('/psychology/sessions', async (request, reply) => {
    const schema = z.object({
      patientId: z.string().uuid(),
      date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Data inválida'),
      startTime: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, 'Horário inválido'),
      type: sessionTypeSchema,
      value: z.number().int().min(0).optional(),
      notes: z.string().max(2000).optional(),
      status: appointmentStatusSchema.optional(),
      paymentStatus: paymentStatusSchema.optional(),
      paymentMethod: paymentMethodSchema.optional(),
      paidAt: z.string().datetime({ offset: true }).optional(),
    }).superRefine((data, ctx) => {
      const nextPaymentStatus = data.paymentStatus ?? 'pending';
      if (nextPaymentStatus === 'paid' && !data.paymentMethod) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['paymentMethod'],
          message: 'Selecione a forma de pagamento.',
        });
      }
    });
    const parsed = schema.safeParse(request.body);
    if (!parsed.success) return reply.status(400).send({ error: 'VALIDATION_ERROR', message: parsed.error.errors[0].message });

    const { patientId, date, startTime, type, value, notes, status, paymentStatus, paymentMethod, paidAt } = parsed.data;

    const customer = await request.tenantPrisma.customer.findFirst({
      where: { id: patientId, tenantId: request.tenant.id },
    });
    if (!customer) return reply.status(404).send({ error: 'NOT_FOUND', message: 'Paciente não encontrado.' });

    const service = await request.tenantPrisma.service.findFirst({
      where: { tenantId: request.tenant.id, slug: type, isActive: true },
    });
    if (!service) return reply.status(404).send({ error: 'NOT_FOUND', message: 'Serviço não encontrado.' });

    const endTime = addMinutes(startTime, SESSION_DURATION_MINUTES);
    const nextPaymentStatus = paymentStatus ?? 'pending';
    const conflict = await request.tenantPrisma.appointment.findFirst({
      where: {
        providerId: request.providerId!,
        date: new Date(`${date}T00:00:00`),
        status: { not: 'cancelled' },
        startTime: { lt: endTime },
        endTime: { gt: startTime },
      },
    });

    if (conflict) {
      return reply.status(409).send({
        error: 'CONFLICT',
        message: 'Já existe uma sessão neste horário.',
      });
    }

    const apt = await request.tenantPrisma.appointment.create({
      data: {
        tenantId: request.tenant.id,
        providerId: request.providerId!,
        serviceId: service.id,
        customerId: patientId,
        date: new Date(date + 'T00:00:00'),
        startTime,
        endTime,
        priceCents: value ?? service.priceCents,
        status: status ?? 'confirmed',
        cancelToken: crypto.randomBytes(32).toString('hex'),
        paymentStatus: nextPaymentStatus,
        paymentMethod: nextPaymentStatus === 'paid' ? paymentMethod ?? null : null,
        paidAt: nextPaymentStatus === 'paid' ? (paidAt ? new Date(paidAt) : new Date()) : null,
        appointmentNotes: notes ?? null,
      },
      include: { service: true, customer: true, recurringSeries: true },
    });

    return reply.status(201).send(mapToSession(apt));
  });

  app.post('/psychology/recurring-series', async (request, reply) => {
    const schema = z.object({
      patientId: z.string().uuid(),
      startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Data inválida'),
      startTime: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, 'Horário inválido'),
      type: sessionTypeSchema,
      intervalWeeks: z.number().int().min(1).max(52),
      value: z.number().int().min(0).optional(),
      notes: z.string().max(2000).optional(),
    });
    const parsed = schema.safeParse(request.body);
    if (!parsed.success) {
      return reply.status(400).send({ error: 'VALIDATION_ERROR', message: parsed.error.errors[0].message });
    }

    const { patientId, startDate, startTime, type, intervalWeeks, value, notes } = parsed.data;

    const customer = await request.tenantPrisma.customer.findFirst({
      where: { id: patientId, tenantId: request.tenant.id },
    });
    if (!customer) {
      return reply.status(404).send({ error: 'NOT_FOUND', message: 'Paciente não encontrado.' });
    }

    const service = await request.tenantPrisma.service.findFirst({
      where: { tenantId: request.tenant.id, slug: type, isActive: true },
    });
    if (!service) {
      return reply.status(404).send({ error: 'NOT_FOUND', message: 'Serviço não encontrado.' });
    }

    const appointmentRepo = new PrismaAppointmentRepository(request.tenantPrisma);
    const recurringSeriesRepo = new PrismaRecurringAppointmentSeriesRepository(request.tenantPrisma);
    const serviceRepo = new PrismaServiceRepository(request.tenantPrisma);
    const useCase = new CreateRecurringSeriesUseCase(
      appointmentRepo,
      recurringSeriesRepo,
      serviceRepo,
    );

    const result = await useCase.execute({
      tenantId: request.tenant.id,
      providerId: request.providerId!,
      customerId: patientId,
      serviceId: service.id,
      startDate,
      startTime,
      intervalWeeks,
      priceCents: value,
      notes,
    });

    return reply.status(201).send({
      recurringSeriesId: result.series.id,
      created: result.createdAppointments,
      cadenceLabel: result.cadenceLabel,
      protectedUntil: result.protectedUntil,
    });
  });

  app.post('/psychology/sessions/batch', async (request, reply) => {
    const schema = z.object({
      patientId: z.string().uuid(),
      startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Data inválida'),
      startTime: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, 'Horário inválido'),
      type: sessionTypeSchema,
      weeks: z.number().int().min(1).max(52),
      value: z.number().int().min(0).optional(),
      notes: z.string().max(2000).optional(),
      status: appointmentStatusSchema.optional(),
      paymentStatus: paymentStatusSchema.optional(),
      paymentMethod: paymentMethodSchema.optional(),
      paidAt: z.string().datetime({ offset: true }).optional(),
    }).superRefine((data, ctx) => {
      const nextPaymentStatus = data.paymentStatus ?? 'pending';
      if (nextPaymentStatus === 'paid' && !data.paymentMethod) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['paymentMethod'],
          message: 'Selecione a forma de pagamento.',
        });
      }
    });
    const parsed = schema.safeParse(request.body);
    if (!parsed.success) return reply.status(400).send({ error: 'VALIDATION_ERROR', message: parsed.error.errors[0].message });

    const { patientId, startDate, startTime, type, weeks, value, notes, status, paymentStatus, paymentMethod, paidAt } = parsed.data;

    const customer = await request.tenantPrisma.customer.findFirst({
      where: { id: patientId, tenantId: request.tenant.id },
    });
    if (!customer) return reply.status(404).send({ error: 'NOT_FOUND', message: 'Paciente não encontrado.' });

    const service = await request.tenantPrisma.service.findFirst({
      where: { tenantId: request.tenant.id, slug: type, isActive: true },
    });
    if (!service) return reply.status(404).send({ error: 'NOT_FOUND', message: 'Serviço não encontrado.' });

    const endTime = addMinutes(startTime, SESSION_DURATION_MINUTES);
    const baseDate = new Date(startDate + 'T12:00:00');
    const nextPaymentStatus = paymentStatus ?? 'pending';
    let created = 0;
    let skipped = 0;

    for (let i = 0; i < weeks; i++) {
      const d = new Date(baseDate);
      d.setDate(d.getDate() + i * 7);
      const dateStr = d.toISOString().slice(0, 10);

      const conflict = await request.tenantPrisma.appointment.findFirst({
        where: {
          providerId: request.providerId!,
          date: new Date(`${dateStr}T00:00:00`),
          status: { not: 'cancelled' },
          startTime: { lt: endTime },
          endTime: { gt: startTime },
        },
      });

      if (conflict) {
        skipped++;
        continue;
      }

      await request.tenantPrisma.appointment.create({
        data: {
          tenantId: request.tenant.id,
          providerId: request.providerId!,
          serviceId: service.id,
          customerId: patientId,
          date: new Date(dateStr + 'T00:00:00'),
          startTime,
          endTime,
          priceCents: value ?? service.priceCents,
          status: status ?? 'confirmed',
          cancelToken: crypto.randomBytes(32).toString('hex'),
          paymentStatus: nextPaymentStatus,
          paymentMethod: nextPaymentStatus === 'paid' ? paymentMethod ?? null : null,
          paidAt: nextPaymentStatus === 'paid' ? (paidAt ? new Date(paidAt) : new Date()) : null,
          appointmentNotes: notes ?? null,
        },
      });
      created++;
    }

    return reply.status(201).send({ created, skipped });
  });

  app.patch<{ Params: { id: string } }>('/psychology/recurring-series/:id/stop', async (request, reply) => {
    const schema = z.object({
      stopDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Data inválida'),
    });
    const parsed = schema.safeParse(request.body);
    if (!parsed.success) {
      return reply.status(400).send({ error: 'VALIDATION_ERROR', message: parsed.error.errors[0].message });
    }

    const appointmentRepo = new PrismaAppointmentRepository(request.tenantPrisma);
    const recurringSeriesRepo = new PrismaRecurringAppointmentSeriesRepository(request.tenantPrisma);
    const useCase = new StopRecurringSeriesUseCase(
      appointmentRepo,
      recurringSeriesRepo,
    );

    const result = await useCase.execute({
      seriesId: request.params.id,
      providerId: request.providerId!,
      stopDate: parsed.data.stopDate,
    });

    return reply.status(200).send({
      recurringSeriesId: result.series.id,
      stopDate: toDateStr(result.series.stopDate!),
      removedAppointments: result.removedAppointments,
    });
  });

  app.patch<{ Params: { id: string } }>('/psychology/sessions/:id', async (request, reply) => {
    const schema = z.object({
      patientId: z.string().uuid().optional(),
      date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Data inválida').optional(),
      startTime: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, 'Horário inválido').optional(),
      type: sessionTypeSchema.optional(),
      value: z.number().int().min(0).optional(),
      notes: z.string().max(2000).nullable().optional(),
      status: appointmentStatusSchema.optional(),
      paymentStatus: paymentStatusSchema.optional(),
      paymentMethod: paymentMethodSchema.optional(),
      paidAt: z.string().datetime({ offset: true }).nullable().optional(),
    }).refine((d) => Object.values(d).some((v) => v !== undefined), {
      message: 'Informe ao menos um campo para atualizar.',
    });
    const parsed = schema.safeParse(request.body);
    if (!parsed.success) return reply.status(400).send({ error: 'VALIDATION_ERROR', message: parsed.error.errors[0].message });

    const appointment = await request.tenantPrisma.appointment.findFirst({
      where: {
        id: request.params.id,
        providerId: request.providerId!,
      },
      include: { service: true, customer: true, recurringSeries: true },
    });
    if (!appointment) return reply.status(404).send({ error: 'NOT_FOUND', message: 'Sessão não encontrada.' });

    const { patientId, date, startTime, type, value, notes, status, paymentStatus, paymentMethod, paidAt } = parsed.data;

    if (patientId) {
      const customer = await request.tenantPrisma.customer.findFirst({
        where: { id: patientId, tenantId: request.tenant.id },
      });
      if (!customer) return reply.status(404).send({ error: 'NOT_FOUND', message: 'Paciente não encontrado.' });
    }

    let nextServiceId = appointment.serviceId;
    if (type) {
      const service = await request.tenantPrisma.service.findFirst({
        where: { tenantId: request.tenant.id, slug: type, isActive: true },
      });
      if (!service) return reply.status(404).send({ error: 'NOT_FOUND', message: 'Serviço não encontrado.' });
      nextServiceId = service.id;
    }

    const nextDate = date ?? toDateStr(appointment.date);
    const nextStartTime = startTime ?? appointment.startTime;
    const nextStatus = status ?? appointment.status;
    const nextEndTime =
      date !== undefined || startTime !== undefined || type !== undefined
        ? addMinutes(nextStartTime, SESSION_DURATION_MINUTES)
        : appointment.endTime;

    const shouldCheckConflict =
      nextStatus !== 'cancelled' &&
      (
        date !== undefined ||
        startTime !== undefined ||
        type !== undefined ||
        (appointment.status === 'cancelled' && status !== undefined && status !== 'cancelled')
      );

    if (shouldCheckConflict) {
      const conflict = await request.tenantPrisma.appointment.findFirst({
        where: {
          providerId: request.providerId!,
          date: new Date(nextDate + 'T00:00:00'),
          status: { not: 'cancelled' },
          id: { not: appointment.id },
          startTime: { lt: nextEndTime },
          endTime: { gt: nextStartTime },
        },
      });

      if (conflict) {
        return reply.status(409).send({
          error: 'CONFLICT',
          message: 'Já existe uma sessão neste horário.',
        });
      }
    }

    const nextPaymentStatus = paymentStatus ?? appointment.paymentStatus;
    const nextPaymentMethod =
      nextPaymentStatus === 'pending'
        ? null
        : paymentMethod !== undefined
          ? paymentMethod
          : appointment.paymentMethod ?? null;

    if (nextPaymentStatus === 'paid' && !nextPaymentMethod) {
      return reply.status(400).send({
        error: 'VALIDATION_ERROR',
        message: 'Selecione a forma de pagamento.',
      });
    }

    let nextPaidAt: Date | null | undefined;
    if (nextPaymentStatus === 'pending') {
      nextPaidAt = null;
    } else if (nextPaymentStatus === 'paid') {
      nextPaidAt =
        paidAt !== undefined
          ? paidAt
            ? new Date(paidAt)
            : appointment.paidAt ?? new Date()
          : appointment.paidAt ?? new Date();
    } else if (paidAt !== undefined) {
      nextPaidAt = paidAt ? new Date(paidAt) : null;
    }

    const updated = await request.tenantPrisma.appointment.update({
      where: { id: request.params.id },
      data: {
        ...(patientId !== undefined ? { customerId: patientId } : {}),
        ...(date !== undefined ? { date: new Date(nextDate + 'T00:00:00') } : {}),
        ...(startTime !== undefined ? { startTime: nextStartTime } : {}),
        ...(type !== undefined ? { serviceId: nextServiceId } : {}),
        ...(nextEndTime !== appointment.endTime ? { endTime: nextEndTime } : {}),
        ...(value !== undefined ? { priceCents: value } : {}),
        ...(notes !== undefined ? { appointmentNotes: notes } : {}),
        ...(status !== undefined ? { status: nextStatus } : {}),
        ...(paymentStatus !== undefined ? { paymentStatus: nextPaymentStatus } : {}),
        ...(paymentStatus !== undefined || paymentMethod !== undefined ? { paymentMethod: nextPaymentMethod } : {}),
        ...(nextPaidAt !== undefined ? { paidAt: nextPaidAt } : {}),
      },
      include: { service: true, customer: true, recurringSeries: true },
    });

    return mapToSession(updated);
  });

  app.delete<{ Params: { id: string } }>('/psychology/sessions/:id', async (request, reply) => {
    const appointment = await request.tenantPrisma.appointment.findFirst({
      where: {
        id: request.params.id,
        providerId: request.providerId!,
      },
    });
    if (!appointment) return reply.status(404).send({ error: 'NOT_FOUND', message: 'Sessão não encontrada.' });

    await request.tenantPrisma.$transaction([
      request.tenantPrisma.sessionReport.deleteMany({
        where: { appointmentId: appointment.id },
      }),
      request.tenantPrisma.appointment.delete({
        where: { id: appointment.id },
      }),
    ]);

    return reply.status(204).send();
  });

  app.post<{ Params: { id: string } }>('/psychology/sessions/:id/send-payment-reminder', async (request, reply) => {
    const session = await request.tenantPrisma.appointment.findUnique({
      where: { id: request.params.id },
      include: { customer: true },
    });
    if (!session) return reply.status(404).send({ error: 'NOT_FOUND', message: 'Sessão não encontrada.' });
    if (!session.customer.phone) return reply.status(400).send({ error: 'NO_PHONE', message: 'Paciente sem telefone cadastrado.' });

    const config = tenantConfigSchema.parse(request.tenant.config);
    const chatwootClient = new ChatwootClient(config);
    if (!chatwootClient.isEnabled()) {
      return reply.status(503).send({ error: 'CHATWOOT_NOT_CONFIGURED', message: 'Integração com WhatsApp não configurada.' });
    }

    const provider = await request.tenantPrisma.provider.findUnique({ where: { id: request.providerId! } });
    const pixKey = provider?.pixKey ?? '(PIX não configurado)';
    const template = provider?.messageTemplate ?? '';

    const [year, month, day] = session.date.toISOString().slice(0, 10).split('-');
    const dateStr = `${day}/${month}/${year}`;
    const valueStr = `R$ ${(session.priceCents / 100).toFixed(2).replace('.', ',')}`;
    const message = template
      .replace('{nome}', session.customer.name)
      .replace('{data}', dateStr)
      .replace('{valor}', valueStr)
      .replace('{pix}', pixKey);

    await chatwootClient.sendToPhone(session.customer.phone, session.customer.name, message);
    return reply.status(204).send();
  });

  // ─── Session Reports ──────────────────────────────────────────────────────────

  app.post<{ Params: { sessionId: string } }>('/psychology/sessions/:sessionId/reports', async (request, reply) => {
    const { sessionId } = request.params;
    const schema = z.object({
      content: z.string().min(1),
      fileName: z.string().max(255).nullish(),
      fileType: z.string().max(100).nullish(),
      fileData: z.string().nullish(),
    });
    const parsed = schema.safeParse(request.body);
    if (!parsed.success) return reply.status(400).send({ error: 'VALIDATION_ERROR', message: parsed.error.errors[0].message });

    if (parsed.data.fileData && parsed.data.fileData.length > MAX_DATA_LENGTH) {
      return reply.status(413).send({ error: 'PAYLOAD_TOO_LARGE', message: 'Arquivo muito grande.' });
    }

    const appointmentRepo = new PrismaAppointmentRepository(request.tenantPrisma);
    const appointment = await appointmentRepo.findById(sessionId);
    if (!appointment) return reply.status(404).send({ error: 'NOT_FOUND', message: 'Sessão não encontrada.' });

    const reportRepo = new PrismaSessionReportRepository(request.tenantPrisma);
    const report = await reportRepo.create({
      tenantId: request.tenant.id,
      appointmentId: sessionId,
      providerId: request.providerId!,
      content: parsed.data.content,
      fileName: parsed.data.fileName ?? null,
      fileType: parsed.data.fileType ?? null,
      fileData: parsed.data.fileData ?? null,
    });
    return reply.status(201).send(report);
  });

  app.get<{ Params: { sessionId: string } }>('/psychology/sessions/:sessionId/reports', async (request, reply) => {
    const { sessionId } = request.params;
    const appointmentRepo = new PrismaAppointmentRepository(request.tenantPrisma);
    const appointment = await appointmentRepo.findById(sessionId);
    if (!appointment) return reply.status(404).send({ error: 'NOT_FOUND', message: 'Sessão não encontrada.' });

    const reportRepo = new PrismaSessionReportRepository(request.tenantPrisma);
    return reportRepo.findByAppointment(sessionId);
  });

  app.get<{ Params: { patientId: string } }>('/psychology/patients/:patientId/reports', async (request, reply) => {
    const { patientId } = request.params;
    const reportRepo = new PrismaSessionReportRepository(request.tenantPrisma);
    return reportRepo.findByPatient(patientId);
  });

  app.get<{ Params: { id: string } }>('/psychology/reports/:id', async (request, reply) => {
    const reportRepo = new PrismaSessionReportRepository(request.tenantPrisma);
    const report = await reportRepo.findById(request.params.id);
    if (!report) return reply.status(404).send({ error: 'NOT_FOUND', message: 'Relatório não encontrado.' });
    return report;
  });

  app.patch<{ Params: { id: string } }>('/psychology/reports/:id', async (request, reply) => {
    const schema = z.object({
      content: z.string().min(1).optional(),
      fileName: z.string().max(255).nullable().optional(),
      fileType: z.string().max(100).nullable().optional(),
      fileData: z.string().nullable().optional(),
    });
    const parsed = schema.safeParse(request.body);
    if (!parsed.success) return reply.status(400).send({ error: 'VALIDATION_ERROR', message: parsed.error.errors[0].message });
    const reportRepo = new PrismaSessionReportRepository(request.tenantPrisma);
    const report = await reportRepo.findById(request.params.id);
    if (!report) return reply.status(404).send({ error: 'NOT_FOUND', message: 'Relatório não encontrado.' });
    return reportRepo.updateById(request.params.id, parsed.data);
  });

  app.delete<{ Params: { id: string } }>('/psychology/reports/:id', async (request, reply) => {
    const reportRepo = new PrismaSessionReportRepository(request.tenantPrisma);
    const report = await reportRepo.findById(request.params.id);
    if (!report) return reply.status(404).send({ error: 'NOT_FOUND', message: 'Relatório não encontrado.' });
    await reportRepo.deleteById(request.params.id);
    return reply.status(204).send();
  });

  // ─── Documents ────────────────────────────────────────────────────────────────

  app.post<{ Params: { patientId: string } }>('/psychology/patients/:patientId/documents', async (request, reply) => {
    const { patientId } = request.params;
    const schema = z.object({
      name: z.string().min(1).max(255),
      type: z.string().min(1).max(100),
      data: z.string().min(1),
    });
    const parsed = schema.safeParse(request.body);
    if (!parsed.success) return reply.status(400).send({ error: 'VALIDATION_ERROR', message: parsed.error.errors[0].message });

    if (parsed.data.data.length > MAX_DATA_LENGTH) {
      return reply.status(413).send({ error: 'PAYLOAD_TOO_LARGE', message: 'Arquivo muito grande.' });
    }

    const customerRepo = new PrismaCustomerRepository(request.tenantPrisma);
    const customer = await customerRepo.findById(patientId);
    if (!customer) return reply.status(404).send({ error: 'NOT_FOUND', message: 'Paciente não encontrado.' });

    const docRepo = new PrismaDocumentRepository(request.tenantPrisma);
    const doc = await docRepo.create({
      tenantId: request.tenant.id,
      customerId: patientId,
      name: parsed.data.name,
      type: parsed.data.type,
      data: parsed.data.data,
    });
    return reply.status(201).send(doc);
  });

  app.get<{ Params: { patientId: string } }>('/psychology/patients/:patientId/documents', async (request, reply) => {
    const { patientId } = request.params;
    const customerRepo = new PrismaCustomerRepository(request.tenantPrisma);
    const customer = await customerRepo.findById(patientId);
    if (!customer) return reply.status(404).send({ error: 'NOT_FOUND', message: 'Paciente não encontrado.' });

    // Include data field so clients can download documents
    return request.tenantPrisma.document.findMany({
      where: { customerId: patientId },
      orderBy: { createdAt: 'desc' },
    });
  });

  app.get<{ Params: { id: string } }>('/psychology/documents/:id', async (request, reply) => {
    const docRepo = new PrismaDocumentRepository(request.tenantPrisma);
    const doc = await docRepo.findById(request.params.id);
    if (!doc) return reply.status(404).send({ error: 'NOT_FOUND', message: 'Documento não encontrado.' });
    return doc;
  });

  app.delete<{ Params: { id: string } }>('/psychology/documents/:id', async (request, reply) => {
    const docRepo = new PrismaDocumentRepository(request.tenantPrisma);
    const doc = await docRepo.findById(request.params.id);
    if (!doc) return reply.status(404).send({ error: 'NOT_FOUND', message: 'Documento não encontrado.' });
    await docRepo.deleteById(request.params.id);
    return reply.status(204).send();
  });
}
