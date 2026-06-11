import crypto from 'node:crypto';
import type { AppointmentRepository } from '../../../domain/repositories/appointment.repository.js';
import type { CustomerRepository } from '../../../domain/repositories/customer.repository.js';
import type { NeuromodulationProtocolRepository } from '../../../domain/repositories/neuromodulation-protocol.repository.js';
import type { ProviderRepository } from '../../../domain/repositories/provider.repository.js';
import type { ServiceRepository } from '../../../domain/repositories/service.repository.js';
import type { AppointmentWithDetails } from '../../../domain/entities/appointment.js';
import { NotFoundError } from '../../../shared/errors.js';
import {
  assertNoScheduleConflict,
  assertPaymentInput,
  assertProtocolCapacity,
  assertSessionMatchesCareProfile,
  buildEndTime,
  resolveProtocolOutcome,
  resolvePsychologySessionPrice,
  syncActiveProtocolLifecycle,
  type PsychologySessionType,
} from './psychology-session.utils.js';

export interface CreatePsychologySessionInput {
  tenantId: string;
  providerId: string;
  patientId: string;
  date: string;
  startTime: string;
  type: PsychologySessionType;
  valueCents?: number;
  notes?: string | null;
  status?: 'scheduled' | 'confirmed' | 'completed' | 'cancelled' | 'no_show';
  paymentStatus?: 'pending' | 'paid';
  paymentMethod?: 'card' | 'pix' | 'cash' | null;
  paidAt?: Date | null;
  durationMinutes?: number;
  protocolId?: string | null;
}

export class CreatePsychologySessionUseCase {
  constructor(
    private readonly appointmentRepo: AppointmentRepository,
    private readonly customerRepo: CustomerRepository,
    private readonly protocolRepo: NeuromodulationProtocolRepository,
    private readonly serviceRepo: ServiceRepository,
    private readonly providerRepo: ProviderRepository,
  ) {}

  async execute(input: CreatePsychologySessionInput): Promise<AppointmentWithDetails> {
    const patient = await this.customerRepo.findById(input.patientId);
    if (!patient) {
      throw new NotFoundError('Paciente');
    }

    assertSessionMatchesCareProfile(patient, input.type);

    if (input.type === 'psychotherapy' && input.protocolId) {
      throw new NotFoundError('Protocolo');
    }

    const service = await this.serviceRepo.findBySlug(input.type);
    if (!service) {
      throw new NotFoundError('Serviço');
    }

    const provider = await this.providerRepo.findById(input.providerId);
    if (!provider) {
      throw new NotFoundError('Profissional');
    }

    const endTime = buildEndTime(
      input.startTime,
      input.durationMinutes ?? provider.defaultSessionDurationMinutes,
    );
    const sameDayAppointments = await this.appointmentRepo.findByBarberAndDateRange(
      input.providerId,
      new Date(`${input.date}T00:00:00`),
      new Date(`${input.date}T00:00:00`),
    );
    assertNoScheduleConflict({
      appointments: sameDayAppointments,
      date: input.date,
      startTime: input.startTime,
      endTime,
    });

    const paymentStatus = input.paymentStatus ?? 'pending';
    assertPaymentInput({
      paymentStatus,
      paymentMethod: input.paymentMethod ?? null,
      paidAt: input.paidAt ?? null,
    });

    let protocolId: string | null = null;
    let protocolCreditOutcome: 'reserved' | 'consumed' | 'released' | 'maintenance' | null = null;
    let isRevenueCoveredByProtocol = false;

    if (input.type === 'neuromodulation' && input.protocolId) {
      const protocol = await this.protocolRepo.findById(input.protocolId);
      if (!protocol || protocol.customerId !== patient.id || protocol.providerId !== input.providerId) {
        throw new NotFoundError('Protocolo');
      }

      protocolCreditOutcome = resolveProtocolOutcome({
        currentProtocolId: null,
        currentOutcome: null,
        currentStatus: 'scheduled',
        nextProtocol: protocol,
        nextStatus: input.status ?? 'scheduled',
      });

      const usage = await this.protocolRepo.getUsageSnapshot(protocol.id);
      assertProtocolCapacity(protocol, usage, protocolCreditOutcome);

      protocolId = protocol.id;
      isRevenueCoveredByProtocol = protocol.status !== 'maintenance';
    }

    const priceCents = isRevenueCoveredByProtocol
      ? 0
      : resolvePsychologySessionPrice({
          patient,
          type: input.type,
          explicitValueCents: input.valueCents,
          service,
        });

    const appointment = await this.appointmentRepo.create({
      tenantId: input.tenantId,
      barberId: input.providerId,
      serviceId: service.id,
      customerId: patient.id,
      protocolId: protocolId ?? undefined,
      protocolCreditOutcome,
      date: new Date(`${input.date}T00:00:00`),
      startTime: input.startTime,
      endTime,
      priceCents,
      cancelToken: crypto.randomBytes(32).toString('hex'),
      status: input.status ?? 'scheduled',
      paymentStatus,
      paymentMethod: paymentStatus === 'paid' ? input.paymentMethod ?? null : null,
      paidAt: paymentStatus === 'paid' ? input.paidAt ?? new Date() : null,
      appointmentNotes: input.notes ?? null,
    });

    await syncActiveProtocolLifecycle(this.protocolRepo, protocolId);

    return appointment;
  }
}
