import type { RecurringAppointmentSeriesEntity } from '../entities/recurring-appointment-series.js';

export interface CreateRecurringAppointmentSeriesData {
  tenantId: string;
  providerId: string;
  customerId: string;
  serviceId: string;
  startDate: Date;
  startTime: string;
  endTime: string;
  intervalWeeks: number;
  priceCents?: number | null;
  notes?: string | null;
}

export interface RecurringAppointmentSeriesRepository {
  create(data: CreateRecurringAppointmentSeriesData): Promise<RecurringAppointmentSeriesEntity>;
  findById(id: string): Promise<RecurringAppointmentSeriesEntity | null>;
  findActive(): Promise<RecurringAppointmentSeriesEntity[]>;
  stop(id: string, stopDate: Date): Promise<RecurringAppointmentSeriesEntity>;
}
