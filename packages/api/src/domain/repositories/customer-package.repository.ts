import type {
  CustomerPackageDetailsEntity,
  CustomerPackageEntity,
  CustomerPackageStatus,
} from '../entities/customer-package.js';

export interface CustomerPackageRepository {
  create(data: { tenantId: string; providerId: string; customerName: string; customerPhone?: string; totalUses: number; totalPriceCents: number }): Promise<CustomerPackageEntity>;
  findActiveByPhone(tenantId: string, providerId: string, phone: string): Promise<CustomerPackageEntity[]>;
  findByIdForProvider(id: string, tenantId: string, providerId: string): Promise<CustomerPackageEntity | null>;
  findDetailsByIdForProvider(id: string, tenantId: string, providerId: string): Promise<CustomerPackageDetailsEntity | null>;
  incrementUsedCount(id: string): Promise<CustomerPackageEntity>;
  reevaluateLifecycle(id: string): Promise<CustomerPackageEntity | null>;
  findAllByProvider(tenantId: string, providerId: string, options?: { status?: CustomerPackageStatus }): Promise<CustomerPackageEntity[]>;
  deactivate(id: string, tenantId: string, providerId: string): Promise<CustomerPackageEntity>;
  deleteById(id: string, tenantId: string, providerId: string): Promise<void>;
}
