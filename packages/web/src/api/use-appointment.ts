import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../config/api.ts';

export interface AppointmentView {
  id: string;
  barberId: string;
  date: string;
  startTime: string;
  endTime: string;
  status: string;
  priceCents: number;
  cancelToken?: string;
  service: { name: string; icon: string };
  barber: { firstName: string; lastName: string };
  customer: { name: string; phoneLast4: string };
}

export function useAppointment(token: string) {
  return useQuery({
    queryKey: ['appointment', token],
    queryFn: () =>
      api.get<{ appointment: AppointmentView }>(`/appointment/${token}`).then((r) => r.appointment),
  });
}

export function useCancelAppointment(token: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (phoneLastFour: string) =>
      api.patch<{ message: string }>(`/appointment/${token}/cancel`, { phoneLastFour }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['appointment', token] });
    },
  });
}

export function useChangeAppointment(token: string, onNewToken: (newToken: string) => void) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: { phoneLastFour: string; date: string; startTime: string }) =>
      api.patch<{ appointment: AppointmentView }>(`/appointment/${token}/change`, data).then((r) => r.appointment),
    onSuccess: (appointment) => {
      queryClient.invalidateQueries({ queryKey: ['appointment', token] });
      if (appointment.cancelToken) {
        onNewToken(appointment.cancelToken);
      }
    },
  });
}
