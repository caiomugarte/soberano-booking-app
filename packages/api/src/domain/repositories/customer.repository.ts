import type { CustomerEntity } from '../entities/customer.js';

export interface CustomerRepository {
  findByPhone(phone: string): Promise<CustomerEntity | null>;
  upsertByPhone(phone: string, name: string, tenantId: string): Promise<CustomerEntity>;
  createWalkin(name: string, tenantId: string): Promise<CustomerEntity>;
  updateName(id: string, name: string): Promise<CustomerEntity>;
}
