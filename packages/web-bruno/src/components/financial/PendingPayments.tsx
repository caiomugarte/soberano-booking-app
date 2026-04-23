import { Panel } from '@/components/ui/Panel'
import { Button } from '@/components/ui/Button'
import { WhatsAppButton } from '@/components/whatsapp/WhatsAppButton'
import { EmptyState } from '@/components/ui/EmptyState'
import { formatDate, formatCurrency } from '@/lib/format'
import type { Appointment } from '@/schemas/appointment.schema'
import type { Patient } from '@/schemas/patient.schema'

interface PendingPaymentsProps {
  appointments: Appointment[]
  patients: Patient[]
  onMarkPaid: (id: string) => void
}

export function PendingPayments({ appointments, patients, onMarkPaid }: PendingPaymentsProps) {
  const pending = appointments
    .filter((a) => a.paymentStatus === 'pending' && a.status !== 'cancelled')
    .sort((a, b) => a.date.localeCompare(b.date))

  if (pending.length === 0) {
    return <EmptyState title="Nenhum pagamento pendente" />
  }

  return (
    <Panel>
      <Panel.Header>Pagamentos Pendentes ({pending.length})</Panel.Header>
      <div className="divide-y divide-gray-100">
        {pending.map((apt) => {
          const patient = patients.find((p) => p.id === apt.patientId)
          return (
            <div key={apt.id} className="flex items-center justify-between px-5 py-3">
              <div>
                <div className="text-sm font-medium text-gray-800">
                  {patient?.name ?? 'Paciente'}
                </div>
                <div className="text-xs text-gray-400">
                  {formatDate(apt.date)} - {apt.startTime}
                </div>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-sm font-semibold text-amber-600">
                  {formatCurrency(apt.value)}
                </span>
                {patient?.phone && (
                  <WhatsAppButton appointmentId={apt.id} />
                )}
                <Button variant="secondary" size="sm" onClick={() => onMarkPaid(apt.id)}>
                  Marcar Pago
                </Button>
              </div>
            </div>
          )
        })}
      </div>
    </Panel>
  )
}
