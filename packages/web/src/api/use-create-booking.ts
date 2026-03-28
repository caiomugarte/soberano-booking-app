import { useMutation } from '@tanstack/react-query';
import { api } from '../config/api.ts';
import type { BookingRequest, BookingResponse } from '@soberano/shared';

export function useCreateBooking() {
  return useMutation({
    mutationFn: (input: BookingRequest) =>
      api.post<BookingResponse>('/book', input),
  });
}
