import { useAuthStore } from '../stores/auth.store.ts';

export const API_BASE = import.meta.env.VITE_API_URL ?? '';

async function tryRefresh(): Promise<string | null> {
  try {
    const res = await fetch(`${API_BASE}/api/auth/refresh`, { method: 'POST', credentials: 'include' });
    if (!res.ok) return null;
    const { accessToken } = await res.json();
    useAuthStore.getState().setAccessToken(accessToken);
    return accessToken;
  } catch {
    return null;
  }
}

export async function authRequest<T>(path: string, options?: RequestInit): Promise<T> {
  const makeRequest = (token: string | null) =>
    fetch(`${API_BASE}/api${path}`, {
      credentials: 'include',
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...options?.headers,
      },
    });

  let token = useAuthStore.getState().accessToken;
  let res = await makeRequest(token);

  // Token expired — try to refresh once and retry
  if (res.status === 401) {
    const newToken = await tryRefresh();
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

  return res.json() as Promise<T>;
}
