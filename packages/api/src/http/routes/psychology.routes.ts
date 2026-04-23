import crypto from 'node:crypto';
import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { authGuard } from '../middleware/auth.middleware.js';
import { PrismaSessionReportRepository } from '../../infrastructure/database/repositories/prisma-session-report.repository.js';
import { PrismaDocumentRepository } from '../../infrastructure/database/repositories/prisma-document.repository.js';
import { PrismaAppointmentRepository } from '../../infrastructure/database/repositories/prisma-appointment.repository.js';
import { PrismaCustomerRepository } from '../../infrastructure/database/repositories/prisma-customer.repository.js';
import { ChatwootClient } from '../../infrastructure/notifications/chatwoot.client.js';
import { tenantConfigSchema } from '@soberano/shared';

const MAX_DATA_LENGTH = 6_800_000;
const SESSION_DURATION_MINUTES = 50;

function addMinutes(time: string, minutes: number): string {
  const [h, m] = time.split(':').map(Number);
  const total = h * 60 + m + minutes;
  return `${String(Math.floor(total / 60)).padStart(2, '0')}:${String(total % 60).padStart(2, '0')}`;
}

function toDateStr(raw: Date | string): string {
  if (raw instanceof Date) return raw.toISOString().slice(0, 10);
  return String(raw).slice(0, 10);
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
    paidAt: raw.paidAt ?? undefined,
    notes: raw.appointmentNotes ?? undefined,
  };
}

export async function psychologyRoutes(app: FastifyInstance): Promise<void> {
  app.addHook('onRequest', authGuard);

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
      cpf: z.string().max(14).optional(),
      notes: z.string().max(2000).optional(),
    });
    const parsed = schema.safeParse(request.body);
    if (!parsed.success) return reply.status(400).send({ error: 'VALIDATION_ERROR', message: parsed.error.errors[0].message });
    const customerRepo = new PrismaCustomerRepository(request.tenantPrisma);
    try {
      const customer = await customerRepo.create({ tenantId: request.tenant.id, ...parsed.data });
      return reply.status(201).send(customer);
    } catch (err: unknown) {
      const prismaErr = err as { code?: string; meta?: { target?: string[] } };
      if (prismaErr.code === 'P2002') {
        const field = prismaErr.meta?.target?.includes('phone') ? 'telefone' : 'email';
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
      cpf: z.string().max(14).nullable().optional(),
      notes: z.string().max(2000).nullable().optional(),
    }).refine((d) => Object.values(d).some((v) => v !== undefined), {
      message: 'Informe ao menos um campo para atualizar.',
    });
    const parsed = schema.safeParse(request.body);
    if (!parsed.success) return reply.status(400).send({ error: 'VALIDATION_ERROR', message: parsed.error.errors[0].message });
    const customerRepo = new PrismaCustomerRepository(request.tenantPrisma);
    const customer = await customerRepo.findById(request.params.id);
    if (!customer) return reply.status(404).send({ error: 'NOT_FOUND', message: 'Paciente não encontrado.' });
    return customerRepo.update(request.params.id, parsed.data);
  });

  app.delete<{ Params: { id: string } }>('/psychology/patients/:id', async (request, reply) => {
    const customerRepo = new PrismaCustomerRepository(request.tenantPrisma);
    const customer = await customerRepo.findById(request.params.id);
    if (!customer) return reply.status(404).send({ error: 'NOT_FOUND', message: 'Paciente não encontrado.' });
    await customerRepo.deleteById(request.params.id);
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
      include: { service: true, customer: true },
      orderBy: [{ date: 'asc' }, { startTime: 'asc' }],
    });
    return appointments.map(mapToSession);
  });

  app.post('/psychology/sessions', async (request, reply) => {
    const schema = z.object({
      patientId: z.string().uuid(),
      date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Data inválida'),
      startTime: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, 'Horário inválido'),
      type: z.enum(['individual', 'couple', 'family']),
      value: z.number().int().min(0).optional(),
      notes: z.string().max(2000).optional(),
      status: z.string().optional(),
      paymentStatus: z.string().optional(),
    });
    const parsed = schema.safeParse(request.body);
    if (!parsed.success) return reply.status(400).send({ error: 'VALIDATION_ERROR', message: parsed.error.errors[0].message });

    const { patientId, date, startTime, type, value, notes, status, paymentStatus } = parsed.data;

    const customer = await request.tenantPrisma.customer.findFirst({
      where: { id: patientId, tenantId: request.tenant.id },
    });
    if (!customer) return reply.status(404).send({ error: 'NOT_FOUND', message: 'Paciente não encontrado.' });

    const service = await request.tenantPrisma.service.findFirst({
      where: { tenantId: request.tenant.id, slug: type, isActive: true },
    });
    if (!service) return reply.status(404).send({ error: 'NOT_FOUND', message: 'Serviço não encontrado.' });

    const endTime = addMinutes(startTime, SESSION_DURATION_MINUTES);

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
        paymentStatus: paymentStatus ?? 'pending',
        appointmentNotes: notes ?? null,
      },
      include: { service: true, customer: true },
    });

    return reply.status(201).send(mapToSession(apt));
  });

  app.post('/psychology/sessions/batch', async (request, reply) => {
    const schema = z.object({
      patientId: z.string().uuid(),
      startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Data inválida'),
      startTime: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, 'Horário inválido'),
      type: z.enum(['individual', 'couple', 'family']),
      weeks: z.number().int().min(1).max(52),
      value: z.number().int().min(0).optional(),
      notes: z.string().max(2000).optional(),
      status: z.string().optional(),
      paymentStatus: z.string().optional(),
    });
    const parsed = schema.safeParse(request.body);
    if (!parsed.success) return reply.status(400).send({ error: 'VALIDATION_ERROR', message: parsed.error.errors[0].message });

    const { patientId, startDate, startTime, type, weeks, value, notes, status, paymentStatus } = parsed.data;

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
    let created = 0;
    let skipped = 0;

    for (let i = 0; i < weeks; i++) {
      const d = new Date(baseDate);
      d.setDate(d.getDate() + i * 7);
      const dateStr = d.toISOString().slice(0, 10);

      const conflict = await request.tenantPrisma.appointment.findFirst({
        where: {
          providerId: request.providerId!,
          date: new Date(dateStr + 'T00:00:00'),
          startTime,
          status: { not: 'cancelled' },
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
          paymentStatus: paymentStatus ?? 'pending',
          appointmentNotes: notes ?? null,
        },
      });
      created++;
    }

    return reply.status(201).send({ created, skipped });
  });

  app.patch<{ Params: { id: string } }>('/psychology/sessions/:id', async (request, reply) => {
    const schema = z.object({
      value: z.number().int().min(0).optional(),
      notes: z.string().max(2000).nullable().optional(),
      status: z.string().optional(),
      paymentStatus: z.string().optional(),
      paidAt: z.string().nullable().optional(),
    }).refine((d) => Object.values(d).some((v) => v !== undefined), {
      message: 'Informe ao menos um campo para atualizar.',
    });
    const parsed = schema.safeParse(request.body);
    if (!parsed.success) return reply.status(400).send({ error: 'VALIDATION_ERROR', message: parsed.error.errors[0].message });

    const appointment = await request.tenantPrisma.appointment.findUnique({ where: { id: request.params.id } });
    if (!appointment) return reply.status(404).send({ error: 'NOT_FOUND', message: 'Sessão não encontrada.' });

    const { value, notes, status, paymentStatus, paidAt } = parsed.data;
    const updated = await request.tenantPrisma.appointment.update({
      where: { id: request.params.id },
      data: {
        ...(value !== undefined ? { priceCents: value } : {}),
        ...(notes !== undefined ? { appointmentNotes: notes } : {}),
        ...(status ? { status } : {}),
        ...(paymentStatus ? { paymentStatus } : {}),
        ...(paidAt !== undefined ? { paidAt: paidAt ? new Date(paidAt) : null } : {}),
      },
      include: { service: true, customer: true },
    });

    return mapToSession(updated);
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
