import { useState, useRef } from 'react'
import {
  useDeleteAppointment,
  usePatientAppointments,
  useStopRecurringSeries,
  useUpdateAppointment,
} from '@/api/appointments'
import { usePatientReports, useCreateSessionReport, useUpdateSessionReport, useDeleteSessionReport } from '@/api/session-reports'
import { PaymentMethodDialog } from '@/components/appointments/PaymentMethodDialog'
import { ProtocolCreditActionDialog } from '@/components/appointments/ProtocolCreditActionDialog'
import { Button } from '@/components/ui/Button'
import { ConfirmationDialog } from '@/components/ui/ConfirmationDialog'
import { EmptyState } from '@/components/ui/EmptyState'
import { Modal } from '@/components/ui/Modal'
import { Panel } from '@/components/ui/Panel'
import { AppointmentStatusBadge, PaymentStatusBadge } from '@/components/ui/StatusBadge'
import { Textarea } from '@/components/ui/Textarea'
import { WhatsAppButton } from '@/components/whatsapp/WhatsAppButton'
import { PAYMENT_METHOD_LABELS, PROTOCOL_LINK_TYPE_LABELS, SESSION_TYPE_LABELS } from '@/config/constants'
import { formatAppointmentCharge } from '@/lib/appointment-pricing'
import { formatDate, getTodayDateInputValue, toDateInputValue } from '@/lib/format'
import type { Appointment, PaymentMethod, ProtocolCreditAction } from '@/schemas/appointment.schema'
import type { Patient } from '@/schemas/patient.schema'

interface PatientHistoryProps {
  patient: Patient
}

function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result as string)
    reader.onerror = reject
    reader.readAsDataURL(file)
  })
}

export function PatientHistory({ patient }: PatientHistoryProps) {
  const { data: appointments = [] } = usePatientAppointments(patient.id)
  const { data: reports = [] } = usePatientReports(patient.id)
  const updateAppointment = useUpdateAppointment()
  const deleteAppointment = useDeleteAppointment()
  const stopRecurringSeries = useStopRecurringSeries()
  const createReport = useCreateSessionReport()
  const updateReport = useUpdateSessionReport()
  const deleteReport = useDeleteSessionReport()
  const today = getTodayDateInputValue()

  const [reportModal, setReportModal] = useState<{ appointmentId: string; mode: 'view' | 'edit' } | null>(null)
  const [reportText, setReportText] = useState('')
  const [reportFileName, setReportFileName] = useState<string | undefined>()
  const [reportFileType, setReportFileType] = useState<string | undefined>()
  const [reportFileData, setReportFileData] = useState<string | undefined>()
  const [selectedPaymentAppointmentId, setSelectedPaymentAppointmentId] = useState<string | null>(null)
  const [appointmentToDelete, setAppointmentToDelete] = useState<Appointment | null>(null)
  const [appointmentToStopRecurring, setAppointmentToStopRecurring] = useState<Appointment | null>(null)
  const [protocolDeleteError, setProtocolDeleteError] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  function handleMarkPaid(id: string, paymentMethod: PaymentMethod, paidAt: string) {
    updateAppointment.mutate({
      id,
      data: {
        paymentStatus: 'paid',
        paymentMethod,
        paidAt,
      },
    })
  }

  function getReport(appointmentId: string) {
    return reports.find((r) => r.appointmentId === appointmentId)
  }

  function openReport(appointmentId: string) {
    const existing = getReport(appointmentId)
    if (existing) {
      setReportText(existing.text)
      setReportFileName(existing.fileName)
      setReportFileType(existing.fileType)
      setReportFileData(existing.fileData)
      setReportModal({ appointmentId, mode: 'view' })
    } else {
      setReportText('')
      setReportFileName(undefined)
      setReportFileType(undefined)
      setReportFileData(undefined)
      setReportModal({ appointmentId, mode: 'edit' })
    }
  }

  async function handleFileAttach(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    const data = await fileToBase64(file)
    setReportFileName(file.name)
    setReportFileType(file.type)
    setReportFileData(data)
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  function handleSaveReport() {
    if (!reportModal) return
    const existing = getReport(reportModal.appointmentId)

    if (existing) {
      updateReport.mutate({
        id: existing.id,
        data: {
          text: reportText,
          fileName: reportFileName,
          fileType: reportFileType,
          fileData: reportFileData,
        },
      }, { onSuccess: () => setReportModal(null) })
    } else {
      createReport.mutate({
        appointmentId: reportModal.appointmentId,
        patientId: patient.id,
        text: reportText,
        fileName: reportFileName,
        fileType: reportFileType,
        fileData: reportFileData,
      }, { onSuccess: () => setReportModal(null) })
    }
  }

  function handleDeleteReport() {
    if (!reportModal) return
    const existing = getReport(reportModal.appointmentId)
    if (existing && window.confirm('Excluir este relatório?')) {
      deleteReport.mutate(existing.id, { onSuccess: () => setReportModal(null) })
    }
  }

  function handleDownloadAttachment() {
    if (!reportFileData || !reportFileName) return
    const link = document.createElement('a')
    link.href = reportFileData
    link.download = reportFileName
    link.click()
  }

  function handleDeleteSession() {
    if (!appointmentToDelete) return

    deleteAppointment.mutate({ id: appointmentToDelete.id, patientId: patient.id }, {
      onSuccess: () => setAppointmentToDelete(null),
    })
  }

  function handleDeleteProtocolSession(action: ProtocolCreditAction) {
    if (!appointmentToDelete) return

    setProtocolDeleteError(null)
    deleteAppointment.mutate(
      {
        id: appointmentToDelete.id,
        patientId: patient.id,
        protocolCreditAction: action,
      },
      {
        onSuccess: () => setAppointmentToDelete(null),
        onError: (error) => {
          setProtocolDeleteError(error instanceof Error ? error.message : 'Erro ao excluir sessão')
        },
      },
    )
  }

  function handleStopRecurring() {
    if (!appointmentToStopRecurring?.recurringSeriesId) return

    stopRecurringSeries.mutate(
      {
        recurringSeriesId: appointmentToStopRecurring.recurringSeriesId,
        stopDate: appointmentToStopRecurring.date,
      },
      {
        onSuccess: () => setAppointmentToStopRecurring(null),
      },
    )
  }

  if (appointments.length === 0) {
    return <EmptyState title="Nenhuma sessão registrada" />
  }

  return (
    <>
      <div className="space-y-2">
        {appointments.map((apt) => {
          const hasReport = !!getReport(apt.id)
          const isRecurring = Boolean(apt.recurringSeriesId)
          const canStopRecurring =
            isRecurring &&
            apt.recurrenceStatus === 'active' &&
            apt.date >= today &&
            (apt.status === 'scheduled' || apt.status === 'confirmed')

          return (
            <Panel key={apt.id}>
              <Panel.Body className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                <div className="space-y-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-sm font-medium">{formatDate(apt.date)}</span>
                    <span className="text-xs text-gray-400">
                      {apt.startTime} - {apt.endTime}
                    </span>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-xs text-gray-500">
                      {SESSION_TYPE_LABELS[apt.type]}
                    </span>
                    <span className="text-xs font-medium">{formatAppointmentCharge(apt)}</span>
                  </div>
                  <div className="flex flex-wrap items-center gap-1.5">
                    <AppointmentStatusBadge status={apt.status} />
                    <PaymentStatusBadge status={apt.paymentStatus} />
                    {apt.paymentStatus === 'paid' && apt.paymentMethod && (
                      <span className="text-xs text-gray-500">
                        {PAYMENT_METHOD_LABELS[apt.paymentMethod]}
                      </span>
                    )}
                    {apt.paymentStatus === 'paid' && apt.paidAt && (
                      <span className="text-xs text-gray-500">
                        Pago em {formatDate(toDateInputValue(apt.paidAt))}
                      </span>
                    )}
                    {hasReport && (
                      <span className="inline-flex items-center rounded-full bg-blue-50 px-2 py-0.5 text-xs font-medium text-blue-600">
                        Relatório
                      </span>
                    )}
                    {isRecurring && (
                      <span className="inline-flex items-center rounded-full bg-primary-50 px-2 py-0.5 text-xs font-medium text-primary-700">
                        {apt.recurrenceStatus === 'active' ? 'Recorrente ativa' : 'Recorrência encerrada'}
                      </span>
                    )}
                    {apt.protocolLinkType && apt.protocolLinkType !== 'standalone' && (
                      <span className="inline-flex items-center rounded-full bg-purple-50 px-2 py-0.5 text-xs font-medium text-purple-700">
                        {PROTOCOL_LINK_TYPE_LABELS[apt.protocolLinkType]}
                      </span>
                    )}
                  </div>
                </div>
                <div className="flex flex-wrap gap-2 lg:justify-end">
                  <Button
                    className="w-full sm:w-auto"
                    variant={hasReport ? 'ghost' : 'secondary'}
                    size="sm"
                    onClick={() => openReport(apt.id)}
                  >
                    {hasReport ? 'Ver Relatório' : '+ Relatório'}
                  </Button>
                  {apt.paymentStatus === 'pending' && apt.status !== 'cancelled' && apt.protocolLinkType !== 'protocol' && (
                    <>
                      <Button
                        className="w-full sm:w-auto"
                        variant="secondary"
                        size="sm"
                        onClick={() => setSelectedPaymentAppointmentId(apt.id)}
                      >
                        Marcar Pago
                      </Button>
                      {patient.phone && (
                        <WhatsAppButton appointmentId={apt.id} />
                      )}
                    </>
                  )}
                  {canStopRecurring && (
                    <Button
                      className="w-full sm:w-auto"
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        stopRecurringSeries.reset()
                        setAppointmentToStopRecurring(apt)
                      }}
                    >
                      Encerrar recorrência
                    </Button>
                  )}
                  <Button
                    className="w-full sm:w-auto"
                    variant="danger"
                    size="sm"
                    onClick={() => {
                      deleteAppointment.reset()
                      setProtocolDeleteError(null)
                      setAppointmentToDelete(apt)
                    }}
                  >
                    Excluir sessão
                  </Button>
                </div>
              </Panel.Body>
            </Panel>
          )
        })}
      </div>

      <PaymentMethodDialog
        open={selectedPaymentAppointmentId !== null}
        onClose={() => setSelectedPaymentAppointmentId(null)}
        onConfirm={(paymentMethod, paidAt) => {
          if (!selectedPaymentAppointmentId) return
          handleMarkPaid(selectedPaymentAppointmentId, paymentMethod, paidAt)
          setSelectedPaymentAppointmentId(null)
        }}
        title="Registrar pagamento"
        confirmLabel="Marcar pago"
      />

      <ConfirmationDialog
        open={appointmentToDelete !== null && appointmentToDelete?.protocolLinkType !== 'protocol'}
        onClose={() => {
          if (deleteAppointment.isPending) return
          deleteAppointment.reset()
          setAppointmentToDelete(null)
        }}
        onConfirm={handleDeleteSession}
        title="Excluir sessão"
        description={
          appointmentToDelete
            ? `Tem certeza que deseja excluir a sessão de ${formatDate(appointmentToDelete.date)} às ${appointmentToDelete.startTime}? O relatório vinculado também será removido.`
            : ''
        }
        confirmLabel="Excluir sessão"
        isPending={deleteAppointment.isPending}
        error={deleteAppointment.error instanceof Error ? deleteAppointment.error.message : null}
      />

      <ProtocolCreditActionDialog
        open={appointmentToDelete?.protocolLinkType === 'protocol'}
        onClose={() => {
          if (deleteAppointment.isPending) return
          deleteAppointment.reset()
          setProtocolDeleteError(null)
          setAppointmentToDelete(null)
        }}
        onConfirm={handleDeleteProtocolSession}
        title="Excluir sessão vinculada"
        description={
          appointmentToDelete
            ? `Esta sessão está vinculada a um protocolo. Escolha se o crédito deve voltar ao protocolo ou ficar consumido antes de excluir a sessão de ${formatDate(appointmentToDelete.date)} às ${appointmentToDelete.startTime}.`
            : ''
        }
        isPending={deleteAppointment.isPending}
        error={protocolDeleteError}
      />

      <ConfirmationDialog
        open={appointmentToStopRecurring !== null}
        onClose={() => {
          if (stopRecurringSeries.isPending) return
          stopRecurringSeries.reset()
          setAppointmentToStopRecurring(null)
        }}
        onConfirm={handleStopRecurring}
        title="Encerrar recorrência"
        description={
          appointmentToStopRecurring
            ? `Encerrar a recorrência vai remover as próximas sessões a partir de ${formatDate(appointmentToStopRecurring.date)}. A sessão atual e as futuras ocorrências recorrentes serão excluídas.`
            : ''
        }
        confirmLabel="Encerrar recorrência"
        isPending={stopRecurringSeries.isPending}
        error={stopRecurringSeries.error instanceof Error ? stopRecurringSeries.error.message : null}
      />

      {/* Report Modal */}
      {reportModal && (
        <Modal open onClose={() => setReportModal(null)}>
          <Modal.Header>
            {reportModal.mode === 'view' ? 'Relatório da Sessão' : 'Novo Relatório'}
          </Modal.Header>
          <Modal.Body>
            {reportModal.mode === 'view' ? (
              <div className="space-y-4">
                <div className="whitespace-pre-wrap rounded-lg bg-gray-50 p-4 text-sm text-gray-700">
                  {reportText || <span className="italic text-gray-400">Sem texto</span>}
                </div>
                {reportFileName && (
                  <div className="flex flex-col gap-2 rounded-lg border border-gray-200 px-3 py-2 sm:flex-row sm:items-center">
                    <span className="break-all text-sm">📎 {reportFileName}</span>
                    <button
                      onClick={handleDownloadAttachment}
                      className="text-xs text-primary-500 hover:text-primary-700"
                    >
                      Baixar
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <div className="space-y-4">
                <Textarea
                  label="Observações da sessão"
                  value={reportText}
                  onChange={(e) => setReportText(e.target.value)}
                  rows={6}
                  placeholder="Descreva as observações, evolução e notas da sessão..."
                />
                <div>
                  <input
                    ref={fileInputRef}
                    type="file"
                    onChange={handleFileAttach}
                    className="hidden"
                  />
                  {reportFileName ? (
                    <div className="flex flex-col gap-2 rounded-lg border border-gray-200 px-3 py-2 sm:flex-row sm:items-center">
                      <span className="flex-1 break-all text-sm">📎 {reportFileName}</span>
                      <button
                        type="button"
                        onClick={() => {
                          setReportFileName(undefined)
                          setReportFileType(undefined)
                          setReportFileData(undefined)
                        }}
                        className="text-xs text-red-400 hover:text-red-600"
                      >
                        ✕
                      </button>
                    </div>
                  ) : (
                    <Button
                      variant="ghost"
                      size="sm"
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                    >
                      📎 Anexar arquivo
                    </Button>
                  )}
                </div>
              </div>
            )}
          </Modal.Body>
          <Modal.Footer>
            {reportModal.mode === 'view' ? (
              <>
                <Button variant="danger" size="sm" onClick={handleDeleteReport}>
                  Excluir
                </Button>
                <div className="flex-1" />
                <Button variant="ghost" onClick={() => setReportModal(null)}>
                  Fechar
                </Button>
                <Button onClick={() => setReportModal({ ...reportModal, mode: 'edit' })}>
                  Editar
                </Button>
              </>
            ) : (
              <>
                <Button variant="ghost" onClick={() => setReportModal(null)}>
                  Cancelar
                </Button>
                <Button onClick={handleSaveReport} disabled={createReport.isPending || updateReport.isPending}>
                  Salvar
                </Button>
              </>
            )}
          </Modal.Footer>
        </Modal>
      )}
    </>
  )
}
