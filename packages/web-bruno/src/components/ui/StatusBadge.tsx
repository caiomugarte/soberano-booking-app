import { Badge } from './Badge'
import { STATUS_LABELS, PAYMENT_STATUS_LABELS } from '@/config/constants'
import type { AppointmentStatus, PaymentStatus } from '@/schemas/appointment.schema'

const statusVariants: Record<AppointmentStatus, 'blue' | 'emerald' | 'gray' | 'red' | 'amber'> = {
  scheduled: 'blue',
  confirmed: 'emerald',
  completed: 'gray',
  cancelled: 'red',
  no_show: 'amber',
}

const paymentVariants: Record<PaymentStatus, 'amber' | 'green'> = {
  pending: 'amber',
  paid: 'green',
}

interface StatusBadgeProps {
  status: AppointmentStatus
  className?: string
}

interface PaymentBadgeProps {
  status: PaymentStatus
  className?: string
}

export function AppointmentStatusBadge({ status, className = '' }: StatusBadgeProps) {
  return (
    <Badge variant={statusVariants[status]} className={className}>
      {STATUS_LABELS[status]}
    </Badge>
  )
}

export function PaymentStatusBadge({ status, className = '' }: PaymentBadgeProps) {
  return (
    <Badge variant={paymentVariants[status]} className={className}>
      {PAYMENT_STATUS_LABELS[status]}
    </Badge>
  )
}
