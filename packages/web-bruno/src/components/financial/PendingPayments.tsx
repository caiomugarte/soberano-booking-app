import { useState } from 'react'
import { PaymentMethodDialog } from '@/components/appointments/PaymentMethodDialog'
import { Panel } from '@/components/ui/Panel'
import { Button } from '@/components/ui/Button'
import { WhatsAppButton } from '@/components/whatsapp/WhatsAppButton'
import { EmptyState } from '@/components/ui/EmptyState'
import { formatDate, formatCurrency } from '@/lib/format'
import type { Appointment, PaymentMethod } from '@/schemas/appointment.schema'
import type { Patient } from '@/schemas/patient.schema'

interface PendingPaymentsProps {
  appointments: Appointment[]
  patients: Patient[]
  onMarkPaid: (id: string, paymentMethod: PaymentMethod, paidAt: string) => void
}

export function PendingPayments({ appointments, patients, onMarkPaid }: PendingPaymentsProps) {
  const [selectedAppointmentId, setSelectedAppointmentId] = useState<string | null>(null)
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
            <div key={apt.id} className="flex flex-col gap-3 px-5 py-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <div className="text-sm font-medium text-gray-800">
                  {patient?.name ?? 'Paciente'}
                </div>
                <div className="text-xs text-gray-400">
                  {formatDate(apt.date)} - {apt.startTime}
                </div>
              </div>
              <div className="flex flex-col items-stretch gap-2 sm:flex-row sm:items-center">
                <span className="text-sm font-semibold text-amber-600">
                  {formatCurrency(apt.value)}
                </span>
                {patient?.phone && (
                  <WhatsAppButton appointmentId={apt.id} />
                )}
                <Button
                  variant="secondary"
                  size="sm"
                  className="w-full sm:w-auto"
                  onClick={() => setSelectedAppointmentId(apt.id)}
                >
                  Marcar Pago
                </Button>
              </div>
            </div>
          )
        })}
      </div>

      <PaymentMethodDialog
        open={selectedAppointmentId !== null}
        onClose={() => setSelectedAppointmentId(null)}
        onConfirm={(paymentMethod, paidAt) => {
          if (!selectedAppointmentId) return
          onMarkPaid(selectedAppointmentId, paymentMethod, paidAt)
          setSelectedAppointmentId(null)
        }}
        title="Registrar pagamento"
        confirmLabel="Marcar pago"
      />
    </Panel>
  )
}
