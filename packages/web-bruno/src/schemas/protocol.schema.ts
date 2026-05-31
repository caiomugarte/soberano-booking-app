import { z } from 'zod'
import { PaymentMethodSchema, PaymentStatusSchema, ProtocolStatusSchema } from './appointment.schema'

export const ProtocolSchema = z.object({
  id: z.string().uuid(),
  patientId: z.string().uuid(),
  totalSessions: z.number().int().positive(),
  reservedSessions: z.number().int().min(0),
  consumedSessions: z.number().int().min(0),
  remainingSessions: z.number().int().min(0),
  totalPriceCents: z.number().int().min(0),
  status: ProtocolStatusSchema,
  paymentStatus: PaymentStatusSchema,
  paymentMethod: PaymentMethodSchema.optional(),
  paidAt: z.string().optional(),
  notes: z.string().optional(),
  createdAt: z.string(),
  updatedAt: z.string(),
})

export type Protocol = z.infer<typeof ProtocolSchema>

export const ProtocolFormSchema = ProtocolSchema.omit({
  id: true,
  patientId: true,
  reservedSessions: true,
  consumedSessions: true,
  remainingSessions: true,
  createdAt: true,
  updatedAt: true,
})

export type ProtocolFormData = z.infer<typeof ProtocolFormSchema>
