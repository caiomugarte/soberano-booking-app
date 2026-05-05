import { useState } from 'react'
import { format, addDays, startOfWeek } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { TimeSlot } from './TimeSlot'
import { SlotDetail } from './SlotDetail'
import { WeekNavigator } from './WeekNavigator'
import {
  useDeleteAppointment,
  useStopRecurringSeries,
  useUpdateAppointment,
  useWeekAppointments,
} from '@/api/appointments'
import { usePatients } from '@/api/patients'
import { useAbsences, useShifts } from '@/api/settings'
import { TIME_SLOTS, DAYS_OF_WEEK } from '@/config/constants'
import { getAppointmentForSlot } from '@/lib/slots'
import type { Appointment, PaymentMethod } from '@/schemas/appointment.schema'

interface WeeklyGridProps {
  onCreateAppointment: (date: string, time: string) => void
  onEditAppointment: (appointment: Appointment) => void
  onNotice?: (message: string) => void
}

export function WeeklyGrid({ onCreateAppointment, onEditAppointment, onNotice }: WeeklyGridProps) {
  const [currentWeek, setCurrentWeek] = useState(new Date())
  const [selectedDayKey, setSelectedDayKey] = useState<number>(DAYS_OF_WEEK[0].key)
  const [selectedAppointment, setSelectedAppointment] = useState<Appointment | null>(null)
  const [detailOpen, setDetailOpen] = useState(false)

  const weekStart = startOfWeek(currentWeek, { weekStartsOn: 1 })
  const { data: appointments = [] } = useWeekAppointments(currentWeek)
  const { data: patients = [] } = usePatients()
  const { data: absencesData } = useAbsences()
  const { data: shiftsData } = useShifts()
  const updateAppointment = useUpdateAppointment()
  const deleteAppointment = useDeleteAppointment()
  const stopRecurringSeries = useStopRecurringSeries()

  const absences = absencesData?.absences ?? []
  const shifts = shiftsData?.shifts ?? []

  function isAbsentSlot(dateStr: string, time: string) {
    return absences.some((d) => {
      if (d.date.slice(0, 10) !== dateStr) return false
      if (!d.startTime || !d.endTime) return true // full day absence
      return time >= d.startTime && time < d.endTime
    })
  }

  function isOutsideShift(dayKey: number, time: string) {
    if (!shifts.length) return false
    const dayShifts = shifts.filter((s) => s.dayOfWeek === dayKey)
    if (!dayShifts.length) return true
    return !dayShifts.some((s) => time >= s.startTime && time < s.endTime)
  }

  function isBreakSlot(_time: string) {
    return false
  }

  const weekDays = DAYS_OF_WEEK.map((day, i) => {
    const date = addDays(weekStart, i)
    return {
      ...day,
      date,
      dateStr: format(date, 'yyyy-MM-dd'),
      dayLabel: format(date, 'EEE', { locale: ptBR }),
      dateLabel: format(date, 'dd/MM'),
      isToday: format(date, 'yyyy-MM-dd') === format(new Date(), 'yyyy-MM-dd'),
    }
  })
  const selectedDay = weekDays.find((day) => day.key === selectedDayKey) ?? weekDays[0]

  function handleSlotClick(dateStr: string, time: string) {
    const appointment = getAppointmentForSlot(dateStr, time, appointments)
    if (appointment) {
      setSelectedAppointment(appointment)
      setDetailOpen(true)
    } else {
      onCreateAppointment(dateStr, time)
    }
  }

  function handleDetailClose() {
    setDetailOpen(false)
    setSelectedAppointment(null)
  }

  function handleUpdateStatus(id: string, status: Appointment['status']) {
    updateAppointment.mutate(
      { id, data: { status } },
      { onSuccess: handleDetailClose },
    )
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
      { onSuccess: handleDetailClose },
    )
  }

  function handleEditAppointment(appointment: Appointment) {
    handleDetailClose()
    onEditAppointment(appointment)
  }

  async function handleDeleteAppointment(id: string) {
    await deleteAppointment.mutateAsync(id)
    handleDetailClose()
  }

  async function handleStopRecurringSeries(recurringSeriesId: string, stopDate: string) {
    await stopRecurringSeries.mutateAsync({ recurringSeriesId, stopDate })
    onNotice?.('Recorrência encerrada. As próximas ocorrências foram removidas da agenda.')
  }

  const selectedPatient = selectedAppointment
    ? patients.find((p) => p.id === selectedAppointment.patientId) ?? null
    : null

  return (
    <div>
      <div className="mb-4">
        <WeekNavigator currentWeek={currentWeek} onWeekChange={setCurrentWeek} />
      </div>

      <div className="space-y-4 md:hidden">
        <div className="overflow-x-auto">
          <div className="flex min-w-max gap-2">
            {weekDays.map((day) => (
              <button
                key={day.key}
                type="button"
                onClick={() => setSelectedDayKey(day.key)}
                className={`rounded-xl border px-3 py-2 text-left transition-colors ${
                  selectedDay.key === day.key
                    ? 'border-primary-300 bg-primary-50 text-primary-800'
                    : 'border-gray-200 bg-white text-gray-600'
                }`}
              >
                <div className="text-xs font-medium capitalize">{day.dayLabel}</div>
                <div className="text-sm font-semibold">{day.dateLabel}</div>
              </button>
            ))}
          </div>
        </div>

        <div className="rounded-xl border border-gray-200 bg-white p-3 shadow-sm">
          <div className="mb-3">
            <p className="text-sm font-semibold text-gray-800 capitalize">
              {selectedDay.dayLabel} • {selectedDay.dateLabel}
            </p>
            <p className="text-xs text-gray-500">Toque em um horário para criar ou revisar uma sessão.</p>
          </div>

          <div className="space-y-2">
            {TIME_SLOTS.map((time) => {
              const isBreak = isBreakSlot(time)
              const absent = isAbsentSlot(selectedDay.dateStr, time)
              const outsideShift = isOutsideShift(selectedDay.key, time)

              if (isBreak || outsideShift || absent) {
                return (
                  <div key={time} className="grid grid-cols-[60px_minmax(0,1fr)] gap-2 rounded-lg border border-gray-100 bg-gray-50 p-2">
                    <div className="pt-2 text-xs font-medium text-gray-500">{time}</div>
                    <div className="flex min-h-[72px] items-center rounded-lg px-3 text-sm text-gray-400">
                      {absent ? 'Ausente' : outsideShift ? 'Fechado' : 'Intervalo'}
                    </div>
                  </div>
                )
              }

              const appointment = getAppointmentForSlot(selectedDay.dateStr, time, appointments)
              const patient = appointment
                ? patients.find((p) => p.id === appointment.patientId)
                : undefined

              return (
                <div key={time} className="grid grid-cols-[60px_minmax(0,1fr)] gap-2">
                  <div className="pt-3 text-xs font-medium text-gray-500">{time}</div>
                  <TimeSlot
                    time={time}
                    appointment={appointment}
                    patient={patient}
                    showEmptyLabel
                    className="min-h-[72px]"
                    onClick={() => handleSlotClick(selectedDay.dateStr, time)}
                  />
                </div>
              )
            })}
          </div>
        </div>
      </div>

      <div className="hidden overflow-x-auto rounded-xl border border-gray-200 bg-white shadow-sm md:block">
        <table className="w-full min-w-[760px] table-fixed">
          <thead>
            <tr>
              <th className="w-16 border-b border-r border-gray-200 bg-gray-50 px-2 py-3 text-xs font-medium text-gray-500">
                Hora
              </th>
              {weekDays.map((day) => (
                <th
                  key={day.key}
                  className={`border-b border-r border-gray-200 px-2 py-3 text-center last:border-r-0 ${
                    day.isToday ? 'bg-primary-200' : 'bg-gray-50'
                  }`}
                >
                  <div className="text-xs font-medium capitalize text-gray-500">
                    {day.dayLabel}
                  </div>
                  <div
                    className={`text-sm font-semibold ${
                      day.isToday ? 'text-primary-800 font-bold' : 'text-gray-700'
                    }`}
                  >
                    {day.dateLabel}
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {TIME_SLOTS.map((time) => {
              const isBreak = isBreakSlot(time)
              return (
                <tr key={time}>
                  <td className={`border-b border-r border-gray-200 px-2 py-1 text-center text-xs font-medium ${isBreak ? 'text-gray-300 bg-gray-50' : 'text-gray-400'}`}>
                    {time}
                  </td>
                  {weekDays.map((day) => {
                    const absent = isAbsentSlot(day.dateStr, time)
                    const outsideShift = isOutsideShift(day.key, time)

                    if (isBreak || outsideShift || absent) {
                      return (
                        <td
                          key={day.key}
                          className="border-b border-r border-gray-100 p-1 last:border-r-0 bg-gray-50"
                        >
                          <div className="flex h-12 items-center justify-center text-xs text-gray-300">
                            {absent ? 'Ausente' : outsideShift ? 'Fechado' : 'Intervalo'}
                          </div>
                        </td>
                      )
                    }

                    const appointment = getAppointmentForSlot(day.dateStr, time, appointments)
                    const patient = appointment
                      ? patients.find((p) => p.id === appointment.patientId)
                      : undefined

                    return (
                      <td
                        key={day.key}
                        className={`border-b border-r border-gray-100 p-1 last:border-r-0 ${
                          day.isToday ? 'bg-primary-100/50' : ''
                        }`}
                      >
                        <TimeSlot
                          time={time}
                          appointment={appointment}
                          patient={patient}
                          onClick={() => handleSlotClick(day.dateStr, time)}
                        />
                      </td>
                    )
                  })}
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      <SlotDetail
        open={detailOpen}
        onClose={handleDetailClose}
        appointment={selectedAppointment}
        patient={selectedPatient}
        onUpdateStatus={handleUpdateStatus}
        onMarkPaid={handleMarkPaid}
        onEdit={handleEditAppointment}
        onDelete={handleDeleteAppointment}
        onStopRecurringSeries={handleStopRecurringSeries}
      />
    </div>
  )
}
