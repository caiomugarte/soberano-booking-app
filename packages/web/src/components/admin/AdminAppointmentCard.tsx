import { type AdminAppointment, useUpdateAppointmentStatus } from '../../api/use-admin.ts';
import { formatCurrency } from '../../lib/format.ts';

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

interface AdminAppointmentCardProps {
  appointment: AdminAppointment;
  timePassed: boolean;
  onCancelClick: (id: string) => void;
  onNoShowClick: (id: string) => void;
  onDeleteClick: (id: string) => void;
  onEditClick: (appointment: AdminAppointment) => void;
}

export function AdminAppointmentCard({
  appointment,
  timePassed,
  onCancelClick,
  onNoShowClick,
  onDeleteClick,
  onEditClick,
}: AdminAppointmentCardProps) {
  const updateStatus = useUpdateAppointmentStatus();
  const isConfirmed = appointment.status === 'confirmed';
  const isCompleted = appointment.status === 'completed';
  const isNoShow = appointment.status === 'no_show';

  return (
    <div className={`bg-dark-surface border rounded-xl p-5 transition-opacity ${appointment.status === 'cancelled' ? 'opacity-50' : ''} border-dark-border`}>
      <div className="flex items-start justify-between gap-4 mb-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xl">{appointment.service.icon}</span>
            <span className="font-bold text-sm">{appointment.service.name}</span>
            <span className={`text-xs font-medium px-2 py-0.5 rounded-full border ${STATUS_COLOR[appointment.status]}`}>
              {STATUS_LABEL[appointment.status] ?? appointment.status}
            </span>
          </div>
          {appointment.package && (
            <p className="text-xs text-gold/70 mt-0.5">
              Pacote · {appointment.package.appointmentNumber}/{appointment.package.totalUses} · {formatCurrency(appointment.package.totalPriceCents)}
            </p>
          )}
          <p className="text-muted text-sm">{appointment.customer.name}</p>
          {appointment.customer.phone && <p className="text-muted text-xs">+55 {appointment.customer.phone}</p>}
        </div>
        <div className="text-right shrink-0">
          <p className="text-gold text-lg font-bold">{appointment.startTime}</p>
          <p className="text-muted text-xs">até {appointment.endTime}</p>
          <p className="text-sm font-medium mt-1">{formatCurrency(appointment.priceCents)}</p>
        </div>
      </div>

      {isConfirmed && (
        <div className="flex gap-1.5 mb-1.5">
          <button
            onClick={() => onEditClick(appointment)}
            className="flex-1 py-2 rounded-lg bg-dark-surface2 border border-dark-border text-muted hover:text-[#F0EDE8] hover:border-gold/40 transition-colors cursor-pointer text-xs font-medium"
          >
            ✎ Editar cliente
          </button>
        </div>
      )}
      {isConfirmed && (
        <div className="flex gap-1.5">
          <button
            onClick={() => updateStatus.mutate({ id: appointment.id, status: 'completed', packageId: appointment.packageId })}
            disabled={updateStatus.isPending || !timePassed}
            className="flex-1 py-2 rounded-lg bg-green-500/10 border border-green-500/30 text-green-400 hover:bg-green-500/20 transition-colors cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed text-xs font-medium"
          >
            ✓ Concluído
          </button>
          <button
            onClick={() => onNoShowClick(appointment.id)}
            disabled={updateStatus.isPending || !timePassed}
            className="flex-1 py-2 rounded-lg bg-red-500/10 border border-red-500/30 text-red-400 hover:bg-red-500/20 transition-colors cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed text-xs font-medium"
          >
            ✗ Não veio
          </button>
          {!timePassed && (
            <button
              onClick={() => onCancelClick(appointment.id)}
              disabled={updateStatus.isPending}
              className="flex-1 py-2 rounded-lg bg-orange-500/10 border border-orange-500/30 text-orange-400 hover:bg-orange-500/20 transition-colors cursor-pointer disabled:opacity-50 text-xs font-medium"
            >
              ✕ Cancelar
            </button>
          )}
          {timePassed && (
            <button
              onClick={() => onDeleteClick(appointment.id)}
              className="py-2 px-3 rounded-lg bg-red-500/10 border border-red-500/30 text-red-400 hover:bg-red-500/20 transition-colors cursor-pointer text-xs font-medium"
            >
              ✕ Apagar
            </button>
          )}
        </div>
      )}

      {(isCompleted || isNoShow) && (
        <div className="flex gap-1.5">
          <span className="text-xs text-muted self-center mr-1">Corrigir:</span>
          {isCompleted && (
            <button
              onClick={() => updateStatus.mutate({ id: appointment.id, status: 'no_show', packageId: appointment.packageId })}
              disabled={updateStatus.isPending}
              className="py-1.5 px-3 rounded-lg bg-red-500/10 border border-red-500/30 text-red-400 hover:bg-red-500/20 transition-colors cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed text-xs font-medium"
            >
              ✗ Não veio
            </button>
          )}
          {isNoShow && (
            <button
              onClick={() => updateStatus.mutate({ id: appointment.id, status: 'completed', packageId: appointment.packageId })}
              disabled={updateStatus.isPending}
              className="py-1.5 px-3 rounded-lg bg-green-500/10 border border-green-500/30 text-green-400 hover:bg-green-500/20 transition-colors cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed text-xs font-medium"
            >
              ✓ Concluído
            </button>
          )}
          <button
            onClick={() => onDeleteClick(appointment.id)}
            className="py-1.5 px-3 rounded-lg bg-red-500/10 border border-red-500/30 text-red-400 hover:bg-red-500/20 transition-colors cursor-pointer text-xs font-medium"
          >
            ✕ Apagar
          </button>
        </div>
      )}
    </div>
  );
}
