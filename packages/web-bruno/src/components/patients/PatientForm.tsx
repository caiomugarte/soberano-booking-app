import { useState, type FormEvent } from 'react'
import { Modal } from '@/components/ui/Modal'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
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

export function PatientForm({ open, onClose, patient, onCreated, zIndex }: PatientFormProps) {
  const createPatient = useCreatePatient()
  const updatePatient = useUpdatePatient()

  const [name, setName] = useState(patient?.name ?? '')
  const [phone, setPhone] = useState(patient?.phone ?? '')
  const [email, setEmail] = useState(patient?.email ?? '')
  const [cpf, setCpf] = useState(patient?.cpf ?? '')
  const [notes, setNotes] = useState(patient?.notes ?? '')

  function handleSubmit(e: FormEvent) {
    e.preventDefault()
    const data = {
      name,
      phone: phone || undefined,
      email: email || '',
      cpf: cpf || undefined,
      notes: notes || undefined,
    }

    if (patient) {
      updatePatient.mutate({ id: patient.id, data }, { onSuccess: onClose })
    } else {
      createPatient.mutate(data, {
        onSuccess: (created) => {
          onCreated?.(created.id)
          onClose()
        },
      })
    }
  }

  return (
    <Modal open={open} onClose={onClose} zIndex={zIndex}>
      <Modal.Header>{patient ? 'Editar Paciente' : 'Novo Paciente'}</Modal.Header>
      <form onSubmit={handleSubmit}>
        <Modal.Body>
          <Input label="Nome" value={name} onChange={(e) => setName(e.target.value)} required />
          <Input
            label="Telefone"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder="67999999999"
          />
          <Input
            label="Email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
          <Input label="CPF" value={cpf} onChange={(e) => setCpf(e.target.value)} />
          <Textarea label="Notas" value={notes} onChange={(e) => setNotes(e.target.value)} />
        </Modal.Body>
        <Modal.Footer>
          <Button variant="ghost" type="button" onClick={onClose}>
            Cancelar
          </Button>
          <Button type="submit">{patient ? 'Salvar' : 'Criar'}</Button>
        </Modal.Footer>
      </form>
    </Modal>
  )
}
