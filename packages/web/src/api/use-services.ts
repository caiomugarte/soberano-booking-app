import { useQuery } from '@tanstack/react-query';
import { api } from '../config/api.ts';
import type { Service } from '@soberano/shared';

export function useServices() {
  return useQuery({
    queryKey: ['services'],
    queryFn: () => api.get<{ services: Service[] }>('/services').then((r) => r.services),
    staleTime: Infinity,
  });
}
