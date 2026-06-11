import {
  DEFAULT_PROVIDER_WORKSPACE,
  addMinutesToClockTime,
  buildStartTimeOptions,
  getDurationMinutes,
  getHourBlockEnd,
  type ProviderWorkspaceConfig,
} from '@/lib/calendar-workspace'
import type { Appointment } from '@/schemas/appointment.schema'

export function generateTimeSlots(
  config: ProviderWorkspaceConfig = DEFAULT_PROVIDER_WORKSPACE,
): string[] {
  return buildStartTimeOptions(config).map((option) => option.value)
}

export function getEndTime(
  startTime: string,
  durationMinutes = DEFAULT_PROVIDER_WORKSPACE.defaultSessionDurationMinutes,
): string {
  return addMinutesToClockTime(startTime, durationMinutes)
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

export function getAppointmentForHourBlock(
  date: string,
  blockStartTime: string,
  appointments: Appointment[],
): Appointment | undefined {
  const blockEndTime = getHourBlockEnd(blockStartTime)

  return appointments.find(
    (appointment) =>
      appointment.date === date &&
      appointment.status !== 'cancelled' &&
      appointment.startTime < blockEndTime &&
      appointment.endTime > blockStartTime,
  )
}

export function getAppointmentDurationMinutes(
  appointment: Pick<Appointment, 'startTime' | 'endTime'>,
): number {
  return getDurationMinutes(appointment.startTime, appointment.endTime)
}
