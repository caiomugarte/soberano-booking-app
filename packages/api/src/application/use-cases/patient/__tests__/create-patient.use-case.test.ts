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
        psychotherapyPriceCents: data.psychotherapyPriceCents ?? null,
        psychotherapyFrequency: data.psychotherapyFrequency ?? null,
        neuromodulationEligible: data.neuromodulationEligible ?? false,
        parentsMeetingStatus: data.parentsMeetingStatus ?? null,
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
      psychotherapyPriceCents: 18000,
      psychotherapyFrequency: 'weekly',
      birthDate: new Date('1990-06-15T00:00:00Z'),
      address: 'Rua A, 123',
    });

    expect(created.psychotherapyPriceCents).toBe(18000);
    expect(created.psychotherapyFrequency).toBe('weekly');
    expect(customerRepo.create).toHaveBeenCalledWith(
      expect.objectContaining({
        psychotherapyPriceCents: 18000,
        psychotherapyFrequency: 'weekly',
        neuromodulationEligible: false,
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
        psychotherapyFrequency: 'weekly',
      }),
    ).rejects.toBeInstanceOf(ValidationError);
  });

  it('allows dual-track patients to keep psychotherapy data and neuromodulation eligibility together', async () => {
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
        psychotherapyPriceCents: data.psychotherapyPriceCents ?? null,
        psychotherapyFrequency: data.psychotherapyFrequency ?? null,
        neuromodulationEligible: data.neuromodulationEligible ?? false,
        parentsMeetingStatus: data.parentsMeetingStatus ?? null,
        birthDate: data.birthDate ?? null,
        address: data.address ?? null,
      })),
      update: vi.fn(),
      deleteById: vi.fn(),
    };

    const useCase = new CreatePatientUseCase(customerRepo);
    const created = await useCase.execute({
      tenantId: 'tenant-1',
      name: 'Paciente Dual',
      psychotherapyPriceCents: 21000,
      psychotherapyFrequency: 'biweekly',
      neuromodulationEligible: true,
      parentsMeetingStatus: 'pending',
    });

    expect(created.psychotherapyPriceCents).toBe(21000);
    expect(created.psychotherapyFrequency).toBe('biweekly');
    expect(created.neuromodulationEligible).toBe(true);
    expect(created.parentsMeetingStatus).toBe('pending');
    expect(customerRepo.create).toHaveBeenCalledWith(
      expect.objectContaining({
        psychotherapyPriceCents: 21000,
        psychotherapyFrequency: 'biweekly',
        neuromodulationEligible: true,
        parentsMeetingStatus: 'pending',
      }),
    );
  });

  it('allows neuromodulation-only patients without psychotherapy commercial fields', async () => {
    const customerRepo = {
      create: vi.fn().mockResolvedValue({
        id: 'patient-3',
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
      }),
    } as unknown as CustomerRepository;

    const useCase = new CreatePatientUseCase(customerRepo);
    const created = await useCase.execute({
      tenantId: 'tenant-1',
      name: 'Paciente Neuro',
      neuromodulationEligible: true,
    });

    expect(created.psychotherapyPriceCents).toBeNull();
    expect(created.psychotherapyFrequency).toBeNull();
    expect(created.neuromodulationEligible).toBe(true);
  });
});
