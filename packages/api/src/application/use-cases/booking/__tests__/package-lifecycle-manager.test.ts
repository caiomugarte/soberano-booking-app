import { describe, expect, it, vi } from 'vitest';
import type { AppointmentWithDetails } from '../../../../domain/entities/appointment.js';
import type { CustomerPackageRepository } from '../../../../domain/repositories/customer-package.repository.js';
import { PackageLifecycleManager } from '../package-lifecycle-manager.js';

const appointment = {
  id: 'appt-1',
  barberId: 'provider-1',
  serviceId: 'service-1',
  customerId: 'customer-1',
  packageId: 'pkg-1',
  protocolId: null,
  protocolCreditOutcome: null,
  recurringSeriesId: null,
  date: new Date('2026-06-16T00:00:00Z'),
  startTime: '10:00',
  endTime: '10:30',
  priceCents: 3500,
  status: 'confirmed',
  cancelToken: 'token',
  reminderSent: false,
  barberReminderSent: false,
  cancelledAt: null,
  createdAt: new Date('2026-06-01T00:00:00Z'),
  updatedAt: new Date('2026-06-01T00:00:00Z'),
  paymentStatus: 'pending',
  paymentMethod: null,
  paidAt: null,
  appointmentNotes: null,
  barber: {
    id: 'provider-1',
    tenantId: 'tenant-1',
    slug: 'joao',
    firstName: 'Joao',
    lastName: 'Silva',
    email: 'joao@example.com',
    password: 'hash',
    phone: '11999998888',
    avatarUrl: null,
    pixKey: null,
    messageTemplate: null,
    workspaceStartTime: '08:00',
    workspaceEndTime: '17:00',
    defaultSessionDurationMinutes: 60,
    isActive: true,
  },
  service: {
    id: 'service-1',
    slug: 'corte',
    name: 'Corte',
    icon: '✂️',
    priceCents: 3500,
    duration: 30,
    isActive: true,
    sortOrder: 1,
  },
  customer: {
    id: 'customer-1',
    name: 'Maria',
    phone: '11999997777',
    cpf: null,
    email: null,
    notes: null,
    psychotherapyPriceCents: null,
    psychotherapyFrequency: null,
    neuromodulationEligible: false,
    parentsMeetingStatus: null,
    birthDate: null,
    address: null,
  },
  package: {
    appointmentNumber: 4,
    totalUses: 4,
    totalPriceCents: 12000,
  },
  protocol: null,
} satisfies AppointmentWithDetails;

function makePackageRepo(overrides?: Partial<CustomerPackageRepository>) {
  return {
    findByIdForProvider: vi.fn().mockResolvedValue({
      id: 'pkg-1',
      tenantId: 'tenant-1',
      providerId: 'provider-1',
      customerName: 'Maria',
      customerPhone: '11999997777',
      totalUses: 4,
      usedCount: 4,
      totalPriceCents: 12000,
      status: 'active',
      createdAt: new Date('2026-06-01T00:00:00Z'),
      updatedAt: new Date('2026-06-01T00:00:00Z'),
    }),
    reevaluateLifecycle: vi.fn().mockResolvedValue({
      id: 'pkg-1',
      tenantId: 'tenant-1',
      providerId: 'provider-1',
      customerName: 'Maria',
      customerPhone: '11999997777',
      totalUses: 4,
      usedCount: 4,
      totalPriceCents: 12000,
      status: 'completed',
      createdAt: new Date('2026-06-01T00:00:00Z'),
      updatedAt: new Date('2026-06-16T12:00:00Z'),
    }),
    ...overrides,
  } as unknown as CustomerPackageRepository & {
    findByIdForProvider: ReturnType<typeof vi.fn>;
    reevaluateLifecycle: ReturnType<typeof vi.fn>;
  };
}

describe('PackageLifecycleManager', () => {
  it('sends the provider payment reminder only when a completed mutation closes the package', async () => {
    const packageRepo = makePackageRepo();
    const notifier = {
      sendPackagePaymentReminder: vi.fn().mockResolvedValue(undefined),
    };
    const manager = new PackageLifecycleManager(packageRepo, notifier);

    await manager.syncForAppointment({
      packageId: 'pkg-1',
      tenantId: 'tenant-1',
      providerId: 'provider-1',
      event: 'appointment_completed',
      appointment,
    });

    expect(packageRepo.reevaluateLifecycle).toHaveBeenCalledWith('pkg-1');
    expect(notifier.sendPackagePaymentReminder).toHaveBeenCalledWith(appointment, 12000);
  });

  it('still sends the provider payment reminder when the package was already marked completed before the last confirmed booking was finalized', async () => {
    const packageRepo = makePackageRepo({
      findByIdForProvider: vi.fn().mockResolvedValue({
        id: 'pkg-1',
        tenantId: 'tenant-1',
        providerId: 'provider-1',
        customerName: 'Maria',
        customerPhone: '11999997777',
        totalUses: 4,
        usedCount: 4,
        totalPriceCents: 12000,
        status: 'completed',
        createdAt: new Date('2026-06-01T00:00:00Z'),
        updatedAt: new Date('2026-06-16T11:00:00Z'),
      }),
    });
    const notifier = {
      sendPackagePaymentReminder: vi.fn().mockResolvedValue(undefined),
    };
    const manager = new PackageLifecycleManager(packageRepo, notifier);

    await manager.syncForAppointment({
      packageId: 'pkg-1',
      tenantId: 'tenant-1',
      providerId: 'provider-1',
      event: 'appointment_completed',
      appointment,
    });

    expect(packageRepo.reevaluateLifecycle).toHaveBeenCalledWith('pkg-1');
    expect(notifier.sendPackagePaymentReminder).toHaveBeenCalledWith(appointment, 12000);
  });

  it('does not send the provider payment reminder for no-show lifecycle completion paths', async () => {
    const packageRepo = makePackageRepo();
    const notifier = {
      sendPackagePaymentReminder: vi.fn().mockResolvedValue(undefined),
    };
    const manager = new PackageLifecycleManager(packageRepo, notifier);

    await manager.syncForAppointment({
      packageId: 'pkg-1',
      tenantId: 'tenant-1',
      providerId: 'provider-1',
      event: 'appointment_no_show',
      appointment,
    });

    expect(packageRepo.reevaluateLifecycle).toHaveBeenCalledWith('pkg-1');
    expect(notifier.sendPackagePaymentReminder).not.toHaveBeenCalled();
  });
});
