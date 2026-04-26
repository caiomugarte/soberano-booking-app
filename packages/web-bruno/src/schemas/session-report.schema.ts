import { z } from 'zod'

export const SessionReportSchema = z.object({
  id: z.string().uuid(),
  appointmentId: z.string().uuid(),
  patientId: z.string().uuid(),
  text: z.string(),
  fileName: z.string().optional(),
  fileType: z.string().optional(),
  fileData: z.string().optional(), // base64
  createdAt: z.string(),
})

export type SessionReport = z.infer<typeof SessionReportSchema>
