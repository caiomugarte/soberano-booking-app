import { Fragment, startTransition, useState } from 'react'
import {
  addDays,
  addMonths,
  addWeeks,
  format,
  startOfWeek,
  subDays,
  subMonths,
  subWeeks,
} from 'date-fns'
import { ptBR } from 'date-fns/locale'
import {
  useDeleteAppointment,
  useStopRecurringSeries,
  useUpdateAppointment,
  useAppointments,
} from '@/api/appointments'
import {
  useAbsences,
  useCreateAbsence,
  useDeleteAbsence,
  useProviderProfile,
  useShifts,
  type Absence,
  type Shift,
} from '@/api/settings'
import { usePatients } from '@/api/patients'
import { SlotDetail } from '@/components/agenda/SlotDetail'
import { TimeSlot } from '@/components/agenda/TimeSlot'
import { BlockAgendaDialog, type BlockAgendaDraft } from '@/components/agenda/BlockAgendaDialog'
import { Button } from '@/components/ui/Button'
import {
  buildWorkspaceHourRows,
  buildWorkspaceMonthCells,
  buildWorkspaceMonthRange,
  buildWorkspaceWeek,
  buildWorkspaceWeekRange,
  getHourBlockEnd,
  getWorkspaceDays,
  resolveProviderWorkspaceConfig,
  toDateKey,
  type WorkspaceMonthCell,
  type WorkspaceWeekDay,
} from '@/lib/calendar-workspace'
import { getAppointmentForHourBlock } from '@/lib/slots'
import type { Appointment, PaymentMethod, ProtocolCreditAction } from '@/schemas/appointment.schema'
import type { Patient } from '@/schemas/patient.schema'

type CalendarWorkspaceView = 'day' | 'week' | 'month'

const DAY_HOUR_BLOCK_HEIGHT = 104
const WEEK_HOUR_BLOCK_HEIGHT = 112
const DAY_HOUR_BLOCK_GAP = 8
const WEEK_CELL_VERTICAL_PADDING = 16

interface CalendarWorkspaceProps {
  onCreateAppointment: (date: string, time: string) => void
  onEditAppointment: (appointment: Appointment) => void
  onNotice?: (message: string) => void
}

interface CalendarWorkspaceHeaderProps {
  referenceDate: Date
  view: CalendarWorkspaceView
  onViewChange: (view: CalendarWorkspaceView) => void
  onReferenceDateChange: (date: Date) => void
  onOpenBlockDay: () => void
}

interface DayAgendaViewProps {
  day: WorkspaceWeekDay
  hourRows: string[]
  appointments: Appointment[]
  patients: Patient[]
  absences: Absence[]
  shifts: Shift[]
  onOpenAppointment: (appointment: Appointment) => void
  onOpenCreate: (date: string, time: string) => void
  onOpenBlockSlot: (draft: BlockAgendaDraft) => void
}

interface WeekAgendaViewProps extends Omit<DayAgendaViewProps, 'day'> {
  weekDays: WorkspaceWeekDay[]
  referenceDate: Date
  onReferenceDateChange: (date: Date) => void
}

interface MonthAgendaViewProps {
  referenceDate: Date
  appointments: Appointment[]
  absences: Absence[]
  onDrillIntoDate: (date: Date) => void
}

function getRangeLabel(view: CalendarWorkspaceView, referenceDate: Date): string {
  if (view === 'day') {
    return format(referenceDate, "EEEE, dd 'de' MMMM", { locale: ptBR })
  }

  if (view === 'month') {
    return format(referenceDate, "MMMM 'de' yyyy", { locale: ptBR })
  }

  const weekStart = startOfWeek(referenceDate, { weekStartsOn: 1 })
  const weekEnd = addDays(weekStart, 6)

  return `${format(weekStart, "dd 'de' MMM", { locale: ptBR })} - ${format(weekEnd, "dd 'de' MMM", { locale: ptBR })}`
}

function formatMonthIndicatorLabel(count: number, singular: string, plural: string): string {
  return `${count} ${count === 1 ? singular : plural}`
}

function getFullDayAbsence(dateStr: string, absences: Absence[]): Absence | undefined {
  return absences.find((absence) => absence.date.slice(0, 10) === dateStr && !absence.startTime && !absence.endTime)
}

function getAbsenceForHourBlock(dateStr: string, time: string, absences: Absence[]): Absence | undefined {
  return absences.find((absence) => {
    if (absence.date.slice(0, 10) !== dateStr) return false
    if (!absence.startTime || !absence.endTime) return true
    return absence.startTime < getHourBlockEnd(time) && absence.endTime > time
  })
}

function isOutsideShift(dayKey: number, time: string, shifts: Shift[]): boolean {
  if (!shifts.length) return false

  const dayShifts = shifts.filter((shift) => shift.dayOfWeek === dayKey)
  if (!dayShifts.length) return true

  return !dayShifts.some((shift) => time >= shift.startTime && time < shift.endTime)
}

function getPatientName(
  patientId: string,
  patients: Patient[],
): Patient | undefined {
  return patients.find((patient) => patient.id === patientId)
}

function overlapsHourBlock(startTime: string, endTime: string, blockStartTime: string): boolean {
  return startTime < getHourBlockEnd(blockStartTime) && endTime > blockStartTime
}

function getVisibleHourBlockSpan(
  startTime: string,
  endTime: string,
  hourRows: string[],
  startIndex: number,
): number {
  const visibleHourRows = hourRows.slice(startIndex)
  const overlapCount = visibleHourRows.filter((blockStartTime) =>
    overlapsHourBlock(startTime, endTime, blockStartTime),
  ).length

  return Math.max(1, overlapCount)
}

function isRecordContinuation(startTime: string, blockStartTime: string, blockIndex: number): boolean {
  return blockIndex > 0 && startTime < blockStartTime
}

function getDayAppointmentBlockHeight(blockSpan: number): number {
  return DAY_HOUR_BLOCK_HEIGHT * blockSpan + DAY_HOUR_BLOCK_GAP * (blockSpan - 1)
}

function getWeekAppointmentBlockHeight(blockSpan: number): number {
  return WEEK_HOUR_BLOCK_HEIGHT * blockSpan + WEEK_CELL_VERTICAL_PADDING * (blockSpan - 1)
}

function getOutsideShiftSpan(
  dateStr: string,
  dayKey: number,
  hourRows: string[],
  startIndex: number,
  shifts: Shift[],
  absences: Absence[],
  appointments: Appointment[],
): number {
  let span = 0

  for (let index = startIndex; index < hourRows.length; index += 1) {
    const time = hourRows[index]
    const hasAbsence = Boolean(getAbsenceForHourBlock(dateStr, time, absences))
    const hasAppointment = Boolean(getAppointmentForHourBlock(dateStr, time, appointments))
    const outsideShift = isOutsideShift(dayKey, time, shifts)

    if (hasAbsence || hasAppointment || !outsideShift) {
      break
    }

    span += 1
  }

  return Math.max(1, span)
}

function isOutsideShiftContinuation(
  dateStr: string,
  dayKey: number,
  hourRows: string[],
  blockIndex: number,
  shifts: Shift[],
  absences: Absence[],
  appointments: Appointment[],
): boolean {
  if (blockIndex === 0) {
    return false
  }

  const previousTime = hourRows[blockIndex - 1]

  return (
    !getAbsenceForHourBlock(dateStr, previousTime, absences) &&
    !getAppointmentForHourBlock(dateStr, previousTime, appointments) &&
    isOutsideShift(dayKey, previousTime, shifts)
  )
}

function resolveVisibleWorkspaceConfig(
  config: ReturnType<typeof resolveProviderWorkspaceConfig>,
  shifts: Shift[],
) {
  if (!shifts.length) {
    return config
  }

  let workspaceStartTime = config.workspaceStartTime
  let workspaceEndTime = config.workspaceEndTime

  for (const shift of shifts) {
    if (shift.startTime < workspaceStartTime) {
      workspaceStartTime = shift.startTime
    }

    if (shift.endTime > workspaceEndTime) {
      workspaceEndTime = shift.endTime
    }
  }

  return {
    ...config,
    workspaceStartTime,
    workspaceEndTime,
  }
}

function BlockedSlotCard({
  absence,
  onClick,
}: {
  absence: Absence
  onClick: () => void
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex h-full min-h-[72px] w-full flex-col items-start justify-center rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-left text-sm text-amber-900 transition-colors hover:bg-amber-100"
    >
      <span className="font-medium">
        {absence.startTime && absence.endTime ? `${absence.startTime} - ${absence.endTime}` : 'Dia bloqueado'}
      </span>
      <span className="mt-1 text-xs text-amber-800">
        {absence.reason?.trim() || 'Toque para remover o bloqueio.'}
      </span>
    </button>
  )
}

function UnavailableSlotCard({ label }: { label: string }) {
  return (
    <div className="flex h-full min-h-[72px] items-center rounded-xl border border-gray-100 bg-gray-50 px-3 text-sm text-gray-400">
      {label}
    </div>
  )
}

function EmptySlotActions({
  date,
  time,
  onOpenCreate,
}: {
  date: string
  time: string
  onOpenCreate: (date: string, time: string) => void
}) {
  return (
    <TimeSlot
      time={time}
      onClick={() => onOpenCreate(date, time)}
      showEmptyLabel
      className="min-h-[72px]"
    />
  )
}

function CalendarWorkspaceHeader({
  referenceDate,
  view,
  onViewChange,
  onReferenceDateChange,
  onOpenBlockDay,
}: CalendarWorkspaceHeaderProps) {
  function shiftReference(direction: 'previous' | 'next') {
    const nextDate =
      view === 'day'
        ? direction === 'previous'
          ? subDays(referenceDate, 1)
          : addDays(referenceDate, 1)
        : view === 'month'
          ? direction === 'previous'
            ? subMonths(referenceDate, 1)
            : addMonths(referenceDate, 1)
          : direction === 'previous'
            ? subWeeks(referenceDate, 1)
            : addWeeks(referenceDate, 1)

    startTransition(() => onReferenceDateChange(nextDate))
  }

  return (
    <div className="rounded-[28px] border border-primary-100 bg-white shadow-sm">
      <div className="rounded-t-[28px] border-b border-primary-100 bg-[linear-gradient(135deg,rgba(238,246,241,0.95),rgba(250,248,241,0.92))] px-5 py-5">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div className="space-y-2">
            <div className="inline-flex items-center rounded-full border border-primary-200 bg-white/80 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-primary-700">
              Workspace de agenda
            </div>
            <div>
              <h2 className="text-2xl font-semibold text-gray-900">Dia, semana e calendário no mesmo fluxo</h2>
              <p className="mt-1 text-sm text-gray-600">
                O contexto da data permanece estável enquanto você cria sessões, bloqueia horários e navega pelos próximos períodos.
              </p>
            </div>
          </div>

          <div className="flex flex-col gap-3 lg:items-end">
            <div className="inline-flex rounded-full border border-primary-100 bg-white p-1 shadow-sm">
              {([
                { value: 'day', label: 'Dia' },
                { value: 'week', label: 'Semana' },
                { value: 'month', label: 'Calendário' },
              ] as const).map((option) => (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => startTransition(() => onViewChange(option.value))}
                  className={`rounded-full px-4 py-2 text-sm font-medium transition-colors ${
                    view === option.value
                      ? 'bg-primary-500 text-white'
                      : 'text-gray-600 hover:bg-primary-50 hover:text-primary-700'
                  }`}
                >
                  {option.label}
                </button>
              ))}
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <Button variant="ghost" size="sm" onClick={() => shiftReference('previous')}>
                ←
              </Button>
              <Button variant="ghost" size="sm" onClick={() => startTransition(() => onReferenceDateChange(new Date()))}>
                Hoje
              </Button>
              <Button variant="ghost" size="sm" onClick={() => shiftReference('next')}>
                →
              </Button>
              <Button variant="secondary" size="sm" onClick={onOpenBlockDay}>
                Bloquear agenda
              </Button>
            </div>
          </div>
        </div>
      </div>

      <div className="flex flex-col gap-2 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="text-xs font-semibold uppercase tracking-[0.16em] text-primary-600">Período em foco</div>
          <div className="mt-1 text-lg font-semibold capitalize text-gray-900">
            {getRangeLabel(view, referenceDate)}
          </div>
        </div>
        <p className="max-w-xl text-sm text-gray-500">
          Use os cartões vazios para criar sessões. Para bloquear a agenda, use o botão do cabeçalho.
        </p>
      </div>
    </div>
  )
}

function CalendarWorkspaceDayView({
  day,
  hourRows,
  appointments,
  patients,
  absences,
  shifts,
  onOpenAppointment,
  onOpenCreate,
  onOpenBlockSlot,
}: DayAgendaViewProps) {
  const fullDayAbsence = getFullDayAbsence(day.dateStr, absences)

  return (
    <div className="rounded-[28px] border border-gray-200 bg-white shadow-sm">
      <div className="border-b border-gray-100 px-5 py-4">
        <div>
          <p className="text-sm font-semibold capitalize text-gray-900">
            {day.label} • {day.dateLabel}
          </p>
          <p className="text-xs text-gray-500">Sessões e bloqueios deste dia em uma única linha de trabalho.</p>
        </div>
      </div>

      {fullDayAbsence ? (
        <div className="p-5">
          <BlockedSlotCard
            absence={fullDayAbsence}
            onClick={() => onOpenBlockSlot({ date: day.dateStr, absence: fullDayAbsence })}
          />
        </div>
      ) : (
        <div
          className="grid grid-cols-[72px_minmax(0,1fr)] gap-x-3 gap-y-2 p-5"
          style={{
            gridTemplateRows: `repeat(${hourRows.length}, minmax(${DAY_HOUR_BLOCK_HEIGHT}px, auto))`,
          }}
        >
          {hourRows.map((time, index) => {
            const absence = getAbsenceForHourBlock(day.dateStr, time, absences)
            const appointment = getAppointmentForHourBlock(day.dateStr, time, appointments)
            const isAbsenceContinuation = absence?.startTime
              ? isRecordContinuation(absence.startTime, time, index)
              : Boolean(absence && index > 0)
            const isAppointmentContinuation = appointment
              ? isRecordContinuation(appointment.startTime, time, index)
              : false
            const outsideShift = isOutsideShift(day.key, time, shifts)
            const isOutsideShiftBlockContinuation = outsideShift
              ? isOutsideShiftContinuation(day.dateStr, day.key, hourRows, index, shifts, absences, appointments)
              : false
            const patient = appointment ? getPatientName(appointment.patientId, patients) : undefined
            const absenceSpan =
              absence?.startTime && absence.endTime
                ? getVisibleHourBlockSpan(absence.startTime, absence.endTime, hourRows, index)
                : hourRows.length - index
            const appointmentSpan = appointment
              ? getVisibleHourBlockSpan(appointment.startTime, appointment.endTime, hourRows, index)
              : 1
            const outsideShiftSpan = outsideShift
              ? getOutsideShiftSpan(day.dateStr, day.key, hourRows, index, shifts, absences, appointments)
              : 1

            return (
              <Fragment key={`${day.dateStr}-${time}`}>
                <div
                  className="pt-3 text-xs font-semibold text-gray-500"
                  style={{ gridColumn: '1', gridRow: `${index + 1}` }}
                >
                  {time}
                </div>
                {absence ? (
                  isAbsenceContinuation ? null : (
                  <div
                    className="min-w-0"
                    style={{
                      gridColumn: '2',
                      gridRow: `${index + 1} / span ${absenceSpan}`,
                      height: `${getDayAppointmentBlockHeight(absenceSpan)}px`,
                    }}
                  >
                    <BlockedSlotCard
                      absence={absence}
                      onClick={() => onOpenBlockSlot({ date: day.dateStr, absence })}
                    />
                  </div>
                  )
                ) : isAppointmentContinuation ? null : appointment ? (
                  <div
                    className="min-w-0"
                    style={{
                      gridColumn: '2',
                      gridRow: `${index + 1} / span ${appointmentSpan}`,
                      height: `${getDayAppointmentBlockHeight(appointmentSpan)}px`,
                    }}
                  >
                    <TimeSlot
                      time={time}
                      appointment={appointment}
                      patient={patient}
                      onClick={() => onOpenAppointment(appointment)}
                      compact={appointmentSpan === 1}
                      className="h-full min-h-[104px]"
                    />
                  </div>
                ) : outsideShift ? (
                  isOutsideShiftBlockContinuation ? null : (
                  <div
                    className="min-w-0"
                    style={{
                      gridColumn: '2',
                      gridRow: `${index + 1} / span ${outsideShiftSpan}`,
                      height: `${getDayAppointmentBlockHeight(outsideShiftSpan)}px`,
                    }}
                  >
                    <UnavailableSlotCard label="Fora do turno" />
                  </div>
                  )
                ) : (
                  <div
                    className="min-w-0"
                    style={{ gridColumn: '2', gridRow: `${index + 1}` }}
                  >
                    <EmptySlotActions
                      date={day.dateStr}
                      time={time}
                      onOpenCreate={onOpenCreate}
                    />
                  </div>
                )}
              </Fragment>
            )
          })}
        </div>
      )}
    </div>
  )
}

function CalendarWorkspaceWeekView({
  weekDays,
  referenceDate,
  hourRows,
  appointments,
  patients,
  absences,
  shifts,
  onOpenAppointment,
  onOpenCreate,
  onOpenBlockSlot,
  onReferenceDateChange,
}: WeekAgendaViewProps) {
  const selectedDay = weekDays.find((day) => day.dateStr === toDateKey(referenceDate)) ?? weekDays[0]

  return (
    <div className="space-y-4">
      <div className="space-y-4 md:hidden">
        <div className="overflow-x-auto">
          <div className="flex min-w-max gap-2">
            {weekDays.map((day) => (
              <button
                key={day.dateStr}
                type="button"
                onClick={() => startTransition(() => onReferenceDateChange(day.date))}
                className={`rounded-2xl border px-3 py-2 text-left transition-colors ${
                  selectedDay.dateStr === day.dateStr
                    ? 'border-primary-300 bg-primary-50 text-primary-800'
                    : 'border-gray-200 bg-white text-gray-600'
                }`}
              >
                <div className="text-xs font-medium">{day.dayLabel}</div>
                <div className="text-sm font-semibold">{day.dateLabel}</div>
              </button>
            ))}
          </div>
        </div>

        <CalendarWorkspace.DayView
          day={selectedDay}
          hourRows={hourRows}
          appointments={appointments}
          patients={patients}
          absences={absences}
          shifts={shifts}
          onOpenAppointment={onOpenAppointment}
          onOpenCreate={onOpenCreate}
          onOpenBlockSlot={onOpenBlockSlot}
        />
      </div>

      <div className="hidden overflow-x-auto rounded-[28px] border border-gray-200 bg-white shadow-sm md:block">
        <table className="w-full min-w-[980px] table-fixed">
          <thead>
            <tr>
              <th className="w-20 border-b border-r border-gray-200 bg-gray-50 px-2 py-4 text-xs font-semibold uppercase tracking-[0.12em] text-gray-500">
                Hora
              </th>
              {weekDays.map((day) => (
                <th
                  key={day.dateStr}
                  className={`border-b border-r border-gray-200 px-3 py-4 text-left last:border-r-0 ${
                    day.isToday ? 'bg-primary-50' : 'bg-gray-50'
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <div className="text-xs font-semibold uppercase tracking-[0.12em] text-gray-500">
                        {day.dayLabel}
                      </div>
                      <div className={`mt-1 text-sm font-semibold ${day.isToday ? 'text-primary-800' : 'text-gray-800'}`}>
                        {day.dateLabel}
                      </div>
                    </div>
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {hourRows.map((time, timeIndex) => (
              <tr key={time}>
                <td className="border-b border-r border-gray-200 px-2 py-2 text-center text-xs font-semibold text-gray-500">
                  {time}
                </td>
                {weekDays.map((day) => {
                  const absence = getAbsenceForHourBlock(day.dateStr, time, absences)
                  const appointment = getAppointmentForHourBlock(day.dateStr, time, appointments)
                  const isAbsenceContinuation = absence?.startTime
                    ? isRecordContinuation(absence.startTime, time, timeIndex)
                    : Boolean(absence && timeIndex > 0)
                  const isAppointmentContinuation = appointment
                    ? isRecordContinuation(appointment.startTime, time, timeIndex)
                    : false
                  const outsideShift = isOutsideShift(day.key, time, shifts)
                  const isOutsideShiftBlockContinuation = outsideShift
                    ? isOutsideShiftContinuation(day.dateStr, day.key, hourRows, timeIndex, shifts, absences, appointments)
                    : false
                  const patient = appointment ? getPatientName(appointment.patientId, patients) : undefined
                  const absenceSpan =
                    absence?.startTime && absence.endTime
                      ? getVisibleHourBlockSpan(absence.startTime, absence.endTime, hourRows, timeIndex)
                      : hourRows.length - timeIndex
                  const appointmentSpan = appointment
                    ? getVisibleHourBlockSpan(appointment.startTime, appointment.endTime, hourRows, timeIndex)
                    : 1
                  const outsideShiftSpan = outsideShift
                    ? getOutsideShiftSpan(day.dateStr, day.key, hourRows, timeIndex, shifts, absences, appointments)
                    : 1

                  return (
                    absence ? (
                      isAbsenceContinuation ? null : (
                      <td
                        key={`${day.dateStr}-${time}`}
                        rowSpan={absenceSpan}
                        className="border-b border-r border-gray-100 p-2 align-top last:border-r-0"
                      >
                        <div style={{ height: `${getWeekAppointmentBlockHeight(absenceSpan)}px` }}>
                          <BlockedSlotCard
                            absence={absence}
                            onClick={() => onOpenBlockSlot({ date: day.dateStr, absence })}
                          />
                        </div>
                      </td>
                      )
                    ) : isAppointmentContinuation ? null : appointment ? (
                      <td
                        key={`${day.dateStr}-${time}`}
                        rowSpan={appointmentSpan}
                        className="border-b border-r border-gray-100 p-2 align-top last:border-r-0"
                      >
                        <div style={{ height: `${getWeekAppointmentBlockHeight(appointmentSpan)}px` }}>
                          <TimeSlot
                            time={time}
                            appointment={appointment}
                            patient={patient}
                            onClick={() => onOpenAppointment(appointment)}
                            compact={appointmentSpan === 1}
                            className="h-full min-h-[112px]"
                          />
                        </div>
                      </td>
                    ) : outsideShift ? (
                      isOutsideShiftBlockContinuation ? null : (
                        <td
                          key={`${day.dateStr}-${time}`}
                          rowSpan={outsideShiftSpan}
                          className="border-b border-r border-gray-100 p-2 align-top last:border-r-0"
                        >
                          <div style={{ height: `${getWeekAppointmentBlockHeight(outsideShiftSpan)}px` }}>
                            <UnavailableSlotCard label="Fora do turno" />
                          </div>
                        </td>
                      )
                    ) : (
                      <td key={`${day.dateStr}-${time}`} className="border-b border-r border-gray-100 p-2 align-top last:border-r-0">
                        <EmptySlotActions
                          date={day.dateStr}
                          time={time}
                          onOpenCreate={onOpenCreate}
                        />
                      </td>
                    )
                  )
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

function CalendarWorkspaceMonthView({
  referenceDate,
  appointments,
  absences,
  onDrillIntoDate,
}: MonthAgendaViewProps) {
  const monthCells = buildWorkspaceMonthCells(referenceDate)
  const monthDayHeaders = getWorkspaceDays().map((day) => day.shortLabel)

  function getAppointmentsForDate(dateStr: string) {
    return appointments.filter((appointment) => appointment.date === dateStr && appointment.status !== 'cancelled')
  }

  function getAbsencesForDate(dateStr: string) {
    return absences.filter((absence) => absence.date.slice(0, 10) === dateStr)
  }

  function renderCellIndicators(cell: WorkspaceMonthCell) {
    const dayAppointments = getAppointmentsForDate(cell.dateStr)
    const dayAbsences = getAbsencesForDate(cell.dateStr)
    const fullDayAbsence = dayAbsences.find((absence) => !absence.startTime && !absence.endTime)

    if (dayAppointments.length === 0 && dayAbsences.length === 0) {
      return (
        <span className="text-xs text-gray-400">
          Sem eventos
        </span>
      )
    }

    return (
      <div className="flex flex-wrap items-center gap-1.5">
        {dayAppointments.length > 0 && (
          <span className="rounded-full bg-primary-100 px-2 py-1 text-[11px] font-medium text-primary-700">
            {formatMonthIndicatorLabel(dayAppointments.length, 'sessão', 'sessões')}
          </span>
        )}
        {dayAbsences.length > 0 && (
          <span className="rounded-full bg-amber-100 px-2 py-1 text-[11px] font-medium text-amber-800">
            {fullDayAbsence ? 'Bloqueado' : formatMonthIndicatorLabel(dayAbsences.length, 'bloqueio', 'bloqueios')}
          </span>
        )}
      </div>
    )
  }

  return (
    <div className="rounded-[28px] border border-gray-200 bg-white shadow-sm">
      <div className="grid grid-cols-7 border-b border-gray-100">
        {monthDayHeaders.map((label) => (
          <div key={label} className="px-4 py-3 text-center text-xs font-semibold uppercase tracking-[0.12em] text-gray-500">
            {label}
          </div>
        ))}
      </div>

      <div className="grid grid-cols-7">
        {monthCells.map((cell) => (
          <button
            key={cell.dateStr}
            type="button"
            onClick={() => startTransition(() => onDrillIntoDate(cell.date))}
            className={`min-h-[132px] border-b border-r border-gray-100 px-3 py-3 text-left transition-colors hover:bg-primary-50/60 ${
              cell.inCurrentMonth ? 'bg-white' : 'bg-gray-50/80'
            }`}
          >
            <div className="flex items-center justify-between gap-2">
              <span className={`inline-flex h-9 w-9 items-center justify-center rounded-full text-sm font-semibold ${
                cell.isToday
                  ? 'bg-primary-500 text-white'
                  : cell.inCurrentMonth
                    ? 'text-gray-800'
                    : 'text-gray-400'
              }`}>
                {cell.dayNumber}
              </span>
              <span className="text-[11px] font-medium text-gray-400">
                Abrir dia
              </span>
            </div>
            <div className="mt-4 text-xs text-gray-500">
              {renderCellIndicators(cell)}
            </div>
          </button>
        ))}
      </div>
    </div>
  )
}

function CalendarWorkspaceRoot({
  onCreateAppointment,
  onEditAppointment,
  onNotice,
}: CalendarWorkspaceProps) {
  const [view, setView] = useState<CalendarWorkspaceView>('week')
  const [referenceDate, setReferenceDate] = useState(new Date())
  const [selectedAppointment, setSelectedAppointment] = useState<Appointment | null>(null)
  const [detailOpen, setDetailOpen] = useState(false)
  const [blockDraft, setBlockDraft] = useState<BlockAgendaDraft | null>(null)
  const [blockDialogOpen, setBlockDialogOpen] = useState(false)
  const [blockError, setBlockError] = useState('')

  const { data: profile } = useProviderProfile()
  const { data: patients = [] } = usePatients()
  const { data: absencesData } = useAbsences()
  const { data: shiftsData } = useShifts()
  const createAbsence = useCreateAbsence()
  const deleteAbsence = useDeleteAbsence()
  const updateAppointment = useUpdateAppointment()
  const deleteAppointment = useDeleteAppointment()
  const stopRecurringSeries = useStopRecurringSeries()

  const absences = absencesData?.absences ?? []
  const shifts = shiftsData?.shifts ?? []
  const workspaceConfig = resolveProviderWorkspaceConfig(profile)
  const visibleWorkspaceConfig = resolveVisibleWorkspaceConfig(workspaceConfig, shifts)
  const hourRows = buildWorkspaceHourRows(visibleWorkspaceConfig)
  const weekDays = buildWorkspaceWeek(referenceDate)
  const dayRange = { from: toDateKey(referenceDate), to: toDateKey(referenceDate) }
  const weekRange = buildWorkspaceWeekRange(referenceDate)
  const monthRange = buildWorkspaceMonthRange(referenceDate)
  const activeRange = view === 'day' ? dayRange : view === 'week' ? weekRange : monthRange

  const { data: appointments = [] } = useAppointments({
    from: activeRange.from,
    to: activeRange.to,
  })
  const selectedPatient = selectedAppointment
    ? patients.find((patient) => patient.id === selectedAppointment.patientId) ?? null
    : null

  function openAppointment(appointment: Appointment) {
    setSelectedAppointment(appointment)
    setDetailOpen(true)
  }

  function closeDetail() {
    setDetailOpen(false)
    setSelectedAppointment(null)
  }

  function openBlockDialog(draft: BlockAgendaDraft) {
    setBlockDraft(draft)
    setBlockError('')
    setBlockDialogOpen(true)
  }

  function closeBlockDialog() {
    setBlockDialogOpen(false)
    setBlockDraft(null)
    setBlockError('')
  }

  function openFullDayBlock(date: string) {
    const absence = getFullDayAbsence(date, absences)
    openBlockDialog({ date, absence })
  }

  async function handleCreateBlock(data: {
    date: string
    startTime?: string
    endTime?: string
    reason?: string
  }) {
    setBlockError('')

    try {
      await createAbsence.mutateAsync(data)
      closeBlockDialog()
      onNotice?.('Agenda bloqueada com sucesso.')
    } catch (error) {
      setBlockError(error instanceof Error ? error.message : 'Não foi possível bloquear a agenda.')
    }
  }

  async function handleDeleteBlock(absenceId: string) {
    setBlockError('')

    try {
      await deleteAbsence.mutateAsync(absenceId)
      closeBlockDialog()
      onNotice?.('Bloqueio removido da agenda.')
    } catch (error) {
      setBlockError(error instanceof Error ? error.message : 'Não foi possível remover o bloqueio.')
    }
  }

  async function handleUpdateStatus(
    id: string,
    status: Appointment['status'],
    protocolCreditAction?: ProtocolCreditAction,
  ) {
    await updateAppointment.mutateAsync({ id, data: { status, protocolCreditAction } })
    closeDetail()
  }

  function handleMarkPaid(id: string, paymentMethod: PaymentMethod, paidAt: string) {
    updateAppointment.mutate(
      {
        id,
        data: {
          paymentStatus: 'paid',
          paymentMethod,
          paidAt,
        },
      },
      { onSuccess: closeDetail },
    )
  }

  function handleEditAppointment(appointment: Appointment) {
    closeDetail()
    onEditAppointment(appointment)
  }

  async function handleDeleteAppointment(id: string, protocolCreditAction?: ProtocolCreditAction) {
    const patientId = selectedAppointment?.id === id ? selectedAppointment.patientId : undefined
    await deleteAppointment.mutateAsync({ id, protocolCreditAction, patientId })
    closeDetail()
  }

  async function handleStopRecurringSeries(recurringSeriesId: string, stopDate: string) {
    await stopRecurringSeries.mutateAsync({ recurringSeriesId, stopDate })
    closeDetail()
    onNotice?.('Recorrência encerrada. As próximas ocorrências foram removidas da agenda.')
  }

  return (
    <div className="space-y-4">
      <CalendarWorkspace.Header
        referenceDate={referenceDate}
        view={view}
        onViewChange={setView}
        onReferenceDateChange={setReferenceDate}
        onOpenBlockDay={() => openFullDayBlock(toDateKey(referenceDate))}
      />

      {view === 'day' ? (
        <CalendarWorkspace.DayView
          day={weekDays.find((day) => day.dateStr === toDateKey(referenceDate)) ?? weekDays[0]}
          hourRows={hourRows}
          appointments={appointments}
          patients={patients}
          absences={absences}
          shifts={shifts}
          onOpenAppointment={openAppointment}
          onOpenCreate={onCreateAppointment}
          onOpenBlockSlot={openBlockDialog}
        />
      ) : view === 'week' ? (
        <CalendarWorkspace.WeekView
          weekDays={weekDays}
          referenceDate={referenceDate}
          hourRows={hourRows}
          appointments={appointments}
          patients={patients}
          absences={absences}
          shifts={shifts}
          onOpenAppointment={openAppointment}
          onOpenCreate={onCreateAppointment}
          onOpenBlockSlot={openBlockDialog}
          onReferenceDateChange={setReferenceDate}
        />
      ) : (
        <CalendarWorkspace.MonthView
          referenceDate={referenceDate}
          appointments={appointments}
          absences={absences}
          onDrillIntoDate={(date) => {
            setReferenceDate(date)
            setView('day')
          }}
        />
      )}

      <SlotDetail
        open={detailOpen}
        onClose={closeDetail}
        appointment={selectedAppointment}
        patient={selectedPatient}
        onUpdateStatus={handleUpdateStatus}
        onMarkPaid={handleMarkPaid}
        onEdit={handleEditAppointment}
        onDelete={handleDeleteAppointment}
        onStopRecurringSeries={handleStopRecurringSeries}
      />

      <BlockAgendaDialog
        open={blockDialogOpen}
        draft={blockDraft}
        isSaving={createAbsence.isPending}
        isDeleting={deleteAbsence.isPending}
        error={blockError}
        onClose={closeBlockDialog}
        onCreate={handleCreateBlock}
        onDelete={handleDeleteBlock}
      />
    </div>
  )
}

const CalendarWorkspace = Object.assign(CalendarWorkspaceRoot, {
  Header: CalendarWorkspaceHeader,
  DayView: CalendarWorkspaceDayView,
  WeekView: CalendarWorkspaceWeekView,
  MonthView: CalendarWorkspaceMonthView,
})

export { CalendarWorkspace }
