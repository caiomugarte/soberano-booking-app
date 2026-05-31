import { describe, it, expect, vi } from 'vitest';
import { AdminCreateAppointment } from '../admin-create-appointment.js';
import { ValidationError } from '../../../../shared/errors.js';
import type { AppointmentRepository } from '../../../../domain/repositories/appointment.repository.js';
import type { ServiceRepository } from '../../../../domain/repositories/service.repository.js';
import type { ProviderRepository } from '../../../../domain/repositories/provider.repository.js';
import type { CustomerRepository } from '../../../../domain/repositories/customer.repository.js';
import type { CustomerPackageRepository } from '../../../../domain/repositories/customer-package.repository.js';
import type { WhatsAppNotificationService } from '../../../../infrastructure/notifications/whatsapp-notification.service.js';
import type { AppointmentWithDetails } from '../../../../domain/entities/appointment.js';

const activeService = {
  id: 'svc-1', slug: 'corte', name: 'Corte', icon: '✂️',
  priceCents: 3500, duration: 30, isActive: true, sortOrder: 1, tenantId: 'tenant-1',
};

const activeBarber = {
  id: 'barber-1', slug: 'joao', firstName: 'João', lastName: 'Silva',
  email: 'joao@s.com', password: 'hash', phone: null, avatarUrl: null, isActive: true,
  tenantId: 'tenant-1',
};

const customer = { id: 'cust-1', name: 'Maria', phone: '11999998888', tenantId: 'tenant-1' };

const appointmentResult = {
  id: 'appt-1',
  tenantId: 'tenant-1',
  barberId: 'barber-1',
  serviceId: 'svc-1',
  customerId: 'cust-1',
  date: new Date('2026-06-16'),
  startTime: '10:00',
  endTime: '10:30',
  priceCents: 3500,
  status: 'confirmed',
  cancelToken: 'tok',
  reminderSent: false,
  cancelledAt: null,
  createdAt: new Date(),
  updatedAt: new Date(),
  barber: activeBarber,
  service: activeService,
  customer,
};

const activePackage = {
  id: 'pkg-1', tenantId: 'tenant-1', providerId: 'barber-1', customerName: 'Maria', customerPhone: '11999998888',
  totalUses: 5, usedCount: 1, totalPriceCents: 10000, status: 'active',
  createdAt: new Date(), updatedAt: new Date(),
};

const validInput = {
  tenantId: 'tenant-1',
  serviceId: 'svc-1',
  barberId: 'barber-1',
  date: '2026-06-16',
  startTime: '10:00',
  customerName: 'Maria',
  customerPhone: '11999998888',
  bookingUrl: 'https://example.com',
};

function makeUseCase(overrides?: {
  packageRepo?: Partial<CustomerPackageRepository>;
  notificationService?: Partial<WhatsAppNotificationService>;
}) {
  const serviceRepo = {
    findById: vi.fn().mockResolvedValue(activeService),
  } as unknown as ServiceRepository;

  const barberRepo = {
    findById: vi.fn().mockResolvedValue(activeBarber),
  } as unknown as ProviderRepository;

  const customerRepo = {
    upsertByPhone: vi.fn().mockResolvedValue(customer),
    createWalkin: vi.fn().mockResolvedValue(customer),
  } as unknown as CustomerRepository;

  const appointmentRepo = {
    create: vi.fn().mockResolvedValue(appointmentResult),
  } as unknown as AppointmentRepository;

  const notificationService = {
    sendBookingConfirmation: vi.fn().mockResolvedValue(undefined),
    notifyBarber: vi.fn().mockResolvedValue(undefined),
    ...overrides?.notificationService,
  } as unknown as WhatsAppNotificationService;

  const packageRepo = overrides?.packageRepo
    ? ({
        findByIdForProvider: vi.fn().mockResolvedValue(activePackage),
        incrementUsedCount: vi.fn().mockResolvedValue({ ...activePackage, usedCount: 2 }),
        reevaluateLifecycle: vi.fn().mockResolvedValue({ ...activePackage, usedCount: 2 }),
        ...overrides.packageRepo,
      } as unknown as CustomerPackageRepository)
    : undefined;

  return {
    useCase: new AdminCreateAppointment(appointmentRepo, serviceRepo, barberRepo, customerRepo, notificationService, packageRepo),
    appointmentRepo,
    packageRepo,
    notificationService,
  };
}

describe('AdminCreateAppointment — package credit', () => {
  it('creates appointment without touching packageRepo when packageId is absent', async () => {
    const { useCase, packageRepo } = makeUseCase({ packageRepo: {} });
    await useCase.execute(validInput);
    expect((packageRepo as unknown as { findByIdForProvider: ReturnType<typeof vi.fn> }).findByIdForProvider).not.toHaveBeenCalled();
    expect((packageRepo as unknown as { incrementUsedCount: ReturnType<typeof vi.fn> }).incrementUsedCount).not.toHaveBeenCalled();
    expect((packageRepo as unknown as { reevaluateLifecycle: ReturnType<typeof vi.fn> }).reevaluateLifecycle).not.toHaveBeenCalled();
  });

  it('increments and reevaluates the package lifecycle after appointment creation when packageId is valid', async () => {
    const { useCase, packageRepo } = makeUseCase({ packageRepo: {} });
    await useCase.execute({ ...validInput, packageId: 'pkg-1' });
    expect((packageRepo as unknown as { incrementUsedCount: ReturnType<typeof vi.fn> }).incrementUsedCount).toHaveBeenCalledWith('pkg-1');
    expect((packageRepo as unknown as { reevaluateLifecycle: ReturnType<typeof vi.fn> }).reevaluateLifecycle).toHaveBeenCalledWith('pkg-1');
  });

  it('throws ValidationError and does not create appointment when package status is completed', async () => {
    const { useCase, appointmentRepo } = makeUseCase({
      packageRepo: {
        findByIdForProvider: vi.fn().mockResolvedValue({ ...activePackage, status: 'completed' }),
      },
    });
    await expect(useCase.execute({ ...validInput, packageId: 'pkg-1' })).rejects.toBeInstanceOf(ValidationError);
    expect(appointmentRepo.create).not.toHaveBeenCalled();
  });

  it('throws ValidationError and does not create appointment when package belongs to another provider', async () => {
    const { useCase, appointmentRepo } = makeUseCase({
      packageRepo: {
        findByIdForProvider: vi.fn().mockResolvedValue(null),
      },
    });
    await expect(useCase.execute({ ...validInput, packageId: 'pkg-other-provider' })).rejects.toBeInstanceOf(ValidationError);
    expect(appointmentRepo.create).not.toHaveBeenCalled();
  });

  it('throws ValidationError and does not create appointment when package is not found', async () => {
    const { useCase, appointmentRepo } = makeUseCase({
      packageRepo: {
        findByIdForProvider: vi.fn().mockResolvedValue(null),
      },
    });
    await expect(useCase.execute({ ...validInput, packageId: 'pkg-missing' })).rejects.toBeInstanceOf(ValidationError);
    expect(appointmentRepo.create).not.toHaveBeenCalled();
  });

  it('throws ValidationError and does not create appointment when package has no remaining uses', async () => {
    const { useCase, appointmentRepo } = makeUseCase({
      packageRepo: {
        findByIdForProvider: vi.fn().mockResolvedValue({
          ...activePackage,
          usedCount: activePackage.totalUses,
        }),
      },
    });
    await expect(useCase.execute({ ...validInput, packageId: 'pkg-1' })).rejects.toBeInstanceOf(ValidationError);
    expect(appointmentRepo.create).not.toHaveBeenCalled();
  });

  it('sends confirmation without self-service link when packageId is present', async () => {
    const { useCase, notificationService } = makeUseCase({ packageRepo: {} });

    await useCase.execute({ ...validInput, packageId: 'pkg-1' });

    expect(
      notificationService.sendBookingConfirmation as unknown as ReturnType<typeof vi.fn>,
    ).toHaveBeenCalledWith(
      expect.any(Object) as AppointmentWithDetails,
      { includeManageLink: false },
    );
  });

  it('keeps existing confirmation behavior when packageId is absent', async () => {
    const { useCase, notificationService } = makeUseCase({ packageRepo: {} });

    await useCase.execute(validInput);

    expect(
      notificationService.sendBookingConfirmation as unknown as ReturnType<typeof vi.fn>,
    ).toHaveBeenCalledWith(
      expect.any(Object) as AppointmentWithDetails,
      { includeManageLink: true },
    );
  });
});
