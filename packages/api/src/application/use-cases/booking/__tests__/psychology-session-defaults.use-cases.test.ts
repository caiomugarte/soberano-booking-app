import { describe, expect, it, vi } from 'vitest';
import type { AppointmentWithDetails } from '../../../../domain/entities/appointment.js';
import type { CustomerEntity } from '../../../../domain/entities/customer.js';
import type { ServiceEntity } from '../../../../domain/entities/service.js';
import type { AppointmentRepository } from '../../../../domain/repositories/appointment.repository.js';
import type { CustomerRepository } from '../../../../domain/repositories/customer.repository.js';
import type { NeuromodulationProtocolRepository } from '../../../../domain/repositories/neuromodulation-protocol.repository.js';
import type { ServiceRepository } from '../../../../domain/repositories/service.repository.js';
import { ValidationError } from '../../../../shared/errors.js';
import { CreatePsychologySessionUseCase } from '../create-psychology-session.js';
import { UpdatePsychologySessionUseCase } from '../update-psychology-session.js';

const psychotherapyPatient: CustomerEntity = {
  id: 'patient-1',
  name: 'Maria',
  phone: null,
  cpf: null,
  email: null,
  notes: null,
  careMode: 'psychotherapy',
  psychotherapyPriceCents: 22000,
  psychotherapyFrequency: 'biweekly',
  birthDate: null,
  address: null,
};

const psychotherapyService: ServiceEntity = {
  id: 'service-1',
  slug: 'psychotherapy',
  name: 'Psicoterapia',
  icon: '🧠',
  priceCents: 15000,
  duration: 50,
  isActive: true,
  sortOrder: 1,
};

const provider = {
  id: 'provider-1',
  tenantId: 'tenant-1',
  slug: 'bruno',
  firstName: 'Bruno',
  lastName: 'Morghetti',
  email: 'bruno@example.com',
  password: 'hash',
  phone: null,
  avatarUrl: null,
  pixKey: null,
  messageTemplate: null,
  isActive: true,
};

function makeAppointment(overrides: Partial<AppointmentWithDetails> = {}): AppointmentWithDetails {
  return {
    id: overrides.id ?? 'appointment-1',
    barberId: provider.id,
    serviceId: psychotherapyService.id,
    customerId: psychotherapyPatient.id,
    packageId: null,
    protocolId: null,
    protocolCreditOutcome: null,
    recurringSeriesId: null,
    date: overrides.date ?? new Date('2099-06-15T00:00:00Z'),
    startTime: overrides.startTime ?? '10:00',
    endTime: overrides.endTime ?? '10:50',
    priceCents: overrides.priceCents ?? 18000,
    status: overrides.status ?? 'scheduled',
    cancelToken: 'token-1',
    reminderSent: false,
    barberReminderSent: false,
    cancelledAt: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    paymentStatus: 'pending',
    paymentMethod: null,
    paidAt: null,
    appointmentNotes: null,
    barber: provider,
    service: psychotherapyService,
    customer: psychotherapyPatient,
    package: null,
    protocol: null,
    ...overrides,
  };
}

const emptyProtocolRepo = {
  create: vi.fn(),
  findById: vi.fn(),
  findWithCountersById: vi.fn(),
  findByCustomerId: vi.fn(),
  findCurrentByCustomerId: vi.fn(),
  update: vi.fn(),
  getUsageSnapshot: vi.fn(),
} as unknown as NeuromodulationProtocolRepository;

describe('Psychology session defaulting use cases', () => {
  it('defaults new psychotherapy sessions from the patient agreement instead of the service price', async () => {
    const appointmentRepo: AppointmentRepository = {
      create: vi.fn().mockImplementation(async (data) =>
        makeAppointment({
          priceCents: data.priceCents,
        }),
      ),
      findByCancelToken: vi.fn(),
      findById: vi.fn(),
      findBookedSlots: vi.fn(),
      findByBarberAndDate: vi.fn(),
      findUpcomingWithoutReminder: vi.fn(),
      updateStatus: vi.fn(),
      updateDateTime: vi.fn(),
      markReminderSent: vi.fn(),
      findUpcomingWithoutBarberReminder: vi.fn(),
      markBarberReminderSent: vi.fn(),
      getStatsByDateRange: vi.fn(),
      findByBarberAndDateRange: vi.fn().mockResolvedValue([]),
      findByRecurringSeriesId: vi.fn(),
      findUpcomingByCustomerPhone: vi.fn(),
      deleteFutureByRecurringSeriesId: vi.fn(),
      deleteById: vi.fn(),
      updateCustomer: vi.fn(),
      updatePaymentStatus: vi.fn(),
      getFinancialSummary: vi.fn(),
      updateDetails: vi.fn(),
      updateSchedule: vi.fn(),
    } as unknown as AppointmentRepository;
    const customerRepo = {
      findById: vi.fn().mockResolvedValue(psychotherapyPatient),
    } as unknown as CustomerRepository;
    const serviceRepo = {
      findBySlug: vi.fn().mockResolvedValue(psychotherapyService),
    } as unknown as ServiceRepository;

    const useCase = new CreatePsychologySessionUseCase(
      appointmentRepo,
      customerRepo,
      emptyProtocolRepo,
      serviceRepo,
    );

    const created = await useCase.execute({
      tenantId: 'tenant-1',
      providerId: provider.id,
      patientId: psychotherapyPatient.id,
      date: '2099-06-15',
      startTime: '10:00',
      type: 'psychotherapy',
    });

    expect(created.priceCents).toBe(22000);
    expect(appointmentRepo.create).toHaveBeenCalledWith(
      expect.objectContaining({
        priceCents: 22000,
      }),
    );
  });

  it('requires an explicit psychotherapy value when the patient has no stored agreement yet', async () => {
    const appointmentRepo = {
      findByBarberAndDateRange: vi.fn().mockResolvedValue([]),
    } as unknown as AppointmentRepository;
    const customerRepo = {
      findById: vi.fn().mockResolvedValue({
        ...psychotherapyPatient,
        psychotherapyPriceCents: null,
      }),
    } as unknown as CustomerRepository;
    const serviceRepo = {
      findBySlug: vi.fn().mockResolvedValue(psychotherapyService),
    } as unknown as ServiceRepository;

    const useCase = new CreatePsychologySessionUseCase(
      appointmentRepo,
      customerRepo,
      emptyProtocolRepo,
      serviceRepo,
    );

    await expect(
      useCase.execute({
        tenantId: 'tenant-1',
        providerId: provider.id,
        patientId: psychotherapyPatient.id,
        date: '2099-06-15',
        startTime: '10:00',
        type: 'psychotherapy',
      }),
    ).rejects.toBeInstanceOf(ValidationError);
  });

  it('keeps the stored appointment snapshot when a later patient agreement changes', async () => {
    const currentAppointment = makeAppointment({
      priceCents: 18000,
    });
    const appointmentRepo: AppointmentRepository = {
      create: vi.fn(),
      findByCancelToken: vi.fn(),
      findById: vi.fn().mockResolvedValue(currentAppointment),
      findBookedSlots: vi.fn(),
      findByBarberAndDate: vi.fn(),
      findUpcomingWithoutReminder: vi.fn(),
      updateStatus: vi.fn(),
      updateDateTime: vi.fn(),
      markReminderSent: vi.fn(),
      findUpcomingWithoutBarberReminder: vi.fn(),
      markBarberReminderSent: vi.fn(),
      getStatsByDateRange: vi.fn(),
      findByBarberAndDateRange: vi.fn().mockResolvedValue([]),
      findByRecurringSeriesId: vi.fn(),
      findUpcomingByCustomerPhone: vi.fn(),
      deleteFutureByRecurringSeriesId: vi.fn(),
      deleteById: vi.fn(),
      updateCustomer: vi.fn(),
      updatePaymentStatus: vi.fn(),
      getFinancialSummary: vi.fn(),
      updateDetails: vi.fn().mockImplementation(async (_id, data) =>
        makeAppointment({
          priceCents: data.priceCents,
          date: data.date,
          startTime: data.startTime,
          endTime: data.endTime,
          appointmentNotes: data.appointmentNotes ?? null,
        }),
      ),
      updateSchedule: vi.fn(),
    } as unknown as AppointmentRepository;
    const customerRepo = {
      findById: vi.fn().mockResolvedValue({
        ...psychotherapyPatient,
        psychotherapyPriceCents: 26000,
      }),
    } as unknown as CustomerRepository;
    const serviceRepo = {
      findBySlug: vi.fn(),
    } as unknown as ServiceRepository;

    const useCase = new UpdatePsychologySessionUseCase(
      appointmentRepo,
      customerRepo,
      emptyProtocolRepo,
      serviceRepo,
    );

    const updated = await useCase.execute({
      appointmentId: currentAppointment.id,
      providerId: provider.id,
      notes: 'Sessão mantida após reajuste',
    });

    expect(updated.priceCents).toBe(18000);
    expect(appointmentRepo.updateDetails).toHaveBeenCalledWith(
      currentAppointment.id,
      expect.objectContaining({
        priceCents: 18000,
      }),
    );
  });
});
