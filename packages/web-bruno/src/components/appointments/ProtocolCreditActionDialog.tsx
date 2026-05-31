import { useEffect, useState } from 'react'
import { Button } from '@/components/ui/Button'
import { Modal } from '@/components/ui/Modal'
import { Select } from '@/components/ui/Select'
import type { ProtocolCreditAction } from '@/schemas/appointment.schema'

interface ProtocolCreditActionDialogProps {
  open: boolean
  onClose: () => void
  onConfirm: (action: ProtocolCreditAction) => void
  title: string
  description: string
  isPending?: boolean
  error?: string | null
  defaultAction?: ProtocolCreditAction
}

export function ProtocolCreditActionDialog({
  open,
  onClose,
  onConfirm,
  title,
  description,
  isPending = false,
  error = null,
  defaultAction = 'release',
}: ProtocolCreditActionDialogProps) {
  const [action, setAction] = useState<ProtocolCreditAction>(defaultAction)

  useEffect(() => {
    if (!open) return
    setAction(defaultAction)
  }, [defaultAction, open])

  return (
    <Modal open={open} onClose={onClose}>
      <Modal.Header>{title}</Modal.Header>
      <Modal.Body>
        <div className="space-y-3">
          <p className="text-sm text-gray-600">{description}</p>
          <Select
            label="Tratamento do crédito"
            value={action}
            onChange={(event) => setAction(event.target.value as ProtocolCreditAction)}
            options={[
              { value: 'release', label: 'Liberar o crédito de volta ao protocolo' },
              { value: 'consume', label: 'Consumir o crédito mesmo sem manter a sessão' },
            ]}
          />
          {error ? (
            <p className="text-sm text-red-500">{error}</p>
          ) : null}
        </div>
      </Modal.Body>
      <Modal.Footer>
        <Button variant="ghost" type="button" onClick={onClose} disabled={isPending}>
          Cancelar
        </Button>
        <Button type="button" onClick={() => onConfirm(action)} disabled={isPending}>
          {isPending ? 'Salvando...' : 'Confirmar'}
        </Button>
      </Modal.Footer>
    </Modal>
  )
}
