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
import { useFinancialSummary, mapToAppointment, mapToPatient } from '@/api/financial'
import { useUpdateAppointment } from '@/api/appointments'
import { RevenueSummary } from '@/components/financial/RevenueSummary'
import { RevenueChart } from '@/components/financial/RevenueChart'
import { PendingPayments } from '@/components/financial/PendingPayments'

export default function FinancialPage() {
  const now = new Date()
  const yearStart = format(startOfYear(now), 'yyyy-MM-dd')
  const yearEnd = format(endOfYear(now), 'yyyy-MM-dd')

  const { data: summary } = useFinancialSummary(yearStart, yearEnd)
  const updateAppointment = useUpdateAppointment()

  const { appointments, patients, summaryStats, paidAppointments } = useMemo(() => {
    const raw = summary?.appointments ?? []
    const mapped = raw.map(mapToAppointment)
    const patientsMap = new Map(raw.map((a) => [a.customerId, mapToPatient(a)]))
    const derivedPatients = Array.from(patientsMap.values())

    const paid = mapped.filter((a) => a.paymentStatus === 'paid')

    const weekStart = format(startOfWeek(now, { weekStartsOn: 1 }), 'yyyy-MM-dd')
    const weekEnd = format(endOfWeek(now, { weekStartsOn: 1 }), 'yyyy-MM-dd')
    const monthStart = format(startOfMonth(now), 'yyyy-MM-dd')
    const monthEnd = format(endOfMonth(now), 'yyyy-MM-dd')
    const pending = mapped.filter(
      (a) => a.paymentStatus === 'pending' && a.status !== 'cancelled',
    )

    return {
      appointments: mapped,
      patients: derivedPatients,
      paidAppointments: paid,
      summaryStats: {
        weeklyRevenue: paid
          .filter((a) => a.date >= weekStart && a.date <= weekEnd)
          .reduce((sum, a) => sum + a.value, 0),
        monthlyRevenue: paid
          .filter((a) => a.date >= monthStart && a.date <= monthEnd)
          .reduce((sum, a) => sum + a.value, 0),
        annualRevenue: paid.reduce((sum, a) => sum + a.value, 0),
        pendingCount: pending.length,
        pendingTotal: pending.reduce((sum, a) => sum + a.value, 0),
      },
    }
  }, [summary, now])

  function handleMarkPaid(id: string) {
    updateAppointment.mutate({
      id,
      data: { paymentStatus: 'paid', paidAt: new Date().toISOString() },
    })
  }

  return (
    <div>
      <h1 className="mb-6 text-xl font-bold text-gray-800">Financeiro</h1>

      <div className="space-y-6">
        <RevenueSummary {...summaryStats} />

        <RevenueChart paidAppointments={paidAppointments} />

        <PendingPayments
          appointments={appointments}
          patients={patients}
          onMarkPaid={handleMarkPaid}
        />
      </div>
    </div>
  )
}
