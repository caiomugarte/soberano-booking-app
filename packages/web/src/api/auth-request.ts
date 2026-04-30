import { useAuthStore } from '../stores/auth.store.ts';
import { API_BASE } from '../config/api.ts';
import { TENANT_SLUG } from '../config/env.js';
import { refreshAccessToken } from './auth-session.ts';

export { API_BASE };

export async function authRequest<T>(path: string, options?: RequestInit): Promise<T> {
  const makeRequest = (token: string | null) =>
    fetch(`${API_BASE}${path}`, {
      credentials: 'include',
      ...options,
      headers: {
        'X-Tenant-Slug': TENANT_SLUG,
        ...(options?.body ? { 'Content-Type': 'application/json' } : {}),
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...options?.headers,
      },
    });

  let token = useAuthStore.getState().accessToken;
  let res = await makeRequest(token);

  // Token expired — try to refresh once and retry
  if (res.status === 401) {
    const newToken = await refreshAccessToken();
    if (newToken) {
      res = await makeRequest(newToken);
    } else {
      await useAuthStore.getState().logout();
      throw new Error('Sessão expirada. Faça login novamente.');
    }
  }

  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.message ?? 'Erro inesperado.');
  }

  if (res.status === 204) return undefined as T;
  return res.json() as Promise<T>;
}
