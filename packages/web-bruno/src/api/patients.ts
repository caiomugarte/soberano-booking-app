import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { apiFetch } from './http-client'
import type { Patient, PatientFormData } from '@/schemas/patient.schema'

type PatientUpdateData = {
  name?: string
  phone?: string | null
  email?: string | null
  cpf?: string | null
  notes?: string | null
}

export function usePatients(search?: string) {
  return useQuery({
    queryKey: ['patients', { search }],
    queryFn: () =>
      apiFetch<Patient[]>(
        `/api/psychology/patients${search ? `?search=${encodeURIComponent(search)}` : ''}`,
      ),
  })
}

export function usePatient(id: string | undefined) {
  return useQuery({
    queryKey: ['patients', id],
    queryFn: () => apiFetch<Patient>(`/api/psychology/patients/${id}`),
    enabled: !!id,
  })
}

export function useCreatePatient() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: PatientFormData) =>
      apiFetch<Patient>('/api/psychology/patients', {
        method: 'POST',
        body: JSON.stringify(data),
      }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['patients'] }),
  })
}

export function useUpdatePatient() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: PatientUpdateData }) =>
      apiFetch<Patient>(`/api/psychology/patients/${id}`, {
        method: 'PATCH',
        body: JSON.stringify(data),
      }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['patients'] }),
  })
}

export function useDeletePatient() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) =>
      apiFetch<void>(`/api/psychology/patients/${id}`, { method: 'DELETE' }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['patients'] }),
  })
}
