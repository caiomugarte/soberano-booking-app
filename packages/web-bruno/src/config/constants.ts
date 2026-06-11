import {
  DEFAULT_PROVIDER_WORKSPACE,
  buildWorkspaceHourRows,
  getWorkspaceDays,
} from '@/lib/calendar-workspace'

export const TIME_SLOTS = buildWorkspaceHourRows(DEFAULT_PROVIDER_WORKSPACE)

export const SESSION_DURATION_MINUTES = DEFAULT_PROVIDER_WORKSPACE.defaultSessionDurationMinutes

export const DAYS_OF_WEEK = getWorkspaceDays().map((day) => ({
  key: day.key,
  label: day.label,
}))

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

export const PROTOCOL_PAYMENT_STATUS_LABELS: Record<string, string> = {
  pending: 'Pendente',
  partial: 'Parcial',
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
