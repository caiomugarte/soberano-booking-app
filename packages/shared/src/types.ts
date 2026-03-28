import type { AppointmentStatus } from './constants.js';

export interface Service {
  id: string;
  slug: string;
  name: string;
  icon: string;
  priceCents: number;
  duration: number;
  isActive: boolean;
  sortOrder: number;
}

export interface Barber {
  id: string;
  slug: string;
  firstName: string;
  lastName: string;
  avatarUrl: string | null;
  isActive: boolean;
}

export interface Customer {
  id: string;
  name: string;
  phone: string;
}

export interface Appointment {
  id: string;
  barberId: string;
  serviceId: string;
  customerId: string;
  date: string; // YYYY-MM-DD
  startTime: string; // HH:mm
  endTime: string; // HH:mm
  priceCents: number;
  status: AppointmentStatus;
  cancelToken: string;
  reminderSent: boolean;
  cancelledAt: string | null;
  createdAt: string;
}

export interface AppointmentWithDetails extends Appointment {
  barber: Barber;
  service: Service;
  customer: Customer;
}

export interface TimeSlot {
  time: string; // HH:mm
  available: boolean;
}

export interface BookingRequest {
  serviceId: string;
  barberId: string;
  date: string;
  startTime: string;
  customerName: string;
  customerPhone: string;
}

export interface BookingResponse {
  appointment: AppointmentWithDetails;
  cancelUrl: string;
}
