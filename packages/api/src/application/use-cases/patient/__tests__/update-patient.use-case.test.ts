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
  careMode: 'psychotherapy',
  psychotherapyPriceCents: 18000,
  psychotherapyFrequency: 'weekly',
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
        careMode: 'psychotherapy',
        psychotherapyPriceCents: 18000,
        psychotherapyFrequency: 'weekly',
        address: 'Rua B, 456',
      }),
    );
  });

  it('clears psychotherapy defaults when switching to neuromodulation', async () => {
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
        careMode: 'neuromodulation',
        psychotherapyPriceCents: null,
        psychotherapyFrequency: null,
      }),
      deleteById: vi.fn(),
    };

    const useCase = new UpdatePatientUseCase(customerRepo);
    const updated = await useCase.execute({
      patientId: psychotherapyPatient.id,
      changes: {
        careMode: 'neuromodulation',
      },
    });

    expect(updated.careMode).toBe('neuromodulation');
    expect(customerRepo.update).toHaveBeenCalledWith(
      psychotherapyPatient.id,
      expect.objectContaining({
        careMode: 'neuromodulation',
        psychotherapyPriceCents: null,
        psychotherapyFrequency: null,
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
        changes: { careMode: 'neuromodulation' },
      }),
    ).rejects.toBeInstanceOf(NotFoundError);
  });
});
