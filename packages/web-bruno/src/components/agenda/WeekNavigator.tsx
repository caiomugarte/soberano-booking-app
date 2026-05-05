import { format, addWeeks, subWeeks, startOfWeek } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { Button } from '@/components/ui/Button'

interface WeekNavigatorProps {
  currentWeek: Date
  onWeekChange: (date: Date) => void
}

export function WeekNavigator({ currentWeek, onWeekChange }: WeekNavigatorProps) {
  const weekStart = startOfWeek(currentWeek, { weekStartsOn: 1 })
  const weekLabel = format(weekStart, "dd 'de' MMMM, yyyy", { locale: ptBR })

  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex flex-wrap items-center gap-2">
        <Button variant="ghost" size="sm" onClick={() => onWeekChange(subWeeks(currentWeek, 1))}>
          ←
        </Button>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => onWeekChange(new Date())}
        >
          Hoje
        </Button>
        <Button variant="ghost" size="sm" onClick={() => onWeekChange(addWeeks(currentWeek, 1))}>
          →
        </Button>
      </div>
      <span className="text-sm font-medium text-gray-600 capitalize">
        Semana de {weekLabel}
      </span>
    </div>
  )
}
