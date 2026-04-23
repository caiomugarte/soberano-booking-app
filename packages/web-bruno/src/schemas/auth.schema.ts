import { z } from 'zod'

export const LoginFormSchema = z.object({
  email: z.string().email('Email inválido'),
  password: z.string().min(1, 'Senha obrigatória'),
})

export type LoginFormData = z.infer<typeof LoginFormSchema>
