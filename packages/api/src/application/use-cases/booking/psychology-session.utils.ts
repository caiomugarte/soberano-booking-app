import type {
  AppointmentProtocolCreditOutcome,
  AppointmentWithDetails,
} from '../../../domain/entities/appointment.js';
import type { CustomerEntity } from '../../../domain/entities/customer.js';
import type {
  NeuromodulationProtocolEntity,
  NeuromodulationProtocolUsageSnapshot,
} from '../../../domain/entities/neuromodulation-protocol.js';
import type { ServiceEntity } from '../../../domain/entities/service.js';
import { ValidationError } from '../../../shared/errors.js';
import { addMinutes, parseDateOnly } from './recurring-series.utils.js';

export type PsychologySessionType = 'psychotherapy' | 'neuromodulation';
export type ProtocolCreditAction = 'release' | 'consume';

const LEGACY_PSYCHOTHERAPY_SERVICE_SLUGS = new Set([
  'individual',
  'couple',
  'family',
  'casal',
  'familiar',
  'psychotherapy',
]);

export function normalizePsychologySessionType(serviceSlug: string): PsychologySessionType {
  if (LEGACY_PSYCHOTHERAPY_SERVICE_SLUGS.has(serviceSlug)) {
    return 'psychotherapy';
  }

  return 'neuromodulation';
}

export function resolvePsychologySessionPrice(input: {
  patient: CustomerEntity;
  type: PsychologySessionType;
  explicitValueCents?: number;
  fallbackValueCents?: number;
  service: ServiceEntity;
}): number {
  if (input.explicitValueCents !== undefined) {
    return input.explicitValueCents;
  }

  if (input.type === 'psychotherapy') {
    if (input.patient.psychotherapyPriceCents) {
      return input.patient.psychotherapyPriceCents;
    }

    if (input.fallbackValueCents !== undefined) {
      return input.fallbackValueCents;
    }

    throw new ValidationError('Este paciente de psicoterapia precisa de um valor de sessão informado ou de um acordo salvo no cadastro.');
  }

  return input.service.priceCents;
}

export function assertSessionMatchesCareMode(patient: CustomerEntity, type: PsychologySessionType): void {
  if (patient.careMode !== type) {
    throw new ValidationError('A sessão deve seguir o modo de cuidado atual do paciente.');
  }
}

export function assertPaymentInput(input: {
  paymentStatus: 'pending' | 'paid';
  paymentMethod?: 'card' | 'pix' | 'cash' | null;
  paidAt?: Date | null;
}): void {
  if (input.paymentStatus === 'paid' && !input.paymentMethod) {
    throw new ValidationError('Selecione a forma de pagamento.');
  }

  if (input.paymentStatus === 'pending' && input.paidAt) {
    throw new ValidationError('Sessões pendentes não podem ter data de pagamento.');
  }
}

export function assertNoScheduleConflict(params: {
  appointments: AppointmentWithDetails[];
  appointmentId?: string;
  date: string;
  startTime: string;
  endTime: string;
}): void {
  const nextDate = parseDateOnly(params.date).getTime();
  const hasConflict = params.appointments.some((appointment) => {
    if (appointment.id === params.appointmentId) return false;
    if (appointment.status === 'cancelled') return false;
    if (appointment.date.getTime() !== nextDate) return false;
    return appointment.startTime < params.endTime && appointment.endTime > params.startTime;
  });

  if (hasConflict) {
    throw new ValidationError('Já existe uma sessão neste horário.');
  }
}

export function buildEndTime(startTime: string, service: ServiceEntity): string {
  return addMinutes(startTime, service.duration);
}

export function resolveProtocolOutcome(params: {
  currentProtocolId: string | null;
  currentOutcome: AppointmentProtocolCreditOutcome | null;
  currentStatus: string;
  nextProtocol: NeuromodulationProtocolEntity | null;
  nextStatus: string;
  action?: ProtocolCreditAction;
}): AppointmentProtocolCreditOutcome | null {
  if (!params.nextProtocol) {
    return null;
  }

  if (params.nextProtocol.status === 'maintenance') {
    return 'maintenance';
  }

  if (params.nextProtocol.status === 'finished') {
    if (params.currentProtocolId !== params.nextProtocol.id) {
      throw new ValidationError('Protocolos finalizados não podem receber novos vínculos.');
    }

    return params.currentOutcome;
  }

  if (params.nextStatus === 'completed' || params.nextStatus === 'no_show') {
    return 'consumed';
  }

  if (params.nextStatus === 'cancelled') {
    if (!params.action) {
      throw new ValidationError('Escolha se o crédito deve ser liberado ou consumido.');
    }

    return params.action === 'release' ? 'released' : 'consumed';
  }

  return 'reserved';
}

export function assertProtocolCapacity(
  protocol: NeuromodulationProtocolEntity,
  usage: NeuromodulationProtocolUsageSnapshot,
  nextOutcome: AppointmentProtocolCreditOutcome | null,
): void {
  if (protocol.status === 'maintenance' || nextOutcome === null || nextOutcome === 'released' || nextOutcome === 'maintenance') {
    return;
  }

  if (usage.remainingSessions < 1) {
    throw new ValidationError('O protocolo não tem sessões disponíveis. Ajuste o protocolo antes de continuar.');
  }
}
