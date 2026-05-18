import type { NeuromodulationProtocolRepository } from '../../../domain/repositories/neuromodulation-protocol.repository.js';
import type { NeuromodulationProtocolWithCounters } from '../../../domain/entities/neuromodulation-protocol.js';
import { NotFoundError } from '../../../shared/errors.js';

export class GetNeuromodulationProtocolUseCase {
  constructor(private readonly protocolRepo: NeuromodulationProtocolRepository) {}

  async execute(protocolId: string): Promise<NeuromodulationProtocolWithCounters> {
    const protocol = await this.protocolRepo.findWithCountersById(protocolId);
    if (!protocol) {
      throw new NotFoundError('Protocolo');
    }

    return protocol;
  }
}
