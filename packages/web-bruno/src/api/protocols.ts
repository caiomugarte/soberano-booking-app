import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { apiFetch } from './http-client'
import type { Protocol, ProtocolFormData } from '@/schemas/protocol.schema'

type ProtocolUpdateData = Partial<ProtocolFormData>

export function usePatientProtocols(patientId: string | undefined) {
  return useQuery({
    queryKey: ['protocols', 'patient', patientId],
    queryFn: () => apiFetch<Protocol[]>(`/api/psychology/patients/${patientId}/protocols`),
    enabled: !!patientId,
  })
}

export function useProtocol(protocolId: string | undefined) {
  return useQuery({
    queryKey: ['protocols', protocolId],
    queryFn: () => apiFetch<Protocol>(`/api/psychology/protocols/${protocolId}`),
    enabled: !!protocolId,
  })
}

async function invalidateProtocolContext(qc: ReturnType<typeof useQueryClient>, patientId: string) {
  await Promise.all([
    qc.invalidateQueries({ queryKey: ['patients'] }),
    qc.invalidateQueries({ queryKey: ['patients', patientId] }),
    qc.invalidateQueries({ queryKey: ['appointments'] }),
    qc.invalidateQueries({ queryKey: ['protocols'] }),
    qc.invalidateQueries({ queryKey: ['financial'] }),
  ])
}

export function useCreateProtocol(patientId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: ProtocolUpdateData) =>
      apiFetch<Protocol>(`/api/psychology/patients/${patientId}/protocols`, {
        method: 'POST',
        body: JSON.stringify(data),
      }),
    onSuccess: async () => {
      await invalidateProtocolContext(qc, patientId)
    },
  })
}

export function useUpdateProtocol() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, data }: { id: string; patientId: string; data: ProtocolUpdateData }) =>
      apiFetch<Protocol>(`/api/psychology/protocols/${id}`, {
        method: 'PATCH',
        body: JSON.stringify(data),
      }),
    onSuccess: async (_, variables) => {
      await invalidateProtocolContext(qc, variables.patientId)
      await qc.invalidateQueries({ queryKey: ['protocols', variables.id] })
    },
  })
}

export function useChangeProtocolStatus() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, status }: { id: string; patientId: string; status: Protocol['status'] }) =>
      apiFetch<Protocol>(`/api/psychology/protocols/${id}/status`, {
        method: 'PATCH',
        body: JSON.stringify({ status }),
      }),
    onSuccess: async (_, variables) => {
      await invalidateProtocolContext(qc, variables.patientId)
      await qc.invalidateQueries({ queryKey: ['protocols', variables.id] })
    },
  })
}

export function useDeleteProtocol() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id }: { id: string; patientId: string }) =>
      apiFetch<void>(`/api/psychology/protocols/${id}`, {
        method: 'DELETE',
      }),
    onSuccess: async (_, variables) => {
      await invalidateProtocolContext(qc, variables.patientId)
      await qc.invalidateQueries({ queryKey: ['protocols', variables.id] })
    },
  })
}
