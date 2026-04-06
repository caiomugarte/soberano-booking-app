import type { CustomerEntity } from '../entities/customer.js';

export interface CustomerRepository {
  findByPhone(phone: string, clientId: string): Promise<CustomerEntity | null>;
  upsertByPhone(phone: string, name: string, clientId: string): Promise<CustomerEntity>;
  createWalkin(name: string, clientId: string): Promise<CustomerEntity>;
}
