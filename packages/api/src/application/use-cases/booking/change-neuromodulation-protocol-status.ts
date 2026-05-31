import type { NeuromodulationProtocolRepository } from '../../../domain/repositories/neuromodulation-protocol.repository.js';
import type { NeuromodulationProtocolStatus, NeuromodulationProtocolWithCounters } from '../../../domain/entities/neuromodulation-protocol.js';
import { NotFoundError } from '../../../shared/errors.js';
import {
  assertAllowedStatusTransition,
  assertCurrentProtocolAvailability,
} from './neuromodulation-protocol.utils.js';

export interface ChangeNeuromodulationProtocolStatusInput {
  protocolId: string;
  status: NeuromodulationProtocolStatus;
}

export class ChangeNeuromodulationProtocolStatusUseCase {
  constructor(private readonly protocolRepo: NeuromodulationProtocolRepository) {}

  async execute(input: ChangeNeuromodulationProtocolStatusInput): Promise<NeuromodulationProtocolWithCounters> {
    const protocol = await this.protocolRepo.findById(input.protocolId);
    if (!protocol) {
      throw new NotFoundError('Protocolo');
    }

    assertAllowedStatusTransition(protocol.status, input.status);

    if (input.status === 'active' || input.status === 'maintenance') {
      const existingCurrentProtocol = await this.protocolRepo.findCurrentByCustomerId(protocol.customerId);
      assertCurrentProtocolAvailability(existingCurrentProtocol, protocol.id);
    }

    await this.protocolRepo.update(protocol.id, {
      status: input.status,
    });

    return (await this.protocolRepo.findWithCountersById(protocol.id))!;
  }
}
