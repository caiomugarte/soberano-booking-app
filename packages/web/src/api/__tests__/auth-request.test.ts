import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { authRequest } from '../auth-request.ts';
import { useAuthStore } from '../../stores/auth.store.ts';

describe('authRequest', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn());
    useAuthStore.setState({ accessToken: 'expired-token', isInitialized: true });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('reuses a single refresh request across concurrent 401 responses', async () => {
    vi.mocked(fetch)
      .mockResolvedValueOnce({
        status: 401,
        ok: false,
        json: async () => ({ message: 'expired' }),
      } as Response)
      .mockResolvedValueOnce({
        status: 401,
        ok: false,
        json: async () => ({ message: 'expired' }),
      } as Response)
      .mockResolvedValueOnce({
        status: 200,
        ok: true,
        json: async () => ({ accessToken: 'fresh-token' }),
      } as Response)
      .mockResolvedValueOnce({
        status: 200,
        ok: true,
        json: async () => ({ appointments: [], total: 0, summary: { confirmed: 0, completed: 0, revenueCents: 0 } }),
      } as Response)
      .mockResolvedValueOnce({
        status: 200,
        ok: true,
        json: async () => ({ appointments: [], total: 0, summary: { confirmed: 0, completed: 0, revenueCents: 0 } }),
      } as Response);

    await Promise.all([
      authRequest('/admin/appointments?date=2026-04-30'),
      authRequest('/admin/appointments?date=2026-04-30'),
    ]);

    const refreshCalls = vi.mocked(fetch).mock.calls.filter(([url]) => url === '/api/auth/refresh');
    expect(refreshCalls).toHaveLength(1);
    expect(useAuthStore.getState().accessToken).toBe('fresh-token');
  });

  it('refreshes before the first protected request when no access token is in memory', async () => {
    useAuthStore.setState({ accessToken: null, isInitialized: true });

    vi.mocked(fetch)
      .mockResolvedValueOnce({
        status: 200,
        ok: true,
        json: async () => ({ accessToken: 'fresh-token' }),
      } as Response)
      .mockResolvedValueOnce({
        status: 200,
        ok: true,
        json: async () => ({ id: 'provider-1', firstName: 'Matheus', lastName: 'Silva', avatarUrl: null }),
      } as Response);

    await authRequest('/admin/me');

    expect(vi.mocked(fetch).mock.calls[0]?.[0]).toBe('/api/auth/refresh');
    expect(vi.mocked(fetch).mock.calls[1]?.[0]).toBe('/api/admin/me');
    expect(vi.mocked(fetch).mock.calls[1]?.[1]).toMatchObject({
      headers: expect.objectContaining({
        Authorization: 'Bearer fresh-token',
      }),
    });
  });
});
