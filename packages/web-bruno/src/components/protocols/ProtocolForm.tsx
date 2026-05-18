import { useEffect, useState, type FormEvent } from 'react'
import { useCreateProtocol, useUpdateProtocol } from '@/api/protocols'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Modal } from '@/components/ui/Modal'
import { Select } from '@/components/ui/Select'
import { Textarea } from '@/components/ui/Textarea'
import type { Protocol } from '@/schemas/protocol.schema'
import type { PaymentMethod, PaymentStatus, ProtocolStatus } from '@/schemas/appointment.schema'
import { dateInputToIso, getTodayDateInputValue, toDateInputValue } from '@/lib/format'

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
  const [paymentStatus, setPaymentStatus] = useState<PaymentStatus>(protocol?.paymentStatus ?? 'pending')
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod | ''>(protocol?.paymentMethod ?? '')
  const [paidAt, setPaidAt] = useState(toDateInputValue(protocol?.paidAt) || getTodayDateInputValue())
  const [notes, setNotes] = useState(protocol?.notes ?? '')
  const [submitError, setSubmitError] = useState('')

  useEffect(() => {
    if (!open) return

    setTotalSessions(protocol?.totalSessions ? String(protocol.totalSessions) : '')
    setTotalPrice(protocol ? String(protocol.totalPriceCents / 100) : '')
    setStatus(protocol?.status ?? 'active')
    setPaymentStatus(protocol?.paymentStatus ?? 'pending')
    setPaymentMethod(protocol?.paymentMethod ?? '')
    setPaidAt(toDateInputValue(protocol?.paidAt) || getTodayDateInputValue())
    setNotes(protocol?.notes ?? '')
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

    if (paymentStatus === 'paid' && !paymentMethod) {
      setSubmitError('Selecione a forma de pagamento do protocolo.')
      return
    }

    const payload = {
      totalSessions: parsedTotalSessions,
      totalPriceCents: parsedTotalPriceCents,
      status,
      paymentStatus,
      paymentMethod: paymentStatus === 'paid' ? paymentMethod || undefined : undefined,
      paidAt: paymentStatus === 'paid' ? dateInputToIso(paidAt) : undefined,
      notes: notes || undefined,
    }

    if (protocol) {
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
          <Select
            label="Pagamento"
            value={paymentStatus}
            onChange={(e) => {
              const nextStatus = e.target.value as PaymentStatus
              setPaymentStatus(nextStatus)
              if (nextStatus === 'pending') {
                setPaymentMethod('')
              }
            }}
            options={[
              { value: 'pending', label: 'Pendente' },
              { value: 'paid', label: 'Pago' },
            ]}
          />
          {paymentStatus === 'paid' && (
            <>
              <Select
                label="Forma de pagamento"
                value={paymentMethod}
                onChange={(e) => setPaymentMethod(e.target.value as PaymentMethod)}
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
                value={paidAt}
                onChange={(e) => setPaidAt(e.target.value)}
                required
              />
            </>
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
