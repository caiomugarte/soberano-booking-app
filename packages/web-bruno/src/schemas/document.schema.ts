import { z } from 'zod'

export const DocumentSchema = z.object({
  id: z.string().uuid(),
  patientId: z.string().uuid(),
  name: z.string().min(1),
  fileName: z.string(),
  fileType: z.string(),
  fileData: z.string(), // base64
  createdAt: z.string(),
})

export type Document = z.infer<typeof DocumentSchema>
