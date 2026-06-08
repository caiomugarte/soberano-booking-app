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
import { useAddProtocolPayment } from '@/api/protocols'
import { RevenueSummary } from '@/components/financial/RevenueSummary'
import { RevenueChart } from '@/components/financial/RevenueChart'
import { PendingPayments } from '@/components/financial/PendingPayments'
import { formatCurrency, formatDate, toDateInputValue } from '@/lib/format'
import type { PaymentMethod } from '@/schemas/appointment.schema'

export default function FinancialPage() {
  const now = new Date()
  const yearStart = format(startOfYear(now), 'yyyy-MM-dd')
  const yearEnd = format(endOfYear(now), 'yyyy-MM-dd')

  const { data: summary } = useFinancialSummary(yearStart, yearEnd)
  const { data: patients = [] } = usePatients()
  const { data: duePendingAppointments = [] } = useDuePendingAppointments()
  const updateAppointment = useUpdateAppointment()
  const addProtocolPayment = useAddProtocolPayment()

  const { summaryStats, revenueEntries, pendingEntries } = useMemo(() => {
    const rawAppointments = summary?.appointments ?? []
    const mappedAppointments = rawAppointments.map(mapToAppointment)
    const paidAppointments = mappedAppointments.filter((appointment) => appointment.paymentStatus === 'paid')
    const protocolSales = summary?.protocolSales ?? []
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
      ...protocolSales.flatMap((entry) =>
        entry.protocol.payments
          .map((payment) => ({
            revenueDate: toDateInputValue(payment.paidAt),
            value: payment.amountCents,
          }))
          .filter((payment) => payment.revenueDate >= yearStart && payment.revenueDate <= yearEnd),
      ),
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
    const pendingProtocolItems = protocolSales
      .filter((entry) => entry.protocol.remainingAmountCents > 0)
      .map((entry) => ({
        kind: 'protocol' as const,
        id: entry.protocol.id,
        patientId: entry.customer.id,
        patientName: entry.customer.name,
        patientPhone: entry.customer.phone ?? undefined,
        subtitle: `Protocolo ${entry.protocol.status === 'maintenance' ? 'em manutenção' : 'de neuromodulação'} • ${
          entry.protocol.paidAmountCents > 0
            ? `recebido ${formatCurrency(entry.protocol.paidAmountCents)}`
            : 'sem entradas registradas'
        }`,
        amountCents: entry.protocol.remainingAmountCents,
      }))
    const pendingSummaryItems = [...duePendingItems, ...pendingProtocolItems]

    return {
      revenueEntries: revenueItems,
      pendingEntries: pendingSummaryItems,
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

  function handleMarkAppointmentPaid(
    id: string,
    _patientId: string,
    paymentMethod: PaymentMethod,
    paidAt: string,
  ) {
    updateAppointment.mutate({
      id,
      data: {
        paymentStatus: 'paid',
        paymentMethod,
        paidAt,
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

        <PendingPayments
          entries={pendingEntries}
          onMarkAppointmentPaid={handleMarkAppointmentPaid}
          onAddProtocolPayment={(id, patientId, payment) => {
            addProtocolPayment.mutate({
              id,
              patientId,
              data: payment,
            })
          }}
          isAppointmentMutationPending={updateAppointment.isPending}
          isProtocolMutationPending={addProtocolPayment.isPending}
        />
      </div>
    </div>
  )
}
