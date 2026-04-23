import { useState, useRef } from 'react'
import { usePatientAppointments, useUpdateAppointment } from '@/api/appointments'
import { usePatientReports, useCreateSessionReport, useUpdateSessionReport, useDeleteSessionReport } from '@/api/session-reports'
import { Modal } from '@/components/ui/Modal'
import { Panel } from '@/components/ui/Panel'
import { Button } from '@/components/ui/Button'
import { Textarea } from '@/components/ui/Textarea'
import { AppointmentStatusBadge, PaymentStatusBadge } from '@/components/ui/StatusBadge'
import { WhatsAppButton } from '@/components/whatsapp/WhatsAppButton'
import { EmptyState } from '@/components/ui/EmptyState'
import { formatDate, formatCurrency } from '@/lib/format'
import { SESSION_TYPE_LABELS } from '@/config/constants'
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
  const createReport = useCreateSessionReport()
  const updateReport = useUpdateSessionReport()
  const deleteReport = useDeleteSessionReport()

  const [reportModal, setReportModal] = useState<{ appointmentId: string; mode: 'view' | 'edit' } | null>(null)
  const [reportText, setReportText] = useState('')
  const [reportFileName, setReportFileName] = useState<string | undefined>()
  const [reportFileType, setReportFileType] = useState<string | undefined>()
  const [reportFileData, setReportFileData] = useState<string | undefined>()
  const fileInputRef = useRef<HTMLInputElement>(null)

  function handleMarkPaid(id: string) {
    updateAppointment.mutate({
      id,
      data: { paymentStatus: 'paid', paidAt: new Date().toISOString() },
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

  if (appointments.length === 0) {
    return <EmptyState title="Nenhuma sessão registrada" />
  }

  return (
    <>
      <div className="space-y-2">
        {appointments.map((apt) => {
          const hasReport = !!getReport(apt.id)
          return (
            <Panel key={apt.id}>
              <Panel.Body className="flex items-center justify-between">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium">{formatDate(apt.date)}</span>
                    <span className="text-xs text-gray-400">
                      {apt.startTime} - {apt.endTime}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-gray-500">
                      {SESSION_TYPE_LABELS[apt.type]}
                    </span>
                    <span className="text-xs font-medium">{formatCurrency(apt.value)}</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <AppointmentStatusBadge status={apt.status} />
                    <PaymentStatusBadge status={apt.paymentStatus} />
                    {hasReport && (
                      <span className="inline-flex items-center rounded-full bg-blue-50 px-2 py-0.5 text-xs font-medium text-blue-600">
                        Relatório
                      </span>
                    )}
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button
                    variant={hasReport ? 'ghost' : 'secondary'}
                    size="sm"
                    onClick={() => openReport(apt.id)}
                  >
                    {hasReport ? 'Ver Relatório' : '+ Relatório'}
                  </Button>
                  {apt.paymentStatus === 'pending' && apt.status !== 'cancelled' && (
                    <>
                      <Button variant="secondary" size="sm" onClick={() => handleMarkPaid(apt.id)}>
                        Marcar Pago
                      </Button>
                      {patient.phone && (
                        <WhatsAppButton appointmentId={apt.id} />
                      )}
                    </>
                  )}
                </div>
              </Panel.Body>
            </Panel>
          )
        })}
      </div>

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
                  <div className="flex items-center gap-2 rounded-lg border border-gray-200 px-3 py-2">
                    <span className="text-sm">📎 {reportFileName}</span>
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
                    <div className="flex items-center gap-2 rounded-lg border border-gray-200 px-3 py-2">
                      <span className="flex-1 text-sm">📎 {reportFileName}</span>
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
