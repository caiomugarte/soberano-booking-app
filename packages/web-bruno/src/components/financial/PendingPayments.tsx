import { useEffect, useMemo, useState } from 'react'
import { useSendBulkPaymentReminders } from '@/api/appointments'
import { PaymentMethodDialog } from '@/components/appointments/PaymentMethodDialog'
import { ProtocolPaymentDialog } from '@/components/protocols/ProtocolPaymentDialog'
import { EmptyState } from '@/components/ui/EmptyState'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Panel } from '@/components/ui/Panel'
import { formatCurrency } from '@/lib/format'
import type { PaymentMethod } from '@/schemas/appointment.schema'

interface PendingPaymentsProps {
  entries: Array<{
    kind: 'appointment' | 'protocol'
    id: string
    patientId: string
    patientName: string
    patientPhone?: string
    subtitle: string
    amountCents: number
    reminderAppointmentId?: string
  }>
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

type ReminderFeedback = {
  tone: 'success' | 'error'
  message: string
}

function getEntryKey(entry: PendingPaymentsProps['entries'][number]) {
  return `${entry.kind}:${entry.id}`
}

export function PendingPayments({
  entries,
  onMarkAppointmentPaid,
  onAddProtocolPayment,
  isAppointmentMutationPending = false,
  isProtocolMutationPending = false,
}: PendingPaymentsProps) {
  const sendBulkReminders = useSendBulkPaymentReminders()
  const [selectedEntry, setSelectedEntry] = useState<PendingPaymentsProps['entries'][number] | null>(null)
  const [patientFilter, setPatientFilter] = useState('')
  const [selectedKeys, setSelectedKeys] = useState<string[]>([])
  const [reminderFeedback, setReminderFeedback] = useState<Record<string, ReminderFeedback>>({})
  const [reminderSummary, setReminderSummary] = useState<{
    successCount: number
    failureCount: number
  } | null>(null)

  const normalizedPatientFilter = patientFilter.trim().toLowerCase()
  const visibleEntries = useMemo(() => {
    if (!normalizedPatientFilter) {
      return entries
    }

    return entries.filter((entry) => entry.patientName.toLowerCase().includes(normalizedPatientFilter))
  }, [entries, normalizedPatientFilter])
  const visibleKeys = useMemo(() => visibleEntries.map(getEntryKey), [visibleEntries])
  const visibleKeySet = useMemo(() => new Set(visibleKeys), [visibleKeys])
  const selectedKeySet = useMemo(() => new Set(selectedKeys), [selectedKeys])
  const visibleSelectableKeys = useMemo(
    () =>
      visibleEntries
        .filter((entry) => Boolean(entry.reminderAppointmentId))
        .map(getEntryKey),
    [visibleEntries],
  )
  const selectedVisibleCount = visibleKeys.filter((key) => selectedKeySet.has(key)).length
  const allVisibleSelected =
    visibleSelectableKeys.length > 0 &&
    visibleSelectableKeys.every((key) => selectedKeySet.has(key))

  useEffect(() => {
    setSelectedKeys((currentKeys) => {
      const nextKeys = currentKeys.filter((key) => visibleKeySet.has(key))
      return nextKeys.length === currentKeys.length ? currentKeys : nextKeys
    })
  }, [visibleKeySet])

  if (entries.length === 0) {
    return (
      <EmptyState
        title="Nenhuma pendência vencida"
        description="As sessões futuras e os protocolos já quitados não entram nesta bancada."
      />
    )
  }

  async function handleSendReminders() {
    const selectedReminderEntries = visibleEntries.filter(
      (entry) => selectedKeySet.has(getEntryKey(entry)) && entry.reminderAppointmentId,
    )
    if (selectedReminderEntries.length === 0) return

    const results = await sendBulkReminders.mutateAsync(
      selectedReminderEntries.map((entry) => entry.reminderAppointmentId!),
    )

    let successCount = 0
    let failureCount = 0
    const failedKeys: string[] = []
    const batchFeedback: Record<string, ReminderFeedback> = {}

    results.forEach((result) => {
      const entryKey = `appointment:${result.appointmentId}`

      if (result.success) {
        successCount += 1
        batchFeedback[entryKey] = {
          tone: 'success',
          message: 'Lembrete enviado com sucesso.',
        }
        return
      }

      failureCount += 1
      failedKeys.push(entryKey)
      batchFeedback[entryKey] = {
        tone: 'error',
        message: result.message ?? 'Erro ao enviar lembrete.',
      }
    })

    setReminderSummary({ successCount, failureCount })
    setReminderFeedback((currentFeedback) => {
      const nextFeedback = { ...currentFeedback }

      selectedReminderEntries.forEach((entry) => {
        delete nextFeedback[getEntryKey(entry)]
      })

      return { ...nextFeedback, ...batchFeedback }
    })
    setSelectedKeys(failedKeys)
  }

  return (
    <Panel>
      <Panel.Header>Pendências vencidas ({entries.length})</Panel.Header>
      <Panel.Body className="space-y-4">
        <div className="grid grid-cols-1 gap-3 lg:grid-cols-[minmax(0,1fr)_auto_auto] lg:items-end">
          <Input
            label="Filtrar por paciente"
            placeholder="Digite o nome do paciente..."
            value={patientFilter}
            onChange={(event) => setPatientFilter(event.target.value)}
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

              setSelectedKeys(visibleSelectableKeys)
            }}
            disabled={visibleSelectableKeys.length === 0}
          >
            {allVisibleSelected ? 'Limpar seleção visível' : 'Selecionar todas as visíveis'}
          </Button>
          {selectedKeys.length > 0 && (
            <Button
              type="button"
              size="sm"
              className="w-full lg:w-auto"
              onClick={() => {
                void handleSendReminders()
              }}
              disabled={sendBulkReminders.isPending}
            >
              {sendBulkReminders.isPending ? 'Enviando...' : 'Enviar lembrete'}
            </Button>
          )}
        </div>

        <div className="flex flex-col gap-2 text-sm text-gray-500 sm:flex-row sm:items-center sm:justify-between">
          <span>
            {selectedVisibleCount} {selectedVisibleCount === 1 ? 'linha selecionada' : 'linhas selecionadas'} na lista visível
          </span>
          <span>
            {visibleEntries.length} {visibleEntries.length === 1 ? 'pendência visível' : 'pendências visíveis'}
          </span>
        </div>

        {reminderSummary && (
          <div
            className={`rounded-lg px-3 py-2 text-sm ${
              reminderSummary.failureCount > 0
                ? 'border border-amber-200 bg-amber-50 text-amber-900'
                : 'border border-emerald-200 bg-emerald-50 text-emerald-800'
            }`}
          >
            {reminderSummary.successCount} {reminderSummary.successCount === 1 ? 'lembrete enviado' : 'lembretes enviados'}
            {reminderSummary.failureCount > 0 &&
              ` • ${reminderSummary.failureCount} ${reminderSummary.failureCount === 1 ? 'pendência ainda precisa de atenção' : 'pendências ainda precisam de atenção'}`}
          </div>
        )}

        {visibleEntries.length === 0 ? (
          <EmptyState
            title="Nenhuma pendência encontrada"
            description="Tente outro nome de paciente para localizar a cobrança."
          />
        ) : (
          <div className="divide-y divide-gray-100 rounded-xl border border-gray-100">
            {visibleEntries.map((entry) => {
              const entryKey = getEntryKey(entry)
              const feedback = reminderFeedback[entryKey]
              const isSelected = selectedKeySet.has(entryKey)
              const isSelectable = Boolean(entry.reminderAppointmentId)

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
                          Esta pendência ainda não participa do lembrete em lote.
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
                      Marcar Pago
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
