import { useRef } from 'react'
import { usePatientDocuments, useCreateDocument, useDeleteDocument } from '@/api/documents'
import { Panel } from '@/components/ui/Panel'
import { Button } from '@/components/ui/Button'
import { EmptyState } from '@/components/ui/EmptyState'

interface PatientDocumentsProps {
  patientId: string
}

function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result as string)
    reader.onerror = reject
    reader.readAsDataURL(file)
  })
}

function formatFileSize(dataUrl: string) {
  const base64 = dataUrl.split(',')[1] ?? ''
  const bytes = Math.round((base64.length * 3) / 4)
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

export function PatientDocuments({ patientId }: PatientDocumentsProps) {
  const { data: documents = [] } = usePatientDocuments(patientId)
  const createDocument = useCreateDocument()
  const deleteDocument = useDeleteDocument()
  const inputRef = useRef<HTMLInputElement>(null)

  async function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return

    const fileData = await fileToBase64(file)
    createDocument.mutate({
      patientId,
      name: file.name,
      fileName: file.name,
      fileType: file.type,
      fileData,
    })

    if (inputRef.current) inputRef.current.value = ''
  }

  function handleDownload(doc: { fileName: string; fileData: string; fileType: string }) {
    const link = document.createElement('a')
    link.href = doc.fileData
    link.download = doc.fileName
    link.click()
  }

  function handleDelete(id: string) {
    if (window.confirm('Excluir este documento?')) {
      deleteDocument.mutate(id)
    }
  }

  const fileIcon = (type: string) => {
    if (type.startsWith('image/')) return '🖼️'
    if (type.includes('pdf')) return '📄'
    if (type.includes('word') || type.includes('document')) return '📝'
    if (type.includes('sheet') || type.includes('excel')) return '📊'
    return '📎'
  }

  return (
    <Panel>
      <div className="flex items-center justify-between border-b border-gray-100 px-4 py-3">
        <h3 className="text-sm font-semibold text-gray-700">Documentos</h3>
        <div>
          <input
            ref={inputRef}
            type="file"
            onChange={handleFileSelect}
            className="hidden"
            accept=".pdf,.doc,.docx,.xls,.xlsx,.png,.jpg,.jpeg,.txt"
          />
          <Button
            variant="secondary"
            size="sm"
            onClick={() => inputRef.current?.click()}
            disabled={createDocument.isPending}
          >
            + Adicionar
          </Button>
        </div>
      </div>
      <Panel.Body>
        {documents.length === 0 ? (
          <EmptyState title="Nenhum documento" description="Adicione documentos do paciente" />
        ) : (
          <div className="space-y-2">
            {documents.map((doc) => (
              <div
                key={doc.id}
                className="flex items-center gap-3 rounded-lg border border-gray-100 px-3 py-2"
              >
                <span className="text-lg">{fileIcon(doc.fileType)}</span>
                <div className="flex-1 min-w-0">
                  <div className="truncate text-sm font-medium text-gray-700">{doc.name}</div>
                  <div className="text-xs text-gray-400">
                    {formatFileSize(doc.fileData)} · {new Date(doc.createdAt).toLocaleDateString('pt-BR')}
                  </div>
                </div>
                <button
                  onClick={() => handleDownload(doc)}
                  className="text-xs text-primary-500 hover:text-primary-700"
                  title="Baixar"
                >
                  ↓
                </button>
                <button
                  onClick={() => handleDelete(doc.id)}
                  className="text-xs text-red-400 hover:text-red-600"
                  title="Excluir"
                >
                  ✕
                </button>
              </div>
            ))}
          </div>
        )}
      </Panel.Body>
    </Panel>
  )
}
