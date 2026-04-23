export const TIME_SLOTS = [
  '08:00', '09:00', '10:00', '11:00', '12:00',
  '13:00', '14:00', '15:00', '16:00', '17:00',
] as const

export const SESSION_DURATION_MINUTES = 50

export const DAYS_OF_WEEK = [
  { key: 1, label: 'Segunda' },
  { key: 2, label: 'Terça' },
  { key: 3, label: 'Quarta' },
  { key: 4, label: 'Quinta' },
  { key: 5, label: 'Sexta' },
] as const

export const STATUS_LABELS: Record<string, string> = {
  scheduled: 'Agendado',
  confirmed: 'Confirmado',
  completed: 'Concluído',
  cancelled: 'Cancelado',
  no_show: 'Não compareceu',
}

export const PAYMENT_STATUS_LABELS: Record<string, string> = {
  pending: 'Pendente',
  paid: 'Pago',
}

export const SESSION_TYPE_LABELS: Record<string, string> = {
  individual: 'Individual',
  couple: 'Casal',
  family: 'Família',
}

export const DEFAULT_MESSAGE_TEMPLATE =
  'Olá {nome}, segue o valor referente à sessão do dia {data}: R$ {valor}. Chave PIX: {pix}. Obrigado!'
