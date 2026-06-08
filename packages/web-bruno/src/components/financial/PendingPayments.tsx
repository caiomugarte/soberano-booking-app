import { useEffect, useMemo, useState } from 'react'
import { useBulkMarkAppointmentsPaid, useSendBulkPaymentReminders } from '@/api/appointments'
import { PaymentMethodDialog } from '@/components/appointments/PaymentMethodDialog'
import { ProtocolPaymentDialog } from '@/components/protocols/ProtocolPaymentDialog'
import { Button } from '@/components/ui/Button'
import { EmptyState } from '@/components/ui/EmptyState'
import { Panel } from '@/components/ui/Panel'
import { Select } from '@/components/ui/Select'
import { formatCurrency } from '@/lib/format'
import type { PaymentMethod } from '@/schemas/appointment.schema'

type PendingPaymentsEntry = {
  kind: 'appointment' | 'protocol'
  id: string
  patientId: string
  patientName: string
  patientPhone?: string
  subtitle: string
  amountCents: number
  reminderAppointmentId?: string
  bulkActionLimitation?: string
}

interface PendingPaymentsProps {
  entries: PendingPaymentsEntry[]
  onMarkAppointmentPaid: (
    id: string,
    patientId: string,
    paymentMethod: PaymentMethod,
    paidAt: string,
  ) => void
  onAddProtocolPayment: (
    id: string,
    patientId: string,
    payment: { amountCents: number; paymentMethod: PaymentMethod; paidAt: string },
  ) => void
  isAppointmentMutationPending?: boolean
  isProtocolMutationPending?: boolean
}

type EntryFeedback = {
  tone: 'success' | 'error'
  message: string
}

type BatchSummary = {
  action: 'payment' | 'reminder'
  successCount: number
  failureCount: number
}

function getEntryKey(entry: PendingPaymentsEntry) {
  return `${entry.kind}:${entry.id}`
}

function isBulkCompatibleEntry(entry: PendingPaymentsEntry) {
  return entry.kind === 'appointment' && !entry.bulkActionLimitation && Boolean(entry.reminderAppointmentId)
}

function renderBatchSummary(summary: BatchSummary) {
  const successLabel =
    summary.action === 'payment'
      ? summary.successCount === 0
        ? 'Nenhum pagamento registrado'
        : `${summary.successCount} ${
            summary.successCount === 1 ? 'pagamento registrado' : 'pagamentos registrados'
          }`
      : summary.successCount === 0
        ? 'Nenhum lembrete enviado'
        : `${summary.successCount} ${
            summary.successCount === 1 ? 'lembrete enviado' : 'lembretes enviados'
          }`

  if (summary.failureCount === 0) {
    return successLabel
  }

  return `${successLabel} • ${summary.failureCount} ${
    summary.failureCount === 1
      ? 'cobrança ainda precisa de atenção'
      : 'cobranças ainda precisam de atenção'
  }`
}

export function PendingPayments({
  entries,
  onMarkAppointmentPaid,
  onAddProtocolPayment,
  isAppointmentMutationPending = false,
  isProtocolMutationPending = false,
}: PendingPaymentsProps) {
  const sendBulkReminders = useSendBulkPaymentReminders()
  const bulkMarkAppointmentsPaid = useBulkMarkAppointmentsPaid()
  const [selectedEntry, setSelectedEntry] = useState<PendingPaymentsEntry | null>(null)
  const [selectedPatientId, setSelectedPatientId] = useState('')
  const [selectedKeys, setSelectedKeys] = useState<string[]>([])
  const [feedbackByEntryKey, setFeedbackByEntryKey] = useState<Record<string, EntryFeedback>>({})
  const [batchSummary, setBatchSummary] = useState<BatchSummary | null>(null)
  const [bulkPaymentDialogOpen, setBulkPaymentDialogOpen] = useState(false)

  const patientOptions = useMemo(() => {
    const patientMap = new Map<string, string>()

    entries.forEach((entry) => {
      if (!patientMap.has(entry.patientId)) {
        patientMap.set(entry.patientId, entry.patientName)
      }
    })

    return [
      { value: '', label: 'Todos os pacientes' },
      ...Array.from(patientMap.entries())
        .sort((left, right) => left[1].localeCompare(right[1]))
        .map(([value, label]) => ({ value, label })),
    ]
  }, [entries])

  const visibleEntries = useMemo(() => {
    if (!selectedPatientId) {
      return entries
    }

    return entries.filter((entry) => entry.patientId === selectedPatientId)
  }, [entries, selectedPatientId])
  const visibleCompatibleEntries = useMemo(
    () => visibleEntries.filter(isBulkCompatibleEntry),
    [visibleEntries],
  )
  const visibleKeys = useMemo(() => visibleEntries.map(getEntryKey), [visibleEntries])
  const visibleKeySet = useMemo(() => new Set(visibleKeys), [visibleKeys])
  const visibleCompatibleKeys = useMemo(
    () => visibleCompatibleEntries.map(getEntryKey),
    [visibleCompatibleEntries],
  )
  const selectedKeySet = useMemo(() => new Set(selectedKeys), [selectedKeys])
  const selectedVisibleCount = visibleCompatibleKeys.filter((key) => selectedKeySet.has(key)).length
  const allVisibleSelected =
    visibleCompatibleKeys.length > 0 &&
    visibleCompatibleKeys.every((key) => selectedKeySet.has(key))
  const visibleTotalCents = useMemo(
    () => visibleEntries.reduce((sum, entry) => sum + entry.amountCents, 0),
    [visibleEntries],
  )
  const visibleIncompatibleCount = visibleEntries.filter((entry) => !isBulkCompatibleEntry(entry)).length

  useEffect(() => {
    setSelectedKeys((currentKeys) => {
      const nextKeys = currentKeys.filter((key) => visibleKeySet.has(key))
      return nextKeys.length === currentKeys.length ? currentKeys : nextKeys
    })
  }, [visibleKeySet])

  useEffect(() => {
    if (!bulkPaymentDialogOpen || selectedVisibleCount > 0) return
    setBulkPaymentDialogOpen(false)
  }, [bulkPaymentDialogOpen, selectedVisibleCount])

  if (entries.length === 0) {
    return (
      <EmptyState
        title="Nenhuma pendência vencida"
        description="Não há cobranças vencidas até hoje para acompanhar nesta bancada."
      />
    )
  }

  async function handleSendReminders() {
    const selectedReminderEntries = visibleCompatibleEntries.filter((entry) =>
      selectedKeySet.has(getEntryKey(entry)),
    )
    if (selectedReminderEntries.length === 0) return

    const results = await sendBulkReminders.mutateAsync(
      selectedReminderEntries.map((entry) => entry.reminderAppointmentId!),
    )

    let successCount = 0
    let failureCount = 0
    const failedKeys: string[] = []
    const nextFeedback: Record<string, EntryFeedback> = {}

    results.forEach((result) => {
      const entryKey = `appointment:${result.appointmentId}`

      if (result.success) {
        successCount += 1
        nextFeedback[entryKey] = {
          tone: 'success',
          message: 'Lembrete enviado com sucesso.',
        }
        return
      }

      failureCount += 1
      failedKeys.push(entryKey)
      nextFeedback[entryKey] = {
        tone: 'error',
        message: result.message ?? 'Erro ao enviar lembrete.',
      }
    })

    setBatchSummary({ action: 'reminder', successCount, failureCount })
    setFeedbackByEntryKey((currentFeedback) => {
      const feedback = { ...currentFeedback }

      selectedReminderEntries.forEach((entry) => {
        delete feedback[getEntryKey(entry)]
      })

      return { ...feedback, ...nextFeedback }
    })
    setSelectedKeys(failedKeys)
  }

  async function handleBulkMarkPaid(paymentMethod: PaymentMethod, paidAt: string) {
    const selectedAppointmentEntries = visibleCompatibleEntries.filter((entry) =>
      selectedKeySet.has(getEntryKey(entry)),
    )
    if (selectedAppointmentEntries.length === 0) return

    const results = await bulkMarkAppointmentsPaid.mutateAsync({
      appointmentIds: selectedAppointmentEntries.map((entry) => entry.id),
      paymentMethod,
      paidAt,
    })

    let successCount = 0
    let failureCount = 0
    const failedKeys: string[] = []
    const nextFeedback: Record<string, EntryFeedback> = {}

    results.forEach((result) => {
      const entryKey = `appointment:${result.appointmentId}`

      if (result.success) {
        successCount += 1
        return
      }

      failureCount += 1
      failedKeys.push(entryKey)
      nextFeedback[entryKey] = {
        tone: 'error',
        message: result.message ?? 'Erro ao registrar pagamento.',
      }
    })

    setBatchSummary({ action: 'payment', successCount, failureCount })
    setFeedbackByEntryKey((currentFeedback) => {
      const feedback = { ...currentFeedback }

      selectedAppointmentEntries.forEach((entry) => {
        delete feedback[getEntryKey(entry)]
      })

      return { ...feedback, ...nextFeedback }
    })
    setSelectedKeys(failedKeys)
    setBulkPaymentDialogOpen(false)
  }

  return (
    <Panel>
      <Panel.Header>Pendências vencidas ({entries.length})</Panel.Header>
      <Panel.Body className="space-y-4">
        <div className="grid grid-cols-1 gap-3 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-end">
          <Select
            label="Paciente"
            value={selectedPatientId}
            onChange={(event) => setSelectedPatientId(event.target.value)}
            options={patientOptions}
          />
          <Button
            type="button"
            variant="secondary"
            size="sm"
            className="w-full lg:w-auto"
            onClick={() => {
              if (allVisibleSelected) {
                setSelectedKeys([])
                return
              }

              setSelectedKeys(visibleCompatibleKeys)
            }}
            disabled={visibleCompatibleKeys.length === 0}
          >
            {allVisibleSelected ? 'Limpar seleção visível' : 'Selecionar todas as visíveis'}
          </Button>
        </div>

        {selectedVisibleCount > 0 && (
          <div className="flex flex-col gap-2 sm:flex-row">
            <Button
              type="button"
              size="sm"
              className="w-full sm:w-auto"
              onClick={() => setBulkPaymentDialogOpen(true)}
              disabled={bulkMarkAppointmentsPaid.isPending}
            >
              {bulkMarkAppointmentsPaid.isPending ? 'Salvando...' : 'Marcar pago'}
            </Button>
            <Button
              type="button"
              size="sm"
              variant="secondary"
              className="w-full sm:w-auto"
              onClick={() => {
                void handleSendReminders()
              }}
              disabled={sendBulkReminders.isPending}
            >
              {sendBulkReminders.isPending ? 'Enviando...' : 'Enviar lembrete'}
            </Button>
          </div>
        )}

        <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
          <div className="rounded-lg border border-gray-200 bg-gray-50 px-3 py-3">
            <div className="text-xs font-medium uppercase tracking-wide text-gray-500">
              Pendências visíveis
            </div>
            <div className="mt-1 text-sm font-semibold text-gray-800">
              {visibleEntries.length}{' '}
              {visibleEntries.length === 1 ? 'cobrança no filtro' : 'cobranças no filtro'}
            </div>
          </div>
          <div className="rounded-lg border border-gray-200 bg-gray-50 px-3 py-3">
            <div className="text-xs font-medium uppercase tracking-wide text-gray-500">
              Seleção visível
            </div>
            <div className="mt-1 text-sm font-semibold text-gray-800">
              {selectedVisibleCount}{' '}
              {selectedVisibleCount === 1
                ? 'linha compatível selecionada'
                : 'linhas compatíveis selecionadas'}
            </div>
          </div>
          <div className="rounded-lg border border-gray-200 bg-gray-50 px-3 py-3">
            <div className="text-xs font-medium uppercase tracking-wide text-gray-500">
              Total visível em aberto
            </div>
            <div className="mt-1 text-sm font-semibold text-amber-700">
              {formatCurrency(visibleTotalCents)}
            </div>
          </div>
        </div>

        {visibleIncompatibleCount > 0 && (
          <p className="text-xs text-gray-500">
            {visibleIncompatibleCount}{' '}
            {visibleIncompatibleCount === 1
              ? 'cobrança visível segue o fluxo individual de protocolo e fica fora das ações em lote.'
              : 'cobranças visíveis seguem o fluxo individual de protocolo e ficam fora das ações em lote.'}
          </p>
        )}

        {batchSummary && (
          <div
            className={`rounded-lg px-3 py-2 text-sm ${
              batchSummary.failureCount > 0
                ? 'border border-amber-200 bg-amber-50 text-amber-900'
                : 'border border-emerald-200 bg-emerald-50 text-emerald-800'
            }`}
          >
            {renderBatchSummary(batchSummary)}
          </div>
        )}

        {visibleEntries.length === 0 ? (
          <EmptyState
            title="Nenhuma pendência encontrada"
            description={
              selectedPatientId
                ? 'O paciente selecionado não possui cobranças vencidas nesta bancada.'
                : 'Não há cobranças vencidas visíveis com o filtro atual.'
            }
          />
        ) : (
          <div className="divide-y divide-gray-100 rounded-xl border border-gray-100">
            {visibleEntries.map((entry) => {
              const entryKey = getEntryKey(entry)
              const feedback = feedbackByEntryKey[entryKey]
              const isSelected = selectedKeySet.has(entryKey)
              const isSelectable = isBulkCompatibleEntry(entry)

              return (
                <div
                  key={entryKey}
                  className="flex flex-col gap-3 px-4 py-3 lg:flex-row lg:items-center lg:justify-between"
                >
                  <div className="flex items-start gap-3">
                    <input
                      type="checkbox"
                      checked={isSelected}
                      disabled={!isSelectable}
                      onChange={(event) => {
                        setSelectedKeys((currentKeys) => {
                          if (!isSelectable) return currentKeys

                          if (event.target.checked) {
                            return [...currentKeys, entryKey]
                          }

                          return currentKeys.filter((key) => key !== entryKey)
                        })
                      }}
                      className="mt-1 h-4 w-4 rounded border-gray-300 text-primary-500 focus:ring-primary-300 disabled:cursor-not-allowed disabled:opacity-50"
                    />
                    <div className="space-y-1">
                      <div className="text-sm font-medium text-gray-800">
                        {entry.patientName}
                      </div>
                      <div className="text-xs text-gray-400">
                        {entry.subtitle}
                      </div>
                      {feedback && (
                        <div
                          className={`text-xs ${
                            feedback.tone === 'success' ? 'text-emerald-700' : 'text-red-500'
                          }`}
                        >
                          {feedback.message}
                        </div>
                      )}
                      {!isSelectable && (
                        <div className="text-xs text-gray-400">
                          {entry.bulkActionLimitation ?? 'Esta cobrança não participa das ações em lote.'}
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="flex flex-col items-stretch gap-2 sm:flex-row sm:items-center">
                    <span className="text-sm font-semibold text-amber-600">
                      {formatCurrency(entry.amountCents)}
                    </span>
                    <Button
                      variant="secondary"
                      size="sm"
                      className="w-full sm:w-auto"
                      onClick={() => setSelectedEntry(entry)}
                    >
                      {entry.kind === 'protocol' ? 'Registrar entrada' : 'Marcar Pago'}
                    </Button>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </Panel.Body>

      <PaymentMethodDialog
        open={selectedEntry?.kind === 'appointment'}
        onClose={() => {
          if (isAppointmentMutationPending) return
          setSelectedEntry(null)
        }}
        onConfirm={(paymentMethod, paidAt) => {
          if (!selectedEntry || selectedEntry.kind !== 'appointment') return
          onMarkAppointmentPaid(selectedEntry.id, selectedEntry.patientId, paymentMethod, paidAt)
          setSelectedEntry(null)
        }}
        title="Registrar pagamento"
        confirmLabel="Marcar pago"
        isPending={isAppointmentMutationPending}
      />

      <PaymentMethodDialog
        open={bulkPaymentDialogOpen}
        onClose={() => {
          if (bulkMarkAppointmentsPaid.isPending) return
          setBulkPaymentDialogOpen(false)
        }}
        onConfirm={(paymentMethod, paidAt) => {
          void handleBulkMarkPaid(paymentMethod, paidAt)
        }}
        title="Registrar pagamentos em lote"
        confirmLabel="Marcar selecionadas como pagas"
        isPending={bulkMarkAppointmentsPaid.isPending}
      />

      <ProtocolPaymentDialog
        open={selectedEntry?.kind === 'protocol'}
        onClose={() => {
          if (isProtocolMutationPending) return
          setSelectedEntry(null)
        }}
        remainingAmountCents={selectedEntry?.kind === 'protocol' ? selectedEntry.amountCents : 0}
        onConfirm={(payment) => {
          if (!selectedEntry || selectedEntry.kind !== 'protocol') return
          onAddProtocolPayment(selectedEntry.id, selectedEntry.patientId, payment)
          setSelectedEntry(null)
        }}
        isPending={isProtocolMutationPending}
      />
    </Panel>
  )
}
