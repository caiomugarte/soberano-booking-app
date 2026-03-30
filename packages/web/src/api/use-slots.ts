import { useQuery } from '@tanstack/react-query';
import { api } from '../config/api.ts';

export interface Slot {
  time: string;
  available: boolean;
}

export function useSlots(barberId: string | null, date: string | null) {
  return useQuery({
    queryKey: ['slots', barberId, date],
    queryFn: () =>
      api
        .get<{ slots: Slot[] }>(`/slots?barberId=${barberId}&date=${date}`)
        .then((r) => r.slots),
    enabled: !!barberId && !!date,
    staleTime: 1000 * 30,
  });
}
