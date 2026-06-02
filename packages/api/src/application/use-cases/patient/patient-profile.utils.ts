import type {
  CustomerEntity,
  ParentsMeetingStatus,
  PatientCareSummary,
} from '../../../domain/entities/customer.js';
import { ValidationError } from '../../../shared/errors.js';

export interface PatientCareProfile {
  psychotherapyPriceCents: number | null;
  psychotherapyFrequency: CustomerEntity['psychotherapyFrequency'];
  neuromodulationEligible: boolean;
  parentsMeetingStatus: ParentsMeetingStatus | null;
}

export function normalizePatientCareProfile(profile: PatientCareProfile): PatientCareProfile {
  const psychotherapyRequested =
    profile.psychotherapyPriceCents !== null ||
    profile.psychotherapyFrequency !== null;

  if (psychotherapyRequested) {
    if (!profile.psychotherapyPriceCents || profile.psychotherapyPriceCents <= 0) {
      throw new ValidationError('Pacientes com psicoterapia precisam de um valor de sessão acordado.');
    }

    if (!profile.psychotherapyFrequency) {
      throw new ValidationError('Pacientes com psicoterapia precisam de uma frequência semanal ou quinzenal.');
    }
  }

  const normalizedPsychotherapyPriceCents =
    psychotherapyRequested ? profile.psychotherapyPriceCents : null;
  const normalizedPsychotherapyFrequency =
    psychotherapyRequested ? profile.psychotherapyFrequency : null;

  if (!normalizedPsychotherapyPriceCents && !profile.neuromodulationEligible) {
    throw new ValidationError('Ative psicoterapia, neuromodulação, ou ambos para salvar o paciente.');
  }

  return {
    psychotherapyPriceCents: normalizedPsychotherapyPriceCents,
    psychotherapyFrequency: normalizedPsychotherapyFrequency,
    neuromodulationEligible: profile.neuromodulationEligible,
    parentsMeetingStatus: profile.parentsMeetingStatus,
  };
}

export function hasPsychotherapyCareProfile(patient: Pick<
  CustomerEntity,
  'psychotherapyPriceCents' | 'psychotherapyFrequency'
>): boolean {
  return Boolean(patient.psychotherapyPriceCents && patient.psychotherapyFrequency);
}

export function getPatientCareSummary(patient: Pick<
  CustomerEntity,
  'psychotherapyPriceCents' | 'psychotherapyFrequency' | 'neuromodulationEligible'
>): PatientCareSummary {
  const hasPsychotherapy = hasPsychotherapyCareProfile(patient);

  if (hasPsychotherapy && patient.neuromodulationEligible) {
    return 'dual_track';
  }

  if (hasPsychotherapy) {
    return 'psychotherapy';
  }

  return 'neuromodulation';
}

export function isPatientMinorOnBusinessDate(
  birthDate: Date | null,
  businessDate: string,
): boolean {
  if (!birthDate) {
    return false;
  }

  const [referenceYear, referenceMonth, referenceDay] = businessDate.split('-').map(Number);
  const birthYear = birthDate.getUTCFullYear();
  const birthMonth = birthDate.getUTCMonth() + 1;
  const birthDay = birthDate.getUTCDate();

  let age = referenceYear - birthYear;
  const hadBirthdayThisYear =
    referenceMonth > birthMonth ||
    (referenceMonth === birthMonth && referenceDay >= birthDay);

  if (!hadBirthdayThisYear) {
    age -= 1;
  }

  return age < 18;
}

export function resolveParentsMeetingStatus(input: {
  birthDate: Date | null;
  parentsMeetingStatus: ParentsMeetingStatus | null;
  businessDate: string;
}): ParentsMeetingStatus | null {
  if (!isPatientMinorOnBusinessDate(input.birthDate, input.businessDate)) {
    return input.parentsMeetingStatus;
  }

  return input.parentsMeetingStatus ?? 'pending';
}
