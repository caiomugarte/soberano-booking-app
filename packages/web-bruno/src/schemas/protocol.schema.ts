import { z } from 'zod'
import { PaymentMethodSchema, ProtocolStatusSchema } from './appointment.schema'

export const ProtocolPaymentStatusSchema = z.enum(['pending', 'partial', 'paid'])

export const ProtocolPaymentSchema = z.object({
  id: z.string().uuid(),
  amountCents: z.number().int().positive(),
  paymentMethod: PaymentMethodSchema,
  paidAt: z.string(),
  createdAt: z.string(),
  updatedAt: z.string(),
})

export const ProtocolSchema = z.object({
  id: z.string().uuid(),
  patientId: z.string().uuid(),
  totalSessions: z.number().int().positive(),
  reservedSessions: z.number().int().min(0),
  consumedSessions: z.number().int().min(0),
  remainingSessions: z.number().int().min(0),
  totalPriceCents: z.number().int().min(0),
  status: ProtocolStatusSchema,
  paymentStatus: ProtocolPaymentStatusSchema,
  paidAmountCents: z.number().int().min(0),
  remainingAmountCents: z.number().int().min(0),
  lastPaymentAt: z.string().optional(),
  payments: z.array(ProtocolPaymentSchema),
  notes: z.string().optional(),
  createdAt: z.string(),
  updatedAt: z.string(),
})

export type Protocol = z.infer<typeof ProtocolSchema>
export type ProtocolPayment = z.infer<typeof ProtocolPaymentSchema>
export type ProtocolPaymentStatus = z.infer<typeof ProtocolPaymentStatusSchema>

const ProtocolCommercialFieldsSchema = z.object({
  totalSessions: z.number().int().positive(),
  totalPriceCents: z.number().int().min(0),
  status: ProtocolStatusSchema,
  notes: z.string().nullable().optional(),
})

const ProtocolPaymentEntrySchema = z.object({
  amountCents: z.number().int().positive(),
  paymentMethod: PaymentMethodSchema,
  paidAt: z.string(),
})

export const CreateProtocolSchema = ProtocolCommercialFieldsSchema.extend({
  initialPayment: ProtocolPaymentEntrySchema.optional(),
})

export const UpdateProtocolSchema = ProtocolCommercialFieldsSchema.partial()

export const AddProtocolPaymentSchema = ProtocolPaymentEntrySchema

export type CreateProtocolData = z.infer<typeof CreateProtocolSchema>
export type UpdateProtocolData = z.infer<typeof UpdateProtocolSchema>
export type AddProtocolPaymentData = z.infer<typeof AddProtocolPaymentSchema>
export type UpdateProtocolPaymentData = AddProtocolPaymentData
