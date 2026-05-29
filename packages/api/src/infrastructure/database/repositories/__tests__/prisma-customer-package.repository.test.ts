import { describe, expect, it, vi } from 'vitest';
import type { TenantPrismaClient } from '../../../../config/tenant-prisma.js';
import { PrismaCustomerPackageRepository } from '../prisma-customer-package.repository.js';

const basePackageRecord = {
  id: 'pkg-1',
  tenantId: 'tenant-1',
  providerId: 'provider-1',
  customerName: 'Maria',
  customerPhone: '11999998888',
  totalUses: 5,
  usedCount: 5,
  totalPriceCents: 10000,
  status: 'active',
  createdAt: new Date('2026-05-20T10:00:00Z'),
  updatedAt: new Date('2026-05-20T10:00:00Z'),
};

function makeDb() {
  const db = {
    customerPackage: {
      findMany: vi.fn(),
      findFirst: vi.fn(),
      findUnique: vi.fn(),
      update: vi.fn(),
    },
    appointment: {
      findFirst: vi.fn(),
      updateMany: vi.fn(),
    },
    $transaction: vi.fn(),
  };

  db.$transaction.mockImplementation(async (callback: (tx: typeof db) => Promise<unknown>) => callback(db));

  return db as unknown as TenantPrismaClient & {
    customerPackage: {
      findMany: ReturnType<typeof vi.fn>;
      findFirst: ReturnType<typeof vi.fn>;
      findUnique: ReturnType<typeof vi.fn>;
      update: ReturnType<typeof vi.fn>;
    };
    appointment: {
      findFirst: ReturnType<typeof vi.fn>;
      updateMany: ReturnType<typeof vi.fn>;
    };
    $transaction: ReturnType<typeof vi.fn>;
  };
}

describe('PrismaCustomerPackageRepository', () => {
  it('scopes active-by-phone queries to tenant and provider ownership', async () => {
    const db = makeDb();
    db.customerPackage.findMany.mockResolvedValue([basePackageRecord]);
    const repository = new PrismaCustomerPackageRepository(db);

    await repository.findActiveByPhone('tenant-1', 'provider-1', '11999998888');

    expect(db.customerPackage.findMany).toHaveBeenCalledWith({
      where: {
        tenantId: 'tenant-1',
        providerId: 'provider-1',
        customerPhone: '11999998888',
        status: 'active',
      },
      orderBy: { createdAt: 'asc' },
    });
  });

  it('keeps a fully allocated package active while a future non-cancelled linked booking still exists', async () => {
    const db = makeDb();
    db.customerPackage.findUnique.mockResolvedValue(basePackageRecord);
    db.appointment.findFirst.mockResolvedValue({ id: 'appt-1' });
    const repository = new PrismaCustomerPackageRepository(db);

    const result = await repository.reevaluateLifecycle('pkg-1');

    expect(result?.status).toBe('active');
    expect(db.customerPackage.update).not.toHaveBeenCalled();
  });

  it('moves a fully allocated package to completed only after no future non-cancelled linked bookings remain', async () => {
    const db = makeDb();
    db.customerPackage.findUnique.mockResolvedValue(basePackageRecord);
    db.appointment.findFirst.mockResolvedValue(null);
    db.customerPackage.update.mockResolvedValue({
      ...basePackageRecord,
      status: 'completed',
      updatedAt: new Date('2026-05-27T12:00:00Z'),
    });
    const repository = new PrismaCustomerPackageRepository(db);

    const result = await repository.reevaluateLifecycle('pkg-1');

    expect(db.customerPackage.update).toHaveBeenCalledWith({
      where: { id: 'pkg-1' },
      data: { status: 'completed' },
    });
    expect(result?.status).toBe('completed');
  });

  it('denies package details access across providers by returning null', async () => {
    const db = makeDb();
    db.customerPackage.findFirst.mockResolvedValue(null);
    const repository = new PrismaCustomerPackageRepository(db);

    const result = await repository.findDetailsByIdForProvider('pkg-1', 'tenant-1', 'provider-2');

    expect(db.customerPackage.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          id: 'pkg-1',
          tenantId: 'tenant-1',
          providerId: 'provider-2',
        },
      }),
    );
    expect(result).toBeNull();
  });

  it('deactivation cancels only future confirmed linked appointments before marking the package cancelled', async () => {
    const db = makeDb();
    db.customerPackage.findFirst.mockResolvedValue(basePackageRecord);
    db.customerPackage.update.mockResolvedValue({
      ...basePackageRecord,
      status: 'cancelled',
      updatedAt: new Date('2026-05-27T12:00:00Z'),
    });
    const repository = new PrismaCustomerPackageRepository(db);

    const result = await repository.deactivate('pkg-1', 'tenant-1', 'provider-1');

    expect(db.appointment.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          packageId: 'pkg-1',
          status: 'confirmed',
        }),
        data: expect.objectContaining({
          status: 'cancelled',
          cancelledAt: expect.any(Date),
        }),
      }),
    );
    expect(db.customerPackage.update).toHaveBeenCalledWith({
      where: { id: 'pkg-1' },
      data: { status: 'cancelled' },
    });
    expect(result.status).toBe('cancelled');
  });
});
