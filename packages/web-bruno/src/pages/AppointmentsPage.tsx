import { useState } from 'react'
import {
  useDeleteAppointment,
  useStopRecurringSeries,
  useUpdateAppointment,
  useAppointments,
} from '@/api/appointments'
import { usePatients } from '@/api/patients'
import { SlotDetail } from '@/components/agenda/SlotDetail'
import { AppointmentForm } from '@/components/appointments/AppointmentForm'
import { AppointmentsWorkbench } from '@/components/appointments/AppointmentsWorkbench'
import { Button } from '@/components/ui/Button'
import { buildWorkspaceWeekRange } from '@/lib/calendar-workspace'
import type { Appointment, PaymentMethod, ProtocolCreditAction } from '@/schemas/appointment.schema'

function getDefaultFilters() {
  const weekRange = buildWorkspaceWeekRange(new Date())

  return {
    from: weekRange.from,
    to: weekRange.to,
    patientId: '',
  }
}

export default function AppointmentsPage() {
  const [filters, setFilters] = useState(getDefaultFilters)
  const [formOpen, setFormOpen] = useState(false)
  const [defaultDate, setDefaultDate] = useState('')
  const [defaultTime, setDefaultTime] = useState('')
  const [editingAppointment, setEditingAppointment] = useState<Appointment | null>(null)
  const [selectedAppointment, setSelectedAppointment] = useState<Appointment | null>(null)
  const [detailOpen, setDetailOpen] = useState(false)
  const [notice, setNotice] = useState<string | null>(null)

  const { data: patients = [] } = usePatients()
  const {
    data: appointments = [],
    isLoading,
    isFetching,
  } = useAppointments({
    from: filters.from || undefined,
    to: filters.to || undefined,
    patientId: filters.patientId || undefined,
  })
  const updateAppointment = useUpdateAppointment()
  const deleteAppointment = useDeleteAppointment()
  const stopRecurringSeries = useStopRecurringSeries()

  const selectedPatient = selectedAppointment
    ? patients.find((patient) => patient.id === selectedAppointment.patientId) ?? null
    : null

  function handleCloseForm() {
    setFormOpen(false)
    setDefaultDate('')
    setDefaultTime('')
    setEditingAppointment(null)
  }

  function handleOpenCreateForm() {
    setNotice(null)
    setEditingAppointment(null)
    setDefaultDate('')
    setDefaultTime('')
    setFormOpen(true)
  }

  function handleOpenAppointment(appointment: Appointment) {
    setNotice(null)
    setSelectedAppointment(appointment)
    setDetailOpen(true)
  }

  function handleDetailClose() {
    setDetailOpen(false)
    setSelectedAppointment(null)
  }

  function handleEditAppointment(appointment: Appointment) {
    handleDetailClose()
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

  async function handleUpdateStatus(
    id: string,
    status: Appointment['status'],
    protocolCreditAction?: ProtocolCreditAction,
  ) {
    await updateAppointment.mutateAsync({ id, data: { status, protocolCreditAction } })
    handleDetailClose()
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

  async function handleDeleteAppointment(id: string, protocolCreditAction?: ProtocolCreditAction) {
    const patientId = selectedAppointment?.id === id ? selectedAppointment.patientId : undefined
    await deleteAppointment.mutateAsync({ id, protocolCreditAction, patientId })
    handleDetailClose()
  }

  async function handleStopRecurringSeries(recurringSeriesId: string, stopDate: string) {
    await stopRecurringSeries.mutateAsync({ recurringSeriesId, stopDate })
    handleDetailClose()
    setNotice('Recorrência encerrada. As próximas ocorrências foram removidas da agenda.')
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-800">Agendamentos</h1>
          <p className="text-sm text-gray-500">
            Encontre sessões por período ou paciente e abra o mesmo fluxo de correção usado no workspace da agenda.
          </p>
        </div>
        <Button className="w-full sm:w-auto" onClick={handleOpenCreateForm}>
          + Nova Sessão
        </Button>
      </div>

      {notice && (
        <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
          {notice}
        </div>
      )}

      <AppointmentsWorkbench
        appointments={appointments}
        patients={patients}
        filters={filters}
        isLoading={isLoading}
        isFetching={isFetching}
        onFiltersChange={setFilters}
        onOpenAppointment={handleOpenAppointment}
      />

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
