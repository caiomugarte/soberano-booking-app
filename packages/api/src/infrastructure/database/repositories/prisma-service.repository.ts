import { prisma } from '../../../config/database.js';
import type { ServiceEntity } from '../../../domain/entities/service.js';
import type { ServiceRepository } from '../../../domain/repositories/service.repository.js';

export class PrismaServiceRepository implements ServiceRepository {
  async findAllActive(clientId: string): Promise<ServiceEntity[]> {
    return prisma.service.findMany({
      where: { isActive: true, clientId },
      orderBy: { sortOrder: 'asc' },
    });
  }

  async findById(id: string, clientId: string): Promise<ServiceEntity | null> {
    return prisma.service.findFirst({ where: { id, clientId } });
  }
}
