import type { CustomerPackageEntity } from '../entities/customer-package.js';

export interface CustomerPackageRepository {
  create(data: { tenantId: string; customerName: string; customerPhone?: string; totalUses: number; totalPriceCents: number }): Promise<CustomerPackageEntity>;
  findActiveByPhone(tenantId: string, phone: string): Promise<CustomerPackageEntity[]>;
  findByIdAndTenant(id: string, tenantId: string): Promise<CustomerPackageEntity | null>;
  incrementUsedCount(id: string): Promise<CustomerPackageEntity>;
  findAllByTenant(tenantId: string, options?: { status?: string }): Promise<CustomerPackageEntity[]>;
  deactivate(id: string, tenantId: string): Promise<CustomerPackageEntity>;
  deleteById(id: string, tenantId: string): Promise<void>;
}
