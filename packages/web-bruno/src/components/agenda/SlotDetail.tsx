import { useState } from 'react'
import { Modal } from '@/components/ui/Modal'
import { Button } from '@/components/ui/Button'
import { AppointmentStatusBadge, PaymentStatusBadge } from '@/components/ui/StatusBadge'
import { WhatsAppButton } from '@/components/whatsapp/WhatsAppButton'
import { formatCurrency, formatDate } from '@/lib/format'
import { SESSION_TYPE_LABELS } from '@/config/constants'
import type { Appointment } from '@/schemas/appointment.schema'
import type { Patient } from '@/schemas/patient.schema'

interface SlotDetailProps {
  open: boolean
  onClose: () => void
  appointment: Appointment | null
  patient: Patient | null
  onUpdateStatus: (id: string, status: Appointment['status']) => void
  onMarkPaid: (id: string) => void
}

export function SlotDetail({
  open,
  onClose,
  appointment,
  patient,
  onUpdateStatus,
  onMarkPaid,
}: SlotDetailProps) {
  const [whatsappError, setWhatsappError] = useState('')

  if (!appointment) return null

  const canComplete = appointment.status === 'scheduled' || appointment.status === 'confirmed'
  const canCancel = appointment.status !== 'cancelled' && appointment.status !== 'completed'

  function handleClose() {
    setWhatsappError('')
    onClose()
  }

  return (
    <Modal open={open} onClose={handleClose}>
      <Modal.Header>Detalhes da Sessão</Modal.Header>
      <Modal.Body>
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-500">Paciente</span>
            <span className="text-sm font-medium">{patient?.name ?? '—'}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-500">Data</span>
            <span className="text-sm">{formatDate(appointment.date)}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-500">Horário</span>
            <span className="text-sm">
              {appointment.startTime} - {appointment.endTime}
            </span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-500">Tipo</span>
            <span className="text-sm">{SESSION_TYPE_LABELS[appointment.type]}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-500">Valor</span>
            <span className="text-sm font-medium">{formatCurrency(appointment.value)}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-500">Status</span>
            <AppointmentStatusBadge status={appointment.status} />
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-500">Pagamento</span>
            <PaymentStatusBadge status={appointment.paymentStatus} />
          </div>
          {appointment.notes && (
            <div>
              <span className="text-sm text-gray-500">Notas</span>
              <p className="mt-1 text-sm text-gray-700">{appointment.notes}</p>
            </div>
          )}
          {whatsappError && (
            <p className="text-sm text-red-500">{whatsappError}</p>
          )}
        </div>
      </Modal.Body>
      <Modal.Footer>
        <div className="flex w-full flex-wrap gap-2">
          {patient?.phone && appointment.paymentStatus === 'pending' && (
            <WhatsAppButton appointmentId={appointment.id} onError={setWhatsappError} />
          )}
          {appointment.paymentStatus === 'pending' && appointment.status !== 'cancelled' && (
            <Button
              variant="secondary"
              size="sm"
              onClick={() => onMarkPaid(appointment.id)}
            >
              Marcar Pago
            </Button>
          )}
          {canComplete && (
            <Button
              variant="secondary"
              size="sm"
              onClick={() => onUpdateStatus(appointment.id, 'completed')}
            >
              Concluir
            </Button>
          )}
          {canComplete && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onUpdateStatus(appointment.id, 'no_show')}
            >
              Não compareceu
            </Button>
          )}
          {canCancel && (
            <Button
              variant="danger"
              size="sm"
              onClick={() => onUpdateStatus(appointment.id, 'cancelled')}
            >
              Cancelar
            </Button>
          )}
          <Button variant="ghost" size="sm" onClick={handleClose}>
            Fechar
          </Button>
        </div>
      </Modal.Footer>
    </Modal>
  )
}
