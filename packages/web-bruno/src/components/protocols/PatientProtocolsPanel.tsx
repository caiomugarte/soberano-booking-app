import { useMemo, useState } from 'react'
import { useChangeProtocolStatus, usePatientProtocols } from '@/api/protocols'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { EmptyState } from '@/components/ui/EmptyState'
import { Panel } from '@/components/ui/Panel'
import { ProtocolForm } from './ProtocolForm'
import { formatCurrency, formatDate } from '@/lib/format'
import { PAYMENT_STATUS_LABELS, PROTOCOL_STATUS_LABELS } from '@/config/constants'
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

export function PatientProtocolsPanel({ patientId }: PatientProtocolsPanelProps) {
  const { data: protocols = [] } = usePatientProtocols(patientId)
  const changeProtocolStatus = useChangeProtocolStatus()
  const [editingProtocol, setEditingProtocol] = useState<Protocol | null>(null)
  const [formOpen, setFormOpen] = useState(false)

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
              description="Crie o acordo comercial do paciente para acompanhar sessões, manutenção e histórico."
            />
          ) : (
            <>
              {currentProtocols.map((protocol) => (
                <div key={protocol.id} className="rounded-xl border border-gray-200 p-4">
                  <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                    <div className="space-y-2">
                      <div className="flex flex-wrap items-center gap-2">
                        <Badge variant={getProtocolBadgeVariant(protocol.status)}>
                          {PROTOCOL_STATUS_LABELS[protocol.status]}
                        </Badge>
                        <span className="text-sm text-gray-500">
                          Criado em {formatDate(protocol.createdAt)}
                        </span>
                      </div>
                      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                        <CounterCard label="Total" value={protocol.totalSessions} />
                        <CounterCard label="Reservadas" value={protocol.reservedSessions} />
                        <CounterCard label="Consumidas" value={protocol.consumedSessions} />
                        <CounterCard label="Restantes" value={protocol.remainingSessions} />
                      </div>
                      <div className="space-y-1 text-sm text-gray-600">
                        <div>Venda: <span className="font-medium text-gray-800">{formatCurrency(protocol.totalPriceCents)}</span></div>
                        <div>Pagamento: <span className="font-medium text-gray-800">{PAYMENT_STATUS_LABELS[protocol.paymentStatus]}</span></div>
                        {protocol.paidAt && (
                          <div>Pago em: <span className="font-medium text-gray-800">{formatDate(protocol.paidAt)}</span></div>
                        )}
                        {protocol.notes && (
                          <div className="text-gray-500">{protocol.notes}</div>
                        )}
                      </div>
                    </div>
                    <div className="flex flex-wrap gap-2 lg:justify-end">
                      <Button variant="ghost" size="sm" onClick={() => openEdit(protocol)}>
                        Editar
                      </Button>
                      {protocol.status === 'active' && (
                        <Button
                          variant="secondary"
                          size="sm"
                          onClick={() => changeProtocolStatus.mutate({ id: protocol.id, patientId, status: 'maintenance' })}
                        >
                          Manutenção
                        </Button>
                      )}
                      {protocol.status !== 'finished' && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => changeProtocolStatus.mutate({ id: protocol.id, patientId, status: 'finished' })}
                        >
                          Finalizar
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
              ))}

              {finishedProtocols.length > 0 && (
                <div className="space-y-3">
                  <div className="text-sm font-medium text-gray-700">Histórico finalizado</div>
                  {finishedProtocols.map((protocol) => (
                    <div key={protocol.id} className="rounded-xl border border-dashed border-gray-200 p-4">
                      <div className="flex flex-wrap items-center gap-2">
                        <Badge variant="gray">{PROTOCOL_STATUS_LABELS[protocol.status]}</Badge>
                        <span className="text-sm text-gray-500">
                          {formatCurrency(protocol.totalPriceCents)} • {protocol.consumedSessions} consumidas
                        </span>
                      </div>
                      <div className="mt-2 text-xs text-gray-500">
                        Criado em {formatDate(protocol.createdAt)}
                        {protocol.paidAt ? ` • pago em ${formatDate(protocol.paidAt)}` : ''}
                      </div>
                    </div>
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
    </>
  )
}
