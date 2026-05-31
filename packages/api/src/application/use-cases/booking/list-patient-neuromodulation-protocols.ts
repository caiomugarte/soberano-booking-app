import type { NeuromodulationProtocolRepository } from '../../../domain/repositories/neuromodulation-protocol.repository.js';
import type { NeuromodulationProtocolWithCounters } from '../../../domain/entities/neuromodulation-protocol.js';
import { protocolStatusWeight } from './neuromodulation-protocol.utils.js';

export class ListPatientNeuromodulationProtocolsUseCase {
  constructor(private readonly protocolRepo: NeuromodulationProtocolRepository) {}

  async execute(customerId: string): Promise<NeuromodulationProtocolWithCounters[]> {
    const protocols = await this.protocolRepo.findByCustomerId(customerId);

    return protocols.slice().sort((left, right) => {
      const statusDelta = protocolStatusWeight(left.status) - protocolStatusWeight(right.status);
      if (statusDelta !== 0) return statusDelta;
      return right.createdAt.getTime() - left.createdAt.getTime();
    });
  }
}
