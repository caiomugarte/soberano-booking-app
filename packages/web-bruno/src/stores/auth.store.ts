import { create } from 'zustand'
import { apiLogin } from '@/api/auth'
import { configureHttpClient, apiFetch, tryRefreshToken, callLogout } from '@/api/http-client'

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
    const accessToken = await tryRefreshToken()
    set((state) => {
      if (state.isInitialized) return state
      if (accessToken) return { ...state, accessToken, isAuthenticated: true, isInitialized: true }
      return { ...state, accessToken: null, user: null, isAuthenticated: false, isInitialized: true }
    })
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
    callLogout()
  },

  setToken: (token) => set({ accessToken: token }),
}))

configureHttpClient({
  getAccessToken: () => useAuthStore.getState().accessToken,
  setAccessToken: (token) => useAuthStore.getState().setToken(token),
  logout: () => useAuthStore.getState().logout(),
})
