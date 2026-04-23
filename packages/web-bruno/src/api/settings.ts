import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { apiFetch } from './http-client'

export interface ProviderProfile {
  id: string
  firstName: string
  lastName: string
  phone: string | null
  avatarUrl: string | null
  pixKey: string | null
  messageTemplate: string | null
}

export interface Shift {
  id: string
  dayOfWeek: number
  startTime: string
  endTime: string
}

export interface Absence {
  id: string
  date: string
  startTime: string | null
  endTime: string | null
  reason: string | null
}

export interface Service {
  id: string
  slug: string
  name: string
  icon: string
  priceCents: number
  duration: number
}

export function useProviderProfile() {
  return useQuery({
    queryKey: ['provider-profile'],
    queryFn: () => apiFetch<ProviderProfile>('/api/admin/me'),
  })
}

export function useUpdateProviderProfile() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: Partial<Pick<ProviderProfile, 'phone' | 'pixKey' | 'messageTemplate'>>) =>
      apiFetch<ProviderProfile>('/api/admin/me', {
        method: 'PATCH',
        body: JSON.stringify(data),
      }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['provider-profile'] }),
  })
}

export function useShifts() {
  return useQuery({
    queryKey: ['shifts'],
    queryFn: () => apiFetch<{ shifts: Shift[] }>('/api/admin/schedule/shifts'),
  })
}

export function useUpdateShifts() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (shifts: Array<Pick<Shift, 'dayOfWeek' | 'startTime' | 'endTime'>>) =>
      apiFetch<{ message: string }>('/api/admin/schedule/shifts', {
        method: 'PUT',
        body: JSON.stringify({ shifts }),
      }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['shifts'] }),
  })
}

export function useAbsences() {
  return useQuery({
    queryKey: ['absences'],
    queryFn: () => apiFetch<{ absences: Absence[] }>('/api/admin/schedule/absences'),
  })
}

export function useCreateAbsence() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: { date: string; startTime?: string; endTime?: string; reason?: string }) =>
      apiFetch<{ absence: Absence }>('/api/admin/schedule/absences', {
        method: 'POST',
        body: JSON.stringify(data),
      }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['absences'] }),
  })
}

export function useDeleteAbsence() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) =>
      apiFetch<void>(`/api/admin/schedule/absences/${id}`, { method: 'DELETE' }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['absences'] }),
  })
}

export function useServices() {
  return useQuery({
    queryKey: ['services'],
    queryFn: () => apiFetch<{ services: Service[] }>('/api/services'),
  })
}
