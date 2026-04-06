import { prisma } from '../../../config/database.js';
import type { BarberEntity } from '../../../domain/entities/barber.js';
import type { BarberRepository } from '../../../domain/repositories/barber.repository.js';

export class PrismaBarberRepository implements BarberRepository {
  async findAllActive(clientId: string): Promise<BarberEntity[]> {
    return prisma.barber.findMany({
      where: { isActive: true, clientId },
      orderBy: { firstName: 'asc' },
    });
  }

  async findById(id: string, clientId: string): Promise<BarberEntity | null> {
    return prisma.barber.findFirst({ where: { id, clientId } });
  }

  async findByEmail(email: string, clientId: string): Promise<BarberEntity | null> {
    return prisma.barber.findFirst({ where: { email, clientId } });
  }
}
