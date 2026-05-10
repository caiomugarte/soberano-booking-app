import { type ReactNode, useEffect } from 'react'

interface ModalProps {
  open: boolean
  onClose: () => void
  children: ReactNode
  zIndex?: number
}

export function Modal({ open, onClose, children, zIndex }: ModalProps) {
  useEffect(() => {
    if (!open) return
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, [open, onClose])

  if (!open) return null

  return (
    <div className="fixed inset-0 flex items-center justify-center" style={{ zIndex: zIndex ?? 50 }}>
      <div className="fixed inset-0 bg-black/40" onClick={onClose} />
      <div className="relative z-10 max-h-[90vh] w-[calc(100%-2rem)] max-w-lg overflow-y-auto rounded-xl bg-white p-4 shadow-xl sm:p-6">
        {children}
      </div>
    </div>
  )
}

Modal.Header = function ModalHeader({ children }: { children: ReactNode }) {
  return <div className="mb-4 text-lg font-semibold text-gray-800">{children}</div>
}

Modal.Body = function ModalBody({ children }: { children: ReactNode }) {
  return <div className="space-y-4">{children}</div>
}

Modal.Footer = function ModalFooter({ children }: { children: ReactNode }) {
  return <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">{children}</div>
}
