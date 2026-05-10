import { z } from 'zod'

export const AppointmentStatusSchema = z.enum([
  'scheduled',
  'confirmed',
  'completed',
  'cancelled',
  'no_show',
])

export const PaymentStatusSchema = z.enum(['pending', 'paid'])
export const PaymentMethodSchema = z.enum(['card', 'pix', 'cash'])
export const RecurrenceStatusSchema = z.enum(['active', 'stopped'])

export const SessionTypeSchema = z.enum(['individual', 'couple', 'family'])

export const AppointmentSchema = z.object({
  id: z.string().uuid(),
  patientId: z.string().uuid(),
  date: z.string(),
  startTime: z.string(),
  endTime: z.string(),
  type: SessionTypeSchema,
  status: AppointmentStatusSchema,
  value: z.number().int(),
  paymentStatus: PaymentStatusSchema,
  paymentMethod: PaymentMethodSchema.optional(),
  paidAt: z.string().optional(),
  notes: z.string().optional(),
  recurringSeriesId: z.string().uuid().optional(),
  recurrenceIntervalWeeks: z.number().int().positive().optional(),
  recurrenceStatus: RecurrenceStatusSchema.optional(),
  recurrenceStopDate: z.string().optional(),
})

export type Appointment = z.infer<typeof AppointmentSchema>
export type AppointmentStatus = z.infer<typeof AppointmentStatusSchema>
export type PaymentStatus = z.infer<typeof PaymentStatusSchema>
export type PaymentMethod = z.infer<typeof PaymentMethodSchema>
export type SessionType = z.infer<typeof SessionTypeSchema>
export type RecurrenceStatus = z.infer<typeof RecurrenceStatusSchema>

export const AppointmentFormSchema = AppointmentSchema.omit({
  id: true,
  endTime: true,
  paidAt: true,
  recurringSeriesId: true,
  recurrenceIntervalWeeks: true,
  recurrenceStatus: true,
  recurrenceStopDate: true,
})
export type AppointmentFormData = z.infer<typeof AppointmentFormSchema>
