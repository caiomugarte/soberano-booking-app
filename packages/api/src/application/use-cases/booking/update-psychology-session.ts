import type { AppointmentRepository } from '../../../domain/repositories/appointment.repository.js';
import type { CustomerRepository } from '../../../domain/repositories/customer.repository.js';
import type { NeuromodulationProtocolRepository } from '../../../domain/repositories/neuromodulation-protocol.repository.js';
import type { ServiceRepository } from '../../../domain/repositories/service.repository.js';
import type { AppointmentWithDetails } from '../../../domain/entities/appointment.js';
import { NotFoundError, ValidationError } from '../../../shared/errors.js';
import {
  assertNoScheduleConflict,
  assertPaymentInput,
  assertProtocolCapacity,
  assertSessionMatchesCareProfile,
  buildEndTime,
  getDurationMinutes,
  normalizePsychologySessionType,
  resolveProtocolOutcome,
  resolvePsychologySessionPrice,
  syncActiveProtocolLifecycle,
  type ProtocolCreditAction,
  type PsychologySessionType,
} from './psychology-session.utils.js';

export interface UpdatePsychologySessionInput {
  appointmentId: string;
  providerId: string;
  patientId?: string;
  date?: string;
  startTime?: string;
  type?: PsychologySessionType;
  valueCents?: number;
  notes?: string | null;
  status?: 'scheduled' | 'confirmed' | 'completed' | 'cancelled' | 'no_show';
  paymentStatus?: 'pending' | 'paid';
  paymentMethod?: 'card' | 'pix' | 'cash' | null;
  paidAt?: Date | null;
  durationMinutes?: number;
  protocolId?: string | null;
  protocolCreditAction?: ProtocolCreditAction;
}

export class UpdatePsychologySessionUseCase {
  constructor(
    private readonly appointmentRepo: AppointmentRepository,
    private readonly customerRepo: CustomerRepository,
    private readonly protocolRepo: NeuromodulationProtocolRepository,
    private readonly serviceRepo: ServiceRepository,
  ) {}

  async execute(input: UpdatePsychologySessionInput): Promise<AppointmentWithDetails> {
    const appointment = await this.appointmentRepo.findById(input.appointmentId);
    if (!appointment || appointment.barberId !== input.providerId) {
      throw new NotFoundError('Sessão');
    }

    const nextPatientId = input.patientId ?? appointment.customerId;
    const patient = nextPatientId === appointment.customerId
      ? appointment.customer
      : await this.customerRepo.findById(nextPatientId);

    if (!patient) {
      throw new NotFoundError('Paciente');
    }

    const currentType = normalizePsychologySessionType(appointment.service.slug);
    const nextType = input.type ?? currentType;
    assertSessionMatchesCareProfile(patient, nextType);

    if (nextType === 'psychotherapy' && input.protocolId) {
      throw new ValidationError('Sessões de psicoterapia não podem ser vinculadas a protocolos.');
    }

    const service =
      input.type === undefined && nextType === currentType
        ? appointment.service
        : await this.serviceRepo.findBySlug(nextType);
    if (!service) {
      throw new NotFoundError('Serviço');
    }

    const nextDate = input.date ?? appointment.date.toISOString().slice(0, 10);
    const nextStartTime = input.startTime ?? appointment.startTime;
    const nextEndTime =
      input.date !== undefined || input.startTime !== undefined || input.type !== undefined || input.durationMinutes !== undefined
        ? buildEndTime(
            nextStartTime,
            input.durationMinutes ?? getDurationMinutes(appointment.startTime, appointment.endTime),
          )
        : appointment.endTime;
    const nextStatus = input.status ?? appointment.status;

    const sameDayAppointments = await this.appointmentRepo.findByBarberAndDateRange(
      input.providerId,
      new Date(`${nextDate}T00:00:00`),
      new Date(`${nextDate}T00:00:00`),
    );
    assertNoScheduleConflict({
      appointments: sameDayAppointments,
      appointmentId: appointment.id,
      date: nextDate,
      startTime: nextStartTime,
      endTime: nextEndTime,
    });

    const paymentStatus = input.paymentStatus ?? appointment.paymentStatus;
    const nextPaymentMethod =
      paymentStatus === 'paid'
        ? input.paymentMethod ?? appointment.paymentMethod
        : null;
    const nextPaidAt =
      paymentStatus === 'paid'
        ? input.paidAt ?? appointment.paidAt ?? new Date()
        : null;
    assertPaymentInput({
      paymentStatus,
      paymentMethod: nextPaymentMethod,
      paidAt: nextPaidAt,
    });

    const nextProtocolId =
      nextType === 'psychotherapy'
        ? null
        : input.protocolId !== undefined
          ? input.protocolId
          : appointment.protocolId;

    let nextProtocol = null;
    if (nextProtocolId) {
      nextProtocol = await this.protocolRepo.findById(nextProtocolId);
      if (!nextProtocol || nextProtocol.customerId !== patient.id || nextProtocol.providerId !== input.providerId) {
        throw new NotFoundError('Protocolo');
      }
    }

    if (
      appointment.protocolId &&
      appointment.protocolId === nextProtocolId &&
      appointment.protocolCreditOutcome === 'consumed' &&
      nextProtocol &&
      nextProtocol.status !== 'finished' &&
      nextStatus === 'cancelled' &&
      input.protocolCreditAction === 'release'
    ) {
      throw new ValidationError('Sessões já consumidas não podem liberar o crédito novamente.');
    }

    const nextProtocolCreditOutcome = resolveProtocolOutcome({
      currentProtocolId: appointment.protocolId,
      currentOutcome: appointment.protocolCreditOutcome,
      currentStatus: appointment.status,
      nextProtocol,
      nextStatus,
      action: input.protocolCreditAction,
    });

    if (nextProtocol) {
      const usage = await this.protocolRepo.getUsageSnapshot(
        nextProtocol.id,
        appointment.protocolId === nextProtocol.id ? appointment.id : undefined,
      );
      assertProtocolCapacity(nextProtocol, usage, nextProtocolCreditOutcome);
    }

    if (appointment.protocolId && appointment.protocolId !== nextProtocolId) {
      const currentProtocol = await this.protocolRepo.findById(appointment.protocolId);

      if (appointment.protocolCreditOutcome === 'reserved') {
        if (!input.protocolCreditAction) {
          throw new ValidationError('Escolha se o crédito do protocolo atual deve ser liberado ou consumido.');
        }

        if (input.protocolCreditAction === 'consume' && currentProtocol) {
          await this.protocolRepo.update(currentProtocol.id, {
            manualConsumedCount: currentProtocol.manualConsumedCount + 1,
          });
        }
      }

      if (appointment.protocolCreditOutcome === 'consumed' && currentProtocol) {
        await this.protocolRepo.update(currentProtocol.id, {
          manualConsumedCount: currentProtocol.manualConsumedCount + 1,
        });
      }
    }

    const priceCents =
      nextProtocol && nextProtocol.status !== 'maintenance'
        ? 0
        : input.valueCents === undefined
          ? appointment.priceCents
          : resolvePsychologySessionPrice({
              patient,
              type: nextType,
              explicitValueCents: input.valueCents,
              fallbackValueCents: appointment.priceCents,
              service,
            });

    const updatedAppointment = await this.appointmentRepo.updateDetails(appointment.id, {
      customerId: nextPatientId,
      serviceId: service.id,
      protocolId: nextProtocolId,
      protocolCreditOutcome: nextProtocolCreditOutcome,
      date: new Date(`${nextDate}T00:00:00`),
      startTime: nextStartTime,
      endTime: nextEndTime,
      priceCents,
      status: nextStatus,
      paymentStatus,
      paymentMethod: nextPaymentMethod,
      paidAt: nextPaidAt,
      appointmentNotes: input.notes ?? appointment.appointmentNotes,
    });

    const protocolIdsToSync = new Set<string>();
    if (appointment.protocolId) {
      protocolIdsToSync.add(appointment.protocolId);
    }
    if (nextProtocolId) {
      protocolIdsToSync.add(nextProtocolId);
    }

    await Promise.all(
      Array.from(protocolIdsToSync).map((protocolId) => syncActiveProtocolLifecycle(this.protocolRepo, protocolId)),
    );

    return updatedAppointment;
  }
}
