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

export function AppointmentStatusBadge({ status }: { status: AppointmentStatus }) {
  return <Badge variant={statusVariants[status]}>{STATUS_LABELS[status]}</Badge>
}

export function PaymentStatusBadge({ status }: { status: PaymentStatus }) {
  return <Badge variant={paymentVariants[status]}>{PAYMENT_STATUS_LABELS[status]}</Badge>
}
