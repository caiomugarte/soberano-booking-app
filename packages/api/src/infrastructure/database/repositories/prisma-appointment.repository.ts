// eslint-disable-next-line @typescript-eslint/no-explicit-any
type PrismaClientOrExtended = any;
import type { AppointmentWithDetails } from '../../../domain/entities/appointment.js';
import type {
  AppointmentRepository,
  CreateAppointmentData,
  DayStat,
} from '../../../domain/repositories/appointment.repository.js';

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
} as const;

// Maps Prisma result (provider/providerId) → domain entity (barber/barberId)
function mapAppointment(raw: any): AppointmentWithDetails {
  const { provider, providerId, ...rest } = raw;
  return { ...rest, barberId: providerId, barber: provider } as AppointmentWithDetails;
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
        status: 'confirmed',
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
