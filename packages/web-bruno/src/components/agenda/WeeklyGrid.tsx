import { useState } from 'react'
import { format, addDays, startOfWeek } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { TimeSlot } from './TimeSlot'
import { SlotDetail } from './SlotDetail'
import { WeekNavigator } from './WeekNavigator'
import { useWeekAppointments, useUpdateAppointment } from '@/api/appointments'
import { usePatients } from '@/api/patients'
import { useAbsences, useShifts } from '@/api/settings'
import { TIME_SLOTS, DAYS_OF_WEEK } from '@/config/constants'
import { getAppointmentForSlot } from '@/lib/slots'
import type { Appointment } from '@/schemas/appointment.schema'

interface WeeklyGridProps {
  onCreateAppointment: (date: string, time: string) => void
}

export function WeeklyGrid({ onCreateAppointment }: WeeklyGridProps) {
  const [currentWeek, setCurrentWeek] = useState(new Date())
  const [selectedAppointment, setSelectedAppointment] = useState<Appointment | null>(null)
  const [detailOpen, setDetailOpen] = useState(false)

  const weekStart = startOfWeek(currentWeek, { weekStartsOn: 1 })
  const { data: appointments = [] } = useWeekAppointments(currentWeek)
  const { data: patients = [] } = usePatients()
  const { data: absencesData } = useAbsences()
  const { data: shiftsData } = useShifts()
  const updateAppointment = useUpdateAppointment()

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

  function handleSlotClick(dateStr: string, time: string) {
    const appointment = getAppointmentForSlot(dateStr, time, appointments)
    if (appointment) {
      setSelectedAppointment(appointment)
      setDetailOpen(true)
    } else {
      onCreateAppointment(dateStr, time)
    }
  }

  function handleUpdateStatus(id: string, status: Appointment['status']) {
    updateAppointment.mutate({ id, data: { status } })
    setDetailOpen(false)
  }

  function handleMarkPaid(id: string) {
    updateAppointment.mutate({
      id,
      data: { paymentStatus: 'paid', paidAt: new Date().toISOString() },
    })
    setDetailOpen(false)
  }

  const selectedPatient = selectedAppointment
    ? patients.find((p) => p.id === selectedAppointment.patientId) ?? null
    : null

  return (
    <div>
      <div className="mb-4">
        <WeekNavigator currentWeek={currentWeek} onWeekChange={setCurrentWeek} />
      </div>

      <div className="overflow-x-auto rounded-xl border border-gray-200 bg-white shadow-sm">
        <table className="w-full table-fixed">
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
        onClose={() => setDetailOpen(false)}
        appointment={selectedAppointment}
        patient={selectedPatient}
        onUpdateStatus={handleUpdateStatus}
        onMarkPaid={handleMarkPaid}
      />
    </div>
  )
}
