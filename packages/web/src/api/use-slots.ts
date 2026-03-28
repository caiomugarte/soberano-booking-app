import { useQuery } from '@tanstack/react-query';
import { api } from '../config/api.ts';

export function useSlots(barberId: string | null, date: string | null) {
  return useQuery({
    queryKey: ['slots', barberId, date],
    queryFn: () =>
      api
        .get<{ slots: string[] }>(`/slots?barberId=${barberId}&date=${date}`)
        .then((r) => r.slots),
    enabled: !!barberId && !!date,
    staleTime: 1000 * 30, // 30 seconds — slots change frequently
  });
}
