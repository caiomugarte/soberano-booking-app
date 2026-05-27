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
  packageId: string | null;
  service: { id: string; name: string; icon: string };
  customer: { name: string; phone: string | null };
  barber: { firstName: string; lastName: string; avatarUrl: string | null };
  package: { appointmentNumber: number; totalUses: number; totalPriceCents: number } | null;
}

export interface AdminMe {
  id: string;
  firstName: string;
  lastName: string;
  avatarUrl: string | null;
}

export function useAdminMe() {
  const accessToken = useAuthStore((s) => s.accessToken);
  return useQuery({
    queryKey: ['admin-me'],
    queryFn: () => authRequest<AdminMe>('/admin/me'),
    staleTime: Infinity,
    enabled: !!accessToken,
  });
}

export function useLogin() {
  const setAccessToken = useAuthStore((s) => s.setAccessToken);
  return useMutation({
    mutationFn: (data: { email: string; password: string }) =>
      fetch(`${API_BASE}/auth/login`, {
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
  const accessToken = useAuthStore((s) => s.accessToken);
  return useQuery({
    queryKey: ['admin-appointments', date],
    queryFn: () => authRequest<AppointmentPage>(`/admin/appointments?date=${date}`),
    refetchInterval: 1000 * 60,
    enabled: !!accessToken,
  });
}

export function useDeleteAppointment() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: string | { id: string; packageId?: string | null }) =>
      authRequest(`/admin/appointments/${typeof input === 'string' ? input : input.id}`, { method: 'DELETE' }),
    onSuccess: (_data, input) => {
      queryClient.invalidateQueries({ queryKey: ['admin-appointments'] });
      if (typeof input !== 'string' && input.packageId) {
        invalidatePackageQueries(queryClient);
      }
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
  const accessToken = useAuthStore((s) => s.accessToken);
  return useQuery({
    queryKey: ['admin-appointments-range', from, to],
    queryFn: () =>
      authRequest<{ appointments: AdminAppointment[] }>(`/admin/appointments/range?from=${from}&to=${to}`)
        .then((r) => r.appointments),
    staleTime: 60 * 1000,
    enabled: !!accessToken,
  });
}

export function useAdminStats(from: string, to: string) {
  const accessToken = useAuthStore((s) => s.accessToken);
  return useQuery({
    queryKey: ['admin-stats', from, to],
    queryFn: () => authRequest<{ days: DayStat[] }>(`/admin/stats?from=${from}&to=${to}`).then((r) => r.days),
    staleTime: 5 * 60 * 1000,
    enabled: !!accessToken,
  });
}

export function useUpdateAppointmentStatus() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, status }: { id: string; status: string; packageId?: string | null }) =>
      authRequest(`/admin/appointments/${id}`, {
        method: 'PATCH',
        body: JSON.stringify({ status }),
      }),
    onSuccess: (_data, input) => {
      queryClient.invalidateQueries({ queryKey: ['admin-appointments'] });
      if (input.packageId) {
        invalidatePackageQueries(queryClient);
      }
    },
  });
}

export function useAdminCancelAppointment() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, reason }: { id: string; reason: string; packageId?: string | null }) =>
      authRequest(`/admin/appointments/${id}/cancel`, {
        method: 'POST',
        body: JSON.stringify({ reason }),
      }),
    onSuccess: (_data, input) => {
      queryClient.invalidateQueries({ queryKey: ['admin-appointments'] });
      if (input.packageId) {
        invalidatePackageQueries(queryClient);
      }
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
  packageId?: string;
}

export type CustomerPackageStatus = 'active' | 'completed' | 'cancelled';

export interface CustomerPackage {
  id: string;
  providerId: string;
  customerName: string;
  customerPhone: string | null;
  totalUses: number;
  usedCount: number;
  totalPriceCents: number;
  status: CustomerPackageStatus;
  createdAt: string;
  updatedAt: string;
}

export interface CustomerPackageProgress {
  appointmentNumber: number;
  totalUses: number;
  totalPriceCents: number;
}

export interface CustomerPackageLinkedAppointment {
  id: string;
  providerId: string;
  date: string;
  startTime: string;
  endTime: string;
  status: string;
  priceCents: number;
  service: { id: string; name: string; icon: string };
  customer: { id: string; name: string; phone: string | null };
  packageProgress: CustomerPackageProgress;
}

export interface CustomerPackageDetails extends CustomerPackage {
  linkedAppointments: CustomerPackageLinkedAppointment[];
}

export interface AdminCreatePackageInput {
  customerName: string;
  customerPhone?: string;
  totalUses: number;
  totalPriceCents: number;
}

export const adminPackageQueryKeys = {
  all: ['admin-packages'] as const,
  byPhone: (phone: string) => ['admin-packages', 'phone', phone] as const,
  list: (status: CustomerPackageStatus | 'all') => ['admin-packages', 'list', status] as const,
  details: (packageId: string) => ['admin-packages', 'details', packageId] as const,
};

function invalidatePackageQueries(queryClient: ReturnType<typeof useQueryClient>) {
  queryClient.invalidateQueries({ queryKey: adminPackageQueryKeys.all });
}

export function useAdminCreateBooking() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: AdminBookingInput) =>
      authRequest('/admin/appointments', {
        method: 'POST',
        body: JSON.stringify(input),
      }),
    onSuccess: (_data, input) => {
      queryClient.invalidateQueries({ queryKey: ['admin-appointments'] });
      if (input.packageId) {
        invalidatePackageQueries(queryClient);
      }
    },
  });
}

export function useAdminUpdateAppointmentSchedule() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, serviceId, date, startTime }: { id: string; serviceId?: string; date?: string; startTime?: string; packageId?: string | null }) =>
      authRequest(`/admin/appointments/${id}/schedule`, {
        method: 'PATCH',
        body: JSON.stringify({ serviceId, date, startTime }),
      }),
    onSuccess: (_data, input) => {
      queryClient.invalidateQueries({ queryKey: ['admin-appointments'] });
      if (input.packageId) {
        invalidatePackageQueries(queryClient);
      }
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

export function useAdminCreatePackage() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: AdminCreatePackageInput) =>
      authRequest<CustomerPackage>('/admin/packages', {
        method: 'POST',
        body: JSON.stringify(input),
      }),
    onSuccess: () => {
      invalidatePackageQueries(queryClient);
    },
  });
}

export function useAdminCustomerPackages(phone: string) {
  const accessToken = useAuthStore((s) => s.accessToken);
  return useQuery({
    queryKey: adminPackageQueryKeys.byPhone(phone),
    queryFn: () => authRequest<{ packages: CustomerPackage[] }>('/admin/packages?phone=' + phone).then((r) => r.packages),
    enabled: !!accessToken && phone.length >= 10,
    staleTime: 30_000,
  });
}

export function useAdminPackages(status?: CustomerPackageStatus) {
  const accessToken = useAuthStore((s) => s.accessToken);
  return useQuery({
    queryKey: adminPackageQueryKeys.list(status ?? 'all'),
    queryFn: () =>
      authRequest<{ packages: CustomerPackage[] }>(
        '/admin/packages' + (status ? `?status=${status}` : ''),
      ).then((r) => r.packages),
    staleTime: 30_000,
    enabled: !!accessToken,
  });
}

export function useAdminPackageDetails(packageId: string | null) {
  const accessToken = useAuthStore((s) => s.accessToken);
  return useQuery({
    queryKey: packageId ? adminPackageQueryKeys.details(packageId) : adminPackageQueryKeys.all,
    queryFn: () =>
      authRequest<{ package: CustomerPackageDetails }>(`/admin/packages/${packageId}`).then((r) => r.package),
    staleTime: 30_000,
    enabled: !!accessToken && !!packageId,
  });
}

export function useAdminDeactivatePackage() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) =>
      authRequest(`/admin/packages/${id}/deactivate`, { method: 'PATCH' }),
    onSuccess: () => {
      invalidatePackageQueries(queryClient);
    },
  });
}

export function useAdminDeletePackage() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) =>
      authRequest(`/admin/packages/${id}`, { method: 'DELETE' }),
    onSuccess: () => {
      invalidatePackageQueries(queryClient);
    },
  });
}
