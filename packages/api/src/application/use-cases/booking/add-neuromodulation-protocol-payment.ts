import type { NeuromodulationProtocolRepository } from '../../../domain/repositories/neuromodulation-protocol.repository.js';
import type {
  NeuromodulationProtocolWithCounters,
  ProtocolPaymentMethod,
} from '../../../domain/entities/neuromodulation-protocol.js';
import { NotFoundError } from '../../../shared/errors.js';
import {
  assertPaymentEntry,
  assertPaymentFitsProtocolBalance,
} from './neuromodulation-protocol.utils.js';

export interface AddNeuromodulationProtocolPaymentInput {
  tenantId: string;
  protocolId: string;
  amountCents: number;
  paymentMethod: ProtocolPaymentMethod;
  paidAt: Date;
}

export class AddNeuromodulationProtocolPaymentUseCase {
  constructor(private readonly protocolRepo: NeuromodulationProtocolRepository) {}

  async execute(input: AddNeuromodulationProtocolPaymentInput): Promise<NeuromodulationProtocolWithCounters> {
    const protocol = await this.protocolRepo.findById(input.protocolId);
    if (!protocol) {
      throw new NotFoundError('Protocolo');
    }

    assertPaymentEntry({
      amountCents: input.amountCents,
      paymentMethod: input.paymentMethod,
      paidAt: input.paidAt,
    });
    assertPaymentFitsProtocolBalance(protocol, input.amountCents);

    await this.protocolRepo.addPayment(protocol.id, input.tenantId, {
      amountCents: input.amountCents,
      paymentMethod: input.paymentMethod,
      paidAt: input.paidAt,
    });

    return (await this.protocolRepo.findWithCountersById(protocol.id))!;
  }
}
