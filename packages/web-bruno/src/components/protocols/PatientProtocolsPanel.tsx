import { useMemo, useState } from 'react'
import {
  useAddProtocolPayment,
  useChangeProtocolStatus,
  useDeleteProtocol,
  usePatientProtocols,
  useUpdateProtocolPayment,
} from '@/api/protocols'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { ConfirmationDialog } from '@/components/ui/ConfirmationDialog'
import { EmptyState } from '@/components/ui/EmptyState'
import { Panel } from '@/components/ui/Panel'
import { ProtocolForm } from './ProtocolForm'
import { ProtocolPaymentDialog } from './ProtocolPaymentDialog'
import { formatCurrency, formatDate } from '@/lib/format'
import {
  PAYMENT_METHOD_LABELS,
  PROTOCOL_PAYMENT_STATUS_LABELS,
  PROTOCOL_STATUS_LABELS,
} from '@/config/constants'
import type { Protocol } from '@/schemas/protocol.schema'

interface PatientProtocolsPanelProps {
  patientId: string
}

function getProtocolBadgeVariant(status: Protocol['status']): 'blue' | 'amber' | 'gray' {
  if (status === 'active') return 'blue'
  if (status === 'maintenance') return 'amber'
  return 'gray'
}

function CounterCard({
  label,
  value,
}: {
  label: string
  value: number
}) {
  return (
    <div className="rounded-lg border border-gray-100 bg-gray-50 px-3 py-2">
      <div className="text-xs text-gray-500">{label}</div>
      <div className="mt-1 text-lg font-semibold text-gray-800">{value}</div>
    </div>
  )
}

function PaymentHistory({
  protocol,
  onEditPayment,
}: {
  protocol: Protocol
  onEditPayment: (protocol: Protocol, payment: Protocol['payments'][number]) => void
}) {
  return (
    <div className="rounded-lg border border-gray-100 bg-white">
      <div className="border-b border-gray-100 px-3 py-2 text-xs font-medium uppercase tracking-wide text-gray-500">
        Histórico de pagamentos
      </div>
      {protocol.payments.length === 0 ? (
        <div className="px-3 py-3 text-sm text-gray-500">
          Nenhum recebimento registrado ainda.
        </div>
      ) : (
        <div className="divide-y divide-gray-100">
          {protocol.payments.map((payment) => (
            <div key={payment.id} className="flex flex-col gap-1 px-3 py-3 text-sm sm:flex-row sm:items-center sm:justify-between">
              <div>
                <div className="font-medium text-gray-800">{formatCurrency(payment.amountCents)}</div>
                <div className="text-xs text-gray-500">
                  {PAYMENT_METHOD_LABELS[payment.paymentMethod]} • {formatDate(payment.paidAt)}
                </div>
              </div>
              <Button variant="ghost" size="sm" onClick={() => onEditPayment(protocol, payment)}>
                Editar pagamento
              </Button>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

function ProtocolCard({
  protocol,
  onEdit,
  onRequestDelete,
  onRequestPayment,
  onRequestEditPayment,
  onChangeStatus,
  isStatusPending,
}: {
  protocol: Protocol
  onEdit: (protocol: Protocol) => void
  onRequestDelete?: (protocol: Protocol) => void
  onRequestPayment: (protocol: Protocol) => void
  onRequestEditPayment: (protocol: Protocol, payment: Protocol['payments'][number]) => void
  onChangeStatus: (id: string, status: Protocol['status']) => void
  isStatusPending: boolean
}) {
  return (
    <div className={`rounded-xl border p-4 ${protocol.status === 'finished' ? 'border-dashed border-gray-200' : 'border-gray-200'}`}>
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="min-w-0 flex-1 space-y-4">
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant={getProtocolBadgeVariant(protocol.status)}>
              {PROTOCOL_STATUS_LABELS[protocol.status]}
            </Badge>
            <span className="text-sm text-gray-500">
              Criado em {formatDate(protocol.createdAt)}
            </span>
            {protocol.lastPaymentAt && (
              <span className="text-sm text-gray-500">
                • último recebimento em {formatDate(protocol.lastPaymentAt)}
              </span>
            )}
          </div>

          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            <CounterCard label="Total" value={protocol.totalSessions} />
            <CounterCard label="Reservadas" value={protocol.reservedSessions} />
            <CounterCard label="Consumidas" value={protocol.consumedSessions} />
            <CounterCard label="Restantes" value={protocol.remainingSessions} />
          </div>

          <div className="grid grid-cols-1 gap-3 rounded-xl border border-gray-100 bg-gray-50 p-3 text-sm text-gray-700 sm:grid-cols-2 xl:grid-cols-4">
            <div>
              <div className="text-xs uppercase tracking-wide text-gray-500">Venda</div>
              <div className="mt-1 font-semibold text-gray-900">{formatCurrency(protocol.totalPriceCents)}</div>
            </div>
            <div>
              <div className="text-xs uppercase tracking-wide text-gray-500">Recebido</div>
              <div className="mt-1 font-semibold text-emerald-700">{formatCurrency(protocol.paidAmountCents)}</div>
            </div>
            <div>
              <div className="text-xs uppercase tracking-wide text-gray-500">Saldo</div>
              <div className="mt-1 font-semibold text-amber-700">{formatCurrency(protocol.remainingAmountCents)}</div>
            </div>
            <div>
              <div className="text-xs uppercase tracking-wide text-gray-500">Situação financeira</div>
              <div className="mt-1 font-semibold text-gray-900">
                {PROTOCOL_PAYMENT_STATUS_LABELS[protocol.paymentStatus]}
              </div>
            </div>
          </div>

          {protocol.notes && (
            <div className="text-sm text-gray-500">{protocol.notes}</div>
          )}

          <PaymentHistory protocol={protocol} onEditPayment={onRequestEditPayment} />
        </div>

        <div className="flex flex-wrap gap-2 lg:justify-end">
          <Button variant="ghost" size="sm" onClick={() => onEdit(protocol)}>
            Editar
          </Button>
          {protocol.remainingAmountCents > 0 && (
            <Button variant="secondary" size="sm" onClick={() => onRequestPayment(protocol)}>
              Registrar pagamento
            </Button>
          )}
          {protocol.status === 'active' && (
            <Button
              variant="secondary"
              size="sm"
              disabled={isStatusPending}
              onClick={() => onChangeStatus(protocol.id, 'maintenance')}
            >
              Manutenção
            </Button>
          )}
          {protocol.status !== 'finished' && (
            <Button
              variant="ghost"
              size="sm"
              disabled={isStatusPending}
              onClick={() => onChangeStatus(protocol.id, 'finished')}
            >
              Finalizar
            </Button>
          )}
          {protocol.status === 'finished' && onRequestDelete && (
            <Button
              variant="danger"
              size="sm"
              onClick={() => onRequestDelete(protocol)}
            >
              Excluir
            </Button>
          )}
        </div>
      </div>
    </div>
  )
}

export function PatientProtocolsPanel({ patientId }: PatientProtocolsPanelProps) {
  const { data: protocols = [] } = usePatientProtocols(patientId)
  const changeProtocolStatus = useChangeProtocolStatus()
  const deleteProtocol = useDeleteProtocol()
  const addProtocolPayment = useAddProtocolPayment()
  const updateProtocolPayment = useUpdateProtocolPayment()
  const [editingProtocol, setEditingProtocol] = useState<Protocol | null>(null)
  const [formOpen, setFormOpen] = useState(false)
  const [protocolToDelete, setProtocolToDelete] = useState<Protocol | null>(null)
  const [paymentDialogState, setPaymentDialogState] = useState<
    | { mode: 'add'; protocol: Protocol }
    | { mode: 'edit'; protocol: Protocol; payment: Protocol['payments'][number] }
    | null
  >(null)

  const { currentProtocols, finishedProtocols } = useMemo(() => ({
    currentProtocols: protocols.filter((protocol) => protocol.status !== 'finished'),
    finishedProtocols: protocols.filter((protocol) => protocol.status === 'finished'),
  }), [protocols])

  function openCreate() {
    setEditingProtocol(null)
    setFormOpen(true)
  }

  function openEdit(protocol: Protocol) {
    setEditingProtocol(protocol)
    setFormOpen(true)
  }

  function handleDeleteProtocol() {
    if (!protocolToDelete) return

    deleteProtocol.mutate(
      { id: protocolToDelete.id, patientId },
      {
        onSuccess: () => setProtocolToDelete(null),
      },
    )
  }

  return (
    <>
      <Panel>
        <Panel.Header className="flex items-center justify-between gap-3">
          <span>Protocolos de Neuromodulação</span>
          <Button variant="secondary" size="sm" onClick={openCreate}>
            + Novo protocolo
          </Button>
        </Panel.Header>
        <Panel.Body className="space-y-4">
          {protocols.length === 0 ? (
            <EmptyState
              title="Nenhum protocolo cadastrado"
              description="Crie o acordo comercial do paciente para acompanhar sessões, recebimentos e histórico."
            />
          ) : (
            <>
              {currentProtocols.map((protocol) => (
                <ProtocolCard
                  key={protocol.id}
                  protocol={protocol}
                  onEdit={openEdit}
                  onRequestPayment={(item) => setPaymentDialogState({ mode: 'add', protocol: item })}
                  onRequestEditPayment={(item, payment) => setPaymentDialogState({ mode: 'edit', protocol: item, payment })}
                  onChangeStatus={(id, status) => changeProtocolStatus.mutate({ id, patientId, status })}
                  isStatusPending={changeProtocolStatus.isPending}
                />
              ))}

              {finishedProtocols.length > 0 && (
                <div className="space-y-3">
                  <div className="space-y-1">
                    <div className="text-sm font-medium text-gray-700">Histórico finalizado</div>
                    <p className="text-xs text-gray-500">
                      Protocolos concluídos automaticamente ou finalizados manualmente permanecem aqui até Bruno decidir excluir um item sem sessões vinculadas.
                    </p>
                  </div>
                  {finishedProtocols.map((protocol) => (
                    <ProtocolCard
                      key={protocol.id}
                      protocol={protocol}
                      onEdit={openEdit}
                      onRequestDelete={(item) => {
                        deleteProtocol.reset()
                        setProtocolToDelete(item)
                      }}
                      onRequestPayment={(item) => setPaymentDialogState({ mode: 'add', protocol: item })}
                      onRequestEditPayment={(item, payment) => setPaymentDialogState({ mode: 'edit', protocol: item, payment })}
                      onChangeStatus={(id, status) => changeProtocolStatus.mutate({ id, patientId, status })}
                      isStatusPending={changeProtocolStatus.isPending}
                    />
                  ))}
                </div>
              )}
            </>
          )}
        </Panel.Body>
      </Panel>

      <ProtocolForm
        open={formOpen}
        onClose={() => setFormOpen(false)}
        patientId={patientId}
        protocol={editingProtocol}
      />

      <ProtocolPaymentDialog
        open={paymentDialogState !== null}
        onClose={() => {
          if (addProtocolPayment.isPending || updateProtocolPayment.isPending) return
          addProtocolPayment.reset()
          updateProtocolPayment.reset()
          setPaymentDialogState(null)
        }}
        remainingAmountCents={paymentDialogState?.protocol.remainingAmountCents ?? 0}
        maxAmountCents={
          paymentDialogState?.mode === 'edit'
            ? paymentDialogState.protocol.remainingAmountCents + paymentDialogState.payment.amountCents
            : undefined
        }
        initialPayment={
          paymentDialogState?.mode === 'edit'
            ? {
                amountCents: paymentDialogState.payment.amountCents,
                paymentMethod: paymentDialogState.payment.paymentMethod,
                paidAt: paymentDialogState.payment.paidAt,
              }
            : undefined
        }
        title={paymentDialogState?.mode === 'edit' ? 'Editar pagamento do protocolo' : 'Registrar pagamento do protocolo'}
        confirmLabel={paymentDialogState?.mode === 'edit' ? 'Salvar pagamento' : 'Adicionar pagamento'}
        balanceLabel={paymentDialogState?.mode === 'edit' ? 'Saldo atual após este pagamento' : 'Saldo restante'}
        isPending={paymentDialogState?.mode === 'edit' ? updateProtocolPayment.isPending : addProtocolPayment.isPending}
        onConfirm={(payment) => {
          if (!paymentDialogState) return

          if (paymentDialogState.mode === 'edit') {
            updateProtocolPayment.mutate(
              {
                protocolId: paymentDialogState.protocol.id,
                paymentId: paymentDialogState.payment.id,
                patientId,
                data: payment,
              },
              {
                onSuccess: () => setPaymentDialogState(null),
              },
            )
            return
          }

          addProtocolPayment.mutate(
            {
              id: paymentDialogState.protocol.id,
              patientId,
              data: payment,
            },
            {
              onSuccess: () => setPaymentDialogState(null),
            },
          )
        }}
      />

      <ConfirmationDialog
        open={protocolToDelete !== null}
        onClose={() => {
          if (deleteProtocol.isPending) return
          deleteProtocol.reset()
          setProtocolToDelete(null)
        }}
        onConfirm={handleDeleteProtocol}
        title="Excluir protocolo"
        description={
          protocolToDelete
            ? 'Tem certeza que deseja excluir este protocolo finalizado? Essa ação só é permitida quando não existem sessões vinculadas.'
            : ''
        }
        confirmLabel="Excluir protocolo"
        isPending={deleteProtocol.isPending}
        error={deleteProtocol.error instanceof Error ? deleteProtocol.error.message : null}
      />
    </>
  )
}
