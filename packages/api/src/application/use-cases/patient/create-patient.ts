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
  psychotherapyPriceCents?: number | null;
  psychotherapyFrequency?: CustomerEntity['psychotherapyFrequency'];
  neuromodulationEligible?: boolean;
  parentsMeetingStatus?: CustomerEntity['parentsMeetingStatus'];
  birthDate?: Date | null;
  address?: string | null;
}

export class CreatePatientUseCase {
  constructor(private readonly customerRepo: CustomerRepository) {}

  async execute(input: CreatePatientInput): Promise<CustomerEntity> {
    const profile = normalizePatientCareProfile({
      psychotherapyPriceCents: input.psychotherapyPriceCents ?? null,
      psychotherapyFrequency: input.psychotherapyFrequency ?? null,
      neuromodulationEligible: input.neuromodulationEligible ?? false,
      parentsMeetingStatus: input.parentsMeetingStatus ?? null,
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
      psychotherapyPriceCents: profile.psychotherapyPriceCents,
      psychotherapyFrequency: profile.psychotherapyFrequency,
      neuromodulationEligible: profile.neuromodulationEligible,
      parentsMeetingStatus: profile.parentsMeetingStatus,
    });
  }
}
