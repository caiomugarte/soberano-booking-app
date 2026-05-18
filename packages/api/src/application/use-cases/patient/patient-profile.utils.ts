import type { CustomerEntity } from '../../../domain/entities/customer.js';
import { ValidationError } from '../../../shared/errors.js';

export interface PatientCareProfile {
  careMode: CustomerEntity['careMode'];
  psychotherapyPriceCents: number | null;
  psychotherapyFrequency: CustomerEntity['psychotherapyFrequency'];
}

export function normalizePatientCareProfile(profile: PatientCareProfile): PatientCareProfile {
  if (profile.careMode === 'psychotherapy') {
    if (!profile.psychotherapyPriceCents || profile.psychotherapyPriceCents <= 0) {
      throw new ValidationError('Pacientes de psicoterapia precisam de um valor de sessão acordado.');
    }

    if (!profile.psychotherapyFrequency) {
      throw new ValidationError('Pacientes de psicoterapia precisam de uma frequência semanal ou quinzenal.');
    }

    return {
      careMode: 'psychotherapy',
      psychotherapyPriceCents: profile.psychotherapyPriceCents,
      psychotherapyFrequency: profile.psychotherapyFrequency,
    };
  }

  return {
    careMode: 'neuromodulation',
    psychotherapyPriceCents: null,
    psychotherapyFrequency: null,
  };
}
