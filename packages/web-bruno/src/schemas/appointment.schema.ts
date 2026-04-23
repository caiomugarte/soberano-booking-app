import { z } from 'zod'

export const AppointmentStatusSchema = z.enum([
  'scheduled',
  'confirmed',
  'completed',
  'cancelled',
  'no_show',
])

export const PaymentStatusSchema = z.enum(['pending', 'paid'])

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
  paidAt: z.string().optional(),
  notes: z.string().optional(),
})

export type Appointment = z.infer<typeof AppointmentSchema>
export type AppointmentStatus = z.infer<typeof AppointmentStatusSchema>
export type PaymentStatus = z.infer<typeof PaymentStatusSchema>
export type SessionType = z.infer<typeof SessionTypeSchema>

export const AppointmentFormSchema = AppointmentSchema.omit({ id: true, endTime: true, paidAt: true })
export type AppointmentFormData = z.infer<typeof AppointmentFormSchema>
