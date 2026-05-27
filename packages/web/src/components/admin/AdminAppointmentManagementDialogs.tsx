import { useState } from 'react';
import { Button } from '../ui/Button.tsx';
import { Spinner } from '../ui/Spinner.tsx';

interface AdminAppointmentCancelModalProps {
  onConfirm: (reason: string) => void;
  onClose: () => void;
  isPending: boolean;
}

export function AdminAppointmentCancelModal({
  onConfirm,
  onClose,
  isPending,
}: AdminAppointmentCancelModalProps) {
  const [reason, setReason] = useState('');

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div className="bg-dark-surface border border-dark-border rounded-2xl p-6 w-full max-w-sm">
        <h3 className="text-lg font-bold mb-1">Cancelar agendamento</h3>
        <p className="text-muted text-sm mb-4">O cliente receberá uma mensagem no WhatsApp com o motivo.</p>
        <textarea
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          placeholder="Motivo do cancelamento..."
          rows={3}
          className="w-full bg-dark border border-dark-border rounded-xl px-4 py-3 text-sm text-[#F0EDE8] placeholder-muted outline-none focus:border-gold resize-none mb-4"
        />
        <div className="flex gap-3">
          <button
            onClick={onClose}
            disabled={isPending}
            className="flex-1 py-2.5 rounded-xl border border-dark-border text-muted hover:text-[#F0EDE8] transition-colors text-sm cursor-pointer bg-transparent disabled:opacity-50"
          >
            Voltar
          </button>
          <Button
            onClick={() => onConfirm(reason)}
            disabled={!reason.trim()}
            loading={isPending}
            className="flex-1"
          >
            Confirmar cancelamento
          </Button>
        </div>
      </div>
    </div>
  );
}

interface AdminAppointmentConfirmModalProps {
  title: string;
  description: string;
  confirmLabel: string;
  onConfirm: () => void;
  onClose: () => void;
  isPending: boolean;
}

function AdminAppointmentConfirmModal({
  title,
  description,
  confirmLabel,
  onConfirm,
  onClose,
  isPending,
}: AdminAppointmentConfirmModalProps) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div className="bg-dark-surface border border-dark-border rounded-2xl p-6 w-full max-w-sm">
        <h3 className="text-lg font-bold mb-1">{title}</h3>
        <p className="text-muted text-sm mb-6">{description}</p>
        <div className="flex gap-3">
          <button
            onClick={onClose}
            disabled={isPending}
            className="flex-1 py-2.5 rounded-xl border border-dark-border text-muted hover:text-[#F0EDE8] transition-colors text-sm cursor-pointer bg-transparent disabled:opacity-50"
          >
            Voltar
          </button>
          <button
            onClick={onConfirm}
            disabled={isPending}
            className="flex-1 py-2.5 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 hover:bg-red-500/20 transition-colors text-sm font-medium cursor-pointer disabled:opacity-50"
          >
            {isPending ? <Spinner /> : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}

interface AdminAppointmentSimpleActionModalProps {
  onConfirm: () => void;
  onClose: () => void;
  isPending: boolean;
}

export function AdminAppointmentDeleteModal(props: AdminAppointmentSimpleActionModalProps) {
  return (
    <AdminAppointmentConfirmModal
      title="Apagar agendamento"
      description="Tem certeza que deseja apagar este agendamento? Esta ação não pode ser desfeita."
      confirmLabel="✕ Apagar"
      {...props}
    />
  );
}

export function AdminAppointmentNoShowModal(props: AdminAppointmentSimpleActionModalProps) {
  return (
    <AdminAppointmentConfirmModal
      title="Confirmar não comparecimento"
      description="Tem certeza que o cliente não compareceu? Esta ação não pode ser desfeita."
      confirmLabel="✗ Confirmar"
      {...props}
    />
  );
}
