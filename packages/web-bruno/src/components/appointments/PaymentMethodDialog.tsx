import { useEffect, useState } from 'react'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Modal } from '@/components/ui/Modal'
import { Select } from '@/components/ui/Select'
import { PAYMENT_METHOD_LABELS } from '@/config/constants'
import { dateInputToIso, getTodayDateInputValue } from '@/lib/format'
import type { PaymentMethod } from '@/schemas/appointment.schema'

interface PaymentMethodDialogProps {
  open: boolean
  onClose: () => void
  onConfirm: (paymentMethod: PaymentMethod, paidAt: string) => void
  title?: string
  confirmLabel?: string
  isPending?: boolean
  initialMethod?: PaymentMethod
  initialDate?: string
}

const paymentMethodOptions = Object.entries(PAYMENT_METHOD_LABELS).map(([value, label]) => ({
  value,
  label,
}))

export function PaymentMethodDialog({
  open,
  onClose,
  onConfirm,
  title = 'Forma de pagamento',
  confirmLabel = 'Confirmar',
  isPending = false,
  initialMethod,
  initialDate,
}: PaymentMethodDialogProps) {
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod | ''>(initialMethod ?? '')
  const [paymentDate, setPaymentDate] = useState(initialDate ?? getTodayDateInputValue())
  const [paymentMethodError, setPaymentMethodError] = useState('')
  const [paymentDateError, setPaymentDateError] = useState('')

  useEffect(() => {
    if (!open) return
    setPaymentMethod(initialMethod ?? '')
    setPaymentDate(initialDate ?? getTodayDateInputValue())
    setPaymentMethodError('')
    setPaymentDateError('')
  }, [initialDate, initialMethod, open])

  function handleConfirm() {
    if (!paymentMethod) {
      setPaymentMethodError('Selecione a forma de pagamento.')
    }
    if (!paymentDate) {
      setPaymentDateError('Informe a data do pagamento.')
    }
    if (!paymentMethod || !paymentDate) return

    onConfirm(paymentMethod, dateInputToIso(paymentDate))
  }

  return (
    <Modal open={open} onClose={onClose} zIndex={60}>
      <Modal.Header>{title}</Modal.Header>
      <Modal.Body>
        <Select
          label="Forma de pagamento"
          value={paymentMethod}
          onChange={(e) => {
            setPaymentMethod(e.target.value as PaymentMethod)
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
          onChange={(e) => {
            setPaymentDate(e.target.value)
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
