import { prisma } from '../../../config/database.js';
import type { CustomerEntity } from '../../../domain/entities/customer.js';
import type { CustomerRepository } from '../../../domain/repositories/customer.repository.js';

export class PrismaCustomerRepository implements CustomerRepository {
  async findByPhone(phone: string): Promise<CustomerEntity | null> {
    return prisma.customer.findUnique({ where: { phone } });
  }

  async upsertByPhone(phone: string, name: string): Promise<CustomerEntity> {
    return prisma.customer.upsert({
      where: { phone },
      update: { name },
      create: { phone, name },
    });
  }
}
