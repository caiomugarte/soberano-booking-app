import { useQuery } from '@tanstack/react-query';
import { api } from '../config/api.ts';
import type { Barber } from '@soberano/shared';

export function useBarbers() {
  return useQuery({
    queryKey: ['barbers'],
    queryFn: () => api.get<{ barbers: Barber[] }>('/barbers').then((r) => r.barbers),
    staleTime: Infinity,
  });
}
