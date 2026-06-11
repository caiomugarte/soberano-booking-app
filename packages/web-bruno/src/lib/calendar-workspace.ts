import { addDays, endOfMonth, endOfWeek, format, startOfMonth, startOfWeek } from 'date-fns'

export type ProviderWorkspaceConfig = {
  workspaceStartTime: string
  workspaceEndTime: string
  defaultSessionDurationMinutes: number
}

export type WorkspaceDay = {
  key: number
  label: string
  shortLabel: string
  narrowLabel: string
}

export type WorkspaceWeekDay = WorkspaceDay & {
  date: Date
  dateStr: string
  dayLabel: string
  dateLabel: string
  isToday: boolean
}

export type WorkspaceMonthCell = {
  date: Date
  dateStr: string
  dayNumber: string
  inCurrentMonth: boolean
  isToday: boolean
}

export const DEFAULT_PROVIDER_WORKSPACE: ProviderWorkspaceConfig = {
  workspaceStartTime: '08:00',
  workspaceEndTime: '17:00',
  defaultSessionDurationMinutes: 60,
}

const WORKSPACE_DAYS: WorkspaceDay[] = [
  { key: 1, label: 'Segunda', shortLabel: 'Seg', narrowLabel: 'S' },
  { key: 2, label: 'Terça', shortLabel: 'Ter', narrowLabel: 'T' },
  { key: 3, label: 'Quarta', shortLabel: 'Qua', narrowLabel: 'Q' },
  { key: 4, label: 'Quinta', shortLabel: 'Qui', narrowLabel: 'Q' },
  { key: 5, label: 'Sexta', shortLabel: 'Sex', narrowLabel: 'S' },
  { key: 6, label: 'Sábado', shortLabel: 'Sáb', narrowLabel: 'S' },
  { key: 0, label: 'Domingo', shortLabel: 'Dom', narrowLabel: 'D' },
]

function timeToMinutes(value: string): number {
  const [hours, minutes] = value.split(':').map(Number)
  return hours * 60 + minutes
}

function minutesToTime(totalMinutes: number): string {
  return `${String(Math.floor(totalMinutes / 60)).padStart(2, '0')}:${String(totalMinutes % 60).padStart(2, '0')}`
}

export function addMinutesToClockTime(value: string, minutes: number): string {
  return minutesToTime(timeToMinutes(value) + minutes)
}

export function getDurationMinutes(startTime: string, endTime: string): number {
  return timeToMinutes(endTime) - timeToMinutes(startTime)
}

export function resolveProviderWorkspaceConfig(
  config?: Partial<ProviderWorkspaceConfig> | null,
): ProviderWorkspaceConfig {
  return {
    workspaceStartTime: config?.workspaceStartTime ?? DEFAULT_PROVIDER_WORKSPACE.workspaceStartTime,
    workspaceEndTime: config?.workspaceEndTime ?? DEFAULT_PROVIDER_WORKSPACE.workspaceEndTime,
    defaultSessionDurationMinutes:
      config?.defaultSessionDurationMinutes ?? DEFAULT_PROVIDER_WORKSPACE.defaultSessionDurationMinutes,
  }
}

export function getWorkspaceDays(): WorkspaceDay[] {
  return WORKSPACE_DAYS
}

export function buildWorkspaceHourRows(config: ProviderWorkspaceConfig): string[] {
  const rows: string[] = []
  const startMinutes = timeToMinutes(config.workspaceStartTime)
  const endMinutes = timeToMinutes(config.workspaceEndTime)

  for (let minutes = startMinutes; minutes <= endMinutes; minutes += 60) {
    rows.push(minutesToTime(minutes))
  }

  return rows
}

export function buildStartTimeOptions(config: ProviderWorkspaceConfig) {
  return buildWorkspaceHourRows(config).map((value) => ({ value, label: value }))
}

export function toDateKey(date: Date): string {
  return format(date, 'yyyy-MM-dd')
}

export function buildWorkspaceWeek(referenceDate: Date): WorkspaceWeekDay[] {
  const weekStart = startOfWeek(referenceDate, { weekStartsOn: 1 })
  const todayKey = toDateKey(new Date())

  return WORKSPACE_DAYS.map((day, index) => {
    const date = addDays(weekStart, index)

    return {
      ...day,
      date,
      dateStr: toDateKey(date),
      dayLabel: day.shortLabel,
      dateLabel: format(date, 'dd/MM'),
      isToday: toDateKey(date) === todayKey,
    }
  })
}

export function buildWorkspaceWeekRange(referenceDate: Date) {
  const weekStart = startOfWeek(referenceDate, { weekStartsOn: 1 })
  const weekEnd = addDays(weekStart, 6)

  return {
    start: weekStart,
    end: weekEnd,
    from: toDateKey(weekStart),
    to: toDateKey(weekEnd),
  }
}

export function buildWorkspaceMonthRange(referenceDate: Date) {
  const start = startOfMonth(referenceDate)
  const end = endOfMonth(referenceDate)

  return {
    start,
    end,
    from: toDateKey(start),
    to: toDateKey(end),
  }
}

export function buildWorkspaceMonthCells(referenceDate: Date): WorkspaceMonthCell[] {
  const monthStart = startOfMonth(referenceDate)
  const monthEnd = endOfMonth(referenceDate)
  const gridStart = startOfWeek(monthStart, { weekStartsOn: 1 })
  const gridEnd = endOfWeek(monthEnd, { weekStartsOn: 1 })
  const todayKey = toDateKey(new Date())
  const cells: WorkspaceMonthCell[] = []

  for (let cursor = new Date(gridStart); cursor <= gridEnd; cursor = addDays(cursor, 1)) {
    const cellDate = new Date(cursor)
    cells.push({
      date: cellDate,
      dateStr: toDateKey(cellDate),
      dayNumber: format(cellDate, 'd'),
      inCurrentMonth: cellDate.getMonth() === monthStart.getMonth(),
      isToday: toDateKey(cellDate) === todayKey,
    })
  }

  return cells
}

export function getHourBlockEnd(startTime: string): string {
  return addMinutesToClockTime(startTime, 60)
}
