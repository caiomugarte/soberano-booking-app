// eslint-disable-next-line @typescript-eslint/no-explicit-any
type PrismaClientOrExtended = any;
import type { AppointmentWithDetails } from '../../../domain/entities/appointment.js';
import type {
  AppointmentRepository,
  CreateAppointmentData,
  DayStat,
  FinancialSummary,
  PatientFinancialSummary,
  PatientHistoryFilters,
} from '../../../domain/repositories/appointment.repository.js';
import type { NeuromodulationProtocolWithCounters } from '../../../domain/entities/neuromodulation-protocol.js';

const LEGACY_PSYCHOTHERAPY_SERVICE_SLUGS = [
  'individual',
  'couple',
  'family',
  'casal',
  'familiar',
  'psychotherapy',
] as const;

const includeRelations = {
  provider: {
    select: {
      id: true,
      slug: true,
      firstName: true,
      lastName: true,
      phone: true,
      avatarUrl: true,
      isActive: true,
    },
  },
  service: true,
  customer: true,
  protocol: {
    select: {
      id: true,
      status: true,
      totalSessions: true,
    },
  },
  recurringSeries: true,
  package: {
    select: {
      totalUses: true,
      totalPriceCents: true,
      appointments: {
        select: { id: true, createdAt: true },
        orderBy: { createdAt: 'asc' },
      },
    },
  },
} as const;

// Maps Prisma result (provider/providerId) → domain entity (barber/barberId)
function mapAppointment(raw: any): AppointmentWithDetails {
  const { provider, providerId, package: pkg, ...rest } = raw;
  let mappedPackage = null;
  if (pkg) {
    const rank = (pkg.appointments as { id: string }[]).findIndex((a) => a.id === raw.id) + 1;
    mappedPackage = { appointmentNumber: rank, totalUses: pkg.totalUses, totalPriceCents: pkg.totalPriceCents };
  }
  return {
    ...rest,
    barberId: providerId,
    barber: provider,
    package: mappedPackage,
  } as AppointmentWithDetails;
}

export class PrismaAppointmentRepository implements AppointmentRepository {
  constructor(private db: PrismaClientOrExtended) {}

  async create(data: CreateAppointmentData): Promise<AppointmentWithDetails> {
    const { barberId, tenantId, ...rest } = data as any;
    const raw = await this.db.appointment.create({
      data: { ...rest, providerId: barberId, tenantId },
      include: includeRelations,
    });
    return mapAppointment(raw);
  }

  async findByCancelToken(token: string): Promise<AppointmentWithDetails | null> {
    const raw = await this.db.appointment.findUnique({
      where: { cancelToken: token },
      include: includeRelations,
    });
    return raw ? mapAppointment(raw) : null;
  }

  async findById(id: string): Promise<AppointmentWithDetails | null> {
    const raw = await this.db.appointment.findUnique({
      where: { id },
      include: includeRelations,
    });
    return raw ? mapAppointment(raw) : null;
  }

  async findBookedSlots(barberId: string, date: Date, excludeId?: string): Promise<string[]> {
    const appointments = await this.db.appointment.findMany({
      where: {
        providerId: barberId,
        date,
        status: { not: 'cancelled' },
        ...(excludeId ? { NOT: { id: excludeId } } : {}),
      },
      select: { startTime: true },
    });
    return appointments.map((a: { startTime: string }) => a.startTime);
  }

  async findByBarberAndDate(
    barberId: string,
    date: Date,
  ): Promise<{ appointments: AppointmentWithDetails[]; total: number; summary: { confirmed: number; completed: number; revenueCents: number } }> {
    const where = { providerId: barberId, date };
    const [appointments, confirmedCount, completedAgg] = await this.db.$transaction([
      this.db.appointment.findMany({
        where,
        include: includeRelations,
        orderBy: { startTime: 'asc' },
      }),
      this.db.appointment.count({ where: { providerId: barberId, date, status: 'confirmed' } }),
      this.db.appointment.aggregate({
        where: { providerId: barberId, date, status: 'completed' },
        _sum: { priceCents: true },
        _count: true,
      }),
    ]);
    return {
      appointments: appointments.map(mapAppointment),
      total: appointments.length,
      summary: {
        confirmed: confirmedCount,
        completed: completedAgg._count,
        revenueCents: completedAgg._sum.priceCents ?? 0,
      },
    };
  }

  async findUpcomingByCustomerPhone(phone: string): Promise<AppointmentWithDetails | null> {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const raw = await this.db.appointment.findFirst({
      where: {
        customer: { phone },
        status: 'confirmed',
        date: { gte: today },
      },
      orderBy: [{ date: 'asc' }, { startTime: 'asc' }],
      include: includeRelations,
    });
    return raw ? mapAppointment(raw) : null;
  }

  async deleteById(id: string): Promise<void> {
    await this.db.appointment.delete({ where: { id } });
  }

  async deleteFutureByRecurringSeriesId(recurringSeriesId: string, from: Date): Promise<number> {
    const result = await this.db.appointment.deleteMany({
      where: {
        recurringSeriesId,
        date: { gte: from },
      },
    });
    return result.count;
  }

  async findUpcomingWithoutReminder(minutesAhead: number): Promise<AppointmentWithDetails[]> {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const currentTime = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
    const futureMinutes = now.getMinutes() + minutesAhead;
    const futureHours = now.getHours() + Math.floor(futureMinutes / 60);
    const maxTime = `${String(futureHours).padStart(2, '0')}:${String(futureMinutes % 60).padStart(2, '0')}`;

    const rows = await this.db.appointment.findMany({
      where: { status: 'confirmed', reminderSent: false, date: today, startTime: { gte: currentTime, lte: maxTime } },
      include: includeRelations,
    });
    return rows.map(mapAppointment);
  }

  async updateStatus(id: string, status: string, cancelledAt?: Date): Promise<void> {
    await this.db.appointment.update({
      where: { id },
      data: { status, ...(cancelledAt && { cancelledAt }) },
    });
  }

  async updateDateTime(
    id: string,
    date: Date,
    startTime: string,
    endTime: string,
    cancelToken: string,
  ): Promise<AppointmentWithDetails> {
    const raw = await this.db.appointment.update({
      where: { id },
      data: { date, startTime, endTime, cancelToken, reminderSent: false, barberReminderSent: false },
      include: includeRelations,
    });
    return mapAppointment(raw);
  }

  async markReminderSent(id: string): Promise<void> {
    await this.db.appointment.update({ where: { id }, data: { reminderSent: true } });
  }

  async findUpcomingWithoutBarberReminder(minutesAhead: number): Promise<AppointmentWithDetails[]> {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const currentTime = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
    const futureMinutes = now.getMinutes() + minutesAhead;
    const futureHours = now.getHours() + Math.floor(futureMinutes / 60);
    const maxTime = `${String(futureHours).padStart(2, '0')}:${String(futureMinutes % 60).padStart(2, '0')}`;

    const rows = await this.db.appointment.findMany({
      where: { status: 'confirmed', barberReminderSent: false, date: today, startTime: { gte: currentTime, lte: maxTime } },
      include: includeRelations,
    });
    return rows.map(mapAppointment);
  }

  async markBarberReminderSent(id: string): Promise<void> {
    await this.db.appointment.update({ where: { id }, data: { barberReminderSent: true } });
  }

  async updateCustomer(id: string, customerId: string): Promise<void> {
    await this.db.appointment.update({ where: { id }, data: { customerId } });
  }

  async updateSchedule(id: string, data: {
    serviceId?: string;
    priceCents?: number;
    date?: Date;
    startTime?: string;
    endTime?: string;
    cancelToken?: string;
    reminderSent?: boolean;
    barberReminderSent?: boolean;
  }): Promise<AppointmentWithDetails> {
    const raw = await this.db.appointment.update({
      where: { id },
      data,
      include: includeRelations,
    });
    return mapAppointment(raw);
  }

  async findByBarberAndDateRange(barberId: string, from: Date, to: Date): Promise<AppointmentWithDetails[]> {
    const rows = await this.db.appointment.findMany({
      where: { providerId: barberId, date: { gte: from, lte: to } },
      include: includeRelations,
      orderBy: [{ date: 'asc' }, { startTime: 'asc' }],
    });
    return rows.map(mapAppointment);
  }

  async findByRecurringSeriesId(
    recurringSeriesId: string,
    from: Date,
    to?: Date,
  ): Promise<AppointmentWithDetails[]> {
    const rows = await this.db.appointment.findMany({
      where: {
        recurringSeriesId,
        date: {
          gte: from,
          ...(to ? { lte: to } : {}),
        },
      },
      include: includeRelations,
      orderBy: [{ date: 'asc' }, { startTime: 'asc' }],
    });
    return rows.map(mapAppointment);
  }

  async updatePaymentStatus(id: string, paidAt: Date): Promise<AppointmentWithDetails> {
    const raw = await this.db.appointment.update({
      where: { id },
      data: { paymentStatus: 'paid', paidAt },
      include: includeRelations,
    });
    return mapAppointment(raw);
  }

  async findPatientHistory(
    providerId: string,
    patientId: string,
    filters: PatientHistoryFilters,
  ): Promise<AppointmentWithDetails[]> {
    const rows = await this.db.appointment.findMany({
      where: {
        providerId,
        customerId: patientId,
        ...(filters.from || filters.to
          ? {
              date: {
                ...(filters.from ? { gte: filters.from } : {}),
                ...(filters.to ? { lte: filters.to } : {}),
              },
            }
          : {}),
        ...(filters.status ? { status: filters.status } : {}),
        ...(filters.paymentStatus ? { paymentStatus: filters.paymentStatus } : {}),
        ...(filters.type === 'psychotherapy'
          ? {
              service: {
                slug: {
                  in: [...LEGACY_PSYCHOTHERAPY_SERVICE_SLUGS],
                },
              },
            }
          : {}),
        ...(filters.type === 'neuromodulation'
          ? {
              service: {
                slug: {
                  notIn: [...LEGACY_PSYCHOTHERAPY_SERVICE_SLUGS],
                },
              },
            }
          : {}),
      },
      include: includeRelations,
      orderBy: [{ date: 'asc' }, { startTime: 'asc' }],
    });

    return rows.map(mapAppointment);
  }

  async getPatientFinancialSummary(
    providerId: string,
    patientId: string,
  ): Promise<PatientFinancialSummary> {
    const [appointmentRows, protocolRows] = await this.db.$transaction([
      this.db.appointment.findMany({
        where: {
          providerId,
          customerId: patientId,
          OR: [
            { protocolId: null },
            { protocolCreditOutcome: 'maintenance' },
          ],
        },
        select: {
          id: true,
          priceCents: true,
          paymentStatus: true,
        },
      }),
      this.db.neuromodulationProtocol.findMany({
        where: {
          providerId,
          customerId: patientId,
        },
        select: {
          id: true,
          totalPriceCents: true,
          paymentStatus: true,
        },
      }),
    ]);

    const sessionPaidRows = appointmentRows.filter((appointment: { paymentStatus: string }) => appointment.paymentStatus === 'paid');
    const sessionPendingRows = appointmentRows.filter((appointment: { paymentStatus: string }) => appointment.paymentStatus !== 'paid');
    const protocolPaidRows = protocolRows.filter((protocol: { paymentStatus: string }) => protocol.paymentStatus === 'paid');
    const protocolPendingRows = protocolRows.filter((protocol: { paymentStatus: string }) => protocol.paymentStatus !== 'paid');

    return {
      sessionReceivables: {
        totalCount: appointmentRows.length,
        paidCount: sessionPaidRows.length,
        pendingCount: sessionPendingRows.length,
        paidTotalCents: sessionPaidRows.reduce((sum: number, appointment: { priceCents: number }) => sum + appointment.priceCents, 0),
        pendingTotalCents: sessionPendingRows.reduce((sum: number, appointment: { priceCents: number }) => sum + appointment.priceCents, 0),
      },
      protocolSales: {
        totalCount: protocolRows.length,
        paidCount: protocolPaidRows.length,
        pendingCount: protocolPendingRows.length,
        paidTotalCents: protocolPaidRows.reduce((sum: number, protocol: { totalPriceCents: number }) => sum + protocol.totalPriceCents, 0),
        pendingTotalCents: protocolPendingRows.reduce((sum: number, protocol: { totalPriceCents: number }) => sum + protocol.totalPriceCents, 0),
      },
    };
  }

  async getFinancialSummary(providerId: string, from: Date, to: Date): Promise<FinancialSummary> {
    const rows = await this.db.appointment.findMany({
      where: {
        providerId,
        OR: [
          {
            paymentStatus: 'paid',
            paidAt: { gte: from, lte: to },
          },
          {
            paymentStatus: 'paid',
            paidAt: null,
            date: { gte: from, lte: to },
          },
          {
            paymentStatus: { not: 'paid' },
            date: { gte: from, lte: to },
          },
        ],
      },
      include: includeRelations,
      orderBy: [{ date: 'asc' }, { startTime: 'asc' }],
    });
    const appointments = rows.map(mapAppointment);
    const billableAppointments = appointments.filter(
      (appointment: AppointmentWithDetails) =>
        !appointment.protocolId || appointment.protocolCreditOutcome === 'maintenance',
    );
    const paidCount = billableAppointments.filter((a: AppointmentWithDetails) => a.paymentStatus === 'paid').length;
    const revenueCents = billableAppointments
      .filter((a: AppointmentWithDetails) => a.paymentStatus === 'paid')
      .reduce((sum: number, a: AppointmentWithDetails) => sum + a.priceCents, 0);
    const protocolRows = await this.db.neuromodulationProtocol.findMany({
      where: {
        providerId,
        OR: [
          {
            paymentStatus: 'paid',
            paidAt: { gte: from, lte: to },
          },
          {
            paymentStatus: { not: 'paid' },
            createdAt: { gte: from, lte: to },
          },
        ],
      },
      include: {
        customer: {
          select: {
            id: true,
            name: true,
            phone: true,
          },
        },
        appointments: {
          select: {
            id: true,
            protocolCreditOutcome: true,
          },
        },
      },
      orderBy: [{ createdAt: 'asc' }],
    });
    const protocolSales = protocolRows.map((protocolRow: any) => {
      const reservedSessions = protocolRow.appointments.filter(
        (appointment: { protocolCreditOutcome: string | null }) => appointment.protocolCreditOutcome === 'reserved',
      ).length;
      const consumedSessions =
        protocolRow.appointments.filter(
          (appointment: { protocolCreditOutcome: string | null }) => appointment.protocolCreditOutcome === 'consumed',
        ).length + protocolRow.manualConsumedCount;
      const protocol = {
        id: protocolRow.id,
        tenantId: protocolRow.tenantId,
        providerId: protocolRow.providerId,
        customerId: protocolRow.customerId,
        totalSessions: protocolRow.totalSessions,
        status: protocolRow.status,
        totalPriceCents: protocolRow.totalPriceCents,
        paymentStatus: protocolRow.paymentStatus,
        paymentMethod: protocolRow.paymentMethod,
        paidAt: protocolRow.paidAt,
        manualConsumedCount: protocolRow.manualConsumedCount,
        notes: protocolRow.notes,
        createdAt: protocolRow.createdAt,
        updatedAt: protocolRow.updatedAt,
        reservedSessions,
        consumedSessions,
        remainingSessions: Math.max(protocolRow.totalSessions - reservedSessions - consumedSessions, 0),
      } satisfies NeuromodulationProtocolWithCounters;

      return {
        protocol,
        customer: protocolRow.customer,
      };
    });
    const protocolRevenueCents = protocolSales
      .filter((entry: { protocol: NeuromodulationProtocolWithCounters }) => entry.protocol.paymentStatus === 'paid')
      .reduce((sum: number, entry: { protocol: NeuromodulationProtocolWithCounters }) => sum + entry.protocol.totalPriceCents, 0);
    const protocolPendingCount = protocolSales.filter(
      (entry: { protocol: NeuromodulationProtocolWithCounters }) => entry.protocol.paymentStatus !== 'paid',
    ).length;
    return {
      totalSessions: billableAppointments.length,
      paidCount: paidCount + protocolSales.filter((entry: { protocol: NeuromodulationProtocolWithCounters }) => entry.protocol.paymentStatus === 'paid').length,
      pendingCount: (billableAppointments.length - paidCount) + protocolPendingCount,
      revenueCents: revenueCents + protocolRevenueCents,
      appointments: billableAppointments,
      protocolSales,
    };
  }

  async updateDetails(id: string, data: {
    customerId?: string;
    serviceId?: string;
    protocolId?: string | null;
    protocolCreditOutcome?: 'reserved' | 'consumed' | 'released' | 'maintenance' | null;
    date?: Date;
    startTime?: string;
    endTime?: string;
    priceCents?: number;
    status?: string;
    paymentStatus?: 'pending' | 'paid';
    paymentMethod?: 'card' | 'pix' | 'cash' | null;
    paidAt?: Date | null;
    appointmentNotes?: string | null;
    cancelToken?: string;
    reminderSent?: boolean;
    barberReminderSent?: boolean;
  }): Promise<AppointmentWithDetails> {
    const raw = await this.db.appointment.update({
      where: { id },
      data: {
        ...(data.customerId !== undefined ? { customerId: data.customerId } : {}),
        ...(data.serviceId !== undefined ? { serviceId: data.serviceId } : {}),
        ...(data.protocolId !== undefined ? { protocolId: data.protocolId } : {}),
        ...(data.protocolCreditOutcome !== undefined ? { protocolCreditOutcome: data.protocolCreditOutcome } : {}),
        ...(data.date !== undefined ? { date: data.date } : {}),
        ...(data.startTime !== undefined ? { startTime: data.startTime } : {}),
        ...(data.endTime !== undefined ? { endTime: data.endTime } : {}),
        ...(data.priceCents !== undefined ? { priceCents: data.priceCents } : {}),
        ...(data.status !== undefined ? { status: data.status } : {}),
        ...(data.paymentStatus !== undefined ? { paymentStatus: data.paymentStatus } : {}),
        ...(data.paymentMethod !== undefined ? { paymentMethod: data.paymentMethod } : {}),
        ...(data.paidAt !== undefined ? { paidAt: data.paidAt } : {}),
        ...(data.appointmentNotes !== undefined ? { appointmentNotes: data.appointmentNotes } : {}),
        ...(data.cancelToken !== undefined ? { cancelToken: data.cancelToken } : {}),
        ...(data.reminderSent !== undefined ? { reminderSent: data.reminderSent } : {}),
        ...(data.barberReminderSent !== undefined ? { barberReminderSent: data.barberReminderSent } : {}),
      },
      include: includeRelations,
    });

    return mapAppointment(raw);
  }

  async getStatsByDateRange(barberId: string, from: Date, to: Date): Promise<DayStat[]> {
    const where = { providerId: barberId, date: { gte: from, lte: to } };
    const [confirmedGroups, completedGroups] = await Promise.all([
      this.db.appointment.groupBy({
        by: ['date'],
        where: { ...where, status: 'confirmed' },
        orderBy: { date: 'asc' },
        _count: { _all: true },
      }),
      this.db.appointment.groupBy({
        by: ['date'],
        where: { ...where, status: 'completed' },
        orderBy: { date: 'asc' },
        _count: { _all: true },
        _sum: { priceCents: true },
      }),
    ]);

    const statsMap = new Map<string, DayStat>();
    for (const g of confirmedGroups) {
      const date = (g.date as Date).toISOString().split('T')[0];
      statsMap.set(date, { date, confirmed: g._count!._all, completed: 0, revenueCents: 0 });
    }
    for (const g of completedGroups) {
      const date = (g.date as Date).toISOString().split('T')[0];
      const existing = statsMap.get(date) ?? { date, confirmed: 0, completed: 0, revenueCents: 0 };
      statsMap.set(date, { ...existing, completed: g._count!._all, revenueCents: g._sum!.priceCents ?? 0 });
    }
    return Array.from(statsMap.values()).sort((a, b) => a.date.localeCompare(b.date));
  }
}
