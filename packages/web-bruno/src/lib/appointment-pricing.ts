import type { Appointment, ProtocolStatus } from '@/schemas/appointment.schema'
import { formatCurrency } from './format'

export function isRevenueProtocolStatus(status: ProtocolStatus | undefined): boolean {
  return status !== undefined && status !== 'maintenance'
}

export function isRevenueProtocolLink(input: {
  protocolId?: string
  protocolStatus?: ProtocolStatus
  protocolLinkType?: Appointment['protocolLinkType']
}): boolean {
  if (!input.protocolId) return false

  if (input.protocolStatus !== undefined) {
    return isRevenueProtocolStatus(input.protocolStatus)
  }

  return input.protocolLinkType === 'protocol'
}

export function formatAppointmentCharge(appointment: Pick<Appointment, 'value' | 'protocolLinkType'>): string {
  return appointment.protocolLinkType === 'protocol'
    ? 'Coberta pelo protocolo'
    : formatCurrency(appointment.value)
}
