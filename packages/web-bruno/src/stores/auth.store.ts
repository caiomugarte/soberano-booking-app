import { create } from 'zustand'
import { apiLogin } from '@/api/auth'
import { configureHttpClient, apiFetch } from '@/api/http-client'

const API_URL = (import.meta.env.VITE_API_URL as string | undefined) ?? ''

interface AuthState {
  accessToken: string | null
  user: { id: string; name: string } | null
  isAuthenticated: boolean
  isInitialized: boolean
  login(email: string, password: string): Promise<void>
  logout(): void
  setToken(token: string): void
  initialize(): Promise<void>
}

export const useAuthStore = create<AuthState>((set) => ({
  accessToken: null,
  user: null,
  isAuthenticated: false,
  isInitialized: false,

  initialize: async () => {
    try {
      const res = await fetch(`${API_URL}/api/auth/refresh`, { method: 'POST', credentials: 'include' })
      if (res.ok) {
        const { accessToken } = (await res.json()) as { accessToken: string }
        set({ accessToken, isAuthenticated: true, isInitialized: true })
      } else {
        set({ isInitialized: true })
      }
    } catch {
      set({ isInitialized: true })
    }
  },

  login: async (email, password) => {
    const { accessToken } = await apiLogin(email, password)
    set({ accessToken, isAuthenticated: true })
    try {
      const profile = await apiFetch<{ id: string; firstName: string; lastName: string }>(
        '/api/admin/me',
      )
      set({ user: { id: profile.id, name: `${profile.firstName} ${profile.lastName}`.trim() } })
    } catch {
      // profile fetch non-critical
    }
  },

  logout: () => {
    set({ accessToken: null, user: null, isAuthenticated: false })
    fetch('/api/auth/logout', { method: 'POST', credentials: 'include' }).catch(() => {})
  },

  setToken: (token) => set({ accessToken: token }),
}))

configureHttpClient({
  getAccessToken: () => useAuthStore.getState().accessToken,
  setAccessToken: (token) => useAuthStore.getState().setToken(token),
  logout: () => useAuthStore.getState().logout(),
})
