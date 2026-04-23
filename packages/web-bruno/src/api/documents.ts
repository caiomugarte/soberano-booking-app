import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { apiFetch } from './http-client'

interface ApiDocument {
  id: string
  customerId: string
  name: string
  type: string
  data: string
  createdAt: string
}

interface MappedDocument {
  id: string
  patientId: string
  name: string
  fileName: string
  fileType: string
  fileData: string
  createdAt: string
}

function mapDocument(d: ApiDocument): MappedDocument {
  return {
    id: d.id,
    patientId: d.customerId,
    name: d.name,
    fileName: d.name,
    fileType: d.type,
    fileData: d.data,
    createdAt: typeof d.createdAt === 'string' ? d.createdAt : new Date(d.createdAt).toISOString(),
  }
}

export function usePatientDocuments(patientId: string | undefined) {
  return useQuery({
    queryKey: ['documents', patientId],
    queryFn: async () => {
      const docs = await apiFetch<ApiDocument[]>(
        `/api/psychology/patients/${patientId}/documents`,
      )
      return docs.map(mapDocument)
    },
    enabled: !!patientId,
  })
}

export function useCreateDocument() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: {
      patientId: string
      name: string
      fileName?: string
      fileType: string
      fileData: string
    }) =>
      apiFetch<ApiDocument>(`/api/psychology/patients/${data.patientId}/documents`, {
        method: 'POST',
        body: JSON.stringify({
          name: data.name,
          type: data.fileType,
          data: data.fileData,
        }),
      }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['documents'] }),
  })
}

export function useDeleteDocument() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) =>
      apiFetch<void>(`/api/psychology/documents/${id}`, { method: 'DELETE' }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['documents'] }),
  })
}
