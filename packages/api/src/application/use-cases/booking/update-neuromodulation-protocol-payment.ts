import type { NeuromodulationProtocolRepository } from '../../../domain/repositories/neuromodulation-protocol.repository.js';
import type {
  NeuromodulationProtocolWithCounters,
  ProtocolPaymentMethod,
} from '../../../domain/entities/neuromodulation-protocol.js';
import { NotFoundError, ValidationError } from '../../../shared/errors.js';
import { assertPaymentEntry } from './neuromodulation-protocol.utils.js';

export interface UpdateNeuromodulationProtocolPaymentInput {
  protocolId: string;
  paymentId: string;
  amountCents: number;
  paymentMethod: ProtocolPaymentMethod;
  paidAt: Date;
}

export class UpdateNeuromodulationProtocolPaymentUseCase {
  constructor(private readonly protocolRepo: NeuromodulationProtocolRepository) {}

  async execute(input: UpdateNeuromodulationProtocolPaymentInput): Promise<NeuromodulationProtocolWithCounters> {
    const protocol = await this.protocolRepo.findById(input.protocolId);
    if (!protocol) {
      throw new NotFoundError('Protocolo');
    }

    const payment = protocol.payments.find((entry) => entry.id === input.paymentId);
    if (!payment) {
      throw new NotFoundError('Pagamento do protocolo');
    }

    assertPaymentEntry({
      amountCents: input.amountCents,
      paymentMethod: input.paymentMethod,
      paidAt: input.paidAt,
    });

    const nextPaidAmountCents = protocol.paidAmountCents - payment.amountCents + input.amountCents;
    if (nextPaidAmountCents > protocol.totalPriceCents) {
      throw new ValidationError('O pagamento excede o saldo restante do protocolo.');
    }

    await this.protocolRepo.updatePayment(payment.id, {
      amountCents: input.amountCents,
      paymentMethod: input.paymentMethod,
      paidAt: input.paidAt,
    });

    return (await this.protocolRepo.findWithCountersById(protocol.id))!;
  }
}
