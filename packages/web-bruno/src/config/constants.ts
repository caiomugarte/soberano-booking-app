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
  { key: 6, label: 'Sábado' },
] as const

export const STATUS_LABELS: Record<string, string> = {
  scheduled: 'Agendado',
  confirmed: 'Confirmado',
  completed: 'Realizado',
  cancelled: 'Desmarcado',
  no_show: 'Falta',
}

export const PAYMENT_STATUS_LABELS: Record<string, string> = {
  pending: 'Pendente',
  paid: 'Pago',
}

export const PAYMENT_METHOD_LABELS: Record<string, string> = {
  card: 'Cartão',
  pix: 'PIX',
  cash: 'Dinheiro',
}

export const SESSION_TYPE_LABELS: Record<string, string> = {
  psychotherapy: 'Psicoterapia',
  neuromodulation: 'Neuromodulação',
}

export const CARE_SUMMARY_LABELS: Record<string, string> = {
  psychotherapy: 'Psicoterapia',
  neuromodulation: 'Neuromodulação',
  dual_track: 'Psicoterapia + Neuromodulação',
}

export const FREQUENCY_LABELS: Record<string, string> = {
  weekly: 'Semanal',
  biweekly: 'Quinzenal',
}

export const PARENTS_MEETING_STATUS_LABELS: Record<string, string> = {
  pending: 'Pendente',
  completed: 'Concluída',
}

export const PROTOCOL_STATUS_LABELS: Record<string, string> = {
  active: 'Ativo',
  maintenance: 'Manutenção',
  finished: 'Finalizado',
}

export const PROTOCOL_LINK_TYPE_LABELS: Record<string, string> = {
  standalone: 'Sessão avulsa',
  protocol: 'Vinculada ao protocolo',
  maintenance: 'Manutenção',
}

export const DEFAULT_MESSAGE_TEMPLATE =
  'Olá {nome}, segue o valor referente à sessão do dia {data}: R$ {valor}. Chave PIX: {pix}. Obrigado!'
