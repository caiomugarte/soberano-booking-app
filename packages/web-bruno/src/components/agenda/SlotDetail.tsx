import { useState } from 'react'
import { PaymentMethodDialog } from '@/components/appointments/PaymentMethodDialog'
import { ProtocolCreditActionDialog } from '@/components/appointments/ProtocolCreditActionDialog'
import { Modal } from '@/components/ui/Modal'
import { Button } from '@/components/ui/Button'
import { AppointmentStatusBadge, PaymentStatusBadge } from '@/components/ui/StatusBadge'
import { WhatsAppButton } from '@/components/whatsapp/WhatsAppButton'
import { formatAppointmentCharge } from '@/lib/appointment-pricing'
import { formatDate, toDateInputValue } from '@/lib/format'
import { PAYMENT_METHOD_LABELS, PROTOCOL_LINK_TYPE_LABELS, SESSION_TYPE_LABELS } from '@/config/constants'
import type { Appointment, PaymentMethod, ProtocolCreditAction } from '@/schemas/appointment.schema'
import type { Patient } from '@/schemas/patient.schema'

interface SlotDetailProps {
  open: boolean
  onClose: () => void
  appointment: Appointment | null
  patient: Patient | null
  onUpdateStatus: (id: string, status: Appointment['status'], protocolCreditAction?: ProtocolCreditAction) => Promise<void>
  onMarkPaid: (id: string, paymentMethod: PaymentMethod, paidAt: string) => void
  onEdit: (appointment: Appointment) => void
  onDelete: (id: string, protocolCreditAction?: ProtocolCreditAction) => Promise<void>
  onStopRecurringSeries: (recurringSeriesId: string, stopDate: string) => Promise<void>
}

export function SlotDetail({
  open,
  onClose,
  appointment,
  patient,
  onUpdateStatus,
  onMarkPaid,
  onEdit,
  onDelete,
  onStopRecurringSeries,
}: SlotDetailProps) {
  const [whatsappError, setWhatsappError] = useState('')
  const [deleteError, setDeleteError] = useState('')
  const [recurringError, setRecurringError] = useState('')
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [confirmStopRecurring, setConfirmStopRecurring] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
  const [isStoppingRecurring, setIsStoppingRecurring] = useState(false)
  const [paymentDialogOpen, setPaymentDialogOpen] = useState(false)
  const [protocolActionMode, setProtocolActionMode] = useState<'cancel' | 'delete' | null>(null)

  if (!appointment) return null

  const currentAppointment = appointment
  const paidDate = toDateInputValue(currentAppointment.paidAt)

  const canComplete =
    currentAppointment.status === 'scheduled' || currentAppointment.status === 'confirmed'
  const canCancel =
    currentAppointment.status !== 'cancelled' && currentAppointment.status !== 'completed'
  const isRecurring = Boolean(currentAppointment.recurringSeriesId)
  const recurrenceLabel =
    currentAppointment.recurrenceIntervalWeeks === 1
      ? 'Toda semana'
      : `A cada ${currentAppointment.recurrenceIntervalWeeks ?? 1} semanas`

  function handleClose() {
    setWhatsappError('')
    setDeleteError('')
    setRecurringError('')
    setConfirmDelete(false)
    setConfirmStopRecurring(false)
    setPaymentDialogOpen(false)
    setProtocolActionMode(null)
    onClose()
  }

  async function handleDelete(protocolCreditAction?: ProtocolCreditAction) {
    setDeleteError('')
    setIsDeleting(true)

    try {
      await onDelete(currentAppointment.id, protocolCreditAction)
    } catch (error) {
      console.error('[SlotDetail] Failed to delete appointment:', error)
      setDeleteError(error instanceof Error ? error.message : 'Erro ao excluir sessão')
      setIsDeleting(false)
      return
    }

    setIsDeleting(false)
  }

  async function handleCancel(protocolCreditAction?: ProtocolCreditAction) {
    setDeleteError('')
    try {
      await onUpdateStatus(currentAppointment.id, 'cancelled', protocolCreditAction)
      setProtocolActionMode(null)
    } catch (error) {
      setDeleteError(error instanceof Error ? error.message : 'Erro ao cancelar sessão')
    }
  }

  async function handleStopRecurringSeries() {
    if (!currentAppointment.recurringSeriesId) return

    setRecurringError('')
    setIsStoppingRecurring(true)

    try {
      await onStopRecurringSeries(currentAppointment.recurringSeriesId, currentAppointment.date)
      handleClose()
    } catch (error) {
      console.error('[SlotDetail] Failed to stop recurring series:', error)
      setRecurringError(error instanceof Error ? error.message : 'Erro ao encerrar recorrência')
      setIsStoppingRecurring(false)
      return
    }

    setIsStoppingRecurring(false)
  }

  return (
    <Modal open={open} onClose={handleClose}>
      <Modal.Header>Detalhes da Sessão</Modal.Header>
      <Modal.Body>
        <div className="space-y-3">
          <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
            <span className="text-sm text-gray-500">Paciente</span>
            <span className="text-sm font-medium">{patient?.name ?? '—'}</span>
          </div>
          <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
            <span className="text-sm text-gray-500">Data</span>
            <span className="text-sm">{formatDate(currentAppointment.date)}</span>
          </div>
          <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
            <span className="text-sm text-gray-500">Horário</span>
            <span className="text-sm">
              {currentAppointment.startTime} - {currentAppointment.endTime}
            </span>
          </div>
          <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
            <span className="text-sm text-gray-500">Tipo</span>
            <span className="text-sm">{SESSION_TYPE_LABELS[currentAppointment.type]}</span>
          </div>
          <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
            <span className="text-sm text-gray-500">Valor</span>
            <span className="text-sm font-medium">{formatAppointmentCharge(currentAppointment)}</span>
          </div>
          <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
            <span className="text-sm text-gray-500">Status</span>
            <AppointmentStatusBadge status={currentAppointment.status} />
          </div>
          <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
            <span className="text-sm text-gray-500">Pagamento</span>
            <PaymentStatusBadge status={currentAppointment.paymentStatus} />
          </div>
          {currentAppointment.protocolLinkType && currentAppointment.protocolLinkType !== 'standalone' && (
            <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
              <span className="text-sm text-gray-500">Vínculo</span>
              <span className="text-sm">{PROTOCOL_LINK_TYPE_LABELS[currentAppointment.protocolLinkType]}</span>
            </div>
          )}
          {isRecurring && (
            <div className="rounded-lg border border-primary-200 bg-primary-50 p-3">
              <p className="text-sm font-medium text-primary-900">Sessão recorrente</p>
              <p className="mt-1 text-sm text-primary-800">
                {recurrenceLabel}
                {currentAppointment.recurrenceStatus === 'stopped' ? ' • encerrada' : ' • ativa'}
              </p>
              {currentAppointment.recurrenceStatus === 'active' && (
                <p className="mt-2 text-xs text-primary-700">
                  Encerrar a recorrência remove as próximas ocorrências a partir desta sessão.
                </p>
              )}
            </div>
          )}
          {currentAppointment.paymentStatus === 'paid' && currentAppointment.paymentMethod && (
            <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
              <span className="text-sm text-gray-500">Forma de pagamento</span>
              <span className="text-sm">{PAYMENT_METHOD_LABELS[currentAppointment.paymentMethod]}</span>
            </div>
          )}
          {currentAppointment.paymentStatus === 'paid' && paidDate && (
            <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
              <span className="text-sm text-gray-500">Pago em</span>
              <span className="text-sm">{formatDate(paidDate)}</span>
            </div>
          )}
          {currentAppointment.notes && (
            <div>
              <span className="text-sm text-gray-500">Notas</span>
              <p className="mt-1 text-sm text-gray-700">{currentAppointment.notes}</p>
            </div>
          )}
          {confirmDelete && (
            <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-600">
              Confirma a exclusão desta sessão? Esta ação não pode ser desfeita.
            </div>
          )}
          {deleteError && (
            <p className="text-sm text-red-500">{deleteError}</p>
          )}
          {recurringError && (
            <p className="text-sm text-red-500">{recurringError}</p>
          )}
          {whatsappError && (
            <p className="text-sm text-red-500">{whatsappError}</p>
          )}
        </div>
      </Modal.Body>
      <Modal.Footer>
        <div className="flex w-full flex-wrap gap-2">
          <Button
            variant="secondary"
            size="sm"
            onClick={() => onEdit(currentAppointment)}
          >
            Editar
          </Button>
          {patient?.phone && currentAppointment.paymentStatus === 'pending' && currentAppointment.protocolLinkType !== 'protocol' && (
            <WhatsAppButton appointmentId={currentAppointment.id} onError={setWhatsappError} />
          )}
          {currentAppointment.paymentStatus === 'pending' && currentAppointment.status !== 'cancelled' && currentAppointment.protocolLinkType !== 'protocol' && (
            <Button
              variant="secondary"
              size="sm"
              onClick={() => setPaymentDialogOpen(true)}
            >
              Marcar Pago
            </Button>
          )}
          {canComplete && (
            <Button
              variant="secondary"
              size="sm"
              onClick={() => {
                void onUpdateStatus(currentAppointment.id, 'completed')
              }}
            >
              Realizado
            </Button>
          )}
          {canComplete && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                void onUpdateStatus(currentAppointment.id, 'no_show')
              }}
            >
              Falta
            </Button>
          )}
          {canCancel && (
            <Button
              variant="danger"
              size="sm"
              onClick={() => {
                if (currentAppointment.protocolLinkType === 'protocol') {
                  setProtocolActionMode('cancel')
                  return
                }

                void onUpdateStatus(currentAppointment.id, 'cancelled')
              }}
            >
              Desmarcado
            </Button>
          )}
          {isRecurring && currentAppointment.recurrenceStatus === 'active' && (
            confirmStopRecurring ? (
              <>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setConfirmStopRecurring(false)
                    setRecurringError('')
                  }}
                  disabled={isStoppingRecurring}
                >
                  Manter recorrência
                </Button>
                <Button
                  variant="danger"
                  size="sm"
                  onClick={handleStopRecurringSeries}
                  disabled={isStoppingRecurring}
                >
                  {isStoppingRecurring ? 'Encerrando...' : 'Encerrar recorrência'}
                </Button>
              </>
            ) : (
              <Button
                variant="secondary"
                size="sm"
                onClick={() => {
                  setConfirmStopRecurring(true)
                  setRecurringError('')
                }}
              >
                Parar recorrência
              </Button>
            )
          )}
          {confirmDelete ? (
            <>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setConfirmDelete(false)
                  setDeleteError('')
                }}
                disabled={isDeleting}
              >
                Cancelar exclusão
              </Button>
              <Button
                variant="danger"
                size="sm"
                onClick={() => {
                  if (currentAppointment.protocolLinkType === 'protocol') {
                    setConfirmDelete(false)
                    setProtocolActionMode('delete')
                    return
                  }

                  handleDelete()
                }}
                disabled={isDeleting}
              >
                {isDeleting ? 'Excluindo...' : 'Confirmar exclusão'}
              </Button>
            </>
          ) : (
            <Button
              variant="danger"
              size="sm"
              onClick={() => {
                setConfirmDelete(true)
                setDeleteError('')
              }}
            >
              Excluir
            </Button>
          )}
          <Button variant="ghost" size="sm" onClick={handleClose}>
            Fechar
          </Button>
        </div>
      </Modal.Footer>

      <PaymentMethodDialog
        open={paymentDialogOpen}
        onClose={() => setPaymentDialogOpen(false)}
        onConfirm={(paymentMethod, paidAt) => {
          setPaymentDialogOpen(false)
          onMarkPaid(currentAppointment.id, paymentMethod, paidAt)
        }}
        title="Registrar pagamento"
        confirmLabel="Marcar pago"
      />

      <ProtocolCreditActionDialog
        open={protocolActionMode !== null}
        onClose={() => {
          if (isDeleting) return
          setProtocolActionMode(null)
        }}
        onConfirm={(action) => {
          if (protocolActionMode === 'cancel') {
            void handleCancel(action)
            return
          }

          void handleDelete(action)
          setProtocolActionMode(null)
        }}
        title={
          protocolActionMode === 'cancel'
            ? 'Cancelar sessão vinculada'
            : 'Excluir sessão vinculada'
        }
        description={
          protocolActionMode === 'cancel'
            ? 'Escolha se o crédito deve voltar ao protocolo ou ficar consumido ao desmarcar esta sessão.'
            : 'Escolha se o crédito deve voltar ao protocolo ou ficar consumido antes de excluir esta sessão.'
        }
        isPending={isDeleting}
        error={deleteError || null}
      />
    </Modal>
  )
}
