import type { AppointmentWithDetails } from '../../../domain/entities/appointment.js';
import type { RecurringAppointmentSeriesEntity } from '../../../domain/entities/recurring-appointment-series.js';

export const RECURRING_SERIES_HORIZON_DAYS = 90;

export function addMinutes(time: string, minutes: number): string {
  const [hours, mins] = time.split(':').map(Number);
  const totalMinutes = hours * 60 + mins + minutes;
  return `${String(Math.floor(totalMinutes / 60)).padStart(2, '0')}:${String(totalMinutes % 60).padStart(2, '0')}`;
}

export function parseDateOnly(value: string): Date {
  return new Date(`${value}T00:00:00`);
}

export function startOfToday(): Date {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return today;
}

export function endOfHorizon(from: Date, horizonDays = RECURRING_SERIES_HORIZON_DAYS): Date {
  const horizonEnd = new Date(from);
  horizonEnd.setDate(horizonEnd.getDate() + horizonDays);
  return horizonEnd;
}

export function addWeeks(date: Date, weeks: number): Date {
  const next = new Date(date);
  next.setDate(next.getDate() + weeks * 7);
  return next;
}

export function formatDateKey(date: Date): string {
  return date.toISOString().slice(0, 10);
}

export function appointmentKey(date: Date, startTime: string): string {
  return `${formatDateKey(date)}|${startTime}`;
}

export function buildOccurrenceDates(params: {
  startDate: Date;
  intervalWeeks: number;
  from: Date;
  to: Date;
}): Date[] {
  const dates: Date[] = [];
  let cursor = new Date(params.startDate);

  while (cursor < params.from) {
    cursor = addWeeks(cursor, params.intervalWeeks);
  }

  while (cursor <= params.to) {
    dates.push(new Date(cursor));
    cursor = addWeeks(cursor, params.intervalWeeks);
  }

  return dates;
}

export function hasConflictingAppointment(
  appointments: AppointmentWithDetails[],
  date: Date,
  startTime: string,
  endTime: string,
  recurringSeriesId?: string,
): boolean {
  return appointments.some((appointment) => {
    if (appointment.status === 'cancelled') return false;
    if (appointment.recurringSeriesId && recurringSeriesId && appointment.recurringSeriesId === recurringSeriesId) {
      return false;
    }
    return (
      formatDateKey(appointment.date) === formatDateKey(date) &&
      appointment.startTime < endTime &&
      appointment.endTime > startTime
    );
  });
}

export function describeCadence(intervalWeeks: number): string {
  if (intervalWeeks === 1) return 'toda semana';
  return `a cada ${intervalWeeks} semanas`;
}

export function getMaterializationStartDate(series: RecurringAppointmentSeriesEntity): Date {
  const today = startOfToday();
  return series.startDate > today ? new Date(series.startDate) : today;
}
