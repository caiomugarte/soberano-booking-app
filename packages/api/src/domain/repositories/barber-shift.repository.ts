export interface BarberShiftEntity {
  id: string;
  barberId: string;
  dayOfWeek: number;
  startTime: string;
  endTime: string;
}

export interface BarberAbsenceEntity {
  id: string;
  barberId: string;
  date: Date;
  startTime: string | null;
  endTime: string | null;
  reason: string | null;
}

export interface BarberShiftRepository {
  findByBarberAndDay(barberId: string, dayOfWeek: number): Promise<BarberShiftEntity[]>;
  findAllByBarber(barberId: string): Promise<BarberShiftEntity[]>;
  replaceForBarber(barberId: string, shifts: Omit<BarberShiftEntity, 'id' | 'barberId'>[]): Promise<void>;

  findAbsencesByBarberAndDate(barberId: string, date: Date): Promise<BarberAbsenceEntity[]>;
  findAbsencesByBarber(barberId: string): Promise<BarberAbsenceEntity[]>;
  createAbsence(data: Omit<BarberAbsenceEntity, 'id'>): Promise<BarberAbsenceEntity>;
  deleteAbsence(id: string): Promise<void>;
}
