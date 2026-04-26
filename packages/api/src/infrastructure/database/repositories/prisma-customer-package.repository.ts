// eslint-disable-next-line @typescript-eslint/no-explicit-any
type PrismaClientOrExtended = any;
import type { CustomerPackageEntity } from '../../../domain/entities/customer-package.js';
import type { CustomerPackageRepository } from '../../../domain/repositories/customer-package.repository.js';

export class PrismaCustomerPackageRepository implements CustomerPackageRepository {
  constructor(private db: PrismaClientOrExtended) {}

  async create(data: { tenantId: string; customerName: string; customerPhone?: string; totalUses: number; totalPriceCents: number }): Promise<CustomerPackageEntity> {
    return this.db.customerPackage.create({ data });
  }

  async findActiveByPhone(tenantId: string, phone: string): Promise<CustomerPackageEntity[]> {
    return this.db.customerPackage.findMany({
      where: { tenantId, customerPhone: phone, status: 'active' },
      orderBy: { createdAt: 'asc' },
    });
  }

  async findByIdAndTenant(id: string, tenantId: string): Promise<CustomerPackageEntity | null> {
    return this.db.customerPackage.findFirst({ where: { id, tenantId } });
  }

  async incrementUsedCount(id: string): Promise<CustomerPackageEntity> {
    const updated = await this.db.customerPackage.update({
      where: { id },
      data: { usedCount: { increment: 1 } },
    });
    if (updated.usedCount >= updated.totalUses) {
      return this.db.customerPackage.update({
        where: { id },
        data: { status: 'completed' },
      });
    }
    return updated;
  }

  async findAllByTenant(tenantId: string, options?: { status?: string }): Promise<CustomerPackageEntity[]> {
    return this.db.customerPackage.findMany({
      where: { tenantId, ...(options?.status ? { status: options.status } : {}) },
      orderBy: { createdAt: 'desc' },
    });
  }

  async deactivate(id: string, tenantId: string): Promise<CustomerPackageEntity> {
    const pkg = await this.db.customerPackage.findFirst({ where: { id, tenantId } });
    if (!pkg) throw new Error('NOT_FOUND');
    if (pkg.status !== 'active') throw new Error('NOT_ACTIVE');
    return this.db.customerPackage.update({ where: { id }, data: { status: 'cancelled' } });
  }

  async deleteById(id: string, tenantId: string): Promise<void> {
    const pkg = await this.db.customerPackage.findFirst({ where: { id, tenantId } });
    if (!pkg) throw new Error('NOT_FOUND');
    if (pkg.status !== 'cancelled') throw new Error('NOT_CANCELLED');
    await this.db.customerPackage.delete({ where: { id } });
  }
}
