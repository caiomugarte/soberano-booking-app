import { useEffect, useState, type FormEvent } from 'react'
import { useCreateProtocol, useUpdateProtocol } from '@/api/protocols'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Modal } from '@/components/ui/Modal'
import { Select } from '@/components/ui/Select'
import { Textarea } from '@/components/ui/Textarea'
import { formatCurrency } from '@/lib/format'
import { dateInputToIso, getTodayDateInputValue } from '@/lib/format'
import type { PaymentMethod, ProtocolStatus } from '@/schemas/appointment.schema'
import type { CreateProtocolData, Protocol, UpdateProtocolData } from '@/schemas/protocol.schema'

interface ProtocolFormProps {
  open: boolean
  onClose: () => void
  patientId: string
  protocol?: Protocol | null
}

export function ProtocolForm({ open, onClose, patientId, protocol }: ProtocolFormProps) {
  const createProtocol = useCreateProtocol(patientId)
  const updateProtocol = useUpdateProtocol()
  const isEditMode = Boolean(protocol)

  const [totalSessions, setTotalSessions] = useState(protocol?.totalSessions ? String(protocol.totalSessions) : '')
  const [totalPrice, setTotalPrice] = useState(protocol ? String(protocol.totalPriceCents / 100) : '')
  const [status, setStatus] = useState<ProtocolStatus>(protocol?.status ?? 'active')
  const [notes, setNotes] = useState(protocol?.notes ?? '')
  const [captureInitialPayment, setCaptureInitialPayment] = useState(false)
  const [initialPaymentAmount, setInitialPaymentAmount] = useState('')
  const [initialPaymentMethod, setInitialPaymentMethod] = useState<PaymentMethod | ''>('')
  const [initialPaymentDate, setInitialPaymentDate] = useState(getTodayDateInputValue())
  const [submitError, setSubmitError] = useState('')

  useEffect(() => {
    if (!open) return

    setTotalSessions(protocol?.totalSessions ? String(protocol.totalSessions) : '')
    setTotalPrice(protocol ? String(protocol.totalPriceCents / 100) : '')
    setStatus(protocol?.status ?? 'active')
    setNotes(protocol?.notes ?? '')
    setCaptureInitialPayment(false)
    setInitialPaymentAmount('')
    setInitialPaymentMethod('')
    setInitialPaymentDate(getTodayDateInputValue())
    setSubmitError('')
  }, [open, protocol])

  function handleSubmit(event: FormEvent) {
    event.preventDefault()
    setSubmitError('')

    const parsedTotalSessions = Number.parseInt(totalSessions, 10)
    const parsedTotalPriceCents = Math.round(Number.parseFloat(totalPrice || '0') * 100)

    if (!Number.isFinite(parsedTotalSessions) || parsedTotalSessions < 1) {
      setSubmitError('Informe o total de sessões do protocolo.')
      return
    }

    if (!Number.isFinite(parsedTotalPriceCents) || parsedTotalPriceCents < 0) {
      setSubmitError('Informe o valor comercial do protocolo.')
      return
    }

    const normalizedNotes = notes.trim()

    if (protocol) {
      const payload: UpdateProtocolData = {
        totalSessions: parsedTotalSessions,
        totalPriceCents: parsedTotalPriceCents,
        status,
        notes: normalizedNotes || null,
      }

      updateProtocol.mutate(
        {
          id: protocol.id,
          patientId,
          data: payload,
        },
        {
          onSuccess: onClose,
          onError: (error) => {
            setSubmitError(error instanceof Error ? error.message : 'Erro ao atualizar protocolo')
          },
        },
      )
      return
    }

    let initialPayment: CreateProtocolData['initialPayment']
    if (captureInitialPayment) {
      const amountCents = Math.round(Number.parseFloat(initialPaymentAmount || '0') * 100)

      if (!Number.isFinite(amountCents) || amountCents <= 0) {
        setSubmitError('Informe um valor inicial maior que zero.')
        return
      }

      if (amountCents > parsedTotalPriceCents) {
        setSubmitError('O pagamento inicial não pode exceder o valor do protocolo.')
        return
      }

      if (!initialPaymentMethod) {
        setSubmitError('Selecione a forma de pagamento inicial.')
        return
      }

      if (!initialPaymentDate) {
        setSubmitError('Informe a data do pagamento inicial.')
        return
      }

      initialPayment = {
        amountCents,
        paymentMethod: initialPaymentMethod,
        paidAt: dateInputToIso(initialPaymentDate),
      }
    }

    const payload: CreateProtocolData = {
      totalSessions: parsedTotalSessions,
      totalPriceCents: parsedTotalPriceCents,
      status,
      notes: normalizedNotes || null,
      ...(initialPayment ? { initialPayment } : {}),
    }

    createProtocol.mutate(payload, {
      onSuccess: onClose,
      onError: (error) => {
        setSubmitError(error instanceof Error ? error.message : 'Erro ao criar protocolo')
      },
    })
  }

  return (
    <Modal open={open} onClose={onClose}>
      <Modal.Header>{isEditMode ? 'Editar protocolo' : 'Novo protocolo'}</Modal.Header>
      <form onSubmit={handleSubmit}>
        <Modal.Body>
          {submitError ? (
            <div className="rounded-lg bg-red-50 p-3 text-sm text-red-600">{submitError}</div>
          ) : null}
          {protocol && (
            <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-700">
              Recebido: <span className="font-semibold text-slate-900">{formatCurrency(protocol.paidAmountCents)}</span>
              {' • '}
              Saldo restante: <span className="font-semibold text-slate-900">{formatCurrency(protocol.remainingAmountCents)}</span>
              <div className="mt-1 text-xs text-slate-500">
                O histórico de pagamentos é preservado e deve ser atualizado pelo fluxo de registrar pagamento.
              </div>
            </div>
          )}
          <Input
            label="Total de sessões"
            type="number"
            min="1"
            value={totalSessions}
            onChange={(e) => setTotalSessions(e.target.value)}
            required
          />
          <Input
            label="Valor comercial (R$)"
            type="number"
            step="0.01"
            min="0"
            value={totalPrice}
            onChange={(e) => setTotalPrice(e.target.value)}
            required
          />
          <Select
            label="Status do protocolo"
            value={status}
            onChange={(e) => setStatus(e.target.value as ProtocolStatus)}
            options={[
              { value: 'active', label: 'Ativo' },
              { value: 'maintenance', label: 'Manutenção' },
              { value: 'finished', label: 'Finalizado' },
            ]}
          />
          {!isEditMode && (
            <div className="rounded-lg border border-gray-200 p-3">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <div className="text-sm font-medium text-gray-800">Pagamento inicial</div>
                  <p className="text-xs text-gray-500">
                    Opcional. Registre a primeira entrada sem misturar a venda com edições futuras do protocolo.
                  </p>
                </div>
                <Button
                  type="button"
                  variant={captureInitialPayment ? 'ghost' : 'secondary'}
                  size="sm"
                  onClick={() => {
                    setCaptureInitialPayment((current) => !current)
                    setInitialPaymentAmount('')
                    setInitialPaymentMethod('')
                    setInitialPaymentDate(getTodayDateInputValue())
                  }}
                >
                  {captureInitialPayment ? 'Remover pagamento inicial' : 'Adicionar pagamento inicial'}
                </Button>
              </div>

              {captureInitialPayment && (
                <div className="mt-4 space-y-3">
                  <Input
                    label="Valor recebido (R$)"
                    type="number"
                    step="0.01"
                    min="0.01"
                    value={initialPaymentAmount}
                    onChange={(event) => setInitialPaymentAmount(event.target.value)}
                    required
                  />
                  <Select
                    label="Forma de pagamento"
                    value={initialPaymentMethod}
                    onChange={(event) => setInitialPaymentMethod(event.target.value as PaymentMethod)}
                    options={[
                      { value: 'card', label: 'Cartão' },
                      { value: 'pix', label: 'PIX' },
                      { value: 'cash', label: 'Dinheiro' },
                    ]}
                    placeholder="Selecione a forma de pagamento"
                    required
                  />
                  <Input
                    label="Data do pagamento"
                    type="date"
                    value={initialPaymentDate}
                    max={getTodayDateInputValue()}
                    onChange={(event) => setInitialPaymentDate(event.target.value)}
                    required
                  />
                </div>
              )}
            </div>
          )}
          <Textarea
            label="Observações"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
          />
        </Modal.Body>
        <Modal.Footer>
          <Button variant="ghost" type="button" onClick={onClose}>
            Cancelar
          </Button>
          <Button type="submit" disabled={createProtocol.isPending || updateProtocol.isPending}>
            {createProtocol.isPending || updateProtocol.isPending
              ? 'Salvando...'
              : isEditMode
                ? 'Salvar protocolo'
                : 'Criar protocolo'}
          </Button>
        </Modal.Footer>
      </form>
    </Modal>
  )
}
