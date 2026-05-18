import type { CustomerEntity } from '../../../domain/entities/customer.js';
import type { CustomerRepository } from '../../../domain/repositories/customer.repository.js';
import { NotFoundError } from '../../../shared/errors.js';
import { normalizePatientCareProfile } from './patient-profile.utils.js';

export interface UpdatePatientInput {
  patientId: string;
  changes: Partial<Omit<CustomerEntity, 'id'>>;
}

export class UpdatePatientUseCase {
  constructor(private readonly customerRepo: CustomerRepository) {}

  async execute(input: UpdatePatientInput): Promise<CustomerEntity> {
    const currentPatient = await this.customerRepo.findById(input.patientId);
    if (!currentPatient) {
      throw new NotFoundError('Paciente');
    }

    const mergedProfile = normalizePatientCareProfile({
      careMode: input.changes.careMode ?? currentPatient.careMode,
      psychotherapyPriceCents:
        input.changes.psychotherapyPriceCents !== undefined
          ? input.changes.psychotherapyPriceCents
          : currentPatient.psychotherapyPriceCents,
      psychotherapyFrequency:
        input.changes.psychotherapyFrequency !== undefined
          ? input.changes.psychotherapyFrequency
          : currentPatient.psychotherapyFrequency,
    });

    return this.customerRepo.update(input.patientId, {
      ...input.changes,
      careMode: mergedProfile.careMode,
      psychotherapyPriceCents: mergedProfile.psychotherapyPriceCents,
      psychotherapyFrequency: mergedProfile.psychotherapyFrequency,
    });
  }
}
