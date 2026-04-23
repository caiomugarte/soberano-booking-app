import { TIME_SLOTS, SESSION_DURATION_MINUTES } from '@/config/constants'
import type { Appointment } from '@/schemas/appointment.schema'

export function generateTimeSlots(): string[] {
  return [...TIME_SLOTS]
}

export function getEndTime(startTime: string): string {
  const [hours, minutes] = startTime.split(':').map(Number)
  const totalMinutes = hours * 60 + minutes + SESSION_DURATION_MINUTES
  const endHours = Math.floor(totalMinutes / 60)
  const endMinutes = totalMinutes % 60
  return `${String(endHours).padStart(2, '0')}:${String(endMinutes).padStart(2, '0')}`
}

export function isSlotTaken(
  date: string,
  startTime: string,
  appointments: Appointment[],
  excludeId?: string,
): boolean {
  return appointments.some(
    (a) =>
      a.date === date &&
      a.startTime === startTime &&
      a.status !== 'cancelled' &&
      a.id !== excludeId,
  )
}

export function getAppointmentForSlot(
  date: string,
  startTime: string,
  appointments: Appointment[],
): Appointment | undefined {
  return appointments.find(
    (a) => a.date === date && a.startTime === startTime && a.status !== 'cancelled',
  )
}
