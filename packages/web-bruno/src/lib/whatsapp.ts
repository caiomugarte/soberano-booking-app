import { formatCurrencyRaw, formatDate } from './format'

interface WhatsAppMessageParams {
  patientName: string
  phone: string
  date: string
  value: number
  pixKey: string
  template: string
}

export function buildWhatsAppMessage(params: WhatsAppMessageParams): string {
  return params.template
    .replace('{nome}', params.patientName)
    .replace('{data}', formatDate(params.date))
    .replace('{valor}', formatCurrencyRaw(params.value))
    .replace('{pix}', params.pixKey)
}

export function buildWhatsAppUrl(phone: string, message: string): string {
  const cleanPhone = phone.replace(/\D/g, '')
  const fullPhone = cleanPhone.startsWith('55') ? cleanPhone : `55${cleanPhone}`
  return `https://wa.me/${fullPhone}?text=${encodeURIComponent(message)}`
}
