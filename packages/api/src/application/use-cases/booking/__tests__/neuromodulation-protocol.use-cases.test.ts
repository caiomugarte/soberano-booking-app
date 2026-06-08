import { describe, expect, it, vi } from 'vitest'
import { CreateNeuromodulationProtocolUseCase } from '../create-neuromodulation-protocol.js'
import { UpdateNeuromodulationProtocolUseCase } from '../update-neuromodulation-protocol.js'
import { AddNeuromodulationProtocolPaymentUseCase } from '../add-neuromodulation-protocol-payment.js'
import { UpdateNeuromodulationProtocolPaymentUseCase } from '../update-neuromodulation-protocol-payment.js'
import { ChangeNeuromodulationProtocolStatusUseCase } from '../change-neuromodulation-protocol-status.js'
import { ListPatientNeuromodulationProtocolsUseCase } from '../list-patient-neuromodulation-protocols.js'
import type { CustomerRepository } from '../../../../domain/repositories/customer.repository.js'
import type { NeuromodulationProtocolRepository } from '../../../../domain/repositories/neuromodulation-protocol.repository.js'
import type { CustomerEntity } from '../../../../domain/entities/customer.js'
import type { NeuromodulationProtocolEntity, NeuromodulationProtocolWithCounters } from '../../../../domain/entities/neuromodulation-protocol.js'
import { ValidationError } from '../../../../shared/errors.js'

const neuromodulationPatient: CustomerEntity = {
  id: 'patient-1',
  name: 'Paciente Neuro',
  phone: null,
  cpf: null,
  email: null,
  notes: null,
  psychotherapyPriceCents: null,
  psychotherapyFrequency: null,
  neuromodulationEligible: true,
  parentsMeetingStatus: null,
  birthDate: null,
  address: null,
}

const psychotherapyPatient: CustomerEntity = {
  ...neuromodulationPatient,
  id: 'patient-2',
  psychotherapyPriceCents: 18000,
  psychotherapyFrequency: 'weekly',
  neuromodulationEligible: false,
}

const activeProtocol: NeuromodulationProtocolEntity = {
  id: 'protocol-1',
  tenantId: 'tenant-1',
  providerId: 'provider-1',
  customerId: neuromodulationPatient.id,
  totalSessions: 36,
  status: 'active',
  totalPriceCents: 360000,
  paymentStatus: 'pending',
  paidAmountCents: 0,
  remainingAmountCents: 360000,
  lastPaymentAt: null,
  payments: [],
  manualConsumedCount: 0,
  notes: null,
  createdAt: new Date('2026-01-01T00:00:00Z'),
  updatedAt: new Date('2026-01-01T00:00:00Z'),
}

function withCounters(protocol: NeuromodulationProtocolEntity, counters: Pick<NeuromodulationProtocolWithCounters, 'reservedSessions' | 'consumedSessions' | 'remainingSessions'>): NeuromodulationProtocolWithCounters {
  return {
    ...protocol,
    ...counters,
  }
}

describe('Neuromodulation protocol use cases', () => {
  it('keeps finished protocols in the patient history listing until Bruno deletes them', async () => {
    const finishedOlder = withCounters(
      {
        ...activeProtocol,
        id: 'protocol-finished-1',
        status: 'finished',
        createdAt: new Date('2026-01-10T00:00:00Z'),
      },
      {
        reservedSessions: 0,
        consumedSessions: 36,
        remainingSessions: 0,
      },
    )
    const maintenanceProtocol = withCounters(
      {
        ...activeProtocol,
        id: 'protocol-maintenance',
        status: 'maintenance',
        createdAt: new Date('2026-01-20T00:00:00Z'),
      },
      {
        reservedSessions: 0,
        consumedSessions: 36,
        remainingSessions: 0,
      },
    )
    const finishedNewer = withCounters(
      {
        ...activeProtocol,
        id: 'protocol-finished-2',
        status: 'finished',
        createdAt: new Date('2026-02-10T00:00:00Z'),
      },
      {
        reservedSessions: 0,
        consumedSessions: 36,
        remainingSessions: 0,
      },
    )
    const protocolRepo: NeuromodulationProtocolRepository = {
      create: vi.fn(),
      addPayment: vi.fn(),
      updatePayment: vi.fn(),
      findById: vi.fn(),
      findWithCountersById: vi.fn(),
      findByCustomerId: vi.fn().mockResolvedValue([
        finishedOlder,
        withCounters(activeProtocol, {
          reservedSessions: 2,
          consumedSessions: 10,
          remainingSessions: 24,
        }),
        finishedNewer,
        maintenanceProtocol,
      ]),
      findCurrentByCustomerId: vi.fn(),
      update: vi.fn(),
      getUsageSnapshot: vi.fn(),
      countLinkedAppointments: vi.fn(),
      deleteById: vi.fn(),
    }

    const useCase = new ListPatientNeuromodulationProtocolsUseCase(protocolRepo)
    const result = await useCase.execute(neuromodulationPatient.id)

    expect(result.map((item) => item.id)).toEqual([
      activeProtocol.id,
      maintenanceProtocol.id,
      finishedNewer.id,
      finishedOlder.id,
    ])
  })

  it('rejects protocol creation for psychotherapy patients', async () => {
    const customerRepo: CustomerRepository = {
      findByPhone: vi.fn(),
      findByCpf: vi.fn(),
      findByEmail: vi.fn(),
      findById: vi.fn().mockResolvedValue(psychotherapyPatient),
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
      findById: vi.fn(),
      findWithCountersById: vi.fn(),
      findByCustomerId: vi.fn(),
      findCurrentByCustomerId: vi.fn().mockResolvedValue(null),
      update: vi.fn(),
      getUsageSnapshot: vi.fn(),
      countLinkedAppointments: vi.fn(),
      deleteById: vi.fn(),
    }

    const useCase = new CreateNeuromodulationProtocolUseCase(customerRepo, protocolRepo)

    await expect(useCase.execute({
      tenantId: 'tenant-1',
      providerId: 'provider-1',
      customerId: psychotherapyPatient.id,
      totalSessions: 36,
      totalPriceCents: 360000,
    })).rejects.toBeInstanceOf(ValidationError)
  })

  it('blocks allowance edits below consumed or reserved usage', async () => {
    const customerRepo: CustomerRepository = {
      findByPhone: vi.fn(),
      findByCpf: vi.fn(),
      findByEmail: vi.fn(),
      findById: vi.fn().mockResolvedValue(neuromodulationPatient),
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
      findById: vi.fn().mockResolvedValue(activeProtocol),
      findWithCountersById: vi.fn(),
      findByCustomerId: vi.fn(),
      findCurrentByCustomerId: vi.fn().mockResolvedValue(activeProtocol),
      update: vi.fn(),
      getUsageSnapshot: vi.fn().mockResolvedValue({
        reservedSessions: 2,
        consumedSessions: 10,
        remainingSessions: 24,
      }),
      countLinkedAppointments: vi.fn(),
      deleteById: vi.fn(),
    }

    const useCase = new UpdateNeuromodulationProtocolUseCase(customerRepo, protocolRepo)

    await expect(useCase.execute({
      protocolId: activeProtocol.id,
      totalSessions: 9,
    })).rejects.toBeInstanceOf(ValidationError)
  })

  it('prevents reopening a finished protocol', async () => {
    const protocolRepo: NeuromodulationProtocolRepository = {
      create: vi.fn(),
      addPayment: vi.fn(),
      updatePayment: vi.fn(),
      findById: vi.fn().mockResolvedValue({ ...activeProtocol, status: 'finished' }),
      findWithCountersById: vi.fn().mockResolvedValue(withCounters({ ...activeProtocol, status: 'finished' }, {
        reservedSessions: 0,
        consumedSessions: 36,
        remainingSessions: 0,
      })),
      findByCustomerId: vi.fn(),
      findCurrentByCustomerId: vi.fn().mockResolvedValue(null),
      update: vi.fn(),
      getUsageSnapshot: vi.fn(),
      countLinkedAppointments: vi.fn(),
      deleteById: vi.fn(),
    }

    const useCase = new ChangeNeuromodulationProtocolStatusUseCase(protocolRepo)

    await expect(useCase.execute({
      protocolId: activeProtocol.id,
      status: 'active',
    })).rejects.toMatchObject({
      message: 'Protocolos finalizados devem permanecer no histórico. Crie um novo protocolo para retomar o cuidado.',
    })
  })

  it('creates a protocol with an initial partial payment without losing the open balance', async () => {
    const createdProtocol = {
      ...activeProtocol,
      paidAmountCents: 100000,
      remainingAmountCents: 260000,
      paymentStatus: 'partial' as const,
      lastPaymentAt: new Date('2026-01-03T00:00:00Z'),
      payments: [
        {
          id: 'payment-1',
          tenantId: 'tenant-1',
          protocolId: activeProtocol.id,
          amountCents: 100000,
          paymentMethod: 'pix' as const,
          paidAt: new Date('2026-01-03T00:00:00Z'),
          createdAt: new Date('2026-01-03T00:00:00Z'),
          updatedAt: new Date('2026-01-03T00:00:00Z'),
        },
      ],
    }
    const customerRepo: CustomerRepository = {
      findByPhone: vi.fn(),
      findByCpf: vi.fn(),
      findByEmail: vi.fn(),
      findById: vi.fn().mockResolvedValue(neuromodulationPatient),
      upsertByPhone: vi.fn(),
      createWalkin: vi.fn(),
      updateName: vi.fn(),
      findAll: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      deleteById: vi.fn(),
    }
    const protocolRepo: NeuromodulationProtocolRepository = {
      create: vi.fn().mockResolvedValue(activeProtocol),
      addPayment: vi.fn(),
      updatePayment: vi.fn(),
      findById: vi.fn(),
      findWithCountersById: vi.fn().mockResolvedValue(withCounters(createdProtocol, {
        reservedSessions: 0,
        consumedSessions: 0,
        remainingSessions: 36,
      })),
      findByCustomerId: vi.fn(),
      findCurrentByCustomerId: vi.fn().mockResolvedValue(null),
      update: vi.fn(),
      getUsageSnapshot: vi.fn(),
      countLinkedAppointments: vi.fn(),
      deleteById: vi.fn(),
    }

    const useCase = new CreateNeuromodulationProtocolUseCase(customerRepo, protocolRepo)

    const result = await useCase.execute({
      tenantId: 'tenant-1',
      providerId: 'provider-1',
      customerId: neuromodulationPatient.id,
      totalSessions: 36,
      totalPriceCents: 360000,
      initialPayment: {
        amountCents: 100000,
        paymentMethod: 'pix',
        paidAt: new Date('2026-01-03T00:00:00Z'),
      },
    })

    expect(protocolRepo.create).toHaveBeenCalledWith(expect.objectContaining({
      initialPayment: {
        amountCents: 100000,
        paymentMethod: 'pix',
        paidAt: new Date('2026-01-03T00:00:00Z'),
      },
    }))
    expect(result.paymentStatus).toBe('partial')
    expect(result.paidAmountCents).toBe(100000)
    expect(result.remainingAmountCents).toBe(260000)
  })

  it('registers the final payment and returns the updated paid protocol state', async () => {
    const partiallyPaidProtocol: NeuromodulationProtocolEntity = {
      ...activeProtocol,
      paymentStatus: 'partial',
      paidAmountCents: 100000,
      remainingAmountCents: 260000,
      lastPaymentAt: new Date('2026-01-03T00:00:00Z'),
      payments: [
        {
          id: 'payment-1',
          tenantId: 'tenant-1',
          protocolId: activeProtocol.id,
          amountCents: 100000,
          paymentMethod: 'pix',
          paidAt: new Date('2026-01-03T00:00:00Z'),
          createdAt: new Date('2026-01-03T00:00:00Z'),
          updatedAt: new Date('2026-01-03T00:00:00Z'),
        },
      ],
    }
    const settledProtocol = withCounters(
      {
        ...partiallyPaidProtocol,
        paymentStatus: 'paid',
        paidAmountCents: 360000,
        remainingAmountCents: 0,
        lastPaymentAt: new Date('2026-01-10T00:00:00Z'),
        payments: [
          ...partiallyPaidProtocol.payments,
          {
            id: 'payment-2',
            tenantId: 'tenant-1',
            protocolId: activeProtocol.id,
            amountCents: 260000,
            paymentMethod: 'card',
            paidAt: new Date('2026-01-10T00:00:00Z'),
            createdAt: new Date('2026-01-10T00:00:00Z'),
            updatedAt: new Date('2026-01-10T00:00:00Z'),
          },
        ],
      },
      {
        reservedSessions: 1,
        consumedSessions: 12,
        remainingSessions: 23,
      },
    )
    const protocolRepo: NeuromodulationProtocolRepository = {
      create: vi.fn(),
      addPayment: vi.fn().mockResolvedValue(settledProtocol.payments[1]),
      updatePayment: vi.fn(),
      findById: vi.fn().mockResolvedValue(partiallyPaidProtocol),
      findWithCountersById: vi.fn().mockResolvedValue(settledProtocol),
      findByCustomerId: vi.fn(),
      findCurrentByCustomerId: vi.fn(),
      update: vi.fn(),
      getUsageSnapshot: vi.fn(),
      countLinkedAppointments: vi.fn(),
      deleteById: vi.fn(),
    }

    const useCase = new AddNeuromodulationProtocolPaymentUseCase(protocolRepo)
    const result = await useCase.execute({
      tenantId: 'tenant-1',
      protocolId: activeProtocol.id,
      amountCents: 260000,
      paymentMethod: 'card',
      paidAt: new Date('2026-01-10T00:00:00Z'),
    })

    expect(protocolRepo.addPayment).toHaveBeenCalledWith(activeProtocol.id, 'tenant-1', {
      amountCents: 260000,
      paymentMethod: 'card',
      paidAt: new Date('2026-01-10T00:00:00Z'),
    })
    expect(result.paymentStatus).toBe('paid')
    expect(result.remainingAmountCents).toBe(0)
  })

  it('rejects protocol overpayments when adding a new ledger entry', async () => {
    const partiallyPaidProtocol: NeuromodulationProtocolEntity = {
      ...activeProtocol,
      paymentStatus: 'partial',
      paidAmountCents: 300000,
      remainingAmountCents: 60000,
      lastPaymentAt: new Date('2026-01-03T00:00:00Z'),
      payments: [
        {
          id: 'payment-1',
          tenantId: 'tenant-1',
          protocolId: activeProtocol.id,
          amountCents: 300000,
          paymentMethod: 'pix',
          paidAt: new Date('2026-01-03T00:00:00Z'),
          createdAt: new Date('2026-01-03T00:00:00Z'),
          updatedAt: new Date('2026-01-03T00:00:00Z'),
        },
      ],
    }
    const protocolRepo: NeuromodulationProtocolRepository = {
      create: vi.fn(),
      addPayment: vi.fn(),
      updatePayment: vi.fn(),
      findById: vi.fn().mockResolvedValue(partiallyPaidProtocol),
      findWithCountersById: vi.fn(),
      findByCustomerId: vi.fn(),
      findCurrentByCustomerId: vi.fn(),
      update: vi.fn(),
      getUsageSnapshot: vi.fn(),
      countLinkedAppointments: vi.fn(),
      deleteById: vi.fn(),
    }

    const useCase = new AddNeuromodulationProtocolPaymentUseCase(protocolRepo)

    await expect(useCase.execute({
      tenantId: 'tenant-1',
      protocolId: activeProtocol.id,
      amountCents: 70000,
      paymentMethod: 'cash',
      paidAt: new Date('2026-01-10T00:00:00Z'),
    })).rejects.toBeInstanceOf(ValidationError)

    expect(protocolRepo.addPayment).not.toHaveBeenCalled()
  })

  it('edits an existing payment entry and keeps the protocol within the sold total', async () => {
    const partiallyPaidProtocol: NeuromodulationProtocolEntity = {
      ...activeProtocol,
      paymentStatus: 'partial',
      paidAmountCents: 300000,
      remainingAmountCents: 60000,
      lastPaymentAt: new Date('2026-01-10T00:00:00Z'),
      payments: [
        {
          id: 'payment-1',
          tenantId: 'tenant-1',
          protocolId: activeProtocol.id,
          amountCents: 100000,
          paymentMethod: 'pix',
          paidAt: new Date('2026-01-03T00:00:00Z'),
          createdAt: new Date('2026-01-03T00:00:00Z'),
          updatedAt: new Date('2026-01-03T00:00:00Z'),
        },
        {
          id: 'payment-2',
          tenantId: 'tenant-1',
          protocolId: activeProtocol.id,
          amountCents: 200000,
          paymentMethod: 'card',
          paidAt: new Date('2026-01-10T00:00:00Z'),
          createdAt: new Date('2026-01-10T00:00:00Z'),
          updatedAt: new Date('2026-01-10T00:00:00Z'),
        },
      ],
    }
    const updatedProtocol = withCounters(
      {
        ...partiallyPaidProtocol,
        paidAmountCents: 280000,
        remainingAmountCents: 80000,
        lastPaymentAt: new Date('2026-01-11T00:00:00Z'),
        payments: [
          partiallyPaidProtocol.payments[0],
          {
            ...partiallyPaidProtocol.payments[1],
            amountCents: 180000,
            paymentMethod: 'cash',
            paidAt: new Date('2026-01-11T00:00:00Z'),
          },
        ],
      },
      {
        reservedSessions: 0,
        consumedSessions: 12,
        remainingSessions: 24,
      },
    )
    const protocolRepo: NeuromodulationProtocolRepository = {
      create: vi.fn(),
      addPayment: vi.fn(),
      updatePayment: vi.fn().mockResolvedValue(updatedProtocol.payments[1]),
      findById: vi.fn().mockResolvedValue(partiallyPaidProtocol),
      findWithCountersById: vi.fn().mockResolvedValue(updatedProtocol),
      findByCustomerId: vi.fn(),
      findCurrentByCustomerId: vi.fn(),
      update: vi.fn(),
      getUsageSnapshot: vi.fn(),
      countLinkedAppointments: vi.fn(),
      deleteById: vi.fn(),
    }

    const useCase = new UpdateNeuromodulationProtocolPaymentUseCase(protocolRepo)
    const result = await useCase.execute({
      protocolId: activeProtocol.id,
      paymentId: 'payment-2',
      amountCents: 180000,
      paymentMethod: 'cash',
      paidAt: new Date('2026-01-11T00:00:00Z'),
    })

    expect(protocolRepo.updatePayment).toHaveBeenCalledWith('payment-2', {
      amountCents: 180000,
      paymentMethod: 'cash',
      paidAt: new Date('2026-01-11T00:00:00Z'),
    })
    expect(result.paidAmountCents).toBe(280000)
    expect(result.remainingAmountCents).toBe(80000)
  })

  it('rejects payment edits that would push the protocol above the sold total', async () => {
    const partiallyPaidProtocol: NeuromodulationProtocolEntity = {
      ...activeProtocol,
      paymentStatus: 'partial',
      paidAmountCents: 300000,
      remainingAmountCents: 60000,
      lastPaymentAt: new Date('2026-01-10T00:00:00Z'),
      payments: [
        {
          id: 'payment-1',
          tenantId: 'tenant-1',
          protocolId: activeProtocol.id,
          amountCents: 100000,
          paymentMethod: 'pix',
          paidAt: new Date('2026-01-03T00:00:00Z'),
          createdAt: new Date('2026-01-03T00:00:00Z'),
          updatedAt: new Date('2026-01-03T00:00:00Z'),
        },
        {
          id: 'payment-2',
          tenantId: 'tenant-1',
          protocolId: activeProtocol.id,
          amountCents: 200000,
          paymentMethod: 'card',
          paidAt: new Date('2026-01-10T00:00:00Z'),
          createdAt: new Date('2026-01-10T00:00:00Z'),
          updatedAt: new Date('2026-01-10T00:00:00Z'),
        },
      ],
    }
    const protocolRepo: NeuromodulationProtocolRepository = {
      create: vi.fn(),
      addPayment: vi.fn(),
      updatePayment: vi.fn(),
      findById: vi.fn().mockResolvedValue(partiallyPaidProtocol),
      findWithCountersById: vi.fn(),
      findByCustomerId: vi.fn(),
      findCurrentByCustomerId: vi.fn(),
      update: vi.fn(),
      getUsageSnapshot: vi.fn(),
      countLinkedAppointments: vi.fn(),
      deleteById: vi.fn(),
    }

    const useCase = new UpdateNeuromodulationProtocolPaymentUseCase(protocolRepo)

    await expect(useCase.execute({
      protocolId: activeProtocol.id,
      paymentId: 'payment-2',
      amountCents: 300000,
      paymentMethod: 'card',
      paidAt: new Date('2026-01-10T00:00:00Z'),
    })).rejects.toBeInstanceOf(ValidationError)

    expect(protocolRepo.updatePayment).not.toHaveBeenCalled()
  })
})
