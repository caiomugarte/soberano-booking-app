import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { authRequest } from './auth-request.ts';

export interface Shift {
  id?: string;
  dayOfWeek: number;
  startTime: string;
  endTime: string;
}

export interface Absence {
  id: string;
  date: string;
  startTime: string | null;
  endTime: string | null;
  reason: string | null;
}

export function useShifts() {
  return useQuery({
    queryKey: ['shifts'],
    queryFn: () => authRequest<{ shifts: Shift[] }>('/admin/schedule/shifts').then((r) => r.shifts),
  });
}

export function useUpdateShifts() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (shifts: Omit<Shift, 'id'>[]) =>
      authRequest('/admin/schedule/shifts', { method: 'PUT', body: JSON.stringify({ shifts }) }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['shifts'] }),
  });
}

export function useAbsences() {
  return useQuery({
    queryKey: ['absences'],
    queryFn: () => authRequest<{ absences: Absence[] }>('/admin/schedule/absences').then((r) => r.absences),
  });
}

export function useAddAbsence() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: { date: string; startTime?: string; endTime?: string; reason?: string }) =>
      authRequest('/admin/schedule/absences', { method: 'POST', body: JSON.stringify(data) }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['absences'] }),
  });
}

export function useDeleteAbsence() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) =>
      authRequest(`/admin/schedule/absences/${id}`, { method: 'DELETE' }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['absences'] }),
  });
}
