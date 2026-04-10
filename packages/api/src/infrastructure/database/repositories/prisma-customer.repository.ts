// eslint-disable-next-line @typescript-eslint/no-explicit-any
type PrismaClientOrExtended = any;
import type { CustomerEntity } from '../../../domain/entities/customer.js';
import type { CustomerRepository } from '../../../domain/repositories/customer.repository.js';


export class PrismaCustomerRepository implements CustomerRepository {
  constructor(private db: PrismaClientOrExtended) {}

  async findByPhone(phone: string): Promise<CustomerEntity | null> {
    return this.db.customer.findFirst({ where: { phone } });
  }

  async upsertByPhone(phone: string, name: string): Promise<CustomerEntity> {
    const existing = await this.findByPhone(phone);
    if (existing) {
      return this.db.customer.update({ where: { id: existing.id }, data: { name } });
    }
    return this.db.customer.create({ data: { phone, name } });
  }

  async createWalkin(name: string): Promise<CustomerEntity> {
    return this.db.customer.create({ data: { name } });
  }

  async updateName(id: string, name: string): Promise<CustomerEntity> {
    return this.db.customer.update({ where: { id }, data: { name } });
  }
}
