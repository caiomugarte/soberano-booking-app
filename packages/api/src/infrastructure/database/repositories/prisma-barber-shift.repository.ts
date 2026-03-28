import { prisma } from '../../../config/database.js';
import type {
  BarberShiftRepository,
  BarberShiftEntity,
  BarberAbsenceEntity,
} from '../../../domain/repositories/barber-shift.repository.js';

export class PrismaBarberShiftRepository implements BarberShiftRepository {
  async findByBarberAndDay(barberId: string, dayOfWeek: number): Promise<BarberShiftEntity[]> {
    return prisma.barberShift.findMany({
      where: { barberId, dayOfWeek },
      orderBy: { startTime: 'asc' },
    });
  }

  async findAllByBarber(barberId: string): Promise<BarberShiftEntity[]> {
    return prisma.barberShift.findMany({
      where: { barberId },
      orderBy: [{ dayOfWeek: 'asc' }, { startTime: 'asc' }],
    });
  }

  async replaceForBarber(
    barberId: string,
    shifts: Omit<BarberShiftEntity, 'id' | 'barberId'>[],
  ): Promise<void> {
    await prisma.$transaction([
      prisma.barberShift.deleteMany({ where: { barberId } }),
      prisma.barberShift.createMany({
        data: shifts.map((s) => ({ ...s, barberId })),
      }),
    ]);
  }

  async findAbsencesByBarberAndDate(barberId: string, date: Date): Promise<BarberAbsenceEntity[]> {
    return prisma.barberAbsence.findMany({
      where: { barberId, date },
    }) as unknown as BarberAbsenceEntity[];
  }

  async findAbsencesByBarber(barberId: string): Promise<BarberAbsenceEntity[]> {
    return prisma.barberAbsence.findMany({
      where: { barberId },
      orderBy: { date: 'asc' },
    }) as unknown as BarberAbsenceEntity[];
  }

  async createAbsence(data: Omit<BarberAbsenceEntity, 'id'>): Promise<BarberAbsenceEntity> {
    return prisma.barberAbsence.create({ data }) as unknown as BarberAbsenceEntity;
  }

  async deleteAbsence(id: string): Promise<void> {
    await prisma.barberAbsence.delete({ where: { id } });
  }
}
