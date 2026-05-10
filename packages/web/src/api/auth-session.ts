import { TENANT_SLUG } from '../config/env.js';
import { API_BASE } from '../config/api.ts';
import { useAuthStore } from '../stores/auth.store.ts';

let refreshPromise: Promise<string | null> | null = null;

export async function refreshAccessToken(): Promise<string | null> {
  if (!refreshPromise) {
    refreshPromise = (async () => {
      try {
        const res = await fetch(`${API_BASE}/auth/refresh`, {
          method: 'POST',
          credentials: 'include',
          headers: { 'X-Tenant-Slug': TENANT_SLUG },
        });

        if (!res.ok) {
          return null;
        }

        const { accessToken } = await res.json();
        useAuthStore.getState().setAccessToken(accessToken);
        return accessToken;
      } catch {
        return null;
      } finally {
        refreshPromise = null;
      }
    })();
  }

  return refreshPromise;
}
