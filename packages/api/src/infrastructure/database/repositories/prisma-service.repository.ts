// eslint-disable-next-line @typescript-eslint/no-explicit-any
type PrismaClientOrExtended = any;
import type { ServiceEntity } from '../../../domain/entities/service.js';
import type { ServiceRepository } from '../../../domain/repositories/service.repository.js';


export class PrismaServiceRepository implements ServiceRepository {
  constructor(private db: PrismaClientOrExtended) {}

  async findAllActive(): Promise<ServiceEntity[]> {
    return this.db.service.findMany({
      where: { isActive: true },
      orderBy: { sortOrder: 'asc' },
    });
  }

  async findById(id: string): Promise<ServiceEntity | null> {
    return this.db.service.findUnique({ where: { id } });
  }
}
