import type { Appointment } from '@/schemas/appointment.schema'
import type { Patient } from '@/schemas/patient.schema'
import { SESSION_TYPE_LABELS } from '@/config/constants'
import { AppointmentStatusBadge, PaymentStatusBadge } from '@/components/ui/StatusBadge'

interface TimeSlotProps {
  time: string
  appointment?: Appointment
  patient?: Patient
  onClick: () => void
  className?: string
  showEmptyLabel?: boolean
  compact?: boolean
}

const statusBorder: Record<string, string> = {
  scheduled: 'border-l-blue-400',
  confirmed: 'border-l-emerald-400',
  completed: 'border-l-slate-400',
  cancelled: 'border-l-red-300',
  no_show: 'border-l-amber-400',
}

const statusBg: Record<string, string> = {
  scheduled: 'bg-blue-50/50',
  confirmed: 'bg-emerald-50/50',
  completed: 'bg-slate-50/50',
  cancelled: 'bg-red-50/30',
  no_show: 'bg-amber-50/50',
}

const sessionTypeDot: Record<Appointment['type'], string> = {
  psychotherapy: 'bg-sky-500',
  neuromodulation: 'bg-rose-500',
}

export function TimeSlot({
  time,
  appointment,
  patient,
  onClick,
  className = '',
  showEmptyLabel = false,
  compact = false,
}: TimeSlotProps) {
  if (!appointment) {
    return (
      <button
        onClick={onClick}
        className={`group flex h-full min-h-[60px] w-full items-center justify-center rounded border border-dashed border-gray-200 text-xs text-gray-300 transition-colors hover:border-primary-300 hover:bg-primary-50/50 hover:text-primary-400 ${className}`}
      >
        <span className={showEmptyLabel ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'}>
          {showEmptyLabel ? '+ Criar sessão' : `+ ${time}`}
        </span>
      </button>
    )
  }

  return (
    <button
      onClick={onClick}
      className={`flex h-full min-h-[60px] w-full flex-col items-start rounded border-l-3 p-2 text-left transition-shadow hover:shadow-md ${statusBorder[appointment.status]} ${statusBg[appointment.status]} ${appointment.status === 'cancelled' ? 'opacity-60' : ''} ${compact ? 'gap-0.5 overflow-hidden' : 'gap-1'} ${className}`}
    >
      <div className="flex w-full items-center justify-between gap-2">
        <span className="text-xs font-medium text-gray-800 truncate">
          {patient?.name ?? 'Paciente'}
        </span>
        {compact && appointment.recurringSeriesId ? (
          <span className="shrink-0 rounded-full bg-primary-100 px-1.5 py-0.5 text-[10px] font-medium text-primary-700">
            Rec.
          </span>
        ) : null}
      </div>
      <span className="text-[10px] font-medium text-gray-500">
        {appointment.startTime} - {appointment.endTime}
      </span>
      {compact ? (
        <div className="mt-auto flex w-full flex-wrap items-center gap-1 overflow-hidden">
          <AppointmentStatusBadge status={appointment.status} />
          <PaymentStatusBadge status={appointment.paymentStatus} />
        </div>
      ) : (
        <>
          {appointment.recurringSeriesId && (
            <span className="rounded-full bg-primary-100 px-1.5 py-0.5 text-[10px] font-medium text-primary-700">
              Recorrente
            </span>
          )}
          <div className="flex flex-wrap items-center gap-1.5">
            <AppointmentStatusBadge status={appointment.status} />
            <PaymentStatusBadge status={appointment.paymentStatus} />
          </div>
          <span className="mt-0.5 inline-flex items-center gap-1.5 rounded-full border border-gray-200 bg-white/80 px-2 py-0.5 text-[10px] font-medium text-gray-600">
            <span
              aria-hidden="true"
              className={`h-2 w-2 rounded-full ${sessionTypeDot[appointment.type]}`}
            />
            {SESSION_TYPE_LABELS[appointment.type]}
          </span>
        </>
      )}
    </button>
  )
}
