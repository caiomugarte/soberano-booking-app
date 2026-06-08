import type { CustomerRepository } from '../../../domain/repositories/customer.repository.js';
import type { NeuromodulationProtocolRepository } from '../../../domain/repositories/neuromodulation-protocol.repository.js';
import type {
  NeuromodulationProtocolStatus,
  NeuromodulationProtocolWithCounters,
} from '../../../domain/entities/neuromodulation-protocol.js';
import { NotFoundError, ValidationError } from '../../../shared/errors.js';
import {
  assertCurrentProtocolAvailability,
  assertNeuromodulationPatient,
  assertAllowedStatusTransition,
  assertProtocolPriceAtLeastPaid,
} from './neuromodulation-protocol.utils.js';

export interface UpdateNeuromodulationProtocolInput {
  protocolId: string;
  totalSessions?: number;
  totalPriceCents?: number;
  status?: NeuromodulationProtocolStatus;
  notes?: string | null;
}

export class UpdateNeuromodulationProtocolUseCase {
  constructor(
    private readonly customerRepo: CustomerRepository,
    private readonly protocolRepo: NeuromodulationProtocolRepository,
  ) {}

  async execute(input: UpdateNeuromodulationProtocolInput): Promise<NeuromodulationProtocolWithCounters> {
    const protocol = await this.protocolRepo.findById(input.protocolId);
    if (!protocol) {
      throw new NotFoundError('Protocolo');
    }

    const patient = await this.customerRepo.findById(protocol.customerId);
    assertNeuromodulationPatient(patient);

    const currentUsage = await this.protocolRepo.getUsageSnapshot(protocol.id);
    const nextTotalSessions = input.totalSessions ?? protocol.totalSessions;
    if (nextTotalSessions < currentUsage.consumedSessions) {
      throw new ValidationError('O total de sessões não pode ficar abaixo das sessões já consumidas.');
    }

    if (nextTotalSessions < currentUsage.consumedSessions + currentUsage.reservedSessions) {
      throw new ValidationError('O total de sessões não pode ficar abaixo das sessões já consumidas ou reservadas.');
    }

    const nextStatus = input.status ?? protocol.status;
    assertAllowedStatusTransition(protocol.status, nextStatus);

    if (nextStatus === 'active' || nextStatus === 'maintenance') {
      const existingCurrentProtocol = await this.protocolRepo.findCurrentByCustomerId(protocol.customerId);
      assertCurrentProtocolAvailability(existingCurrentProtocol, protocol.id);
    }

    const nextTotalPriceCents = input.totalPriceCents ?? protocol.totalPriceCents;
    assertProtocolPriceAtLeastPaid(nextTotalPriceCents, protocol.paidAmountCents);

    await this.protocolRepo.update(protocol.id, {
      totalSessions: nextTotalSessions,
      totalPriceCents: nextTotalPriceCents,
      status: nextStatus,
      notes: input.notes !== undefined ? input.notes : protocol.notes,
    });

    return (await this.protocolRepo.findWithCountersById(protocol.id))!;
  }
}
