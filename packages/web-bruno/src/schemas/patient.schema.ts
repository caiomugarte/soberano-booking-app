import { z } from 'zod'

export const PatientSchema = z.object({
  id: z.string().uuid(),
  name: z.string().min(1),
  phone: z.string().optional(),
  email: z.string().optional(),
  cpf: z.string().optional(),
  notes: z.string().optional(),
  createdAt: z.string(),
})

export type Patient = z.infer<typeof PatientSchema>

export const PatientFormSchema = PatientSchema.omit({ id: true, createdAt: true })
export type PatientFormData = z.infer<typeof PatientFormSchema>
