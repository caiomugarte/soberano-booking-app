import { useEffect, useState, type FormEvent } from 'react'
import { Modal } from '@/components/ui/Modal'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Select } from '@/components/ui/Select'
import { Textarea } from '@/components/ui/Textarea'
import { useCreatePatient, useUpdatePatient } from '@/api/patients'
import { hasPsychotherapyTrack, isMinorFromBirthDate } from '@/lib/patient-care'
import type { Patient } from '@/schemas/patient.schema'

interface PatientFormProps {
  open: boolean
  onClose: () => void
  patient?: Patient | null
  onCreated?: (id: string) => void
  zIndex?: number
}

function getPatientFormValues(patient?: Patient | null) {
  return {
    name: patient?.name ?? '',
    phone: patient?.phone ?? '',
    email: patient?.email ?? '',
    cpf: patient?.cpf ?? '',
    notes: patient?.notes ?? '',
    psychotherapyEnabled: hasPsychotherapyTrack(patient),
    neuromodulationEligible: patient?.neuromodulationEligible ?? false,
    psychotherapyPrice: patient?.psychotherapyPriceCents ? String(patient.psychotherapyPriceCents / 100) : '',
    psychotherapyFrequency: patient?.psychotherapyFrequency ?? '',
    birthDate: patient?.birthDate ?? '',
    parentsMeetingStatus: patient?.parentsMeetingStatus ?? (patient?.isMinor ? 'pending' : ''),
    address: patient?.address ?? '',
  }
}

export function PatientForm({ open, onClose, patient, onCreated, zIndex }: PatientFormProps) {
  const createPatient = useCreatePatient()
  const updatePatient = useUpdatePatient()
  const initialValues = getPatientFormValues(patient)

  const [name, setName] = useState(initialValues.name)
  const [phone, setPhone] = useState(initialValues.phone)
  const [email, setEmail] = useState(initialValues.email)
  const [cpf, setCpf] = useState(initialValues.cpf)
  const [notes, setNotes] = useState(initialValues.notes)
  const [psychotherapyEnabled, setPsychotherapyEnabled] = useState(initialValues.psychotherapyEnabled)
  const [neuromodulationEligible, setNeuromodulationEligible] = useState(initialValues.neuromodulationEligible)
  const [psychotherapyPrice, setPsychotherapyPrice] = useState(initialValues.psychotherapyPrice)
  const [psychotherapyFrequency, setPsychotherapyFrequency] = useState(initialValues.psychotherapyFrequency)
  const [birthDate, setBirthDate] = useState(initialValues.birthDate)
  const [parentsMeetingStatus, setParentsMeetingStatus] = useState(initialValues.parentsMeetingStatus)
  const [address, setAddress] = useState(initialValues.address)
  const [submitError, setSubmitError] = useState('')

  useEffect(() => {
    if (!open) return

    const values = getPatientFormValues(patient)
    setName(values.name)
    setPhone(values.phone)
    setEmail(values.email)
    setCpf(values.cpf)
    setNotes(values.notes)
    setPsychotherapyEnabled(values.psychotherapyEnabled)
    setNeuromodulationEligible(values.neuromodulationEligible)
    setPsychotherapyPrice(values.psychotherapyPrice)
    setPsychotherapyFrequency(values.psychotherapyFrequency)
    setBirthDate(values.birthDate)
    setParentsMeetingStatus(values.parentsMeetingStatus)
    setAddress(values.address)
    setSubmitError('')
  }, [open, patient])

  function handleSubmit(e: FormEvent) {
    e.preventDefault()
    const normalizedEmail = email.trim()
    const normalizedCpf = cpf.trim()
    const normalizedAddress = address.trim()
    const priceCents =
      psychotherapyEnabled && psychotherapyPrice
        ? Math.round(Number.parseFloat(psychotherapyPrice) * 100)
        : null
    const isMinorPreview = isMinorFromBirthDate(birthDate)
    const shouldShowParentsMeetingStatus = isMinorPreview || Boolean(parentsMeetingStatus)
    const effectiveParentsMeetingStatus = shouldShowParentsMeetingStatus
      ? ((parentsMeetingStatus || 'pending') as Patient['parentsMeetingStatus'])
      : null

    setSubmitError('')

    if (!psychotherapyEnabled && !neuromodulationEligible) {
      setSubmitError('Ative psicoterapia, neuromodulação, ou ambos para salvar o paciente.')
      return
    }

    if (psychotherapyEnabled) {
      if (!Number.isFinite(priceCents ?? Number.NaN) || (priceCents ?? 0) <= 0) {
        setSubmitError('Informe o valor acordado da sessão de psicoterapia.')
        return
      }

      if (!psychotherapyFrequency) {
        setSubmitError('Selecione a frequência da psicoterapia.')
        return
      }
    }

    if (patient) {
      updatePatient.mutate(
        {
          id: patient.id,
          data: {
            name,
            phone: phone || undefined,
            email: normalizedEmail || null,
            cpf: normalizedCpf || null,
            notes: notes || null,
            psychotherapyPriceCents: psychotherapyEnabled ? priceCents ?? undefined : null,
            psychotherapyFrequency: psychotherapyEnabled
              ? (psychotherapyFrequency as Patient['psychotherapyFrequency'])
              : null,
            neuromodulationEligible,
            parentsMeetingStatus: effectiveParentsMeetingStatus,
            birthDate: birthDate || null,
            address: normalizedAddress || null,
          },
        },
        {
          onSuccess: onClose,
          onError: (error) => {
            setSubmitError(error instanceof Error ? error.message : 'Erro ao salvar paciente')
          },
        },
      )
      return
    }

    createPatient.mutate(
      {
        name,
        phone: phone || undefined,
        email: normalizedEmail || undefined,
        cpf: normalizedCpf || undefined,
        notes: notes || undefined,
        psychotherapyPriceCents: psychotherapyEnabled ? priceCents ?? undefined : undefined,
        psychotherapyFrequency: psychotherapyEnabled
          ? (psychotherapyFrequency as Patient['psychotherapyFrequency'])
          : undefined,
        neuromodulationEligible,
        parentsMeetingStatus: effectiveParentsMeetingStatus ?? undefined,
        birthDate: birthDate || undefined,
        address: normalizedAddress || undefined,
      },
      {
        onSuccess: (created) => {
          onCreated?.(created.id)
          onClose()
        },
        onError: (error) => {
          setSubmitError(error instanceof Error ? error.message : 'Erro ao criar paciente')
        },
      },
    )
  }

  const isMinorPreview = isMinorFromBirthDate(birthDate)
  const showParentsMeetingStatus = isMinorPreview || Boolean(parentsMeetingStatus)

  return (
    <Modal open={open} onClose={onClose} zIndex={zIndex}>
      <Modal.Header>{patient ? 'Editar Paciente' : 'Novo Paciente'}</Modal.Header>
      <form onSubmit={handleSubmit} autoComplete="off">
        <Modal.Body>
          {submitError ? (
            <div className="rounded-lg bg-red-50 p-3 text-sm text-red-600">{submitError}</div>
          ) : null}
          <Input
            label="Nome"
            value={name}
            onChange={(e) => setName(e.target.value)}
            autoComplete="off"
            required
          />

          <div className="space-y-3 rounded-lg border border-gray-200 bg-gray-50 p-3">
            <div>
              <div className="text-sm font-medium text-gray-800">Perfil de cuidado</div>
              <p className="mt-1 text-xs text-gray-500">
                Ative psicoterapia, neuromodulação, ou ambos no mesmo cadastro.
              </p>
            </div>
            <label className="flex items-center gap-2 text-sm text-gray-700">
              <input
                type="checkbox"
                checked={psychotherapyEnabled}
                onChange={(e) => {
                  setPsychotherapyEnabled(e.target.checked)
                  if (!e.target.checked) {
                    setPsychotherapyPrice('')
                    setPsychotherapyFrequency('')
                  }
                }}
                className="rounded border-gray-300 text-primary-500 focus:ring-primary-300"
              />
              Psicoterapia
            </label>
            <label className="flex items-center gap-2 text-sm text-gray-700">
              <input
                type="checkbox"
                checked={neuromodulationEligible}
                onChange={(e) => setNeuromodulationEligible(e.target.checked)}
                className="rounded border-gray-300 text-primary-500 focus:ring-primary-300"
              />
              Neuromodulação
            </label>
          </div>

          <Input
            label="Telefone"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder="67999999999"
            autoComplete="off"
          />
          <Input
            label="Email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            autoComplete="off"
          />
          <Input label="CPF" value={cpf} onChange={(e) => setCpf(e.target.value)} autoComplete="off" />

          {psychotherapyEnabled && (
            <>
              <Input
                label="Valor acordado (R$)"
                type="number"
                step="0.01"
                value={psychotherapyPrice}
                onChange={(e) => setPsychotherapyPrice(e.target.value)}
                autoComplete="off"
                required
              />
              <Select
                label="Frequência"
                value={psychotherapyFrequency}
                onChange={(e) => setPsychotherapyFrequency(e.target.value)}
                options={[
                  { value: 'weekly', label: 'Semanal' },
                  { value: 'biweekly', label: 'Quinzenal' },
                ]}
                placeholder="Selecione a frequência"
                required
              />
            </>
          )}

          <Input
            label="Data de nascimento"
            type="date"
            value={birthDate}
            onChange={(e) => setBirthDate(e.target.value)}
            autoComplete="off"
          />

          {isMinorPreview && (
            <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
              Paciente menor de idade identificado pela data de nascimento.
            </div>
          )}

          {showParentsMeetingStatus && (
            <Select
              label="Reunião com responsáveis"
              value={parentsMeetingStatus || 'pending'}
              onChange={(e) => setParentsMeetingStatus(e.target.value)}
              options={[
                { value: 'pending', label: 'Pendente' },
                { value: 'completed', label: 'Concluída' },
              ]}
            />
          )}

          <Textarea
            label="Endereço"
            value={address}
            onChange={(e) => setAddress(e.target.value)}
            autoComplete="off"
          />
          <Textarea
            label="Notas"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            autoComplete="off"
          />
        </Modal.Body>
        <Modal.Footer>
          <Button variant="ghost" type="button" onClick={onClose}>
            Cancelar
          </Button>
          <Button type="submit" disabled={createPatient.isPending || updatePatient.isPending}>
            {createPatient.isPending || updatePatient.isPending
              ? patient
                ? 'Salvando...'
                : 'Criando...'
              : patient
                ? 'Salvar'
                : 'Criar'}
          </Button>
        </Modal.Footer>
      </form>
    </Modal>
  )
}
