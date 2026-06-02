import { z } from 'zod'

export const CareSummarySchema = z.enum(['psychotherapy', 'neuromodulation', 'dual_track'])
export const PsychotherapyFrequencySchema = z.enum(['weekly', 'biweekly'])
export const ParentsMeetingStatusSchema = z.enum(['pending', 'completed'])

export const PatientFinancialSummarySchema = z.object({
  sessionReceivables: z.object({
    totalCount: z.number().int().nonnegative(),
    paidCount: z.number().int().nonnegative(),
    pendingCount: z.number().int().nonnegative(),
    paidTotalCents: z.number().int().nonnegative(),
    pendingTotalCents: z.number().int().nonnegative(),
  }),
  protocolSales: z.object({
    totalCount: z.number().int().nonnegative(),
    paidCount: z.number().int().nonnegative(),
    pendingCount: z.number().int().nonnegative(),
    paidTotalCents: z.number().int().nonnegative(),
    pendingTotalCents: z.number().int().nonnegative(),
  }),
})

export const PatientSchema = z.object({
  id: z.string().uuid(),
  name: z.string().min(1),
  phone: z.string().optional(),
  email: z.string().optional(),
  cpf: z.string().optional(),
  notes: z.string().optional(),
  careSummary: CareSummarySchema,
  psychotherapyPriceCents: z.number().int().positive().optional(),
  psychotherapyFrequency: PsychotherapyFrequencySchema.optional(),
  neuromodulationEligible: z.boolean(),
  isMinor: z.boolean(),
  parentsMeetingStatus: ParentsMeetingStatusSchema.optional(),
  birthDate: z.string().optional(),
  address: z.string().optional(),
  financialSummary: PatientFinancialSummarySchema.optional(),
  createdAt: z.string(),
  updatedAt: z.string().optional(),
})

export type Patient = z.infer<typeof PatientSchema>
export type CareSummary = z.infer<typeof CareSummarySchema>
export type PsychotherapyFrequency = z.infer<typeof PsychotherapyFrequencySchema>
export type ParentsMeetingStatus = z.infer<typeof ParentsMeetingStatusSchema>
export type PatientFinancialSummary = z.infer<typeof PatientFinancialSummarySchema>

export const PatientFormSchema = PatientSchema.omit({
  id: true,
  careSummary: true,
  isMinor: true,
  financialSummary: true,
  createdAt: true,
  updatedAt: true,
})
export type PatientFormData = z.infer<typeof PatientFormSchema>
