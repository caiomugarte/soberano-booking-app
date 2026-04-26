import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { apiFetch } from './http-client'

interface ApiReport {
  id: string
  appointmentId: string
  content: string
  fileName: string | null
  fileType: string | null
  fileData: string | null
  createdAt: string
}

export interface MappedReport {
  id: string
  appointmentId: string
  patientId: string
  text: string
  fileName?: string
  fileType?: string
  fileData?: string
  createdAt: string
}

function mapReport(r: ApiReport, patientId: string): MappedReport {
  return {
    id: r.id,
    appointmentId: r.appointmentId,
    patientId,
    text: r.content,
    fileName: r.fileName ?? undefined,
    fileType: r.fileType ?? undefined,
    fileData: r.fileData ?? undefined,
    createdAt: typeof r.createdAt === 'string' ? r.createdAt : new Date(r.createdAt).toISOString(),
  }
}

export function useSessionReport(appointmentId: string | undefined) {
  return useQuery({
    queryKey: ['session-reports', appointmentId],
    queryFn: async () => {
      const reports = await apiFetch<ApiReport[]>(
        `/api/psychology/sessions/${appointmentId}/reports`,
      )
      return reports.length > 0 ? mapReport(reports[0], '') : null
    },
    enabled: !!appointmentId,
  })
}

export function usePatientReports(patientId: string | undefined) {
  return useQuery({
    queryKey: ['session-reports', 'patient', patientId],
    queryFn: async () => {
      const reports = await apiFetch<ApiReport[]>(
        `/api/psychology/patients/${patientId}/reports`,
      )
      return reports.map((r) => mapReport(r, patientId!))
    },
    enabled: !!patientId,
  })
}

export function useCreateSessionReport() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: {
      appointmentId: string
      patientId: string
      text: string
      fileName?: string
      fileType?: string
      fileData?: string
    }) =>
      apiFetch<ApiReport>(`/api/psychology/sessions/${data.appointmentId}/reports`, {
        method: 'POST',
        body: JSON.stringify({
          content: data.text,
          fileName: data.fileName ?? null,
          fileType: data.fileType ?? null,
          fileData: data.fileData ?? null,
        }),
      }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['session-reports'] }),
  })
}

export function useUpdateSessionReport() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({
      id,
      data,
    }: {
      id: string
      data: Partial<{ text: string; fileName?: string; fileType?: string; fileData?: string }>
    }) =>
      apiFetch<ApiReport>(`/api/psychology/reports/${id}`, {
        method: 'PATCH',
        body: JSON.stringify({
          ...(data.text !== undefined ? { content: data.text } : {}),
          fileName: data.fileName ?? null,
          fileType: data.fileType ?? null,
          fileData: data.fileData ?? null,
        }),
      }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['session-reports'] }),
  })
}

export function useDeleteSessionReport() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) =>
      apiFetch<void>(`/api/psychology/reports/${id}`, { method: 'DELETE' }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['session-reports'] }),
  })
}
