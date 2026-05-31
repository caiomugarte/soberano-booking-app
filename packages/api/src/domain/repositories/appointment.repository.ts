import type { AppointmentWithDetails } from '../entities/appointment.js';
import type { NeuromodulationProtocolWithCounters, ProtocolPaymentMethod, ProtocolPaymentStatus } from '../entities/neuromodulation-protocol.js';

export interface FinancialSummary {
  totalSessions: number;
  paidCount: number;
  pendingCount: number;
  revenueCents: number;
  appointments: AppointmentWithDetails[];
  protocolSales: Array<{
    protocol: NeuromodulationProtocolWithCounters;
    customer: {
      id: string;
      name: string;
      phone: string | null;
    };
  }>;
}

export interface CreateAppointmentData {
  tenantId: string;
  barberId: string;
  serviceId: string;
  customerId: string;
  packageId?: string;
  protocolId?: string;
  protocolCreditOutcome?: 'reserved' | 'consumed' | 'released' | 'maintenance' | null;
  recurringSeriesId?: string;
  date: Date;
  startTime: string;
  endTime: string;
  priceCents: number;
  cancelToken: string;
  status?: string;
  paymentStatus?: string;
  paymentMethod?: string | null;
  paidAt?: Date | null;
  appointmentNotes?: string | null;
}

export interface DayStat {
  date: string;
  confirmed: number;
  completed: number;
  revenueCents: number;
}

export interface AppointmentRepository {
  create(data: CreateAppointmentData): Promise<AppointmentWithDetails>;
  findByCancelToken(token: string): Promise<AppointmentWithDetails | null>;
  findById(id: string): Promise<AppointmentWithDetails | null>;
  findBookedSlots(barberId: string, date: Date, excludeId?: string): Promise<string[]>;
  findByBarberAndDate(barberId: string, date: Date): Promise<{ appointments: AppointmentWithDetails[]; total: number; summary: { confirmed: number; completed: number; revenueCents: number } }>;
  findUpcomingWithoutReminder(minutesAhead: number): Promise<AppointmentWithDetails[]>;
  updateStatus(id: string, status: string, cancelledAt?: Date): Promise<void>;
  updateDateTime(id: string, date: Date, startTime: string, endTime: string, cancelToken: string): Promise<AppointmentWithDetails>;
  markReminderSent(id: string): Promise<void>;
  findUpcomingWithoutBarberReminder(minutesAhead: number): Promise<AppointmentWithDetails[]>;
  markBarberReminderSent(id: string): Promise<void>;
  getStatsByDateRange(barberId: string, from: Date, to: Date): Promise<DayStat[]>;
  findByBarberAndDateRange(barberId: string, from: Date, to: Date): Promise<AppointmentWithDetails[]>;
  findByRecurringSeriesId(recurringSeriesId: string, from: Date, to?: Date): Promise<AppointmentWithDetails[]>;
  findUpcomingByCustomerPhone(phone: string): Promise<AppointmentWithDetails | null>;
  deleteFutureByRecurringSeriesId(recurringSeriesId: string, from: Date): Promise<number>;
  deleteById(id: string): Promise<void>;
  updateCustomer(id: string, customerId: string): Promise<void>;
  updatePaymentStatus(id: string, paidAt: Date): Promise<AppointmentWithDetails>;
  getFinancialSummary(providerId: string, from: Date, to: Date): Promise<FinancialSummary>;
  updateDetails(id: string, data: {
    customerId?: string;
    serviceId?: string;
    protocolId?: string | null;
    protocolCreditOutcome?: 'reserved' | 'consumed' | 'released' | 'maintenance' | null;
    date?: Date;
    startTime?: string;
    endTime?: string;
    priceCents?: number;
    status?: string;
    paymentStatus?: ProtocolPaymentStatus;
    paymentMethod?: ProtocolPaymentMethod | null;
    paidAt?: Date | null;
    appointmentNotes?: string | null;
    cancelToken?: string;
    reminderSent?: boolean;
    barberReminderSent?: boolean;
  }): Promise<AppointmentWithDetails>;
  updateSchedule(id: string, data: {
    serviceId?: string;
    priceCents?: number;
    date?: Date;
    startTime?: string;
    endTime?: string;
    cancelToken?: string;
    reminderSent?: boolean;
    barberReminderSent?: boolean;
  }): Promise<AppointmentWithDetails>;
}
