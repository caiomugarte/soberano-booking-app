import type { AppointmentStatus } from '@soberano/shared';
import type { BarberEntity } from './barber.js';
import type { ServiceEntity } from './service.js';
import type { CustomerEntity } from './customer.js';

export interface AppointmentEntity {
  id: string;
  barberId: string;
  serviceId: string;
  customerId: string;
  date: Date;
  startTime: string;
  endTime: string;
  priceCents: number;
  status: AppointmentStatus;
  cancelToken: string;
  reminderSent: boolean;
  barberReminderSent: boolean;
  cancelledAt: Date | null;
  createdAt: Date;
}

export interface AppointmentWithDetails extends AppointmentEntity {
  barber: BarberEntity;
  service: ServiceEntity;
  customer: CustomerEntity;
}
