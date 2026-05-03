import type { CustomerPackage as PrismaCustomerPackage } from '@prisma/client';
import type { TenantPrismaClient } from '../../../config/tenant-prisma.js';
import type { CustomerPackageEntity } from '../../../domain/entities/customer-package.js';
import type { CustomerPackageRepository } from '../../../domain/repositories/customer-package.repository.js';

function mapCustomerPackage(pkg: PrismaCustomerPackage): CustomerPackageEntity {
  if (pkg.status !== 'active' && pkg.status !== 'completed' && pkg.status !== 'cancelled') {
    throw new Error(`INVALID_PACKAGE_STATUS:${pkg.status}`);
  }

  const status: CustomerPackageEntity['status'] = pkg.status;

  return {
    id: pkg.id,
    tenantId: pkg.tenantId,
    customerName: pkg.customerName,
    customerPhone: pkg.customerPhone ?? null,
    totalUses: pkg.totalUses,
    usedCount: pkg.usedCount,
    totalPriceCents: pkg.totalPriceCents,
    status,
    createdAt: pkg.createdAt,
    updatedAt: pkg.updatedAt,
  };
}

export class PrismaCustomerPackageRepository implements CustomerPackageRepository {
  constructor(private db: TenantPrismaClient) {}

  async create(data: { tenantId: string; customerName: string; customerPhone?: string; totalUses: number; totalPriceCents: number }): Promise<CustomerPackageEntity> {
    const created = await this.db.customerPackage.create({ data });
    return mapCustomerPackage(created);
  }

  async findActiveByPhone(tenantId: string, phone: string): Promise<CustomerPackageEntity[]> {
    const packages = await this.db.customerPackage.findMany({
      where: { tenantId, customerPhone: phone, status: 'active' },
      orderBy: { createdAt: 'asc' },
    });
    return packages.map(mapCustomerPackage);
  }

  async findByIdAndTenant(id: string, tenantId: string): Promise<CustomerPackageEntity | null> {
    const pkg = await this.db.customerPackage.findFirst({ where: { id, tenantId } });
    return pkg ? mapCustomerPackage(pkg) : null;
  }

  async incrementUsedCount(id: string): Promise<CustomerPackageEntity> {
    const updated = await this.db.customerPackage.update({
      where: { id },
      data: { usedCount: { increment: 1 } },
    });
    if (updated.usedCount >= updated.totalUses) {
      const completed = await this.db.customerPackage.update({
        where: { id },
        data: { status: 'completed' },
      });
      return mapCustomerPackage(completed);
    }
    return mapCustomerPackage(updated);
  }

  async findAllByTenant(tenantId: string, options?: { status?: string }): Promise<CustomerPackageEntity[]> {
    const packages = await this.db.customerPackage.findMany({
      where: { tenantId, ...(options?.status ? { status: options.status } : {}) },
      orderBy: { createdAt: 'desc' },
    });
    return packages.map(mapCustomerPackage);
  }

  async deactivate(id: string, tenantId: string): Promise<CustomerPackageEntity> {
    const pkg = await this.db.customerPackage.findFirst({ where: { id, tenantId } });
    if (!pkg) throw new Error('NOT_FOUND');
    if (pkg.status !== 'active') throw new Error('NOT_ACTIVE');
    const updated = await this.db.customerPackage.update({ where: { id }, data: { status: 'cancelled' } });
    return mapCustomerPackage(updated);
  }

  async deleteById(id: string, tenantId: string): Promise<void> {
    const pkg = await this.db.customerPackage.findFirst({ where: { id, tenantId } });
    if (!pkg) throw new Error('NOT_FOUND');
    if (pkg.status !== 'cancelled') throw new Error('NOT_CANCELLED');
    await this.db.customerPackage.delete({ where: { id } });
  }
}
