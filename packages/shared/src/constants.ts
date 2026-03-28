export const BUSINESS_HOURS = {
  openTime: '09:00',
  closeTime: '18:30',
  slotDurationMinutes: 30,
  workDays: [1, 2, 3, 4, 5, 6] as readonly number[], // Mon=1 ... Sat=6 (Sun=0 excluded)
} as const;

export const APPOINTMENT_STATUS = {
  CONFIRMED: 'confirmed',
  CANCELLED: 'cancelled',
  COMPLETED: 'completed',
  NO_SHOW: 'no_show',
} as const;

export type AppointmentStatus = (typeof APPOINTMENT_STATUS)[keyof typeof APPOINTMENT_STATUS];

export const MAX_WEEKS_AHEAD = 4;

export const PHONE_COUNTRY_CODE = '55';
