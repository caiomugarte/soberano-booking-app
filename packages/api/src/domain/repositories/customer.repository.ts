import type { CustomerEntity } from '../entities/customer.js';

export interface CustomerRepository {
  findByPhone(phone: string): Promise<CustomerEntity | null>;
  findByCpf(cpf: string): Promise<CustomerEntity | null>;
  findByEmail(email: string): Promise<CustomerEntity | null>;
  findById(id: string): Promise<CustomerEntity | null>;
  upsertByPhone(phone: string, name: string, tenantId: string): Promise<CustomerEntity>;
  createWalkin(name: string, tenantId: string): Promise<CustomerEntity>;
  updateName(id: string, name: string): Promise<CustomerEntity>;
  findAll(tenantId: string, search?: string): Promise<CustomerEntity[]>;
  create(data: { tenantId: string; name: string; phone?: string; email?: string; cpf?: string; notes?: string }): Promise<CustomerEntity>;
  update(id: string, partial: Partial<Omit<CustomerEntity, 'id'>>): Promise<CustomerEntity>;
  deleteById(id: string): Promise<void>;
}
