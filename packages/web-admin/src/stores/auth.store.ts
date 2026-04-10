import { create } from 'zustand';
import { setAuthToken } from '../api/platform.ts';

const STORAGE_KEY = 'platform_token';

const storedToken = localStorage.getItem(STORAGE_KEY);
if (storedToken) setAuthToken(storedToken);

interface AuthState {
  token: string | null;
  isAuthenticated: boolean;
  setToken: (token: string) => void;
  logout: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  token: storedToken,
  isAuthenticated: !!storedToken,
  setToken: (token) => {
    localStorage.setItem(STORAGE_KEY, token);
    setAuthToken(token);
    set({ token, isAuthenticated: true });
  },
  logout: () => {
    localStorage.removeItem(STORAGE_KEY);
    setAuthToken(null);
    set({ token: null, isAuthenticated: false });
  },
}));
