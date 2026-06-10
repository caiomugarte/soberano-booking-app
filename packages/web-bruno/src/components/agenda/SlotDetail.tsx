import { useEffect, useRef, useState, type ReactNode } from 'react'
import { PaymentMethodDialog } from '@/components/appointments/PaymentMethodDialog'
import { ProtocolCreditActionDialog } from '@/components/appointments/ProtocolCreditActionDialog'
import { Modal } from '@/components/ui/Modal'
import { Button } from '@/components/ui/Button'
import { AppointmentStatusBadge, PaymentStatusBadge } from '@/components/ui/StatusBadge'
import { formatAppointmentCharge } from '@/lib/appointment-pricing'
import { formatDate, toDateInputValue } from '@/lib/format'
import { PAYMENT_METHOD_LABELS, PROTOCOL_LINK_TYPE_LABELS, SESSION_TYPE_LABELS } from '@/config/constants'
import type { Appointment, PaymentMethod, ProtocolCreditAction } from '@/schemas/appointment.schema'
import type { Patient } from '@/schemas/patient.schema'

type ActionTone = 'neutral' | 'primary' | 'success' | 'warning' | 'danger'

function ActionIconButton({
  label,
  title,
  tone,
  onClick,
  disabled = false,
  iconOnly = false,
  className = '',
  children,
}: {
  label: string
  title?: string
  tone: ActionTone
  onClick: () => void
  disabled?: boolean
  iconOnly?: boolean
  className?: string
  children: ReactNode
}) {
  const toneClasses: Record<ActionTone, string> = {
    neutral:
      'border-gray-200 text-gray-500 hover:border-gray-300 hover:bg-gray-50 hover:text-gray-700 focus:ring-gray-200',
    primary:
      'border-primary-200 bg-primary-50 text-primary-700 hover:bg-primary-100 hover:border-primary-300 focus:ring-primary-200',
    success:
      'border-emerald-500 bg-emerald-500 text-white hover:border-emerald-600 hover:bg-emerald-600 focus:ring-emerald-200',
    warning:
      'border-amber-500 bg-amber-500 text-white hover:border-amber-600 hover:bg-amber-600 focus:ring-amber-200',
    danger:
      'border-red-500 bg-red-500 text-white hover:border-red-600 hover:bg-red-600 focus:ring-red-200',
  }

  return (
    <button
      type="button"
      aria-label={label}
      title={title ?? label}
      className={`inline-flex h-9 items-center justify-center gap-2 rounded-full border text-sm font-medium transition-colors focus:outline-none focus:ring-2 disabled:cursor-not-allowed disabled:opacity-50 ${
        iconOnly ? 'w-9' : 'px-3'
      } ${toneClasses[tone]} ${className}`}
      onClick={onClick}
      disabled={disabled}
    >
      {children}
      {iconOnly ? <span className="sr-only">{label}</span> : <span>{label}</span>}
    </button>
  )
}

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
  const moreActionsRef = useRef<HTMLDivElement | null>(null)
  const [actionError, setActionError] = useState('')
  const [recurringError, setRecurringError] = useState('')
  const [moreActionsOpen, setMoreActionsOpen] = useState(false)
  const [confirmCancel, setConfirmCancel] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [confirmStopRecurring, setConfirmStopRecurring] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
  const [isStoppingRecurring, setIsStoppingRecurring] = useState(false)
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false)
  const [paymentDialogOpen, setPaymentDialogOpen] = useState(false)
  const [protocolActionMode, setProtocolActionMode] = useState<'cancel' | 'delete' | null>(null)

  useEffect(() => {
    if (!moreActionsOpen) return

    function handlePointerDown(event: PointerEvent) {
      if (!moreActionsRef.current?.contains(event.target as Node)) {
        setMoreActionsOpen(false)
      }
    }

    document.addEventListener('pointerdown', handlePointerDown)
    return () => document.removeEventListener('pointerdown', handlePointerDown)
  }, [moreActionsOpen])

  if (!appointment) return null

  const currentAppointment = appointment
  const paidDate = toDateInputValue(currentAppointment.paidAt)

  const canComplete =
    currentAppointment.status === 'scheduled' || currentAppointment.status === 'confirmed'
  const canCancel =
    currentAppointment.status !== 'cancelled' && currentAppointment.status !== 'completed'
  const isRecurring = Boolean(currentAppointment.recurringSeriesId)
  const canMarkPaid =
    currentAppointment.paymentStatus === 'pending' &&
    currentAppointment.status !== 'cancelled' &&
    currentAppointment.protocolLinkType !== 'protocol'
  const canStopRecurring = isRecurring && currentAppointment.recurrenceStatus === 'active'
  const hasSecondaryActions = canComplete || canCancel || canStopRecurring
  const recurrenceLabel =
    currentAppointment.recurrenceIntervalWeeks === 1
      ? 'Toda semana'
      : `A cada ${currentAppointment.recurrenceIntervalWeeks ?? 1} semanas`

  function handleClose() {
    setActionError('')
    setRecurringError('')
    setMoreActionsOpen(false)
    setConfirmCancel(false)
    setConfirmDelete(false)
    setConfirmStopRecurring(false)
    setPaymentDialogOpen(false)
    setProtocolActionMode(null)
    onClose()
  }

  async function handleDelete(protocolCreditAction?: ProtocolCreditAction) {
    setActionError('')
    setIsDeleting(true)

    try {
      await onDelete(currentAppointment.id, protocolCreditAction)
    } catch (error) {
      console.error('[SlotDetail] Failed to delete appointment:', error)
      setActionError(error instanceof Error ? error.message : 'Erro ao excluir sessão')
      setIsDeleting(false)
      return
    }

    setIsDeleting(false)
  }

  async function handleStatusUpdate(
    status: Appointment['status'],
    options?: { protocolCreditAction?: ProtocolCreditAction; fallbackMessage?: string },
  ) {
    setActionError('')
    setIsUpdatingStatus(true)

    try {
      await onUpdateStatus(currentAppointment.id, status, options?.protocolCreditAction)
      setProtocolActionMode(null)
    } catch (error) {
      setActionError(error instanceof Error ? error.message : (options?.fallbackMessage ?? 'Erro ao atualizar sessão'))
      setIsUpdatingStatus(false)
      return
    }

    setIsUpdatingStatus(false)
  }

  async function handleCancel(protocolCreditAction?: ProtocolCreditAction) {
    await handleStatusUpdate('cancelled', {
      protocolCreditAction,
      fallbackMessage: 'Erro ao desmarcar sessão',
    })
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
      <Modal.Header>
        <div className="flex items-start justify-between gap-2">
          <span>Detalhes da Sessão</span>
          <div className="flex shrink-0 items-center gap-2">
            <ActionIconButton
              label="Editar"
              tone="neutral"
              onClick={() => onEdit(currentAppointment)}
              disabled={isDeleting || isStoppingRecurring || isUpdatingStatus}
            >
              <svg
                viewBox="0 0 20 20"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.8"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="h-4 w-4"
                aria-hidden="true"
              >
                <path d="M3.75 13.75V16.25H6.25L14.5 8L12 5.5L3.75 13.75Z" />
                <path d="M10.75 6.75L13.25 9.25" />
                <path d="M11.25 4.75L13.25 2.75L15.75 5.25L13.75 7.25" />
              </svg>
            </ActionIconButton>

            {!confirmDelete && (
              <ActionIconButton
                label="Excluir"
                tone="danger"
                onClick={() => {
                  setMoreActionsOpen(false)
                  setConfirmDelete(true)
                  setActionError('')
                }}
                disabled={isStoppingRecurring || isUpdatingStatus}
              >
                <svg
                  viewBox="0 0 20 20"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.8"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="h-4 w-4"
                  aria-hidden="true"
                >
                  <path d="M4.5 5.5H15.5" />
                  <path d="M7.25 5.5V4.5H12.75V5.5" />
                  <path d="M6.25 5.5V15.5H13.75V5.5" />
                  <path d="M8.5 8V13" />
                  <path d="M11.5 8V13" />
                </svg>
              </ActionIconButton>
            )}

            {hasSecondaryActions && (
              <div className="relative" ref={moreActionsRef}>
                <ActionIconButton
                  label={moreActionsOpen ? 'Fechar ações' : 'Mais ações'}
                  title={moreActionsOpen ? 'Fechar ações' : 'Mais ações'}
                  tone="neutral"
                  onClick={() => {
                    setMoreActionsOpen((current) => !current)
                    setActionError('')
                    setRecurringError('')
                  }}
                  disabled={isDeleting || isStoppingRecurring || isUpdatingStatus}
                >
                  <svg
                    viewBox="0 0 20 20"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.8"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    className="h-4 w-4"
                    aria-hidden="true"
                  >
                    <path d="M4 10H4.01" />
                    <path d="M10 10H10.01" />
                    <path d="M16 10H16.01" />
                  </svg>
                </ActionIconButton>

                {moreActionsOpen && (
                  <div className="absolute right-0 top-[calc(100%+0.5rem)] z-20 sm:left-[calc(100%+0.5rem)] sm:right-auto sm:top-0">
                    <div className="rounded-2xl border border-gray-200 bg-white p-2 shadow-xl ring-1 ring-black/5">
                      <div className="flex min-w-[12rem] flex-col gap-2">
                        {canComplete && (
                          <ActionIconButton
                            label="Falta"
                            tone="warning"
                            className="w-full justify-start"
                            onClick={() => {
                              setMoreActionsOpen(false)
                              void handleStatusUpdate('no_show', {
                                fallbackMessage: 'Erro ao marcar sessão como falta',
                              })
                            }}
                            disabled={isDeleting || isStoppingRecurring || isUpdatingStatus}
                          >
                            <svg
                              viewBox="0 0 20 20"
                              fill="none"
                              stroke="currentColor"
                              strokeWidth="1.8"
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              className="h-4 w-4"
                              aria-hidden="true"
                            >
                              <path d="M6 6L14 14" />
                              <path d="M14 6L6 14" />
                            </svg>
                          </ActionIconButton>
                        )}

                        {canCancel && !confirmCancel && (
                          <ActionIconButton
                            label="Desmarcar"
                            tone="warning"
                            className="w-full justify-start"
                            onClick={() => {
                              setMoreActionsOpen(false)
                              setConfirmCancel(true)
                              setActionError('')
                            }}
                            disabled={isDeleting || isStoppingRecurring || isUpdatingStatus}
                          >
                            <svg
                              viewBox="0 0 20 20"
                              fill="none"
                              stroke="currentColor"
                              strokeWidth="1.8"
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              className="h-4 w-4"
                              aria-hidden="true"
                            >
                              <path d="M5.5 10H14.5" />
                            </svg>
                          </ActionIconButton>
                        )}

                        {canStopRecurring && !confirmStopRecurring && (
                          <ActionIconButton
                            label="Parar recorrência"
                            tone="neutral"
                            className="w-full justify-start"
                            onClick={() => {
                              setMoreActionsOpen(false)
                              setConfirmStopRecurring(true)
                              setRecurringError('')
                            }}
                            disabled={isDeleting || isUpdatingStatus}
                          >
                            <svg
                              viewBox="0 0 20 20"
                              fill="none"
                              stroke="currentColor"
                              strokeWidth="1.8"
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              className="h-4 w-4"
                              aria-hidden="true"
                            >
                              <path d="M4.5 4.5V9.5H9.5" />
                              <path d="M5 10A5 5 0 1 0 7 6.5" />
                            </svg>
                          </ActionIconButton>
                        )}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </Modal.Header>
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
          {actionError && (
            <p className="text-sm text-red-500">{actionError}</p>
          )}
          {recurringError && (
            <p className="text-sm text-red-500">{recurringError}</p>
          )}

          <div className="space-y-2 pt-1">
            <div className="flex flex-wrap gap-2">
              {canMarkPaid && (
                <ActionIconButton
                  label="Marcar pago"
                  tone="primary"
                  onClick={() => setPaymentDialogOpen(true)}
                  disabled={isDeleting || isStoppingRecurring || isUpdatingStatus}
                >
                  <svg
                    viewBox="0 0 20 20"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.8"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    className="h-4 w-4"
                    aria-hidden="true"
                  >
                    <path d="M3.5 6.5H16.5V13.5H3.5Z" />
                    <path d="M3.5 9H16.5" />
                    <path d="M6.5 12H8.5" />
                  </svg>
                </ActionIconButton>
              )}

              {canComplete && (
                <ActionIconButton
                  label="Realizado"
                  tone="success"
                  onClick={() => {
                    setMoreActionsOpen(false)
                    void handleStatusUpdate('completed', {
                      fallbackMessage: 'Erro ao marcar sessão como realizada',
                    })
                  }}
                  disabled={isDeleting || isStoppingRecurring || isUpdatingStatus}
                >
                  <svg
                    viewBox="0 0 20 20"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.8"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    className="h-4 w-4"
                    aria-hidden="true"
                  >
                    <path d="M4.5 10.5L8 14L15.5 6.5" />
                  </svg>
                </ActionIconButton>
              )}
            </div>

            {canCancel && confirmCancel && (
              <div className="rounded-lg border border-amber-200 bg-amber-50 p-2">
                <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                  <p className="text-sm text-amber-900">Confirmar desmarque da sessão?</p>
                  <div className="flex flex-col gap-2 sm:flex-row">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        setConfirmCancel(false)
                        setActionError('')
                      }}
                      disabled={isUpdatingStatus}
                    >
                      Voltar
                    </Button>
                    <Button
                      size="sm"
                      className="bg-amber-500 text-white hover:bg-amber-600 focus:ring-amber-200"
                      onClick={() => {
                        if (currentAppointment.protocolLinkType === 'protocol') {
                          setConfirmCancel(false)
                          setProtocolActionMode('cancel')
                          return
                        }

                        void handleCancel()
                      }}
                      disabled={isUpdatingStatus}
                    >
                      {isUpdatingStatus ? 'Salvando...' : 'Confirmar desmarque'}
                    </Button>
                  </div>
                </div>
              </div>
            )}

            {canStopRecurring && (
              confirmStopRecurring ? (
                <div className="rounded-lg border border-primary-200 bg-primary-50 p-2">
                  <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                    <p className="text-sm text-primary-900">Encerrar a recorrência a partir desta sessão?</p>
                    <div className="flex flex-col gap-2 sm:flex-row">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          setConfirmStopRecurring(false)
                          setRecurringError('')
                        }}
                        disabled={isStoppingRecurring}
                      >
                        Voltar
                      </Button>
                      <Button
                        variant="danger"
                        size="sm"
                        onClick={handleStopRecurringSeries}
                        disabled={isStoppingRecurring}
                      >
                        {isStoppingRecurring ? 'Encerrando...' : 'Encerrar recorrência'}
                      </Button>
                    </div>
                  </div>
                </div>
              ) : null
            )}

            {confirmDelete ? (
              <div className="rounded-lg border border-red-200 bg-red-50 p-2">
                <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                  <p className="text-sm text-red-700">Confirmar exclusão permanente da sessão?</p>
                  <div className="flex flex-col gap-2 sm:flex-row">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        setConfirmDelete(false)
                        setActionError('')
                      }}
                      disabled={isDeleting}
                    >
                      Voltar
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

                        void handleDelete()
                      }}
                      disabled={isDeleting}
                    >
                      {isDeleting ? 'Excluindo...' : 'Confirmar exclusão'}
                    </Button>
                  </div>
                </div>
              </div>
            ) : null}
          </div>
        </div>
      </Modal.Body>
      <Modal.Footer>
        <Button variant="ghost" size="sm" onClick={handleClose}>
          Fechar
        </Button>
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
        isPending={isDeleting || isUpdatingStatus}
        error={actionError || null}
      />
    </Modal>
  )
}
