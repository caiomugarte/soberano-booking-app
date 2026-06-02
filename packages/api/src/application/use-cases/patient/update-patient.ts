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
      psychotherapyPriceCents:
        input.changes.psychotherapyPriceCents !== undefined
          ? input.changes.psychotherapyPriceCents
          : currentPatient.psychotherapyPriceCents,
      psychotherapyFrequency:
        input.changes.psychotherapyFrequency !== undefined
          ? input.changes.psychotherapyFrequency
          : currentPatient.psychotherapyFrequency,
      neuromodulationEligible:
        input.changes.neuromodulationEligible ?? currentPatient.neuromodulationEligible,
      parentsMeetingStatus:
        input.changes.parentsMeetingStatus !== undefined
          ? input.changes.parentsMeetingStatus
          : currentPatient.parentsMeetingStatus,
    });

    return this.customerRepo.update(input.patientId, {
      ...input.changes,
      psychotherapyPriceCents: mergedProfile.psychotherapyPriceCents,
      psychotherapyFrequency: mergedProfile.psychotherapyFrequency,
      neuromodulationEligible: mergedProfile.neuromodulationEligible,
      parentsMeetingStatus: mergedProfile.parentsMeetingStatus,
    });
  }
}
