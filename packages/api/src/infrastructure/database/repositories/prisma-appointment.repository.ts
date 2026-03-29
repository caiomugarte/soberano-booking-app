import { prisma } from '../../../config/database.js';
import type { AppointmentWithDetails } from '../../../domain/entities/appointment.js';
import type {
  AppointmentRepository,
  CreateAppointmentData,
} from '../../../domain/repositories/appointment.repository.js';

const includeRelations = {
  barber: {
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

export class PrismaAppointmentRepository implements AppointmentRepository {
  async create(data: CreateAppointmentData): Promise<AppointmentWithDetails> {
    return prisma.appointment.create({
      data,
      include: includeRelations,
    }) as unknown as AppointmentWithDetails;
  }

  async findByCancelToken(token: string): Promise<AppointmentWithDetails | null> {
    return prisma.appointment.findUnique({
      where: { cancelToken: token },
      include: includeRelations,
    }) as unknown as AppointmentWithDetails | null;
  }

  async findById(id: string): Promise<AppointmentWithDetails | null> {
    return prisma.appointment.findUnique({
      where: { id },
      include: includeRelations,
    }) as unknown as AppointmentWithDetails | null;
  }

  async findBookedSlots(barberId: string, date: Date): Promise<string[]> {
    const appointments = await prisma.appointment.findMany({
      where: {
        barberId,
        date,
        status: 'confirmed',
      },
      select: { startTime: true },
    });
    return appointments.map((a: { startTime: string }) => a.startTime);
  }

  async findByBarberAndDate(barberId: string, date: Date): Promise<AppointmentWithDetails[]> {
    return prisma.appointment.findMany({
      where: {
        barberId,
        date,
        status: { in: ['confirmed', 'completed'] },
      },
      include: includeRelations,
      orderBy: { startTime: 'asc' },
    }) as unknown as AppointmentWithDetails[];
  }

  async findUpcomingWithoutReminder(minutesAhead: number): Promise<AppointmentWithDetails[]> {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    const currentTime = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
    const futureMinutes = now.getMinutes() + minutesAhead;
    const futureHours = now.getHours() + Math.floor(futureMinutes / 60);
    const maxTime = `${String(futureHours).padStart(2, '0')}:${String(futureMinutes % 60).padStart(2, '0')}`;

    return prisma.appointment.findMany({
      where: {
        status: 'confirmed',
        reminderSent: false,
        date: today,
        startTime: {
          gte: currentTime,
          lte: maxTime,
        },
      },
      include: includeRelations,
    }) as unknown as AppointmentWithDetails[];
  }

  async updateStatus(id: string, status: string, cancelledAt?: Date): Promise<void> {
    await prisma.appointment.update({
      where: { id },
      data: {
        status,
        ...(cancelledAt && { cancelledAt }),
      },
    });
  }

  async updateDateTime(
    id: string,
    date: Date,
    startTime: string,
    endTime: string,
    cancelToken: string,
  ): Promise<AppointmentWithDetails> {
    return prisma.appointment.update({
      where: { id },
      data: { date, startTime, endTime, cancelToken },
      include: includeRelations,
    }) as unknown as AppointmentWithDetails;
  }

  async markReminderSent(id: string): Promise<void> {
    await prisma.appointment.update({
      where: { id },
      data: { reminderSent: true },
    });
  }
}
