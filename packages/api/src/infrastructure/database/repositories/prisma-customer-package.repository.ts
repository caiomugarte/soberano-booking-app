import type { Prisma, CustomerPackage as PrismaCustomerPackage } from '@prisma/client';
import type { TenantPrismaClient } from '../../../config/tenant-prisma.js';
import type {
  CustomerPackageDetailsEntity,
  CustomerPackageEntity,
  CustomerPackageLinkedAppointmentEntity,
  CustomerPackageStatus,
} from '../../../domain/entities/customer-package.js';
import type { CustomerPackageRepository } from '../../../domain/repositories/customer-package.repository.js';

function mapCustomerPackage(pkg: PrismaCustomerPackage): CustomerPackageEntity {
  if (pkg.status !== 'active' && pkg.status !== 'completed' && pkg.status !== 'cancelled') {
    throw new Error(`INVALID_PACKAGE_STATUS:${pkg.status}`);
  }

  const status: CustomerPackageStatus = pkg.status;

  return {
    id: pkg.id,
    tenantId: pkg.tenantId,
    providerId: pkg.providerId,
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

const packageDetailsInclude = {
  appointments: {
    orderBy: { createdAt: 'asc' },
    select: {
      id: true,
      providerId: true,
      date: true,
      startTime: true,
      endTime: true,
      status: true,
      priceCents: true,
      createdAt: true,
      service: {
        select: {
          id: true,
          name: true,
          icon: true,
        },
      },
      customer: {
        select: {
          id: true,
          name: true,
          phone: true,
        },
      },
    },
  },
} as const satisfies Prisma.CustomerPackageInclude;

type PrismaCustomerPackageWithAppointments = Prisma.CustomerPackageGetPayload<{
  include: typeof packageDetailsInclude;
}>;

function compareScheduledAppointments(
  left: CustomerPackageLinkedAppointmentEntity,
  right: CustomerPackageLinkedAppointmentEntity,
): number {
  const leftKey = `${left.date.toISOString().slice(0, 10)}T${left.startTime}`;
  const rightKey = `${right.date.toISOString().slice(0, 10)}T${right.startTime}`;
  return leftKey.localeCompare(rightKey);
}

function mapCustomerPackageDetails(pkg: PrismaCustomerPackageWithAppointments): CustomerPackageDetailsEntity {
  const mapped = mapCustomerPackage(pkg);
  const linkedAppointments: CustomerPackageLinkedAppointmentEntity[] = pkg.appointments.map((appointment, index) => ({
    id: appointment.id,
    providerId: appointment.providerId,
    date: appointment.date,
    startTime: appointment.startTime,
    endTime: appointment.endTime,
    status: appointment.status as CustomerPackageLinkedAppointmentEntity['status'],
    priceCents: appointment.priceCents,
    service: appointment.service,
    customer: {
      id: appointment.customer.id,
      name: appointment.customer.name,
      phone: appointment.customer.phone ?? null,
    },
    packageProgress: {
      appointmentNumber: index + 1,
      totalUses: pkg.totalUses,
      totalPriceCents: pkg.totalPriceCents,
    },
  }));

  return {
    ...mapped,
    linkedAppointments: linkedAppointments.sort(compareScheduledAppointments),
  };
}

function getCurrentLifecycleWindow(): { today: Date; currentTime: string } {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const currentTime = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
  return { today, currentTime };
}

export class PrismaCustomerPackageRepository implements CustomerPackageRepository {
  constructor(private db: TenantPrismaClient) {}

  async create(data: { tenantId: string; providerId: string; customerName: string; customerPhone?: string; totalUses: number; totalPriceCents: number }): Promise<CustomerPackageEntity> {
    const created = await this.db.customerPackage.create({ data });
    return mapCustomerPackage(created);
  }

  async findActiveByPhone(tenantId: string, providerId: string, phone: string): Promise<CustomerPackageEntity[]> {
    const packages = await this.db.customerPackage.findMany({
      where: { tenantId, providerId, customerPhone: phone, status: 'active' },
      orderBy: { createdAt: 'asc' },
    });
    return packages.map(mapCustomerPackage);
  }

  async findByIdForProvider(id: string, tenantId: string, providerId: string): Promise<CustomerPackageEntity | null> {
    const pkg = await this.db.customerPackage.findFirst({ where: { id, tenantId, providerId } });
    return pkg ? mapCustomerPackage(pkg) : null;
  }

  async findDetailsByIdForProvider(id: string, tenantId: string, providerId: string): Promise<CustomerPackageDetailsEntity | null> {
    const pkg = await this.db.customerPackage.findFirst({
      where: { id, tenantId, providerId },
      include: packageDetailsInclude,
    });
    return pkg ? mapCustomerPackageDetails(pkg) : null;
  }

  async incrementUsedCount(id: string): Promise<CustomerPackageEntity> {
    const updated = await this.db.customerPackage.update({
      where: { id },
      data: { usedCount: { increment: 1 } },
    });
    return mapCustomerPackage(updated);
  }

  async reevaluateLifecycle(id: string): Promise<CustomerPackageEntity | null> {
    const pkg = await this.db.customerPackage.findUnique({ where: { id } });
    if (!pkg) return null;
    if (pkg.status === 'cancelled') return mapCustomerPackage(pkg);

    const hasFutureLinkedAppointments = await this.hasFutureLinkedAppointments(id);
    const nextStatus: CustomerPackageStatus =
      pkg.usedCount < pkg.totalUses || hasFutureLinkedAppointments ? 'active' : 'completed';

    if (pkg.status === nextStatus) {
      return mapCustomerPackage(pkg);
    }

    const updated = await this.db.customerPackage.update({
      where: { id },
      data: { status: nextStatus },
    });
    return mapCustomerPackage(updated);
  }

  async findAllByProvider(tenantId: string, providerId: string, options?: { status?: CustomerPackageStatus }): Promise<CustomerPackageEntity[]> {
    const packages = await this.db.customerPackage.findMany({
      where: { tenantId, providerId, ...(options?.status ? { status: options.status } : {}) },
      orderBy: { createdAt: 'desc' },
    });
    return packages.map(mapCustomerPackage);
  }

  async deactivate(id: string, tenantId: string, providerId: string): Promise<CustomerPackageEntity> {
    const pkg = await this.db.customerPackage.findFirst({ where: { id, tenantId, providerId } });
    if (!pkg) throw new Error('NOT_FOUND');
    if (pkg.status !== 'active') throw new Error('NOT_ACTIVE');
    const updated = await this.db.customerPackage.update({ where: { id }, data: { status: 'cancelled' } });
    return mapCustomerPackage(updated);
  }

  async deleteById(id: string, tenantId: string, providerId: string): Promise<void> {
    const pkg = await this.db.customerPackage.findFirst({ where: { id, tenantId, providerId } });
    if (!pkg) throw new Error('NOT_FOUND');
    if (pkg.status !== 'cancelled') throw new Error('NOT_CANCELLED');
    await this.db.customerPackage.delete({ where: { id } });
  }

  private async hasFutureLinkedAppointments(packageId: string): Promise<boolean> {
    const { today, currentTime } = getCurrentLifecycleWindow();
    const appointment = await this.db.appointment.findFirst({
      where: {
        packageId,
        status: { not: 'cancelled' },
        OR: [
          { date: { gt: today } },
          { date: today, startTime: { gt: currentTime } },
        ],
      },
      select: { id: true },
    });

    return Boolean(appointment);
  }
}
