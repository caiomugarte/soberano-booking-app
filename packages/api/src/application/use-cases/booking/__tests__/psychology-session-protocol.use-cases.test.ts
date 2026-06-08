import { describe, expect, it, vi } from 'vitest'
import { CreatePsychologySessionUseCase } from '../create-psychology-session.js'
import { UpdatePsychologySessionUseCase } from '../update-psychology-session.js'
import { DeletePsychologySessionUseCase } from '../delete-psychology-session.js'
import type { AppointmentRepository } from '../../../../domain/repositories/appointment.repository.js'
import type { CustomerRepository } from '../../../../domain/repositories/customer.repository.js'
import type { NeuromodulationProtocolRepository } from '../../../../domain/repositories/neuromodulation-protocol.repository.js'
import type { ServiceRepository } from '../../../../domain/repositories/service.repository.js'
import type { AppointmentWithDetails } from '../../../../domain/entities/appointment.js'
import type { CustomerEntity } from '../../../../domain/entities/customer.js'
import type { NeuromodulationProtocolEntity } from '../../../../domain/entities/neuromodulation-protocol.js'
import type { ServiceEntity } from '../../../../domain/entities/service.js'
import { ValidationError } from '../../../../shared/errors.js'

const patient: CustomerEntity = {
  id: 'patient-1',
  name: 'Paciente Neuro',
  phone: null,
  cpf: null,
  email: null,
  notes: null,
  psychotherapyPriceCents: 18500,
  psychotherapyFrequency: 'weekly',
  neuromodulationEligible: true,
  parentsMeetingStatus: null,
  birthDate: null,
  address: null,
}

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
}

const service: ServiceEntity = {
  id: 'service-1',
  slug: 'neuromodulation',
  name: 'Neuromodulação',
  icon: '⚡',
  priceCents: 0,
  duration: 50,
  isActive: true,
  sortOrder: 1,
}

const protocol: NeuromodulationProtocolEntity = {
  id: 'protocol-1',
  tenantId: 'tenant-1',
  providerId: provider.id,
  customerId: patient.id,
  totalSessions: 10,
  status: 'active',
  totalPriceCents: 200000,
  paymentStatus: 'pending',
  paidAmountCents: 0,
  remainingAmountCents: 200000,
  lastPaymentAt: null,
  payments: [],
  manualConsumedCount: 0,
  notes: null,
  createdAt: new Date(),
  updatedAt: new Date(),
}

function makeAppointment(overrides: Partial<AppointmentWithDetails> = {}): AppointmentWithDetails {
  return {
    id: overrides.id ?? 'appointment-1',
    barberId: provider.id,
    serviceId: service.id,
    customerId: patient.id,
    packageId: null,
    protocolId: protocol.id,
    protocolCreditOutcome: 'reserved',
    recurringSeriesId: null,
    date: overrides.date ?? new Date('2099-06-15T00:00:00Z'),
    startTime: overrides.startTime ?? '10:00',
    endTime: overrides.endTime ?? '10:50',
    priceCents: overrides.priceCents ?? 0,
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
    service,
    customer: patient,
    package: null,
    protocol: { id: protocol.id, status: protocol.status, totalSessions: protocol.totalSessions },
    ...overrides,
  }
}

describe('Psychology session protocol credit use cases', () => {
  it('creates a linked neuromodulation session with a reserved credit and zero operational value', async () => {
    const appointmentRepo: AppointmentRepository = {
      create: vi.fn().mockImplementation(async (data) => makeAppointment({
        protocolId: data.protocolId ?? null,
        protocolCreditOutcome: data.protocolCreditOutcome ?? null,
        priceCents: data.priceCents,
      })),
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
    } as unknown as AppointmentRepository
    const customerRepo: CustomerRepository = {
      findByPhone: vi.fn(),
      findByCpf: vi.fn(),
      findByEmail: vi.fn(),
      findById: vi.fn().mockResolvedValue(patient),
      upsertByPhone: vi.fn(),
      createWalkin: vi.fn(),
      updateName: vi.fn(),
      findAll: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      deleteById: vi.fn(),
    }
    const protocolRepo: NeuromodulationProtocolRepository = {
      create: vi.fn(),
      addPayment: vi.fn(),
      updatePayment: vi.fn(),
      findById: vi.fn().mockResolvedValue(protocol),
      findWithCountersById: vi.fn(),
      findByCustomerId: vi.fn(),
      findCurrentByCustomerId: vi.fn(),
      update: vi.fn(),
      getUsageSnapshot: vi.fn().mockResolvedValue({
        reservedSessions: 0,
        consumedSessions: 0,
        remainingSessions: 10,
      }),
      countLinkedAppointments: vi.fn(),
      deleteById: vi.fn(),
    }
    const serviceRepo: ServiceRepository = {
      findAllActive: vi.fn(),
      findById: vi.fn(),
      findBySlug: vi.fn().mockResolvedValue(service),
    }

    const useCase = new CreatePsychologySessionUseCase(appointmentRepo, customerRepo, protocolRepo, serviceRepo)
    const result = await useCase.execute({
      tenantId: 'tenant-1',
      providerId: provider.id,
      patientId: patient.id,
      date: '2099-06-15',
      startTime: '10:00',
      type: 'neuromodulation',
      protocolId: protocol.id,
      valueCents: 6500,
    })

    expect(result.protocolId).toBe(protocol.id)
    expect(result.protocolCreditOutcome).toBe('reserved')
    expect(result.priceCents).toBe(0)
    expect(appointmentRepo.create).toHaveBeenCalledWith(
      expect.objectContaining({
        priceCents: 0,
      }),
    )
  })

  it('auto-finishes an active protocol when the last credit is consumed on creation', async () => {
    const appointmentRepo: AppointmentRepository = {
      create: vi.fn().mockImplementation(async (data) => makeAppointment({
        status: data.status,
        protocolId: data.protocolId ?? null,
        protocolCreditOutcome: data.protocolCreditOutcome ?? null,
        priceCents: data.priceCents,
      })),
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
    } as unknown as AppointmentRepository
    const customerRepo = {
      findById: vi.fn().mockResolvedValue(patient),
    } as unknown as CustomerRepository
    const protocolRepo = {
      findById: vi.fn().mockResolvedValue(protocol),
      getUsageSnapshot: vi.fn()
        .mockResolvedValueOnce({
          reservedSessions: 0,
          consumedSessions: 9,
          remainingSessions: 1,
        })
        .mockResolvedValueOnce({
          reservedSessions: 0,
          consumedSessions: 10,
          remainingSessions: 0,
        }),
      update: vi.fn().mockResolvedValue({ ...protocol, status: 'finished' }),
    } as unknown as NeuromodulationProtocolRepository
    const serviceRepo = {
      findBySlug: vi.fn().mockResolvedValue(service),
    } as unknown as ServiceRepository

    const useCase = new CreatePsychologySessionUseCase(appointmentRepo, customerRepo, protocolRepo, serviceRepo)
    const result = await useCase.execute({
      tenantId: 'tenant-1',
      providerId: provider.id,
      patientId: patient.id,
      date: '2099-06-15',
      startTime: '10:00',
      type: 'neuromodulation',
      status: 'completed',
      protocolId: protocol.id,
    })

    expect(result.protocolCreditOutcome).toBe('consumed')
    expect(protocolRepo.update).toHaveBeenCalledWith(protocol.id, {
      status: 'finished',
    })
  })

  it('does not auto-finish while the last credit is only reserved', async () => {
    const appointmentRepo: AppointmentRepository = {
      create: vi.fn().mockImplementation(async (data) => makeAppointment({
        protocolId: data.protocolId ?? null,
        protocolCreditOutcome: data.protocolCreditOutcome ?? null,
        priceCents: data.priceCents,
      })),
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
    } as unknown as AppointmentRepository
    const customerRepo = {
      findById: vi.fn().mockResolvedValue(patient),
    } as unknown as CustomerRepository
    const protocolRepo = {
      findById: vi.fn().mockResolvedValue(protocol),
      getUsageSnapshot: vi.fn()
        .mockResolvedValueOnce({
          reservedSessions: 0,
          consumedSessions: 9,
          remainingSessions: 1,
        })
        .mockResolvedValueOnce({
          reservedSessions: 1,
          consumedSessions: 9,
          remainingSessions: 0,
        }),
      update: vi.fn(),
    } as unknown as NeuromodulationProtocolRepository
    const serviceRepo = {
      findBySlug: vi.fn().mockResolvedValue(service),
    } as unknown as ServiceRepository

    const useCase = new CreatePsychologySessionUseCase(appointmentRepo, customerRepo, protocolRepo, serviceRepo)
    const result = await useCase.execute({
      tenantId: 'tenant-1',
      providerId: provider.id,
      patientId: patient.id,
      date: '2099-06-15',
      startTime: '10:00',
      type: 'neuromodulation',
      protocolId: protocol.id,
    })

    expect(result.protocolCreditOutcome).toBe('reserved')
    expect(protocolRepo.update).not.toHaveBeenCalled()
  })

  it('blocks linked bookings when the protocol has no remaining credits', async () => {
    const appointmentRepo = {
      findByBarberAndDateRange: vi.fn().mockResolvedValue([]),
    } as unknown as AppointmentRepository
    const customerRepo = {
      findById: vi.fn().mockResolvedValue(patient),
    } as unknown as CustomerRepository
    const protocolRepo = {
      findById: vi.fn().mockResolvedValue(protocol),
      getUsageSnapshot: vi.fn().mockResolvedValue({
        reservedSessions: 5,
        consumedSessions: 5,
        remainingSessions: 0,
      }),
    } as unknown as NeuromodulationProtocolRepository
    const serviceRepo = {
      findBySlug: vi.fn().mockResolvedValue(service),
    } as unknown as ServiceRepository

    const useCase = new CreatePsychologySessionUseCase(appointmentRepo, customerRepo, protocolRepo, serviceRepo)

    await expect(useCase.execute({
      tenantId: 'tenant-1',
      providerId: provider.id,
      patientId: patient.id,
      date: '2099-06-15',
      startTime: '10:00',
      type: 'neuromodulation',
      protocolId: protocol.id,
    })).rejects.toBeInstanceOf(ValidationError)
  })

  it('keeps an explicit operational value for maintenance appointments', async () => {
    const maintenanceProtocol = {
      ...protocol,
      id: 'protocol-2',
      status: 'maintenance' as const,
    }
    const appointmentRepo: AppointmentRepository = {
      create: vi.fn().mockImplementation(async (data) => makeAppointment({
        protocolId: data.protocolId ?? null,
        protocolCreditOutcome: data.protocolCreditOutcome ?? null,
        priceCents: data.priceCents,
        protocol: {
          id: maintenanceProtocol.id,
          status: maintenanceProtocol.status,
          totalSessions: maintenanceProtocol.totalSessions,
        },
      })),
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
    } as unknown as AppointmentRepository
    const customerRepo = {
      findById: vi.fn().mockResolvedValue(patient),
    } as unknown as CustomerRepository
    const protocolRepo = {
      findById: vi.fn().mockResolvedValue(maintenanceProtocol),
      getUsageSnapshot: vi.fn().mockResolvedValue({
        reservedSessions: 0,
        consumedSessions: 0,
        remainingSessions: 10,
      }),
    } as unknown as NeuromodulationProtocolRepository
    const serviceRepo = {
      findBySlug: vi.fn().mockResolvedValue(service),
    } as unknown as ServiceRepository

    const useCase = new CreatePsychologySessionUseCase(appointmentRepo, customerRepo, protocolRepo, serviceRepo)
    const result = await useCase.execute({
      tenantId: 'tenant-1',
      providerId: provider.id,
      patientId: patient.id,
      date: '2099-06-15',
      startTime: '10:00',
      type: 'neuromodulation',
      protocolId: maintenanceProtocol.id,
      valueCents: 9000,
    })

    expect(result.protocolCreditOutcome).toBe('maintenance')
    expect(result.priceCents).toBe(9000)
  })

  it('releases the reserved credit on cancellation when Bruno chooses release', async () => {
    const appointmentRepo = {
      findById: vi.fn().mockResolvedValue(makeAppointment()),
      findByBarberAndDateRange: vi.fn().mockResolvedValue([]),
      updateDetails: vi.fn().mockImplementation(async (_id, data) => makeAppointment({
        status: data.status,
        protocolCreditOutcome: data.protocolCreditOutcome,
      })),
    } as unknown as AppointmentRepository
    const customerRepo = {
      findById: vi.fn().mockResolvedValue(patient),
    } as unknown as CustomerRepository
    const protocolRepo = {
      findById: vi.fn().mockResolvedValue(protocol),
      getUsageSnapshot: vi.fn().mockResolvedValue({
        reservedSessions: 0,
        consumedSessions: 0,
        remainingSessions: 10,
      }),
      update: vi.fn(),
    } as unknown as NeuromodulationProtocolRepository
    const serviceRepo = {
      findBySlug: vi.fn().mockResolvedValue(service),
    } as unknown as ServiceRepository

    const useCase = new UpdatePsychologySessionUseCase(appointmentRepo, customerRepo, protocolRepo, serviceRepo)
    const result = await useCase.execute({
      appointmentId: 'appointment-1',
      providerId: provider.id,
      status: 'cancelled',
      protocolCreditAction: 'release',
    })

    expect(result.protocolCreditOutcome).toBe('released')
  })

  it('auto-finishes an active protocol when a linked session becomes no-show', async () => {
    const appointmentRepo = {
      findById: vi.fn().mockResolvedValue(makeAppointment()),
      findByBarberAndDateRange: vi.fn().mockResolvedValue([]),
      updateDetails: vi.fn().mockImplementation(async (_id, data) => makeAppointment({
        status: data.status,
        protocolCreditOutcome: data.protocolCreditOutcome,
      })),
    } as unknown as AppointmentRepository
    const customerRepo = {
      findById: vi.fn().mockResolvedValue(patient),
    } as unknown as CustomerRepository
    const protocolRepo = {
      findById: vi.fn().mockResolvedValue(protocol),
      getUsageSnapshot: vi.fn()
        .mockResolvedValueOnce({
          reservedSessions: 0,
          consumedSessions: 9,
          remainingSessions: 1,
        })
        .mockResolvedValueOnce({
          reservedSessions: 0,
          consumedSessions: 10,
          remainingSessions: 0,
        }),
      update: vi.fn().mockResolvedValue({ ...protocol, status: 'finished' }),
    } as unknown as NeuromodulationProtocolRepository
    const serviceRepo = {
      findBySlug: vi.fn().mockResolvedValue(service),
    } as unknown as ServiceRepository

    const useCase = new UpdatePsychologySessionUseCase(appointmentRepo, customerRepo, protocolRepo, serviceRepo)
    const result = await useCase.execute({
      appointmentId: 'appointment-1',
      providerId: provider.id,
      status: 'no_show',
    })

    expect(result.protocolCreditOutcome).toBe('consumed')
    expect(protocolRepo.update).toHaveBeenCalledWith(protocol.id, {
      status: 'finished',
    })
  })

  it('resets the stored operational value when an existing session becomes protocol-linked', async () => {
    const standaloneAppointment = makeAppointment({
      protocolId: null,
      protocolCreditOutcome: null,
      priceCents: 12000,
      protocol: null,
    })
    const appointmentRepo = {
      findById: vi.fn().mockResolvedValue(standaloneAppointment),
      findByBarberAndDateRange: vi.fn().mockResolvedValue([]),
      updateDetails: vi.fn().mockImplementation(async (_id, data) => makeAppointment({
        protocolId: data.protocolId ?? null,
        protocolCreditOutcome: data.protocolCreditOutcome ?? null,
        priceCents: data.priceCents,
      })),
    } as unknown as AppointmentRepository
    const customerRepo = {
      findById: vi.fn().mockResolvedValue(patient),
    } as unknown as CustomerRepository
    const protocolRepo = {
      findById: vi.fn().mockResolvedValue(protocol),
      getUsageSnapshot: vi.fn().mockResolvedValue({
        reservedSessions: 0,
        consumedSessions: 0,
        remainingSessions: 10,
      }),
      update: vi.fn(),
    } as unknown as NeuromodulationProtocolRepository
    const serviceRepo = {
      findBySlug: vi.fn().mockResolvedValue(service),
    } as unknown as ServiceRepository

    const useCase = new UpdatePsychologySessionUseCase(appointmentRepo, customerRepo, protocolRepo, serviceRepo)
    const result = await useCase.execute({
      appointmentId: standaloneAppointment.id,
      providerId: provider.id,
      protocolId: protocol.id,
    })

    expect(result.protocolId).toBe(protocol.id)
    expect(result.protocolCreditOutcome).toBe('reserved')
    expect(result.priceCents).toBe(0)
    expect(appointmentRepo.updateDetails).toHaveBeenCalledWith(
      standaloneAppointment.id,
      expect.objectContaining({
        priceCents: 0,
      }),
    )
  })

  it('auto-finishes the original protocol when Bruno unlinks a reserved session and keeps the credit consumed', async () => {
    const appointmentRepo = {
      findById: vi.fn().mockResolvedValue(makeAppointment()),
      findByBarberAndDateRange: vi.fn().mockResolvedValue([]),
      updateDetails: vi.fn().mockImplementation(async (_id, data) => makeAppointment({
        protocolId: data.protocolId ?? null,
        protocolCreditOutcome: data.protocolCreditOutcome ?? null,
        protocol: null,
        priceCents: data.priceCents ?? 9000,
      })),
    } as unknown as AppointmentRepository
    const customerRepo = {
      findById: vi.fn().mockResolvedValue(patient),
    } as unknown as CustomerRepository
    const protocolRepo = {
      findById: vi.fn().mockResolvedValue(protocol),
      getUsageSnapshot: vi.fn().mockResolvedValue({
        reservedSessions: 0,
        consumedSessions: 10,
        remainingSessions: 0,
      }),
      update: vi.fn().mockResolvedValue({ ...protocol, status: 'finished' }),
    } as unknown as NeuromodulationProtocolRepository
    const serviceRepo = {
      findBySlug: vi.fn().mockResolvedValue(service),
    } as unknown as ServiceRepository

    const useCase = new UpdatePsychologySessionUseCase(appointmentRepo, customerRepo, protocolRepo, serviceRepo)
    const result = await useCase.execute({
      appointmentId: 'appointment-1',
      providerId: provider.id,
      protocolId: null,
      protocolCreditAction: 'consume',
      valueCents: 9000,
    })

    expect(result.protocolId).toBeNull()
    expect(protocolRepo.update).toHaveBeenNthCalledWith(1, protocol.id, {
      manualConsumedCount: protocol.manualConsumedCount + 1,
    })
    expect(protocolRepo.update).toHaveBeenNthCalledWith(2, protocol.id, {
      status: 'finished',
    })
  })

  it('auto-finishes when Bruno deletes a reserved linked session and keeps the final credit consumed', async () => {
    const reservedAppointment = makeAppointment()
    const appointmentRepo = {
      findById: vi.fn().mockResolvedValue(reservedAppointment),
      deleteById: vi.fn(),
    } as unknown as AppointmentRepository
    const protocolRepo = {
      findById: vi.fn().mockResolvedValue(protocol),
      getUsageSnapshot: vi.fn().mockResolvedValue({
        reservedSessions: 0,
        consumedSessions: 10,
        remainingSessions: 0,
      }),
      update: vi.fn().mockResolvedValue({ ...protocol, status: 'finished' }),
    } as unknown as NeuromodulationProtocolRepository

    const useCase = new DeletePsychologySessionUseCase(appointmentRepo, protocolRepo)
    await useCase.execute({
      appointmentId: reservedAppointment.id,
      providerId: provider.id,
      protocolCreditAction: 'consume',
    })

    expect(protocolRepo.update).toHaveBeenNthCalledWith(1, protocol.id, {
      manualConsumedCount: protocol.manualConsumedCount + 1,
    })
    expect(protocolRepo.update).toHaveBeenNthCalledWith(2, protocol.id, {
      status: 'finished',
    })
  })

  it('stores manual consumption before deleting a consumed linked session', async () => {
    const consumedAppointment = makeAppointment({
      protocolCreditOutcome: 'consumed',
      status: 'completed',
    })
    const appointmentRepo = {
      findById: vi.fn().mockResolvedValue(consumedAppointment),
      deleteById: vi.fn(),
    } as unknown as AppointmentRepository
    const protocolRepo = {
      findById: vi.fn().mockResolvedValue(protocol),
      getUsageSnapshot: vi.fn().mockResolvedValue({
        reservedSessions: 0,
        consumedSessions: 1,
        remainingSessions: 9,
      }),
      update: vi.fn(),
    } as unknown as NeuromodulationProtocolRepository

    const useCase = new DeletePsychologySessionUseCase(appointmentRepo, protocolRepo)
    await useCase.execute({
      appointmentId: consumedAppointment.id,
      providerId: provider.id,
    })

    expect(protocolRepo.update).toHaveBeenCalledWith(protocol.id, {
      manualConsumedCount: protocol.manualConsumedCount + 1,
    })
    expect(protocolRepo.update).toHaveBeenCalledTimes(1)
  })
})
