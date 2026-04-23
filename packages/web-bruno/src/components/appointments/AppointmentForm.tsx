import { useState, useRef, useEffect, type FormEvent } from 'react'
import { Modal } from '@/components/ui/Modal'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Select } from '@/components/ui/Select'
import { Textarea } from '@/components/ui/Textarea'
import { usePatients, useCreatePatient } from '@/api/patients'
import {
  useCreateAppointment,
  useCreateRecurringAppointments,
  useCreateBatchAppointments,
} from '@/api/appointments'
import { useServices } from '@/api/settings'
import { TIME_SLOTS, SESSION_TYPE_LABELS } from '@/config/constants'
import type { SessionType } from '@/schemas/appointment.schema'

interface SlotEntry {
  id: string
  date: string
  time: string
}

interface AppointmentFormProps {
  open: boolean
  onClose: () => void
  defaultDate?: string
  defaultTime?: string
  defaultPatientId?: string
}

export function AppointmentForm({
  open,
  onClose,
  defaultDate,
  defaultTime,
  defaultPatientId,
}: AppointmentFormProps) {
  const { data: patients = [] } = usePatients()
  const { data: servicesData } = useServices()
  const createAppointment = useCreateAppointment()
  const createRecurring = useCreateRecurringAppointments()
  const createBatch = useCreateBatchAppointments()
  const createPatient = useCreatePatient()

  // --- Schedule mode ---
  const [mode, setMode] = useState<'session' | 'package'>('session')

  const [patientId, setPatientId] = useState(defaultPatientId ?? '')
  const [date, setDate] = useState(defaultDate ?? '')
  const [startTime, setStartTime] = useState(defaultTime ?? '')
  const [type, setType] = useState<SessionType>('individual')
  const [value, setValue] = useState('')
  const [notes, setNotes] = useState('')
  const [recurring, setRecurring] = useState(false)
  const [weeks, setWeeks] = useState('4')

  // --- Package multi-slot state ---
  const [slots, setSlots] = useState<SlotEntry[]>(
    defaultDate && defaultTime
      ? [{ id: crypto.randomUUID(), date: defaultDate, time: defaultTime }]
      : [],
  )
  const [newSlotDate, setNewSlotDate] = useState(defaultDate ?? '')
  const [newSlotTime, setNewSlotTime] = useState('')
  const [packageValue, setPackageValue] = useState('')

  // --- Inline patient creation state ---
  const [step, setStep] = useState<'appointment' | 'new-patient'>('appointment')
  const [newName, setNewName] = useState('')
  const [newPhone, setNewPhone] = useState('')
  const [newEmail, setNewEmail] = useState('')
  const [createError, setCreateError] = useState('')

  function handleTypeChange(newType: SessionType) {
    setType(newType)
    if (servicesData) {
      const service = servicesData.services.find((s) => s.slug === newType)
      setValue(String((service?.priceCents ?? 0) / 100))
    }
  }

  function handleAddSlot() {
    if (!newSlotDate || !newSlotTime) return
    const exists = slots.some((s) => s.date === newSlotDate && s.time === newSlotTime)
    if (exists) return
    setSlots([...slots, { id: crypto.randomUUID(), date: newSlotDate, time: newSlotTime }])
    setNewSlotTime('')
  }

  function handleRemoveSlot(id: string) {
    setSlots(slots.filter((s) => s.id !== id))
  }

  function handleCreatePatient(e: FormEvent) {
    e.preventDefault()
    setCreateError('')
    const data = {
      name: newName,
      phone: newPhone || undefined,
      email: newEmail || undefined,
    }
    createPatient.mutate(data, {
      onSuccess: (created) => {
        setPatientId(created.id)
        setStep('appointment')
      },
      onError: (error) => {
        console.error('[AppointmentForm] Failed to create patient:', error)
        setCreateError(error instanceof Error ? error.message : 'Erro ao criar paciente')
      },
    })
  }

  function handleSubmit(e: FormEvent) {
    e.preventDefault()

    if (mode === 'package') {
      if (slots.length === 0) return
      const items = slots.map((slot) => ({
        patientId,
        date: slot.date,
        startTime: slot.time,
        type,
        status: 'scheduled' as const,
        value: 0,
        paymentStatus: 'paid' as const,
        notes: notes || undefined,
      }))
      createBatch.mutate(items, { onSuccess: onClose })
    } else {
      const baseData = {
        patientId,
        startTime,
        type,
        status: 'scheduled' as const,
        value: Math.round(parseFloat(value || '0') * 100),
        paymentStatus: 'pending' as const,
        notes: notes || undefined,
      }

      if (recurring) {
        createRecurring.mutate(
          { baseData, startDate: date, weeks: parseInt(weeks) },
          { onSuccess: onClose },
        )
      } else {
        createAppointment.mutate({ ...baseData, date }, { onSuccess: onClose })
      }
    }
  }

  const timeOptions = TIME_SLOTS.map((t) => ({ value: t, label: t }))
  const typeOptions = Object.entries(SESSION_TYPE_LABELS).map(([v, l]) => ({
    value: v,
    label: l,
  }))
  // --- Patient search ---
  const [patientSearch, setPatientSearch] = useState('')
  const [patientDropdownOpen, setPatientDropdownOpen] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setPatientDropdownOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const selectedPatient = patients.find((p) => p.id === patientId)
  const filteredPatients = patientSearch
    ? patients.filter((p) => p.name.toLowerCase().includes(patientSearch.toLowerCase()))
    : patients

  // ---- New Patient Step ----
  if (step === 'new-patient') {
    return (
      <Modal open={open} onClose={() => setStep('appointment')}>
        <Modal.Header>Novo Paciente</Modal.Header>
        <form onSubmit={handleCreatePatient}>
          <Modal.Body>
            {createError && (
              <div className="rounded-lg bg-red-50 p-3 text-sm text-red-600">{createError}</div>
            )}
            <Input label="Nome" value={newName} onChange={(e) => setNewName(e.target.value)} required />
            <Input
              label="Telefone"
              value={newPhone}
              onChange={(e) => setNewPhone(e.target.value)}
              placeholder="67999999999"
            />
            <Input
              label="Email"
              type="email"
              value={newEmail}
              onChange={(e) => setNewEmail(e.target.value)}
            />
          </Modal.Body>
          <Modal.Footer>
            <Button variant="ghost" type="button" onClick={() => setStep('appointment')}>
              Voltar
            </Button>
            <Button type="submit" disabled={createPatient.isPending}>
              {createPatient.isPending ? 'Criando...' : 'Criar Paciente'}
            </Button>
          </Modal.Footer>
        </form>
      </Modal>
    )
  }

  // ---- Appointment Step ----
  return (
    <Modal open={open} onClose={onClose}>
      <Modal.Header>Novo Agendamento</Modal.Header>
      <form onSubmit={handleSubmit}>
        <Modal.Body>
          {/* Mode toggle */}
          <div className="flex gap-2 rounded-lg bg-gray-100 p-1">
            <button
              type="button"
              onClick={() => setMode('session')}
              className={`flex-1 rounded-md px-3 py-2 text-sm font-medium transition-colors ${
                mode === 'session'
                  ? 'bg-white text-gray-800 shadow-sm'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              Sessão avulsa
            </button>
            <button
              type="button"
              onClick={() => setMode('package')}
              className={`flex-1 rounded-md px-3 py-2 text-sm font-medium transition-colors ${
                mode === 'package'
                  ? 'bg-white text-gray-800 shadow-sm'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              Pacote
            </button>
          </div>

          {/* Patient searchable picker */}
          <div className="space-y-1">
            <label className="text-sm font-medium text-gray-700">Paciente</label>
            <div className="flex gap-2">
              <div className="relative flex-1" ref={dropdownRef}>
                <input
                  type="text"
                  value={patientDropdownOpen ? patientSearch : (selectedPatient?.name ?? '')}
                  onChange={(e) => {
                    setPatientSearch(e.target.value)
                    setPatientDropdownOpen(true)
                    if (patientId) setPatientId('')
                  }}
                  onFocus={() => {
                    setPatientDropdownOpen(true)
                    setPatientSearch('')
                  }}
                  placeholder="Buscar paciente..."
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-primary-300 focus:outline-none focus:ring-2 focus:ring-primary-100"
                />
                <input type="hidden" value={patientId} required />
                {patientId && !patientDropdownOpen && (
                  <button
                    type="button"
                    onClick={() => {
                      setPatientId('')
                      setPatientSearch('')
                      setPatientDropdownOpen(true)
                    }}
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  >
                    ✕
                  </button>
                )}
                {patientDropdownOpen && (
                  <div className="absolute z-10 mt-1 max-h-48 w-full overflow-y-auto rounded-lg border border-gray-200 bg-white shadow-lg">
                    {filteredPatients.length === 0 ? (
                      <div className="px-3 py-2 text-sm text-gray-400">Nenhum paciente encontrado</div>
                    ) : (
                      filteredPatients.map((p) => (
                        <button
                          key={p.id}
                          type="button"
                          onClick={() => {
                            setPatientId(p.id)
                            setPatientSearch('')
                            setPatientDropdownOpen(false)
                          }}
                          className={`w-full px-3 py-2 text-left text-sm hover:bg-primary-50 ${
                            p.id === patientId ? 'bg-primary-50 text-primary-700 font-medium' : 'text-gray-700'
                          }`}
                        >
                          {p.name}
                        </button>
                      ))
                    )}
                  </div>
                )}
              </div>
              <button
                type="button"
                onClick={() => setStep('new-patient')}
                className="shrink-0 rounded-lg border border-dashed border-gray-300 px-3 py-2 text-sm text-gray-500 transition-colors hover:border-primary-300 hover:text-primary-600"
                title="Novo Paciente"
              >
                + Novo
              </button>
            </div>
          </div>

          <Select
            label="Tipo de Sessão"
            value={type}
            onChange={(e) => handleTypeChange(e.target.value as SessionType)}
            options={typeOptions}
          />

          {mode === 'package' ? (
            <>
              {/* Package value */}
              <Input
                label="Valor do Pacote (R$)"
                type="number"
                step="0.01"
                value={packageValue}
                onChange={(e) => setPackageValue(e.target.value)}
              />

              {/* Multi-slot picker */}
              <div className="space-y-3">
                <label className="text-sm font-medium text-gray-700">Sessões do pacote</label>

                {slots.length > 0 && (
                  <div className="space-y-2">
                    {slots
                      .sort((a, b) => a.date.localeCompare(b.date) || a.time.localeCompare(b.time))
                      .map((slot) => (
                        <div
                          key={slot.id}
                          className="flex items-center gap-2 rounded-lg bg-gray-50 px-3 py-2 text-sm"
                        >
                          <span className="flex-1">
                            {new Date(slot.date + 'T12:00:00').toLocaleDateString('pt-BR')} às{' '}
                            {slot.time}
                          </span>
                          <button
                            type="button"
                            onClick={() => handleRemoveSlot(slot.id)}
                            className="text-red-400 hover:text-red-600"
                          >
                            ✕
                          </button>
                        </div>
                      ))}
                  </div>
                )}

                <div className="flex items-end gap-2">
                  <Input
                    label="Data"
                    type="date"
                    value={newSlotDate}
                    onChange={(e) => setNewSlotDate(e.target.value)}
                    className="flex-1"
                  />
                  <Select
                    label="Horário"
                    value={newSlotTime}
                    onChange={(e) => setNewSlotTime(e.target.value)}
                    options={timeOptions}
                    placeholder="Horário"
                    className="flex-1"
                  />
                  <Button
                    type="button"
                    variant="secondary"
                    onClick={handleAddSlot}
                    disabled={!newSlotDate || !newSlotTime}
                  >
                    +
                  </Button>
                </div>
              </div>
            </>
          ) : (
            <>
              {/* Single session */}
              <Input
                label="Data"
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                required
              />
              <Select
                label="Horário"
                value={startTime}
                onChange={(e) => setStartTime(e.target.value)}
                options={timeOptions}
                placeholder="Selecione o horário"
                required
              />
              <Input
                label="Valor (R$)"
                type="number"
                step="0.01"
                value={value}
                onChange={(e) => setValue(e.target.value)}
                required
              />
              <div className="flex items-center gap-3">
                <label className="flex items-center gap-2 text-sm text-gray-700">
                  <input
                    type="checkbox"
                    checked={recurring}
                    onChange={(e) => setRecurring(e.target.checked)}
                    className="rounded border-gray-300 text-primary-500 focus:ring-primary-300"
                  />
                  Repetir semanalmente
                </label>
                {recurring && (
                  <Input
                    type="number"
                    min="2"
                    max="52"
                    value={weeks}
                    onChange={(e) => setWeeks(e.target.value)}
                    className="w-20"
                  />
                )}
                {recurring && <span className="text-xs text-gray-400">semanas</span>}
              </div>
            </>
          )}

          <Textarea label="Notas" value={notes} onChange={(e) => setNotes(e.target.value)} />
        </Modal.Body>
        <Modal.Footer>
          <Button variant="ghost" type="button" onClick={onClose}>
            Cancelar
          </Button>
          <Button
            type="submit"
            disabled={mode === 'package' && slots.length === 0}
          >
            {mode === 'package'
              ? `Criar ${slots.length} ${slots.length === 1 ? 'sessão' : 'sessões'}`
              : recurring
                ? `Criar ${weeks} sessões`
                : 'Criar Sessão'}
          </Button>
        </Modal.Footer>
      </form>
    </Modal>
  )
}
