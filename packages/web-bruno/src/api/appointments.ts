import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { ApiError, apiFetch } from './http-client'
import { format, addDays, startOfWeek } from 'date-fns'
import type {
  Appointment,
  AppointmentFormData,
  AppointmentHistoryFilters,
  ProtocolCreditAction,
  SessionType,
} from '@/schemas/appointment.schema'

type CreateData = AppointmentFormData

export type AppointmentReceivableScope = 'all' | 'operations-only'

export type AppointmentListFilters = AppointmentHistoryFilters & {
  patientId?: string
  excludeCancelled?: boolean
  dueOnly?: boolean
  receivableScope?: AppointmentReceivableScope
}

export type PaymentReminderResult = {
  appointmentId: string
  success: boolean
  code?: string
  message?: string
}

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
  protocolId?: Appointment['protocolId'] | null
  protocolCreditAction?: ProtocolCreditAction
}

function normalizeAppointmentFilters(filters: AppointmentListFilters = {}): AppointmentListFilters {
  return {
    ...(filters.from ? { from: filters.from } : {}),
    ...(filters.to ? { to: filters.to } : {}),
    ...(filters.patientId ? { patientId: filters.patientId } : {}),
    ...(filters.type ? { type: filters.type } : {}),
    ...(filters.status ? { status: filters.status } : {}),
    ...(filters.paymentStatus ? { paymentStatus: filters.paymentStatus } : {}),
    ...(filters.excludeCancelled ? { excludeCancelled: true } : {}),
    ...(filters.dueOnly ? { dueOnly: true } : {}),
    ...(filters.receivableScope ? { receivableScope: filters.receivableScope } : {}),
  }
}

function buildAppointmentsQueryString(filters: AppointmentListFilters = {}): string {
  const params = new URLSearchParams()

  if (filters.from) params.set('from', filters.from)
  if (filters.to) params.set('to', filters.to)
  if (filters.patientId) params.set('patientId', filters.patientId)
  if (filters.type) params.set('type', filters.type)
  if (filters.status) params.set('status', filters.status)
  if (filters.paymentStatus) params.set('paymentStatus', filters.paymentStatus)
  if (filters.excludeCancelled) params.set('excludeCancelled', 'true')
  if (filters.dueOnly) params.set('dueOnly', 'true')
  if (filters.receivableScope) params.set('receivableScope', filters.receivableScope)

  return params.toString()
}

function getAppointmentsQueryKey(filters: AppointmentListFilters = {}) {
  return ['appointments', normalizeAppointmentFilters(filters)] as const
}

function getAppointmentsQueryPath(filters: AppointmentListFilters = {}) {
  const queryString = buildAppointmentsQueryString(filters)
  return `/api/psychology/sessions${queryString ? `?${queryString}` : ''}`
}

async function invalidateAppointmentContext(
  qc: ReturnType<typeof useQueryClient>,
  patientId?: string,
) {
  const tasks: Promise<unknown>[] = [
    qc.invalidateQueries({ queryKey: ['appointments'] }),
    qc.invalidateQueries({ queryKey: ['financial'] }),
    qc.invalidateQueries({ queryKey: ['protocols'] }),
  ]

  if (patientId) {
    tasks.push(
      qc.invalidateQueries({ queryKey: ['patients', patientId] }),
      qc.invalidateQueries({ queryKey: ['protocols', 'patient', patientId] }),
    )
  }

  await Promise.all(tasks)
}

export function useAppointments(filters: AppointmentListFilters = {}) {
  const normalizedFilters = normalizeAppointmentFilters(filters)

  return useQuery({
    queryKey: getAppointmentsQueryKey(normalizedFilters),
    queryFn: () => apiFetch<Appointment[]>(getAppointmentsQueryPath(normalizedFilters)),
  })
}

export function useWeekAppointments(weekStartDate: Date) {
  const weekStart = format(startOfWeek(weekStartDate, { weekStartsOn: 1 }), 'yyyy-MM-dd')
  const weekEnd = format(addDays(startOfWeek(weekStartDate, { weekStartsOn: 1 }), 6), 'yyyy-MM-dd')

  return useAppointments({ from: weekStart, to: weekEnd })
}

export function usePatientAppointments(patientId: string | undefined) {
  return useAppointments({ patientId })
}

export function useDateRangeAppointments(from: string, to: string, patientId?: string) {
  return useAppointments({ from, to, patientId })
}

export function useDuePendingAppointments(patientId?: string) {
  return useAppointments({
    patientId,
    paymentStatus: 'pending',
    excludeCancelled: true,
    dueOnly: true,
    receivableScope: 'operations-only',
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
    onSuccess: async (_, variables) => {
      await invalidateAppointmentContext(qc, variables.patientId)
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
    onSuccess: async (_, variables) => {
      await invalidateAppointmentContext(qc, variables.patientId)
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
      await invalidateAppointmentContext(qc)
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
      await invalidateAppointmentContext(qc)
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
    onSuccess: async (updated, variables) => {
      await invalidateAppointmentContext(qc, variables.data.patientId ?? updated.patientId)
    },
  })
}

export function useDeleteAppointment() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, protocolCreditAction }: { id: string; protocolCreditAction?: ProtocolCreditAction; patientId?: string }) =>
      apiFetch<void>(`/api/psychology/sessions/${id}`, {
        method: 'DELETE',
        body: JSON.stringify(protocolCreditAction ? { protocolCreditAction } : {}),
      }),
    onSuccess: async (_, variables) => {
      await invalidateAppointmentContext(qc, variables.patientId)
    },
  })
}

export function useSendPaymentReminder() {
  return useMutation({
    mutationFn: (id: string) =>
      apiFetch<void>(`/api/psychology/sessions/${id}/send-payment-reminder`, { method: 'POST', body: '{}' }),
  })
}

export function useSendBulkPaymentReminders() {
  return useMutation({
    mutationFn: async (appointmentIds: string[]) => {
      return Promise.all(
        appointmentIds.map(async (appointmentId): Promise<PaymentReminderResult> => {
          try {
            await apiFetch<void>(`/api/psychology/sessions/${appointmentId}/send-payment-reminder`, {
              method: 'POST',
              body: '{}',
            })

            return { appointmentId, success: true }
          } catch (error) {
            if (error instanceof ApiError) {
              return {
                appointmentId,
                success: false,
                code: error.code,
                message: error.message,
              }
            }

            return {
              appointmentId,
              success: false,
              message: error instanceof Error ? error.message : 'Erro ao enviar lembrete',
            }
          }
        }),
      )
    },
  })
}
