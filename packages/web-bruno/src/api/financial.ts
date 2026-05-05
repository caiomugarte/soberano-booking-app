import { useQuery } from '@tanstack/react-query'
import { apiFetch } from './http-client'
import type { Appointment } from '@/schemas/appointment.schema'
import type { Patient } from '@/schemas/patient.schema'

interface FinancialAppointment {
  id: string
  customerId: string
  date: string
  startTime: string
  endTime: string
  priceCents: number
  status: string
  paymentStatus: string
  paymentMethod: Appointment['paymentMethod']
  paidAt: string | null
  appointmentNotes: string | null
  service: { slug: string }
  customer: { id: string; name: string; phone: string | null }
}

export interface FinancialSummary {
  totalSessions: number
  paidCount: number
  pendingCount: number
  revenueCents: number
  appointments: FinancialAppointment[]
}

function toDateStr(raw: string | Date): string {
  if (typeof raw === 'string') return raw.slice(0, 10)
  return raw.toISOString().slice(0, 10)
}

export function mapToAppointment(a: FinancialAppointment): Appointment {
  return {
    id: a.id,
    patientId: a.customerId,
    date: toDateStr(a.date),
    startTime: a.startTime,
    endTime: a.endTime,
    type: (a.service?.slug ?? 'individual') as Appointment['type'],
    status: (a.status ?? 'confirmed') as Appointment['status'],
    value: a.priceCents,
    paymentStatus: (a.paymentStatus ?? 'pending') as Appointment['paymentStatus'],
    paymentMethod: a.paymentMethod ?? undefined,
    paidAt: a.paidAt ?? undefined,
    notes: a.appointmentNotes ?? undefined,
  }
}

export function mapToPatient(a: FinancialAppointment): Patient {
  return {
    id: a.customerId,
    name: a.customer.name,
    phone: a.customer.phone ?? undefined,
    createdAt: '',
  }
}

export function useFinancialSummary(from: string, to: string) {
  return useQuery({
    queryKey: ['financial', from, to],
    queryFn: () =>
      apiFetch<FinancialSummary>(`/api/admin/financial?from=${from}&to=${to}`),
    enabled: !!from && !!to,
  })
}
