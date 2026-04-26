// eslint-disable-next-line @typescript-eslint/no-explicit-any
type PrismaClientOrExtended = any;
import type { BarberEntity } from '../../../domain/entities/barber.js';
import type { ProviderRepository } from '../../../domain/repositories/provider.repository.js';


export class PrismaProviderRepository implements ProviderRepository {
  constructor(private db: PrismaClientOrExtended) {}

  async findAllActive(): Promise<BarberEntity[]> {
    return this.db.provider.findMany({
      where: { isActive: true },
      orderBy: { firstName: 'asc' },
    });
  }

  async findById(id: string): Promise<BarberEntity | null> {
    return this.db.provider.findUnique({ where: { id } });
  }

  async findByEmail(email: string): Promise<BarberEntity | null> {
    return this.db.provider.findFirst({ where: { email } });
  }
}
