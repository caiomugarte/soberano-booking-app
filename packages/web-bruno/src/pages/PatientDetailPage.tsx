import { useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { usePatient, useDeletePatient } from '@/api/patients'
import { AppointmentForm } from '@/components/appointments/AppointmentForm'
import { PatientDocuments } from '@/components/patients/PatientDocuments'
import { PatientForm } from '@/components/patients/PatientForm'
import { PatientHistory } from '@/components/patients/PatientHistory'
import { Button } from '@/components/ui/Button'
import { ConfirmationDialog } from '@/components/ui/ConfirmationDialog'
import { Modal } from '@/components/ui/Modal'
import { Panel } from '@/components/ui/Panel'
import { Spinner } from '@/components/ui/Spinner'
import { formatCPF, formatPhone } from '@/lib/format'

export default function PatientDetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { data: patient, isLoading } = usePatient(id)
  const deletePatient = useDeletePatient()
  const [editOpen, setEditOpen] = useState(false)
  const [appointmentOpen, setAppointmentOpen] = useState(false)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [deleteSuccessOpen, setDeleteSuccessOpen] = useState(false)
  const [deletedPatientName, setDeletedPatientName] = useState('')

  const deleteError = deletePatient.error instanceof Error ? deletePatient.error.message : null
  const patientName = patient?.name ?? deletedPatientName

  function openDeleteDialog() {
    deletePatient.reset()
    setDeleteDialogOpen(true)
  }

  function closeDeleteDialog() {
    if (deletePatient.isPending) return
    deletePatient.reset()
    setDeleteDialogOpen(false)
  }

  function handleDelete() {
    if (!id || !patient) return

    deletePatient.mutate(id, {
      onSuccess: () => {
        setDeletedPatientName(patient.name)
        setDeleteDialogOpen(false)
        setDeleteSuccessOpen(true)
      },
    })
  }

  function handleDeleteSuccessClose() {
    setDeleteSuccessOpen(false)
    navigate('/pacientes')
  }

  if (isLoading && !deleteSuccessOpen) {
    return (
      <div className="flex justify-center py-12">
        <Spinner />
      </div>
    )
  }

  if (!patient && !deleteSuccessOpen) {
    return <div className="text-center text-gray-500">Paciente não encontrado</div>
  }

  return (
    <>
      {patient && (
        <div>
          <div className="mb-6 flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div className="flex flex-wrap items-center gap-3">
              <button onClick={() => navigate('/pacientes')} className="text-gray-400 hover:text-gray-600">
                ← Voltar
              </button>
              <h1 className="min-w-0 text-xl font-bold text-gray-800">{patient.name}</h1>
            </div>
            <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap lg:justify-end">
              <Button className="w-full sm:w-auto" variant="secondary" size="sm" onClick={() => setAppointmentOpen(true)}>
                + Agendar
              </Button>
              <Button className="w-full sm:w-auto" variant="ghost" size="sm" onClick={() => setEditOpen(true)}>
                Editar
              </Button>
              <Button className="w-full sm:w-auto" variant="danger" size="sm" onClick={openDeleteDialog}>
                Excluir
              </Button>
            </div>
          </div>

          <div className="mb-6 grid grid-cols-1 gap-4 lg:grid-cols-3">
            <Panel>
              <Panel.Header>Informações</Panel.Header>
              <Panel.Body className="space-y-2 text-sm">
                {patient.phone && (
                  <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
                    <span className="text-gray-500">Telefone</span>
                    <span>{formatPhone(patient.phone)}</span>
                  </div>
                )}
                {patient.email && (
                  <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
                    <span className="text-gray-500">Email</span>
                    <span className="break-all">{patient.email}</span>
                  </div>
                )}
                {patient.cpf && (
                  <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
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
      )}

      <ConfirmationDialog
        open={deleteDialogOpen}
        onClose={closeDeleteDialog}
        onConfirm={handleDelete}
        title="Excluir paciente"
        description="Tem certeza que deseja excluir este paciente? Essa ação não poderá ser desfeita."
        confirmLabel="Excluir paciente"
        isPending={deletePatient.isPending}
        error={deleteError}
      />

      <Modal open={deleteSuccessOpen} onClose={handleDeleteSuccessClose} zIndex={70}>
        <Modal.Header>Paciente excluído</Modal.Header>
        <Modal.Body>
          <p className="text-sm text-gray-600">
            {patientName ? `${patientName} foi excluído com sucesso.` : 'O paciente foi excluído com sucesso.'}
          </p>
        </Modal.Body>
        <Modal.Footer>
          <Button onClick={handleDeleteSuccessClose}>
            Voltar para pacientes
          </Button>
        </Modal.Footer>
      </Modal>
    </>
  )
}
