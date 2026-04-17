import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useAuthStore } from '../stores/auth.store.ts';
import { authRequest, API_BASE } from './auth-request.ts';
import { TENANT_SLUG } from '../config/env.js';
import { api } from '../config/api.ts';

export interface AdminAppointment {
  id: string;
  date: string;
  startTime: string;
  endTime: string;
  status: string;
  priceCents: number;
  service: { id: string; name: string; icon: string };
  customer: { name: string; phone: string };
  barber: { firstName: string; lastName: string; avatarUrl: string | null };
}

export interface AdminMe {
  id: string;
  firstName: string;
  lastName: string;
  avatarUrl: string | null;
}

export function useAdminMe() {
  return useQuery({
    queryKey: ['admin-me'],
    queryFn: () => authRequest<AdminMe>('/admin/me'),
    staleTime: Infinity,
  });
}

export function useLogin() {
  const setAccessToken = useAuthStore((s) => s.setAccessToken);
  return useMutation({
    mutationFn: (data: { email: string; password: string }) =>
      fetch(`${API_BASE}/api/auth/login`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json', 'X-Tenant-Slug': TENANT_SLUG },
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
  summary: { confirmed: number; completed: number; revenueCents: number };
}

export function useAdminAppointments(date: string) {
  return useQuery({
    queryKey: ['admin-appointments', date],
    queryFn: () => authRequest<AppointmentPage>(`/admin/appointments?date=${date}`),
    refetchInterval: 1000 * 60,
  });
}

export function useDeleteAppointment() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) =>
      authRequest(`/admin/appointments/${id}`, { method: 'DELETE' }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-appointments'] });
    },
  });
}

export interface DayStat {
  date: string;
  confirmed: number;
  completed: number;
  revenueCents: number;
}

export function useAdminAppointmentsRange(from: string, to: string) {
  return useQuery({
    queryKey: ['admin-appointments-range', from, to],
    queryFn: () =>
      authRequest<{ appointments: AdminAppointment[] }>(`/admin/appointments/range?from=${from}&to=${to}`)
        .then((r) => r.appointments),
    staleTime: 60 * 1000,
  });
}

export function useAdminStats(from: string, to: string) {
  return useQuery({
    queryKey: ['admin-stats', from, to],
    queryFn: () => authRequest<{ days: DayStat[] }>(`/admin/stats?from=${from}&to=${to}`).then((r) => r.days),
    staleTime: 5 * 60 * 1000,
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

export interface AdminBookingInput {
  serviceId: string;
  date: string;
  startTime: string;
  customerName: string;
  customerPhone?: string;
  priceCents?: number;
}

export function useAdminCreateBooking() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: AdminBookingInput) =>
      authRequest('/admin/appointments', {
        method: 'POST',
        body: JSON.stringify(input),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-appointments'] });
    },
  });
}

export function useAdminUpdateAppointmentSchedule() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, serviceId, date, startTime }: { id: string; serviceId?: string; date?: string; startTime?: string }) =>
      authRequest(`/admin/appointments/${id}/schedule`, {
        method: 'PATCH',
        body: JSON.stringify({ serviceId, date, startTime }),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-appointments'] });
    },
  });
}

export function useAdminUpdateAppointmentCustomer() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, name, phone }: { id: string; name?: string; phone?: string }) =>
      authRequest(`/admin/appointments/${id}/customer`, {
        method: 'PATCH',
        body: JSON.stringify({ name, phone }),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-appointments'] });
    },
  });
}

export function useAdminCustomerLookup(phone: string) {
  return useQuery({
    queryKey: ['admin-customer-lookup', phone],
    queryFn: () => api.get<{ name: string | null }>('/customer/name?phone=' + phone),
    enabled: phone.length >= 10,
    staleTime: 30_000,
  });
}
