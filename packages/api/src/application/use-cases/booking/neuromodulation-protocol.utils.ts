import type { CustomerEntity } from '../../../domain/entities/customer.js';
import type {
  NeuromodulationProtocolEntity,
  NeuromodulationProtocolStatus,
  ProtocolPaymentMethod,
  ProtocolPaymentStatus,
} from '../../../domain/entities/neuromodulation-protocol.js';
import { ValidationError } from '../../../shared/errors.js';

export function assertNeuromodulationPatient(patient: CustomerEntity | null): asserts patient is CustomerEntity {
  if (!patient) {
    throw new ValidationError('Paciente não encontrado.');
  }

  if (patient.careMode !== 'neuromodulation') {
    throw new ValidationError('Apenas pacientes de neuromodulação podem receber protocolos.');
  }
}

export function assertPaymentState(input: {
  paymentStatus: ProtocolPaymentStatus;
  paymentMethod?: ProtocolPaymentMethod | null;
  paidAt?: Date | null;
}): void {
  if (input.paymentStatus === 'paid' && !input.paymentMethod) {
    throw new ValidationError('Selecione a forma de pagamento do protocolo.');
  }

  if (input.paymentStatus === 'pending' && input.paidAt) {
    throw new ValidationError('O protocolo pendente não pode ter data de pagamento.');
  }
}

export function assertCurrentProtocolAvailability(
  existingProtocol: NeuromodulationProtocolEntity | null,
  currentProtocolId?: string,
): void {
  if (existingProtocol && existingProtocol.id !== currentProtocolId) {
    throw new ValidationError('O paciente já possui um protocolo ativo ou em manutenção.');
  }
}

export function assertAllowedStatusTransition(
  currentStatus: NeuromodulationProtocolStatus,
  nextStatus: NeuromodulationProtocolStatus,
): void {
  if (currentStatus === 'finished' && nextStatus !== 'finished') {
    throw new ValidationError('Protocolos finalizados devem permanecer no histórico. Crie um novo protocolo para retomar o cuidado.');
  }
}

export function protocolStatusWeight(status: NeuromodulationProtocolStatus): number {
  if (status === 'active') return 0;
  if (status === 'maintenance') return 1;
  return 2;
}
