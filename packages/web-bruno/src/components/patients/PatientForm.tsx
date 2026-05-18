import { useEffect, useState, type FormEvent } from 'react'
import { Modal } from '@/components/ui/Modal'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Select } from '@/components/ui/Select'
import { Textarea } from '@/components/ui/Textarea'
import { useCreatePatient, useUpdatePatient } from '@/api/patients'
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
    careMode: patient?.careMode ?? 'psychotherapy',
    psychotherapyPrice: patient?.psychotherapyPriceCents ? String(patient.psychotherapyPriceCents / 100) : '',
    psychotherapyFrequency: patient?.psychotherapyFrequency ?? '',
    birthDate: patient?.birthDate ?? '',
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
  const [careMode, setCareMode] = useState(initialValues.careMode)
  const [psychotherapyPrice, setPsychotherapyPrice] = useState(initialValues.psychotherapyPrice)
  const [psychotherapyFrequency, setPsychotherapyFrequency] = useState(initialValues.psychotherapyFrequency)
  const [birthDate, setBirthDate] = useState(initialValues.birthDate)
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
    setCareMode(values.careMode)
    setPsychotherapyPrice(values.psychotherapyPrice)
    setPsychotherapyFrequency(values.psychotherapyFrequency)
    setBirthDate(values.birthDate)
    setAddress(values.address)
    setSubmitError('')
  }, [open, patient])

  function handleSubmit(e: FormEvent) {
    e.preventDefault()
    const normalizedEmail = email.trim()
    const normalizedCpf = cpf.trim()
    const normalizedAddress = address.trim()
    const priceCents =
      careMode === 'psychotherapy' && psychotherapyPrice
        ? Math.round(Number.parseFloat(psychotherapyPrice) * 100)
        : null

    setSubmitError('')

    if (careMode === 'psychotherapy') {
      if (!Number.isFinite(priceCents ?? NaN) || (priceCents ?? 0) <= 0) {
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
            notes: notes || undefined,
            careMode,
            psychotherapyPriceCents: careMode === 'psychotherapy' ? priceCents : null,
            psychotherapyFrequency: careMode === 'psychotherapy' ? (psychotherapyFrequency as Patient['psychotherapyFrequency']) : null,
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
    } else {
      createPatient.mutate(
        {
          name,
          phone: phone || undefined,
          email: normalizedEmail || undefined,
          cpf: normalizedCpf || undefined,
          notes: notes || undefined,
          careMode,
          psychotherapyPriceCents: careMode === 'psychotherapy' ? priceCents ?? undefined : undefined,
          psychotherapyFrequency: careMode === 'psychotherapy' ? (psychotherapyFrequency as Patient['psychotherapyFrequency']) : undefined,
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
  }

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
          <Select
            label="Modo de cuidado"
            value={careMode}
            onChange={(e) => {
              const nextCareMode = e.target.value as Patient['careMode']
              setCareMode(nextCareMode)
              if (nextCareMode === 'neuromodulation') {
                setPsychotherapyPrice('')
                setPsychotherapyFrequency('')
              }
            }}
            options={[
              { value: 'psychotherapy', label: 'Psicoterapia' },
              { value: 'neuromodulation', label: 'Neuromodulação' },
            ]}
          />
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
          {careMode === 'psychotherapy' && (
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
