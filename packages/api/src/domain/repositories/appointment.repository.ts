import type { AppointmentEntity, AppointmentWithDetails } from '../entities/appointment.js';

export interface CreateAppointmentData {
  barberId: string;
  serviceId: string;
  customerId: string;
  date: Date;
  startTime: string;
  endTime: string;
  priceCents: number;
  cancelToken: string;
}

export interface AppointmentRepository {
  create(data: CreateAppointmentData): Promise<AppointmentWithDetails>;
  findByCancelToken(token: string): Promise<AppointmentWithDetails | null>;
  findById(id: string): Promise<AppointmentWithDetails | null>;
  findBookedSlots(barberId: string, date: Date): Promise<string[]>;
  findByBarberAndDate(barberId: string, date: Date, page: number, limit: number): Promise<{ appointments: AppointmentWithDetails[]; total: number; summary: { confirmed: number; completed: number; revenueCents: number } }>;
  findUpcomingWithoutReminder(minutesAhead: number): Promise<AppointmentWithDetails[]>;
  updateStatus(id: string, status: string, cancelledAt?: Date): Promise<void>;
  updateDateTime(id: string, date: Date, startTime: string, endTime: string, cancelToken: string): Promise<AppointmentWithDetails>;
  markReminderSent(id: string): Promise<void>;
}
