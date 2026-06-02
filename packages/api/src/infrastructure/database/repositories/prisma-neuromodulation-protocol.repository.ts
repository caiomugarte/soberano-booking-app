// eslint-disable-next-line @typescript-eslint/no-explicit-any
type PrismaClientOrExtended = any;
import type {
  CreateNeuromodulationProtocolData,
  NeuromodulationProtocolRepository,
  UpdateNeuromodulationProtocolData,
} from '../../../domain/repositories/neuromodulation-protocol.repository.js';
import type {
  NeuromodulationProtocolEntity,
  NeuromodulationProtocolUsageSnapshot,
  NeuromodulationProtocolWithCounters,
} from '../../../domain/entities/neuromodulation-protocol.js';

function mapProtocol(raw: any): NeuromodulationProtocolEntity {
  return {
    id: raw.id,
    tenantId: raw.tenantId,
    providerId: raw.providerId,
    customerId: raw.customerId,
    totalSessions: raw.totalSessions,
    status: raw.status,
    totalPriceCents: raw.totalPriceCents,
    paymentStatus: raw.paymentStatus,
    paymentMethod: raw.paymentMethod,
    paidAt: raw.paidAt,
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
        paymentStatus: data.paymentStatus ?? 'pending',
        paymentMethod: data.paymentMethod ?? null,
        paidAt: data.paidAt ?? null,
        notes: data.notes ?? null,
      },
    });

    return mapProtocol(created);
  }

  async findById(id: string): Promise<NeuromodulationProtocolEntity | null> {
    const found = await this.db.neuromodulationProtocol.findUnique({
      where: { id },
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
        ...(data.paymentStatus !== undefined ? { paymentStatus: data.paymentStatus } : {}),
        ...(data.paymentMethod !== undefined ? { paymentMethod: data.paymentMethod } : {}),
        ...(data.paidAt !== undefined ? { paidAt: data.paidAt } : {}),
        ...(data.manualConsumedCount !== undefined ? { manualConsumedCount: data.manualConsumedCount } : {}),
        ...(data.notes !== undefined ? { notes: data.notes } : {}),
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
