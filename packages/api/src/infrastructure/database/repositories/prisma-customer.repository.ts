import { prisma } from '../../../config/database.js';
import type { CustomerEntity } from '../../../domain/entities/customer.js';
import type { CustomerRepository } from '../../../domain/repositories/customer.repository.js';

export class PrismaCustomerRepository implements CustomerRepository {
  async findByPhone(phone: string): Promise<CustomerEntity | null> {
    return prisma.customer.findFirst({ where: { phone } });
  }

  async upsertByPhone(phone: string, name: string): Promise<CustomerEntity> {
    const existing = await this.findByPhone(phone);
    if (existing) {
      return prisma.customer.update({ where: { id: existing.id }, data: { name } });
    }
    return prisma.customer.create({ data: { phone, name } });
  }

  async createWalkin(name: string): Promise<CustomerEntity> {
    return prisma.customer.create({ data: { name } });
  }
}
