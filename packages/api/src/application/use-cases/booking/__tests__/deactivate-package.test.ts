import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { AppointmentWithDetails } from '../../../../domain/entities/appointment.js';
import type { CustomerPackageDetailsEntity, CustomerPackageEntity } from '../../../../domain/entities/customer-package.js';
import type { AppointmentRepository } from '../../../../domain/repositories/appointment.repository.js';
import type { CustomerPackageRepository } from '../../../../domain/repositories/customer-package.repository.js';
import { DeactivatePackage } from '../deactivate-package.js';

const deactivatedPackage: CustomerPackageEntity = {
  id: 'pkg-1',
  tenantId: 'tenant-1',
  providerId: 'provider-1',
  customerName: 'Maria',
  customerPhone: '11999997777',
  totalUses: 5,
  usedCount: 2,
  totalPriceCents: 10000,
  status: 'cancelled',
  createdAt: new Date('2026-05-20T10:00:00Z'),
  updatedAt: new Date('2026-05-29T10:10:00Z'),
};

const appointment = {
  id: 'appt-future-confirmed',
  barberId: 'provider-1',
  serviceId: 'service-1',
  customerId: 'customer-1',
  packageId: 'pkg-1',
  protocolId: null,
  protocolCreditOutcome: null,
  recurringSeriesId: null,
  date: new Date('2026-05-30T00:00:00Z'),
  startTime: '08:00',
  endTime: '08:30',
  priceCents: 2000,
  status: 'confirmed',
  cancelToken: 'token',
  reminderSent: false,
  barberReminderSent: false,
  cancelledAt: null,
  createdAt: new Date('2026-05-28T12:00:00Z'),
  updatedAt: new Date('2026-05-28T12:00:00Z'),
  paymentStatus: 'pending',
  paymentMethod: null,
  paidAt: null,
  appointmentNotes: null,
  barber: {
    id: 'provider-1',
    tenantId: 'tenant-1',
    slug: 'zezinho',
    firstName: 'Zezinho',
    lastName: 'Pacotes',
    email: 'zezinho@example.com',
    password: 'hash',
    phone: '6186691888',
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
    slug: 'cabelo',
    name: 'Cabelo',
    icon: '✂️',
    priceCents: 2000,
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
    appointmentNumber: 1,
    totalUses: 5,
    totalPriceCents: 10000,
  },
  protocol: null,
} satisfies AppointmentWithDetails;

function makePackageDetails(): CustomerPackageDetailsEntity {
  return {
    ...deactivatedPackage,
    status: 'active',
    linkedAppointments: [
      {
        id: 'appt-future-confirmed',
        providerId: 'provider-1',
        date: new Date('2026-05-30T00:00:00Z'),
        startTime: '08:00',
        endTime: '08:30',
        status: 'confirmed',
        priceCents: 2000,
        service: {
          id: 'service-1',
          name: 'Cabelo',
          icon: '✂️',
        },
        customer: {
          id: 'customer-1',
          name: 'Maria',
          phone: '11999997777',
        },
        packageProgress: {
          appointmentNumber: 1,
          totalUses: 5,
          totalPriceCents: 10000,
        },
      },
      {
        id: 'appt-future-cancelled',
        providerId: 'provider-1',
        date: new Date('2026-05-30T00:00:00Z'),
        startTime: '10:00',
        endTime: '10:30',
        status: 'cancelled',
        priceCents: 2000,
        service: {
          id: 'service-1',
          name: 'Cabelo',
          icon: '✂️',
        },
        customer: {
          id: 'customer-1',
          name: 'Maria',
          phone: '11999997777',
        },
        packageProgress: {
          appointmentNumber: 2,
          totalUses: 5,
          totalPriceCents: 10000,
        },
      },
      {
        id: 'appt-past-confirmed',
        providerId: 'provider-1',
        date: new Date('2026-05-28T00:00:00Z'),
        startTime: '08:00',
        endTime: '08:30',
        status: 'confirmed',
        priceCents: 2000,
        service: {
          id: 'service-1',
          name: 'Cabelo',
          icon: '✂️',
        },
        customer: {
          id: 'customer-1',
          name: 'Maria',
          phone: '11999997777',
        },
        packageProgress: {
          appointmentNumber: 3,
          totalUses: 5,
          totalPriceCents: 10000,
        },
      },
    ],
  };
}

function makePackageRepo(overrides?: Partial<CustomerPackageRepository>) {
  return {
    findDetailsByIdForProvider: vi.fn().mockResolvedValue(makePackageDetails()),
    deactivate: vi.fn().mockResolvedValue(deactivatedPackage),
    ...overrides,
  } as unknown as CustomerPackageRepository & {
    findDetailsByIdForProvider: ReturnType<typeof vi.fn>;
    deactivate: ReturnType<typeof vi.fn>;
  };
}

function makeAppointmentRepo(overrides?: Partial<AppointmentRepository>) {
  return {
    findById: vi.fn().mockResolvedValue(appointment),
    ...overrides,
  } as unknown as AppointmentRepository & {
    findById: ReturnType<typeof vi.fn>;
  };
}

describe('DeactivatePackage', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-05-29T12:00:00Z'));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('notifies the customer for each future confirmed linked appointment cancelled by package deactivation', async () => {
    const packageRepo = makePackageRepo();
    const appointmentRepo = makeAppointmentRepo();
    const notifier = {
      sendBarberCancellationToCustomer: vi.fn().mockResolvedValue(undefined),
    };
    const useCase = new DeactivatePackage(packageRepo, appointmentRepo, notifier);

    const result = await useCase.execute({
      id: 'pkg-1',
      tenantId: 'tenant-1',
      providerId: 'provider-1',
      cancellationReason: 'O pacote vinculado a este agendamento foi desativado.',
    });

    expect(packageRepo.deactivate).toHaveBeenCalledWith('pkg-1', 'tenant-1', 'provider-1');
    expect(appointmentRepo.findById).toHaveBeenCalledTimes(1);
    expect(appointmentRepo.findById).toHaveBeenCalledWith('appt-future-confirmed');
    expect(notifier.sendBarberCancellationToCustomer).toHaveBeenCalledWith(
      appointment,
      'O pacote vinculado a este agendamento foi desativado.',
    );
    expect(result).toBe(deactivatedPackage);
  });

  it('skips customer notification when the package has no future confirmed linked appointments', async () => {
    const packageRepo = makePackageRepo({
      findDetailsByIdForProvider: vi.fn().mockResolvedValue({
        ...makePackageDetails(),
        linkedAppointments: [
          {
            ...makePackageDetails().linkedAppointments[1],
            id: 'appt-future-cancelled',
          },
          {
            ...makePackageDetails().linkedAppointments[2],
            id: 'appt-past-confirmed',
          },
        ],
      }),
    });
    const appointmentRepo = makeAppointmentRepo();
    const notifier = {
      sendBarberCancellationToCustomer: vi.fn().mockResolvedValue(undefined),
    };
    const useCase = new DeactivatePackage(packageRepo, appointmentRepo, notifier);

    await useCase.execute({
      id: 'pkg-1',
      tenantId: 'tenant-1',
      providerId: 'provider-1',
      cancellationReason: 'O pacote vinculado a este agendamento foi desativado.',
    });

    expect(appointmentRepo.findById).not.toHaveBeenCalled();
    expect(notifier.sendBarberCancellationToCustomer).not.toHaveBeenCalled();
  });
});
