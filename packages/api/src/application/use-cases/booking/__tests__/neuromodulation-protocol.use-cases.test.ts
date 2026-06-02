import { describe, expect, it, vi } from 'vitest'
import { CreateNeuromodulationProtocolUseCase } from '../create-neuromodulation-protocol.js'
import { UpdateNeuromodulationProtocolUseCase } from '../update-neuromodulation-protocol.js'
import { ChangeNeuromodulationProtocolStatusUseCase } from '../change-neuromodulation-protocol-status.js'
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
  paymentMethod: null,
  paidAt: null,
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
      findById: vi.fn(),
      findWithCountersById: vi.fn(),
      findByCustomerId: vi.fn(),
      findCurrentByCustomerId: vi.fn().mockResolvedValue(null),
      update: vi.fn(),
      getUsageSnapshot: vi.fn(),
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
    }

    const useCase = new ChangeNeuromodulationProtocolStatusUseCase(protocolRepo)

    await expect(useCase.execute({
      protocolId: activeProtocol.id,
      status: 'active',
    })).rejects.toBeInstanceOf(ValidationError)
  })
})
