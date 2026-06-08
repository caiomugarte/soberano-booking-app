// eslint-disable-next-line @typescript-eslint/no-explicit-any
type PrismaClientOrExtended = any;
import type {
  CreateNeuromodulationProtocolData,
  NeuromodulationProtocolRepository,
  ProtocolPaymentEntryData,
  UpdateNeuromodulationProtocolData,
} from '../../../domain/repositories/neuromodulation-protocol.repository.js';
import type {
  NeuromodulationProtocolEntity,
  NeuromodulationProtocolPaymentEntity,
  NeuromodulationProtocolUsageSnapshot,
  NeuromodulationProtocolWithCounters,
  ProtocolPaymentStatus,
} from '../../../domain/entities/neuromodulation-protocol.js';

function mapPayment(raw: any): NeuromodulationProtocolPaymentEntity {
  return {
    id: raw.id,
    tenantId: raw.tenantId,
    protocolId: raw.protocolId,
    amountCents: raw.amountCents,
    paymentMethod: raw.paymentMethod,
    paidAt: raw.paidAt,
    createdAt: raw.createdAt,
    updatedAt: raw.updatedAt,
  };
}

function sortPayments(payments: NeuromodulationProtocolPaymentEntity[]): NeuromodulationProtocolPaymentEntity[] {
  return payments.slice().sort((left, right) => {
    const paidAtDelta = left.paidAt.getTime() - right.paidAt.getTime();
    if (paidAtDelta !== 0) return paidAtDelta;
    return left.createdAt.getTime() - right.createdAt.getTime();
  });
}

function derivePaymentStatus(totalPriceCents: number, paidAmountCents: number): ProtocolPaymentStatus {
  if (paidAmountCents <= 0) return 'pending';
  if (paidAmountCents >= totalPriceCents) return 'paid';
  return 'partial';
}

function mapProtocol(raw: any): NeuromodulationProtocolEntity {
  const payments = sortPayments((raw.payments ?? []).map(mapPayment));
  const paidAmountCents = payments.reduce(
    (sum: number, payment: NeuromodulationProtocolPaymentEntity) => sum + payment.amountCents,
    0,
  );
  const remainingAmountCents = Math.max(raw.totalPriceCents - paidAmountCents, 0);
  const lastPayment = payments.length > 0 ? payments[payments.length - 1] : null;

  return {
    id: raw.id,
    tenantId: raw.tenantId,
    providerId: raw.providerId,
    customerId: raw.customerId,
    totalSessions: raw.totalSessions,
    status: raw.status,
    totalPriceCents: raw.totalPriceCents,
    paymentStatus: derivePaymentStatus(raw.totalPriceCents, paidAmountCents),
    paidAmountCents,
    remainingAmountCents,
    lastPaymentAt: lastPayment?.paidAt ?? null,
    payments,
    manualConsumedCount: raw.manualConsumedCount,
    notes: raw.notes ?? null,
    createdAt: raw.createdAt,
    updatedAt: raw.updatedAt,
  };
}

function mapWithCounters(raw: any): NeuromodulationProtocolWithCounters {
  const reservedSessions = raw.appointments.filter(
    (appointment: { protocolCreditOutcome: string | null }) => appointment.protocolCreditOutcome === 'reserved',
  ).length;
  const consumedSessions =
    raw.appointments.filter(
      (appointment: { protocolCreditOutcome: string | null }) => appointment.protocolCreditOutcome === 'consumed',
    ).length + raw.manualConsumedCount;

  return {
    ...mapProtocol(raw),
    reservedSessions,
    consumedSessions,
    remainingSessions: Math.max(raw.totalSessions - reservedSessions - consumedSessions, 0),
  };
}

export class PrismaNeuromodulationProtocolRepository implements NeuromodulationProtocolRepository {
  constructor(private readonly db: PrismaClientOrExtended) {}

  async create(data: CreateNeuromodulationProtocolData): Promise<NeuromodulationProtocolEntity> {
    const created = await this.db.neuromodulationProtocol.create({
      data: {
        tenantId: data.tenantId,
        providerId: data.providerId,
        customerId: data.customerId,
        totalSessions: data.totalSessions,
        totalPriceCents: data.totalPriceCents,
        status: data.status ?? 'active',
        notes: data.notes ?? null,
        ...(data.initialPayment
          ? {
              payments: {
                create: {
                  tenantId: data.tenantId,
                  amountCents: data.initialPayment.amountCents,
                  paymentMethod: data.initialPayment.paymentMethod,
                  paidAt: data.initialPayment.paidAt,
                },
              },
            }
          : {}),
      },
      include: {
        payments: {
          orderBy: [{ paidAt: 'asc' }, { createdAt: 'asc' }],
        },
      },
    });

    return mapProtocol(created);
  }

  async addPayment(
    protocolId: string,
    tenantId: string,
    data: ProtocolPaymentEntryData,
  ): Promise<NeuromodulationProtocolPaymentEntity> {
    const created = await this.db.neuromodulationProtocolPayment.create({
      data: {
        tenantId,
        protocolId,
        amountCents: data.amountCents,
        paymentMethod: data.paymentMethod,
        paidAt: data.paidAt,
      },
    });

    return mapPayment(created);
  }

  async updatePayment(paymentId: string, data: ProtocolPaymentEntryData): Promise<NeuromodulationProtocolPaymentEntity> {
    const updated = await this.db.neuromodulationProtocolPayment.update({
      where: { id: paymentId },
      data: {
        amountCents: data.amountCents,
        paymentMethod: data.paymentMethod,
        paidAt: data.paidAt,
      },
    });

    return mapPayment(updated);
  }

  async findById(id: string): Promise<NeuromodulationProtocolEntity | null> {
    const found = await this.db.neuromodulationProtocol.findUnique({
      where: { id },
      include: {
        payments: {
          orderBy: [{ paidAt: 'asc' }, { createdAt: 'asc' }],
        },
      },
    });

    return found ? mapProtocol(found) : null;
  }

  async findWithCountersById(id: string): Promise<NeuromodulationProtocolWithCounters | null> {
    const found = await this.db.neuromodulationProtocol.findUnique({
      where: { id },
      include: {
        appointments: {
          select: {
            id: true,
            protocolCreditOutcome: true,
          },
        },
        payments: {
          orderBy: [{ paidAt: 'asc' }, { createdAt: 'asc' }],
        },
      },
    });

    return found ? mapWithCounters(found) : null;
  }

  async findByCustomerId(customerId: string): Promise<NeuromodulationProtocolWithCounters[]> {
    const protocols = await this.db.neuromodulationProtocol.findMany({
      where: { customerId },
      include: {
        appointments: {
          select: {
            id: true,
            protocolCreditOutcome: true,
          },
        },
        payments: {
          orderBy: [{ paidAt: 'asc' }, { createdAt: 'asc' }],
        },
      },
      orderBy: [{ createdAt: 'desc' }],
    });

    return protocols.map(mapWithCounters);
  }

  async findCurrentByCustomerId(customerId: string): Promise<NeuromodulationProtocolEntity | null> {
    const found = await this.db.neuromodulationProtocol.findFirst({
      where: {
        customerId,
        status: {
          in: ['active', 'maintenance'],
        },
      },
      include: {
        payments: {
          orderBy: [{ paidAt: 'asc' }, { createdAt: 'asc' }],
        },
      },
      orderBy: [{ createdAt: 'desc' }],
    });

    return found ? mapProtocol(found) : null;
  }

  async update(id: string, data: UpdateNeuromodulationProtocolData): Promise<NeuromodulationProtocolEntity> {
    const updated = await this.db.neuromodulationProtocol.update({
      where: { id },
      data: {
        ...(data.totalSessions !== undefined ? { totalSessions: data.totalSessions } : {}),
        ...(data.totalPriceCents !== undefined ? { totalPriceCents: data.totalPriceCents } : {}),
        ...(data.status !== undefined ? { status: data.status } : {}),
        ...(data.manualConsumedCount !== undefined ? { manualConsumedCount: data.manualConsumedCount } : {}),
        ...(data.notes !== undefined ? { notes: data.notes } : {}),
      },
      include: {
        payments: {
          orderBy: [{ paidAt: 'asc' }, { createdAt: 'asc' }],
        },
      },
    });

    return mapProtocol(updated);
  }

  async getUsageSnapshot(protocolId: string, excludeAppointmentId?: string): Promise<NeuromodulationProtocolUsageSnapshot> {
    const found = await this.db.neuromodulationProtocol.findUnique({
      where: { id: protocolId },
      include: {
        appointments: {
          where: excludeAppointmentId
            ? { id: { not: excludeAppointmentId } }
            : undefined,
          select: {
            id: true,
            protocolCreditOutcome: true,
          },
        },
      },
    });

    if (!found) {
      return {
        reservedSessions: 0,
        consumedSessions: 0,
        remainingSessions: 0,
      };
    }

    const mapped = mapWithCounters(found);
    return {
      reservedSessions: mapped.reservedSessions,
      consumedSessions: mapped.consumedSessions,
      remainingSessions: mapped.remainingSessions,
    };
  }

  async countLinkedAppointments(protocolId: string): Promise<number> {
    return this.db.appointment.count({
      where: { protocolId },
    });
  }

  async deleteById(id: string): Promise<void> {
    await this.db.neuromodulationProtocol.delete({
      where: { id },
    });
  }
}
