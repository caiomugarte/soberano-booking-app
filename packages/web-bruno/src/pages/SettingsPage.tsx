import { useState, useEffect, type FormEvent } from 'react'
import {
  useProviderProfile,
  useUpdateProviderProfile,
  useShifts,
  useUpdateShifts,
  useAbsences,
  useCreateAbsence,
  useDeleteAbsence,
  type Shift,
} from '@/api/settings'
import { Panel } from '@/components/ui/Panel'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Select } from '@/components/ui/Select'
import { Textarea } from '@/components/ui/Textarea'
import { Spinner } from '@/components/ui/Spinner'
import { DAYS_OF_WEEK } from '@/config/constants'

export default function SettingsPage() {
  const { data: profile, isLoading: profileLoading } = useProviderProfile()
  const updateProfile = useUpdateProviderProfile()
  const { data: shiftsData, isLoading: shiftsLoading } = useShifts()
  const updateShifts = useUpdateShifts()
  const { data: absencesData, isLoading: absencesLoading } = useAbsences()
  const createAbsence = useCreateAbsence()
  const deleteAbsence = useDeleteAbsence()

  // Profile state
  const [phone, setPhone] = useState('')
  const [pixKey, setPixKey] = useState('')
  const [messageTemplate, setMessageTemplate] = useState('')
  const [profileSaved, setProfileSaved] = useState(false)

  // Shifts state (per day)
  const [localShifts, setLocalShifts] = useState<Pick<Shift, 'dayOfWeek' | 'startTime' | 'endTime'>[]>([])
  const [shiftsInitialized, setShiftsInitialized] = useState(false)
  const [newDay, setNewDay] = useState<number>(DAYS_OF_WEEK[0].key)
  const [newStart, setNewStart] = useState('09:00')
  const [newEnd, setNewEnd] = useState('18:00')

  // Absences state
  const [newAbsentDate, setNewAbsentDate] = useState('')
  const [newAbsentAllDay, setNewAbsentAllDay] = useState(true)
  const [newAbsentStart, setNewAbsentStart] = useState('')
  const [newAbsentEnd, setNewAbsentEnd] = useState('')

  useEffect(() => {
    if (!profile) return
    setPhone(profile.phone ?? '')
    setPixKey(profile.pixKey ?? '')
    setMessageTemplate(profile.messageTemplate ?? '')
  }, [profile])

  if (shiftsData && !shiftsInitialized) {
    setLocalShifts(shiftsData.shifts.map(({ dayOfWeek, startTime, endTime }) => ({ dayOfWeek, startTime, endTime })))
    setShiftsInitialized(true)
  }

  function handleProfileSubmit(e: FormEvent) {
    e.preventDefault()
    updateProfile.mutate(
      { phone: phone || null, pixKey, messageTemplate },
      {
        onSuccess: () => {
          setProfileSaved(true)
          setTimeout(() => setProfileSaved(false), 2000)
        },
      },
    )
  }

  function addShift() {
    if (newStart >= newEnd) return
    setLocalShifts((prev) => [...prev, { dayOfWeek: newDay, startTime: newStart, endTime: newEnd }])
  }

  function removeShift(index: number) {
    setLocalShifts((prev) => prev.filter((_, i) => i !== index))
  }

  function saveShifts() {
    updateShifts.mutate(localShifts)
  }

  function handleAddAbsence() {
    if (!newAbsentDate) return
    if (!newAbsentAllDay && (!newAbsentStart || !newAbsentEnd)) return
    createAbsence.mutate({
      date: newAbsentDate,
      startTime: newAbsentAllDay ? undefined : newAbsentStart,
      endTime: newAbsentAllDay ? undefined : newAbsentEnd,
    })
    setNewAbsentDate('')
    setNewAbsentStart('')
    setNewAbsentEnd('')
    setNewAbsentAllDay(true)
  }

  if (profileLoading) {
    return (
      <div className="flex justify-center py-12">
        <Spinner />
      </div>
    )
  }

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-xl font-bold text-gray-800">Configurações</h1>
      </div>

      <div className="space-y-6">
        {/* Profile */}
        <form onSubmit={handleProfileSubmit}>
          <Panel>
            <Panel.Header>Perfil</Panel.Header>
            <Panel.Body className="space-y-4">
              <Input
                label="Telefone"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="11999999999"
              />
              <Input
                label="Chave PIX"
                value={pixKey}
                onChange={(e) => setPixKey(e.target.value)}
                placeholder="CPF, email, telefone ou chave aleatória"
              />
              <Textarea
                label="Template da mensagem WhatsApp"
                value={messageTemplate}
                onChange={(e) => setMessageTemplate(e.target.value)}
                rows={4}
              />
              <p className="text-xs text-gray-400">
                Use as variáveis: {'{nome}'}, {'{data}'}, {'{valor}'}, {'{pix}'}
              </p>
              <div className="flex flex-col items-start gap-2 sm:flex-row sm:items-center">
                <Button type="submit" className="w-full sm:w-auto" disabled={updateProfile.isPending}>
                  Salvar Perfil
                </Button>
                {profileSaved && <span className="text-sm text-sage-600">Salvo!</span>}
              </div>
            </Panel.Body>
          </Panel>
        </form>

        {/* Working hours */}
        <Panel>
          <Panel.Header>Horário de Trabalho</Panel.Header>
          {shiftsLoading ? (
            <Panel.Body>
              <Spinner />
            </Panel.Body>
          ) : (
            <Panel.Body className="space-y-4">
              {localShifts.length > 0 ? (
                <div className="divide-y divide-gray-100">
                  {DAYS_OF_WEEK.flatMap(({ key, label }) =>
                    localShifts
                      .map((s, i) => ({ shift: s, index: i }))
                      .filter(({ shift }) => shift.dayOfWeek === key)
                      .map(({ shift, index }) => (
                        <div key={index} className="flex flex-col gap-2 py-2 text-sm sm:flex-row sm:items-center">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="w-16 text-gray-500">{label}</span>
                            <span className="font-mono text-gray-800">{shift.startTime}</span>
                            <span className="text-gray-400">até</span>
                            <span className="font-mono text-gray-800">{shift.endTime}</span>
                          </div>
                          <button
                            type="button"
                            onClick={() => removeShift(index)}
                            className="text-left text-xs text-red-400 hover:text-red-600 sm:ml-auto"
                          >
                            Remover
                          </button>
                        </div>
                      )),
                  )}
                </div>
              ) : (
                <p className="text-xs text-gray-400">Nenhum horário cadastrado.</p>
              )}
              <div className="space-y-3 rounded-lg border border-gray-200 p-3">
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                  <Select
                    label="Dia"
                    value={String(newDay)}
                    onChange={(e) => setNewDay(Number(e.target.value))}
                    options={DAYS_OF_WEEK.map((d) => ({ value: String(d.key), label: d.label }))}
                  />
                  <Input
                    label="Início"
                    type="time"
                    value={newStart}
                    onChange={(e) => setNewStart(e.target.value)}
                  />
                  <Input
                    label="Fim"
                    type="time"
                    value={newEnd}
                    onChange={(e) => setNewEnd(e.target.value)}
                  />
                </div>
                <Button
                  type="button"
                  variant="secondary"
                  className="w-full sm:w-auto"
                  onClick={addShift}
                  disabled={newStart >= newEnd}
                >
                  Adicionar turno
                </Button>
              </div>
              {updateShifts.isError && (
                <p className="text-sm text-red-500">{(updateShifts.error as Error).message}</p>
              )}
              {updateShifts.isSuccess && (
                <p className="text-sm text-sage-600">Salvo!</p>
              )}
              <Button type="button" className="w-full sm:w-auto" disabled={updateShifts.isPending} onClick={saveShifts}>
                Salvar Horários
              </Button>
            </Panel.Body>
          )}
        </Panel>

        {/* Absences */}
        <Panel>
          <Panel.Header>Dias Ausentes</Panel.Header>
          {absencesLoading ? (
            <Panel.Body>
              <Spinner />
            </Panel.Body>
          ) : (
            <Panel.Body className="space-y-3">
              {(absencesData?.absences ?? []).length > 0 && (
                <div className="space-y-2">
                  {[...(absencesData?.absences ?? [])]
                    .sort((a, b) => a.date.localeCompare(b.date))
                    .map((absence) => (
                      <div
                        key={absence.id}
                        className="flex flex-col gap-2 rounded-lg bg-gray-50 px-3 py-2 text-sm sm:flex-row sm:items-center sm:justify-between"
                      >
                        <span>
                          {new Date(absence.date.substring(0, 10) + 'T12:00:00').toLocaleDateString('pt-BR')}
                          {absence.startTime
                            ? ` — ${absence.startTime} às ${absence.endTime}`
                            : ' — Dia inteiro'}
                        </span>
                        <button
                          type="button"
                          onClick={() => deleteAbsence.mutate(absence.id)}
                          className="text-red-400 hover:text-red-600"
                          disabled={deleteAbsence.isPending}
                        >
                          Remover
                        </button>
                      </div>
                    ))}
                </div>
              )}
              <div className="space-y-3 rounded-lg border border-gray-200 p-3">
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <Input
                    label="Data"
                    type="date"
                    value={newAbsentDate}
                    onChange={(e) => setNewAbsentDate(e.target.value)}
                  />
                  <Select
                    label="Tipo"
                    value={newAbsentAllDay ? 'allday' : 'partial'}
                    onChange={(e) => setNewAbsentAllDay(e.target.value === 'allday')}
                    options={[
                      { value: 'allday', label: 'Dia inteiro' },
                      { value: 'partial', label: 'Parte do dia' },
                    ]}
                  />
                </div>
                {!newAbsentAllDay && (
                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                    <Input
                      label="Ausente de"
                      type="time"
                      value={newAbsentStart}
                      onChange={(e) => setNewAbsentStart(e.target.value)}
                    />
                    <Input
                      label="Até"
                      type="time"
                      value={newAbsentEnd}
                      onChange={(e) => setNewAbsentEnd(e.target.value)}
                    />
                  </div>
                )}
                <Button
                  type="button"
                  variant="secondary"
                  className="w-full sm:w-auto"
                  onClick={handleAddAbsence}
                  disabled={
                    !newAbsentDate ||
                    (!newAbsentAllDay && (!newAbsentStart || !newAbsentEnd)) ||
                    createAbsence.isPending
                  }
                >
                  Adicionar
                </Button>
              </div>
              <p className="text-xs text-gray-400">
                Feriados, férias ou folgas — esses horários ficam bloqueados na agenda.
              </p>
            </Panel.Body>
          )}
        </Panel>
      </div>
    </div>
  )
}
