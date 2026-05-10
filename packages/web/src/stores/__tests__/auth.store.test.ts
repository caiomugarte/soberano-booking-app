import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';
import { useAuthStore } from '../auth.store.ts';
import { API_BASE } from '../../config/api.ts';
import { TENANT_SLUG } from '../../config/env.ts';

beforeEach(() => {
  vi.stubGlobal('fetch', vi.fn());
  useAuthStore.setState({ accessToken: null, isInitialized: false });
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('auth store — initial state', () => {
  it('accessToken is null', () => {
    expect(useAuthStore.getState().accessToken).toBeNull();
  });

  it('isInitialized is false', () => {
    expect(useAuthStore.getState().isInitialized).toBe(false);
  });
});

describe('auth store — setAccessToken', () => {
  it('updates accessToken', () => {
    useAuthStore.getState().setAccessToken('tok');
    expect(useAuthStore.getState().accessToken).toBe('tok');
  });
});

describe('auth store — initialize', () => {
  it('200 response: sets accessToken and isInitialized', async () => {
    vi.mocked(fetch).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ accessToken: 'abc' }),
    } as Response);

    await useAuthStore.getState().initialize();

    expect(fetch).toHaveBeenCalledWith(`${API_BASE}/auth/refresh`, {
      method: 'POST',
      credentials: 'include',
      headers: { 'X-Tenant-Slug': TENANT_SLUG },
    });

    const s = useAuthStore.getState();
    expect(s.accessToken).toBe('abc');
    expect(s.isInitialized).toBe(true);
  });

  it('reuses the same refresh request when initialize is called concurrently', async () => {
    let resolveRefresh: ((value: Response) => void) | null = null;

    vi.mocked(fetch).mockImplementationOnce(() => new Promise<Response>((resolve) => {
      resolveRefresh = resolve;
    }));

    const first = useAuthStore.getState().initialize();
    const second = useAuthStore.getState().initialize();

    expect(fetch).toHaveBeenCalledTimes(1);

    resolveRefresh?.({
      ok: true,
      json: async () => ({ accessToken: 'abc' }),
    } as Response);

    await Promise.all([first, second]);

    const s = useAuthStore.getState();
    expect(s.accessToken).toBe('abc');
    expect(s.isInitialized).toBe(true);
  });

  it('non-200 response: accessToken stays null, isInitialized is true', async () => {
    vi.mocked(fetch).mockResolvedValueOnce({
      ok: false,
    } as Response);

    await useAuthStore.getState().initialize();

    const s = useAuthStore.getState();
    expect(s.accessToken).toBeNull();
    expect(s.isInitialized).toBe(true);
  });

  it('fetch throws: accessToken stays null, isInitialized is true', async () => {
    vi.mocked(fetch).mockRejectedValueOnce(new Error('network'));

    await useAuthStore.getState().initialize();

    const s = useAuthStore.getState();
    expect(s.accessToken).toBeNull();
    expect(s.isInitialized).toBe(true);
  });
});

describe('auth store — logout', () => {
  it('clears accessToken and sets isInitialized to true', async () => {
    vi.mocked(fetch).mockResolvedValueOnce({ ok: true } as Response);
    useAuthStore.getState().setAccessToken('tok');

    await useAuthStore.getState().logout();

    expect(fetch).toHaveBeenCalledWith(`${API_BASE}/auth/logout`, {
      method: 'POST',
      credentials: 'include',
      headers: { 'X-Tenant-Slug': TENANT_SLUG },
    });

    const s = useAuthStore.getState();
    expect(s.accessToken).toBeNull();
    expect(s.isInitialized).toBe(true);
  });
});
