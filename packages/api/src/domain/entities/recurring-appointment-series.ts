export type RecurringAppointmentSeriesStatus = 'active' | 'stopped';

export interface RecurringAppointmentSeriesEntity {
  id: string;
  tenantId: string;
  providerId: string;
  customerId: string;
  serviceId: string;
  startDate: Date;
  startTime: string;
  endTime: string;
  intervalWeeks: number;
  status: RecurringAppointmentSeriesStatus;
  stopDate: Date | null;
  priceCents: number | null;
  notes: string | null;
  createdAt: Date;
  updatedAt: Date;
}
