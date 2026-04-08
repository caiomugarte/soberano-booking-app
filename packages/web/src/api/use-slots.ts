import { useQuery } from '@tanstack/react-query';
import { api } from '../config/api.ts';

export interface Slot {
  time: string;
  available: boolean;
}

export function useSlots(barberId: string | null, date: string | null, excludeId?: string) {
  return useQuery({
    queryKey: ['slots', barberId, date, excludeId],
    queryFn: () => {
      const params = new URLSearchParams({ barberId: barberId!, date: date! });
      if (excludeId) params.set('excludeId', excludeId);
      return api.get<{ slots: Slot[] }>(`/slots?${params}`).then((r) => r.slots);
    },
    enabled: !!barberId && !!date,
    staleTime: 1000 * 30,
  });
}
