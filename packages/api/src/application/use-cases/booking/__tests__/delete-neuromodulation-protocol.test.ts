import { describe, expect, it, vi } from 'vitest';
import type { NeuromodulationProtocolRepository } from '../../../../domain/repositories/neuromodulation-protocol.repository.js';
import type { NeuromodulationProtocolEntity } from '../../../../domain/entities/neuromodulation-protocol.js';
import { DeleteNeuromodulationProtocolUseCase } from '../delete-neuromodulation-protocol.js';

const finishedProtocol: NeuromodulationProtocolEntity = {
  id: 'protocol-1',
  tenantId: 'tenant-1',
  providerId: 'provider-1',
  customerId: 'patient-1',
  totalSessions: 20,
  status: 'finished',
  totalPriceCents: 200000,
  paymentStatus: 'paid',
  paidAmountCents: 200000,
  remainingAmountCents: 0,
  lastPaymentAt: new Date('2026-01-10T00:00:00Z'),
  payments: [],
  manualConsumedCount: 0,
  notes: null,
  createdAt: new Date('2026-01-01T00:00:00Z'),
  updatedAt: new Date('2026-01-01T00:00:00Z'),
};

describe('DeleteNeuromodulationProtocolUseCase', () => {
  it('deletes finished protocols without linked appointments', async () => {
    const protocolRepo: NeuromodulationProtocolRepository = {
      create: vi.fn(),
      addPayment: vi.fn(),
      updatePayment: vi.fn(),
      findById: vi.fn().mockResolvedValue(finishedProtocol),
      findWithCountersById: vi.fn(),
      findByCustomerId: vi.fn(),
      findCurrentByCustomerId: vi.fn(),
      update: vi.fn(),
      getUsageSnapshot: vi.fn(),
      countLinkedAppointments: vi.fn().mockResolvedValue(0),
      deleteById: vi.fn(),
    };

    const useCase = new DeleteNeuromodulationProtocolUseCase(protocolRepo);

    await useCase.execute({
      protocolId: finishedProtocol.id,
      providerId: finishedProtocol.providerId,
    });

    expect(protocolRepo.deleteById).toHaveBeenCalledWith(finishedProtocol.id);
  });

  it('rejects deletion when appointments are still linked', async () => {
    const protocolRepo: NeuromodulationProtocolRepository = {
      create: vi.fn(),
      addPayment: vi.fn(),
      updatePayment: vi.fn(),
      findById: vi.fn().mockResolvedValue(finishedProtocol),
      findWithCountersById: vi.fn(),
      findByCustomerId: vi.fn(),
      findCurrentByCustomerId: vi.fn(),
      update: vi.fn(),
      getUsageSnapshot: vi.fn(),
      countLinkedAppointments: vi.fn().mockResolvedValue(1),
      deleteById: vi.fn(),
    };

    const useCase = new DeleteNeuromodulationProtocolUseCase(protocolRepo);

    await expect(
      useCase.execute({
        protocolId: finishedProtocol.id,
        providerId: finishedProtocol.providerId,
      }),
    ).rejects.toMatchObject({
      message: 'Este protocolo não pode ser excluído porque possui sessões vinculadas.',
    });
  });

  it('rejects deletion for active protocols', async () => {
    const protocolRepo: NeuromodulationProtocolRepository = {
      create: vi.fn(),
      addPayment: vi.fn(),
      updatePayment: vi.fn(),
      findById: vi.fn().mockResolvedValue({ ...finishedProtocol, status: 'active' }),
      findWithCountersById: vi.fn(),
      findByCustomerId: vi.fn(),
      findCurrentByCustomerId: vi.fn(),
      update: vi.fn(),
      getUsageSnapshot: vi.fn(),
      countLinkedAppointments: vi.fn(),
      deleteById: vi.fn(),
    };

    const useCase = new DeleteNeuromodulationProtocolUseCase(protocolRepo);

    await expect(
      useCase.execute({
        protocolId: finishedProtocol.id,
        providerId: finishedProtocol.providerId,
      }),
    ).rejects.toMatchObject({
      message: 'Somente protocolos finalizados podem ser excluídos.',
    });
  });

  it('rejects deletion for maintenance protocols', async () => {
    const protocolRepo: NeuromodulationProtocolRepository = {
      create: vi.fn(),
      addPayment: vi.fn(),
      updatePayment: vi.fn(),
      findById: vi.fn().mockResolvedValue({ ...finishedProtocol, status: 'maintenance' }),
      findWithCountersById: vi.fn(),
      findByCustomerId: vi.fn(),
      findCurrentByCustomerId: vi.fn(),
      update: vi.fn(),
      getUsageSnapshot: vi.fn(),
      countLinkedAppointments: vi.fn(),
      deleteById: vi.fn(),
    };

    const useCase = new DeleteNeuromodulationProtocolUseCase(protocolRepo);

    await expect(
      useCase.execute({
        protocolId: finishedProtocol.id,
        providerId: finishedProtocol.providerId,
      }),
    ).rejects.toMatchObject({
      message: 'Somente protocolos finalizados podem ser excluídos.',
    });
  });
});
