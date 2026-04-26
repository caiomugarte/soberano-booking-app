import { useState, useMemo } from 'react'
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts'
import {
  format,
  addWeeks,
  subWeeks,
  addMonths,
  subMonths,
  addYears,
  subYears,
  startOfWeek,
  endOfWeek,
  startOfMonth,
  endOfMonth,
  addDays,
  eachWeekOfInterval,
} from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { Panel } from '@/components/ui/Panel'
import { formatCurrency } from '@/lib/format'
import type { Appointment } from '@/schemas/appointment.schema'

type ChartPeriod = 'weekly' | 'monthly' | 'annual'

const PERIOD_LABELS: Record<ChartPeriod, string> = {
  weekly: 'Semanal',
  monthly: 'Mensal',
  annual: 'Anual',
}

interface RevenueChartProps {
  paidAppointments: Appointment[]
}

function CustomTooltip({
  active,
  payload,
}: {
  active?: boolean
  payload?: Array<{ value: number }>
}) {
  if (!active || !payload?.length) return null
  return (
    <div className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm shadow-lg">
      {formatCurrency(payload[0].value)}
    </div>
  )
}

function sumRevenue(appointments: Appointment[], from: string, to: string) {
  return appointments
    .filter((a) => a.date >= from && a.date <= to)
    .reduce((sum, a) => sum + a.value, 0)
}

export function RevenueChart({ paidAppointments }: RevenueChartProps) {
  const [period, setPeriod] = useState<ChartPeriod>('monthly')
  const [refDate, setRefDate] = useState(new Date())

  function navigate(dir: -1 | 1) {
    setRefDate((d) => {
      if (period === 'weekly') return dir === 1 ? addWeeks(d, 1) : subWeeks(d, 1)
      if (period === 'monthly') return dir === 1 ? addMonths(d, 1) : subMonths(d, 1)
      return dir === 1 ? addYears(d, 1) : subYears(d, 1)
    })
  }

  const { data, periodLabel } = useMemo(() => {
    if (period === 'weekly') {
      const wStart = startOfWeek(refDate, { weekStartsOn: 1 })
      const label = `${format(wStart, "d 'de' MMM", { locale: ptBR })} — ${format(endOfWeek(refDate, { weekStartsOn: 1 }), "d 'de' MMM yyyy", { locale: ptBR })}`
      const entries = Array.from({ length: 7 }, (_, i) => {
        const day = addDays(wStart, i)
        const dayStr = format(day, 'yyyy-MM-dd')
        return {
          label: format(day, 'EEE d', { locale: ptBR }),
          revenue: sumRevenue(paidAppointments, dayStr, dayStr),
        }
      })
      return { data: entries, periodLabel: label }
    }

    if (period === 'monthly') {
      const mStart = startOfMonth(refDate)
      const mEnd = endOfMonth(refDate)
      const label = format(refDate, "MMMM 'de' yyyy", { locale: ptBR })
      const weeks = eachWeekOfInterval({ start: mStart, end: mEnd }, { weekStartsOn: 1 })
      const entries = weeks.map((weekDate) => {
        const wkStartDate = weekDate < mStart ? mStart : weekDate
        const wkEndRaw = endOfWeek(weekDate, { weekStartsOn: 1 })
        const wkEndDate = wkEndRaw > mEnd ? mEnd : wkEndRaw
        const wkStart = format(wkStartDate, 'yyyy-MM-dd')
        const wkEnd = format(wkEndDate, 'yyyy-MM-dd')
        return {
          label: `${format(wkStartDate, 'd MMM', { locale: ptBR })} - ${format(wkEndDate, 'd MMM', { locale: ptBR })}`,
          revenue: sumRevenue(paidAppointments, wkStart, wkEnd),
        }
      })
      return { data: entries, periodLabel: label }
    }

    // annual
    const year = refDate.getFullYear()
    const label = String(year)
    const entries = Array.from({ length: 12 }, (_, i) => {
      const monthDate = new Date(year, i)
      const moStart = format(startOfMonth(monthDate), 'yyyy-MM-dd')
      const moEnd = format(endOfMonth(monthDate), 'yyyy-MM-dd')
      return {
        label: format(monthDate, 'MMM', { locale: ptBR }),
        revenue: sumRevenue(paidAppointments, moStart, moEnd),
      }
    })
    return { data: entries, periodLabel: label }
  }, [period, refDate, paidAppointments])

  return (
    <Panel>
      <div className="flex items-center justify-between border-b border-gray-100 px-4 py-3">
        <h3 className="text-sm font-semibold text-gray-700">
          Receita {PERIOD_LABELS[period]}
        </h3>
        <div className="flex gap-1 rounded-lg bg-gray-100 p-1">
          {(Object.keys(PERIOD_LABELS) as ChartPeriod[]).map((p) => (
            <button
              key={p}
              onClick={() => { setPeriod(p); setRefDate(new Date()) }}
              className={`rounded-md px-3 py-1 text-xs font-medium transition-colors ${
                period === p
                  ? 'bg-white text-gray-800 shadow-sm'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              {PERIOD_LABELS[p]}
            </button>
          ))}
        </div>
      </div>

      {/* Navigation */}
      <div className="flex items-center justify-center gap-4 px-4 py-2">
        <button
          onClick={() => navigate(-1)}
          className="rounded-md px-2 py-1 text-gray-500 hover:bg-gray-100 hover:text-gray-700"
        >
          ‹
        </button>
        <span className="text-sm font-medium text-gray-600 capitalize">{periodLabel}</span>
        <button
          onClick={() => navigate(1)}
          className="rounded-md px-2 py-1 text-gray-500 hover:bg-gray-100 hover:text-gray-700"
        >
          ›
        </button>
      </div>

      <Panel.Body className="h-64">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} margin={{ top: 5, right: 5, bottom: 5, left: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" />
            <XAxis dataKey="label" tick={{ fontSize: 11, fill: '#718096' }} />
            <YAxis
              tick={{ fontSize: 12, fill: '#718096' }}
              tickFormatter={(v: number) => `R$${(v / 100).toFixed(0)}`}
            />
            <Tooltip content={<CustomTooltip />} />
            <Bar dataKey="revenue" fill="#4A90A4" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </Panel.Body>
    </Panel>
  )
}
