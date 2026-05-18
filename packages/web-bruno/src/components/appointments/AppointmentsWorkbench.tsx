import { EmptyState } from '@/components/ui/EmptyState'
import { Input } from '@/components/ui/Input'
import { Panel } from '@/components/ui/Panel'
import { Select } from '@/components/ui/Select'
import { Spinner } from '@/components/ui/Spinner'
import { AppointmentStatusBadge, PaymentStatusBadge } from '@/components/ui/StatusBadge'
import { PROTOCOL_LINK_TYPE_LABELS, SESSION_TYPE_LABELS } from '@/config/constants'
import { formatAppointmentCharge } from '@/lib/appointment-pricing'
import { formatDate } from '@/lib/format'
import type { Appointment } from '@/schemas/appointment.schema'
import type { Patient } from '@/schemas/patient.schema'

type AppointmentFilters = {
  from: string
  to: string
  patientId: string
}

interface AppointmentsWorkbenchProps {
  appointments: Appointment[]
  patients: Patient[]
  filters: AppointmentFilters
  isLoading: boolean
  isFetching: boolean
  onFiltersChange: (filters: AppointmentFilters) => void
  onOpenAppointment: (appointment: Appointment) => void
}

export function AppointmentsWorkbench({
  appointments,
  patients,
  filters,
  isLoading,
  isFetching,
  onFiltersChange,
  onOpenAppointment,
}: AppointmentsWorkbenchProps) {
  const patientById = new Map(patients.map((patient) => [patient.id, patient]))
  const patientOptions = [
    { value: '', label: 'Todos os pacientes' },
    ...patients
      .slice()
      .sort((left, right) => left.name.localeCompare(right.name))
      .map((patient) => ({ value: patient.id, label: patient.name })),
  ]

  return (
    <div className="space-y-6">
      <Panel>
        <Panel.Header>Filtros</Panel.Header>
        <Panel.Body className="space-y-4">
          <div className="grid grid-cols-1 gap-3 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_minmax(0,1.3fr)]">
            <Input
              label="De"
              type="date"
              value={filters.from}
              onChange={(event) => onFiltersChange({ ...filters, from: event.target.value })}
            />
            <Input
              label="Até"
              type="date"
              value={filters.to}
              onChange={(event) => onFiltersChange({ ...filters, to: event.target.value })}
            />
            <Select
              label="Paciente"
              value={filters.patientId}
              onChange={(event) => onFiltersChange({ ...filters, patientId: event.target.value })}
              options={patientOptions}
            />
          </div>
          <div className="flex flex-col gap-2 text-xs text-gray-500 sm:flex-row sm:items-center sm:justify-between">
            <span>
              {appointments.length} {appointments.length === 1 ? 'agendamento encontrado' : 'agendamentos encontrados'}
            </span>
            {isFetching && !isLoading && <span>Atualizando lista...</span>}
          </div>
        </Panel.Body>
      </Panel>

      <Panel>
        <Panel.Header>Lista de agendamentos</Panel.Header>
        <Panel.Body className="p-0">
          {isLoading ? (
            <div className="flex justify-center py-12">
              <Spinner />
            </div>
          ) : appointments.length === 0 ? (
            <EmptyState
              title="Nenhum agendamento encontrado"
              description="Ajuste o período ou selecione outro paciente para localizar a sessão."
            />
          ) : (
            <div className="divide-y divide-gray-100">
              {appointments.map((appointment) => {
                const patient = patientById.get(appointment.patientId)

                return (
                  <button
                    key={appointment.id}
                    type="button"
                    onClick={() => onOpenAppointment(appointment)}
                    className="w-full px-5 py-4 text-left transition-colors hover:bg-gray-50"
                  >
                    <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                      <div className="space-y-2">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="text-sm font-semibold text-gray-800">
                            {patient?.name ?? 'Paciente'}
                          </span>
                          <AppointmentStatusBadge status={appointment.status} />
                          <PaymentStatusBadge status={appointment.paymentStatus} />
                        </div>
                        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-gray-500">
                          <span>
                            {formatDate(appointment.date)} • {appointment.startTime}
                          </span>
                          <span>{SESSION_TYPE_LABELS[appointment.type]}</span>
                          {appointment.protocolLinkType && appointment.protocolLinkType !== 'standalone' && (
                            <span>{PROTOCOL_LINK_TYPE_LABELS[appointment.protocolLinkType]}</span>
                          )}
                        </div>
                      </div>
                      <div className="flex flex-col items-start gap-1 text-left lg:items-end">
                        <span className="text-sm font-semibold text-gray-800">
                          {formatAppointmentCharge(appointment)}
                        </span>
                        <span className="text-xs text-gray-400">Toque para abrir os detalhes</span>
                      </div>
                    </div>
                  </button>
                )
              })}
            </div>
          )}
        </Panel.Body>
      </Panel>
    </div>
  )
}
