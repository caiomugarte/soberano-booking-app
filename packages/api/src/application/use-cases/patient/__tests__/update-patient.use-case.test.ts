import { describe, expect, it, vi } from 'vitest';
import type { CustomerEntity } from '../../../../domain/entities/customer.js';
import type { CustomerRepository } from '../../../../domain/repositories/customer.repository.js';
import { NotFoundError, ValidationError } from '../../../../shared/errors.js';
import { UpdatePatientUseCase } from '../update-patient.js';

const psychotherapyPatient: CustomerEntity = {
  id: 'patient-1',
  name: 'Maria',
  phone: '67999999999',
  cpf: null,
  email: null,
  notes: null,
  psychotherapyPriceCents: 18000,
  psychotherapyFrequency: 'weekly',
  neuromodulationEligible: false,
  parentsMeetingStatus: null,
  birthDate: null,
  address: null,
};

describe('UpdatePatientUseCase', () => {
  it('updates a psychotherapy patient while preserving a valid care profile', async () => {
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
      update: vi.fn().mockResolvedValue({
        ...psychotherapyPatient,
        address: 'Rua B, 456',
      }),
      deleteById: vi.fn(),
    };

    const useCase = new UpdatePatientUseCase(customerRepo);
    const updated = await useCase.execute({
      patientId: psychotherapyPatient.id,
      changes: {
        address: 'Rua B, 456',
      },
    });

    expect(updated.address).toBe('Rua B, 456');
    expect(customerRepo.update).toHaveBeenCalledWith(
      psychotherapyPatient.id,
      expect.objectContaining({
        psychotherapyPriceCents: 18000,
        psychotherapyFrequency: 'weekly',
        neuromodulationEligible: false,
        address: 'Rua B, 456',
      }),
    );
  });

  it('enables dual-track care without clearing psychotherapy defaults', async () => {
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
      update: vi.fn().mockResolvedValue({
        ...psychotherapyPatient,
        neuromodulationEligible: true,
      }),
      deleteById: vi.fn(),
    };

    const useCase = new UpdatePatientUseCase(customerRepo);
    const updated = await useCase.execute({
      patientId: psychotherapyPatient.id,
      changes: {
        neuromodulationEligible: true,
      },
    });

    expect(updated.neuromodulationEligible).toBe(true);
    expect(customerRepo.update).toHaveBeenCalledWith(
      psychotherapyPatient.id,
      expect.objectContaining({
        psychotherapyPriceCents: 18000,
        psychotherapyFrequency: 'weekly',
        neuromodulationEligible: true,
      }),
    );
  });

  it('persists the parents meeting workflow state for underage patients', async () => {
    const customerRepo: CustomerRepository = {
      findByPhone: vi.fn(),
      findByCpf: vi.fn(),
      findByEmail: vi.fn(),
      findById: vi.fn().mockResolvedValue({
        ...psychotherapyPatient,
        birthDate: new Date('2012-06-15T00:00:00Z'),
      }),
      upsertByPhone: vi.fn(),
      createWalkin: vi.fn(),
      updateName: vi.fn(),
      findAll: vi.fn(),
      create: vi.fn(),
      update: vi.fn().mockResolvedValue({
        ...psychotherapyPatient,
        birthDate: new Date('2012-06-15T00:00:00Z'),
        parentsMeetingStatus: 'completed',
      }),
      deleteById: vi.fn(),
    };

    const useCase = new UpdatePatientUseCase(customerRepo);
    const updated = await useCase.execute({
      patientId: psychotherapyPatient.id,
      changes: {
        parentsMeetingStatus: 'completed',
      },
    });

    expect(updated.parentsMeetingStatus).toBe('completed');
    expect(customerRepo.update).toHaveBeenCalledWith(
      psychotherapyPatient.id,
      expect.objectContaining({
        parentsMeetingStatus: 'completed',
      }),
    );
  });

  it('rejects psychotherapy patients without a stored frequency after the update merge', async () => {
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
    };

    const useCase = new UpdatePatientUseCase(customerRepo);

    await expect(
      useCase.execute({
        patientId: psychotherapyPatient.id,
        changes: {
          psychotherapyFrequency: null,
        },
      }),
    ).rejects.toBeInstanceOf(ValidationError);
  });

  it('throws when the patient does not exist', async () => {
    const customerRepo = {
      findById: vi.fn().mockResolvedValue(null),
    } as unknown as CustomerRepository;

    const useCase = new UpdatePatientUseCase(customerRepo);

    await expect(
      useCase.execute({
        patientId: 'missing',
        changes: { neuromodulationEligible: true },
      }),
    ).rejects.toBeInstanceOf(NotFoundError);
  });
});
