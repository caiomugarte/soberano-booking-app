import type { CustomerRepository } from '../../../domain/repositories/customer.repository.js';
import type { NeuromodulationProtocolRepository } from '../../../domain/repositories/neuromodulation-protocol.repository.js';
import type {
  NeuromodulationProtocolStatus,
  NeuromodulationProtocolWithCounters,
  ProtocolPaymentMethod,
} from '../../../domain/entities/neuromodulation-protocol.js';
import { ValidationError } from '../../../shared/errors.js';
import {
  assertCurrentProtocolAvailability,
  assertNeuromodulationPatient,
  assertPaymentEntry,
} from './neuromodulation-protocol.utils.js';

export interface CreateNeuromodulationProtocolInput {
  tenantId: string;
  providerId: string;
  customerId: string;
  totalSessions: number;
  totalPriceCents: number;
  status?: NeuromodulationProtocolStatus;
  initialPayment?: {
    amountCents: number;
    paymentMethod: ProtocolPaymentMethod;
    paidAt: Date;
  };
  notes?: string | null;
}

export class CreateNeuromodulationProtocolUseCase {
  constructor(
    private readonly customerRepo: CustomerRepository,
    private readonly protocolRepo: NeuromodulationProtocolRepository,
  ) {}

  async execute(input: CreateNeuromodulationProtocolInput): Promise<NeuromodulationProtocolWithCounters> {
    if (input.totalSessions < 1) {
      throw new ValidationError('O protocolo deve ter pelo menos 1 sessão.');
    }

    if (input.totalPriceCents < 0) {
      throw new ValidationError('O valor do protocolo não pode ser negativo.');
    }

    const patient = await this.customerRepo.findById(input.customerId);
    assertNeuromodulationPatient(patient);

    const existingCurrentProtocol = await this.protocolRepo.findCurrentByCustomerId(input.customerId);
    assertCurrentProtocolAvailability(existingCurrentProtocol);

    if (input.initialPayment) {
      assertPaymentEntry(input.initialPayment);
      if (input.initialPayment.amountCents > input.totalPriceCents) {
        throw new ValidationError('O pagamento excede o saldo restante do protocolo.');
      }
    }

    const created = await this.protocolRepo.create({
      tenantId: input.tenantId,
      providerId: input.providerId,
      customerId: input.customerId,
      totalSessions: input.totalSessions,
      totalPriceCents: input.totalPriceCents,
      status: input.status ?? 'active',
      initialPayment: input.initialPayment,
      notes: input.notes ?? null,
    });

    return (await this.protocolRepo.findWithCountersById(created.id))!;
  }
}
