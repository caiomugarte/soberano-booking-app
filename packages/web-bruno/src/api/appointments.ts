import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { apiFetch } from './http-client'
import { format, addDays, startOfWeek } from 'date-fns'
import type {
  Appointment,
  AppointmentFormData,
  SessionType,
} from '@/schemas/appointment.schema'

type CreateData = AppointmentFormData

type RecurringSeriesData = {
  patientId: string
  startDate: string
  startTime: string
  type: SessionType
  intervalWeeks: number
  value?: number
  notes?: string
}

export type RecurringSeriesResponse = {
  recurringSeriesId: string
  created: number
  cadenceLabel: string
  protectedUntil: string
}

export type AppointmentUpdateData = {
  patientId?: Appointment['patientId']
  date?: Appointment['date']
  startTime?: Appointment['startTime']
  type?: Appointment['type']
  value?: Appointment['value']
  notes?: Appointment['notes'] | null
  status?: Appointment['status']
  paymentStatus?: Appointment['paymentStatus']
  paymentMethod?: Appointment['paymentMethod']
  paidAt?: Appointment['paidAt'] | null
}

export function useAppointments() {
  return useQuery({
    queryKey: ['appointments'],
    queryFn: () => apiFetch<Appointment[]>('/api/psychology/sessions'),
  })
}

export function useWeekAppointments(weekStartDate: Date) {
  const weekStart = format(startOfWeek(weekStartDate, { weekStartsOn: 1 }), 'yyyy-MM-dd')
  const weekEnd = format(addDays(startOfWeek(weekStartDate, { weekStartsOn: 1 }), 6), 'yyyy-MM-dd')

  return useQuery({
    queryKey: ['appointments', 'week', weekStart],
    queryFn: () =>
      apiFetch<Appointment[]>(`/api/psychology/sessions?from=${weekStart}&to=${weekEnd}`),
  })
}

export function usePatientAppointments(patientId: string | undefined) {
  return useQuery({
    queryKey: ['appointments', 'patient', patientId],
    queryFn: () =>
      apiFetch<Appointment[]>(`/api/psychology/sessions?patientId=${patientId}`),
    enabled: !!patientId,
  })
}

export function useDateRangeAppointments(from: string, to: string) {
  return useQuery({
    queryKey: ['appointments', 'range', from, to],
    queryFn: () =>
      apiFetch<Appointment[]>(`/api/psychology/sessions?from=${from}&to=${to}`),
  })
}

export function useCreateAppointment() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: CreateData & { date: string; paidAt?: Appointment['paidAt'] | null }) =>
      apiFetch<Appointment>('/api/psychology/sessions', {
        method: 'POST',
        body: JSON.stringify(data),
      }),
    onSuccess: async () => {
      await Promise.all([
        qc.invalidateQueries({ queryKey: ['appointments'] }),
        qc.invalidateQueries({ queryKey: ['financial'] }),
      ])
    },
  })
}

export function useCreateRecurringAppointments() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (payload: RecurringSeriesData) =>
      apiFetch<RecurringSeriesResponse>('/api/psychology/recurring-series', {
        method: 'POST',
        body: JSON.stringify(payload),
      }),
    onSuccess: async () => {
      await Promise.all([
        qc.invalidateQueries({ queryKey: ['appointments'] }),
        qc.invalidateQueries({ queryKey: ['financial'] }),
      ])
    },
  })
}

export function useStopRecurringSeries() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ recurringSeriesId, stopDate }: { recurringSeriesId: string; stopDate: string }) =>
      apiFetch<{ recurringSeriesId: string; stopDate: string; removedAppointments: number }>(
        `/api/psychology/recurring-series/${recurringSeriesId}/stop`,
        {
          method: 'PATCH',
          body: JSON.stringify({ stopDate }),
        },
      ),
    onSuccess: async () => {
      await Promise.all([
        qc.invalidateQueries({ queryKey: ['appointments'] }),
        qc.invalidateQueries({ queryKey: ['financial'] }),
      ])
    },
  })
}

export function useCreateBatchAppointments() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (items: Array<CreateData & { date: string; paidAt?: Appointment['paidAt'] | null }>) => {
      const results = await Promise.allSettled(
        items.map((item) =>
          apiFetch<Appointment>('/api/psychology/sessions', {
            method: 'POST',
            body: JSON.stringify(item),
          }),
        ),
      )
      return results.flatMap((r) => (r.status === 'fulfilled' ? [r.value] : []))
    },
    onSuccess: async () => {
      await Promise.all([
        qc.invalidateQueries({ queryKey: ['appointments'] }),
        qc.invalidateQueries({ queryKey: ['financial'] }),
      ])
    },
  })
}

export function useUpdateAppointment() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: AppointmentUpdateData }) =>
      apiFetch<Appointment>(`/api/psychology/sessions/${id}`, {
        method: 'PATCH',
        body: JSON.stringify(data),
      }),
    onSuccess: async () => {
      await Promise.all([
        qc.invalidateQueries({ queryKey: ['appointments'] }),
        qc.invalidateQueries({ queryKey: ['financial'] }),
      ])
    },
  })
}

export function useDeleteAppointment() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) =>
      apiFetch<void>(`/api/psychology/sessions/${id}`, {
        method: 'DELETE',
      }),
    onSuccess: async () => {
      await Promise.all([
        qc.invalidateQueries({ queryKey: ['appointments'] }),
        qc.invalidateQueries({ queryKey: ['financial'] }),
      ])
    },
  })
}

export function useSendPaymentReminder() {
  return useMutation({
    mutationFn: (id: string) =>
      apiFetch<void>(`/api/psychology/sessions/${id}/send-payment-reminder`, { method: 'POST', body: '{}' }),
  })
}
