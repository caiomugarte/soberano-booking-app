import { z } from 'zod'

export const SessionDefaultsSchema = z.object({
  psychotherapy: z.number().int(),
  neuromodulation: z.number().int(),
})

export const WorkingHoursSchema = z.object({
  start: z.string(),
  end: z.string(),
  days: z.array(z.number().min(0).max(6)),
  breakStart: z.string().optional(),
  breakEnd: z.string().optional(),
})

export const AbsentDaySchema = z.object({
  date: z.string(),
  allDay: z.boolean(),
  startTime: z.string().optional(),
  endTime: z.string().optional(),
})

export type AbsentDay = z.infer<typeof AbsentDaySchema>

export const SettingsSchema = z.object({
  pixKey: z.string(),
  messageTemplate: z.string(),
  sessionDefaults: SessionDefaultsSchema,
  workingHours: WorkingHoursSchema,
  absentDays: z.array(AbsentDaySchema).optional(),
  userName: z.string(),
  userPhone: z.string().optional(),
})

export type Settings = z.infer<typeof SettingsSchema>
