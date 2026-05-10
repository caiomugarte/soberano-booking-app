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
  useUpdateAppointment,
} from '@/api/appointments'
import { useServices } from '@/api/settings'
import {
  PAYMENT_METHOD_LABELS,
  PAYMENT_STATUS_LABELS,
  SESSION_TYPE_LABELS,
  STATUS_LABELS,
  TIME_SLOTS,
} from '@/config/constants'
import { dateInputToIso, getTodayDateInputValue, toDateInputValue } from '@/lib/format'
import type {
  Appointment,
  PaymentMethod,
  PaymentStatus,
  SessionType,
  AppointmentStatus,
} from '@/schemas/appointment.schema'

interface SlotEntry {
  id: string
  date: string
  time: string
}

function splitPackageValue(totalCents: number, slotCount: number): number[] {
  const baseValue = Math.floor(totalCents / slotCount)
  const remainder = totalCents % slotCount

  return Array.from({ length: slotCount }, (_, index) => baseValue + (index < remainder ? 1 : 0))
}

function getAppointmentPaymentDate(appointment: Appointment | null | undefined): string {
  if (!appointment || appointment.paymentStatus !== 'paid') return ''
  return toDateInputValue(appointment.paidAt) || getTodayDateInputValue()
}

interface AppointmentFormProps {
  open: boolean
  onClose: () => void
  defaultDate?: string
  defaultTime?: string
  defaultPatientId?: string
  appointment?: Appointment | null
  onSuccess?: (message?: string) => void
}

export function AppointmentForm({
  open,
  onClose,
  defaultDate,
  defaultTime,
  defaultPatientId,
  appointment,
  onSuccess,
}: AppointmentFormProps) {
  const { data: patients = [] } = usePatients()
  const { data: servicesData } = useServices()
  const createAppointment = useCreateAppointment()
  const createRecurring = useCreateRecurringAppointments()
  const createBatch = useCreateBatchAppointments()
  const updateAppointment = useUpdateAppointment()
  const createPatient = useCreatePatient()
  const isEditMode = Boolean(appointment)

  // --- Schedule mode ---
  const [mode, setMode] = useState<'session' | 'package'>('session')

  const [patientId, setPatientId] = useState(appointment?.patientId ?? defaultPatientId ?? '')
  const [date, setDate] = useState(appointment?.date ?? defaultDate ?? '')
  const [startTime, setStartTime] = useState(appointment?.startTime ?? defaultTime ?? '')
  const [type, setType] = useState<SessionType>(appointment?.type ?? 'individual')
  const [value, setValue] = useState(
    appointment ? String(appointment.value / 100) : '',
  )
  const [notes, setNotes] = useState(appointment?.notes ?? '')
  const [recurring, setRecurring] = useState(false)
  const [intervalWeeks, setIntervalWeeks] = useState('1')
  const [status, setStatus] = useState<AppointmentStatus>(appointment?.status ?? 'scheduled')
  const [paymentStatus, setPaymentStatus] = useState<PaymentStatus>(
    appointment?.paymentStatus ?? 'pending',
  )
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod | ''>(
    appointment?.paymentMethod ?? '',
  )
  const [paymentDate, setPaymentDate] = useState(getAppointmentPaymentDate(appointment))
  const [submitError, setSubmitError] = useState('')

  // --- Package multi-slot state ---
  const [slots, setSlots] = useState<SlotEntry[]>(
    !appointment && defaultDate && defaultTime
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

  useEffect(() => {
    if (!open) return

    const selectedType = appointment?.type ?? 'individual'

    setMode('session')
    setPatientId(appointment?.patientId ?? defaultPatientId ?? '')
    setDate(appointment?.date ?? defaultDate ?? '')
    setStartTime(appointment?.startTime ?? defaultTime ?? '')
    setType(selectedType)
    setValue(appointment ? String(appointment.value / 100) : '')
    setNotes(appointment?.notes ?? '')
    setRecurring(false)
    setIntervalWeeks('1')
    setStatus(appointment?.status ?? 'scheduled')
    setPaymentStatus(appointment?.paymentStatus ?? 'pending')
    setPaymentMethod(appointment?.paymentMethod ?? '')
    setPaymentDate(getAppointmentPaymentDate(appointment))
    setSubmitError('')
    setPackageValue('')
    setSlots(
      !appointment && defaultDate && defaultTime
        ? [{ id: crypto.randomUUID(), date: defaultDate, time: defaultTime }]
        : [],
    )
    setNewSlotDate(defaultDate ?? '')
    setNewSlotTime('')
    setStep('appointment')
    setNewName('')
    setNewPhone('')
    setNewEmail('')
    setCreateError('')
    setPatientSearch('')
    setPatientDropdownOpen(false)
  }, [appointment, defaultDate, defaultPatientId, defaultTime, open])

  function handleSuccessfulSubmit(message?: string) {
    if (onSuccess) {
      onSuccess(message)
      return
    }

    onClose()
  }

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
    setSubmitError('')

    if (!patientId) {
      setSubmitError('Selecione um paciente para continuar.')
      return
    }

    if (isEditMode && appointment) {
      if (!date || !startTime || !value) {
        setSubmitError('Preencha data, horário e valor para salvar a sessão.')
        return
      }

      if (paymentStatus === 'paid' && !paymentMethod) {
        setSubmitError('Selecione a forma de pagamento para salvar a sessão como paga.')
        return
      }

      if (paymentStatus === 'paid' && !paymentDate) {
        setSubmitError('Informe a data do pagamento para salvar a sessão como paga.')
        return
      }

      updateAppointment.mutate(
        {
          id: appointment.id,
          data: {
            patientId,
            date,
            startTime,
            type,
            value: Math.round(parseFloat(value || '0') * 100),
            notes: notes || null,
            status,
            paymentStatus,
            paymentMethod: paymentStatus === 'paid' ? paymentMethod || undefined : undefined,
            paidAt: paymentStatus === 'paid' ? dateInputToIso(paymentDate) : null,
          },
        },
        {
          onSuccess: () => handleSuccessfulSubmit(),
          onError: (error) => {
            console.error('[AppointmentForm] Failed to update appointment:', error)
            setSubmitError(error instanceof Error ? error.message : 'Erro ao salvar sessão')
          },
        },
      )
      return
    }

    if (mode === 'package') {
      if (!packageValue) {
        setSubmitError('Preencha o valor total do pacote para criar as sessões.')
        return
      }

      if (slots.length === 0) return
      const totalPackageValue = Math.round(parseFloat(packageValue || '0') * 100)
      if (!Number.isFinite(totalPackageValue) || totalPackageValue <= 0) {
        setSubmitError('Informe um valor total de pacote maior que zero.')
        return
      }

      const slotValues = splitPackageValue(totalPackageValue, slots.length)
      const items = slots.map((slot, index) => ({
        patientId,
        date: slot.date,
        startTime: slot.time,
        type,
        status: 'scheduled' as const,
        value: slotValues[index] ?? 0,
        paymentStatus: 'pending' as const,
        notes: notes || undefined,
      }))
      createBatch.mutate(items, {
        onSuccess: () => handleSuccessfulSubmit(),
        onError: (error) => {
          console.error('[AppointmentForm] Failed to create package sessions:', error)
          setSubmitError(error instanceof Error ? error.message : 'Erro ao criar sessões')
        },
      })
    } else {
      if (!date || !startTime || !value) {
        setSubmitError('Preencha data, horário e valor para criar a sessão.')
        return
      }

      if (!recurring && paymentStatus === 'paid' && !paymentMethod) {
        setSubmitError('Selecione a forma de pagamento para salvar a sessão como paga.')
        return
      }

      if (!recurring && paymentStatus === 'paid' && !paymentDate) {
        setSubmitError('Informe a data do pagamento para salvar a sessão como paga.')
        return
      }

      const parsedValue = Math.round(parseFloat(value || '0') * 100)
      if (!Number.isFinite(parsedValue) || parsedValue <= 0) {
        setSubmitError('Informe um valor de sessão maior que zero.')
        return
      }

      const baseData = {
        patientId,
        startTime,
        type,
        status: 'scheduled' as const,
        value: parsedValue,
        paymentStatus: recurring ? ('pending' as const) : paymentStatus,
        notes: notes || undefined,
      }

      if (recurring) {
        const parsedIntervalWeeks = Number.parseInt(intervalWeeks, 10)
        if (!Number.isFinite(parsedIntervalWeeks) || parsedIntervalWeeks < 1) {
          setSubmitError('Informe um intervalo de recorrência válido em semanas.')
          return
        }

        createRecurring.mutate(
          {
            patientId: baseData.patientId,
            startDate: date,
            startTime: baseData.startTime,
            type: baseData.type,
            intervalWeeks: parsedIntervalWeeks,
            value: baseData.value,
            notes: baseData.notes,
          },
          {
            onSuccess: (result) => {
              const formattedProtectedUntil = new Date(`${result.protectedUntil}T12:00:00`).toLocaleDateString('pt-BR')
              handleSuccessfulSubmit(
                `Recorrência ${result.cadenceLabel} criada com agenda protegida até ${formattedProtectedUntil}.`,
              )
            },
            onError: (error) => {
              console.error('[AppointmentForm] Failed to create recurring sessions:', error)
              setSubmitError(error instanceof Error ? error.message : 'Erro ao criar recorrência')
            },
          },
        )
      } else {
        createAppointment.mutate(
          {
            ...baseData,
            date,
            paymentMethod: baseData.paymentStatus === 'paid' ? paymentMethod || undefined : undefined,
            paidAt: baseData.paymentStatus === 'paid' ? dateInputToIso(paymentDate) : undefined,
          },
          {
            onSuccess: () => handleSuccessfulSubmit(),
            onError: (error) => {
              console.error('[AppointmentForm] Failed to create appointment:', error)
              setSubmitError(error instanceof Error ? error.message : 'Erro ao criar sessão')
            },
          },
        )
      }
    }
  }

  const timeOptions = TIME_SLOTS.map((t) => ({ value: t, label: t }))
  const typeOptions = Object.entries(SESSION_TYPE_LABELS).map(([v, l]) => ({
    value: v,
    label: l,
  }))
  const statusOptions = Object.entries(STATUS_LABELS).map(([optionValue, label]) => ({
    value: optionValue,
    label,
  }))
  const paymentStatusOptions = Object.entries(PAYMENT_STATUS_LABELS).map(([optionValue, label]) => ({
    value: optionValue,
    label,
  }))
  const paymentMethodOptions = Object.entries(PAYMENT_METHOD_LABELS).map(([optionValue, label]) => ({
    value: optionValue,
    label,
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
      <Modal.Header>{isEditMode ? 'Editar Sessão' : 'Novo Agendamento'}</Modal.Header>
      <form onSubmit={handleSubmit}>
        <Modal.Body>
          {!isEditMode && (
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
          )}

          {submitError && (
            <div className="rounded-lg bg-red-50 p-3 text-sm text-red-600">{submitError}</div>
          )}

          {isEditMode && appointment?.recurringSeriesId && (
            <div className="rounded-lg border border-primary-200 bg-primary-50 p-3 text-sm text-primary-800">
              Esta sessão faz parte de uma recorrência
              {appointment.recurrenceIntervalWeeks === 1
                ? ' semanal.'
                : ` a cada ${appointment.recurrenceIntervalWeeks ?? 1} semanas.`}{' '}
              Alterações aqui afetam somente esta ocorrência.
            </div>
          )}

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
                disabled={isEditMode}
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
                label="Valor Total do Pacote (R$)"
                type="number"
                step="0.01"
                value={packageValue}
                onChange={(e) => setPackageValue(e.target.value)}
                required
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
              {isEditMode ? (
                <>
                  <Select
                    label="Status"
                    value={status}
                    onChange={(e) => setStatus(e.target.value as AppointmentStatus)}
                    options={statusOptions}
                  />
                  <Select
                    label="Pagamento"
                    value={paymentStatus}
                    onChange={(e) => {
                      const nextPaymentStatus = e.target.value as PaymentStatus
                      setPaymentStatus(nextPaymentStatus)
                      if (nextPaymentStatus === 'pending') {
                        setPaymentMethod('')
                        setPaymentDate('')
                      } else if (!paymentDate) {
                        setPaymentDate(getTodayDateInputValue())
                      }
                    }}
                    options={paymentStatusOptions}
                  />
                  {paymentStatus === 'paid' && (
                    <>
                      <Select
                        label="Forma de pagamento"
                        value={paymentMethod}
                        onChange={(e) => setPaymentMethod(e.target.value as PaymentMethod)}
                        options={paymentMethodOptions}
                        placeholder="Selecione a forma de pagamento"
                        required
                      />
                      <Input
                        label="Data do pagamento"
                        type="date"
                        value={paymentDate}
                        onChange={(e) => setPaymentDate(e.target.value)}
                        required
                      />
                    </>
                  )}
                </>
              ) : (
                <div className="space-y-3 rounded-lg border border-gray-200 bg-gray-50 p-3">
                  <label className="flex items-center gap-2 text-sm text-gray-700">
                    <input
                      type="checkbox"
                      checked={recurring}
                      onChange={(e) => setRecurring(e.target.checked)}
                      className="rounded border-gray-300 text-primary-500 focus:ring-primary-300"
                    />
                    Manter esta sessão em recorrência
                  </label>
                  {recurring && (
                    <>
                      <Input
                        label="A cada quantas semanas?"
                        type="number"
                        min="1"
                        max="52"
                        value={intervalWeeks}
                        onChange={(e) => setIntervalWeeks(e.target.value)}
                        className="w-32"
                      />
                      <p className="text-xs text-gray-500">
                        Use <strong>1</strong> para semanal e <strong>2</strong> para quinzenal.
                        A série continua ativa até você encerrá-la na agenda.
                      </p>
                    </>
                  )}
                </div>
              )}
              {!isEditMode && !recurring && (
                <>
                  <Select
                    label="Pagamento"
                    value={paymentStatus}
                    onChange={(e) => {
                      const nextPaymentStatus = e.target.value as PaymentStatus
                      setPaymentStatus(nextPaymentStatus)
                      if (nextPaymentStatus === 'pending') {
                        setPaymentMethod('')
                        setPaymentDate('')
                      } else if (!paymentDate) {
                        setPaymentDate(getTodayDateInputValue())
                      }
                    }}
                    options={paymentStatusOptions}
                  />
                  {paymentStatus === 'paid' && (
                    <>
                      <Select
                        label="Forma de pagamento"
                        value={paymentMethod}
                        onChange={(e) => setPaymentMethod(e.target.value as PaymentMethod)}
                        options={paymentMethodOptions}
                        placeholder="Selecione a forma de pagamento"
                        required
                      />
                      <Input
                        label="Data do pagamento"
                        type="date"
                        value={paymentDate}
                        onChange={(e) => setPaymentDate(e.target.value)}
                        required
                      />
                    </>
                  )}
                </>
              )}
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
            disabled={
              (mode === 'package' && slots.length === 0) ||
              createAppointment.isPending ||
              createRecurring.isPending ||
              createBatch.isPending ||
              updateAppointment.isPending
            }
          >
            {isEditMode
              ? updateAppointment.isPending
                ? 'Salvando...'
                : 'Salvar Alterações'
              : mode === 'package'
                ? `Criar ${slots.length} ${slots.length === 1 ? 'sessão' : 'sessões'}`
                : recurring
                  ? 'Criar recorrência'
                  : 'Criar Sessão'}
          </Button>
        </Modal.Footer>
      </form>
    </Modal>
  )
}
