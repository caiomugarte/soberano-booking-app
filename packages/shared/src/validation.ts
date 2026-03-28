import { z } from 'zod';

const phoneRegex = /^\d{10,11}$/;
const timeRegex = /^([01]\d|2[0-3]):[0-5]\d$/;
const dateRegex = /^\d{4}-\d{2}-\d{2}$/;

export const bookingSchema = z.object({
  serviceId: z.string().uuid(),
  barberId: z.string().uuid(),
  date: z.string().regex(dateRegex, 'Data deve estar no formato YYYY-MM-DD'),
  startTime: z.string().regex(timeRegex, 'Horário deve estar no formato HH:mm'),
  customerName: z.string().min(2, 'Nome deve ter pelo menos 2 caracteres').max(200),
  customerPhone: z.string().regex(phoneRegex, 'Telefone deve ter 10 ou 11 dígitos'),
});

export const cancelAppointmentSchema = z.object({
  phoneLastFour: z.string().length(4, 'Informe os 4 últimos dígitos do telefone'),
});

export const changeAppointmentSchema = z.object({
  phoneLastFour: z.string().length(4, 'Informe os 4 últimos dígitos do telefone'),
  date: z.string().regex(dateRegex, 'Data deve estar no formato YYYY-MM-DD'),
  startTime: z.string().regex(timeRegex, 'Horário deve estar no formato HH:mm'),
});

export const slotsQuerySchema = z.object({
  barberId: z.string().uuid(),
  date: z.string().regex(dateRegex, 'Data deve estar no formato YYYY-MM-DD'),
});

export const barberLoginSchema = z.object({
  email: z.string().email('Email inválido'),
  password: z.string().min(6, 'Senha deve ter pelo menos 6 caracteres'),
});

export type BookingInput = z.infer<typeof bookingSchema>;
export type CancelAppointmentInput = z.infer<typeof cancelAppointmentSchema>;
export type ChangeAppointmentInput = z.infer<typeof changeAppointmentSchema>;
export type SlotsQueryInput = z.infer<typeof slotsQuerySchema>;
export type BarberLoginInput = z.infer<typeof barberLoginSchema>;
