import { prisma } from '../../../config/database.js';
import type { CustomerEntity } from '../../../domain/entities/customer.js';
import type { CustomerRepository } from '../../../domain/repositories/customer.repository.js';

export class PrismaCustomerRepository implements CustomerRepository {
  async findByPhone(phone: string, clientId: string): Promise<CustomerEntity | null> {
    return prisma.customer.findFirst({ where: { phone, clientId } });
  }

  async upsertByPhone(phone: string, name: string, clientId: string): Promise<CustomerEntity> {
    return prisma.customer.upsert({
      where: { clientId_phone: { clientId, phone } },
      update: { name },
      create: { phone, name, clientId },
    });
  }

  async createWalkin(name: string, clientId: string): Promise<CustomerEntity> {
    return prisma.customer.create({ data: { name, clientId } });
  }
}
