import type { CustomerEntity } from '../../../domain/entities/customer.js';
import type { CustomerRepository } from '../../../domain/repositories/customer.repository.js';
import { normalizePatientCareProfile } from './patient-profile.utils.js';

export interface CreatePatientInput {
  tenantId: string;
  name: string;
  phone?: string;
  email?: string;
  cpf?: string;
  notes?: string | null;
  careMode: CustomerEntity['careMode'];
  psychotherapyPriceCents?: number | null;
  psychotherapyFrequency?: CustomerEntity['psychotherapyFrequency'];
  birthDate?: Date | null;
  address?: string | null;
}

export class CreatePatientUseCase {
  constructor(private readonly customerRepo: CustomerRepository) {}

  async execute(input: CreatePatientInput): Promise<CustomerEntity> {
    const profile = normalizePatientCareProfile({
      careMode: input.careMode,
      psychotherapyPriceCents: input.psychotherapyPriceCents ?? null,
      psychotherapyFrequency: input.psychotherapyFrequency ?? null,
    });

    return this.customerRepo.create({
      tenantId: input.tenantId,
      name: input.name,
      phone: input.phone,
      email: input.email,
      cpf: input.cpf,
      notes: input.notes,
      birthDate: input.birthDate,
      address: input.address,
      careMode: profile.careMode,
      psychotherapyPriceCents: profile.psychotherapyPriceCents,
      psychotherapyFrequency: profile.psychotherapyFrequency,
    });
  }
}
