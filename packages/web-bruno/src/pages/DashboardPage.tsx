import { useState } from 'react'
import { WeeklyGrid } from '@/components/agenda/WeeklyGrid'
import { AppointmentForm } from '@/components/appointments/AppointmentForm'
import { Button } from '@/components/ui/Button'

export default function DashboardPage() {
  const [formOpen, setFormOpen] = useState(false)
  const [defaultDate, setDefaultDate] = useState('')
  const [defaultTime, setDefaultTime] = useState('')

  function handleCreateAppointment(date: string, time: string) {
    setDefaultDate(date)
    setDefaultTime(time)
    setFormOpen(true)
  }

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-xl font-bold text-gray-800">Agenda Semanal</h1>
        <Button onClick={() => { setDefaultDate(''); setDefaultTime(''); setFormOpen(true) }}>
          + Nova Sessão
        </Button>
      </div>

      <WeeklyGrid onCreateAppointment={handleCreateAppointment} />

      {formOpen && (
        <AppointmentForm
          open={formOpen}
          onClose={() => setFormOpen(false)}
          defaultDate={defaultDate}
          defaultTime={defaultTime}
        />
      )}
    </div>
  )
}
