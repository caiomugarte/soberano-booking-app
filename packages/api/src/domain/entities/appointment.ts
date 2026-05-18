import type { AppointmentStatus } from '@soberano/shared';
import type { BarberEntity } from './barber.js';
import type { ServiceEntity } from './service.js';
import type { CustomerEntity } from './customer.js';
import type { NeuromodulationProtocolStatus } from './neuromodulation-protocol.js';

export type AppointmentProtocolCreditOutcome =
  | 'reserved'
  | 'consumed'
  | 'released'
  | 'maintenance';

export interface AppointmentEntity {
  id: string;
  barberId: string;
  serviceId: string;
  customerId: string;
  packageId: string | null;
  protocolId: string | null;
  protocolCreditOutcome: AppointmentProtocolCreditOutcome | null;
  recurringSeriesId: string | null;
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
  updatedAt: Date;
  paymentStatus: 'pending' | 'paid';
  paymentMethod: 'card' | 'pix' | 'cash' | null;
  paidAt: Date | null;
  appointmentNotes: string | null;
}

export interface AppointmentWithDetails extends AppointmentEntity {
  barber: BarberEntity;
  service: ServiceEntity;
  customer: CustomerEntity;
  package: { appointmentNumber: number; totalUses: number; totalPriceCents: number } | null;
  protocol: {
    id: string;
    status: NeuromodulationProtocolStatus;
    totalSessions: number;
  } | null;
}
