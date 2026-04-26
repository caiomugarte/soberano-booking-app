import { format, startOfWeek, endOfWeek } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { Panel } from '@/components/ui/Panel'
import { formatCurrency } from '@/lib/format'

interface RevenueSummaryProps {
  weeklyRevenue: number
  monthlyRevenue: number
  annualRevenue: number
  pendingCount: number
  pendingTotal: number
}

export function RevenueSummary({
  weeklyRevenue,
  monthlyRevenue,
  annualRevenue,
  pendingCount,
  pendingTotal,
}: RevenueSummaryProps) {
  const now = new Date()
  const wStart = startOfWeek(now, { weekStartsOn: 1 })
  const wEnd = endOfWeek(now, { weekStartsOn: 1 })
  const weekLabel = `${format(wStart, 'd MMM', { locale: ptBR })} - ${format(wEnd, 'd MMM', { locale: ptBR })}`
  const monthLabel = format(now, 'MMMM', { locale: ptBR })
  const yearLabel = format(now, 'yyyy')

  const cards = [
    { label: 'Receita Semanal', value: weeklyRevenue, color: 'text-primary-600', subtitle: weekLabel },
    { label: 'Receita Mensal', value: monthlyRevenue, color: 'text-sage-600', subtitle: monthLabel },
    { label: 'Receita Anual', value: annualRevenue, color: 'text-emerald-600', subtitle: yearLabel },
    {
      label: 'Pendente',
      value: pendingTotal,
      color: 'text-amber-600',
      subtitle: `${pendingCount} sessões`,
    },
  ]

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {cards.map((card) => (
        <Panel key={card.label}>
          <Panel.Body>
            <div className="text-xs font-medium text-gray-500">{card.label}</div>
            <div className={`mt-1 text-xl font-bold ${card.color}`}>
              {formatCurrency(card.value)}
            </div>
            {card.subtitle && (
              <div className="mt-0.5 text-xs text-gray-400">{card.subtitle}</div>
            )}
          </Panel.Body>
        </Panel>
      ))}
    </div>
  )
}
