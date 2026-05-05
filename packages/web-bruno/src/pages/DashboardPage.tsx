import { useState } from 'react'
import { WeeklyGrid } from '@/components/agenda/WeeklyGrid'
import { AppointmentForm } from '@/components/appointments/AppointmentForm'
import { Button } from '@/components/ui/Button'
import type { Appointment } from '@/schemas/appointment.schema'

export default function DashboardPage() {
  const [formOpen, setFormOpen] = useState(false)
  const [defaultDate, setDefaultDate] = useState('')
  const [defaultTime, setDefaultTime] = useState('')
  const [editingAppointment, setEditingAppointment] = useState<Appointment | null>(null)
  const [notice, setNotice] = useState<string | null>(null)

  function handleCloseForm() {
    setFormOpen(false)
    setDefaultDate('')
    setDefaultTime('')
    setEditingAppointment(null)
  }

  function handleCreateAppointment(date: string, time: string) {
    setNotice(null)
    setEditingAppointment(null)
    setDefaultDate(date)
    setDefaultTime(time)
    setFormOpen(true)
  }

  function handleEditAppointment(appointment: Appointment) {
    setNotice(null)
    setEditingAppointment(appointment)
    setDefaultDate('')
    setDefaultTime('')
    setFormOpen(true)
  }

  function handleFormSuccess(message?: string) {
    handleCloseForm()
    if (message) {
      setNotice(message)
    }
  }

  return (
    <div>
      <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="text-xl font-bold text-gray-800">Agenda Semanal</h1>
        <Button
          className="w-full sm:w-auto"
          onClick={() => {
            setNotice(null)
            setEditingAppointment(null)
            setDefaultDate('')
            setDefaultTime('')
            setFormOpen(true)
          }}
        >
          + Nova Sessão
        </Button>
      </div>

      {notice && (
        <div className="mb-4 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
          {notice}
        </div>
      )}

      <WeeklyGrid
        onCreateAppointment={handleCreateAppointment}
        onEditAppointment={handleEditAppointment}
        onNotice={setNotice}
      />

      {formOpen && (
        <AppointmentForm
          open={formOpen}
          onClose={handleCloseForm}
          defaultDate={defaultDate}
          defaultTime={defaultTime}
          appointment={editingAppointment}
          onSuccess={handleFormSuccess}
        />
      )}
    </div>
  )
}
