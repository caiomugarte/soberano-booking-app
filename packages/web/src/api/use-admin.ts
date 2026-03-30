import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useAuthStore } from '../stores/auth.store.ts';
import { authRequest, API_BASE } from './auth-request.ts';

export interface AdminAppointment {
  id: string;
  date: string;
  startTime: string;
  endTime: string;
  status: string;
  priceCents: number;
  service: { name: string; icon: string };
  customer: { name: string; phone: string };
}

export function useLogin() {
  const setAccessToken = useAuthStore((s) => s.setAccessToken);
  return useMutation({
    mutationFn: (data: { email: string; password: string }) =>
      fetch(`${API_BASE}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      }).then(async (res) => {
        if (!res.ok) {
          const body = await res.json().catch(() => ({}));
          throw new Error(body.message ?? 'Email ou senha incorretos.');
        }
        return res.json() as Promise<{ accessToken: string }>;
      }),
    onSuccess: ({ accessToken }) => setAccessToken(accessToken),
  });
}

export interface AppointmentPage {
  appointments: AdminAppointment[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
  summary: { confirmed: number; completed: number; revenueCents: number };
}

export function useAdminAppointments(date: string, page: number = 1) {
  return useQuery({
    queryKey: ['admin-appointments', date, page],
    queryFn: () => authRequest<AppointmentPage>(`/admin/appointments?date=${date}&page=${page}`),
    refetchInterval: 1000 * 60,
  });
}

export function useUpdateAppointmentStatus() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, status }: { id: string; status: string }) =>
      authRequest(`/admin/appointments/${id}`, {
        method: 'PATCH',
        body: JSON.stringify({ status }),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-appointments'] });
    },
  });
}

export function useAdminCancelAppointment() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, reason }: { id: string; reason: string }) =>
      authRequest(`/admin/appointments/${id}/cancel`, {
        method: 'POST',
        body: JSON.stringify({ reason }),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-appointments'] });
    },
  });
}
