import { useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { usePatient, useDeletePatient } from '@/api/patients'
import { PatientForm } from '@/components/patients/PatientForm'
import { PatientHistory } from '@/components/patients/PatientHistory'
import { PatientDocuments } from '@/components/patients/PatientDocuments'
import { AppointmentForm } from '@/components/appointments/AppointmentForm'
import { Panel } from '@/components/ui/Panel'
import { Button } from '@/components/ui/Button'
import { Spinner } from '@/components/ui/Spinner'
import { formatPhone, formatCPF } from '@/lib/format'

export default function PatientDetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { data: patient, isLoading } = usePatient(id)
  const deletePatient = useDeletePatient()
  const [editOpen, setEditOpen] = useState(false)
  const [appointmentOpen, setAppointmentOpen] = useState(false)

  if (isLoading) {
    return (
      <div className="flex justify-center py-12">
        <Spinner />
      </div>
    )
  }

  if (!patient) {
    return <div className="text-center text-gray-500">Paciente não encontrado</div>
  }

  function handleDelete() {
    if (!id) return
    if (window.confirm('Tem certeza que deseja excluir este paciente?')) {
      deletePatient.mutate(id, { onSuccess: () => navigate('/pacientes') })
    }
  }

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate('/pacientes')} className="text-gray-400 hover:text-gray-600">
            ← Voltar
          </button>
          <h1 className="text-xl font-bold text-gray-800">{patient.name}</h1>
        </div>
        <div className="flex gap-2">
          <Button variant="secondary" size="sm" onClick={() => setAppointmentOpen(true)}>
            + Agendar
          </Button>
          <Button variant="ghost" size="sm" onClick={() => setEditOpen(true)}>
            Editar
          </Button>
          <Button variant="danger" size="sm" onClick={handleDelete}>
            Excluir
          </Button>
        </div>
      </div>

      <div className="mb-6 grid grid-cols-1 gap-4 lg:grid-cols-3">
        <Panel>
          <Panel.Header>Informações</Panel.Header>
          <Panel.Body className="space-y-2 text-sm">
            {patient.phone && (
              <div className="flex justify-between">
                <span className="text-gray-500">Telefone</span>
                <span>{formatPhone(patient.phone)}</span>
              </div>
            )}
            {patient.email && (
              <div className="flex justify-between">
                <span className="text-gray-500">Email</span>
                <span>{patient.email}</span>
              </div>
            )}
            {patient.cpf && (
              <div className="flex justify-between">
                <span className="text-gray-500">CPF</span>
                <span>{formatCPF(patient.cpf)}</span>
              </div>
            )}
          </Panel.Body>
        </Panel>

        {patient.notes && (
          <Panel>
            <Panel.Header>Notas</Panel.Header>
            <Panel.Body>
              <p className="text-sm text-gray-600 whitespace-pre-wrap">{patient.notes}</p>
            </Panel.Body>
          </Panel>
        )}
      </div>

      <div className="mb-6">
        <PatientDocuments patientId={patient.id} />
      </div>

      <h2 className="mb-4 text-lg font-semibold text-gray-800">Histórico de Sessões</h2>
      <PatientHistory patient={patient} />

      <PatientForm
        open={editOpen}
        onClose={() => setEditOpen(false)}
        patient={patient}
      />
      <AppointmentForm
        open={appointmentOpen}
        onClose={() => setAppointmentOpen(false)}
        defaultPatientId={patient.id}
      />
    </div>
  )
}
