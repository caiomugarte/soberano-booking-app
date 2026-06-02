import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { apiFetch } from './http-client'
import { getTodayDateInputValue } from '@/lib/format'
import type { Patient, PatientFormData } from '@/schemas/patient.schema'

type PatientUpdateData = {
  name?: string
  phone?: string | null
  email?: string | null
  cpf?: string | null
  notes?: string | null
  psychotherapyPriceCents?: Patient['psychotherapyPriceCents'] | null
  psychotherapyFrequency?: Patient['psychotherapyFrequency'] | null
  neuromodulationEligible?: Patient['neuromodulationEligible']
  parentsMeetingStatus?: Patient['parentsMeetingStatus'] | null
  birthDate?: Patient['birthDate'] | null
  address?: Patient['address'] | null
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

function isBirthdayToday(patient: Patient, today: string): boolean {
  return Boolean(patient.birthDate) && patient.birthDate!.slice(5, 10) === today.slice(5, 10)
}

export function useTodayBirthdays() {
  const query = usePatients()
  const today = getTodayDateInputValue()

  return {
    ...query,
    data: (query.data ?? []).filter((patient) => isBirthdayToday(patient, today)),
  }
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
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ['patients'] })
    },
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
    onSuccess: async (_, variables) => {
      await Promise.all([
        qc.invalidateQueries({ queryKey: ['patients'] }),
        qc.invalidateQueries({ queryKey: ['patients', variables.id] }),
      ])
    },
  })
}

export function useDeletePatient() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) =>
      apiFetch<void>(`/api/psychology/patients/${id}`, { method: 'DELETE' }),
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ['patients'] })
    },
  })
}
