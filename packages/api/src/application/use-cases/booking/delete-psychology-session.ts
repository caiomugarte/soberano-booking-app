import type { AppointmentRepository } from '../../../domain/repositories/appointment.repository.js';
import type { NeuromodulationProtocolRepository } from '../../../domain/repositories/neuromodulation-protocol.repository.js';
import { NotFoundError, ValidationError } from '../../../shared/errors.js';
import type { ProtocolCreditAction } from './psychology-session.utils.js';
import { syncActiveProtocolLifecycle } from './psychology-session.utils.js';

export interface DeletePsychologySessionInput {
  appointmentId: string;
  providerId: string;
  protocolCreditAction?: ProtocolCreditAction;
}

export class DeletePsychologySessionUseCase {
  constructor(
    private readonly appointmentRepo: AppointmentRepository,
    private readonly protocolRepo: NeuromodulationProtocolRepository,
  ) {}

  async execute(input: DeletePsychologySessionInput): Promise<void> {
    const appointment = await this.appointmentRepo.findById(input.appointmentId);
    if (!appointment || appointment.barberId !== input.providerId) {
      throw new NotFoundError('Sessão');
    }

    if (!appointment.protocolId || !appointment.protocolCreditOutcome) {
      await this.appointmentRepo.deleteById(appointment.id);
      return;
    }

    const protocol = await this.protocolRepo.findById(appointment.protocolId);

    if (appointment.protocolCreditOutcome === 'reserved') {
      if (!input.protocolCreditAction) {
        throw new ValidationError('Escolha se o crédito reservado deve ser liberado ou consumido antes de excluir.');
      }

      if (input.protocolCreditAction === 'consume' && protocol) {
        await this.protocolRepo.update(protocol.id, {
          manualConsumedCount: protocol.manualConsumedCount + 1,
        });
      }
    }

    if (appointment.protocolCreditOutcome === 'consumed' && protocol) {
      await this.protocolRepo.update(protocol.id, {
        manualConsumedCount: protocol.manualConsumedCount + 1,
      });
    }

    await this.appointmentRepo.deleteById(appointment.id);
    await syncActiveProtocolLifecycle(this.protocolRepo, appointment.protocolId);
  }
}
