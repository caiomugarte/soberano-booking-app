import { useEffect, useState, type FormEvent } from 'react'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Modal } from '@/components/ui/Modal'
import { Select } from '@/components/ui/Select'
import { Textarea } from '@/components/ui/Textarea'
import type { Absence } from '@/api/settings'

export type BlockAgendaDraft = {
  date: string
  startTime?: string
  endTime?: string
  absence?: Absence
}

interface BlockAgendaDialogProps {
  open: boolean
  draft: BlockAgendaDraft | null
  isSaving: boolean
  isDeleting: boolean
  error?: string
  onClose: () => void
  onCreate: (data: {
    date: string
    startTime?: string
    endTime?: string
    reason?: string
  }) => Promise<void> | void
  onDelete: (absenceId: string) => Promise<void> | void
}

function getAbsenceLabel(absence: Absence): string {
  if (!absence.startTime || !absence.endTime) {
    return 'Dia inteiro'
  }

  return `${absence.startTime} às ${absence.endTime}`
}

export function BlockAgendaDialog({
  open,
  draft,
  isSaving,
  isDeleting,
  error,
  onClose,
  onCreate,
  onDelete,
}: BlockAgendaDialogProps) {
  const [mode, setMode] = useState<'allday' | 'partial'>('partial')
  const [date, setDate] = useState('')
  const [startTime, setStartTime] = useState('')
  const [endTime, setEndTime] = useState('')
  const [reason, setReason] = useState('')

  useEffect(() => {
    if (!open || !draft) return

    const isAllDay = !draft.startTime || !draft.endTime
    setMode(isAllDay ? 'allday' : 'partial')
    setDate(draft.date)
    setStartTime(draft.startTime ?? '')
    setEndTime(draft.endTime ?? '')
    setReason(draft.absence?.reason ?? '')
  }, [draft, open])

  function handleSubmit(event: FormEvent) {
    event.preventDefault()

    void onCreate({
      date,
      startTime: mode === 'partial' ? startTime : undefined,
      endTime: mode === 'partial' ? endTime : undefined,
      reason: reason.trim() || undefined,
    })
  }

  const hasExistingAbsence = Boolean(draft?.absence)
  const isInvalidPartialRange = mode === 'partial' && (!startTime || !endTime || startTime >= endTime)

  return (
    <Modal open={open} onClose={onClose}>
      <Modal.Header>
        {hasExistingAbsence ? 'Bloqueio da agenda' : 'Bloquear agenda'}
      </Modal.Header>
      <form onSubmit={handleSubmit}>
        <Modal.Body>
          {error && (
            <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
              {error}
            </div>
          )}

          {hasExistingAbsence && draft?.absence ? (
            <div className="space-y-3 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
              <div className="font-medium">Este período já está bloqueado.</div>
              <div>
                {new Date(`${draft.absence.date.slice(0, 10)}T12:00:00`).toLocaleDateString('pt-BR')} •{' '}
                {getAbsenceLabel(draft.absence)}
              </div>
              {draft.absence.reason && (
                <p className="text-amber-800">{draft.absence.reason}</p>
              )}
            </div>
          ) : (
            <>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <Input
                  label="Data"
                  type="date"
                  value={date}
                  onChange={(event) => setDate(event.target.value)}
                  required
                />
                <Select
                  label="Tipo"
                  value={mode}
                  onChange={(event) => setMode(event.target.value as 'allday' | 'partial')}
                  options={[
                    { value: 'allday', label: 'Dia inteiro' },
                    { value: 'partial', label: 'Faixa de horário' },
                  ]}
                />
              </div>

              {mode === 'partial' && (
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <Input
                    label="De"
                    type="time"
                    value={startTime}
                    onChange={(event) => setStartTime(event.target.value)}
                    required
                  />
                  <Input
                    label="Até"
                    type="time"
                    value={endTime}
                    onChange={(event) => setEndTime(event.target.value)}
                    required
                  />
                </div>
              )}

              <Textarea
                label="Motivo"
                value={reason}
                onChange={(event) => setReason(event.target.value)}
                rows={3}
              />
            </>
          )}
        </Modal.Body>
        <Modal.Footer>
          {hasExistingAbsence && draft?.absence ? (
            <>
              <Button variant="ghost" type="button" onClick={onClose}>
                Fechar
              </Button>
              <Button
                variant="danger"
                type="button"
                onClick={() => void onDelete(draft.absence!.id)}
                disabled={isDeleting}
              >
                {isDeleting ? 'Removendo...' : 'Remover bloqueio'}
              </Button>
            </>
          ) : (
            <>
              <Button variant="ghost" type="button" onClick={onClose}>
                Continuar editando
              </Button>
              <Button
                type="submit"
                disabled={!date || isInvalidPartialRange || isSaving}
              >
                {isSaving ? 'Salvando...' : 'Confirmar bloqueio'}
              </Button>
            </>
          )}
        </Modal.Footer>
      </form>
    </Modal>
  )
}
