import { useQuery } from '@tanstack/react-query'
import { apiFetch } from './http-client'
import type { Appointment } from '@/schemas/appointment.schema'
import type { Protocol } from '@/schemas/protocol.schema'

export interface FinancialAppointment {
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
  protocolId: string | null
  protocolCreditOutcome: Appointment['protocolCreditOutcome'] | null
  service: { slug: string }
  customer: { id: string; name: string; phone: string | null }
}

export interface FinancialProtocolSale {
  protocol: Protocol
  customer: { id: string; name: string; phone: string | null }
}

export interface FinancialSummary {
  totalSessions: number
  paidCount: number
  pendingCount: number
  revenueCents: number
  appointments: FinancialAppointment[]
  protocolSales: FinancialProtocolSale[]
}

function toDateStr(raw: string | Date): string {
  if (typeof raw === 'string') return raw.slice(0, 10)
  return raw.toISOString().slice(0, 10)
}

function normalizeFinancialSessionType(slug: string | undefined): Appointment['type'] {
  if (!slug || ['individual', 'couple', 'family', 'casal', 'familiar', 'psychotherapy'].includes(slug)) {
    return 'psychotherapy'
  }

  return 'neuromodulation'
}

export function mapToAppointment(a: FinancialAppointment): Appointment {
  const protocolLinkType =
    !a.protocolId
      ? 'standalone'
      : a.protocolCreditOutcome === 'maintenance'
        ? 'maintenance'
        : 'protocol'

  return {
    id: a.id,
    patientId: a.customerId,
    date: toDateStr(a.date),
    startTime: a.startTime,
    endTime: a.endTime,
    type: normalizeFinancialSessionType(a.service?.slug),
    status: (a.status ?? 'confirmed') as Appointment['status'],
    value: a.priceCents,
    paymentStatus: (a.paymentStatus ?? 'pending') as Appointment['paymentStatus'],
    paymentMethod: a.paymentMethod ?? undefined,
    paidAt: a.paidAt ?? undefined,
    notes: a.appointmentNotes ?? undefined,
    protocolId: a.protocolId ?? undefined,
    protocolCreditOutcome: a.protocolCreditOutcome ?? undefined,
    protocolLinkType,
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
