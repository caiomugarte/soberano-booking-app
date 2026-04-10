export interface ProviderShiftEntity {
  id: string;
  providerId: string;
  dayOfWeek: number;
  startTime: string;
  endTime: string;
}

export interface ProviderAbsenceEntity {
  id: string;
  providerId: string;
  date: Date;
  startTime: string | null;
  endTime: string | null;
  reason: string | null;
}

export interface ProviderShiftRepository {
  findByProviderAndDay(providerId: string, dayOfWeek: number): Promise<ProviderShiftEntity[]>;
  findAllByProvider(providerId: string): Promise<ProviderShiftEntity[]>;
  replaceForProvider(providerId: string, shifts: Omit<ProviderShiftEntity, 'id' | 'providerId'>[]): Promise<void>;

  findAbsencesByProviderAndDate(providerId: string, date: Date): Promise<ProviderAbsenceEntity[]>;
  findAbsencesByProvider(providerId: string): Promise<ProviderAbsenceEntity[]>;
  createAbsence(data: Omit<ProviderAbsenceEntity, 'id'>): Promise<ProviderAbsenceEntity>;
  deleteAbsence(id: string): Promise<void>;
}
