import { prisma } from '../../../config/database.js';
import type { BarberEntity } from '../../../domain/entities/barber.js';
import type { BarberRepository } from '../../../domain/repositories/barber.repository.js';

export class PrismaBarberRepository implements BarberRepository {
  async findAllActive(): Promise<BarberEntity[]> {
    return prisma.barber.findMany({
      where: { isActive: true },
      orderBy: { firstName: 'asc' },
    });
  }

  async findById(id: string): Promise<BarberEntity | null> {
    return prisma.barber.findUnique({ where: { id } });
  }

  async findByEmail(email: string): Promise<BarberEntity | null> {
    return prisma.barber.findUnique({ where: { email } });
  }
}
