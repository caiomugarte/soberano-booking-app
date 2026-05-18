import { z } from 'zod'

export const CareModeSchema = z.enum(['psychotherapy', 'neuromodulation'])
export const PsychotherapyFrequencySchema = z.enum(['weekly', 'biweekly'])

export const PatientSchema = z.object({
  id: z.string().uuid(),
  name: z.string().min(1),
  phone: z.string().optional(),
  email: z.string().optional(),
  cpf: z.string().optional(),
  notes: z.string().optional(),
  careMode: CareModeSchema,
  psychotherapyPriceCents: z.number().int().positive().optional(),
  psychotherapyFrequency: PsychotherapyFrequencySchema.optional(),
  birthDate: z.string().optional(),
  address: z.string().optional(),
  createdAt: z.string(),
  updatedAt: z.string().optional(),
})

export type Patient = z.infer<typeof PatientSchema>
export type CareMode = z.infer<typeof CareModeSchema>
export type PsychotherapyFrequency = z.infer<typeof PsychotherapyFrequencySchema>

export const PatientFormSchema = PatientSchema.omit({ id: true, createdAt: true })
export type PatientFormData = z.infer<typeof PatientFormSchema>
