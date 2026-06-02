import crypto from 'node:crypto';
import type { FastifyInstance, FastifyReply } from 'fastify';
import { z } from 'zod';
import { authGuard } from '../middleware/auth.middleware.js';
import { PrismaSessionReportRepository } from '../../infrastructure/database/repositories/prisma-session-report.repository.js';
import { PrismaDocumentRepository } from '../../infrastructure/database/repositories/prisma-document.repository.js';
import { PrismaAppointmentRepository } from '../../infrastructure/database/repositories/prisma-appointment.repository.js';
import { PrismaCustomerRepository } from '../../infrastructure/database/repositories/prisma-customer.repository.js';
import { PrismaRecurringAppointmentSeriesRepository } from '../../infrastructure/database/repositories/prisma-recurring-appointment-series.repository.js';
import { PrismaServiceRepository } from '../../infrastructure/database/repositories/prisma-service.repository.js';
import { PrismaNeuromodulationProtocolRepository } from '../../infrastructure/database/repositories/prisma-neuromodulation-protocol.repository.js';
import { ChatwootClient } from '../../infrastructure/notifications/chatwoot.client.js';
import { CreateRecurringSeriesUseCase } from '../../application/use-cases/booking/create-recurring-series.js';
import { StopRecurringSeriesUseCase } from '../../application/use-cases/booking/stop-recurring-series.js';
import { CreateNeuromodulationProtocolUseCase } from '../../application/use-cases/booking/create-neuromodulation-protocol.js';
import { UpdateNeuromodulationProtocolUseCase } from '../../application/use-cases/booking/update-neuromodulation-protocol.js';
import { ChangeNeuromodulationProtocolStatusUseCase } from '../../application/use-cases/booking/change-neuromodulation-protocol-status.js';
import { DeleteNeuromodulationProtocolUseCase } from '../../application/use-cases/booking/delete-neuromodulation-protocol.js';
import { GetNeuromodulationProtocolUseCase } from '../../application/use-cases/booking/get-neuromodulation-protocol.js';
import { ListPatientNeuromodulationProtocolsUseCase } from '../../application/use-cases/booking/list-patient-neuromodulation-protocols.js';
import { CreatePsychologySessionUseCase } from '../../application/use-cases/booking/create-psychology-session.js';
import { UpdatePsychologySessionUseCase } from '../../application/use-cases/booking/update-psychology-session.js';
import { DeletePsychologySessionUseCase } from '../../application/use-cases/booking/delete-psychology-session.js';
import { CreatePatientUseCase } from '../../application/use-cases/patient/create-patient.js';
import { UpdatePatientUseCase } from '../../application/use-cases/patient/update-patient.js';
import {
  normalizePsychologySessionType,
  resolvePsychologySessionPrice,
} from '../../application/use-cases/booking/psychology-session.utils.js';
import {
  getPatientCareSummary,
  hasPsychotherapyCareProfile,
  isPatientMinorOnBusinessDate,
  resolveParentsMeetingStatus,
} from '../../application/use-cases/patient/patient-profile.utils.js';
import { AppError } from '../../shared/errors.js';
import { tenantConfigSchema } from '@soberano/shared';
import type { PatientFinancialSummary } from '../../domain/repositories/appointment.repository.js';
import { resolvePatientDeleteRecurringSeriesDependencies } from './patient-delete.utils.js';

const MAX_DATA_LENGTH = 6_800_000;
const CPF_INPUT_REGEX = /^[\d.\-\s]*$/;
const DATE_INPUT_REGEX = /^\d{4}-\d{2}-\d{2}$/;
const TIME_INPUT_REGEX = /^([01]\d|2[0-3]):[0-5]\d$/;

const psychotherapyFrequencySchema = z.enum(['weekly', 'biweekly']);
const parentsMeetingStatusSchema = z.enum(['pending', 'completed']);
const sessionTypeSchema = z.enum(['psychotherapy', 'neuromodulation']);
const appointmentStatusSchema = z.enum([
  'scheduled',
  'confirmed',
  'completed',
  'cancelled',
  'no_show',
]);
const paymentStatusSchema = z.enum(['pending', 'paid']);
const paymentMethodSchema = z.enum(['card', 'pix', 'cash']);
const protocolStatusSchema = z.enum(['active', 'maintenance', 'finished']);
const protocolCreditActionSchema = z.enum(['release', 'consume']);
const receivableScopeSchema = z.enum(['all', 'operations-only']);
const booleanQueryFlagSchema = z.preprocess((value) => {
  if (value === 'true') return true;
  if (value === 'false') return false;
  return value;
}, z.boolean().optional());

function toDateStr(raw: Date | string): string {
  if (raw instanceof Date) return raw.toISOString().slice(0, 10);
  return String(raw).slice(0, 10);
}

function toDateTimeStr(raw: Date | string | null | undefined): string | undefined {
  if (!raw) return undefined;
  if (raw instanceof Date) return raw.toISOString();
  return String(raw);
}

function getTodayInSaoPaulo(): string {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Sao_Paulo',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(new Date());

  const year = parts.find((part) => part.type === 'year')?.value ?? '0000';
  const month = parts.find((part) => part.type === 'month')?.value ?? '00';
  const day = parts.find((part) => part.type === 'day')?.value ?? '00';

  return `${year}-${month}-${day}`;
}

function getEarlierDate(left: Date | undefined, right: Date | undefined): Date | undefined {
  if (!left) return right;
  if (!right) return left;
  return left <= right ? left : right;
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

function normalizeOptionalText(value: string | null | undefined): string | null | undefined {
  if (value === undefined) return undefined;
  if (value === null) return null;

  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function normalizeBirthDate(value: string | null | undefined): Date | null | undefined {
  if (value === undefined) return undefined;
  if (value === null) return null;
  return new Date(`${value}T00:00:00`);
}

function mapPatient(raw: any, options?: { businessDate?: string; financialSummary?: PatientFinancialSummary }) {
  const businessDate = options?.businessDate ?? getTodayInSaoPaulo();
  const isMinor = isPatientMinorOnBusinessDate(raw.birthDate ?? null, businessDate);

  return {
    id: raw.id,
    name: raw.name,
    phone: raw.phone ?? undefined,
    email: raw.email ?? undefined,
    cpf: raw.cpf ?? undefined,
    notes: raw.notes ?? undefined,
    careSummary: getPatientCareSummary(raw),
    psychotherapyPriceCents: raw.psychotherapyPriceCents ?? undefined,
    psychotherapyFrequency: raw.psychotherapyFrequency ?? undefined,
    neuromodulationEligible: raw.neuromodulationEligible,
    isMinor,
    parentsMeetingStatus:
      resolveParentsMeetingStatus({
        birthDate: raw.birthDate ?? null,
        parentsMeetingStatus: raw.parentsMeetingStatus ?? null,
        businessDate,
      }) ?? undefined,
    birthDate: raw.birthDate ? toDateStr(raw.birthDate) : undefined,
    address: raw.address ?? undefined,
    financialSummary: options?.financialSummary,
    createdAt: toDateTimeStr(raw.createdAt) ?? '',
    updatedAt: toDateTimeStr(raw.updatedAt),
  };
}

function mapToProtocol(raw: any) {
  return {
    id: raw.id,
    patientId: raw.customerId,
    totalSessions: raw.totalSessions,
    reservedSessions: raw.reservedSessions,
    consumedSessions: raw.consumedSessions,
    remainingSessions: raw.remainingSessions,
    totalPriceCents: raw.totalPriceCents,
    status: raw.status,
    paymentStatus: raw.paymentStatus,
    paymentMethod: raw.paymentMethod ?? undefined,
    paidAt: toDateTimeStr(raw.paidAt),
    notes: raw.notes ?? undefined,
    createdAt: toDateTimeStr(raw.createdAt) ?? '',
    updatedAt: toDateTimeStr(raw.updatedAt) ?? '',
  };
}

function mapToSession(raw: any) {
  const type = normalizePsychologySessionType(raw.service?.slug ?? 'psychotherapy');
  const protocolLinkType =
    !raw.protocolId
      ? 'standalone'
      : raw.protocolCreditOutcome === 'maintenance'
        ? 'maintenance'
        : 'protocol';

  return {
    id: raw.id,
    patientId: raw.customerId,
    date: toDateStr(raw.date),
    startTime: raw.startTime,
    endTime: raw.endTime,
    type,
    status: raw.status,
    value: raw.priceCents,
    paymentStatus: raw.paymentStatus,
    paymentMethod: raw.paymentMethod ?? undefined,
    paidAt: toDateTimeStr(raw.paidAt),
    notes: raw.appointmentNotes ?? undefined,
    recurringSeriesId: raw.recurringSeriesId ?? undefined,
    recurrenceIntervalWeeks: raw.recurringSeries?.intervalWeeks ?? undefined,
    recurrenceStatus: raw.recurringSeries?.status ?? undefined,
    recurrenceStopDate: raw.recurringSeries?.stopDate ? toDateStr(raw.recurringSeries.stopDate) : undefined,
    protocolId: raw.protocolId ?? undefined,
    protocolStatus: raw.protocol?.status ?? undefined,
    protocolCreditOutcome: raw.protocolCreditOutcome ?? undefined,
    protocolLinkType,
  };
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
  recurringSeries: number;
  protocols: number;
  other?: number;
}): string {
  const dependencies: string[] = [];

  if (counts.documents > 0) {
    dependencies.push(formatPatientDeleteDependencyLabel(counts.documents, 'documento', 'documentos'));
  }

  if (counts.sessions > 0) {
    dependencies.push(formatPatientDeleteDependencyLabel(counts.sessions, 'sessão', 'sessões'));
  }

  if (counts.recurringSeries > 0) {
    dependencies.push(formatPatientDeleteDependencyLabel(counts.recurringSeries, 'série recorrente', 'séries recorrentes'));
  }

  if (counts.protocols > 0) {
    dependencies.push(formatPatientDeleteDependencyLabel(counts.protocols, 'protocolo', 'protocolos'));
  }

  if (counts.other && counts.other > 0) {
    dependencies.push(formatPatientDeleteDependencyLabel(counts.other, 'outro vínculo', 'outros vínculos'));
  }

  return `Este paciente não pode ser excluído porque existem registros vinculados ao cadastro: ${dependencies.join(', ')}. Remova esses registros antes de excluir o paciente.`;
}

function isForeignKeyConstraintError(error: unknown): boolean {
  if (!error || typeof error !== 'object' || !('code' in error)) {
    return false;
  }

  return error.code === 'P2003' || error.code === 'P2014';
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

function sendAppError(reply: FastifyReply, error: unknown) {
  if (error instanceof AppError) {
    return reply.status(error.statusCode).send({
      error: error.code,
      message: error.message,
    });
  }

  throw error;
}

export async function psychologyRoutes(app: FastifyInstance): Promise<void> {
  app.addHook('preHandler', authGuard);

  app.get('/psychology/patients', async (request) => {
    const { search } = request.query as { search?: string };
    const customerRepo = new PrismaCustomerRepository(request.tenantPrisma);
    const patients = await customerRepo.findAll(request.tenant.id, search);
    return patients.map((patient) => mapPatient(patient));
  });

  app.post('/psychology/patients', async (request, reply) => {
    const schema = z.object({
      name: z.string().min(1).max(200),
      phone: z.string().regex(/^\d{10,11}$/, 'Telefone deve ter 10 ou 11 dígitos').optional(),
      email: z.string().email().max(255).optional(),
      cpf: z.string().max(20).regex(CPF_INPUT_REGEX, 'CPF inválido').optional(),
      notes: z.string().max(2000).optional(),
      psychotherapyPriceCents: z.number().int().positive().nullable().optional(),
      psychotherapyFrequency: psychotherapyFrequencySchema.nullable().optional(),
      neuromodulationEligible: z.boolean().optional(),
      parentsMeetingStatus: parentsMeetingStatusSchema.nullable().optional(),
      birthDate: z.string().regex(DATE_INPUT_REGEX, 'Data de nascimento inválida').nullable().optional(),
      address: z.string().max(500).nullable().optional(),
    });
    const parsed = schema.safeParse(request.body);
    if (!parsed.success) {
      return reply.status(400).send({ error: 'VALIDATION_ERROR', message: parsed.error.errors[0].message });
    }

    const customerRepo = new PrismaCustomerRepository(request.tenantPrisma);
    const { cpf, email, address, birthDate, notes, ...rest } = parsed.data;
    const normalizedCpf = normalizeCpf(cpf);
    const normalizedEmail = normalizeEmail(email);
    const normalizedAddress = normalizeOptionalText(address);
    const normalizedNotes = normalizeOptionalText(notes);
    const cpfConflict = await ensureCpfAvailable({ customerRepo, cpf: normalizedCpf });
    const emailConflict = await ensureEmailAvailable({ customerRepo, email: normalizedEmail });

    if (cpfConflict ?? emailConflict) {
      return reply.status(409).send({
        error: 'CONFLICT',
        message: `Já existe um paciente com este ${cpfConflict ?? emailConflict}.`,
      });
    }

    try {
      const useCase = new CreatePatientUseCase(customerRepo);
      const patient = await useCase.execute({
        tenantId: request.tenant.id,
        ...rest,
        ...(normalizedEmail ? { email: normalizedEmail } : {}),
        ...(normalizedCpf ? { cpf: normalizedCpf } : {}),
        ...(normalizedAddress !== undefined ? { address: normalizedAddress } : {}),
        ...(normalizedNotes !== undefined ? { notes: normalizedNotes } : {}),
        ...(birthDate !== undefined ? { birthDate: normalizeBirthDate(birthDate) } : {}),
      });

      return reply.status(201).send(mapPatient(patient));
    } catch (error: unknown) {
      if (error instanceof AppError) {
        return sendAppError(reply, error);
      }

      const field = getPatientConflictField(error);
      if (field) {
        return reply.status(409).send({ error: 'CONFLICT', message: `Já existe um paciente com este ${field}.` });
      }

      throw error;
    }
  });

  app.get<{ Params: { id: string } }>('/psychology/patients/:id', async (request, reply) => {
    const customerRepo = new PrismaCustomerRepository(request.tenantPrisma);
    const patient = await customerRepo.findById(request.params.id);
    if (!patient) {
      return reply.status(404).send({ error: 'NOT_FOUND', message: 'Paciente não encontrado.' });
    }

    const appointmentRepo = new PrismaAppointmentRepository(request.tenantPrisma);
    const financialSummary = await appointmentRepo.getPatientFinancialSummary(
      request.providerId!,
      request.params.id,
    );

    return mapPatient(patient, {
      businessDate: getTodayInSaoPaulo(),
      financialSummary,
    });
  });

  app.patch<{ Params: { id: string } }>('/psychology/patients/:id', async (request, reply) => {
    const schema = z.object({
      name: z.string().min(1).max(200).optional(),
      phone: z.string().regex(/^\d{10,11}$/, 'Telefone deve ter 10 ou 11 dígitos').nullable().optional(),
      email: z.string().email().max(255).nullable().optional(),
      cpf: z.string().max(20).regex(CPF_INPUT_REGEX, 'CPF inválido').nullable().optional(),
      notes: z.string().max(2000).nullable().optional(),
      psychotherapyPriceCents: z.number().int().positive().nullable().optional(),
      psychotherapyFrequency: psychotherapyFrequencySchema.nullable().optional(),
      neuromodulationEligible: z.boolean().optional(),
      parentsMeetingStatus: parentsMeetingStatusSchema.nullable().optional(),
      birthDate: z.string().regex(DATE_INPUT_REGEX, 'Data de nascimento inválida').nullable().optional(),
      address: z.string().max(500).nullable().optional(),
    }).refine((data) => Object.values(data).some((value) => value !== undefined), {
      message: 'Informe ao menos um campo para atualizar.',
    });
    const parsed = schema.safeParse(request.body);
    if (!parsed.success) {
      return reply.status(400).send({ error: 'VALIDATION_ERROR', message: parsed.error.errors[0].message });
    }

    const customerRepo = new PrismaCustomerRepository(request.tenantPrisma);
    const patient = await customerRepo.findById(request.params.id);
    if (!patient) {
      return reply.status(404).send({ error: 'NOT_FOUND', message: 'Paciente não encontrado.' });
    }

    const { cpf, email, birthDate, notes, address, ...rest } = parsed.data;
    const normalizedCpf = normalizeCpf(cpf);
    const normalizedEmail = normalizeEmail(email);
    const normalizedNotes = normalizeOptionalText(notes);
    const normalizedAddress = normalizeOptionalText(address);
    const cpfConflict = await ensureCpfAvailable({
      customerRepo,
      cpf: normalizedCpf,
      currentCustomerId: patient.id,
    });
    const emailConflict = await ensureEmailAvailable({
      customerRepo,
      email: normalizedEmail,
      currentCustomerId: patient.id,
    });

    if (cpfConflict ?? emailConflict) {
      return reply.status(409).send({
        error: 'CONFLICT',
        message: `Já existe um paciente com este ${cpfConflict ?? emailConflict}.`,
      });
    }

    try {
      const useCase = new UpdatePatientUseCase(customerRepo);
      const updated = await useCase.execute({
        patientId: request.params.id,
        changes: {
          ...rest,
          ...(email !== undefined ? { email: normalizedEmail } : {}),
          ...(cpf !== undefined ? { cpf: normalizedCpf } : {}),
          ...(notes !== undefined ? { notes: normalizedNotes } : {}),
          ...(address !== undefined ? { address: normalizedAddress } : {}),
          ...(birthDate !== undefined ? { birthDate: normalizeBirthDate(birthDate) } : {}),
        },
      });

      return mapPatient(updated);
    } catch (error: unknown) {
      if (error instanceof AppError) {
        return sendAppError(reply, error);
      }

      const field = getPatientConflictField(error);
      if (field) {
        return reply.status(409).send({ error: 'CONFLICT', message: `Já existe um paciente com este ${field}.` });
      }

      throw error;
    }
  });

  app.delete<{ Params: { id: string } }>('/psychology/patients/:id', async (request, reply) => {
    const customerRepo = new PrismaCustomerRepository(request.tenantPrisma);
    const patient = await customerRepo.findById(request.params.id);
    if (!patient) {
      return reply.status(404).send({ error: 'NOT_FOUND', message: 'Paciente não encontrado.' });
    }

    const [documentsCount, sessionsCount, recurringSeriesRows, protocolsCount] = await request.tenantPrisma.$transaction([
      request.tenantPrisma.document.count({
        where: { customerId: request.params.id },
      }),
      request.tenantPrisma.appointment.count({
        where: { customerId: request.params.id },
      }),
      request.tenantPrisma.recurringAppointmentSeries.findMany({
        where: { customerId: request.params.id },
        select: {
          id: true,
          _count: {
            select: {
              appointments: true,
            },
          },
        },
      }),
      request.tenantPrisma.neuromodulationProtocol.count({
        where: { customerId: request.params.id },
      }),
    ]);

    const { blockingCount: recurringSeriesCount, orphanIds: orphanRecurringSeriesIds } =
      resolvePatientDeleteRecurringSeriesDependencies(
        recurringSeriesRows.map((row) => ({
          id: row.id,
          appointmentCount: row._count.appointments,
        })),
      );

    if (orphanRecurringSeriesIds.length > 0) {
      await request.tenantPrisma.recurringAppointmentSeries.deleteMany({
        where: {
          id: {
            in: orphanRecurringSeriesIds,
          },
        },
      });
    }

    if (documentsCount > 0 || sessionsCount > 0 || recurringSeriesCount > 0 || protocolsCount > 0) {
      return reply.status(409).send({
        error: 'PATIENT_HAS_DEPENDENCIES',
        message: buildPatientDeleteDependencyMessage({
          documents: documentsCount,
          sessions: sessionsCount,
          recurringSeries: recurringSeriesCount,
          protocols: protocolsCount,
        }),
        blockers: {
          documents: documentsCount,
          sessions: sessionsCount,
          recurringSeries: recurringSeriesCount,
          protocols: protocolsCount,
        },
      });
    }

    try {
      await request.tenantPrisma.customer.delete({
        where: { id: request.params.id },
      });
    } catch (error) {
      if (isForeignKeyConstraintError(error)) {
        return reply.status(409).send({
          error: 'PATIENT_HAS_DEPENDENCIES',
          message: buildPatientDeleteDependencyMessage({
            documents: 0,
            sessions: 0,
            recurringSeries: 0,
            protocols: 0,
            other: 1,
          }),
          blockers: {
            documents: 0,
            sessions: 0,
            recurringSeries: 0,
            protocols: 0,
            other: 1,
          },
        });
      }

      throw error;
    }

    return reply.status(204).send();
  });

  app.get<{ Params: { id: string } }>('/psychology/patients/:id/protocols', async (request, reply) => {
    const customerRepo = new PrismaCustomerRepository(request.tenantPrisma);
    const patient = await customerRepo.findById(request.params.id);
    if (!patient) {
      return reply.status(404).send({ error: 'NOT_FOUND', message: 'Paciente não encontrado.' });
    }

    const protocolRepo = new PrismaNeuromodulationProtocolRepository(request.tenantPrisma);
    const useCase = new ListPatientNeuromodulationProtocolsUseCase(protocolRepo);
    const protocols = await useCase.execute(request.params.id);
    return protocols.map(mapToProtocol);
  });

  app.post<{ Params: { id: string } }>('/psychology/patients/:id/protocols', async (request, reply) => {
    const schema = z.object({
      totalSessions: z.number().int().min(1),
      totalPriceCents: z.number().int().min(0),
      status: protocolStatusSchema.optional(),
      paymentStatus: paymentStatusSchema.optional(),
      paymentMethod: paymentMethodSchema.nullish(),
      paidAt: z.string().datetime({ offset: true }).nullish(),
      notes: z.string().max(2000).nullish(),
    });
    const parsed = schema.safeParse(request.body);
    if (!parsed.success) {
      return reply.status(400).send({ error: 'VALIDATION_ERROR', message: parsed.error.errors[0].message });
    }

    const customerRepo = new PrismaCustomerRepository(request.tenantPrisma);
    const protocolRepo = new PrismaNeuromodulationProtocolRepository(request.tenantPrisma);
    const useCase = new CreateNeuromodulationProtocolUseCase(customerRepo, protocolRepo);

    try {
      const protocol = await useCase.execute({
        tenantId: request.tenant.id,
        providerId: request.providerId!,
        customerId: request.params.id,
        totalSessions: parsed.data.totalSessions,
        totalPriceCents: parsed.data.totalPriceCents,
        status: parsed.data.status,
        paymentStatus: parsed.data.paymentStatus,
        paymentMethod: parsed.data.paymentMethod ?? null,
        paidAt: parsed.data.paidAt ? new Date(parsed.data.paidAt) : null,
        notes: parsed.data.notes ?? null,
      });

      return reply.status(201).send(mapToProtocol(protocol));
    } catch (error) {
      return sendAppError(reply, error);
    }
  });

  app.get<{ Params: { id: string } }>('/psychology/protocols/:id', async (request, reply) => {
    const protocolRepo = new PrismaNeuromodulationProtocolRepository(request.tenantPrisma);
    const useCase = new GetNeuromodulationProtocolUseCase(protocolRepo);

    try {
      const protocol = await useCase.execute(request.params.id);
      return mapToProtocol(protocol);
    } catch (error) {
      return sendAppError(reply, error);
    }
  });

  app.patch<{ Params: { id: string } }>('/psychology/protocols/:id', async (request, reply) => {
    const schema = z.object({
      totalSessions: z.number().int().min(1).optional(),
      totalPriceCents: z.number().int().min(0).optional(),
      status: protocolStatusSchema.optional(),
      paymentStatus: paymentStatusSchema.optional(),
      paymentMethod: paymentMethodSchema.nullish(),
      paidAt: z.string().datetime({ offset: true }).nullish(),
      notes: z.string().max(2000).nullish(),
    }).refine((data) => Object.values(data).some((value) => value !== undefined), {
      message: 'Informe ao menos um campo para atualizar.',
    });
    const parsed = schema.safeParse(request.body);
    if (!parsed.success) {
      return reply.status(400).send({ error: 'VALIDATION_ERROR', message: parsed.error.errors[0].message });
    }

    const customerRepo = new PrismaCustomerRepository(request.tenantPrisma);
    const protocolRepo = new PrismaNeuromodulationProtocolRepository(request.tenantPrisma);
    const useCase = new UpdateNeuromodulationProtocolUseCase(customerRepo, protocolRepo);

    try {
      const protocol = await useCase.execute({
        protocolId: request.params.id,
        totalSessions: parsed.data.totalSessions,
        totalPriceCents: parsed.data.totalPriceCents,
        status: parsed.data.status,
        paymentStatus: parsed.data.paymentStatus,
        paymentMethod: parsed.data.paymentMethod ?? null,
        paidAt:
          parsed.data.paidAt === undefined
            ? undefined
            : parsed.data.paidAt
              ? new Date(parsed.data.paidAt)
              : null,
        notes: parsed.data.notes ?? null,
      });

      return mapToProtocol(protocol);
    } catch (error) {
      return sendAppError(reply, error);
    }
  });

  app.patch<{ Params: { id: string } }>('/psychology/protocols/:id/status', async (request, reply) => {
    const schema = z.object({
      status: protocolStatusSchema,
    });
    const parsed = schema.safeParse(request.body);
    if (!parsed.success) {
      return reply.status(400).send({ error: 'VALIDATION_ERROR', message: parsed.error.errors[0].message });
    }

    const protocolRepo = new PrismaNeuromodulationProtocolRepository(request.tenantPrisma);
    const useCase = new ChangeNeuromodulationProtocolStatusUseCase(protocolRepo);

    try {
      const protocol = await useCase.execute({
        protocolId: request.params.id,
        status: parsed.data.status,
      });

      return mapToProtocol(protocol);
    } catch (error) {
      return sendAppError(reply, error);
    }
  });

  app.delete<{ Params: { id: string } }>('/psychology/protocols/:id', async (request, reply) => {
    const protocolRepo = new PrismaNeuromodulationProtocolRepository(request.tenantPrisma);
    const useCase = new DeleteNeuromodulationProtocolUseCase(protocolRepo);

    try {
      await useCase.execute({
        protocolId: request.params.id,
        providerId: request.providerId!,
      });

      return reply.status(204).send();
    } catch (error) {
      return sendAppError(reply, error);
    }
  });

  app.get('/psychology/sessions', async (request, reply) => {
    const schema = z.object({
      from: z.string().regex(DATE_INPUT_REGEX, 'Data inicial inválida').optional(),
      to: z.string().regex(DATE_INPUT_REGEX, 'Data final inválida').optional(),
      patientId: z.string().uuid('Paciente inválido').optional(),
      type: sessionTypeSchema.optional(),
      status: appointmentStatusSchema.optional(),
      paymentStatus: paymentStatusSchema.optional(),
      excludeCancelled: booleanQueryFlagSchema,
      dueOnly: booleanQueryFlagSchema,
      receivableScope: receivableScopeSchema.optional(),
    });
    const parsed = schema.safeParse(request.query);
    if (!parsed.success) {
      return reply.status(400).send({ error: 'VALIDATION_ERROR', message: parsed.error.errors[0].message });
    }

    const { from, to, patientId, type, status, paymentStatus, excludeCancelled, dueOnly, receivableScope } = parsed.data;
    const dueCutoffDate = dueOnly ? new Date(`${getTodayInSaoPaulo()}T00:00:00`) : undefined;
    const upperBound = getEarlierDate(
      to ? new Date(`${to}T00:00:00`) : undefined,
      dueCutoffDate,
    );
    const appointmentRepo = new PrismaAppointmentRepository(request.tenantPrisma);

    if (patientId) {
      const appointments = await appointmentRepo.findPatientHistory(request.providerId!, patientId, {
        ...(from ? { from: new Date(`${from}T00:00:00`) } : {}),
        ...(upperBound ? { to: upperBound } : {}),
        ...(type ? { type } : {}),
        ...(status ? { status } : {}),
        ...(paymentStatus ? { paymentStatus } : {}),
      });

      return appointments
        .filter((appointment) => (excludeCancelled ? appointment.status !== 'cancelled' : true))
        .filter((appointment) =>
          receivableScope === 'operations-only'
            ? !appointment.protocolId || appointment.protocolCreditOutcome === 'maintenance'
            : true,
        )
        .map(mapToSession);
    }

    const appointments = await request.tenantPrisma.appointment.findMany({
      where: {
        providerId: request.providerId!,
        ...(from || upperBound
          ? {
              date: {
                ...(from ? { gte: new Date(`${from}T00:00:00`) } : {}),
                ...(upperBound ? { lte: upperBound } : {}),
              },
            }
          : {}),
        ...(paymentStatus ? { paymentStatus } : {}),
        ...(status ? { status } : {}),
        ...(type === 'psychotherapy'
          ? {
              service: {
                slug: {
                  in: ['individual', 'couple', 'family', 'casal', 'familiar', 'psychotherapy'],
                },
              },
            }
          : {}),
        ...(type === 'neuromodulation'
          ? {
              service: {
                slug: {
                  notIn: ['individual', 'couple', 'family', 'casal', 'familiar', 'psychotherapy'],
                },
              },
            }
          : {}),
        ...(excludeCancelled ? { status: { not: 'cancelled' } } : {}),
        ...(receivableScope === 'operations-only'
          ? {
              OR: [
                { protocolId: null },
                { protocolCreditOutcome: 'maintenance' },
              ],
            }
          : {}),
      },
      include: {
        service: true,
        customer: true,
        protocol: {
          select: {
            id: true,
            status: true,
            totalSessions: true,
          },
        },
        recurringSeries: true,
      },
      orderBy: [{ date: 'asc' }, { startTime: 'asc' }],
    });

    return appointments.map(mapToSession);
  });

  app.post('/psychology/sessions', async (request, reply) => {
    const schema = z.object({
      patientId: z.string().uuid(),
      date: z.string().regex(DATE_INPUT_REGEX, 'Data inválida'),
      startTime: z.string().regex(TIME_INPUT_REGEX, 'Horário inválido'),
      type: sessionTypeSchema,
      value: z.number().int().min(0).optional(),
      notes: z.string().max(2000).optional(),
      status: appointmentStatusSchema.optional(),
      paymentStatus: paymentStatusSchema.optional(),
      paymentMethod: paymentMethodSchema.optional(),
      paidAt: z.string().datetime({ offset: true }).optional(),
      protocolId: z.string().uuid().nullable().optional(),
    });
    const parsed = schema.safeParse(request.body);
    if (!parsed.success) {
      return reply.status(400).send({ error: 'VALIDATION_ERROR', message: parsed.error.errors[0].message });
    }

    const appointmentRepo = new PrismaAppointmentRepository(request.tenantPrisma);
    const customerRepo = new PrismaCustomerRepository(request.tenantPrisma);
    const protocolRepo = new PrismaNeuromodulationProtocolRepository(request.tenantPrisma);
    const serviceRepo = new PrismaServiceRepository(request.tenantPrisma);
    const useCase = new CreatePsychologySessionUseCase(
      appointmentRepo,
      customerRepo,
      protocolRepo,
      serviceRepo,
    );

    try {
      const appointment = await useCase.execute({
        tenantId: request.tenant.id,
        providerId: request.providerId!,
        patientId: parsed.data.patientId,
        date: parsed.data.date,
        startTime: parsed.data.startTime,
        type: parsed.data.type,
        valueCents: parsed.data.value,
        notes: parsed.data.notes ?? null,
        status: parsed.data.status,
        paymentStatus: parsed.data.paymentStatus,
        paymentMethod: parsed.data.paymentMethod ?? null,
        paidAt: parsed.data.paidAt ? new Date(parsed.data.paidAt) : null,
        protocolId: parsed.data.protocolId ?? null,
      });

      return reply.status(201).send(mapToSession(appointment));
    } catch (error) {
      return sendAppError(reply, error);
    }
  });

  app.post('/psychology/recurring-series', async (request, reply) => {
    const schema = z.object({
      patientId: z.string().uuid(),
      startDate: z.string().regex(DATE_INPUT_REGEX, 'Data inválida'),
      startTime: z.string().regex(TIME_INPUT_REGEX, 'Horário inválido'),
      type: sessionTypeSchema,
      intervalWeeks: z.number().int().min(1).max(52),
      value: z.number().int().min(0).optional(),
      notes: z.string().max(2000).optional(),
    });
    const parsed = schema.safeParse(request.body);
    if (!parsed.success) {
      return reply.status(400).send({ error: 'VALIDATION_ERROR', message: parsed.error.errors[0].message });
    }

    if (parsed.data.type !== 'psychotherapy') {
      return reply.status(422).send({
        error: 'VALIDATION_ERROR',
        message: 'A recorrência automática está disponível apenas para psicoterapia.',
      });
    }

    const customerRepo = new PrismaCustomerRepository(request.tenantPrisma);
    const patient = await customerRepo.findById(parsed.data.patientId);
    if (!patient) {
      return reply.status(404).send({ error: 'NOT_FOUND', message: 'Paciente não encontrado.' });
    }

    if (!hasPsychotherapyCareProfile(patient)) {
      return reply.status(422).send({
        error: 'VALIDATION_ERROR',
        message: 'Somente pacientes de psicoterapia podem usar a recorrência automática.',
      });
    }

    const serviceRepo = new PrismaServiceRepository(request.tenantPrisma);
    const service = await serviceRepo.findBySlug('psychotherapy');
    if (!service) {
      return reply.status(404).send({ error: 'NOT_FOUND', message: 'Serviço não encontrado.' });
    }

    const appointmentRepo = new PrismaAppointmentRepository(request.tenantPrisma);
    const recurringSeriesRepo = new PrismaRecurringAppointmentSeriesRepository(request.tenantPrisma);
    const useCase = new CreateRecurringSeriesUseCase(
      appointmentRepo,
      recurringSeriesRepo,
      serviceRepo,
    );

    const priceCents = resolvePsychologySessionPrice({
      patient,
      type: 'psychotherapy',
      explicitValueCents: parsed.data.value,
      service,
    });

    try {
      const result = await useCase.execute({
        tenantId: request.tenant.id,
        providerId: request.providerId!,
        customerId: parsed.data.patientId,
        serviceId: service.id,
        startDate: parsed.data.startDate,
        startTime: parsed.data.startTime,
        intervalWeeks: parsed.data.intervalWeeks,
        priceCents,
        notes: parsed.data.notes,
      });

      return reply.status(201).send({
        recurringSeriesId: result.series.id,
        created: result.createdAppointments,
        cadenceLabel: result.cadenceLabel,
        protectedUntil: result.protectedUntil,
      });
    } catch (error) {
      return sendAppError(reply, error);
    }
  });

  app.post('/psychology/sessions/batch', async (request, reply) => {
    const schema = z.object({
      patientId: z.string().uuid(),
      startDate: z.string().regex(DATE_INPUT_REGEX, 'Data inválida'),
      startTime: z.string().regex(TIME_INPUT_REGEX, 'Horário inválido'),
      type: sessionTypeSchema,
      weeks: z.number().int().min(1).max(52),
      value: z.number().int().min(0).optional(),
      notes: z.string().max(2000).optional(),
      status: appointmentStatusSchema.optional(),
      paymentStatus: paymentStatusSchema.optional(),
      paymentMethod: paymentMethodSchema.optional(),
      paidAt: z.string().datetime({ offset: true }).optional(),
    });
    const parsed = schema.safeParse(request.body);
    if (!parsed.success) {
      return reply.status(400).send({ error: 'VALIDATION_ERROR', message: parsed.error.errors[0].message });
    }

    if (parsed.data.type !== 'psychotherapy') {
      return reply.status(422).send({
        error: 'VALIDATION_ERROR',
        message: 'A criação em lote é reservada para psicoterapia. Para neuromodulação, agende as sessões gradualmente.',
      });
    }

    const customerRepo = new PrismaCustomerRepository(request.tenantPrisma);
    const patient = await customerRepo.findById(parsed.data.patientId);
    if (!patient) {
      return reply.status(404).send({ error: 'NOT_FOUND', message: 'Paciente não encontrado.' });
    }

    if (!hasPsychotherapyCareProfile(patient)) {
      return reply.status(422).send({
        error: 'VALIDATION_ERROR',
        message: 'Somente pacientes de psicoterapia podem usar a criação em lote.',
      });
    }

    const serviceRepo = new PrismaServiceRepository(request.tenantPrisma);
    const service = await serviceRepo.findBySlug('psychotherapy');
    if (!service) {
      return reply.status(404).send({ error: 'NOT_FOUND', message: 'Serviço não encontrado.' });
    }

    const nextPaymentStatus = parsed.data.paymentStatus ?? 'pending';
    if (nextPaymentStatus === 'paid' && !parsed.data.paymentMethod) {
      return reply.status(422).send({
        error: 'VALIDATION_ERROR',
        message: 'Selecione a forma de pagamento.',
      });
    }

    const priceCents = resolvePsychologySessionPrice({
      patient,
      type: 'psychotherapy',
      explicitValueCents: parsed.data.value,
      service,
    });

    const appointmentRepo = new PrismaAppointmentRepository(request.tenantPrisma);
    const createUseCase = new CreatePsychologySessionUseCase(
      appointmentRepo,
      customerRepo,
      new PrismaNeuromodulationProtocolRepository(request.tenantPrisma),
      serviceRepo,
    );

    const baseDate = new Date(`${parsed.data.startDate}T12:00:00`);
    let created = 0;
    let skipped = 0;

    for (let index = 0; index < parsed.data.weeks; index++) {
      const date = new Date(baseDate);
      date.setDate(date.getDate() + index * 7);
      const dateStr = date.toISOString().slice(0, 10);

      try {
        await createUseCase.execute({
          tenantId: request.tenant.id,
          providerId: request.providerId!,
          patientId: parsed.data.patientId,
          date: dateStr,
          startTime: parsed.data.startTime,
          type: 'psychotherapy',
          valueCents: priceCents,
          notes: parsed.data.notes ?? null,
          status: parsed.data.status ?? 'scheduled',
          paymentStatus: nextPaymentStatus,
          paymentMethod: parsed.data.paymentMethod ?? null,
          paidAt: parsed.data.paidAt ? new Date(parsed.data.paidAt) : null,
        });
        created++;
      } catch (error) {
        if (error instanceof AppError && error.code === 'VALIDATION_ERROR' && error.message === 'Já existe uma sessão neste horário.') {
          skipped++;
          continue;
        }

        return sendAppError(reply, error);
      }
    }

    return reply.status(201).send({ created, skipped });
  });

  app.patch<{ Params: { id: string } }>('/psychology/recurring-series/:id/stop', async (request, reply) => {
    const schema = z.object({
      stopDate: z.string().regex(DATE_INPUT_REGEX, 'Data inválida'),
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

    try {
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
    } catch (error) {
      return sendAppError(reply, error);
    }
  });

  app.patch<{ Params: { id: string } }>('/psychology/sessions/:id', async (request, reply) => {
    const schema = z.object({
      patientId: z.string().uuid().optional(),
      date: z.string().regex(DATE_INPUT_REGEX, 'Data inválida').optional(),
      startTime: z.string().regex(TIME_INPUT_REGEX, 'Horário inválido').optional(),
      type: sessionTypeSchema.optional(),
      value: z.number().int().min(0).optional(),
      notes: z.string().max(2000).nullable().optional(),
      status: appointmentStatusSchema.optional(),
      paymentStatus: paymentStatusSchema.optional(),
      paymentMethod: paymentMethodSchema.nullish(),
      paidAt: z.string().datetime({ offset: true }).nullable().optional(),
      protocolId: z.string().uuid().nullable().optional(),
      protocolCreditAction: protocolCreditActionSchema.optional(),
    }).refine((data) => Object.values(data).some((value) => value !== undefined), {
      message: 'Informe ao menos um campo para atualizar.',
    });
    const parsed = schema.safeParse(request.body);
    if (!parsed.success) {
      return reply.status(400).send({ error: 'VALIDATION_ERROR', message: parsed.error.errors[0].message });
    }

    const appointmentRepo = new PrismaAppointmentRepository(request.tenantPrisma);
    const customerRepo = new PrismaCustomerRepository(request.tenantPrisma);
    const protocolRepo = new PrismaNeuromodulationProtocolRepository(request.tenantPrisma);
    const serviceRepo = new PrismaServiceRepository(request.tenantPrisma);
    const useCase = new UpdatePsychologySessionUseCase(
      appointmentRepo,
      customerRepo,
      protocolRepo,
      serviceRepo,
    );

    try {
      const appointment = await useCase.execute({
        appointmentId: request.params.id,
        providerId: request.providerId!,
        patientId: parsed.data.patientId,
        date: parsed.data.date,
        startTime: parsed.data.startTime,
        type: parsed.data.type,
        valueCents: parsed.data.value,
        notes: parsed.data.notes ?? null,
        status: parsed.data.status,
        paymentStatus: parsed.data.paymentStatus,
        paymentMethod: parsed.data.paymentMethod ?? null,
        paidAt:
          parsed.data.paidAt === undefined
            ? undefined
            : parsed.data.paidAt
              ? new Date(parsed.data.paidAt)
              : null,
        protocolId: parsed.data.protocolId,
        protocolCreditAction: parsed.data.protocolCreditAction,
      });

      return mapToSession(appointment);
    } catch (error) {
      return sendAppError(reply, error);
    }
  });

  app.delete<{ Params: { id: string } }>('/psychology/sessions/:id', async (request, reply) => {
    const schema = z.object({
      protocolCreditAction: protocolCreditActionSchema.optional(),
    });
    const parsed = schema.safeParse(request.body ?? {});
    if (!parsed.success) {
      return reply.status(400).send({ error: 'VALIDATION_ERROR', message: parsed.error.errors[0].message });
    }

    const appointmentRepo = new PrismaAppointmentRepository(request.tenantPrisma);
    const protocolRepo = new PrismaNeuromodulationProtocolRepository(request.tenantPrisma);
    const useCase = new DeletePsychologySessionUseCase(appointmentRepo, protocolRepo);

    try {
      await useCase.execute({
        appointmentId: request.params.id,
        providerId: request.providerId!,
        protocolCreditAction: parsed.data.protocolCreditAction,
      });

      return reply.status(204).send();
    } catch (error) {
      return sendAppError(reply, error);
    }
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

  app.get<{ Params: { patientId: string } }>('/psychology/patients/:patientId/reports', async (request) => {
    const reportRepo = new PrismaSessionReportRepository(request.tenantPrisma);
    return reportRepo.findByPatient(request.params.patientId);
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
