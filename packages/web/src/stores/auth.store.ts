import { create } from 'zustand';
import { API_BASE } from '../api/auth-request.ts';
import { TENANT_SLUG } from '../config/env.js';

interface AuthState {
  accessToken: string | null;
  isInitialized: boolean;
  setAccessToken: (token: string) => void;
  logout: () => Promise<void>;
  initialize: () => Promise<void>;
}

export const useAuthStore = create<AuthState>()((set) => ({
  accessToken: null,
  isInitialized: false,

  setAccessToken: (token) => set({ accessToken: token }),

  logout: async () => {
    try {
      await fetch(`${API_BASE}/api/auth/logout`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'X-Tenant-Slug': TENANT_SLUG },
      });
    } catch {}
    set({ accessToken: null, isInitialized: true });
  },

  initialize: async () => {
    try {
      const res = await fetch(`${API_BASE}/api/auth/refresh`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'X-Tenant-Slug': TENANT_SLUG },
      });
      if (res.ok) {
        const { accessToken } = await res.json();
        set({ accessToken, isInitialized: true });
      } else {
        set({ isInitialized: true });
      }
    } catch {
      set({ isInitialized: true });
    }
  },
}));
