import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAdminAppointments, useUpdateAppointmentStatus, useAdminCancelAppointment, type AdminAppointment } from '../../api/use-admin.ts';
import { useAuthStore } from '../../stores/auth.store.ts';
import { Button } from '../../components/ui/Button.tsx';
import { Spinner } from '../../components/ui/Spinner.tsx';
import { formatCurrency, dateToString } from '../../lib/format.ts';

const STATUS_LABEL: Record<string, string> = {
  confirmed: 'Confirmado',
  completed: 'Concluído',
  no_show: 'Não compareceu',
  cancelled: 'Cancelado',
};

const STATUS_COLOR: Record<string, string> = {
  confirmed: 'text-gold border-gold/30 bg-gold/10',
  completed: 'text-green-400 border-green-400/30 bg-green-400/10',
  no_show: 'text-red-400 border-red-400/30 bg-red-400/10',
  cancelled: 'text-muted border-dark-border bg-dark-surface2',
};

function AppointmentCard({
  appointment,
  onCancelClick,
}: {
  appointment: AdminAppointment;
  onCancelClick: (id: string) => void;
}) {
  const updateStatus = useUpdateAppointmentStatus();
  const isActive = appointment.status === 'confirmed';

  return (
    <div className={`bg-dark-surface border rounded-xl p-5 transition-opacity ${appointment.status === 'cancelled' ? 'opacity-50' : ''} border-dark-border`}>
      <div className="flex items-start justify-between gap-4 mb-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xl">{appointment.service.icon}</span>
            <span className="font-serif font-bold text-base">{appointment.service.name}</span>
          </div>
          <p className="text-muted text-sm">{appointment.customer.name}</p>
          <p className="text-muted text-xs">+55 {appointment.customer.phone}</p>
        </div>
        <div className="text-right shrink-0">
          <p className="font-serif text-gold text-lg font-bold">{appointment.startTime}</p>
          <p className="text-muted text-xs">até {appointment.endTime}</p>
          <p className="text-sm font-medium mt-1">{formatCurrency(appointment.priceCents)}</p>
        </div>
      </div>

      <div className="flex items-center justify-between gap-3">
        <span className={`text-xs font-medium px-2.5 py-1 rounded-full border ${STATUS_COLOR[appointment.status]}`}>
          {STATUS_LABEL[appointment.status] ?? appointment.status}
        </span>

        {isActive && (
          <div className="flex gap-2">
            <button
              onClick={() => updateStatus.mutate({ id: appointment.id, status: 'completed' })}
              disabled={updateStatus.isPending}
              className="text-xs px-3 py-1.5 rounded-lg bg-green-500/10 border border-green-500/30 text-green-400 hover:bg-green-500/20 transition-colors cursor-pointer disabled:opacity-50"
            >
              ✓ Concluído
            </button>
            <button
              onClick={() => updateStatus.mutate({ id: appointment.id, status: 'no_show' })}
              disabled={updateStatus.isPending}
              className="text-xs px-3 py-1.5 rounded-lg bg-red-500/10 border border-red-500/30 text-red-400 hover:bg-red-500/20 transition-colors cursor-pointer disabled:opacity-50"
            >
              ✗ Não veio
            </button>
            <button
              onClick={() => onCancelClick(appointment.id)}
              disabled={updateStatus.isPending}
              className="text-xs px-3 py-1.5 rounded-lg bg-orange-500/10 border border-orange-500/30 text-orange-400 hover:bg-orange-500/20 transition-colors cursor-pointer disabled:opacity-50"
            >
              Cancelar
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

function CancelModal({
  onConfirm,
  onClose,
  isPending,
}: {
  onConfirm: (reason: string) => void;
  onClose: () => void;
  isPending: boolean;
}) {
  const [reason, setReason] = useState('');
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div className="bg-dark-surface border border-dark-border rounded-2xl p-6 w-full max-w-sm">
        <h3 className="font-serif text-lg font-bold mb-1">Cancelar agendamento</h3>
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

export default function DashboardPage() {
  const today = dateToString(new Date());
  const [date, setDate] = useState(today);
  const [cancelId, setCancelId] = useState<string | null>(null);
  const logout = useAuthStore((s) => s.logout);
  const navigate = useNavigate();
  const { data: appointments, isLoading, refetch } = useAdminAppointments(date);
  const cancelAppointment = useAdminCancelAppointment();

  async function handleLogout() {
    await logout();
    navigate('/admin/login');
  }

  function handleCancelConfirm(reason: string) {
    if (!cancelId) return;
    cancelAppointment.mutate({ id: cancelId, reason }, {
      onSuccess: () => setCancelId(null),
    });
  }

  const confirmed = appointments?.filter((a) => a.status === 'confirmed') ?? [];
  const done = appointments?.filter((a) => a.status !== 'confirmed') ?? [];

  return (
    <div className="relative z-10 max-w-[680px] mx-auto px-5 py-8 pb-20">
      {cancelId && (
        <CancelModal
          onConfirm={handleCancelConfirm}
          onClose={() => setCancelId(null)}
          isPending={cancelAppointment.isPending}
        />
      )}
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-2.5">
          <img src="/logo.png" alt="Soberano Barbearia" className="w-8 h-8 object-contain" />
          <span className="font-serif text-sm tracking-widest uppercase text-gold">Soberano</span>
        </div>
        <div className="flex items-center gap-4">
          <button
            onClick={() => navigate('/admin/schedule')}
            className="text-xs text-muted hover:text-[#F0EDE8] transition-colors cursor-pointer bg-transparent border-none"
          >
            Agenda
          </button>
          <button
            onClick={handleLogout}
            className="text-xs text-muted hover:text-[#F0EDE8] transition-colors cursor-pointer bg-transparent border-none"
          >
            Sair
          </button>
        </div>
      </div>

      {/* Date picker */}
      <div className="flex items-center gap-3 mb-6">
        <input
          type="date"
          value={date}
          onChange={(e) => setDate(e.target.value)}
          className="bg-dark-surface2 border border-dark-border rounded-xl px-4 py-2.5 text-sm text-[#F0EDE8] outline-none focus:border-gold transition-colors"
        />
        <button
          onClick={() => setDate(today)}
          className={`text-xs px-3 py-2.5 rounded-xl border transition-colors cursor-pointer ${date === today ? 'border-gold text-gold bg-gold/10' : 'border-dark-border text-muted hover:border-gold/40'}`}
        >
          Hoje
        </button>
        <button
          onClick={() => refetch()}
          className="text-xs text-muted hover:text-[#F0EDE8] transition-colors ml-auto cursor-pointer bg-transparent border-none"
        >
          ↻ Atualizar
        </button>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-20 gap-3 text-muted">
          <Spinner /> Carregando...
        </div>
      ) : !appointments?.length ? (
        <div className="text-center py-20">
          <p className="text-muted text-lg">Sem agendamentos neste dia.</p>
        </div>
      ) : (
        <>
          {/* Summary */}
          <div className="grid grid-cols-3 gap-3 mb-6">
            {[
              { label: 'Agendados', value: confirmed.length, color: 'text-gold' },
              { label: 'Concluídos', value: appointments.filter((a) => a.status === 'completed').length, color: 'text-green-400' },
              {
                label: 'Faturamento',
                value: formatCurrency(
                  appointments
                    .filter((a) => a.status === 'completed')
                    .reduce((sum, a) => sum + a.priceCents, 0)
                ),
                color: 'text-gold',
              },
            ].map(({ label, value, color }) => (
              <div key={label} className="bg-dark-surface border border-dark-border rounded-xl p-4 text-center">
                <p className={`font-serif text-xl font-bold ${color}`}>{value}</p>
                <p className="text-muted text-xs mt-1">{label}</p>
              </div>
            ))}
          </div>

          {/* Upcoming */}
          {confirmed.length > 0 && (
            <section className="mb-6">
              <h2 className="text-xs tracking-widest uppercase text-muted mb-3">Próximos</h2>
              <div className="flex flex-col gap-3">
                {confirmed.map((a) => <AppointmentCard key={a.id} appointment={a} onCancelClick={setCancelId} />)}
              </div>
            </section>
          )}

          {/* Done */}
          {done.length > 0 && (
            <section>
              <h2 className="text-xs tracking-widest uppercase text-muted mb-3">Concluídos / Outros</h2>
              <div className="flex flex-col gap-3">
                {done.map((a) => <AppointmentCard key={a.id} appointment={a} onCancelClick={setCancelId} />)}
              </div>
            </section>
          )}
        </>
      )}
    </div>
  );
}
