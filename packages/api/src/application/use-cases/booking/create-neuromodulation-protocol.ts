import type { CustomerRepository } from '../../../domain/repositories/customer.repository.js';
import type { NeuromodulationProtocolRepository } from '../../../domain/repositories/neuromodulation-protocol.repository.js';
import type {
  NeuromodulationProtocolStatus,
  NeuromodulationProtocolWithCounters,
  ProtocolPaymentMethod,
  ProtocolPaymentStatus,
} from '../../../domain/entities/neuromodulation-protocol.js';
import { ValidationError } from '../../../shared/errors.js';
import {
  assertCurrentProtocolAvailability,
  assertNeuromodulationPatient,
  assertPaymentState,
} from './neuromodulation-protocol.utils.js';

export interface CreateNeuromodulationProtocolInput {
  tenantId: string;
  providerId: string;
  customerId: string;
  totalSessions: number;
  totalPriceCents: number;
  status?: NeuromodulationProtocolStatus;
  paymentStatus?: ProtocolPaymentStatus;
  paymentMethod?: ProtocolPaymentMethod | null;
  paidAt?: Date | null;
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

    const paymentStatus = input.paymentStatus ?? 'pending';
    assertPaymentState({
      paymentStatus,
      paymentMethod: input.paymentMethod ?? null,
      paidAt: input.paidAt ?? null,
    });

    const created = await this.protocolRepo.create({
      tenantId: input.tenantId,
      providerId: input.providerId,
      customerId: input.customerId,
      totalSessions: input.totalSessions,
      totalPriceCents: input.totalPriceCents,
      status: input.status ?? 'active',
      paymentStatus,
      paymentMethod: paymentStatus === 'paid' ? input.paymentMethod ?? null : null,
      paidAt: paymentStatus === 'paid' ? input.paidAt ?? new Date() : null,
      notes: input.notes ?? null,
    });

    return (await this.protocolRepo.findWithCountersById(created.id))!;
  }
}
