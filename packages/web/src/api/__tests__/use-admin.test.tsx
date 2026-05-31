import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, renderHook } from '@testing-library/react';
import type { ReactNode } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const { authRequestMock } = vi.hoisted(() => ({
  authRequestMock: vi.fn(),
}));

vi.mock('../auth-request.ts', () => ({
  authRequest: authRequestMock,
  API_BASE: '/api',
}));

import {
  adminPackageQueryKeys,
  useAdminCancelAppointment,
  useAdminDeactivatePackage,
} from '../use-admin.ts';

function createWrapper(queryClient: QueryClient) {
  return function Wrapper({ children }: { children: ReactNode }) {
    return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
  };
}

describe('use-admin mutations', () => {
  beforeEach(() => {
    authRequestMock.mockReset();
    authRequestMock.mockResolvedValue({});
  });

  it('invalidates package and appointment queries after package deactivation', async () => {
    const queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
        mutations: { retry: false },
      },
    });
    const invalidateQueries = vi.spyOn(queryClient, 'invalidateQueries');
    const { result } = renderHook(() => useAdminDeactivatePackage(), {
      wrapper: createWrapper(queryClient),
    });

    await act(async () => {
      await result.current.mutateAsync('pkg-1');
    });

    expect(authRequestMock).toHaveBeenCalledWith('/admin/packages/pkg-1/deactivate', {
      method: 'PATCH',
    });
    expect(invalidateQueries).toHaveBeenCalledTimes(4);
    expect(invalidateQueries).toHaveBeenCalledWith({ queryKey: adminPackageQueryKeys.all });
    expect(invalidateQueries).toHaveBeenCalledWith({ queryKey: ['admin-appointments'] });
    expect(invalidateQueries).toHaveBeenCalledWith({ queryKey: ['admin-appointments-range'] });
    expect(invalidateQueries).toHaveBeenCalledWith({ queryKey: ['admin-stats'] });
  });

  it('invalidates package and appointment queries after cancelling a linked appointment', async () => {
    const queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
        mutations: { retry: false },
      },
    });
    const invalidateQueries = vi.spyOn(queryClient, 'invalidateQueries');
    const { result } = renderHook(() => useAdminCancelAppointment(), {
      wrapper: createWrapper(queryClient),
    });

    await act(async () => {
      await result.current.mutateAsync({
        id: 'appt-1',
        reason: 'Cliente pediu cancelamento',
        packageId: 'pkg-1',
      });
    });

    expect(authRequestMock).toHaveBeenCalledWith('/admin/appointments/appt-1/cancel', {
      method: 'POST',
      body: JSON.stringify({ reason: 'Cliente pediu cancelamento' }),
    });
    expect(invalidateQueries).toHaveBeenCalledTimes(4);
    expect(invalidateQueries).toHaveBeenCalledWith({ queryKey: adminPackageQueryKeys.all });
    expect(invalidateQueries).toHaveBeenCalledWith({ queryKey: ['admin-appointments'] });
    expect(invalidateQueries).toHaveBeenCalledWith({ queryKey: ['admin-appointments-range'] });
    expect(invalidateQueries).toHaveBeenCalledWith({ queryKey: ['admin-stats'] });
  });
});
