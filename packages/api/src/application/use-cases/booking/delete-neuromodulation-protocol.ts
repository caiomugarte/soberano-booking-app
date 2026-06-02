import type { NeuromodulationProtocolRepository } from '../../../domain/repositories/neuromodulation-protocol.repository.js';
import { NotFoundError, ValidationError } from '../../../shared/errors.js';

export interface DeleteNeuromodulationProtocolInput {
  protocolId: string;
  providerId: string;
}

export class DeleteNeuromodulationProtocolUseCase {
  constructor(private readonly protocolRepo: NeuromodulationProtocolRepository) {}

  async execute(input: DeleteNeuromodulationProtocolInput): Promise<void> {
    const protocol = await this.protocolRepo.findById(input.protocolId);
    if (!protocol || protocol.providerId !== input.providerId) {
      throw new NotFoundError('Protocolo');
    }

    if (protocol.status !== 'finished') {
      throw new ValidationError('Somente protocolos finalizados podem ser excluídos.');
    }

    const linkedAppointmentsCount = await this.protocolRepo.countLinkedAppointments(protocol.id);
    if (linkedAppointmentsCount > 0) {
      throw new ValidationError('Este protocolo não pode ser excluído porque possui sessões vinculadas.');
    }

    await this.protocolRepo.deleteById(protocol.id);
  }
}
