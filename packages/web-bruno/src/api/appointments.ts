import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { apiFetch } from './http-client'
import { format, addDays, startOfWeek } from 'date-fns'
import type { Appointment } from '@/schemas/appointment.schema'

type CreateData = Omit<Appointment, 'id' | 'endTime' | 'paidAt'>
type BatchData = { patientId: string; startDate: string; startTime: string; type: string; weeks: number; value?: number; notes?: string; status?: string; paymentStatus?: string }

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
    mutationFn: (data: CreateData & { date: string }) =>
      apiFetch<Appointment>('/api/psychology/sessions', {
        method: 'POST',
        body: JSON.stringify(data),
      }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['appointments'] }),
  })
}

export function useCreateRecurringAppointments() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (params: { baseData: Omit<CreateData, 'date'>; startDate: string; weeks: number }) => {
      const payload: BatchData = {
        patientId: params.baseData.patientId,
        startDate: params.startDate,
        startTime: params.baseData.startTime,
        type: params.baseData.type,
        weeks: params.weeks,
        value: params.baseData.value,
        notes: params.baseData.notes,
        status: params.baseData.status,
        paymentStatus: params.baseData.paymentStatus,
      }
      return apiFetch<{ created: number; skipped: number }>('/api/psychology/sessions/batch', {
        method: 'POST',
        body: JSON.stringify(payload),
      })
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['appointments'] }),
  })
}

export function useCreateBatchAppointments() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (items: Array<CreateData & { date: string }>) => {
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
    onSuccess: () => qc.invalidateQueries({ queryKey: ['appointments'] }),
  })
}

export function useUpdateAppointment() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<Appointment> }) =>
      apiFetch<Appointment>(`/api/psychology/sessions/${id}`, {
        method: 'PATCH',
        body: JSON.stringify(data),
      }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['appointments'] }),
  })
}

export function useSendPaymentReminder() {
  return useMutation({
    mutationFn: (id: string) =>
      apiFetch<void>(`/api/psychology/sessions/${id}/send-payment-reminder`, { method: 'POST', body: '{}' }),
  })
}
