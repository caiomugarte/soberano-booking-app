import { useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { usePatient, useDeletePatient } from '@/api/patients'
import { AppointmentForm } from '@/components/appointments/AppointmentForm'
import { PatientDocuments } from '@/components/patients/PatientDocuments'
import { PatientForm } from '@/components/patients/PatientForm'
import { PatientHistory } from '@/components/patients/PatientHistory'
import { PatientProtocolsPanel } from '@/components/protocols/PatientProtocolsPanel'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { ConfirmationDialog } from '@/components/ui/ConfirmationDialog'
import { Modal } from '@/components/ui/Modal'
import { Panel } from '@/components/ui/Panel'
import { Spinner } from '@/components/ui/Spinner'
import {
  CARE_SUMMARY_LABELS,
  FREQUENCY_LABELS,
  PARENTS_MEETING_STATUS_LABELS,
} from '@/config/constants'
import { formatCPF, formatCurrency, formatDate, formatPhone } from '@/lib/format'
import { hasPsychotherapyTrack } from '@/lib/patient-care'

function FinancialStat({
  label,
  value,
}: {
  label: string
  value: string
}) {
  return (
    <div className="rounded-lg border border-gray-100 bg-gray-50 px-3 py-2">
      <div className="text-xs text-gray-500">{label}</div>
      <div className="mt-1 text-sm font-semibold text-gray-800">{value}</div>
    </div>
  )
}

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
  const psychotherapyActive = hasPsychotherapyTrack(patient)

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
              <Badge variant={patient.careSummary === 'dual_track' ? 'emerald' : patient.careSummary === 'neuromodulation' ? 'amber' : 'blue'}>
                {CARE_SUMMARY_LABELS[patient.careSummary]}
              </Badge>
              {patient.isMinor && <Badge variant="amber">Menor de idade</Badge>}
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

          <div className="mb-6 grid grid-cols-1 gap-4 xl:grid-cols-3">
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
                <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
                  <span className="text-gray-500">Perfil de cuidado</span>
                  <span>{CARE_SUMMARY_LABELS[patient.careSummary]}</span>
                </div>
                {patient.birthDate && (
                  <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
                    <span className="text-gray-500">Nascimento</span>
                    <span>{formatDate(patient.birthDate)}</span>
                  </div>
                )}
                {(patient.isMinor || patient.parentsMeetingStatus) && (
                  <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
                    <span className="text-gray-500">Reunião com responsáveis</span>
                    <span>{PARENTS_MEETING_STATUS_LABELS[patient.parentsMeetingStatus ?? 'pending']}</span>
                  </div>
                )}
                {patient.address && (
                  <div className="flex flex-col gap-1 sm:flex-row sm:items-start sm:justify-between">
                    <span className="text-gray-500">Endereço</span>
                    <span className="max-w-sm text-right">{patient.address}</span>
                  </div>
                )}
                {psychotherapyActive && patient.psychotherapyPriceCents && (
                  <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
                    <span className="text-gray-500">Valor acordado</span>
                    <span>{formatCurrency(patient.psychotherapyPriceCents)}</span>
                  </div>
                )}
                {psychotherapyActive && patient.psychotherapyFrequency && (
                  <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
                    <span className="text-gray-500">Frequência</span>
                    <span>{FREQUENCY_LABELS[patient.psychotherapyFrequency]}</span>
                  </div>
                )}
              </Panel.Body>
            </Panel>

            {patient.financialSummary && (
              <Panel>
                <Panel.Header>Financeiro</Panel.Header>
                <Panel.Body className="space-y-4">
                  <div className="space-y-2">
                    <div className="text-sm font-medium text-gray-800">Recebíveis de sessões</div>
                    <div className="grid grid-cols-2 gap-2">
                      <FinancialStat label="Pagas" value={`${patient.financialSummary.sessionReceivables.paidCount}`} />
                      <FinancialStat label="Pendentes" value={`${patient.financialSummary.sessionReceivables.pendingCount}`} />
                      <FinancialStat label="Total pago" value={formatCurrency(patient.financialSummary.sessionReceivables.paidTotalCents)} />
                      <FinancialStat label="Total pendente" value={formatCurrency(patient.financialSummary.sessionReceivables.pendingTotalCents)} />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <div className="text-sm font-medium text-gray-800">Vendas de protocolo</div>
                    <div className="grid grid-cols-2 gap-2">
                      <FinancialStat label="Quitados" value={`${patient.financialSummary.protocolSales.paidCount}`} />
                      <FinancialStat label="Em aberto" value={`${patient.financialSummary.protocolSales.pendingCount}`} />
                      <FinancialStat label="Total pago" value={formatCurrency(patient.financialSummary.protocolSales.paidTotalCents)} />
                      <FinancialStat label="Total pendente" value={formatCurrency(patient.financialSummary.protocolSales.pendingTotalCents)} />
                    </div>
                  </div>
                </Panel.Body>
              </Panel>
            )}

            {patient.notes && (
              <Panel>
                <Panel.Header>Notas</Panel.Header>
                <Panel.Body>
                  <p className="whitespace-pre-wrap text-sm text-gray-600">{patient.notes}</p>
                </Panel.Body>
              </Panel>
            )}
          </div>

          <div className="mb-6">
            <PatientDocuments patientId={patient.id} />
          </div>

          {patient.neuromodulationEligible && (
            <div className="mb-6">
              <PatientProtocolsPanel patientId={patient.id} />
            </div>
          )}

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
