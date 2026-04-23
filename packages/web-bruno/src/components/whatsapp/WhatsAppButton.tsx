import { useSendPaymentReminder } from '@/api/appointments'
import { Button } from '@/components/ui/Button'

interface WhatsAppButtonProps {
  appointmentId: string
  onError?: (message: string) => void
}

export function WhatsAppButton({ appointmentId, onError }: WhatsAppButtonProps) {
  const send = useSendPaymentReminder()

  function handleClick() {
    send.mutate(appointmentId, {
      onError: (error) => {
        const message = error instanceof Error ? error.message : 'Erro ao enviar mensagem'
        if (onError) {
          onError(message)
        }
      },
    })
  }

  return (
    <div className="flex flex-col gap-1">
      <Button
        variant="secondary"
        size="sm"
        onClick={handleClick}
        disabled={send.isPending || send.isSuccess}
      >
        {send.isPending ? 'Enviando...' : send.isSuccess ? 'Enviado!' : '📱 WhatsApp'}
      </Button>
      {send.isError && !onError && (
        <p className="text-xs text-red-500">
          {send.error instanceof Error ? send.error.message : 'Erro ao enviar mensagem'}
        </p>
      )}
    </div>
  )
}
