import type { CustomerEntity } from '../../../domain/entities/customer.js';
import type {
  NeuromodulationProtocolEntity,
  NeuromodulationProtocolStatus,
  ProtocolPaymentMethod,
} from '../../../domain/entities/neuromodulation-protocol.js';
import { ValidationError } from '../../../shared/errors.js';

export function assertNeuromodulationPatient(patient: CustomerEntity | null): asserts patient is CustomerEntity {
  if (!patient) {
    throw new ValidationError('Paciente não encontrado.');
  }

  if (!patient.neuromodulationEligible) {
    throw new ValidationError('Apenas pacientes elegíveis para neuromodulação podem receber protocolos.');
  }
}

function toSaoPauloDateString(date: Date): string {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Sao_Paulo',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(date);

  const year = parts.find((part) => part.type === 'year')?.value ?? '0000';
  const month = parts.find((part) => part.type === 'month')?.value ?? '00';
  const day = parts.find((part) => part.type === 'day')?.value ?? '00';

  return `${year}-${month}-${day}`;
}

export function assertPaymentEntry(input: {
  amountCents: number;
  paymentMethod?: ProtocolPaymentMethod | null;
  paidAt?: Date | null;
}): void {
  if (input.amountCents <= 0) {
    throw new ValidationError('O valor do pagamento deve ser maior que zero.');
  }

  if (!input.paymentMethod) {
    throw new ValidationError('Selecione a forma de pagamento do protocolo.');
  }

  if (!input.paidAt) {
    throw new ValidationError('Informe a data do pagamento do protocolo.');
  }

  if (toSaoPauloDateString(input.paidAt) > toSaoPauloDateString(new Date())) {
    throw new ValidationError('A data do pagamento não pode estar no futuro.');
  }
}

export function assertPaymentFitsProtocolBalance(protocol: Pick<NeuromodulationProtocolEntity, 'paidAmountCents' | 'totalPriceCents'>, amountCents: number): void {
  if (protocol.paidAmountCents + amountCents > protocol.totalPriceCents) {
    throw new ValidationError('O pagamento excede o saldo restante do protocolo.');
  }
}

export function assertProtocolPriceAtLeastPaid(totalPriceCents: number, paidAmountCents: number): void {
  if (totalPriceCents < paidAmountCents) {
    throw new ValidationError('O valor do protocolo não pode ficar abaixo do total já recebido.');
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
