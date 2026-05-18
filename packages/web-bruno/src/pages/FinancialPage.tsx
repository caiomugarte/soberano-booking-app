import { useMemo } from 'react'
import {
  format,
  startOfWeek,
  endOfWeek,
  startOfMonth,
  endOfMonth,
  startOfYear,
  endOfYear,
} from 'date-fns'
import { useFinancialSummary, mapToAppointment } from '@/api/financial'
import { useDuePendingAppointments, useUpdateAppointment } from '@/api/appointments'
import { usePatients } from '@/api/patients'
import { useUpdateProtocol } from '@/api/protocols'
import { RevenueSummary } from '@/components/financial/RevenueSummary'
import { RevenueChart } from '@/components/financial/RevenueChart'
import { PendingPayments } from '@/components/financial/PendingPayments'
import { dateInputToIso, formatDate, toDateInputValue } from '@/lib/format'
import type { PaymentMethod } from '@/schemas/appointment.schema'

export default function FinancialPage() {
  const now = new Date()
  const yearStart = format(startOfYear(now), 'yyyy-MM-dd')
  const yearEnd = format(endOfYear(now), 'yyyy-MM-dd')

  const { data: summary } = useFinancialSummary(yearStart, yearEnd)
  const { data: patients = [] } = usePatients()
  const { data: duePendingAppointments = [] } = useDuePendingAppointments()
  const updateAppointment = useUpdateAppointment()
  const updateProtocol = useUpdateProtocol()

  const { summaryStats, revenueEntries, pendingEntries, pendingProtocolSales } = useMemo(() => {
    const rawAppointments = summary?.appointments ?? []
    const mappedAppointments = rawAppointments.map(mapToAppointment)
    const paidAppointments = mappedAppointments.filter((appointment) => appointment.paymentStatus === 'paid')
    const paidProtocols = (summary?.protocolSales ?? []).filter((entry) => entry.protocol.paymentStatus === 'paid')
    const patientById = new Map(patients.map((patient) => [patient.id, patient]))

    const weekStart = format(startOfWeek(now, { weekStartsOn: 1 }), 'yyyy-MM-dd')
    const weekEnd = format(endOfWeek(now, { weekStartsOn: 1 }), 'yyyy-MM-dd')
    const monthStart = format(startOfMonth(now), 'yyyy-MM-dd')
    const monthEnd = format(endOfMonth(now), 'yyyy-MM-dd')
    const revenueItems = [
      ...paidAppointments.map((appointment) => ({
        revenueDate: toDateInputValue(appointment.paidAt) || appointment.date,
        value: appointment.value,
      })),
      ...paidProtocols.map((entry) => ({
        revenueDate: toDateInputValue(entry.protocol.paidAt) || toDateInputValue(entry.protocol.createdAt),
        value: entry.protocol.totalPriceCents,
      })),
    ]
    const duePendingItems = duePendingAppointments.map((appointment) => {
      const patient = patientById.get(appointment.patientId)

      return {
        kind: 'appointment' as const,
        id: appointment.id,
        patientId: appointment.patientId,
        patientName: patient?.name ?? 'Paciente',
        patientPhone: patient?.phone ?? undefined,
        subtitle: `${formatDate(appointment.date)} • ${appointment.startTime}`,
        amountCents: appointment.value,
        reminderAppointmentId: appointment.id,
      }
    })
    const pendingProtocolItems = (summary?.protocolSales ?? [])
      .filter((entry) => entry.protocol.paymentStatus === 'pending')
      .map((entry) => ({
        kind: 'protocol' as const,
        id: entry.protocol.id,
        patientId: entry.customer.id,
        patientName: entry.customer.name,
        patientPhone: entry.customer.phone ?? undefined,
        subtitle: `Protocolo ${entry.protocol.status === 'maintenance' ? 'em manutenção' : 'de neuromodulação'}`,
        amountCents: entry.protocol.totalPriceCents,
      }))
    const pendingSummaryItems = [...duePendingItems, ...pendingProtocolItems]

    return {
      revenueEntries: revenueItems,
      pendingEntries: duePendingItems,
      pendingProtocolSales: pendingProtocolItems,
      summaryStats: {
        weeklyRevenue: revenueItems
          .filter((entry) => {
            return entry.revenueDate >= weekStart && entry.revenueDate <= weekEnd
          })
          .reduce((sum, entry) => sum + entry.value, 0),
        monthlyRevenue: revenueItems
          .filter((entry) => {
            return entry.revenueDate >= monthStart && entry.revenueDate <= monthEnd
          })
          .reduce((sum, entry) => sum + entry.value, 0),
        annualRevenue: revenueItems.reduce((sum, entry) => sum + entry.value, 0),
        pendingCount: pendingSummaryItems.length,
        pendingTotal: pendingSummaryItems.reduce((sum, entry) => sum + entry.amountCents, 0),
      },
    }
  }, [duePendingAppointments, now, patients, summary])

  function handleMarkPaid(
    kind: 'appointment' | 'protocol',
    id: string,
    patientId: string,
    paymentMethod: PaymentMethod,
    paidAt: string,
  ) {
    if (kind === 'appointment') {
      updateAppointment.mutate({
        id,
        data: {
          paymentStatus: 'paid',
          paymentMethod,
          paidAt,
        },
      })
      return
    }

    updateProtocol.mutate({
      id,
      patientId,
      data: {
        paymentStatus: 'paid',
        paymentMethod,
        paidAt: dateInputToIso(paidAt),
      },
    })
  }

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-xl font-bold text-gray-800">Financeiro</h1>
      </div>

      <div className="space-y-6">
        <RevenueSummary {...summaryStats} />

        <RevenueChart entries={revenueEntries} />

        {pendingProtocolSales.length > 0 && (
          <p className="text-xs text-gray-500">
            As vendas de protocolo continuam no resumo financeiro e entram nesta bancada quando o fluxo de recebíveis do protocolo for concluído.
          </p>
        )}

        <PendingPayments
          entries={pendingEntries}
          onMarkPaid={handleMarkPaid}
        />
      </div>
    </div>
  )
}
