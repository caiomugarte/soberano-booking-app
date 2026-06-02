export type PsychotherapyFrequency = 'weekly' | 'biweekly';
export type ParentsMeetingStatus = 'pending' | 'completed';
export type PatientCareSummary = 'psychotherapy' | 'neuromodulation' | 'dual_track';

export interface CustomerEntity {
  id: string;
  name: string;
  phone: string | null;
  cpf: string | null;
  email: string | null;
  notes: string | null;
  psychotherapyPriceCents: number | null;
  psychotherapyFrequency: PsychotherapyFrequency | null;
  neuromodulationEligible: boolean;
  parentsMeetingStatus: ParentsMeetingStatus | null;
  birthDate: Date | null;
  address: string | null;
}
