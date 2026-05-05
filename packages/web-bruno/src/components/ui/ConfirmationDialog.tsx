import { Button } from '@/components/ui/Button'
import { Modal } from '@/components/ui/Modal'

interface ConfirmationDialogProps {
  open: boolean
  onClose: () => void
  onConfirm: () => void
  title: string
  description: string
  confirmLabel?: string
  cancelLabel?: string
  isPending?: boolean
  error?: string | null
}

export function ConfirmationDialog({
  open,
  onClose,
  onConfirm,
  title,
  description,
  confirmLabel = 'Confirmar',
  cancelLabel = 'Cancelar',
  isPending = false,
  error,
}: ConfirmationDialogProps) {
  return (
    <Modal open={open} onClose={onClose} zIndex={60}>
      <Modal.Header>{title}</Modal.Header>
      <Modal.Body>
        <p className="text-sm text-gray-600">{description}</p>
        {error && (
          <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-600">
            {error}
          </div>
        )}
      </Modal.Body>
      <Modal.Footer>
        <Button variant="ghost" onClick={onClose} disabled={isPending}>
          {cancelLabel}
        </Button>
        <Button variant="danger" onClick={onConfirm} disabled={isPending}>
          {isPending ? 'Excluindo...' : confirmLabel}
        </Button>
      </Modal.Footer>
    </Modal>
  )
}
