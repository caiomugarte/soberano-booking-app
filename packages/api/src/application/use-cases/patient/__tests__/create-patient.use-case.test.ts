import { describe, expect, it, vi } from 'vitest';
import type { CustomerRepository } from '../../../../domain/repositories/customer.repository.js';
import { ValidationError } from '../../../../shared/errors.js';
import { CreatePatientUseCase } from '../create-patient.js';

describe('CreatePatientUseCase', () => {
  it('creates a psychotherapy patient with the agreed price and frequency', async () => {
    const customerRepo: CustomerRepository = {
      findByPhone: vi.fn(),
      findByCpf: vi.fn(),
      findByEmail: vi.fn(),
      findById: vi.fn(),
      upsertByPhone: vi.fn(),
      createWalkin: vi.fn(),
      updateName: vi.fn(),
      findAll: vi.fn(),
      create: vi.fn().mockImplementation(async (data) => ({
        id: 'patient-1',
        name: data.name,
        phone: data.phone ?? null,
        cpf: data.cpf ?? null,
        email: data.email ?? null,
        notes: data.notes ?? null,
        careMode: data.careMode ?? 'psychotherapy',
        psychotherapyPriceCents: data.psychotherapyPriceCents ?? null,
        psychotherapyFrequency: data.psychotherapyFrequency ?? null,
        birthDate: data.birthDate ?? null,
        address: data.address ?? null,
      })),
      update: vi.fn(),
      deleteById: vi.fn(),
    };

    const useCase = new CreatePatientUseCase(customerRepo);
    const created = await useCase.execute({
      tenantId: 'tenant-1',
      name: 'Maria',
      careMode: 'psychotherapy',
      psychotherapyPriceCents: 18000,
      psychotherapyFrequency: 'weekly',
      birthDate: new Date('1990-06-15T00:00:00Z'),
      address: 'Rua A, 123',
    });

    expect(created.careMode).toBe('psychotherapy');
    expect(created.psychotherapyPriceCents).toBe(18000);
    expect(created.psychotherapyFrequency).toBe('weekly');
    expect(customerRepo.create).toHaveBeenCalledWith(
      expect.objectContaining({
        careMode: 'psychotherapy',
        psychotherapyPriceCents: 18000,
        psychotherapyFrequency: 'weekly',
      }),
    );
  });

  it('rejects psychotherapy patients without an agreed price', async () => {
    const customerRepo = {
      create: vi.fn(),
    } as unknown as CustomerRepository;

    const useCase = new CreatePatientUseCase(customerRepo);

    await expect(
      useCase.execute({
        tenantId: 'tenant-1',
        name: 'Paciente',
        careMode: 'psychotherapy',
        psychotherapyFrequency: 'weekly',
      }),
    ).rejects.toBeInstanceOf(ValidationError);
  });

  it('allows neuromodulation patients without psychotherapy commercial fields', async () => {
    const customerRepo: CustomerRepository = {
      findByPhone: vi.fn(),
      findByCpf: vi.fn(),
      findByEmail: vi.fn(),
      findById: vi.fn(),
      upsertByPhone: vi.fn(),
      createWalkin: vi.fn(),
      updateName: vi.fn(),
      findAll: vi.fn(),
      create: vi.fn().mockImplementation(async (data) => ({
        id: 'patient-2',
        name: data.name,
        phone: data.phone ?? null,
        cpf: data.cpf ?? null,
        email: data.email ?? null,
        notes: data.notes ?? null,
        careMode: data.careMode ?? 'psychotherapy',
        psychotherapyPriceCents: data.psychotherapyPriceCents ?? null,
        psychotherapyFrequency: data.psychotherapyFrequency ?? null,
        birthDate: data.birthDate ?? null,
        address: data.address ?? null,
      })),
      update: vi.fn(),
      deleteById: vi.fn(),
    };

    const useCase = new CreatePatientUseCase(customerRepo);
    const created = await useCase.execute({
      tenantId: 'tenant-1',
      name: 'Paciente Neuro',
      careMode: 'neuromodulation',
    });

    expect(created.careMode).toBe('neuromodulation');
    expect(created.psychotherapyPriceCents).toBeNull();
    expect(created.psychotherapyFrequency).toBeNull();
    expect(customerRepo.create).toHaveBeenCalledWith(
      expect.objectContaining({
        careMode: 'neuromodulation',
        psychotherapyPriceCents: null,
        psychotherapyFrequency: null,
      }),
    );
  });
});
