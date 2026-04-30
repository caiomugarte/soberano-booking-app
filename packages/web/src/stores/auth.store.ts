import { create } from 'zustand';
import { API_BASE } from '../config/api.ts';
import { TENANT_SLUG } from '../config/env.js';
import { refreshAccessToken } from '../api/auth-session.ts';

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
      await fetch(`${API_BASE}/auth/logout`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'X-Tenant-Slug': TENANT_SLUG },
      });
    } catch {}
    set({ accessToken: null, isInitialized: true });
  },

  initialize: async () => {
    const accessToken = await refreshAccessToken();
    set({ accessToken, isInitialized: true });
  },
}));
