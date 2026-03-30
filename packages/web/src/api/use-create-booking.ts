import { useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../config/api.ts';
import type { BookingRequest, BookingResponse } from '@soberano/shared';

export function useCreateBooking() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: BookingRequest) =>
      api.post<BookingResponse>('/book', input),
    onSuccess: (_, input) => {
      queryClient.invalidateQueries({ queryKey: ['slots', input.barberId, input.date] });
    },
  });
}
