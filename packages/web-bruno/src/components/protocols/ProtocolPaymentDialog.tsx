import { useEffect, useState } from 'react'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Modal } from '@/components/ui/Modal'
import { Select } from '@/components/ui/Select'
import { PAYMENT_METHOD_LABELS } from '@/config/constants'
import { dateInputToIso, formatCurrency, getTodayDateInputValue } from '@/lib/format'
import type { PaymentMethod } from '@/schemas/appointment.schema'

interface ProtocolPaymentDialogProps {
  open: boolean
  onClose: () => void
  onConfirm: (payment: { amountCents: number; paymentMethod: PaymentMethod; paidAt: string }) => void
  remainingAmountCents: number
  maxAmountCents?: number
  initialPayment?: {
    amountCents: number
    paymentMethod: PaymentMethod
    paidAt: string
  }
  title?: string
  confirmLabel?: string
  isPending?: boolean
  balanceLabel?: string
}

const paymentMethodOptions = Object.entries(PAYMENT_METHOD_LABELS).map(([value, label]) => ({
  value,
  label,
}))

export function ProtocolPaymentDialog({
  open,
  onClose,
  onConfirm,
  remainingAmountCents,
  maxAmountCents,
  initialPayment,
  title = 'Registrar pagamento do protocolo',
  confirmLabel = 'Adicionar pagamento',
  isPending = false,
  balanceLabel = 'Saldo restante',
}: ProtocolPaymentDialogProps) {
  const [amount, setAmount] = useState(initialPayment ? String(initialPayment.amountCents / 100) : '')
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod | ''>(initialPayment?.paymentMethod ?? '')
  const [paymentDate, setPaymentDate] = useState(initialPayment?.paidAt.slice(0, 10) ?? getTodayDateInputValue())
  const [amountError, setAmountError] = useState('')
  const [paymentMethodError, setPaymentMethodError] = useState('')
  const [paymentDateError, setPaymentDateError] = useState('')
  const allowedAmountCents = maxAmountCents ?? remainingAmountCents

  useEffect(() => {
    if (!open) return

    setAmount(initialPayment ? String(initialPayment.amountCents / 100) : '')
    setPaymentMethod(initialPayment?.paymentMethod ?? '')
    setPaymentDate(initialPayment?.paidAt.slice(0, 10) ?? getTodayDateInputValue())
    setAmountError('')
    setPaymentMethodError('')
    setPaymentDateError('')
  }, [initialPayment, open])

  function handleConfirm() {
    const amountCents = Math.round(Number.parseFloat(amount || '0') * 100)
    const today = getTodayDateInputValue()

    if (!Number.isFinite(amountCents) || amountCents <= 0) {
      setAmountError('Informe um valor maior que zero.')
    } else if (amountCents > allowedAmountCents) {
      setAmountError('O pagamento não pode exceder o limite permitido para este protocolo.')
    } else {
      setAmountError('')
    }

    if (!paymentMethod) {
      setPaymentMethodError('Selecione a forma de pagamento.')
    } else {
      setPaymentMethodError('')
    }

    if (!paymentDate) {
      setPaymentDateError('Informe a data do pagamento.')
    } else if (paymentDate > today) {
      setPaymentDateError('A data do pagamento não pode ficar no futuro.')
    } else {
      setPaymentDateError('')
    }

    if (
      !Number.isFinite(amountCents) ||
      amountCents <= 0 ||
      amountCents > allowedAmountCents ||
      !paymentMethod ||
      !paymentDate ||
      paymentDate > today
    ) {
      return
    }

    onConfirm({
      amountCents,
      paymentMethod,
      paidAt: dateInputToIso(paymentDate),
    })
  }

  return (
    <Modal open={open} onClose={onClose} zIndex={60}>
      <Modal.Header>{title}</Modal.Header>
      <Modal.Body>
        <div className="mb-4 rounded-lg border border-amber-100 bg-amber-50 px-3 py-2 text-sm text-amber-900">
          {balanceLabel}: <span className="font-semibold">{formatCurrency(remainingAmountCents)}</span>
          {allowedAmountCents !== remainingAmountCents && (
            <div className="mt-1 text-xs text-amber-800">
              Limite de edição: {formatCurrency(allowedAmountCents)}
            </div>
          )}
        </div>
        <Input
          label="Valor recebido (R$)"
          type="number"
          step="0.01"
          min="0.01"
          value={amount}
          onChange={(event) => {
            setAmount(event.target.value)
            setAmountError('')
          }}
          error={amountError || undefined}
        />
        <Select
          label="Forma de pagamento"
          value={paymentMethod}
          onChange={(event) => {
            setPaymentMethod(event.target.value as PaymentMethod)
            setPaymentMethodError('')
          }}
          options={paymentMethodOptions}
          placeholder="Selecione a forma de pagamento"
          error={paymentMethodError || undefined}
        />
        <Input
          label="Data do pagamento"
          type="date"
          value={paymentDate}
          max={getTodayDateInputValue()}
          onChange={(event) => {
            setPaymentDate(event.target.value)
            setPaymentDateError('')
          }}
          error={paymentDateError || undefined}
        />
      </Modal.Body>
      <Modal.Footer>
        <Button variant="ghost" onClick={onClose} disabled={isPending}>
          Cancelar
        </Button>
        <Button onClick={handleConfirm} disabled={isPending}>
          {isPending ? 'Salvando...' : confirmLabel}
        </Button>
      </Modal.Footer>
    </Modal>
  )
}
